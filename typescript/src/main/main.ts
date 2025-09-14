import electron from 'electron';
const { app, BrowserWindow, ipcMain, dialog } = electron;
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
//

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import type { BrowserWindow as BrowserWindowType } from 'electron';
import { setupMenu } from './menu/setupMenu.js';
import { showHelp as showHelpDialog } from './menu/showHelp.js';
import { takeScreenshot } from './utils/screenshot.js';
import { setupFileWatching as setupFileWatchingExt, cleanupFileWatchers as cleanupFileWatchersExt } from './watchers/fileWatchers.js';
//
import { registerProjectsIpc } from './ipc/projects.js';
import { registerTodoIpc } from './ipc/todos.js';
import { registerFileIpc } from './ipc/files.js';
import { registerChatIpc } from './ipc/chat.js';
import { setupSingleInstance } from './lifecycle/singleInstance.js';
import { wireAppEvents } from './lifecycle/appEvents.js';

let mainWindow: BrowserWindowType | null = null;

// Paths to Claude directories
const claudeDir = path.join(os.homedir(), '.claude');
const todosDir = path.join(claudeDir, 'todos');
const projectsDir = path.join(claudeDir, 'projects');
const logsDir = path.join(claudeDir, 'logs');

// Project loading handled by src/main/loaders/projects.ts and IPC module

// takeScreenshot moved to src/main/utils/screenshot.ts

// showHelp moved to src/main/menu/showHelp.ts

// setupMenu moved to src/main/menu/setupMenu.ts

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'ClaudeToDo - Session Monitor',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    // Remove hiddenInset to show normal title bar
    // titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1d21',
    icon: path.join(__dirname, '../../assets/ClaudeLogo.png')
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow!.loadURL('http://localhost:5173');
    mainWindow!.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow!.loadFile(path.join(__dirname, '../renderer/index.html'));
    // TEMPORARILY open DevTools in production to debug
    mainWindow!.webContents.openDevTools();
  }

  mainWindow!.on('closed', () => {
    mainWindow = null;
  });
  
  // Set up streamlined application menu (moved to separate module)
  setupMenu({
    onShowHelp: () => {
      if (mainWindow) showHelpDialog(mainWindow);
    },
    onTakeScreenshot: async () => {
      if (!mainWindow) return;
      const result = await takeScreenshot(mainWindow);
      if (result.success) {
        await dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Screenshot Saved',
          message: 'Screenshot saved successfully.',
          detail: result.value,
        });
      } else {
        await dialog.showMessageBox(mainWindow, {
          type: 'error',
          title: 'Screenshot Failed',
          message: 'Failed to take screenshot',
          detail: result.error ? String(result.error) : 'Unknown error',
        });
      }
    },
    getMainWindow: () => mainWindow,
  });
}

// File watching moved to src/main/watchers/fileWatchers.ts
let fileWatchers: fsSync.FSWatcher[] = [];

// Single instance lock - prevent multiple instances
const haveLock = setupSingleInstance(app, () => mainWindow);
if (!haveLock) {
  // Exited by setupSingleInstance
}

app.whenReady().then(() => {
  // Register IPC handlers via modules
  registerProjectsIpc(ipcMain, { projectsDir, logsDir, todosDir });
  registerTodoIpc(ipcMain);
  registerFileIpc(ipcMain);
  registerChatIpc(ipcMain);

  // Screenshot handler (used by renderer via preload)
  ipcMain.handle('take-screenshot', async () => {
    if (!mainWindow) return { success: false, error: 'No window' };
    const result = await takeScreenshot(mainWindow);
    if (result.success) {
      return { success: true, path: result.value };
    }
    return { success: false, error: result.error ? String(result.error) : 'Unknown error' };
  });
  
  createWindow();
  
  // Set up file watching after window is created
  if (mainWindow) {
    fileWatchers = setupFileWatchingExt(mainWindow, {
      projectsDir,
      todosDir,
      logsDir,
    });
  }

  // Take a screenshot after a longer delay for debugging to let app fully load
  setTimeout(async () => {
    console.log('Taking automatic screenshot for debugging...');
    if (mainWindow) {
      await takeScreenshot(mainWindow);
    }
  }, 8000);

  wireAppEvents(
    app,
    () => mainWindow,
    () => createWindow(),
    () => {
      if (mainWindow) {
        fileWatchers = setupFileWatchingExt(mainWindow, { projectsDir, todosDir, logsDir });
      }
    },
    () => cleanupFileWatchersExt(fileWatchers)
  );
});
