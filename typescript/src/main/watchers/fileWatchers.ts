import { watch } from 'node:fs';
import fsSync from 'node:fs';
import type { BrowserWindow } from 'electron';
import { Result, Ok, Err } from '../../utils/Result.js';

export type Watcher = fsSync.FSWatcher;

let globalDebounceTimer: NodeJS.Timeout | null = null;

export function setupFileWatching(
  mainWindow: BrowserWindow,
  options: {
    projectsDir: string;
    todosDir: string;
    logsDir: string;
    codexDir?: string;
    geminiDir?: string;
  },
  debounceMs: number = 300
): Result<Watcher[]> {
  try {
    const { projectsDir, todosDir, logsDir, codexDir, geminiDir } = options;
    const watchers: Watcher[] = [];
    const scheduleChange = (payload: any) => {
      // Drop immediate legacy event to avoid high-frequency refresh loops in renderer
      if (globalDebounceTimer) clearTimeout(globalDebounceTimer);
      globalDebounceTimer = setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          // Provider-agnostic event per Hex plan
          mainWindow.webContents.send('data-changed');
        }
      }, debounceMs);
    };

  if (fsSync.existsSync(projectsDir)) {
    console.log('[FileWatch] Setting up file watching for:', projectsDir);
    const watcher = watch(projectsDir, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.jsonl') || (filename.includes('.session_') && filename.endsWith('.json')))) {
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
      if (filename === 'current_todos.json' || (filename && filename.endsWith('.jsonl'))) {
        console.log(`[FileWatch] Detected ${eventType} on current_todos.json`);
        scheduleChange({
          eventType,
          filename: filename || 'current_todos.json',
          timestamp: new Date().toISOString(),
        });
      }
    });
    watchers.push(watcher);
  }

  // Watch Codex CLI directory
  if (codexDir && fsSync.existsSync(codexDir)) {
    console.log('[FileWatch] Setting up file watching for Codex:', codexDir);
    const watcher = watch(codexDir, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.jsonl') || filename.endsWith('.json'))) {
        console.log(`[FileWatch] Detected ${eventType} on Codex file: ${filename}`);
        scheduleChange({
          eventType,
          filename,
          provider: 'codex',
          timestamp: new Date().toISOString(),
        });
      }
    });
    watchers.push(watcher);
  }

  // Watch Gemini CLI directory
  if (geminiDir && fsSync.existsSync(geminiDir)) {
    console.log('[FileWatch] Setting up file watching for Gemini:', geminiDir);
    const watcher = watch(geminiDir, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.jsonl') || filename.endsWith('.json'))) {
        console.log(`[FileWatch] Detected ${eventType} on Gemini file: ${filename}`);
        scheduleChange({
          eventType,
          filename,
          provider: 'gemini',
          timestamp: new Date().toISOString(),
        });
      }
    });
    watchers.push(watcher);
  }

    return Ok(watchers);
  } catch (error: any) {
    return Err('Failed to setup file watching', error);
  }
}

// Synchronous version for backward compatibility
export function setupFileWatchingSync(
  mainWindow: BrowserWindow,
  options: {
    projectsDir: string;
    todosDir: string;
    logsDir: string;
    codexDir?: string;
    geminiDir?: string;
  },
  debounceMs: number = 300
): Watcher[] {
  const result = setupFileWatching(mainWindow, options, debounceMs);
  if (result.success) {
    return result.value;
  }
  console.error('Failed to setup file watching:', result.error);
  return [];
}

export function cleanupFileWatchers(watchers: Watcher[]): Result<void> {
  const errors: string[] = [];

  watchers.forEach((w, index) => {
    try {
      w.close();
    } catch (error: any) {
      errors.push(`Watcher ${index}: ${error?.message || 'unknown error'}`);
    }
  });

  if (errors.length > 0) {
    return Err(`Failed to close some watchers: ${errors.join(', ')}`);
  }

  return Ok(undefined);
}

// Synchronous version for backward compatibility
export function cleanupFileWatchersSync(watchers: Watcher[]): void {
  const result = cleanupFileWatchers(watchers);
  if (!result.success) {
    console.error('Cleanup file watchers warning:', result.error);
  }
}
