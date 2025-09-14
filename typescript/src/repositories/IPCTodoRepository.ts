import { ITodoRepository, Todo, Session } from '../models/Todo';
import { AsyncResult, Ok, Err } from '../utils/Result';

/**
 * IPC-based implementation of ITodoRepository
 * Delegates all filesystem operations to the main process via IPC
 */
export class IPCTodoRepository implements ITodoRepository {
  // Helper to fetch all projects from main
  private async fetchAllProjects(): Promise<any[]> {
    const projects = await window.electronAPI.getTodos();
    return Array.isArray(projects) ? projects : [];
  }

  private normalizeSession(session: any, projectPath: string): Session {
    return {
      id: session.id || session.sessionId || 'unknown',
      todos: Array.isArray(session.todos) ? session.todos : [],
      lastModified: session.lastModified ? new Date(session.lastModified) : new Date(),
      created: session.created ? new Date(session.created) : undefined,
      filePath: session.filePath,
      projectPath,
    };
  }

  // ITodoRepository: getAllSessions across all projects
  async getAllSessions(): AsyncResult<Session[]> {
    try {
      const projects = await this.fetchAllProjects();
      const sessions: Session[] = [];
      for (const p of projects) {
        const projectPath = p.path;
        const sess = Array.isArray(p.sessions) ? p.sessions : [];
        for (const s of sess) {
          sessions.push(this.normalizeSession(s, projectPath));
        }
      }
      return Ok(sessions);
    } catch (error) {
      return Err(`Failed to get all sessions via IPC: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ITodoRepository: get single session by id
  async getSession(sessionId: string): AsyncResult<Session | null> {
    const all = await this.getAllSessions();
    if (!all.success) return Err(all.error);
    const found = all.value.find(s => s.id === sessionId) || null;
    return Ok(found);
  }

  // ITodoRepository: sessions for a project
  async getSessionsForProject(projectPath: string): AsyncResult<Session[]> {
    const all = await this.getAllSessions();
    if (!all.success) return Err(all.error);
    return Ok(all.value.filter(s => s.projectPath === projectPath));
  }

  // ITodoRepository: all todos
  async getAllTodos(): AsyncResult<Todo[]> {
    const all = await this.getAllSessions();
    if (!all.success) return Err(all.error);
    const todos: Todo[] = [];
    all.value.forEach(s => todos.push(...s.todos));
    return Ok(todos);
  }

  // ITodoRepository: todos for session
  async getTodosForSession(sessionId: string): AsyncResult<Todo[]> {
    const one = await this.getSession(sessionId);
    if (!one.success) return Err(one.error);
    return Ok(one.value ? [...one.value.todos] : []);
  }

  // ITodoRepository: save todos for session
  async saveTodosForSession(sessionId: string, todos: Todo[]): AsyncResult<void> {
    try {
      const all = await this.getAllSessions();
      if (!all.success) return Err(all.error);
      const session = all.value.find(s => s.id === sessionId);
      if (!session || !session.filePath) return Err('Session not found or missing filePath');
      if (window.electronAPI.saveTodos) {
        const ok = await window.electronAPI.saveTodos(session.filePath, todos);
        return ok ? Ok(undefined) : Err('Failed to save todos');
      }
      return Err('saveTodos IPC not available');
    } catch (error) {
      return Err(`Failed to save todos via IPC: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ITodoRepository: existence check
  async sessionExists(sessionId: string): AsyncResult<boolean> {
    const one = await this.getSession(sessionId);
    if (!one.success) return Err(one.error);
    return Ok(!!one.value);
  }

  // ITodoRepository: directory path
  getTodosDirectoryPath(): string {
    return '~/.claude/todos';
  }
  /**
   * Load all sessions for a project via IPC
   */
  async loadSessions(projectPath: string): AsyncResult<Session[]> {
    try {
      // Get all projects via IPC and find the matching one
      const projects = await window.electronAPI.getTodos();
      const project = projects.find(p => p.path === projectPath);
      
      if (!project) {
        return Ok([]); // No sessions if project not found
      }
      
      return Ok(project.sessions || []);
    } catch (error) {
      return Err(`Failed to load sessions via IPC: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Note: Removed duplicate overload of getSession(projectPath, sessionId)

  /**
   * Save a session (update todos)
   */
  async saveSession(projectPath: string, session: Session): AsyncResult<boolean> {
    try {
      // Construct the file path for the session
      const filePath = session.filePath;
      if (!filePath) {
        return Err('Session does not have a file path');
      }
      
      // Save via IPC
      const success = await window.electronAPI.saveTodos(filePath, session.todos);
      return Ok(success);
    } catch (error) {
      return Err(`Failed to save session via IPC: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(projectPath: string, sessionId: string): AsyncResult<boolean> {
    try {
      // Get the session to find its file path
      const sessionResult = await this.getSession(sessionId);
      
      if (!sessionResult.success) {
        return Err(sessionResult.error);
      }
      
      if (!sessionResult.value || !sessionResult.value.filePath) {
        return Ok(true); // Consider it successful if session doesn't exist
      }
      
      // Delete via IPC
      const success = await window.electronAPI.deleteTodoFile(sessionResult.value.filePath);
      return Ok(success);
    } catch (error) {
      return Err(`Failed to delete session via IPC: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a new session
   */
  async createSession(projectPath: string, todos: Todo[]): AsyncResult<Session> {
    // Creating new sessions would require additional IPC handlers
    // For now, return an error
    return Err('Creating new sessions via IPC is not yet implemented');
  }

  /**
   * Get count of sessions for a project
   */
  async getSessionCount(projectPath: string): AsyncResult<number> {
    const sessionsResult = await this.loadSessions(projectPath);
    
    if (!sessionsResult.success) {
      return Err(sessionsResult.error);
    }
    
    return Ok(sessionsResult.value.length);
  }

  /**
   * Get sessions with todos
   */
  async getSessionsWithTodos(projectPath: string): AsyncResult<Session[]> {
    const sessionsResult = await this.loadSessions(projectPath);
    
    if (!sessionsResult.success) {
      return Err(sessionsResult.error);
    }
    
    const sessionsWithTodos = sessionsResult.value.filter(s => s.todos.length > 0);
    return Ok(sessionsWithTodos);
  }

  /**
   * Search sessions by content
   */
  async searchSessions(projectPath: string, query: string): AsyncResult<Session[]> {
    const sessionsResult = await this.loadSessions(projectPath);
    
    if (!sessionsResult.success) {
      return Err(sessionsResult.error);
    }
    
    const lowerQuery = query.toLowerCase();
    const matches = sessionsResult.value.filter(session =>
      session.todos.some(todo =>
        todo.content.toLowerCase().includes(lowerQuery)
      )
    );
    
    return Ok(matches);
  }

  /**
   * Get recently modified sessions
   */
  async getRecentSessions(projectPath: string, limit: number = 10): AsyncResult<Session[]> {
    const sessionsResult = await this.loadSessions(projectPath);
    
    if (!sessionsResult.success) {
      return Err(sessionsResult.error);
    }
    
    const sorted = [...sessionsResult.value].sort((a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
    
    return Ok(sorted.slice(0, limit));
  }

  /**
   * Merge multiple sessions into one
   */
  async mergeSessions(
    projectPath: string,
    targetSessionId: string,
    sourceSessionIds: string[]
  ): AsyncResult<Session> {
    // Merging sessions would require additional IPC handlers
    // For now, return an error
    return Err('Merging sessions via IPC is not yet implemented');
  }
}

// Global electronAPI type is declared in src/types/index.ts
