import type { IpcMain } from 'electron';
import type { Aggregator } from '../core/aggregator';
import { loadTodosData } from '../loaders/projects.js';
import { Ok, Err } from '../../utils/Result.js';

export function registerProjectsIpc(
  ipcMain: IpcMain,
  options: { projectsDir: string; logsDir: string; todosDir?: string; aggregator?: Aggregator }
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

  ipcMain.handle('get-projects', async () => {
    try {
      if (!options.aggregator) return Ok([]);
      const res = await options.aggregator.getProjects();
      if (!res.success) return Err(res.error || 'aggregator error');
      return Ok(res.value);
    } catch (e: any) {
      return Err(e?.message || 'unexpected');
    }
  });
}
