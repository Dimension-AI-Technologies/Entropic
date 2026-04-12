import { BrowserWindow, type App, type BrowserWindowConstructorOptions } from 'electron';
import type { BrowserWindow as BrowserWindowType } from 'electron';

export function wireAppEvents(
  app: App,
  getMainWindow: () => BrowserWindowType | null,
  createWindow: () => void,
  setupWatchers: () => void,
  cleanupWatchers: () => void
) {
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      setupWatchers();
    }
  });

  app.on('window-all-closed', () => {
    cleanupWatchers();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    cleanupWatchers();
  });
}

