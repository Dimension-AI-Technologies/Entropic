import { Result, AsyncResult } from '../utils/Result';

/**
 * Core Project domain model
 * Represents a project directory in ~/.claude/projects
 */
export interface Project {
  id: string;              // Unique identifier (flattened directory name)
  path: string;            // Reconstructed real path (e.g., /Users/name/Source/project)
  flattenedDir: string;    // Original flattened directory name (e.g., -Users-name-Source-project)
  pathExists: boolean;     // Whether the reconstructed path exists on filesystem
  lastModified: Date;      // Most recent modification time from session files
}

/**
 * Repository interface for Project data access
 * Allows dependency injection and testing with different implementations
 */
export interface IProjectRepository {
  /**
   * Load all projects from the data source
   * @returns Result containing array of all projects
   */
  getAllProjects(): AsyncResult<Project[]>;

  /**
   * Get a specific project by ID
   * @param id Project ID (flattened directory name)
   * @returns Result containing the project or null if not found
   */
  getProject(id: string): AsyncResult<Project | null>;

  /**
   * Check if a project exists
   * @param id Project ID (flattened directory name)
   * @returns Result containing boolean indicating existence
   */
  projectExists(id: string): AsyncResult<boolean>;
}