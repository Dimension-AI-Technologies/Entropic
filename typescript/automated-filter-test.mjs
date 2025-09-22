import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('🤖 Automated Provider Filter Verification\n');

// Setup test data
const homeDir = os.homedir();
const testData = {
  claude: {
    projectDir: path.join(homeDir, '.claude/projects/AUTO-TEST-claude'),
    todoFile: path.join(homeDir, '.claude/todos/auto-test-claude.jsonl'),
    session: {
      sessionId: 'auto-claude-1',
      provider: 'claude',
      todos: [{ content: 'Auto Claude task', status: 'pending' }],
      updatedAt: Date.now()
    }
  },
  codex: {
    projectDir: path.join(homeDir, '.codex/projects/AUTO-TEST-codex'),
    todoFile: path.join(homeDir, '.codex/todos/auto-test-codex.jsonl'),
    session: {
      sessionId: 'auto-codex-1',
      provider: 'codex',
      todos: [{ content: 'Auto Codex task', status: 'pending' }],
      updatedAt: Date.now()
    }
  },
  gemini: {
    projectDir: path.join(homeDir, '.gemini/sessions'),
    todoFile: path.join(homeDir, '.gemini/sessions/auto-test-gemini.jsonl'),
    session: {
      sessionId: 'auto-gemini-1',
      provider: 'gemini',
      todos: [{ content: 'Auto Gemini task', status: 'pending' }],
      updatedAt: Date.now()
    }
  }
};

// Create test data
console.log('📁 Creating test data...');
Object.entries(testData).forEach(([provider, data]) => {
  fs.mkdirSync(data.projectDir, { recursive: true });
  fs.mkdirSync(path.dirname(data.todoFile), { recursive: true });
  fs.writeFileSync(data.todoFile, JSON.stringify(data.session) + '\n');
  console.log(`  ✓ Created ${provider} test data`);
});

console.log('\n✅ Test data created successfully');
console.log('\nTo verify filtering:');
console.log('1. Run: npm run build && npm start');
console.log('2. Toggle provider icons in the UI');
console.log('3. Verify only selected provider data appears');
console.log('\nTo clean up test data:');
console.log('  rm -rf ~/.claude/projects/AUTO-TEST-*');
console.log('  rm -rf ~/.codex/projects/AUTO-TEST-*');
console.log('  rm -rf ~/.gemini/sessions/AUTO-TEST-*');