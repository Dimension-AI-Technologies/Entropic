import { ITodoRepository, Todo, Session } from '../models/Todo';
import { AsyncResult, Ok, Err } from '../utils/Result';

/**
 * IPC-based implementation of ITodoRepository
 * Delegates all filesystem operations to the main process via IPC
 */
export class IPCTodoRepository implements ITodoRepository {
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

  /**
   * Get a specific session by ID
   */
  async getSession(projectPath: string, sessionId: string): AsyncResult<Session | null> {
    const sessionsResult = await this.loadSessions(projectPath);
    
    if (!sessionsResult.success) {
      return Err(sessionsResult.error);
    }
    
    const session = sessionsResult.value.find(s => s.id === sessionId) || null;
    return Ok(session);
  }

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
      const sessionResult = await this.getSession(projectPath, sessionId);
      
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

// Add type declaration for window.electronAPI if not already present
declare global {
  interface Window {
    electronAPI: {
      getTodos: () => Promise<any[]>;
      saveTodos: (filePath: string, todos: Todo[]) => Promise<boolean>;
      deleteTodoFile: (filePath: string) => Promise<boolean>;
    };
  }
}