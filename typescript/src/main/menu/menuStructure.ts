// Menu structure definitions
import { clipboard } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import type { Level } from './logging';
import { getLoggingState, updateLogToFile, updateConsoleLevel, updateLogAnimations, updateLogBoids } from './logging';
import { showRepairDialog, showDiagnosticsDialog } from './diagnostics';

export type ShowHelpHandler = () => void;
export type TakeScreenshotHandler = () => void | Promise<void>;

interface MenuOptions {
  onShowHelp: ShowHelpHandler;
  onTakeScreenshot: TakeScreenshotHandler;
  getMainWindow?: () => Electron.BrowserWindow | null;
  isMac: boolean;
}

export function createAppMenu(options: MenuOptions): MenuItemConstructorOptions {
  const { isMac } = options;

  return {
    label: 'Entropic',
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  };
}

export function createEditMenu(): MenuItemConstructorOptions {
  return {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ],
  };
}

export function createViewMenu(options: MenuOptions): MenuItemConstructorOptions {
  const { onTakeScreenshot } = options;
  const state = getLoggingState();

  return {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      {
        label: 'Take Screenshot',
        accelerator: 'CmdOrCtrl+Shift+S',
        click: onTakeScreenshot,
      },
      { type: 'separator' },
      {
        label: 'Debug',
        submenu: [
          {
            type: 'checkbox',
            label: 'Log to File',
            checked: state.logToFile,
            click: (item) => updateLogToFile(item.checked),
          },
          { type: 'separator' },
          {
            label: 'Console Level',
            submenu: (['silent', 'failure', 'error', 'warning', 'information', 'debug', 'trace'] as Level[]).map(
              (level) => ({
                type: 'radio' as const,
                label: level.charAt(0).toUpperCase() + level.slice(1),
                checked: state.consoleLevel === level,
                click: () => updateConsoleLevel(level),
              })
            ),
          },
          { type: 'separator' },
          {
            type: 'checkbox',
            label: 'Log Animations',
            checked: state.logAnimations,
            click: (item) => updateLogAnimations(item.checked),
          },
          {
            type: 'checkbox',
            label: 'Log Boids',
            checked: state.logBoids,
            click: (item) => updateLogBoids(item.checked),
          },
        ],
      },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  };
}

export function createWindowMenu(options: MenuOptions): MenuItemConstructorOptions {
  const { isMac } = options;

  return {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      ...(isMac
        ? [
            { type: 'separator' as const },
            { role: 'front' as const },
            { type: 'separator' as const },
            { role: 'window' as const },
          ]
        : [{ role: 'close' as const }]),
    ],
  };
}

export function createHelpMenu(options: MenuOptions): MenuItemConstructorOptions {
  const { onShowHelp, getMainWindow } = options;

  return {
    role: 'help',
    submenu: [
      { label: 'Entropic Help', accelerator: 'F1', click: onShowHelp },
      { type: 'separator' },
      {
        label: 'Repair Project Metadata (Dry Run)…',
        click: () => showRepairDialog(true, getMainWindow, 'claude'),
      },
      {
        label: 'Repair Project Metadata (Live)…',
        click: () => showRepairDialog(false, getMainWindow, 'claude'),
      },
      { type: 'separator' },
      {
        label: 'Codex: Repair Metadata (Dry Run)…',
        click: () => showRepairDialog(true, getMainWindow, 'codex'),
      },
      {
        label: 'Codex: Repair Metadata (Live)…',
        click: () => showRepairDialog(false, getMainWindow, 'codex'),
      },
      {
        label: 'Show Diagnostics…',
        click: () => showDiagnosticsDialog(getMainWindow),
      },
      { type: 'separator' },
      {
        label: 'Copy Last Log Entries…',
        click: async () => {
          const state = getLoggingState();
          if (!state.logFilePath) {
            clipboard.writeText('No log file available');
            return;
          }

          // retyper:disable-next-line find-exceptions
          try {
            const fs = await import('node:fs/promises');
            const content = await fs.readFile(state.logFilePath, 'utf-8');
            const lines = content.split('\n');
            const last50 = lines.slice(-50).join('\n');
            clipboard.writeText(last50);
          } catch (e) { // EXEMPTION: file read errors should be handled gracefully
            clipboard.writeText(`Error reading log file: ${e}`);
          }
        },
      },
    ],
  };
}