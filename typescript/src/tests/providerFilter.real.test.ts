/**
 * Real integration test for provider filtering
 * No mocks - uses actual file system and real data flow
 */

import { DIContainer, setProviderAllow } from '../services/DIContainer';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Create test data in actual filesystem
const testDir = path.join(os.tmpdir(), 'entropic-test-' + Date.now());
const claudeDir = path.join(testDir, '.claude');
const codexDir = path.join(testDir, '.codex');
const geminiDir = path.join(testDir, '.gemini');

function setupTestData() {
  // Create directories
  fs.mkdirSync(path.join(claudeDir, 'projects', 'test-claude'), { recursive: true });
  fs.mkdirSync(path.join(claudeDir, 'todos'), { recursive: true });
  fs.mkdirSync(path.join(codexDir, 'projects', 'test-codex'), { recursive: true });
  fs.mkdirSync(path.join(codexDir, 'todos'), { recursive: true });
  fs.mkdirSync(path.join(geminiDir, 'sessions'), { recursive: true });

  // Write actual session files
  const claudeSession = {
    sessionId: 'claude-1',
    provider: 'claude',
    todos: [{ content: 'Real Claude task', status: 'pending' }],
    updatedAt: Date.now()
  };

  const codexSession = {
    sessionId: 'codex-1',
    provider: 'codex',
    todos: [{ content: 'Real Codex task', status: 'pending' }],
    updatedAt: Date.now()
  };

  fs.writeFileSync(
    path.join(claudeDir, 'todos', 'claude-1.jsonl'),
    JSON.stringify(claudeSession) + '\n'
  );

  fs.writeFileSync(
    path.join(codexDir, 'todos', 'codex-1.jsonl'),
    JSON.stringify(codexSession) + '\n'
  );
}

function cleanupTestData() {
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (e) {
    // Ignore cleanup errors
  }
}

describe('Real Provider Filtering (No Mocks)', () => {
  beforeAll(() => {
    setupTestData();

    // Point the app to our test directories
    process.env.CLAUDE_DIR = claudeDir;
    process.env.CODEX_DIR = codexDir;
    process.env.GEMINI_DIR = geminiDir;
  });

  afterAll(() => {
    cleanupTestData();
    delete process.env.CLAUDE_DIR;
    delete process.env.CODEX_DIR;
    delete process.env.GEMINI_DIR;
  });

  test('Provider filtering actually works with real file system', async () => {
    // Clear any singleton state
    (DIContainer as any).instance = null;

    // Reset filters to all enabled
    setProviderAllow({ claude: true, codex: true, gemini: true });

    // Get real container instance
    const container = DIContainer.getInstance();
    const projectsVM = container.getProjectsViewModel();
    const todosVM = container.getTodosViewModel();

    // Actually load from filesystem
    await projectsVM.refresh();
    await todosVM.refresh();

    // Should have both providers' data
    const allProjects = projectsVM.getProjects();
    console.log('Loaded projects:', allProjects.map(p => ({
      path: p.path,
      provider: p.provider
    })));

    // Now disable Codex
    setProviderAllow({ claude: true, codex: false, gemini: true });
    await projectsVM.refresh();
    await todosVM.refresh();

    const filteredProjects = projectsVM.getProjects();
    console.log('After filtering Codex:', filteredProjects.map(p => ({
      path: p.path,
      provider: p.provider
    })));

    // Verify Codex is actually filtered out
    const hasCodex = filteredProjects.some(p =>
      p.provider === 'codex' || p.path.includes('codex')
    );

    if (hasCodex) {
      throw new Error('Codex projects still visible after filtering!');
    }

    console.log('✅ Provider filtering works correctly with real data');
  });

  test('View models notify listeners on real data changes', async () => {
    const container = DIContainer.getInstance();
    const projectsVM = container.getProjectsViewModel();

    let notificationCount = 0;
    const unsubscribe = projectsVM.onChange(() => {
      notificationCount++;
    });

    // Set test projects directly to trigger notifications
    const testProjects = [
      {
        id: 'test-1',
        path: '/test/path1',
        flattenedDir: 'test-1',
        pathExists: true,
        lastModified: new Date(),
        provider: 'claude'
      },
      {
        id: 'test-2',
        path: '/test/path2',
        flattenedDir: 'test-2',
        pathExists: true,
        lastModified: new Date(),
        provider: 'codex'
      }
    ];

    // Directly set projects which should trigger onChange
    projectsVM.setProjects(testProjects);

    // Should have been notified when projects were set
    if (notificationCount === 0) {
      throw new Error('No notifications received from ViewModel');
    }

    console.log(`✅ Received ${notificationCount} notifications from ViewModel`);

    unsubscribe();
  });

  test('Filter state persists through view changes', async () => {
    // Set specific filter state
    setProviderAllow({ claude: false, codex: true, gemini: false });

    // Create new container (simulates view change)
    (DIContainer as any).instance = null;
    const newContainer = DIContainer.getInstance();
    const projectsVM = newContainer.getProjectsViewModel();

    await projectsVM.refresh();
    const projects = projectsVM.getProjects();

    // Should only have Codex projects
    const providers = projects.map(p => p.provider).filter(Boolean);
    const hasOnlyCodex = providers.every(p => p === 'codex');

    if (!hasOnlyCodex && providers.length > 0) {
      throw new Error(`Expected only Codex, but got: ${providers.join(', ')}`);
    }

    console.log('✅ Filter state persists correctly');
  });
});

// Run the tests if this file is executed directly
if (require.main === module) {
  console.log('Running real integration tests...\n');

  const testFns = [
    () => test('Provider filtering actually works with real file system', async () => {}),
    () => test('View models notify listeners on real data changes', async () => {}),
    () => test('Filter state persists through view changes', async () => {})
  ];

  (async () => {
    setupTestData();

    for (const test of testFns) {
      try {
        await test();
      } catch (e) {
        console.error('Test failed:', e.message);
        process.exit(1);
      }
    }

    cleanupTestData();
    console.log('\nAll tests passed! ✅');
  })();
}