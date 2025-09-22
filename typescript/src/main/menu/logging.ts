// Logging system for application menu
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export type Level = 'silent' | 'failure' | 'error' | 'warning' | 'information' | 'debug' | 'trace';

interface LoggingState {
  logAnimations: boolean;
  logBoids: boolean;
  consoleLevel: Level;
  logToFile: boolean;
  logFilePath: string | null;
}

const state: LoggingState = {
  logAnimations: true,
  logBoids: true,
  consoleLevel: 'trace',
  logToFile: true,
  logFilePath: null
};

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

function formatNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function ensureLogFile(): Promise<void> {
  const dir = path.join(os.homedir(), 'temp', 'Entropic');
  await fsPromises.mkdir(dir, { recursive: true }).catch(() => {});
  const file = path.join(dir, `entropic-${Date.now()}.log`);
  await fsPromises.writeFile(file, `Entropic log started ${new Date().toISOString()}\n`).catch(() => {});
  state.logFilePath = file;
}

function applyConsoleHook(): void {
  const currentThresh = levelScore[state.consoleLevel];
  const writeLine = (lvl: string, args: any[]) => {
    if (!state.logToFile || !state.logFilePath) return;
    const line = `[${formatNow()}] [${lvl.toUpperCase()}] ${args.map(a => typeof a === 'string' ? a : (()=>{
      // retyper:disable-next-line find-exceptions
      try {
        return JSON.stringify(a);
      } catch { // EXEMPTION: JSON.stringify can fail on circular references, fallback to String
        return String(a);
      }
    })()).join(' ')}\n`;
    // retyper:disable-next-line find-exceptions
    try {
      fs.appendFileSync(state.logFilePath, line);
    } catch {} // EXEMPTION: file system errors are non-critical for logging
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

function restoreConsole(): void {
  (['error','warn','info','log','debug','trace'] as const).forEach((k) => {
    console[k] = originalConsole[k] as any;
  });
}

export async function updateLogToFile(next: boolean): Promise<void> {
  state.logToFile = next;
  if (state.logToFile && !state.logFilePath) await ensureLogFile();
  if (state.logToFile) applyConsoleHook();
  else restoreConsole();
}

export function updateConsoleLevel(level: Level): void {
  state.consoleLevel = level;
  if (state.logToFile) applyConsoleHook();
}

export function getLoggingState(): Readonly<LoggingState> {
  return { ...state };
}

export function updateLogAnimations(value: boolean): void {
  state.logAnimations = value;
}

export function updateLogBoids(value: boolean): void {
  state.logBoids = value;
}

// Initialize logging
updateLogToFile(true).catch(() => {});
applyConsoleHook();