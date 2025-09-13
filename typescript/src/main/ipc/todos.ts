import type { IpcMain } from 'electron';
import { TodoManager } from '../../utils/TodoManager.js';
import { ResultUtils } from '../../utils/Result.js';

interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
  id?: string;
  created?: Date;
}

export function registerTodoIpc(ipcMain: IpcMain) {
  ipcMain.handle('save-todos', async (_event: any, filePath: string, todos: Todo[]) => {
    const manager = new TodoManager(filePath);
    const result = await manager.writeTodos(todos);
    return ResultUtils.isSuccess(result);
  });

  ipcMain.handle('delete-todo-file', async (_event: any, filePath: string) => {
    const manager = new TodoManager(filePath);
    const result = await manager.deleteFile();
    return ResultUtils.isSuccess(result);
  });
}

