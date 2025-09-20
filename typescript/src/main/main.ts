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
import { registerProvidersIpc } from './ipc/providers.js';
import { registerDiagnosticsIpc } from './ipc/diagnostics.js';
import { registerGitStatusIpc } from './ipc/gitStatus.js';
import { setupSingleInstance } from './lifecycle/singleInstance.js';
import { wireAppEvents } from './lifecycle/appEvents.js';
import { Aggregator } from './core/aggregator.js';
import { ClaudeAdapter } from './adapters/claudeAdapter.js';
import { CodexAdapter } from './adapters/codexAdapter.js';
import { GeminiAdapter } from './adapters/geminiAdapter.js';
import type { EventPort, ProviderPort } from './core/ports.js';
import { getRepairThreshold } from './utils/prefs.js';
import { loadTodosData } from './loaders/projects.js';

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
// Gemini provider dirs (sessions-based)
const geminiDir = path.join(os.homedir(), '.gemini');
const geminiSessionsDir = path.join(geminiDir, 'sessions');

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
  mainWindow!.webContents.on('did-finish-load', async () => {
    console.log('[MAIN] Renderer did-finish-load URL=', mainWindow?.webContents.getURL());
    try {
      // Dev/testing helper: auto-screenshot if enabled
      if (process.env.ENTROPIC_AUTOSNAP === '1' && mainWindow) {
        console.log('[MAIN] ENTROPIC_AUTOSNAP=1 detected; taking screenshot in 1s');
        setTimeout(async () => {
          try {
            const result = await takeScreenshot(mainWindow!);
            if ((result as any)?.success) {
              console.log('[MAIN] Auto-screenshot saved to', (result as any).value);
            } else {
              console.warn('[MAIN] Auto-screenshot failed', (result as any)?.error || result);
            }
          } catch (e) {
            console.warn('[MAIN] Auto-screenshot exception', e);
          }
        }, 1000);
      }
    } catch {}
  });
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
        try { mainWindow.webContents.send('screenshot-taken', { path: '', error: result.error ? String(result.error) : 'Unknown error' }); } catch {}
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
  // DEBUG: Verify correct paths
  console.log('[MAIN] Using paths:');
  console.log('[MAIN]   projectsDir:', projectsDir);
  console.log('[MAIN]   todosDir:', todosDir);
  console.log('[MAIN]   logsDir:', logsDir);
  
  const eventPort: EventPort = {
    dataChanged() {
      try { mainWindow?.webContents.send('data-changed'); } catch {}
    }
  };
  // Instantiate providers and aggregator
  // Auto-detect providers — no enabling config; respond to what exists
  const providers: ProviderPort[] = [];
  providers.push(new ClaudeAdapter({ projectsDir, logsDir, todosDir }));
  try {
    if (fsSync.existsSync(codexDir)) {
      providers.push(new CodexAdapter({ projectsDir: codexProjectsDir, logsDir: codexLogsDir, todosDir: codexTodosDir }));
    }
    if (fsSync.existsSync(geminiDir)) {
      providers.push(new GeminiAdapter({ sessionsDir: geminiSessionsDir }));
    }
  } catch {}
  const aggregator = new Aggregator(providers, eventPort);
  // Register IPC handlers via modules
  registerProjectsIpc(ipcMain, { projectsDir, logsDir, todosDir, aggregator });
  registerTodoIpc(ipcMain);
  registerFileIpc(ipcMain);
  registerChatIpc(ipcMain);
  registerMaintenanceIpc(ipcMain, { projectsDir, todosDir });
  registerProvidersIpc(ipcMain);
  registerDiagnosticsIpc(ipcMain, providers);
  registerGitStatusIpc(ipcMain);

  // Screenshot handler (used by renderer via preload)
  ipcMain.handle('take-screenshot', async () => {
    if (!mainWindow) return Err('No window');
    const result = await takeScreenshot(mainWindow);
    if (result.success) {
      try { clipboard.writeText(result.value); } catch {}
      try { mainWindow.webContents.send('screenshot-taken', { path: result.value }); } catch {}
      return Ok({ path: result.value });
    }
    try { mainWindow.webContents.send('screenshot-taken', { path: '', error: result.error ? String(result.error) : 'Unknown error' }); } catch {}
    return Err(result.error ? String(result.error) : 'Unknown error');
  });
  
  createWindow();

  // Optional forced autoscreenshot a couple seconds after window creation
  try {
    if (process.env.ENTROPIC_AUTOSNAP_FORCE === '1') {
      console.log('[MAIN] ENTROPIC_AUTOSNAP_FORCE=1 detected; forcing screenshot in 2s');
      setTimeout(async () => {
        try {
          if (!mainWindow) return;
          const result = await takeScreenshot(mainWindow);
          if ((result as any)?.success) {
            console.log('[MAIN] Forced auto-screenshot saved to', (result as any).value);
          } else {
            console.warn('[MAIN] Forced auto-screenshot failed', (result as any)?.error || result);
          }
        } catch (e) {
          console.warn('[MAIN] Forced auto-screenshot exception', e);
        }
      }, 2000);
    }
  } catch {}

  // Dev-only consistency check: ClaudeAdapter vs legacy loader
  (async () => {
    try {
      const isDev = process.env.NODE_ENV === 'development';
      if (!isDev) return;
      const claude = providers.find(p => p.id === 'claude');
      if (!claude) return;
      const d = await claude.fetchProjects();
      const legacy = await loadTodosData(projectsDir, logsDir, todosDir);
      if (!d.success || !legacy.success) {
        console.warn('[DEV CHECK] Skipping compare; adapter or legacy failed');
        return;
      }
      const domain = d.value;
      const old = legacy.value;
      const dMap = new Map(domain.map(p => [p.projectPath, p.sessions.reduce((n,s)=> n + (s.todos?.length||0), 0)]));
      const oMap = new Map(old.map((p:any) => [p.path, (p.sessions||[]).reduce((n:number,s:any)=> n + ((s.todos||[]).length||0), 0)]));
      let mismatches = 0;
      for (const [k, v] of oMap) {
        const dv = dMap.get(k) ?? -1;
        if (dv !== v) { console.warn('[DEV CHECK] Mismatch', k, 'todos legacy=', v, 'domain=', dv); mismatches++; }
      }
      if (mismatches === 0) console.log('[DEV CHECK] ClaudeAdapter matches legacy loader on todo counts across projects');
    } catch (e) {
      console.warn('[DEV CHECK] Exception during compare:', e);
    }
  })();
  
  // Set up file watching after window is created (Claude + Codex)
  if (mainWindow) {
    fileWatchers = [];
    const watcherResult = setupFileWatchingExt(
      mainWindow,
      {
        projectsDir,
        todosDir,
        logsDir,
        codexDir: fsSync.existsSync(codexDir) ? codexDir : undefined,
        geminiDir: fsSync.existsSync(geminiDir) ? geminiDir : undefined,
      },
      300
    );
    if (watcherResult.success) {
      fileWatchers.push(...watcherResult.value);
    } else {
      console.error('[FileWatch] Failed to set up watchers:', watcherResult.error);
    }
  }

  // One-time repair prompt on startup if unknown sessions exceed threshold
  setTimeout(async () => {
    try {
      const prefsPath = path.join(app.getPath('userData'), 'prefs.json');
      let prefs: any = {};
      try { prefs = JSON.parse(fsSync.readFileSync(prefsPath, 'utf-8')); } catch {}
      if (prefs?.repairPromptedOnce) return;
      // Ask diagnostics per provider
      const { collectDiagnostics } = await import('./maintenance/repair.js');
      const claudeDiag = await collectDiagnostics(projectsDir, todosDir);
      let codexDiag: any = null;
      try { if (fsSync.existsSync(codexDir)) { codexDiag = await collectDiagnostics(codexProjectsDir, codexTodosDir); } } catch {}
      const claudeUnknown = claudeDiag.unknownCount ?? 0;
      const codexUnknown = codexDiag ? (codexDiag.unknownCount ?? 0) : 0;
      const unknown = claudeUnknown + codexUnknown;
      const threshold = getRepairThreshold();
      if (unknown > threshold && mainWindow) {
        const choice = await dialog.showMessageBox(mainWindow, {
          type: 'warning',
          buttons: ['Repair Live', 'Dry Run', 'Ignore'],
          cancelId: 2,
          title: 'Project Repair Suggested',
          message: `Detected ${unknown} unanchored todo sessions`,
          detail: `Per-provider counts:\n• Claude: ${claudeUnknown}` + (codexDiag ? `\n• Codex: ${codexUnknown}` : '') + `\n\nYou can run a dry run to see planned changes, or repair live to write metadata now (applies to all providers).`
        });
        try { fsSync.writeFileSync(prefsPath, JSON.stringify({ ...(prefs||{}), repairPromptedOnce: true }, null, 2)); } catch {}
        if (choice.response === 0) {
          const { repairProjectMetadata } = await import('./maintenance/repair.js');
          await repairProjectMetadata(projectsDir, todosDir, false);
          try { if (fsSync.existsSync(codexDir)) { await repairProjectMetadata(codexProjectsDir, codexTodosDir, false); } } catch {}
        } else if (choice.response === 1) {
          const { repairProjectMetadata } = await import('./maintenance/repair.js');
          await repairProjectMetadata(projectsDir, todosDir, true);
          try { if (fsSync.existsSync(codexDir)) { await repairProjectMetadata(codexProjectsDir, codexTodosDir, true); } } catch {}
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
        const baseWatchers = setupFileWatchingExt(mainWindow, { projectsDir, todosDir, logsDir }, 300);
        if (baseWatchers.success) {
          fileWatchers.push(...baseWatchers.value);
        } else {
          console.error('[FileWatch] Failed to setup base watchers:', baseWatchers.error);
        }
        try {
          if (fsSync.existsSync(codexDir)) {
            const codexWatchers = setupFileWatchingExt(mainWindow, { projectsDir: codexProjectsDir, todosDir: codexTodosDir, logsDir: codexLogsDir }, 300);
            if (codexWatchers.success) {
              fileWatchers.push(...codexWatchers.value);
            } else {
              console.error('[FileWatch] Failed to setup Codex watchers:', codexWatchers.error);
            }
          }
          if (fsSync.existsSync(geminiDir)) {
            const geminiWatchers = setupFileWatchingExt(mainWindow, { projectsDir: geminiSessionsDir, todosDir: geminiSessionsDir, logsDir: geminiSessionsDir }, 300);
            if (geminiWatchers.success) {
              fileWatchers.push(...geminiWatchers.value);
            } else {
              console.error('[FileWatch] Failed to setup Gemini watchers:', geminiWatchers.error);
            }
          }
        } catch {}
      }
    },
    () => cleanupFileWatchersExt(fileWatchers)
  );
});
