import { AsyncResult } from '../utils/Result';

/**
 * Todo domain model based on the existing TodoManager structure
 */
export interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
  id?: string;
  created?: Date;
  priority?: 'low' | 'medium' | 'high'; // Found in real data
}

/**
 * Session represents a Claude Code session with associated todos
 * Based on the file naming pattern: {sessionId}-agent-{sessionId}.json
 */
export interface Session {
  id: string;                 // Session UUID
  todos: Todo[];             // Todos from this session
  lastModified: Date;        // File modification time
  created?: Date;            // Session creation time
  filePath?: string;         // Path to the session file
  projectPath?: string;      // Associated project path (if reconstructed)
}

/**
 * Repository interface for todo data access
 * Abstracts the ~/.claude/todos/ directory structure
 */
export interface ITodoRepository {
  /**
   * Get all sessions from the ~/.claude/todos/ directory
   */
  getAllSessions(): AsyncResult<Session[]>;
  
  /**
   * Get a specific session by ID
   */
  getSession(sessionId: string): AsyncResult<Session | null>;
  
  /**
   * Get sessions for a specific project path
   */
  getSessionsForProject(projectPath: string): AsyncResult<Session[]>;
  
  /**
   * Get all todos from all sessions
   */
  getAllTodos(): AsyncResult<Todo[]>;
  
  /**
   * Get todos for a specific session
   */
  getTodosForSession(sessionId: string): AsyncResult<Todo[]>;
  
  /**
   * Save todos for a session
   */
  saveTodosForSession(sessionId: string, todos: Todo[]): AsyncResult<void>;
  
  /**
   * Check if a session exists
   */
  sessionExists(sessionId: string): AsyncResult<boolean>;
  
  /**
   * Get the todos directory path
   */
  getTodosDirectoryPath(): string;
}