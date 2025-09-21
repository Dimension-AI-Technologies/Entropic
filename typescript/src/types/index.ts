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
}

export interface Project {
  path: string;
  sessions: Session[];
  mostRecentTodoDate?: Date;
}

export type SortMethod = 0 | 1 | 2; // 0=alphabetic, 1=recent, 2=todos
export type SpacingMode = 'wide' | 'normal' | 'compact';
export type FilterState = {
  completed: boolean;
  in_progress: boolean;
  pending: boolean;
};

declare global {
  interface Window {
    electronAPI: {
      // Core
      getTodos: () => Promise<any[]>;
      // Optional methods exposed by preload depending on environment
      saveTodos?: (filePath: string, todos: Todo[]) => Promise<boolean>;
      deleteTodoFile?: (filePath: string) => Promise<boolean>;
      deleteProjectDirectory?: (projectDirPath: string) => Promise<{ success: boolean; value?: boolean; error?: string }>;
      getProjectPrompts?: (projectPath: string) => Promise<{ success: boolean; value?: any[]; error?: string }>;
      takeScreenshot?: () => Promise<{ success: boolean; value?: { path: string } } | { success: false; error: string }>;
      onScreenshotTaken?: (callback: (event: any, data: { path: string }) => void) => () => void;
      onTodoFilesChanged?: (callback: (event: any, data: any) => void) => () => void;
      getGitStatus?: (baseDir?: string) => Promise<any>;
      getGitCommits?: (options?: { baseDir?: string; limit?: number }) => Promise<any>;
      getProjects?: () => Promise<any>;
      getProviderPresence?: () => Promise<any>;
      collectDiagnostics?: () => Promise<any>;
      repairMetadata?: (dryRun: boolean) => Promise<any>;
      collectDiagnosticsHex?: () => Promise<any>;
      repairMetadataHex?: (provider: string | undefined, dryRun: boolean) => Promise<any>;
    };
    __initialSplash?: {
      addStep?: (text: string) => void;
      syncSteps?: (steps: string[]) => void;
      setStatus?: (text: string) => void;
      markReactReady?: () => void;
      hide?: () => void;
    };
  }
}
