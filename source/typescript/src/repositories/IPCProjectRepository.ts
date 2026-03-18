import { Project, IProjectRepository } from '../models/Project';
import { AsyncResult, Ok, Err } from '../utils/Result';

/**
 * IPC (renderer-side) implementation of IProjectRepository.
 * Wraps electronAPI.getProjects() and maps the response to the Project domain model.
 * Provider filtering is applied using the shared providerAllow record.
 */
export class IPCProjectRepository implements IProjectRepository {
  private providerAllow: Record<string, boolean>;
  private dataChangedCallback: (() => void) | null = null;

  constructor(providerAllow: Record<string, boolean>) {
    this.providerAllow = providerAllow;
  }

  async getAllProjects(): AsyncResult<Project[]> {
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

    if (!res || typeof res !== 'object' || !('success' in res)) {
      // Legacy fallback: raw array from getTodos
      const legacy = await api.getTodos?.();
      return Ok(Array.isArray(legacy) ? legacy : []);
    }

    if (!res.success) {
      return Err(res.error || 'getProjects returned failure');
    }

    const raw: any[] = Array.isArray(res.value) ? res.value : [];

    const projects: Project[] = raw
      .filter((p: any) => {
        const provider = String(p.provider || 'claude').toLowerCase();
        return this.providerAllow[provider] !== false;
      })
      .map((p: any) => ({
        id: p.flattenedDir || (p.projectPath || '').replace(/[\\/:]/g, '-'),
        path: p.projectPath,
        flattenedDir: p.flattenedDir || (p.projectPath || '').replace(/[\\/:]/g, '-'),
        pathExists: !!p.pathExists,
        lastModified: p.mostRecentTodoDate ? new Date(p.mostRecentTodoDate) : new Date(0),
        provider: p.provider,
      }));

    return Ok(projects);
  }

  async getProject(id: string): AsyncResult<Project | null> {
    const result = await this.getAllProjects();
    if (!result.success) return result as any;
    return Ok(result.value.find(p => p.id === id) || null);
  }

  async projectExists(id: string): AsyncResult<boolean> {
    const result = await this.getProject(id);
    if (!result.success) return Err(result.error);
    return Ok(result.value !== null);
  }

  /**
   * Subscribe to electronAPI data-changed events.
   * Called by the ViewModel's setupFileWatching.
   */
  setupFileWatching(callback: () => void): void {
    this.dataChangedCallback = callback;
    try {
      (window as any).electronAPI?.onDataChanged?.(() => {
        if (this.dataChangedCallback) this.dataChangedCallback();
      });
    } catch { /* ignore in test environments */ }
  }

  cleanup(): void {
    this.dataChangedCallback = null;
  }
}
