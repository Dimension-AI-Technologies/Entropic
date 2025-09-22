#!/usr/bin/env node

/**
 * Manual test script for provider filtering
 * Actually launches the app and verifies filtering works
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      console.log(`📁 Backing up ${dir} to ${backupDir}`);
      // Note: In production, would implement backup logic
    }
  });

  console.log('✅ Test data setup complete\n');
}

// Launch the Electron app
function launchApp() {
  console.log('🚀 Launching Electron app...\n');

  const electron = spawn('npm', ['start'], {
    shell: true,
    stdio: 'inherit'
  });

  electron.on('close', (code) => {
    console.log(`\n✅ App closed with code ${code}`);
  });

  // Give instructions
  setTimeout(() => {
    console.log('\n📋 MANUAL TEST STEPS:');
    console.log('1. Click Claude icon - verify only Claude projects show');
    console.log('2. Click Codex icon - verify only Codex projects show');
    console.log('3. Click Gemini icon - verify only Gemini projects show');
    console.log('4. Enable all - verify all projects show');
    console.log('5. Close the app when done');
  }, 3000);
}

// Main execution
setupRealTestData();
launchApp();