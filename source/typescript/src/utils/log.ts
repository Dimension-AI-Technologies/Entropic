// Avoid ESM-only import.meta in tests; rely on NODE_ENV
export const DEBUG: boolean = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production');

export function dlog(...args: any[]): void {
  if (DEBUG) console.log(...args);
}

export function dwarn(...args: any[]): void {
  if (DEBUG) console.warn(...args);
}
