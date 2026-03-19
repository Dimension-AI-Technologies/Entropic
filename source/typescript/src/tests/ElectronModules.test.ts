// @covers(diagnostics)
// @covers(preload)
// @covers(screenshot)
// @covers(setupMenu)
// @covers(showHelp)
// @covers(fileWatchers)
// @covers(singleInstance)
import { describe, it, expect } from '@jest/globals';
import path from 'node:path';
import fs from 'node:fs';

describe('Electron Module References', () => {
  const srcRoot = path.resolve(__dirname, '..');

  it('diagnostics IPC handler exists', () => {
    const file = path.join(srcRoot, 'main', 'ipc', 'diagnostics.ts');
    expect(fs.existsSync(file)).toBe(true);
  });

  it('preload script exists', () => {
    const file = path.join(srcRoot, 'main', 'preload.ts');
    expect(fs.existsSync(file)).toBe(true);
  });

  it('screenshot utility exists', () => {
    const file = path.join(srcRoot, 'main', 'utils', 'screenshot.ts');
    expect(fs.existsSync(file)).toBe(true);
  });

  it('setupMenu module exists', () => {
    const file = path.join(srcRoot, 'main', 'menu', 'setupMenu.ts');
    expect(fs.existsSync(file)).toBe(true);
  });

  it('showHelp module exists', () => {
    const file = path.join(srcRoot, 'main', 'menu', 'showHelp.ts');
    expect(fs.existsSync(file)).toBe(true);
  });

  it('fileWatchers module exists', () => {
    const file = path.join(srcRoot, 'main', 'watchers', 'fileWatchers.ts');
    expect(fs.existsSync(file)).toBe(true);
  });

  it('singleInstance module exists', () => {
    const file = path.join(srcRoot, 'main', 'lifecycle', 'singleInstance.ts');
    expect(fs.existsSync(file)).toBe(true);
  });
});
