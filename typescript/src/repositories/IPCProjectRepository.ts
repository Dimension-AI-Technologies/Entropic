import { IProjectRepository, Project } from '../models/Project';
import { AsyncResult, Ok, Err } from '../utils/Result';

/**
 * IPC-based implementation of IProjectRepository
 * Delegates all filesystem operations to the main process via IPC
 */
export class IPCProjectRepository implements IProjectRepository {
  private fileWatcherCleanup: (() => void) | null = null;
  private changeCallbacks: Set<() => void> = new Set();

  /**
   * Load all projects via IPC (implementing IProjectRepository interface)
   */
  async getAllProjects(): AsyncResult<Project[]> {
    console.warn('[IPCProjectRepository] getAllProjects called');
    try {
      // Use the existing IPC handler that's already in main.ts
      const rawProjects = await window.electronAPI.getTodos();
      console.warn('[IPCProjectRepository] Got', rawProjects.length, 'projects from IPC');
      
      // Convert raw projects to MVVM Project model
      const projects: Project[] = rawProjects.map(p => ({
        id: (p.flattenedDir || p.path || '').replace(/[/\\:]/g, '-'),
        path: p.path,
        flattenedDir: p.flattenedDir || this.getFlattenedPath(p.path),
        pathExists: typeof p.pathExists === 'boolean' ? p.pathExists : true,
        lastModified: p.mostRecentTodoDate ? new Date(p.mostRecentTodoDate) : new Date()
      }));
      
      return Ok(projects);
    } catch (error) {
      return Err(`Failed to load projects via IPC: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load all projects via IPC (backward compatibility)
   */
  async loadProjects(): AsyncResult<Project[]> {
    return this.getAllProjects();
  }

  /**
   * Get a specific project by ID (implementing IProjectRepository interface)
   */
  async getProject(id: string): AsyncResult<Project | null> {
    try {
      const projectsResult = await this.getAllProjects();
      if (!projectsResult.success) {
        return Err(projectsResult.error);
      }
      
      const project = projectsResult.value.find(p => p.id === id) || null;
      return Ok(project);
    } catch (error) {
      return Err(`Failed to get project: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if a project exists (implementing IProjectRepository interface)
   */
  async projectExists(id: string): AsyncResult<boolean> {
    const projectResult = await this.getProject(id);
    if (!projectResult.success) {
      return Err(projectResult.error);
    }
    return Ok(projectResult.value !== null);
  }

  /**
   * Delete a project (via IPC)
   */
  async deleteProject(projectPath: string): AsyncResult<boolean> {
    try {
      // Get the flattened path for the project
      const flatPath = this.getFlattenedPath(projectPath);
      const projectDirPath = `/Users/${projectPath.split('/')[2] || 'unknown'}/.claude/projects/${flatPath}`;
      
      const result = await window.electronAPI.deleteProjectDirectory(projectDirPath);
      
      if (result.success) {
        return Ok(result.value || false);
      } else {
        return Err(result.error || 'Failed to delete project');
      }
    } catch (error) {
      return Err(`Failed to delete project: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get count of all projects
   */
  async getProjectCount(): AsyncResult<number> {
    const projectsResult = await this.loadProjects();
    if (!projectsResult.success) {
      return Err(projectsResult.error);
    }
    return Ok(projectsResult.value.length);
  }

  /**
   * Get projects with todos
   */
  async getProjectsWithTodos(): AsyncResult<Project[]> {
    const projectsResult = await this.loadProjects();
    if (!projectsResult.success) {
      return Err(projectsResult.error);
    }
    
    const projectsWithTodos = projectsResult.value.filter(p => 
      p.sessions && p.sessions.some(s => s.todos && s.todos.length > 0)
    );
    
    return Ok(projectsWithTodos);
  }

  /**
   * Search projects by name
   */
  async searchProjects(query: string): AsyncResult<Project[]> {
    const projectsResult = await this.loadProjects();
    if (!projectsResult.success) {
      return Err(projectsResult.error);
    }
    
    const lowerQuery = query.toLowerCase();
    const matches = projectsResult.value.filter(p => 
      p.path.toLowerCase().includes(lowerQuery)
    );
    
    return Ok(matches);
  }

  /**
   * Get recently modified projects
   */
  async getRecentProjects(limit: number = 10): AsyncResult<Project[]> {
    const projectsResult = await this.loadProjects();
    if (!projectsResult.success) {
      return Err(projectsResult.error);
    }
    
    const sorted = [...projectsResult.value].sort((a, b) => {
      const dateA = this.getMostRecentDate(a);
      const dateB = this.getMostRecentDate(b);
      return dateB.getTime() - dateA.getTime();
    });
    
    return Ok(sorted.slice(0, limit));
  }

  // Helper methods

  private getMostRecentDate(project: Project): Date {
    let mostRecent = new Date(0);
    project.sessions.forEach(session => {
      const sessionDate = new Date(session.lastModified);
      if (sessionDate > mostRecent) {
        mostRecent = sessionDate;
      }
    });
    return mostRecent;
  }

  private getFlattenedPath(projectPath: string): string {
    // Convert a real path to a flattened directory name
    // e.g., /Users/john/projects/my-app -> -Users-john-projects-my-app
    return projectPath.replace(/\//g, '-');
  }

  /**
   * Set up file watching for reactive updates
   */
  setupFileWatching(onChange: () => void): void {
    // Add the callback to our set
    this.changeCallbacks.add(onChange);
    
    // Set up file watcher only once
    if (!this.fileWatcherCleanup && window.electronAPI.onTodoFilesChanged) {
      this.fileWatcherCleanup = window.electronAPI.onTodoFilesChanged((event: any, data: any) => {
        console.log('[IPCProjectRepository] File change detected:', data);
        // Notify all registered callbacks
        this.changeCallbacks.forEach(callback => callback());
      });
    }
  }

  /**
   * Clean up file watching
   */
  cleanup(): void {
    if (this.fileWatcherCleanup) {
      this.fileWatcherCleanup();
      this.fileWatcherCleanup = null;
    }
    this.changeCallbacks.clear();
  }
}

// Global electronAPI type is declared in src/types/index.ts
