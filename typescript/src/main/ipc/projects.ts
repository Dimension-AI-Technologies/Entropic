import type { IpcMain } from 'electron';
import { loadTodosData } from '../loaders/projects.js';

export function registerProjectsIpc(
  ipcMain: IpcMain,
  options: { projectsDir: string; logsDir: string; todosDir?: string }
) {
  ipcMain.handle('get-todos', async () => {
    console.log('[IPC] get-todos called');
    const result = await loadTodosData(options.projectsDir, options.logsDir, options.todosDir);
    if (result.success) {
      console.log('[IPC] Returning', result.value.length, 'projects');
      return result.value;
    } else {
      console.error('[IPC] Failed to load todos:', result.error);
      return [];
    }
  });
}
