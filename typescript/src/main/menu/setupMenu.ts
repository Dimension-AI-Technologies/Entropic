// EXEMPTION: exceptions - menu utilities and getters don't need Result<T>
import { app, Menu, clipboard } from 'electron';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export type ShowHelpHandler = () => void;
export type TakeScreenshotHandler = () => void | Promise<void>;

export function setupMenu(options: {
  onShowHelp: ShowHelpHandler;
  onTakeScreenshot: TakeScreenshotHandler;
  getMainWindow?: () => Electron.BrowserWindow | null;
}) {
  const { onShowHelp, onTakeScreenshot, getMainWindow } = options;
  const isMac = process.platform === 'darwin';

  // Ensure app name appears as "Entropic" in OS-native menus
  try { app.setName('Entropic'); } catch {}

  // Logging state (default to trace for debugging)
  let logAnimations = true;
  let logBoids = true;
  type Level = 'silent'|'failure'|'error'|'warning'|'information'|'debug'|'trace';
  let consoleLevel: Level = 'trace'; // Changed to trace for debugging
  let logToFile = true;
  let logFilePath: string | null = null;

  // Store originals for restoration
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
    trace: console.trace,
  } as const;

  const levelScore: Record<Level, number> = {
    silent: 100,
    failure: 55,
    error: 50,
    warning: 40,
    information: 30,
    debug: 20,
    trace: 10,
  };

  const methodLevel: Record<keyof typeof originalConsole, number> = {
    error: 50,
    warn: 40,
    info: 30,
    log: 30,
    debug: 20,
    trace: 10,
  } as any;

  function formatNow() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  async function ensureLogFile() {
    const dir = path.join(os.homedir(), 'temp', 'Entropic');
    await fsPromises.mkdir(dir, { recursive: true }).catch(() => {});
    const file = path.join(dir, `entropic-${Date.now()}.log`);
    await fsPromises.writeFile(file, `Entropic log started ${new Date().toISOString()}\n`).catch(() => {});
    logFilePath = file;
  }

  function applyConsoleHook() {
    const currentThresh = levelScore[consoleLevel];
    const writeLine = (lvl: string, args: any[]) => {
      if (!logToFile || !logFilePath) return;
      const line = `[${formatNow()}] [${lvl.toUpperCase()}] ${args.map(a => typeof a === 'string' ? a : (()=>{ try { return JSON.stringify(a); } catch { return String(a); }})()).join(' ')}\n`;
      try { fs.appendFileSync(logFilePath, line); } catch {}
    };
    (['error','warn','info','log','debug','trace'] as const).forEach((k) => {
      console[k] = ((...args: any[]) => {
        // Always call original
        (originalConsole[k] as any)(...args);
        // Filter by level for file logging
        if (methodLevel[k] >= currentThresh) return;
        writeLine(k, args);
      }) as any;
    });
  }

  function restoreConsole() {
    (['error','warn','info','log','debug','trace'] as const).forEach((k) => {
      console[k] = originalConsole[k] as any;
    });
  }

  async function updateLogToFile(next: boolean) {
    logToFile = next;
    if (logToFile && !logFilePath) await ensureLogFile();
    if (logToFile) applyConsoleHook();
    else restoreConsole();
    broadcast();
  }

  function updateConsoleLevel(next: Level) {
    consoleLevel = next;
    if (logToFile) applyConsoleHook();
    broadcast();
  }

  function updateFlags() { broadcast(); }

  function broadcast() {
    const win = getMainWindow ? getMainWindow() : null; // EXEMPTION: simple getter
    try { win?.webContents.send('log-options-changed', { logAnimations, logBoids, consoleLevel, logToFile, logFilePath }); } catch {}
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: 'Entropic',
            submenu: [
              { role: 'about' as const, label: 'About Entropic' },
              { type: 'separator' as const },
              { role: 'hide' as const, label: 'Hide Entropic' },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const, label: 'Quit Entropic' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        { role: 'close' as const },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'copy' as const },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        {
          label: 'Take Screenshot',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => void onTakeScreenshot(),
        },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },
    {
  role: 'help',
  submenu: [
        { label: 'Entropic Help', accelerator: 'F1', click: onShowHelp },
        { type: 'separator' as const },
        {
          label: 'Repair Project Metadata (Dry Run)…',
          click: async () => {
            try {
              const { repairProjectMetadata } = await import('../maintenance/repair.js');
              const win = getMainWindow ? getMainWindow() : null;
              const res = await repairProjectMetadata?.(path.join(os.homedir(), '.claude', 'projects'), path.join(os.homedir(), '.claude', 'todos'), true);
              const msg = res ? `DRY RUN\nProjects scanned: ${res.projectsScanned}\nTodo sessions scanned: ${res.todosScanned}\nWould write metadata: ${res.metadataPlanned}\nMatched via sidecar meta: ${res.matchedBySidecar}\nMatched via JSONL filename: ${res.matchedByJsonl}\nUnanchored sessions: ${res.unknownSessions.length}` : 'No result';
              try { (await import('electron')).dialog.showMessageBox(win!, { type: 'info', title: 'Repair (Dry Run)', message: 'Repair Project Metadata', detail: msg }); } catch {}
            } catch (e) {
              try { (await import('electron')).dialog.showMessageBox(getMainWindow?.()!, { type: 'error', title: 'Repair Failed', message: String(e) }); } catch {}
            }
          }
        },
        {
          label: 'Repair Project Metadata (Live)…',
          click: async () => {
            try {
              const { repairProjectMetadata } = await import('../maintenance/repair.js');
              const win = getMainWindow ? getMainWindow() : null;
              const res = await repairProjectMetadata?.(path.join(os.homedir(), '.claude', 'projects'), path.join(os.homedir(), '.claude', 'todos'), false);
              const msg = res ? `LIVE RUN\nProjects scanned: ${res.projectsScanned}\nTodo sessions scanned: ${res.todosScanned}\nMetadata files written: ${res.metadataWritten} (planned ${res.metadataPlanned})\nMatched via sidecar meta: ${res.matchedBySidecar}\nMatched via JSONL filename: ${res.matchedByJsonl}\nUnanchored sessions: ${res.unknownSessions.length}` : 'No result';
              try { (await import('electron')).dialog.showMessageBox(win!, { type: 'info', title: 'Repair (Live)', message: 'Repair Project Metadata', detail: msg }); } catch {}
            } catch (e) {
              try { (await import('electron')).dialog.showMessageBox(getMainWindow?.()!, { type: 'error', title: 'Repair Failed', message: String(e) }); } catch {}
            }
          }
        },
        { type: 'separator' as const },
        {
          label: 'Codex: Repair Metadata (Dry Run)…',
          click: async () => {
            try {
              const { repairProjectMetadata } = await import('../maintenance/repair.js');
              const win = getMainWindow ? getMainWindow() : null;
              const codexDir = path.join(os.homedir(), '.codex');
              const res = await repairProjectMetadata?.(path.join(codexDir, 'projects'), path.join(codexDir, 'todos'), true);
              const msg = res ? `DRY RUN\nProjects scanned: ${res.projectsScanned}\nTodo sessions scanned: ${res.todosScanned}\nWould write metadata: ${res.metadataPlanned}\nMatched via sidecar meta: ${res.matchedBySidecar}\nMatched via JSONL filename: ${res.matchedByJsonl}\nUnanchored sessions: ${res.unknownSessions.length}` : 'No result';
              try { (await import('electron')).dialog.showMessageBox(win!, { type: 'info', title: 'Codex Repair (Dry Run)', message: 'Repair Codex Metadata', detail: msg }); } catch {}
            } catch (e) {
              try { (await import('electron')).dialog.showMessageBox(getMainWindow?.()!, { type: 'error', title: 'Repair Failed', message: String(e) }); } catch {}
            }
          }
        },
        {
          label: 'Codex: Repair Metadata (Live)…',
          click: async () => {
            try {
              const { repairProjectMetadata } = await import('../maintenance/repair.js');
              const win = getMainWindow ? getMainWindow() : null;
              const codexDir = path.join(os.homedir(), '.codex');
              const res = await repairProjectMetadata?.(path.join(codexDir, 'projects'), path.join(codexDir, 'todos'), false);
              const msg = res ? `LIVE RUN\nProjects scanned: ${res.projectsScanned}\nTodo sessions scanned: ${res.todosScanned}\nMetadata files written: ${res.metadataWritten} (planned ${res.metadataPlanned})\nMatched via sidecar meta: ${res.matchedBySidecar}\nMatched via JSONL filename: ${res.matchedByJsonl}\nUnanchored sessions: ${res.unknownSessions.length}` : 'No result';
              try { (await import('electron')).dialog.showMessageBox(win!, { type: 'info', title: 'Codex Repair (Live)', message: 'Repair Codex Metadata', detail: msg }); } catch {}
            } catch (e) {
              try { (await import('electron')).dialog.showMessageBox(getMainWindow?.()!, { type: 'error', title: 'Repair Failed', message: String(e) }); } catch {}
            }
          }
        },
        {
          label: 'Show Diagnostics…',
          click: async () => {
            try {
              const { collectDiagnostics } = await import('../maintenance/repair.js');
              const win = getMainWindow ? getMainWindow() : null;
              const claude = await collectDiagnostics(path.join(os.homedir(), '.claude', 'projects'), path.join(os.homedir(), '.claude', 'todos'));
              const codexDir = path.join(os.homedir(), '.codex');
              let codex: any = null;
              try { const fs = await import('node:fs'); if (fs.existsSync(codexDir)) { codex = await collectDiagnostics(path.join(codexDir, 'projects'), path.join(codexDir, 'todos')); } } catch {}
              const detail = [
                `Claude: ${claude.unknownCount} unknown` + (claude.text ? `\n${claude.text}` : ''),
                codex ? (`\n\nCodex: ${codex.unknownCount} unknown` + (codex.text ? `\n${codex.text}` : '')) : ''
              ].join('');
              try { (await import('electron')).dialog.showMessageBox(win!, { type: 'info', title: 'Diagnostics (All Providers)', message: 'Unanchored Sessions by Provider', detail }); } catch {}
            } catch (e) {
              try { (await import('electron')).dialog.showMessageBox(getMainWindow?.()!, { type: 'error', title: 'Diagnostics Failed', message: String(e) }); } catch {}
            }
          }
        },
        {
          label: 'Repair Settings',
          submenu: [
            {
              label: 'Default Dry-Run', type: 'checkbox', checked: true,
              click: async (item) => {
                const { loadPrefsSync, savePrefsSync } = await import('../utils/prefs.js');
                const p = loadPrefsSync();
                savePrefsSync(cur => ({ ...(cur||{}), repair: { ...(p.repair||{}), defaultDryRun: !!item.checked } }));
              }
            },
            { type: 'separator' as const },
            {
              label: 'Set Threshold = 5',
              click: async () => {
                const { loadPrefsSync, savePrefsSync } = await import('../utils/prefs.js');
                const p = loadPrefsSync();
                savePrefsSync(cur => ({ ...(cur||{}), repair: { ...(p.repair||{}), threshold: 5 } }));
              }
            },
            {
              label: 'Set Threshold = 10',
              click: async () => {
                const { loadPrefsSync, savePrefsSync } = await import('../utils/prefs.js');
                const p = loadPrefsSync();
                savePrefsSync(cur => ({ ...(cur||{}), repair: { ...(p.repair||{}), threshold: 10 } }));
              }
            },
          ] as Electron.MenuItemConstructorOptions[],
        },
        {
          label: 'Logging Options',
          submenu: [
            {
              label: 'Log Animations', type: 'checkbox', checked: logAnimations,
              click: (item) => { logAnimations = !!item.checked; updateFlags(); }
            },
            {
              label: 'Log Boids', type: 'checkbox', checked: logBoids,
              click: (item) => { logBoids = !!item.checked; updateFlags(); }
            },
            { type: 'separator' as const },
            {
              label: 'Console Log Level',
              submenu: (
                ['silent','failure','error','warning','information','debug','trace'] as Level[]
              ).map((lvl) => ({
                label: lvl.charAt(0).toUpperCase() + lvl.slice(1), type: 'radio' as const, checked: consoleLevel === lvl,
                click: () => updateConsoleLevel(lvl)
              }))
            },
            { type: 'separator' as const },
            {
              label: 'Log To File', type: 'checkbox', checked: logToFile,
              click: async (item) => { await updateLogToFile(!!item.checked); }
            },
          ] as Electron.MenuItemConstructorOptions[],
        },
        { type: 'separator' as const },
        {
          label: 'Copy Log Path',
          click: async () => {
            try {
              if (!logFilePath) {
                await ensureLogFile().catch(() => {});
              }
              if (logFilePath) {
                clipboard.writeText(logFilePath);
              }
            } catch {}
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
