import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import type { BrowserWindow } from 'electron';
import { Ok, Err, type Result } from '../../utils/Result.js';

export async function takeScreenshot(window: BrowserWindow): Promise<Result<string>> {
  try {
    const image = await window.webContents.capturePage();
    const buffer = image.toPNG();
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const filePath = path.join(
      desktopPath,
      `ClaudeToDo_Screenshot_${new Date().toISOString().replace(/[:.]/g, '-')}.png`
    );
    await fs.writeFile(filePath, buffer);
    return Ok(filePath);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Failed to take screenshot:', msg);
    return Err(`Failed to take screenshot: ${msg}`, error);
  }
}

