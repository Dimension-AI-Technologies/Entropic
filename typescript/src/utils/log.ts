export const DEBUG: boolean = !!(import.meta as any)?.env?.DEV;

export function dlog(...args: any[]): void {
  if (DEBUG) console.log(...args);
}

export function dwarn(...args: any[]): void {
  if (DEBUG) console.warn(...args);
}

