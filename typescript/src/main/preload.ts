import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getProjects: () => ipcRenderer.invoke('get-projects'),
  getTodos: () => ipcRenderer.invoke('get-todos'),
  saveTodos: (filePath: string, todos: any[]) => ipcRenderer.invoke('save-todos', filePath, todos),
  deleteTodoFile: (filePath: string) => ipcRenderer.invoke('delete-todo-file', filePath),
  deleteProjectDirectory: (projectDirPath: string) => ipcRenderer.invoke('delete-project-directory', projectDirPath),
  getProjectPrompts: (projectPath: string) => ipcRenderer.invoke('get-project-prompts', projectPath),
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  collectDiagnostics: () => ipcRenderer.invoke('collect-diagnostics'),
  repairMetadata: (dryRun: boolean) => ipcRenderer.invoke('repair-metadata', { dryRun }),
  getProviderPresence: () => ipcRenderer.invoke('get-provider-presence'),
  collectDiagnosticsHex: () => ipcRenderer.invoke('collect-diagnostics-hex'),
  repairMetadataHex: (provider: string | undefined, dryRun: boolean) => ipcRenderer.invoke('repair-metadata-hex', { provider, dryRun }),
  getGitStatus: (baseDir?: string) => ipcRenderer.invoke('get-git-status', baseDir),
  getGitCommits: (options?: { baseDir?: string; limit?: number }) => ipcRenderer.invoke('get-git-commits', options),
  onScreenshotTaken: (callback: (event: any, data: { path: string }) => void) => {
    ipcRenderer.on('screenshot-taken', callback);
    return () => ipcRenderer.removeListener('screenshot-taken', callback);
  },
  onDataChanged: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('data-changed', handler);
    return () => ipcRenderer.removeListener('data-changed', handler);
  },
  // Add listener for file changes
  onTodoFilesChanged: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('todo-files-changed', callback);
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('todo-files-changed', callback);
    };
  }
});
