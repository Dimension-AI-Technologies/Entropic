import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';
import { Result, Ok, Err } from '../../utils/Result.js';

export type AppPrefs = {
  enabledProviders?: { claude?: boolean; codex?: boolean };
  repair?: { threshold?: number; defaultDryRun?: boolean };
  // existing flags may live here as well
  [key: string]: any;
};

function prefsPath() {
  try { return path.join(app.getPath('userData'), 'prefs.json'); } catch { return path.join(process.cwd(), 'prefs.json'); }
}

export function loadPrefs(): Result<AppPrefs> {
  const p = prefsPath();
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(raw);
    return Ok(parsed || {});
  } catch (error: any) {
    return Err('Failed to load preferences', error);
  }
}

export function loadPrefsSync(): AppPrefs {
  const result = loadPrefs();
  return result.success ? result.value : {};
}

export function savePrefs(update: (current: AppPrefs) => AppPrefs): Result<AppPrefs> {
  const p = prefsPath();
  const curResult = loadPrefs();
  const cur = curResult.success ? curResult.value : {};

  let next: AppPrefs = {};
  try {
    next = update(cur) || {};
  } catch (error: any) {
    return Err('Failed to apply preferences update', error);
  }

  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
  } catch (error: any) {
    return Err('Failed to create preferences directory', error);
  }

  try {
    fs.writeFileSync(p, JSON.stringify(next, null, 2), 'utf-8');
    return Ok(next);
  } catch (error: any) {
    return Err('Failed to save preferences file', error);
  }
}

export function savePrefsSync(update: (current: AppPrefs) => AppPrefs): AppPrefs {
  const result = savePrefs(update);
  return result.success ? result.value : {};
}

export function getEnabledProviders(prefs?: AppPrefs): { claude: boolean; codex: boolean } {
  const p = prefs || loadPrefsSync();
  const ep = p.enabledProviders || {};
  return { claude: ep.claude !== false, codex: ep.codex !== false };
}

export function getRepairThreshold(prefs?: AppPrefs): number {
  const p = prefs || loadPrefsSync();
  const r = p.repair || {};
  return typeof r.threshold === 'number' && isFinite(r.threshold) ? r.threshold : 5;
}

export function getDefaultDryRun(prefs?: AppPrefs): boolean {
  const p = prefs || loadPrefsSync();
  const r = p.repair || {};
  return r.defaultDryRun !== false; // default true
}

