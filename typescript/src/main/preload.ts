const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getTodos: () => ipcRenderer.invoke('get-todos'),
  saveTodos: (filePath: string, todos: any[]) => ipcRenderer.invoke('save-todos', filePath, todos),
  deleteTodoFile: (filePath: string) => ipcRenderer.invoke('delete-todo-file', filePath),
  deleteProjectDirectory: (projectDirPath: string) => ipcRenderer.invoke('delete-project-directory', projectDirPath),
  getProjectPrompts: (projectPath: string) => ipcRenderer.invoke('get-project-prompts', projectPath),
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  // Add listener for file changes
  onTodoFilesChanged: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('todo-files-changed', callback);
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('todo-files-changed', callback);
    };
  }
});