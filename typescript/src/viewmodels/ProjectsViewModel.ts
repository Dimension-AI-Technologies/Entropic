import { Project, IProjectRepository } from '../models/Project';
import { Result, AsyncResult, Ok, Err } from '../utils/Result';

/**
 * ViewModel for the Projects pane
 * Orchestrates project data and provides UI-friendly methods
 */
export class ProjectsViewModel {
  private projects: Project[] = [];
  private isLoading = false;
  private error: string | null = null;
  private changeCallbacks: Set<() => void> = new Set();
  private initialized = false;

  constructor(private projectRepository: IProjectRepository) {
    console.warn('[ProjectsViewModel] Constructor called');
    // Set up file watching if the repository supports it
    this.setupFileWatching();
    // Auto-load projects on initialization
    this.initialize().then(() => {
      console.warn('[ProjectsViewModel] Initialized with', this.projects.length, 'projects');
    }).catch(err => {
      console.error('[ProjectsViewModel] Failed to initialize:', err);
    });
  }

  /**
   * Initialize the ViewModel by loading projects
   */
  private async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.loadProjects();
      this.initialized = true;
    }
  }

  /**
   * Load all projects from the repository
   */
  async loadProjects(): AsyncResult<Project[]> {
    this.isLoading = true;
    this.error = null;
    this.notifyChange(); // Notify loading state change

    try {
      const result = await this.projectRepository.getAllProjects();
      
      if (result.success) {
        this.projects = result.value;
        this.isLoading = false;
        this.notifyChange(); // Notify data loaded
        return Ok(this.projects);
      } else {
        this.error = result.error;
        this.isLoading = false;
        this.notifyChange(); // Notify error state
        return result;
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown error';
      this.isLoading = false;
      this.notifyChange(); // Notify error state
      return Err('Failed to load projects', error);
    }
  }

  /**
   * Get all loaded projects
   */
  getProjects(): Project[] {
    return [...this.projects]; // Return copy to prevent mutation
  }

  /**
   * Get a specific project by ID
   */
  getProject(id: string): Project | null {
    return this.projects.find(p => p.id === id) || null;
  }

  /**
   * Get projects that exist on the filesystem
   */
  getExistingProjects(): Project[] {
    return this.projects.filter(p => p.pathExists);
  }

  /**
   * Get projects that don't exist on the filesystem (renamed/moved)
   */
  getUnmatchedProjects(): Project[] {
    return this.projects.filter(p => !p.pathExists);
  }

  /**
   * Get projects sorted by last modified date (most recent first)
   */
  getProjectsSortedByDate(): Project[] {
    return [...this.projects].sort((a, b) => 
      b.lastModified.getTime() - a.lastModified.getTime()
    );
  }

  /**
   * Get count of total projects
   */
  getProjectCount(): number {
    return this.projects.length;
  }

  /**
   * Manually set projects (for use when data comes from external source like IPC)
   * This bypasses the repository and directly updates the view model state
   */
  setProjects(projects: Project[]): void {
    this.projects = projects;
    this.isLoading = false;
    this.error = null;
    this.notifyChange(); // Notify observers of change
  }

  /**
   * Get count of projects that exist
   */
  getExistingProjectCount(): number {
    return this.projects.filter(p => p.pathExists).length;
  }

  /**
   * Get count of projects that don't exist (unmatched)
   */
  getUnmatchedProjectCount(): number {
    return this.projects.filter(p => !p.pathExists).length;
  }

  /**
   * Check if currently loading
   */
  getIsLoading(): boolean {
    return this.isLoading;
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
   * Refresh projects (reload from repository)
   */
  async refresh(): AsyncResult<Project[]> {
    return this.loadProjects();
  }

  /**
   * Get display name for a project (basename of path)
   */
  getDisplayName(project: Project): string {
    if (project.pathExists) {
      const pathParts = project.path.split(/[/\\]/);
      return pathParts[pathParts.length - 1] || project.path;
    } else {
      // For unmatched projects, show the flattened name
      return project.flattenedDir;
    }
  }

  /**
   * Get status icon for a project
   */
  getStatusIcon(project: Project): string {
    return project.pathExists ? '✅' : '⚠️';
  }

  /**
   * Get tooltip text for a project
   */
  getTooltip(project: Project): string {
    if (project.pathExists) {
      return `Path: ${project.path}\nLast Modified: ${project.lastModified.toLocaleString()}`;
    } else {
      return `Path: ${project.path} (does not exist)\nFlattened: ${project.flattenedDir}\nLast Modified: ${project.lastModified.toLocaleString()}`;
    }
  }

  /**
   * Set up file watching for reactive updates
   */
  private setupFileWatching(): void {
    // Check if the repository supports file watching (IPCProjectRepository does)
    const repo = this.projectRepository as any;
    if (repo.setupFileWatching) {
      repo.setupFileWatching(() => {
        console.log('[ProjectsViewModel] File change detected, auto-reloading projects');
        // Automatically reload projects when files change
        this.loadProjects().then(result => {
          if (result.success) {
            // Notify all registered callbacks about the change
            this.notifyChange();
          }
        });
      });
    }
  }

  /**
   * Register a callback for when projects change
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
    const repo = this.projectRepository as any;
    if (repo.cleanup) {
      repo.cleanup();
    }
    this.changeCallbacks.clear();
  }
}