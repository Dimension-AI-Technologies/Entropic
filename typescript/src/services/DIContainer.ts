// Lightweight façade replacing the previous DI system. It uses
// electronAPI directly and provides minimal ViewModel-like objects
// with the methods our UI expects.
import { dlog } from '../utils/log';

type Project = {
  path: string;
  sessions: any[];
  mostRecentTodoDate?: Date;
};

class SimpleProjectsViewModel {
  private projects: Project[] = [];
  private listeners = new Set<() => void>();

  constructor() { this.refresh(); }
  getProjects(): Project[] { return this.projects; }
  setProjects(p: Project[]): void { this.projects = p || []; this.emit(); }
  async refresh(): Promise<void> {
    try { const p = await (window as any).electronAPI?.getTodos?.(); this.projects = Array.isArray(p)?p:[]; } catch { this.projects = []; }
    this.emit();
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

type Session = { id: string; todos: any[]; lastModified: Date; created?: Date; filePath?: string; projectPath?: string };

class SimpleTodosViewModel {
  private sessions: Session[] = [];
  private listeners = new Set<() => void>();
  constructor(){
    this.refresh();
    try {
      (window as any).electronAPI?.onTodoFilesChanged?.((_e: any,_d:any)=>this.refresh());
    } catch {}
  }
  getSessions(): Session[] { return this.sessions; }
  clearAll(): void { this.sessions = []; this.emit(); }
  async loadSessions(): Promise<void> {
    // Just refresh the sessions
    return this.refresh();
  }
  async refresh(): Promise<void> {
    try {
      const projects = await (window as any).electronAPI?.getTodos?.();
      const sess: Session[] = [];
      (projects||[]).forEach((p: any) => (p.sessions||[]).forEach((s: any)=> sess.push({ ...s, projectPath: p.path })));
      // normalize dates
      this.sessions = sess.map(s=> ({...s, lastModified: new Date(s.lastModified)}));
    } catch { this.sessions = []; }
    this.emit();
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
