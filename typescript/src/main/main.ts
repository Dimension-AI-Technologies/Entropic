import electron from 'electron';
const { app, BrowserWindow, ipcMain, dialog, clipboard } = electron;
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
import { Ok, Err } from '../utils/Result.js';
import { setupFileWatching as setupFileWatchingExt, cleanupFileWatchers as cleanupFileWatchersExt } from './watchers/fileWatchers.js';
//
import { registerProjectsIpc } from './ipc/projects.js';
import { registerTodoIpc } from './ipc/todos.js';
import { registerFileIpc } from './ipc/files.js';
import { registerChatIpc } from './ipc/chat.js';
import { registerMaintenanceIpc } from './ipc/maintenance.js';
import { setupSingleInstance } from './lifecycle/singleInstance.js';
import { wireAppEvents } from './lifecycle/appEvents.js';

let mainWindow: BrowserWindowType | null = null;

// Paths to Claude directories
const claudeDir = path.join(os.homedir(), '.claude');
const todosDir = path.join(claudeDir, 'todos');
const projectsDir = path.join(claudeDir, 'projects');
const logsDir = path.join(claudeDir, 'logs');
// Codex provider dirs (for future multi‑provider support)
const codexDir = path.join(os.homedir(), '.codex');
const codexTodosDir = path.join(codexDir, 'todos');
const codexProjectsDir = path.join(codexDir, 'projects');
const codexLogsDir = path.join(codexDir, 'logs');

// Project loading handled by src/main/loaders/projects.ts and IPC module

// takeScreenshot moved to src/main/utils/screenshot.ts

// showHelp moved to src/main/menu/showHelp.ts

// setupMenu moved to src/main/menu/setupMenu.ts

async function createWindow() {
  // Resolve preload; fall back to no-preload in dev without build
  const preloadCandidate = path.join(__dirname, 'preload.js');
  const hasPreload = fsSync.existsSync(preloadCandidate);
  console.log('[MAIN] __dirname =', __dirname);
  console.log('[MAIN] preload exists?', hasPreload, preloadCandidate);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'ClaudeToDo - Session Monitor',
    webPreferences: {
      nodeIntegration: hasPreload ? false : true,
      contextIsolation: hasPreload ? true : false,
      preload: hasPreload ? preloadCandidate : undefined
    },
    // Remove hiddenInset to show normal title bar
    // titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1d21',
    icon: path.join(__dirname, '../../assets/ClaudeLogo.png')
  });

  // In development, load from Vite dev server
  const devMode = process.env.NODE_ENV === 'development';
  if (devMode) {
    try {
      await mainWindow!.loadURL('http://localhost:5173');
      mainWindow!.webContents.openDevTools();
    } catch {
      // Fallback to local file if dev server not running
      const devIndex = path.join(process.cwd(), 'typescript', 'index.html');
      if (fsSync.existsSync(devIndex)) {
        await mainWindow!.loadFile(devIndex);
        mainWindow!.webContents.openDevTools();
      }
    }
  } else {
    // In production, try built renderer; if missing (e.g., started without build), fall back sensibly
    const builtIndex = path.join(__dirname, '../renderer/index.html');
    if (fsSync.existsSync(builtIndex)) {
      await mainWindow!.loadFile(builtIndex);
    } else {
      const devIndex = path.join(process.cwd(), 'typescript', 'index.html');
      if (fsSync.existsSync(devIndex)) {
        await mainWindow!.loadFile(devIndex);
        try { mainWindow!.webContents.openDevTools(); } catch {}
      } else {
        await mainWindow!.loadURL('data:text/html,<h1 style="color:white;background:#1a1d21;font-family:sans-serif;">Renderer build not found. Run npm run build or npm run dev.</h1>');
      }
    }
  }

  mainWindow!.on('closed', () => {
    mainWindow = null;
  });

  // Ensure window is visible
  mainWindow!.show();
  mainWindow!.focus();

  // Verbose load tracing
  mainWindow!.webContents.on('did-start-loading', () => console.log('[MAIN] Renderer did-start-loading'));
  mainWindow!.webContents.on('did-finish-load', () => console.log('[MAIN] Renderer did-finish-load URL=', mainWindow?.webContents.getURL()));
  mainWindow!.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    console.error('[MAIN] Renderer did-fail-load', { errorCode, errorDescription, validatedURL });
  });
  mainWindow!.webContents.on('render-process-gone', (_e, details) => {
    console.error('[MAIN] render-process-gone', details);
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
        try { clipboard.writeText(result.value); } catch {}
        try { mainWindow.webContents.send('screenshot-taken', { path: result.value }); } catch {}
      } else {
        try { mainWindow.webContents.send('screenshot-taken', { path: '' }); } catch {}
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
  registerMaintenanceIpc(ipcMain, { projectsDir, todosDir });

  // Screenshot handler (used by renderer via preload)
  ipcMain.handle('take-screenshot', async () => {
    if (!mainWindow) return Err('No window');
    const result = await takeScreenshot(mainWindow);
    if (result.success) {
      try { clipboard.writeText(result.value); } catch {}
      try { mainWindow.webContents.send('screenshot-taken', { path: result.value }); } catch {}
      return Ok({ path: result.value });
    }
    return Err(result.error ? String(result.error) : 'Unknown error');
  });
  
  createWindow();
  
  // Set up file watching after window is created (Claude + Codex)
  if (mainWindow) {
    fileWatchers = [];
    // Claude
    fileWatchers.push(
      ...setupFileWatchingExt(mainWindow, { projectsDir, todosDir, logsDir })
    );
    // Codex (if present)
    try {
      if (fsSync.existsSync(codexDir)) {
        fileWatchers.push(
          ...setupFileWatchingExt(mainWindow, { projectsDir: codexProjectsDir, todosDir: codexTodosDir, logsDir: codexLogsDir })
        );
      }
    } catch {}
  }

  // One-time repair prompt on startup if unknown sessions exceed threshold
  setTimeout(async () => {
    try {
      const prefsPath = path.join(app.getPath('userData'), 'prefs.json');
      let prefs: any = {};
      try { prefs = JSON.parse(fsSync.readFileSync(prefsPath, 'utf-8')); } catch {}
      if (prefs?.repairPromptedOnce) return;
      // Ask diagnostics
      const { collectDiagnostics } = await import('./maintenance/repair.js');
      const d = await collectDiagnostics(projectsDir, todosDir);
      const unknown = d.unknownCount ?? 0;
      const threshold = 5;
      if (unknown > threshold && mainWindow) {
        const choice = await dialog.showMessageBox(mainWindow, {
          type: 'warning',
          buttons: ['Repair Live', 'Dry Run', 'Ignore'],
          cancelId: 2,
          title: 'Project Repair Suggested',
          message: `Detected ${unknown} unanchored todo sessions`,
          detail: 'You can run a dry run to see planned changes, or repair live to write metadata now.'
        });
        try { fsSync.writeFileSync(prefsPath, JSON.stringify({ ...(prefs||{}), repairPromptedOnce: true }, null, 2)); } catch {}
        if (choice.response === 0) {
          const { repairProjectMetadata } = await import('./maintenance/repair.js');
          await repairProjectMetadata(projectsDir, todosDir, false);
        } else if (choice.response === 1) {
          const { repairProjectMetadata } = await import('./maintenance/repair.js');
          await repairProjectMetadata(projectsDir, todosDir, true);
        }
      }
    } catch {}
  }, 3000);

  wireAppEvents(
    app,
    () => mainWindow,
    () => createWindow(),
    () => {
      if (mainWindow) {
        fileWatchers = [];
        fileWatchers.push(
          ...setupFileWatchingExt(mainWindow, { projectsDir, todosDir, logsDir })
        );
        try {
          if (fsSync.existsSync(codexDir)) {
            fileWatchers.push(
              ...setupFileWatchingExt(mainWindow, { projectsDir: codexProjectsDir, todosDir: codexTodosDir, logsDir: codexLogsDir })
            );
          }
        } catch {}
      }
    },
    () => cleanupFileWatchersExt(fileWatchers)
  );
});
