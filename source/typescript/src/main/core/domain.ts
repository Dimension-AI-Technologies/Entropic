/**
 * Entropic Domain Types (provider-agnostic)
 * Identity rules:
 *  - Project identity = (provider, projectPath)
 *  - Session identity = (provider, sessionId)
 */

export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export interface Todo {
  id?: string;
  content: string;
  status: TodoStatus;
  createdAt?: number; // epoch ms
  updatedAt?: number; // epoch ms
  activeForm?: string;
}

export interface Session {
  provider: string; // e.g., 'claude', 'codex'
  sessionId: string;
  filePath?: string;
  projectPath?: string;
  todos: Todo[];
  createdAt?: number;
  updatedAt?: number;
}

export interface ProjectStats {
  todos: number;
  active: number;
  completed: number;
}

export interface Project {
  provider: string;      // e.g., 'claude', 'codex'
  projectPath: string;   // real path
  flattenedDir?: string; // provider-specific flattened directory name
  pathExists?: boolean;
  sessions: Session[];
  stats?: ProjectStats;
  startDate?: number;           // epoch ms
  mostRecentTodoDate?: number;  // epoch ms
}

