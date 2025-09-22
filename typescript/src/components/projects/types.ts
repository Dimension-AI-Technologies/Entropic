// Project-related type definitions

export interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
  id?: string;
  created?: Date;
}

export interface Session {
  id: string;
  todos: Todo[];
  lastModified: Date;
  created?: Date;
  filePath?: string;
  provider?: string;
}

export interface Project {
  path: string;
  sessions: Session[];
  mostRecentTodoDate?: Date;
  provider?: string;
}

export type SortMethod = 0 | 1 | 2; // 0=alphabetic, 1=recent, 2=todos
export type EmptyMode = 'all' | 'has_sessions' | 'has_todos' | 'active_only';