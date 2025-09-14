import { ITodoRepository, Todo, Session } from '../models/Todo';
import { AsyncResult, Ok, Err } from '../utils/Result';

/**
 * ViewModel for Todo management
 * Orchestrates todo and session data and provides UI-friendly methods
 */
export class TodosViewModel {
  private sessions: Session[] = [];
  private loading = false;
  private error: string | null = null;
  private changeCallbacks: Set<() => void> = new Set();
  private initialized = false;

  constructor(private todoRepository: ITodoRepository) {
    // Auto-load sessions on initialization
    this.initialize();
  }

  /**
   * Initialize the ViewModel by loading sessions
   */
  private async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.loadSessions();
      this.initialized = true;
    }
  }

  /**
   * Load all sessions from the repository
   */
  async loadSessions(): AsyncResult<Session[]> {
    this.loading = true;
    this.error = null;
    this.notifyChange(); // Notify loading state change

    try {
      const result = await this.todoRepository.getAllSessions();
      
      if (result.success) {
        this.sessions = result.value;
        this.loading = false;
        this.notifyChange(); // Notify data loaded
        return Ok(this.sessions);
      } else {
        this.error = result.error;
        this.loading = false;
        this.notifyChange(); // Notify error state
        return result;
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown error';
      this.loading = false;
      this.notifyChange(); // Notify error state
      return Err('Failed to load sessions', error);
    }
  }

  /**
   * Get all loaded sessions
   */
  getSessions(): Session[] {
    return [...this.sessions]; // Return copy to prevent mutation
  }

  /**
   * Get a specific session by ID
   */
  getSessionById(sessionId: string): Session | null {
    return this.sessions.find(s => s.id === sessionId) || null;
  }

  /**
   * Get sessions for a specific project path
   */
  getSessionsForProject(projectPath: string): Session[] {
    return this.sessions.filter(session => session.projectPath === projectPath);
  }

  /**
   * Get all todos from all sessions
   */
  getAllTodos(): Todo[] {
    const allTodos: Todo[] = [];
    for (const session of this.sessions) {
      allTodos.push(...session.todos);
    }
    return allTodos;
  }

  /**
   * Get todos for a specific session
   */
  getTodosForSession(sessionId: string): Todo[] {
    const session = this.getSessionById(sessionId);
    return session ? [...session.todos] : [];
  }

  /**
   * Get todos filtered by status
   */
  getTodosByStatus(status: 'pending' | 'in_progress' | 'completed'): Todo[] {
    return this.getAllTodos().filter(todo => todo.status === status);
  }

  /**
   * Get todos filtered by priority
   */
  getTodosByPriority(priority: 'low' | 'medium' | 'high'): Todo[] {
    return this.getAllTodos().filter(todo => todo.priority === priority);
  }

  /**
   * Get count of total sessions
   */
  getSessionCount(): number {
    return this.sessions.length;
  }

  /**
   * Get count of sessions that have todos
   */
  getSessionsWithTodosCount(): number {
    return this.sessions.filter(session => session.todos.length > 0).length;
  }

  /**
   * Get count of empty sessions
   */
  getEmptySessionsCount(): number {
    return this.sessions.filter(session => session.todos.length === 0).length;
  }

  /**
   * Get total count of todos across all sessions
   */
  getTotalTodoCount(): number {
    return this.getAllTodos().length;
  }

  /**
   * Get todo counts by status
   */
  getTodoStatusCounts(): { completed: number; in_progress: number; pending: number } {
    const allTodos = this.getAllTodos();
    return {
      completed: allTodos.filter(t => t.status === 'completed').length,
      in_progress: allTodos.filter(t => t.status === 'in_progress').length,
      pending: allTodos.filter(t => t.status === 'pending').length
    };
  }

  /**
   * Get sessions sorted by date (most recent first)
   */
  getSessionsSortedByDate(): Session[] {
    return [...this.sessions].sort((a, b) => 
      b.lastModified.getTime() - a.lastModified.getTime()
    );
  }

  /**
   * Get sessions sorted by todo count (most todos first)
   */
  getSessionsSortedByTodoCount(): Session[] {
    return [...this.sessions].sort((a, b) => 
      b.todos.length - a.todos.length
    );
  }

  /**
   * Save todos for a session
   */
  async saveTodosForSession(sessionId: string, todos: Todo[]): AsyncResult<void> {
    try {
      const result = await this.todoRepository.saveTodosForSession(sessionId, todos);
      
      if (result.success) {
        // Update local session data
        const session = this.getSessionById(sessionId);
        if (session) {
          session.todos = [...todos];
          session.lastModified = new Date();
          this.notifyChange(); // Notify observers of change
        }
        return Ok(undefined);
      } else {
        this.error = result.error;
        return result;
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown error';
      return Err('Failed to save todos', error);
    }
  }

  /**
   * Check if currently loading
   */
  isLoading(): boolean {
    return this.loading;
  }

  /**
   * Check if there's an error
   */
  hasError(): boolean {
    return this.error !== null;
  }

  /**
   * Get current error (if any)
   */
  getError(): string | null {
    return this.error;
  }

  /**
   * Clear current error
   */
  clearError(): void {
    this.error = null;
  }

  /**
   * Clear all sessions and notify listeners (used for visible reloads)
   */
  clearAll(): void {
    this.sessions = [];
    this.loading = false;
    this.error = null;
    this.notifyChange();
  }

  /**
   * Refresh sessions (reload from repository)
   */
  async refresh(): AsyncResult<Session[]> {
    return this.loadSessions();
  }

  /**
   * Register a callback for when sessions change
   * Returns an unsubscribe function
   */
  onChange(callback: () => void): () => void {
    this.changeCallbacks.add(callback);
    // Return unsubscribe function
    return () => {
      this.changeCallbacks.delete(callback);
    };
  }

  /**
   * Unregister a change callback
   */
  offChange(callback: () => void): void {
    this.changeCallbacks.delete(callback);
  }

  /**
   * Notify all registered callbacks about a change
   */
  private notifyChange(): void {
    this.changeCallbacks.forEach(callback => callback());
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.changeCallbacks.clear();
  }
}
