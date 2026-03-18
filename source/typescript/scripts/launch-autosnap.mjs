#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function listScreenshots() {
  const desktop = path.join(os.homedir(), 'Desktop');
  const pattern = /^ClaudeToDo_Screenshot_.*\.png$/;
  try {
    return fs
      .readdirSync(desktop, { withFileTypes: true })
      .filter(d => d.isFile() && pattern.test(d.name))
      .map(d => path.join(desktop, d.name))
      .map(p => ({ p, mtime: fs.statSync(p).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
      .map(x => x.p);
  } catch {
    return [];
  }
}

async function waitForNewScreenshot(before, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const shots = listScreenshots();
    const newest = shots[0];
    if (newest) {
      const mt = (await fsp.stat(newest)).mtimeMs;
      if (mt > before) return newest;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return null;
}

async function main() {
  // Kill any instance started by this repo's helper if pid file exists
  try {
    const pidPath = path.join(root, '..', 'electron.pid');
    if (fs.existsSync(pidPath)) {
      const pidStr = fs.readFileSync(pidPath, 'utf-8').trim();
      const pid = Number(pidStr);
      if (Number.isFinite(pid) && pid > 0) {
        try { process.kill(pid, 'SIGTERM'); } catch {}
        await new Promise(r => setTimeout(r, 500));
        try { process.kill(pid, 'SIGKILL'); } catch {}
      }
      try { fs.unlinkSync(pidPath); } catch {}
    }
  } catch {}

  const beforeTime = Date.now();

  // Build renderer and main
  await new Promise((resolve, reject) => {
    const p = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
      cwd: root,
      stdio: 'inherit'
    });
    p.on('exit', code => (code === 0 ? resolve() : reject(new Error('build failed: ' + code))));
  });

  // Launch Electron with autosnap flags
  const env = { ...process.env, ENTROPIC_AUTOSNAP: '1', ENTROPIC_AUTOSNAP_FORCE: '1', NODE_ENV: 'production' };
  const electronCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const child = spawn(electronCmd, ['electron', '.'], { cwd: root, env, stdio: 'inherit' });

  // Wait for a new screenshot to appear
  const shot = await waitForNewScreenshot(beforeTime, 40000);
  if (shot) {
    console.log('[VERIFY] Screenshot created:', shot);
  } else {
    console.error('[VERIFY] No screenshot detected within timeout');
  }

  // Try to terminate app
  try { child.kill('SIGTERM'); } catch {}
  setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 1000);
}

main().catch(err => { console.error(err); process.exit(1); });
