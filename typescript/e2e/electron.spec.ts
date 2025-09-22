import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
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

  // Get the first window that the app opens
  page = await app.firstWindow();

  // Wait for app to fully load
  await page.waitForSelector('[data-testid="title-bar"]', { timeout: 10000 });
});

test.afterAll(async () => {
  // Close the app
  if (app) {
    await app.close();
  }
});

test.describe('Electron App Launch', () => {
  test('should launch and display main window', async () => {
    // Check window title
    const title = await page.title();
    expect(title).toBe('ClaudeToDo');

    // Check that title bar is visible
    const titleBar = await page.locator('[data-testid="title-bar"]');
    await expect(titleBar).toBeVisible();
  });

  test('should show all view tabs', async () => {
    // Check all view tabs are present
    await expect(page.locator('[data-testid="view-tab-project"]')).toBeVisible();
    await expect(page.locator('[data-testid="view-tab-global"]')).toBeVisible();
    await expect(page.locator('[data-testid="view-tab-git"]')).toBeVisible();
    await expect(page.locator('[data-testid="view-tab-commit"]')).toBeVisible();
  });
});

test.describe('View Menu Navigation', () => {
  test('should switch to Project view via menu', async () => {
    // Use menu to switch to Project view
    await app.evaluate(async ({ Menu }) => {
      const menu = Menu.getApplicationMenu();
      const viewMenu = menu?.items.find(item => item.label === 'View');
      const projectMenuItem = viewMenu?.submenu?.items.find(item =>
        item.label === 'Projects - Todo View'
      );
      projectMenuItem?.click();
    });

    // Wait for view change
    await page.waitForTimeout(500);

    // Verify we're in project view
    const titleBar = await page.locator('[data-testid="title-bar"]');
    const viewMode = await titleBar.getAttribute('data-view');
    expect(viewMode).toBe('project');

    // Project view should be visible
    await expect(page.locator('[data-testid="project-view"]')).toBeVisible();
  });

  test('should switch to Global view via menu', async () => {
    await app.evaluate(async ({ Menu }) => {
      const menu = Menu.getApplicationMenu();
      const viewMenu = menu?.items.find(item => item.label === 'View');
      const globalMenuItem = viewMenu?.submenu?.items.find(item =>
        item.label === 'Projects - Global View'
      );
      globalMenuItem?.click();
    });

    await page.waitForTimeout(500);

    const titleBar = await page.locator('[data-testid="title-bar"]');
    const viewMode = await titleBar.getAttribute('data-view');
    expect(viewMode).toBe('global');

    await expect(page.locator('[data-testid="global-view"]')).toBeVisible();
  });

  test('should switch to Git view via menu', async () => {
    await app.evaluate(async ({ Menu }) => {
      const menu = Menu.getApplicationMenu();
      const viewMenu = menu?.items.find(item => item.label === 'View');
      const gitMenuItem = viewMenu?.submenu?.items.find(item =>
        item.label === 'Git - Global View'
      );
      gitMenuItem?.click();
    });

    await page.waitForTimeout(500);

    const titleBar = await page.locator('[data-testid="title-bar"]');
    const viewMode = await titleBar.getAttribute('data-view');
    expect(viewMode).toBe('git');

    await expect(page.locator('[data-testid="git-view"]')).toBeVisible();
  });

  test('should switch to Commit view via menu', async () => {
    await app.evaluate(async ({ Menu }) => {
      const menu = Menu.getApplicationMenu();
      const viewMenu = menu?.items.find(item => item.label === 'View');
      const commitMenuItem = viewMenu?.submenu?.items.find(item =>
        item.label === 'Git - Commit View'
      );
      commitMenuItem?.click();
    });

    await page.waitForTimeout(500);

    const titleBar = await page.locator('[data-testid="title-bar"]');
    const viewMode = await titleBar.getAttribute('data-view');
    expect(viewMode).toBe('commit');

    await expect(page.locator('[data-testid="commit-view"]')).toBeVisible();
  });
});

test.describe('Keyboard Shortcuts', () => {
  test('should switch views using keyboard shortcuts', async () => {
    // Test Ctrl+1 for Project Todo View
    await page.keyboard.press('Control+1');
    await page.waitForTimeout(300);
    let viewMode = await page.locator('[data-testid="title-bar"]').getAttribute('data-view');
    expect(viewMode).toBe('project');

    // Test Ctrl+3 for Global View
    await page.keyboard.press('Control+3');
    await page.waitForTimeout(300);
    viewMode = await page.locator('[data-testid="title-bar"]').getAttribute('data-view');
    expect(viewMode).toBe('global');

    // Test Ctrl+4 for Git View
    await page.keyboard.press('Control+4');
    await page.waitForTimeout(300);
    viewMode = await page.locator('[data-testid="title-bar"]').getAttribute('data-view');
    expect(viewMode).toBe('git');

    // Test Ctrl+5 for Commit View
    await page.keyboard.press('Control+5');
    await page.waitForTimeout(300);
    viewMode = await page.locator('[data-testid="title-bar"]').getAttribute('data-view');
    expect(viewMode).toBe('commit');
  });
});

test.describe('View Button Clicks', () => {
  test('should switch views by clicking view buttons', async () => {
    // Click Project View button
    await page.locator('[data-testid="view-tab-project"]').click();
    await expect(page.locator('[data-testid="project-view"]')).toBeVisible();

    // Click Global View button
    await page.locator('[data-testid="view-tab-global"]').click();
    await expect(page.locator('[data-testid="global-view"]')).toBeVisible();

    // Click Git View button
    await page.locator('[data-testid="view-tab-git"]').click();
    await expect(page.locator('[data-testid="git-view"]')).toBeVisible();

    // Click Commit View button
    await page.locator('[data-testid="view-tab-commit"]').click();
    await expect(page.locator('[data-testid="commit-view"]')).toBeVisible();
  });

  test('should highlight active view button', async () => {
    // Click each view and verify active class
    await page.locator('[data-testid="view-tab-project"]').click();
    await expect(page.locator('[data-testid="view-tab-project"]')).toHaveClass(/active/);

    await page.locator('[data-testid="view-tab-global"]').click();
    await expect(page.locator('[data-testid="view-tab-global"]')).toHaveClass(/active/);

    await page.locator('[data-testid="view-tab-git"]').click();
    await expect(page.locator('[data-testid="view-tab-git"]')).toHaveClass(/active/);

    await page.locator('[data-testid="view-tab-commit"]').click();
    await expect(page.locator('[data-testid="view-tab-commit"]')).toHaveClass(/active/);
  });
});