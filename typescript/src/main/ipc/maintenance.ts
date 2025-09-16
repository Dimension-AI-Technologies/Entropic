import type { IpcMain } from 'electron';
import path from 'node:path';
import os from 'node:os';
import { collectDiagnostics, repairProjectMetadata } from '../maintenance/repair.js';

export function registerMaintenanceIpc(ipcMain: IpcMain, opts?: { projectsDir?: string; todosDir?: string }) {
  const projectsDir = opts?.projectsDir || path.join(os.homedir(), '.claude', 'projects');
  const todosDir = opts?.todosDir || path.join(os.homedir(), '.claude', 'todos');
  ipcMain.handle('collect-diagnostics', async () => {
    try { return await collectDiagnostics(projectsDir, todosDir); } catch (e: any) { return { text: String(e), unknownCount: -1, planned: 0, written: 0 }; }
  });
  ipcMain.handle('repair-metadata', async (_e, arg: { dryRun?: boolean }) => {
    try { return await repairProjectMetadata(projectsDir, todosDir, !!arg?.dryRun); } catch (e: any) { return { error: String(e) }; }
  });
}

