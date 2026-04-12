import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Project, IProjectRepository } from '../models/Project.js';
import { Result, AsyncResult, Ok, Err, ResultUtils } from '../utils/Result.js';
import { PathUtils } from '../utils/PathUtils.js';

/**
 * File system implementation of IProjectRepository
 * Reads projects directly from ~/.claude/projects directory structure
 */
export class FileSystemProjectRepository implements IProjectRepository {
  private readonly projectsDir: string;

  constructor(projectsDir?: string) {
    this.projectsDir = projectsDir || path.join(os.homedir(), '.claude', 'projects');
  }

  /**
   * Load all projects from ~/.claude/projects directory
   * This is the clean, simple implementation that replaces the messy logic in main.ts
   */
  async getAllProjects(): AsyncResult<Project[]> {
    // Check if projects directory exists
    if (!fsSync.existsSync(this.projectsDir)) {
      return Ok([]); // No projects directory means no projects
    }

    const projectDirsResult = await ResultUtils.fromPromise(fs.readdir(this.projectsDir));
    if (!projectDirsResult.success) {
      return Err('Failed to read projects directory', projectDirsResult.error);
    }

    const projects: Project[] = [];

    for (const flattenedDir of projectDirsResult.value) {
      const projectDirPath = path.join(this.projectsDir, flattenedDir);
      const statsResult = await ResultUtils.fromPromise(fs.stat(projectDirPath));
      
      if (!statsResult.success) {
        // Log error but continue processing other projects
        console.warn(`Error processing project directory ${flattenedDir}:`, statsResult.error);
        continue;
      }
      
      // Skip files, only process directories
      if (!statsResult.value.isDirectory()) {
        continue;
      }

      // Reconstruct the real path from the flattened directory name
      const reconstructedPath = PathUtils.guessPathFromFlattenedName(flattenedDir);
      
      // Check if the reconstructed path exists
      const pathValidation = PathUtils.validatePath(reconstructedPath);
      const pathExists = pathValidation.success && pathValidation.value;

      // Get the most recent modification time from session files
      const lastModified = await this.getMostRecentModificationTime(projectDirPath);

      const project: Project = {
        id: flattenedDir,
        path: reconstructedPath,
        flattenedDir: flattenedDir,
        pathExists: pathExists,
        lastModified: lastModified
      };

      projects.push(project);
    }

    return Ok(projects);
  }

  /**
   * Get a specific project by ID (flattened directory name)
   */
  async getProject(id: string): AsyncResult<Project | null> {
    const allProjectsResult = await this.getAllProjects();
    if (!allProjectsResult.success) {
      return allProjectsResult;
    }

    const project = allProjectsResult.value.find(p => p.id === id) || null;
    return Ok(project);
  }

  /**
   * Check if a project exists
   */
  async projectExists(id: string): AsyncResult<boolean> {
    const projectPath = path.join(this.projectsDir, id);
    const exists = fsSync.existsSync(projectPath);
    return Ok(exists);
  }

  /**
   * Get the most recent modification time from session files in a project directory
   * Private helper method
   */
  private async getMostRecentModificationTime(projectDirPath: string): Promise<Date> {
    const filesResult = await ResultUtils.fromPromise(fs.readdir(projectDirPath));
    if (!filesResult.success) {
      // If we can't read directory, use current time
      return new Date();
    }
    
    // Look for .session_*.json files (not JSONL files, those are for History view)
    const sessionFiles = filesResult.value.filter(file => file.match(/^\.session_.+\.json$/));
    
    if (sessionFiles.length === 0) {
      // No session files, use directory modification time
      const dirStatsResult = await ResultUtils.fromPromise(fs.stat(projectDirPath));
      if (dirStatsResult.success) {
        return dirStatsResult.value.mtime;
      }
      return new Date();
    }

    // Find the most recent session file modification time
    let mostRecent = new Date(0);
    
    for (const sessionFile of sessionFiles) {
      const sessionFilePath = path.join(projectDirPath, sessionFile);
      const statsResult = await ResultUtils.fromPromise(fs.stat(sessionFilePath));
      
      if (statsResult.success && statsResult.value.mtime > mostRecent) {
        mostRecent = statsResult.value.mtime;
      }
      // Ignore individual file errors, continue with others
    }

    return mostRecent;
  }

  /**
   * Get projects directory path (for testing/debugging)
   */
  getProjectsDirectory(): string {
    return this.projectsDir;
  }

  /**
   * Get project directory path for a given project ID
   */
  getProjectPath(projectId: string): string {
    return path.join(this.projectsDir, projectId);
  }

  /**
   * Check if projects directory exists and is accessible
   */
  async isAccessible(): AsyncResult<boolean> {
    const accessResult = await ResultUtils.fromPromise(fs.access(this.projectsDir));
    return Ok(accessResult.success);
  }
}