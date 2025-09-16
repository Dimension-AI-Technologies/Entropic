import type { ProviderPort, EventPort } from './ports';
import type { Project, Session } from './domain';
import { Ok, Err, type AsyncResult } from '../../utils/Result.js';

export class Aggregator {
  constructor(private providers: ProviderPort[], private events?: EventPort) {}

  async getProjects(): AsyncResult<Project[]> {
    try {
      const results = await Promise.all(this.providers.map(p => p.fetchProjects()));
      const failures = results.filter(r => !r.success);
      if (failures.length > 0 && failures.length === results.length) {
        return Err(failures[0].error || 'All providers failed');
      }
      const all: Project[] = [];
      for (const r of results) {
        if (r.success) all.push(...r.value);
      }
      const merged = this.mergeProjects(all);
      return Ok(merged);
    } catch (e: any) {
      return Err(e?.message || 'Aggregator error');
    }
  }

  private mergeProjects(items: Project[]): Project[] {
    const map = new Map<string, Project>();
    for (const p of items) {
      const key = `${p.provider}::${p.projectPath}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...p, sessions: [...p.sessions] });
        continue;
      }
      // Merge sessions, dedupe by (provider, sessionId)
      const seen = new Set(existing.sessions.map(s => `${s.provider}::${s.sessionId}`));
      for (const s of p.sessions) {
        const skey = `${s.provider}::${s.sessionId}`;
        if (!seen.has(skey)) {
          existing.sessions.push(s);
          seen.add(skey);
        }
      }
      // Update stats/dates conservatively
      existing.mostRecentTodoDate = max(existing.mostRecentTodoDate, p.mostRecentTodoDate);
      existing.startDate = min(existing.startDate, p.startDate);
      existing.stats = combineStats(existing, p);
      existing.pathExists = existing.pathExists || p.pathExists;
    }
    return Array.from(map.values());
  }
}

function max(a?: number, b?: number): number | undefined {
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}
function min(a?: number, b?: number): number | undefined {
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}
function combineStats(a: Project, b: Project) {
  const at = a.stats?.todos || 0;
  const aa = a.stats?.active || 0;
  const bt = b.stats?.todos || 0;
  const ba = b.stats?.active || 0;
  return { todos: at + bt, active: aa + ba, completed: (at + bt) - (aa + ba) };
}

