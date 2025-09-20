import type { IpcMain } from 'electron';
import { collectGitStatus, collectCommitHistory } from '../gitStatus.js';

export function registerGitStatusIpc(ipcMain: IpcMain) {
  ipcMain.handle('get-git-status', async (_event, baseDir?: string) => {
    return collectGitStatus(baseDir);
  });
  ipcMain.handle('get-git-commits', async (_event, options?: { baseDir?: string; limit?: number }) => {
    return collectCommitHistory(options?.baseDir, options?.limit ?? 50);
  });
}
