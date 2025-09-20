// Lightweight façade replacing the previous DI system. It uses
// electronAPI directly and provides minimal ViewModel-like objects
// with the methods our UI expects.
import { dlog } from '../utils/log';
import { Ok, Err, type Result, type AsyncResult } from '../utils/Result';

type Project = {
  path: string;
  sessions: any[];
  mostRecentTodoDate?: Date;
};

// Global provider allow-list controlled by title bar toggles
const providerAllow: Record<string, boolean> = { claude: true, codex: true, gemini: true };
export function setProviderAllow(next: Partial<Record<string, boolean>>) {
  Object.assign(providerAllow, next || {});
  console.log('[DIContainer] Provider filters updated:', providerAllow);
}

class SimpleProjectsViewModel {
  private projects: Project[] = [];
  private listeners = new Set<() => void>();
  private refreshing = false;
  private lastRefresh = 0;

  constructor() { 
    this.refresh(); 
    try {
      // Prefer provider-agnostic data-changed; keep legacy listener as fallback
      (window as any).electronAPI?.onDataChanged?.(() => this.refresh());
      // Removed onTodoFilesChanged to avoid high-frequency refresh loops
    } catch {}
  }
  getProjects(): Project[] { return this.projects; }
  setProjects(p: Project[]): void { this.projects = p || []; this.emit(); }
  async refresh(): AsyncResult<void> {
    const now = Date.now();
    if (this.refreshing) return Ok(undefined); // drop concurrent refreshes
    if (now - this.lastRefresh < 250) return Ok(undefined); // throttle bursts
    this.refreshing = true;
    try {
      const res = await (window as any).electronAPI?.getProjects?.();
      if (res && typeof res === 'object' && 'success' in res) {
        if (res.success && Array.isArray(res.value)) {
          // Map domain -> legacy UI shape expected by MVVM/Views, apply provider filter
          const allProjects = res.value as any[];
          console.log('[ProjectsViewModel] Before filter:', allProjects.length, 'projects');
          this.projects = allProjects
            .filter((p: any) => {
              const provider = String(p.provider || 'claude').toLowerCase();
              const allowed = providerAllow[provider] !== false;
              if (!allowed) console.log('[ProjectsViewModel] Filtering out project with provider:', provider);
              return allowed;
            })
            .map((p: any) => ({
            id: p.flattenedDir || (p.projectPath || '').replace(/[\\/:]/g, '-'),
            path: p.projectPath,
            flattenedDir: p.flattenedDir || (p.projectPath || '').replace(/[\\/:]/g, '-'),
            pathExists: !!p.pathExists,
            lastModified: p.mostRecentTodoDate ? new Date(p.mostRecentTodoDate) : new Date(0),
            provider: p.provider,
            // Keep sessions light and MVVM-compatible
            sessions: (p.sessions||[])
              .filter((s:any)=> providerAllow[String((s.provider||p.provider||'').toLowerCase())] !== false)
              .map((s:any)=> ({
              id: s.sessionId,
              todos: Array.isArray(s.todos) ? s.todos : [],
              lastModified: s.updatedAt ? new Date(s.updatedAt) : new Date(0),
              filePath: s.filePath,
              projectPath: s.projectPath || p.projectPath,
              provider: s.provider || p.provider,
            })),
            mostRecentTodoDate: p.mostRecentTodoDate ? new Date(p.mostRecentTodoDate) : undefined,
          }));
          console.log('[ProjectsViewModel] After filter:', this.projects.length, 'projects');
        } else {
          (window as any).__addToast?.(`Failed to load projects${res?.error ? ': '+res.error : ''}`);
          this.projects = [];
        }
      } else {
        // Fallback to legacy getTodos for older builds
        const p = await (window as any).electronAPI?.getTodos?.(); 
        this.projects = Array.isArray(p)?p:[];
      }
    } catch (e) {
      this.projects = [];
      const msg = e instanceof Error ? e.message : String(e);
      (window as any).__addToast?.(`Error refreshing projects: ${msg}`);
      this.refreshing = false;
      this.lastRefresh = Date.now();
      this.emit();
      return Err(`Failed to refresh projects: ${msg}`, e);
    }
    this.refreshing = false;
    this.lastRefresh = Date.now();
    this.emit();
    return Ok(undefined);
  }
  onChange(cb: () => void): () => void { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  private emit(){ this.listeners.forEach(f=>{ try{f();}catch{} }); }
  getProjectsSortedByDate(): Project[] { return [...this.projects].sort((a,b)=> (b.mostRecentTodoDate?.getTime?.()||0)-(a.mostRecentTodoDate?.getTime?.()||0)); }
  // Compatibility helpers used by legacy tests
  getProjectCount(): number { return this.projects.length; }
  getExistingProjects(): Project[] { return this.projects.filter((p:any)=>p.pathExists); }
  getUnmatchedProjects(): Project[] { return this.projects.filter((p:any)=>!p.pathExists); }
  getExistingProjectCount(): number { return this.getExistingProjects().length; }
  getUnmatchedProjectCount(): number { return this.getUnmatchedProjects().length; }
  getProject(id: string): Project | null { return this.projects.find((p:any)=>p.id===id) || null; }
  getDisplayName(project: any): string { const parts=(project.path||'').split(/[/\\]/); return parts[parts.length-1]||project.path; }
  getStatusIcon(project: any): string { return project.pathExists? '✅':'⚠️'; }
  getTooltip(project: any): string { return project.pathExists? `Path: ${project.path}`:`Path: ${project.path} (does not exist)\nFlattened: ${project.flattenedDir}`; }
}

type Session = { id: string; todos: any[]; lastModified: Date; created?: Date; filePath?: string; projectPath?: string; provider?: string };

class SimpleTodosViewModel {
  private sessions: Session[] = [];
  private listeners = new Set<() => void>();
  private refreshing = false;
  private lastRefresh = 0;
  constructor(){
    this.refresh();
    try {
      (window as any).electronAPI?.onDataChanged?.(()=>this.refresh());
    } catch {}
  }
  getSessions(): Session[] { return this.sessions; }
  clearAll(): void { this.sessions = []; this.emit(); }
  async loadSessions(): Promise<void> {
    // Just refresh the sessions
    return this.refresh();
  }
  async refresh(): AsyncResult<void> {
    const now = Date.now();
    if (this.refreshing) return Ok(undefined); // drop concurrent refreshes
    if (now - this.lastRefresh < 250) return Ok(undefined); // throttle bursts
    this.refreshing = true;
    try {
      const maybeRes = await (window as any).electronAPI?.getProjects?.();
      let projects: any[] = [];
      if (maybeRes && typeof maybeRes === 'object' && 'success' in maybeRes) {
        projects = maybeRes.success ? (maybeRes.value||[]) : [];
        if (!maybeRes.success) {
          (window as any).__addToast?.(`Failed to load sessions${maybeRes?.error ? ': '+maybeRes.error : ''}`);
        }
      } else {
        // Fallback to legacy
        projects = await (window as any).electronAPI?.getTodos?.();
      }
      const sess: Session[] = [];
      let filteredOutProjects = 0;
      let filteredOutSessions = 0;
      (projects||[]).forEach((p: any) => {
        // Filter at project level first
        const projectProvider = String(p.provider || 'claude').toLowerCase();
        if (projectProvider && providerAllow[projectProvider] === false) {
          filteredOutProjects++;
          return;
        }

        (p.sessions||[]).forEach((s: any)=> {
          // Then filter at session level (session provider overrides project provider)
          const sessionProvider = String(s.provider || p.provider || 'claude').toLowerCase();
          if (sessionProvider && providerAllow[sessionProvider] === false) {
            filteredOutSessions++;
            return;
          }

          sess.push({
            ...s,
            id: s.sessionId || s.id,
            lastModified: s.updatedAt ? new Date(s.updatedAt) : new Date(s.lastModified||0),
            projectPath: p.projectPath || p.path,
            provider: sessionProvider || 'claude'
          });
        });
      });
      console.log('[TodosViewModel] Filtered out', filteredOutProjects, 'projects and', filteredOutSessions, 'sessions. Remaining:', sess.length);
      // normalize dates
      this.sessions = sess.map(s=> ({...s, lastModified: s.lastModified instanceof Date ? s.lastModified : new Date(s.lastModified)}));
    } catch (e) {
      this.sessions = [];
      const msg = e instanceof Error ? e.message : String(e);
      (window as any).__addToast?.(`Error refreshing sessions: ${msg}`);
      this.refreshing = false;
      this.lastRefresh = Date.now();
      this.emit();
      return Err(`Failed to refresh sessions: ${msg}`, e);
    }
    this.refreshing = false;
    this.lastRefresh = Date.now();
    this.emit();
    return Ok(undefined);
  }
  onChange(cb: () => void): () => void { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  private emit(){ this.listeners.forEach(f=>{ try{f();}catch{} }); }
  getSessionsSortedByDate(): Session[] { return [...this.sessions].sort((a,b)=> b.lastModified.getTime()-a.lastModified.getTime()); }
  getSessionsForProject(projectPath: string): Session[] { return this.sessions.filter(s=>s.projectPath===projectPath); }
}

class SimpleChatHistoryViewModel { /* placeholder to satisfy callers if any */ }

/**
 * Simple dependency injection container for MVVM architecture
 * Follows garage-project scale - simple but testable
 */
export class DIContainer {
  private static instance: DIContainer;
  private projectsViewModel: SimpleProjectsViewModel;
  private todosViewModel: SimpleTodosViewModel;
  private chatHistoryViewModel: SimpleChatHistoryViewModel;

  private constructor() {
    dlog('[DIContainer] Lightweight container initializing');
    this.projectsViewModel = new SimpleProjectsViewModel();
    this.todosViewModel = new SimpleTodosViewModel();
    this.chatHistoryViewModel = new SimpleChatHistoryViewModel();
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * Get the projects repository
   */
  getProjectsViewModel(): any {
    return this.projectsViewModel;
  }

  /**
   * Get the todo repository
   */
  getTodosViewModel(): any {
    return this.todosViewModel;
  }

  /**
   * Get the chat repository
   */
  getChatHistoryViewModel(): any {
    return this.chatHistoryViewModel;
  }
}
