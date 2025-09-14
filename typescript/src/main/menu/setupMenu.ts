import { app, Menu } from 'electron';

export type ShowHelpHandler = () => void;
export type TakeScreenshotHandler = () => void | Promise<void>;

export function setupMenu(options: {
  onShowHelp: ShowHelpHandler;
  onTakeScreenshot: TakeScreenshotHandler;
}) {
  const { onShowHelp, onTakeScreenshot } = options;
  const isMac = process.platform === 'darwin';

  // Ensure app name appears as "Entropic" in OS-native menus
  try { app.setName('Entropic'); } catch {}

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
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
