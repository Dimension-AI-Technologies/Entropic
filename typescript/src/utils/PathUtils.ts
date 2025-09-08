import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';

const projectsDir = path.join(os.homedir(), '.claude', 'projects');

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
   * Create a simple flattened path by replacing path separators with dashes
   * This is the most basic flattening approach that both systems should use as fallback
   */
  static createFlattenedPath(realPath: string): string {
    return realPath.replace(/[/\\]/g, '-');
  }
  
  /**
   * Find the project directory for a given real path
   * First tries to find via metadata, then via flattened path
   */
  static async findProjectDirectory(realPath: string): Promise<ProjectDirFindResult> {
    try {
      const projectDirsList = await fs.readdir(projectsDir);
      
      // First, look for a project directory with metadata matching this path
      for (const flatDir of projectDirsList) {
        const metadataPath = path.join(projectsDir, flatDir, 'metadata.json');
        try {
          if (fsSync.existsSync(metadataPath)) {
            const metadata = fsSync.readFileSync(metadataPath, 'utf-8');
            const data = JSON.parse(metadata);
            if (data.path === realPath) {
              return {
                projectDir: path.join(projectsDir, flatDir),
                found: true
              };
            }
          }
        } catch (e) {
          // Ignore metadata read errors, continue searching
        }
      }
      
      // If not found via metadata, try the flattened path approach
      const flattenedPath = PathUtils.createFlattenedPath(realPath);
      const testDir = path.join(projectsDir, flattenedPath);
      
      if (fsSync.existsSync(testDir)) {
        return {
          projectDir: testDir,
          found: true
        };
      }
      
      // If still not found, try parent directories (for subdirectory paths)
      // This handles cases like /path/to/project/typescript where todos are at /path/to/project
      const parentPath = path.dirname(realPath);
      if (parentPath && parentPath !== realPath && parentPath !== '/' && parentPath !== '.') {
        // Try to find parent project recursively
        const parentResult = await PathUtils.findProjectDirectory(parentPath);
        if (parentResult.found) {
          console.log(`Found parent project for ${realPath} at ${parentResult.projectDir}`);
          return parentResult;
        }
      }
      
      return { projectDir: null, found: false };
      
    } catch (error) {
      console.error('Error finding project directory:', error);
      return { projectDir: null, found: false };
    }
  }
  
  /**
   * Validate if a path exists on the filesystem
   */
  static validatePath(testPath: string): boolean {
    try {
      return fsSync.existsSync(testPath);
    } catch {
      return false;
    }
  }
  
  /**
   * List directory contents safely
   */
  static listDirectory(dirPath: string): string[] {
    try {
      return fsSync.readdirSync(dirPath);
    } catch (error) {
      return [];
    }
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
      const dirContents = PathUtils.listDirectory(currentPath);
      if (dirContents.length === 0) {
        break;
      }
      
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
    try {
      const metadataPath = path.join(projectsDir, flatPath, 'metadata.json');
      if (fsSync.existsSync(metadataPath)) {
        const metadata = fsSync.readFileSync(metadataPath, 'utf-8');
        const data = JSON.parse(metadata);
        if (data.path) {
          return data.path;
        }
      }
    } catch (error) {
      // No metadata, continue with reconstruction
    }
    
    // Windows path with drive letter (e.g., C--Users-mathew-burkitt-Source-repos-DT-cc-todo-hook-tracker)
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
      
      if (validatedPath && PathUtils.validatePath(validatedPath)) {
        return validatedPath;
      } else {
        return validatedPath || flatPath;
      }
    }
    
    // Unix absolute path
    if (flatPath.startsWith('-')) {
      const unixParts = flatPath.slice(1).split('-');
      const validatedPath = PathUtils.buildAndValidatePath(unixParts, false);
      return validatedPath || ('/' + flatPath.slice(1).replace(/-/g, '/'));
    }
    
    // Return as-is if we can't figure it out
    return flatPath;
  }
  
  /**
   * Get real project path from metadata or session files (used for todos)
   * This is the complex reconstruction used in the loadTodosData function
   */
  static async getRealProjectPath(sessionId: string): Promise<PathReconstructionResult> {
    try {
      // First, check if there's a metadata file in the project directory
      const projectDirs = await fs.readdir(projectsDir);
      
      // Look for a project directory containing this session
      let matchedProjDir: string | null = null;
      for (const projDir of projectDirs) {
        const projPath = path.join(projectsDir, projDir);
        const files = await fs.readdir(projPath);
        
        // Check if this project contains our session
        if (files.some((f: string) => f.startsWith(sessionId))) {
          matchedProjDir = projDir;
          break;
        }
      }
      
      if (!matchedProjDir) {
        // No project directory found for this session
        return {
          path: null,
          failureReason: 'No project directory found containing session files'
        };
      }
      
      const projPath = path.join(projectsDir, matchedProjDir);
      const files = await fs.readdir(projPath);
      
      // Look for a metadata file
      const metadataPath = path.join(projPath, 'metadata.json');
      try {
        const metadata = await fs.readFile(metadataPath, 'utf-8');
        const data = JSON.parse(metadata);
        if (data.path) {
          return { path: data.path, flattenedDir: matchedProjDir };
        }
      } catch {
        // No metadata file, continue
      }
      
      // Try to read the actual path from a session file
      for (const file of files) {
        if (file.startsWith(sessionId) && file.endsWith('.json')) {
          try {
            const sessionPath = path.join(projPath, file);
            const sessionContent = await fs.readFile(sessionPath, 'utf-8');
            const sessionData = JSON.parse(sessionContent);
            if (sessionData.projectPath) {
              return { path: sessionData.projectPath, flattenedDir: matchedProjDir };
            }
          } catch {
            // Continue to next file
          }
        }
      }
      
      // Fallback: try to guess from the flattened directory name
      const reconstructedPath = PathUtils.guessPathFromFlattenedName(matchedProjDir);
      
      // Validate the path exists before returning
      if (reconstructedPath && PathUtils.validatePath(reconstructedPath)) {
        return { path: reconstructedPath, flattenedDir: matchedProjDir };
      } else {
        return {
          path: null,
          flattenedDir: matchedProjDir,
          reconstructionAttempt: reconstructedPath || 'Failed to generate path',
          failureReason: reconstructedPath ? 'Reconstructed path does not exist on filesystem' : 'Path reconstruction failed completely'
        };
      }
    } catch (error) {
      console.error('Error finding project path:', error);
      return {
        path: null,
        failureReason: `Error during path lookup: ${error}`
      };
    }
  }
  
  /**
   * Save project metadata for future lookups
   */
  static async saveProjectMetadata(flattenedPath: string, realPath: string): Promise<void> {
    try {
      const metadataPath = path.join(projectsDir, flattenedPath, 'metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify({ path: realPath }, null, 2));
    } catch (error) {
      // Ignore errors - metadata is best-effort
    }
  }
  
  /**
   * Find project path for a session ID (used in todos loading)
   */
  static async findProjectForSession(sessionId: string): Promise<string | null> {
    try {
      const projectDirs = await fs.readdir(projectsDir);
      
      for (const projDir of projectDirs) {
        const projPath = path.join(projectsDir, projDir);
        const files = await fs.readdir(projPath);
        
        if (files.some((f: string) => f.startsWith(sessionId))) {
          return PathUtils.guessPathFromFlattenedName(projDir);
        }
      }
    } catch (error) {
      console.error('Error finding project for session:', error);
    }
    
    return null;
  }
}