import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';

export type AppPrefs = {
  enabledProviders?: { claude?: boolean; codex?: boolean };
  repair?: { threshold?: number; defaultDryRun?: boolean };
  // existing flags may live here as well
  [key: string]: any;
};

function prefsPath() {
  try { return path.join(app.getPath('userData'), 'prefs.json'); } catch { return path.join(process.cwd(), 'prefs.json'); }
}

export function loadPrefs(): AppPrefs {
  const p = prefsPath();
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed || {};
  } catch {
    return {};
  }
}

export function savePrefs(update: (current: AppPrefs) => AppPrefs): AppPrefs {
  const p = prefsPath();
  let cur = loadPrefs();
  let next: AppPrefs = {};
  try { next = update(cur) || {}; } catch { next = cur || {}; }
  try { fs.mkdirSync(path.dirname(p), { recursive: true }); } catch {}
  try { fs.writeFileSync(p, JSON.stringify(next, null, 2), 'utf-8'); } catch {}
  return next;
}

export function getEnabledProviders(prefs?: AppPrefs): { claude: boolean; codex: boolean } {
  const p = prefs || loadPrefs();
  const ep = p.enabledProviders || {};
  return { claude: ep.claude !== false, codex: ep.codex !== false };
}

export function getRepairThreshold(prefs?: AppPrefs): number {
  const p = prefs || loadPrefs();
  const r = p.repair || {};
  return typeof r.threshold === 'number' && isFinite(r.threshold) ? r.threshold : 5;
}

export function getDefaultDryRun(prefs?: AppPrefs): boolean {
  const p = prefs || loadPrefs();
  const r = p.repair || {};
  return r.defaultDryRun !== false; // default true
}

