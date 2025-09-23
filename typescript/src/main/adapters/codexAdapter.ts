import type { ProviderPort } from '../core/ports';
import type { Project, Session, Todo } from '../core/domain';
import { Ok, Err, type AsyncResult, type Result } from '../../utils/Result.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';

type LoaderProject = {
  path: string;
  sessions: Array<{ id: string; todos: Array<{ content: string; status: string; id?: string; created?: Date; activeForm?: string }>; lastModified: Date; filePath?: string }>;
  mostRecentTodoDate?: Date;
  flattenedDir?: string;
  pathExists?: boolean;
  startDate?: Date;
  totalTodos?: number;
  activeTodos?: number;
};

export class CodexAdapter implements ProviderPort {
  readonly id = 'codex';
  private _cache?: { sig: string; value: Project[] };
  constructor(private options: { projectsDir: string; logsDir: string; todosDir?: string }) {}

  async fetchProjects(): AsyncResult<Project[]> {
    try {
      // Read from ~/.codex/sessions/**/rollout-*.jsonl
      const sessionsRoot = path.join(os.homedir(), '.codex', 'sessions');
      const sig = await signatureForCodexSessions(sessionsRoot);
      if (this._cache && this._cache.sig === sig) return Ok(this._cache.value);
      const files = await listJsonlFiles(sessionsRoot);
      const byProject = new Map<string, { projectPath: string; sessions: Session[]; mostRecent?: number }>();
      for (const f of files) {
        const parsedResult = await parseCodexSessionJsonl(f);
        if (!parsedResult.success || !parsedResult.value) continue;

        const { sessionId, updatedAt, repoSlug, todos } = parsedResult.value;
        const projectPath = repoSlug ? `/codex/${repoSlug}` : '/codex/Unknown Project';
        const s: Session = {
          provider: this.id,
          sessionId,
          filePath: f,
          projectPath,
          createdAt: undefined,
          updatedAt,
          todos,
        };
        const entry = byProject.get(projectPath) || { projectPath, sessions: [], mostRecent: 0 };
        entry.sessions.push(s);
        entry.mostRecent = Math.max(entry.mostRecent || 0, updatedAt || 0);
        byProject.set(projectPath, entry);
      }
      const projects: Project[] = Array.from(byProject.values()).map((p) => ({
        provider: this.id,
        projectPath: p.projectPath,
        flattenedDir: p.projectPath.replace(/[\\/:]/g, '-'),
        pathExists: false,
        startDate: undefined,
        mostRecentTodoDate: p.mostRecent,
        sessions: p.sessions,
        stats: (() => {
          const todos = p.sessions.reduce((n, s) => n + (s.todos?.length || 0), 0);
          const active = p.sessions.reduce((n, s) => n + (s.todos?.filter(t => t.status !== 'completed').length || 0), 0);
          return { todos, active, completed: todos - active };
        })(),
      }));
      this._cache = { sig, value: projects };
      return Ok(projects);
    } catch (e: any) { // EXEMPTION: converting async promise rejection to Result<T>
      return Err(e?.message || 'codex fetch failed');
    }
  }

  watchChanges(_onChange: () => void): () => void {
    return () => void 0;
  }

  async collectDiagnostics(): AsyncResult<{ unknownCount: number; details: string }> {
    try {
      const sessionsRoot = path.join(os.homedir(), '.codex', 'sessions');
      const files = await listJsonlFiles(sessionsRoot);
      let total = 0; let unknown = 0;
      for (const f of files) {
        const pResult = await parseCodexSessionJsonl(f);
        const p = pResult.success ? pResult.value : null;
        if (!p) continue; total++;
        if (!p.repoSlug) unknown++;
      }
      const text = `Codex sessions scanned: ${total}\nSessions without repository_url: ${unknown}`;
      return Ok({ unknownCount: unknown, details: text });
    } catch (e: any) { return Err(e?.message || 'diagnostics failed'); } // EXEMPTION: converting async promise rejection to Result<T>
  }

  async repairMetadata(_dryRun: boolean): AsyncResult<{ planned: number; written: number; unknownCount: number }> {
    // Placeholder: no write-side repair yet for Codex; return diagnostics summary
    const d = await this.collectDiagnostics();
    if (!d.success) return Err(d.error || 'repair failed');
    return Ok({ planned: 0, written: 0, unknownCount: d.value.unknownCount });
  }
}

function numberSafe(v?: number): number {
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

async function listJsonlFiles(root: string): Promise<string[]> { // EXEMPTION: utility function with error recovery
  const out: string[] = [];
  async function walk(dir: string, depth: number) {
    if (depth > 6) return;
    let entries: string[] = [];
    try { entries = await fs.readdir(dir); } catch { return; } // EXEMPTION: simple error recovery for missing dirs
    for (const name of entries) {
      const p = path.join(dir, name);
      let stat: any; try { stat = await fs.stat(p); } catch { continue; } // EXEMPTION: simple error recovery for file stats
      if (stat.isDirectory()) await walk(p, depth + 1);
      else if (name.endsWith('.jsonl')) out.push(p);
    }
  }
  await walk(root, 0);
  return out;
}

async function signatureForCodexSessions(root: string): Promise<string> { // EXEMPTION: utility function with error recovery
  try {
    let count = 0;
    let mtime = 0;
    async function walk(dir: string, depth: number) {
      if (depth > 6) return;
      let entries: string[] = [];
      try { entries = await fs.readdir(dir); } catch { return; } // EXEMPTION: simple error recovery for missing dirs
      for (const name of entries) {
        const p = path.join(dir, name);
        let stat: any; try { stat = await fs.stat(p); } catch { continue; } // EXEMPTION: simple error recovery for file stats // EXEMPTION: simple error recovery for file stats
        if (stat.isDirectory()) await walk(p, depth + 1);
        else if (name.endsWith('.jsonl')) { count++; mtime = Math.max(mtime, +stat.mtime || 0); }
      }
    }
    await walk(root, 0);
    return `c:${count}|m:${mtime}`;
  } catch { return 'c:0|m:0'; } // EXEMPTION: simple error recovery for signature computation
}

async function parseCodexSessionJsonl(file: string): AsyncResult<{ sessionId: string; updatedAt?: number; repoSlug?: string; todos: Todo[] } | null> {
  try {
    const raw = await fs.readFile(file, 'utf-8');
    const lines = raw.split('\n').filter(Boolean);
    let sessionId = '';
    let updatedAt: number | undefined = undefined;
    let repoSlug: string | undefined = undefined;
    const todos: Todo[] = [];

    // find first line for id/repo
    for (const line of lines.slice(0, 10)) {
      const lineResult = parseJsonSafe(line);
      if (lineResult.success) {
        const j = lineResult.value;
        if (!sessionId && (j.id || j.session_id)) sessionId = String(j.id || j.session_id);
        if (j.git && typeof j.git.repository_url === 'string') {
          const url = j.git.repository_url as string;
          const slug = url.split('/').pop() || url;
          repoSlug = slug.replace(/\.git$/i, '');
        }
      }
    }

    // parse all update_plan occurrences; keep the last one as current todos
    let lastPlan: Array<{ status: string; step: string }>|null = null;
    for (const line of lines) {
      const lineResult = parseJsonSafe(line);
      if (lineResult.success) {
        const j = lineResult.value;
        const ts = j.timestamp ? Date.parse(j.timestamp) : undefined; // EXEMPTION: simple Date parsing
        if (ts && (!updatedAt || ts > updatedAt)) updatedAt = ts;
        if (j.type === 'function_call' && j.name === 'update_plan' && j.arguments) {
          let args: any = j.arguments;
          if (typeof args === 'string') {
            const argsResult = parseJsonSafe(args);
            if (argsResult.success) args = argsResult.value;
          }
          if (args && Array.isArray(args.plan)) {
            lastPlan = args.plan.map((p: any) => ({ status: String(p.status||'pending'), step: String(p.step||'') }));
          }
        }
      }
    }

    if (lastPlan) {
      for (const item of lastPlan) {
        todos.push({ id: undefined, content: item.step, status: normalizeStatus(item.status), createdAt: undefined, updatedAt: updatedAt });
      }
    }

    if (!sessionId) {
      // Extract from filename (UUID at end)
      const base = path.basename(file).replace(/\.jsonl$/,'');
      const maybeId = base.split('-').pop();
      if (maybeId) sessionId = maybeId;
    }

    return Ok({ sessionId, updatedAt, repoSlug, todos });
  } catch (error) { // EXEMPTION: converting file parse failure to Result<T> with graceful fallback
    // Maintain legacy behaviour: treat parse failures as empty successes so callers can continue
    console.warn('[CodexAdapter] Failed to parse session jsonl', file, error);
    return Ok(null);
  }
}

function parseJsonSafe(json: string): Result<any> {
  if (!json.trim()) return Err('Empty JSON string');

  try {
    const parsed = JSON.parse(json);
    return Ok(parsed);
  } catch (error: any) { // EXEMPTION: converting JSON.parse exception to Result<T>
    return Err('Invalid JSON', error);
  }
}

function normalizeStatus(s: string): 'pending'|'in_progress'|'completed' {
  const v = String(s || '').toLowerCase();
  if (v.startsWith('in')) return 'in_progress';
  if (v.startsWith('comp')) return 'completed';
  return 'pending';
}
