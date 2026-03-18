import type { IpcMain } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function registerProvidersIpc(ipcMain: IpcMain) {
  ipcMain.handle('get-provider-presence', async () => {
    try {
      const home = os.homedir();
      const claude = fs.existsSync(path.join(home, '.claude'));
      const codex = fs.existsSync(path.join(home, '.codex'));
      const gemini = fs.existsSync(path.join(home, '.gemini'));
      return { claude, codex, gemini };
    } catch {
      return { claude: false, codex: false, gemini: false };
    }
  });
}

