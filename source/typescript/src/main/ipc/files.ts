import type { IpcMain } from 'electron';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { Ok, Err, ResultUtils } from '../../utils/Result.js';

export function registerFileIpc(ipcMain: IpcMain) {
  ipcMain.handle('delete-project-directory', async (_event: any, projectDirPath: string) => {
    console.log('[IPC] delete-project-directory called for:', projectDirPath);
    if (!fsSync.existsSync(projectDirPath)) {
      console.log('Project directory does not exist:', projectDirPath);
      return Ok(true);
    }
    const deleteResult = await ResultUtils.fromPromise(fs.rm(projectDirPath, { recursive: true, force: true }));
    if (!deleteResult.success) {
      const errorMsg = `Error deleting project directory: ${deleteResult.error}`;
      console.error(errorMsg);
      return Err(errorMsg, deleteResult.details);
    }
    console.log('Successfully deleted project directory:', projectDirPath);
    return Ok(true);
  });
}

