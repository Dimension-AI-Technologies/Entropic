import { watch } from 'node:fs';
import fsSync from 'node:fs';
import type { BrowserWindow } from 'electron';

export type Watcher = fsSync.FSWatcher;

export function setupFileWatching(
  mainWindow: BrowserWindow,
  options: { projectsDir: string; todosDir: string; logsDir: string },
  debounceMs: number = 300
): Watcher[] {
  const { projectsDir, todosDir, logsDir } = options;
  const watchers: Watcher[] = [];
  let debounceTimer: NodeJS.Timeout | null = null;

  const scheduleChange = (payload: any) => {
    try {
      // Legacy channel for compatibility
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('todo-files-changed', payload);
      }
    } catch {}
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try {
        if (mainWindow && !mainWindow.isDestroyed()) {
          // Provider-agnostic event per Hex plan
          mainWindow.webContents.send('data-changed');
        }
      } catch {}
    }, debounceMs);
  };

  if (fsSync.existsSync(projectsDir)) {
    console.log('[FileWatch] Setting up file watching for:', projectsDir);
    const watcher = watch(projectsDir, { recursive: true }, (eventType, filename) => {
      if (filename && filename.includes('.session_') && filename.endsWith('.json')) {
        console.log(`[FileWatch] Detected ${eventType} on ${filename}`);
        scheduleChange({
          eventType,
          filename,
          timestamp: new Date().toISOString(),
        });
      }
    });
    watchers.push(watcher);
  }

  if (fsSync.existsSync(todosDir)) {
    console.log('[FileWatch] Setting up file watching for:', todosDir);
    const watcher = watch(todosDir, (eventType, filename) => {
      if (filename && filename.endsWith('.json')) {
        console.log(`[FileWatch] Detected ${eventType} on ${filename} in todos dir`);
        scheduleChange({
          eventType,
          filename,
          timestamp: new Date().toISOString(),
        });
      }
    });
    watchers.push(watcher);
  }

  if (fsSync.existsSync(logsDir)) {
    console.log('[FileWatch] Setting up file watching for current_todos.json');
    const watcher = watch(logsDir, (eventType, filename) => {
      if (filename === 'current_todos.json') {
        console.log(`[FileWatch] Detected ${eventType} on current_todos.json`);
        scheduleChange({
          eventType,
          filename: 'current_todos.json',
          timestamp: new Date().toISOString(),
        });
      }
    });
    watchers.push(watcher);
  }

  return watchers;
}

export function cleanupFileWatchers(watchers: Watcher[]): void {
  watchers.forEach((w) => {
    try {
      w.close();
    } catch {}
  });
}
