// Main menu setup
import { app, Menu } from 'electron';
import {
  createAppMenu,
  createEditMenu,
  createViewMenu,
  createWindowMenu,
  createHelpMenu,
  type ShowHelpHandler,
  type TakeScreenshotHandler
} from './menuStructure';

export type { ShowHelpHandler, TakeScreenshotHandler };

export function setupMenu(options: {
  onShowHelp: ShowHelpHandler;
  onTakeScreenshot: TakeScreenshotHandler;
  getMainWindow?: () => Electron.BrowserWindow | null;
}) {
  const { onShowHelp, onTakeScreenshot, getMainWindow } = options;
  const isMac = process.platform === 'darwin';

  // Ensure app name appears as "Entropic" in OS-native menus
  // retyper:disable-next-line find-exceptions
  try {
    app.setName('Entropic');
  } catch {} // EXEMPTION: app name setting is not critical

  const menuOptions = {
    onShowHelp,
    onTakeScreenshot,
    getMainWindow,
    isMac
  };

  const template = [
    ...(isMac ? [createAppMenu(menuOptions)] : []),
    createEditMenu(),
    createViewMenu(menuOptions),
    createWindowMenu(menuOptions),
    createHelpMenu(menuOptions),
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}