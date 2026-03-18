import { ITodoRepository, Todo, Session } from '../models/Todo';
import { AsyncResult, Ok, Err } from '../utils/Result';

/**
 * IPC (renderer-side) implementation of ITodoRepository.
 * Wraps electronAPI.getProjects() and extracts sessions from each project.
 * Provider filtering is applied using the shared providerAllow record.
 */
export class IPCTodoRepository implements ITodoRepository {
  private providerAllow: Record<string, boolean>;

  constructor(providerAllow: Record<string, boolean>) {
    this.providerAllow = providerAllow;
  }

  async getAllSessions(): AsyncResult<Session[]> {
    const api = (window as any).electronAPI;
    if (!api?.getProjects) {
      return Ok([]);
    }

    let res: any;
    try {
      res = await api.getProjects();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Err(`IPC getProjects failed: ${msg}`, e);
    }

    let projects: any[] = [];
    if (res && typeof res === 'object' && 'success' in res) {
      if (!res.success) {
        return Err(res.error || 'getProjects returned failure');
      }
      projects = Array.isArray(res.value) ? res.value : [];
    } else {
      // Legacy fallback
      const legacy = await api.getTodos?.();
      projects = Array.isArray(legacy) ? legacy : [];
    }

    const sessions: Session[] = [];
    for (const p of projects) {
      const projectProvider = String(p.provider || 'claude').toLowerCase();
      if (this.providerAllow[projectProvider] === false) continue;

      for (const s of (p.sessions || [])) {
        const sessionProvider = String(s.provider || p.provider || 'claude').toLowerCase();
        if (this.providerAllow[sessionProvider] === false) continue;

        sessions.push({
          id: s.sessionId || s.id,
          todos: Array.isArray(s.todos) ? s.todos : [],
          lastModified: s.updatedAt ? new Date(s.updatedAt) : new Date(s.lastModified || 0),
          created: s.created ? new Date(s.created) : undefined,
          filePath: s.filePath,
          projectPath: s.projectPath || p.projectPath,
          provider: sessionProvider,
        });
      }
    }

    // Normalize dates
    for (const s of sessions) {
      if (!(s.lastModified instanceof Date)) {
        s.lastModified = new Date(s.lastModified);
      }
    }

    return Ok(sessions);
  }

  async getSession(sessionId: string): AsyncResult<Session | null> {
    const result = await this.getAllSessions();
    if (!result.success) return result as any;
    return Ok(result.value.find(s => s.id === sessionId) || null);
  }

  async getSessionsForProject(projectPath: string): AsyncResult<Session[]> {
    const result = await this.getAllSessions();
    if (!result.success) return result;
    return Ok(result.value.filter(s => s.projectPath === projectPath));
  }

  async getAllTodos(): AsyncResult<Todo[]> {
    const result = await this.getAllSessions();
    if (!result.success) return Err(result.error);
    const all: Todo[] = [];
    for (const s of result.value) all.push(...s.todos);
    return Ok(all);
  }

  async getTodosForSession(sessionId: string): AsyncResult<Todo[]> {
    const result = await this.getSession(sessionId);
    if (!result.success) return Err(result.error);
    return Ok(result.value?.todos || []);
  }

  async saveTodosForSession(sessionId: string, todos: Todo[]): AsyncResult<void> {
    // The renderer has no direct file access; delegate to IPC if available
    const api = (window as any).electronAPI;
    if (api?.saveTodos) {
      try {
        await api.saveTodos(sessionId, todos);
        return Ok(undefined);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return Err(`Failed to save todos: ${msg}`, e);
      }
    }
    return Err('saveTodos IPC not available');
  }

  async sessionExists(sessionId: string): AsyncResult<boolean> {
    const result = await this.getSession(sessionId);
    if (!result.success) return Err(result.error);
    return Ok(result.value !== null);
  }

  getTodosDirectoryPath(): string {
    return '~/.claude/todos'; // informational only in renderer
  }
}
