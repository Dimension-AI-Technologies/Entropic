import path from 'node:path';
import fs from 'node:fs/promises';
import { Result, Ok, Err } from './Result.js';

/**
 * Recursively walk a directory tree and find all JSONL files
 * @param root - Root directory to start walking from
 * @param maxDepth - Maximum depth to recurse (default 6)
 * @returns Array of paths to JSONL files
 */
export async function listJsonlFiles(root: string, maxDepth: number = 6): Promise<string[]> {
  const out: string[] = [];

  async function walk(dir: string, depth: number) {
    if (depth > maxDepth) return;
    let entries: string[] = [];
    // retyper:disable-next-line find-exceptions
    try {
      entries = await fs.readdir(dir);
    } catch {
      return; // EXEMPTION: simple error recovery for missing dirs
    }

    for (const name of entries) {
      const p = path.join(dir, name);
      let stat: any;
      // retyper:disable-next-line find-exceptions
      try {
        stat = await fs.stat(p);
      } catch {
        continue; // EXEMPTION: simple error recovery for file stats
      }

      if (stat.isDirectory()) {
        await walk(p, depth + 1);
      } else if (name.endsWith('.jsonl')) {
        out.push(p);
      }
    }
  }

  await walk(root, 0);
  return out;
}

/**
 * Calculate a signature for JSONL files in a directory (for cache invalidation)
 * @param root - Root directory to scan
 * @returns Signature string in format "c:{count}|m:{mtime}"
 */
export async function signatureForJsonlFiles(root: string): Promise<string> {
  // retyper:disable-next-line find-exceptions
  try {
    let count = 0;
    let mtime = 0;

    async function walk(dir: string, depth: number) {
      if (depth > 6) return;
      let entries: string[] = [];
      // retyper:disable-next-line find-exceptions
      try {
        entries = await fs.readdir(dir);
      } catch {
        return; // EXEMPTION: simple error recovery for missing dirs
      }

      for (const name of entries) {
        const p = path.join(dir, name);
        let stat: any;
        // retyper:disable-next-line find-exceptions
        try {
          stat = await fs.stat(p);
        } catch {
          continue; // EXEMPTION: simple error recovery for file stats
        }

        if (stat.isDirectory()) {
          await walk(p, depth + 1);
        } else if (name.endsWith('.jsonl')) {
          count++;
          mtime = Math.max(mtime, +stat.mtime || 0);
        }
      }
    }

    await walk(root, 0);
    return `c:${count}|m:${mtime}`;
  } catch {
    return 'c:0|m:0'; // EXEMPTION: simple error recovery for signature computation
  }
}

/**
 * Normalize status strings to standard format
 * @param s - Status string to normalize
 * @returns Normalized status
 */
export function normalizeStatus(s: string): 'pending' | 'in_progress' | 'completed' {
  const v = String(s || '').toLowerCase();
  if (v.startsWith('in')) return 'in_progress';
  if (v.startsWith('comp')) return 'completed';
  return 'pending';
}

/**
 * Safely convert value to number with default
 * @param v - Value to convert
 * @param defaultValue - Default value if conversion fails (default 0)
 * @returns Number value
 */
export function numberSafe(v?: number, defaultValue: number = 0): number {
  if (typeof v === 'number' && !isNaN(v)) return v;
  return defaultValue;
}