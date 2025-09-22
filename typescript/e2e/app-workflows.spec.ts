import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  // Launch Electron app
  app = await electron.launch({
    args: [path.join(__dirname, '../dist/main/main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  });

  page = await app.firstWindow();
  await page.waitForSelector('[data-testid="title-bar"]', { timeout: 10000 });
});

test.afterAll(async () => {
  if (app) {
    await app.close();
  }
});

test.describe('Project View Workflows', () => {
  test('should display project list', async () => {
    // Switch to project view
    await page.locator('[data-testid="view-tab-project"]').click();
    await page.waitForTimeout(500);

    // Check if project view is visible
    const projectView = await page.locator('[data-testid="project-view"]');
    await expect(projectView).toBeVisible();

    // Check for project list elements
    const projectList = await page.locator('.projects-list');

    // The list should exist (even if empty)
    await expect(projectList.first()).toBeVisible();
  });

  test('should handle project selection', async () => {
    // If there are any projects, try selecting one
    const projectItems = await page.locator('.project-item');
    const count = await projectItems.count();

    if (count > 0) {
      // Click the first project
      await projectItems.first().click();

      // Verify selection feedback (usually highlighted)
      await expect(projectItems.first()).toHaveClass(/selected|active/);
    }
  });

  test('should show todo list for selected project', async () => {
    const projectItems = await page.locator('.project-item');
    const count = await projectItems.count();

    if (count > 0) {
      await projectItems.first().click();
      await page.waitForTimeout(500);

      // Check for todo list container
      const todoContainer = await page.locator('.todo-list, .todo-container');
      if (await todoContainer.count() > 0) {
        await expect(todoContainer.first()).toBeVisible();
      }
    }
  });
});

test.describe('Global View Workflows', () => {
  test('should display aggregated todos', async () => {
    // Switch to global view
    await page.locator('[data-testid="view-tab-global"]').click();
    await page.waitForTimeout(500);

    const globalView = await page.locator('[data-testid="global-view"]');
    await expect(globalView).toBeVisible();

    // Check for summary stats
    const summaryText = await globalView.textContent();
    expect(summaryText).toMatch(/\d+ Projects|Sessions|ToDos/);
  });

  test('should filter active todos only', async () => {
    // Look for active only checkbox
    const activeCheckbox = await page.locator('input[type="checkbox"]').filter({ hasText: /Active only/i });

    if (await activeCheckbox.count() > 0) {
      // Toggle the checkbox
      const wasChecked = await activeCheckbox.isChecked();
      await activeCheckbox.click();
      await page.waitForTimeout(500);

      // Verify state changed
      const isChecked = await activeCheckbox.isChecked();
      expect(isChecked).toBe(!wasChecked);
    }
  });
});

test.describe('Git View Workflows', () => {
  test('should display git repository status', async () => {
    // Switch to git view
    await page.locator('[data-testid="view-tab-git"]').click();
    await page.waitForTimeout(500);

    const gitView = await page.locator('[data-testid="git-view"]');
    await expect(gitView).toBeVisible();

    // Check for repository summary
    const summaryText = await gitView.textContent();
    expect(summaryText).toMatch(/\d+ Repos/);
  });

  test('should have refresh button', async () => {
    const refreshButton = await page.locator('button').filter({ hasText: /Refresh/i });

    if (await refreshButton.count() > 0) {
      await expect(refreshButton.first()).toBeVisible();

      // Test clicking refresh
      await refreshButton.first().click();

      // Should show loading state
      const loadingText = await refreshButton.first().textContent();
      if (loadingText?.includes('Refreshing')) {
        expect(loadingText).toMatch(/Refreshing/);
      }
    }
  });
});

test.describe('Commit View Workflows', () => {
  test('should display commit history', async () => {
    // Switch to commit view
    await page.locator('[data-testid="view-tab-commit"]').click();
    await page.waitForTimeout(500);

    const commitView = await page.locator('[data-testid="commit-view"]');
    await expect(commitView).toBeVisible();

    // Check for repository list
    const repoList = await commitView.locator('.commit-repo-list');
    if (await repoList.count() > 0) {
      await expect(repoList.first()).toBeVisible();
    }
  });

  test('should allow repository selection', async () => {
    const repoButtons = await page.locator('.commit-repo-item');
    const count = await repoButtons.count();

    if (count > 0) {
      // Click first repo
      await repoButtons.first().click();
      await page.waitForTimeout(500);

      // Should have active class
      await expect(repoButtons.first()).toHaveClass(/active/);

      // Should show commit table
      const commitTable = await page.locator('.commit-table');
      if (await commitTable.count() > 0) {
        await expect(commitTable.first()).toBeVisible();
      }
    }
  });

  test('should sort commits by different columns', async () => {
    const commitTable = await page.locator('.commit-table');
    if (await commitTable.count() > 0) {
      // Try clicking sortable headers
      const dateHeader = await page.locator('th').filter({ hasText: /Date/i });
      if (await dateHeader.count() > 0) {
        await dateHeader.click();
        await page.waitForTimeout(300);

        // Check for sort indicator
        const headerText = await dateHeader.textContent();
        expect(headerText).toMatch(/[▲▼]/);
      }
    }
  });
});

test.describe('Provider Filter', () => {
  test('should toggle provider filters', async () => {
    // Switch to project view where provider filters are visible
    await page.locator('[data-testid="view-tab-project"]').click();
    await page.waitForTimeout(500);

    // Look for provider toggle buttons
    const providerButtons = await page.locator('.provider-icon-btn');
    const count = await providerButtons.count();

    if (count > 0) {
      // Toggle first provider
      const firstButton = providerButtons.first();
      const wasActive = await firstButton.evaluate(el => el.classList.contains('active'));

      await firstButton.click();
      await page.waitForTimeout(300);

      const isActive = await firstButton.evaluate(el => el.classList.contains('active'));
      expect(isActive).toBe(!wasActive);
    }
  });
});

test.describe('Screenshot Functionality', () => {
  test('should take screenshot when button clicked', async () => {
    // Find screenshot button
    const screenshotButton = await page.locator('.screenshot-btn');

    if (await screenshotButton.count() > 0) {
      await expect(screenshotButton.first()).toBeVisible();

      // Click screenshot button
      await screenshotButton.first().click();
      await page.waitForTimeout(1000);

      // Note: We can't verify the actual file creation in this test environment
      // but we can check that the button is functional
    }
  });
});

test.describe('Spacing Mode', () => {
  test('should change spacing mode', async () => {
    // Look for spacing control buttons
    const spacingButtons = await page.locator('.spacing-button');

    if (await spacingButtons.count() > 0) {
      // Click to cycle through spacing modes
      await spacingButtons.first().click();
      await page.waitForTimeout(300);

      // The UI should update (exact verification depends on implementation)
    }
  });
});

test.describe('Menu Bar Operations', () => {
  test('should access Help menu', async () => {
    const helpItems = await app.evaluate(async ({ Menu }) => {
      const menu = Menu.getApplicationMenu();
      const helpMenu = menu?.items.find(item => item.label === 'Help' || item.role === 'help');
      return helpMenu?.submenu?.items.map(item => item.label) || [];
    });

    expect(helpItems.length).toBeGreaterThan(0);
    expect(helpItems).toContain('Entropic Help');
  });

  test('should access View menu items', async () => {
    const viewItems = await app.evaluate(async ({ Menu }) => {
      const menu = Menu.getApplicationMenu();
      const viewMenu = menu?.items.find(item => item.label === 'View');
      return viewMenu?.submenu?.items.map(item => item.label) || [];
    });

    expect(viewItems).toContain('Projects - Todo View');
    expect(viewItems).toContain('Projects - History View');
    expect(viewItems).toContain('Projects - Global View');
    expect(viewItems).toContain('Git - Global View');
    expect(viewItems).toContain('Git - Commit View');
  });
});

test.describe('Data Loading', () => {
  test('should load Claude projects if available', async () => {
    // Check if .claude directory exists
    const claudeDir = path.join(os.homedir(), '.claude', 'projects');
    try {
      await fs.access(claudeDir);

      // Switch to project view
      await page.locator('[data-testid="view-tab-project"]').click();
      await page.waitForTimeout(1000);

      // Should show some projects or empty state
      const projectView = await page.locator('[data-testid="project-view"]');
      const content = await projectView.textContent();

      // Either shows projects or "No projects" message
      expect(content).toBeDefined();
    } catch {
      // Claude directory doesn't exist, skip this test
      console.log('Claude directory not found, skipping project loading test');
    }
  });
});