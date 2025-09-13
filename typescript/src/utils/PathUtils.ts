import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import { Result, AsyncResult, Ok, Err, ResultUtils } from './Result.js';
import { createFlattenedPath as createFlattenedPathImpl } from './path/flatten.js';
import { validatePathImpl, listDirectoryImpl } from './path/validate.js';

// Default projects directory - can be overridden for testing
let projectsDir = path.join(os.homedir(), '.claude', 'projects');

export interface PathReconstructionResult {
  path: string | null;
  flattenedDir?: string;
  reconstructionAttempt?: string;
  failureReason?: string;
}

export interface ProjectDirFindResult {
  projectDir: string | null;
  found: boolean;
}

/**
 * Shared path handling utilities for consistent flattening/unflattening
 * of project paths between Todo and History views.
 */
export class PathUtils {
  
  /**
   * Override the projects directory (primarily for testing)
   */
  static setProjectsDir(dir: string): void {
    projectsDir = dir;
  }
  
  /**
   * Get the current projects directory
   */
  static getProjectsDir(): string {
    return projectsDir;
  }
  
  /**
   * Create a simple flattened path by replacing path separators with dashes
   * This is the most basic flattening approach that both systems should use as fallback
   */
  static createFlattenedPath(realPath: string): string {
    return createFlattenedPathImpl(realPath);
  }
  
  /**
   * Find the project directory for a given real path
   * First tries to find via metadata, then via flattened path
   */
  static async findProjectDirectory(realPath: string): AsyncResult<ProjectDirFindResult> {
    const projectDirsListResult = await ResultUtils.fromPromise(fs.readdir(projectsDir));
    if (!projectDirsListResult.success) {
      return Err(
        'Failed to read projects directory',
        projectDirsListResult.error
      );
    }
    const projectDirsList = projectDirsListResult.value;
      
      // First, look for a project directory with metadata matching this path
      for (const flatDir of projectDirsList) {
        const metadataPath = path.join(projectsDir, flatDir, 'metadata.json');
        if (fsSync.existsSync(metadataPath)) {
          // Read metadata without try-catch
          const readResult = (() => {
            const content = fsSync.readFileSync(metadataPath, 'utf-8');
            const data = JSON.parse(content);
            return Ok(data);
          })();
          
          if (readResult.success && readResult.value.path === realPath) {
            return Ok({
              projectDir: path.join(projectsDir, flatDir),
              found: true
            });
          }
          // Ignore metadata read errors, continue searching
        }
      }
      
      // If not found via metadata, try the flattened path approach
      const flattenedPath = PathUtils.createFlattenedPath(realPath);
      const testDir = path.join(projectsDir, flattenedPath);
      
      if (fsSync.existsSync(testDir)) {
        return Ok({
          projectDir: testDir,
          found: true
        });
      }
      
      // If still not found, try parent directories (for subdirectory paths)
      // This handles cases like /path/to/project/typescript where todos are at /path/to/project
      const parentPath = path.dirname(realPath);
      if (parentPath && parentPath !== realPath && parentPath !== '/' && parentPath !== '.') {
        // Try to find parent project recursively
        const parentResult = await PathUtils.findProjectDirectory(parentPath);
        if (parentResult.success && parentResult.value.found) {
          console.log(`Found parent project for ${realPath} at ${parentResult.value.projectDir}`);
          return parentResult;
        }
      }
      
      return Ok({ projectDir: null, found: false });
  }
  
  /**
   * Validate if a path exists on the filesystem
   */
  static validatePath(testPath: string): Result<boolean> {
    return validatePathImpl(testPath);
  }
  
  /**
   * List directory contents safely
   */
  static listDirectory(dirPath: string): Result<string[]> {
    return listDirectoryImpl(dirPath);
  }
  
  /**
   * Build path incrementally with greedy matching against actual filesystem
   */
  static buildAndValidatePath(flatParts: string[], isWindows: boolean): string | null {
    const pathSep = isWindows ? '\\' : '/';
    let currentPath = isWindows ? `${flatParts[0]}:\\` : '/';
    let consumedParts = isWindows ? 1 : 0;
    
    while (consumedParts < flatParts.length) {
      const remainingParts = flatParts.slice(consumedParts);
      
      // List what's actually in the current directory
      const dirResult = PathUtils.listDirectory(currentPath);
      if (!dirResult.success) {
        break;
      }
      const dirContents = dirResult.value;
      
      // Try to find the best match for the remaining parts
      let bestMatch = null;
      let bestMatchLength = 0;
      
      // Try increasingly longer combinations of the remaining parts
      for (let numParts = Math.min(remainingParts.length, 5); numParts >= 1; numParts--) {
        const testParts = remainingParts.slice(0, numParts);
        
        // Build possible directory names from these parts
        const candidates = [];
        
        // Try as-is (parts joined with hyphens)
        candidates.push(testParts.join('-'));
        
        // Try with dots between parts (for usernames like first.last)
        if (numParts === 2) {
          candidates.push(testParts.join('.'));
        }
        
        // Try with dot prefix (hidden directories)
        if (numParts === 1) {
          candidates.push('.' + testParts[0]);
        }
        
        // Check each candidate against actual directory contents
        for (const candidate of candidates) {
          // Look for exact match
          if (dirContents.includes(candidate)) {
            bestMatch = candidate;
            bestMatchLength = numParts;
            break;
          }
          
          // Also check for directories that start with our candidate
          // This handles cases where the flattened name is abbreviated
          for (const dirEntry of dirContents) {
            if (dirEntry.toLowerCase().startsWith(candidate.toLowerCase())) {
              bestMatch = dirEntry;
              bestMatchLength = numParts;
              break;
            }
          }
          
          if (bestMatch) break;
        }
        
        if (bestMatch) break;
      }
      
      if (bestMatch) {
        // Found a match, add it to the path
        currentPath = currentPath + bestMatch;
        consumedParts += bestMatchLength;
      } else {
        // No match found, try adding the part as-is (might be a new directory)
        const part = remainingParts[0];
        currentPath = currentPath + part;
        consumedParts += 1;
      }
      
      // Add path separator for next iteration unless we're done
      if (consumedParts < flatParts.length) {
        currentPath = currentPath + pathSep;
      }
    }
    
    return currentPath;
  }
  
  /**
   * Best-effort conversion of flattened path back to real path
   * Uses the same logic as the main.ts implementation
   */
  static guessPathFromFlattenedName(flatPath: string): string {
    const isWindows = process.platform === 'win32';
    
    // First check if we have metadata for this project
    const metadataPath = path.join(projectsDir, flatPath, 'metadata.json');
    if (fsSync.existsSync(metadataPath)) {
      // Read metadata without try-catch
      const readResult = (() => {
        const content = fsSync.readFileSync(metadataPath, 'utf-8');
        const data = JSON.parse(content);
        return Ok(data);
      })();
      
      if (readResult.success && readResult.value.path) {
        return readResult.value.path;
      }
      // No valid metadata, continue with reconstruction
    }
    
    // Windows path with drive letter (e.g., C--Users-username-Source-repos-project-name)
    const windowsMatch = flatPath.match(/^([A-Z])--(.+)$/);
    if (windowsMatch) {
      const [, driveLetter, restOfPath] = windowsMatch;
      
      // Split on single dashes, but preserve empty parts (which indicate dots)
      const rawParts = restOfPath.split('-');
      
      // Process parts to handle double dashes (empty parts mean next part should have dot)
      let flatParts = [];
      for (let i = 0; i < rawParts.length; i++) {
        if (rawParts[i] === '' && i + 1 < rawParts.length) {
          // Empty part from double dash - next part should have dot prefix
          flatParts.push('.' + rawParts[i + 1]);
          i++; // Skip the next part as we've consumed it
        } else if (rawParts[i] !== '') {
          flatParts.push(rawParts[i]);
        }
      }
      
      // Build path with greedy filesystem validation
      const allParts = [driveLetter, ...flatParts];
      const validatedPath = PathUtils.buildAndValidatePath(allParts, true);
      
      // If validation failed or returned incomplete path, build it manually
      if (!validatedPath || validatedPath === `${driveLetter}:\\`) {
        // Build Windows path manually from parts
        return `${driveLetter}:\\${flatParts.join('\\')}`;
      }
      
      const pathValidation = PathUtils.validatePath(validatedPath);
      if (pathValidation.success && pathValidation.value) {
        return validatedPath;
      } else {
        // Return manual build if validation failed
        return `${driveLetter}:\\${flatParts.join('\\')}`;
      }
    }
    
    // Unix absolute path
    if (flatPath.startsWith('-')) {
      const unixParts = flatPath.slice(1).split('-');
      const validatedPath = PathUtils.buildAndValidatePath(unixParts, false);
      
      // Check if we got the full path or just a partial one
      // If we didn't consume all parts during validation, use simple transformation
      const expectedParts = unixParts.length;
      const validatedParts = validatedPath ? validatedPath.split('/').filter(p => p !== '').length : 0;
      
      if (!validatedPath || validatedPath === '/' || validatedParts < expectedParts) {
        // Simple transformation when filesystem validation fails or is incomplete
        return '/' + flatPath.slice(1).replace(/-/g, '/');
      }
      return validatedPath;
    }
    
    // Return as-is if we can't figure it out
    return flatPath;
  }
  
  /**
   * Get real project path from metadata or session files (used for todos)
   * This is the complex reconstruction used in the loadTodosData function
   */
  static async getRealProjectPath(sessionId: string): AsyncResult<PathReconstructionResult> {
      // First, check if there's a metadata file in the project directory
      const projectDirsResult = await ResultUtils.fromPromise(fs.readdir(projectsDir));
      if (!projectDirsResult.success) {
        return Err(
          'Failed to read project directories',
          projectDirsResult.error
        );
      }
      const projectDirs = projectDirsResult.value;
      
      // Look for a project directory containing this session
      let matchedProjDir: string | null = null;
      for (const projDir of projectDirs) {
        const projPath = path.join(projectsDir, projDir);
        const filesResult = await ResultUtils.fromPromise(fs.readdir(projPath));
        if (!filesResult.success) {
          continue; // Skip directories we can't read
        }
        const files = filesResult.value;
        
        // Check if this project contains our session
        if (files.some((f: string) => f.startsWith(sessionId))) {
          matchedProjDir = projDir;
          break;
        }
      }
      
      if (!matchedProjDir) {
        // No project directory found for this session
        return Ok({
          path: null,
          failureReason: 'No project directory found containing session files'
        });
      }
      
      const projPath = path.join(projectsDir, matchedProjDir);
      const filesResult = await ResultUtils.fromPromise(fs.readdir(projPath));
      if (!filesResult.success) {
        return Ok({
          path: null,
          failureReason: 'Could not read project directory'
        });
      }
      const files = filesResult.value;
      
      // Look for a metadata file
      const metadataPath = path.join(projPath, 'metadata.json');
      const metadataResult = await ResultUtils.fromPromise(
        fs.readFile(metadataPath, 'utf-8')
      );
      if (metadataResult.success) {
        const parseResult = await ResultUtils.fromPromise(
          Promise.resolve(JSON.parse(metadataResult.value))
        );
        if (parseResult.success && parseResult.value.path) {
          return Ok({ path: parseResult.value.path, flattenedDir: matchedProjDir });
        }
      }
      // No metadata file, continue
      
      // Try to read the actual path from a session file
      for (const file of files) {
        if (file.startsWith(sessionId) && file.endsWith('.json')) {
          const sessionPath = path.join(projPath, file);
          const sessionContentResult = await ResultUtils.fromPromise(
            fs.readFile(sessionPath, 'utf-8')
          );
          if (sessionContentResult.success) {
            const sessionParseResult = await ResultUtils.fromPromise(
              Promise.resolve(JSON.parse(sessionContentResult.value))
            );
            if (sessionParseResult.success && sessionParseResult.value.projectPath) {
              return Ok({ path: sessionParseResult.value.projectPath, flattenedDir: matchedProjDir });
            }
          }
          // Continue to next file
        }
      }
      
      // Fallback: try to guess from the flattened directory name
      const reconstructedPath = PathUtils.guessPathFromFlattenedName(matchedProjDir);
      
      // Validate the path exists before returning
      const pathValidation = PathUtils.validatePath(reconstructedPath);
      if (reconstructedPath && pathValidation.success && pathValidation.value) {
        return Ok({ path: reconstructedPath, flattenedDir: matchedProjDir });
      } else {
        return Ok({
          path: null,
          flattenedDir: matchedProjDir,
          reconstructionAttempt: reconstructedPath || 'Failed to generate path',
          failureReason: reconstructedPath ? 'Reconstructed path does not exist on filesystem' : 'Path reconstruction failed completely'
        });
      }
  }
  
  /**
   * Save project metadata for future lookups
   */
  static async saveProjectMetadata(flattenedPath: string, realPath: string): AsyncResult<void> {
    const metadataPath = path.join(projectsDir, flattenedPath, 'metadata.json');
    const writeResult = await ResultUtils.fromPromise(
      fs.writeFile(metadataPath, JSON.stringify({ path: realPath }, null, 2))
    );
    if (!writeResult.success) {
      return Err(
        'Failed to save project metadata',
        writeResult.error
      );
    }
    return Ok(undefined);
  }
  
  /**
   * Find project path for a session ID (used in todos loading)
   */
  static async findProjectForSession(sessionId: string): AsyncResult<string | null> {
      const projectDirsResult = await ResultUtils.fromPromise(fs.readdir(projectsDir));
      if (!projectDirsResult.success) {
        return Err(
          'Failed to read project directories',
          projectDirsResult.error
        );
      }
      const projectDirs = projectDirsResult.value;
      
      for (const projDir of projectDirs) {
        const projPath = path.join(projectsDir, projDir);
        const filesResult = await ResultUtils.fromPromise(fs.readdir(projPath));
        if (!filesResult.success) {
          continue; // Skip directories we can't read
        }
        const files = filesResult.value;
        
        if (files.some((f: string) => f.startsWith(sessionId))) {
          return Ok(PathUtils.guessPathFromFlattenedName(projDir));
        }
      }
      
      return Ok(null);
  }
}
