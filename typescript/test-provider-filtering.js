#!/usr/bin/env node

/**
 * Manual test script for provider filtering
 * Actually launches the app and verifies filtering works
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🧪 Provider Filtering Manual Test');
console.log('==================================\n');

// Check if app is built
if (!fs.existsSync('dist/main/main.js')) {
  console.error('❌ App not built. Run: npm run build');
  process.exit(1);
}

// Setup test data in real Claude/Codex/Gemini directories
function setupRealTestData() {
  const homeDir = os.homedir();

  // Backup existing data
  const backupDir = path.join(homeDir, '.entropic-test-backup-' + Date.now());

  const dirs = ['.claude', '.codex', '.gemini'];
  dirs.forEach(dir => {
    const fullPath = path.join(homeDir, dir);
    if (fs.existsSync(fullPath)) {
      console.log(`📦 Backing up ${dir} to ${backupDir}`);
      fs.cpSync(fullPath, path.join(backupDir, dir), { recursive: true });
    }
  });

  // Create test projects
  const testProjects = [
    {
      dir: path.join(homeDir, '.claude/projects/test-claude-project'),
      provider: 'claude',
      sessionFile: path.join(homeDir, '.claude/todos/test-claude-session.jsonl'),
      data: {
        sessionId: 'test-claude-1',
        provider: 'claude',
        todos: [
          { content: 'TEST: Claude task 1', status: 'pending' },
          { content: 'TEST: Claude task 2', status: 'in_progress' }
        ],
        updatedAt: Date.now()
      }
    },
    {
      dir: path.join(homeDir, '.codex/projects/test-codex-project'),
      provider: 'codex',
      sessionFile: path.join(homeDir, '.codex/todos/test-codex-session.jsonl'),
      data: {
        sessionId: 'test-codex-1',
        provider: 'codex',
        todos: [
          { content: 'TEST: Codex task 1', status: 'pending' }
        ],
        updatedAt: Date.now()
      }
    },
    {
      dir: path.join(homeDir, '.gemini/sessions'),
      provider: 'gemini',
      sessionFile: path.join(homeDir, '.gemini/sessions/test-gemini-session.jsonl'),
      data: {
        sessionId: 'test-gemini-1',
        provider: 'gemini',
        todos: [
          { content: 'TEST: Gemini task 1', status: 'pending' }
        ],
        updatedAt: Date.now()
      }
    }
  ];

  testProjects.forEach(project => {
    fs.mkdirSync(project.dir, { recursive: true });
    fs.mkdirSync(path.dirname(project.sessionFile), { recursive: true });
    fs.writeFileSync(project.sessionFile, JSON.stringify(project.data) + '\n');
    console.log(`✅ Created test data for ${project.provider}`);
  });

  return backupDir;
}

console.log('Setting up test data...\n');
const backupDir = setupRealTestData();

console.log('\n📋 Test Instructions:');
console.log('====================');
console.log('1. The app will launch with test data from all 3 providers');
console.log('2. You should see projects: test-claude-project, test-codex-project, test-gemini-project');
console.log('3. Click the provider toggle buttons in the title bar:');
console.log('   - Toggle OFF Codex (OpenAI icon) - codex project should disappear');
console.log('   - Toggle OFF Gemini - gemini project should disappear');
console.log('   - Toggle them back ON - projects should reappear');
console.log('4. Switch to Global View - provider filtering should work there too');
console.log('5. Switch back to Project View - filters should persist');
console.log('\n⚠️  Test data is in your real ~/.claude, ~/.codex, ~/.gemini directories');
console.log(`📁 Original data backed up to: ${backupDir}`);
console.log('\nPress Ctrl+C when done testing to restore original data\n');

// Launch the app
const app = spawn('npm', ['start'], {
  stdio: 'inherit',
  shell: true
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\nCleaning up test data...');

  // Kill the app
  app.kill();

  // Remove test files
  const homeDir = os.homedir();
  const testFiles = [
    path.join(homeDir, '.claude/projects/test-claude-project'),
    path.join(homeDir, '.claude/todos/test-claude-session.jsonl'),
    path.join(homeDir, '.codex/projects/test-codex-project'),
    path.join(homeDir, '.codex/todos/test-codex-session.jsonl'),
    path.join(homeDir, '.gemini/sessions/test-gemini-session.jsonl')
  ];

  testFiles.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        if (fs.statSync(file).isDirectory()) {
          fs.rmSync(file, { recursive: true });
        } else {
          fs.unlinkSync(file);
        }
        console.log(`🗑️  Removed: ${file}`);
      }
    } catch (e) {
      console.error(`Failed to remove ${file}:`, e.message);
    }
  });

  console.log('\n✅ Test cleanup complete');
  console.log(`📁 Original data preserved in: ${backupDir}`);
  console.log('You can restore it manually if needed');

  process.exit(0);
});

app.on('error', (err) => {
  console.error('Failed to start app:', err);
  process.exit(1);
});

app.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`App exited with code ${code}`);
  }
});