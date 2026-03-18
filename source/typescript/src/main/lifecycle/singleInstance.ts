import type { App, BrowserWindow } from 'electron';

export function setupSingleInstance(app: App, getMainWindow: () => BrowserWindow | null): boolean {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    console.error('[SingleInstance] Another instance is already running. Exiting...');
    app.quit();
    return false;
  }
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    console.log('[SingleInstance] Second instance attempted, focusing existing window');
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  return true;
}

