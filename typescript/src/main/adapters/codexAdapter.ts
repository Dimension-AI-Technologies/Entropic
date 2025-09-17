import type { ProviderPort } from '../core/ports';
import type { Project, Session, Todo } from '../core/domain';
import { Ok, Err, type AsyncResult } from '../../utils/Result.js';
import { loadTodosData } from '../loaders/projects.js';
import { collectDiagnostics as collectDiagGeneric, repairProjectMetadata as repairGeneric } from '../maintenance/repair.js';

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
    const { projectsDir, logsDir, todosDir } = this.options;
    const sig = await computeSignature(projectsDir, todosDir);
    if (this._cache && this._cache.sig === sig) {
      return Ok(this._cache.value);
    }
    const res = await loadTodosData(projectsDir, logsDir, todosDir);
    if (!res.success) return Err(res.error || 'loadTodosData failed');
    const items = res.value as LoaderProject[];
    const mapped: Project[] = items.map((p) => ({
      provider: this.id,
      projectPath: p.path,
      flattenedDir: p.flattenedDir,
      pathExists: p.pathExists,
      startDate: p.startDate ? p.startDate.getTime() : undefined,
      mostRecentTodoDate: p.mostRecentTodoDate ? p.mostRecentTodoDate.getTime() : undefined,
      sessions: p.sessions.map((s): Session => ({
        provider: this.id,
        sessionId: s.id,
        filePath: s.filePath,
        projectPath: p.path,
        createdAt: undefined,
        updatedAt: s.lastModified ? s.lastModified.getTime() : undefined,
        todos: (s.todos || []).map((t): Todo => ({
          id: t.id,
          content: t.content,
          status: (['pending','in_progress','completed'] as const).includes(t.status as any) ? (t.status as any) : 'pending',
          createdAt: t.created ? t.created.getTime() : undefined,
          updatedAt: undefined,
          activeForm: t.activeForm,
        })),
      })),
      stats: {
        todos: numberSafe(p.totalTodos),
        active: numberSafe(p.activeTodos),
        completed: numberSafe(p.totalTodos) - numberSafe(p.activeTodos),
      },
    }));
    this._cache = { sig, value: mapped };
    return Ok(mapped);
  }

  watchChanges(_onChange: () => void): () => void {
    return () => void 0;
  }

  async collectDiagnostics(): AsyncResult<{ unknownCount: number; details: string }> {
    try {
      const { projectsDir, todosDir } = this.options;
      const d = await collectDiagGeneric(projectsDir, todosDir);
      if (!d) return Err('diagnostics failed');
      return Ok({ unknownCount: d.unknownCount, details: d.text });
    } catch (e: any) {
      return Err(e?.message || 'diagnostics failed');
    }
  }

  async repairMetadata(dryRun: boolean): AsyncResult<{ planned: number; written: number; unknownCount: number }> {
    try {
      const { projectsDir, todosDir } = this.options;
      const r = await repairGeneric(projectsDir, todosDir, dryRun);
      return Ok({ planned: r.metadataPlanned, written: r.metadataWritten, unknownCount: r.unknownSessions.length });
    } catch (e: any) {
      return Err(e?.message || 'repair failed');
    }
  }
}

function numberSafe(v?: number): number {
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

async function computeSignature(projectsDir: string, todosDir?: string): Promise<string> {
  try {
    const parts: string[] = [];
    try {
      const list = await import('node:fs/promises').then(m => m.readdir(projectsDir));
      parts.push('p:' + list.length);
    } catch { parts.push('p:0'); }
    if (todosDir) {
      try {
        const list = await import('node:fs/promises').then(m => m.readdir(todosDir));
        const count = list.filter(f => /-agent(?:-[0-9a-f-]+)?\.json$/.test(f)).length;
        parts.push('t:' + count);
      } catch { parts.push('t:0'); }
    }
    return parts.join('|');
  } catch { return 'sig:0'; }
}
