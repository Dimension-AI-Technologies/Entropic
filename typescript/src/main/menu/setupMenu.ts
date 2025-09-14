import { app, Menu } from 'electron';
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

  // Logging state (defaults off)
  let logAnimations = false;
  let logBoids = false;
  type Level = 'silent'|'failure'|'error'|'warning'|'information'|'debug'|'trace';
  let consoleLevel: Level = 'silent';
  let logToFile = false;
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
    const win = getMainWindow ? getMainWindow() : null;
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
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
