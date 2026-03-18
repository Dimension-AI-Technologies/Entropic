import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { describe, it, expect, beforeAll } from '@jest/globals';
import { Result, AsyncResult, Ok, Err, ResultUtils } from '../utils/Result.js';

// Import the loadTodosData function (we'll need to export it from main.ts)
// For now, we'll create a mock implementation to test the concept

interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
  id?: string;
  created?: Date;
}

interface Session {
  id: string;
  todos: Todo[];
  lastModified: Date;
  created?: Date;
  filePath?: string;
}

interface Project {
  path: string;
  sessions: Session[];
  mostRecentTodoDate?: Date;
}

const claudeDir = path.join(os.homedir(), '.claude');
const projectsDir = path.join(claudeDir, 'projects');

describe('Project Loading', () => {
  let expectedProjectCount: number;
  let actualProjects: Project[];

  beforeAll(async () => {
    // Count expected projects (folders in ~/.claude/projects)
    const projectDirsResult = await ResultUtils.fromPromise(fs.readdir(projectsDir));
    if (projectDirsResult.success) {
      expectedProjectCount = projectDirsResult.value.length;
    } else {
      expectedProjectCount = 0;
      console.warn('Could not read projects directory:', projectDirsResult.error);
    }
  });

  it('should load the same number of projects as folders in ~/.claude/projects', async () => {
    // This is a placeholder - we'll need to import the actual loadTodosData function
    console.log(`Expected project folders: ${expectedProjectCount}`);
    
    // For now, simulate the loading
    const result = await loadProjectsForTesting();
    if (result.success) {
      actualProjects = result.value;
      console.log(`Actually loaded projects: ${result.value.length}`);
    } else {
      actualProjects = [];
      console.error(`Failed to load projects: ${result.error}`);
    }
    console.log('Loaded project paths:');
    actualProjects.forEach(p => console.log(`  - ${p.path}`));
    
    // The test assertion
    expect(actualProjects.length).toBe(expectedProjectCount);
  });

  it('should load projects with sessions and todos', async () => {
    if (actualProjects.length > 0) {
      // At least some projects should have sessions
      const projectsWithSessions = actualProjects.filter(p => p.sessions.length > 0);
      console.log(`Projects with sessions: ${projectsWithSessions.length}/${actualProjects.length}`);
      
      expect(projectsWithSessions.length).toBeGreaterThan(0);
      
      // At least some sessions should have todos
      const sessionsWithTodos = actualProjects.flatMap(p => p.sessions).filter(s => s.todos.length > 0);
      console.log(`Sessions with todos: ${sessionsWithTodos.length}`);
      
      expect(sessionsWithTodos.length).toBeGreaterThan(0);
    }
  });

  it('should report detailed loading statistics', async () => {
    console.log('\n=== PROJECT LOADING STATISTICS ===');
    console.log(`Expected project directories: ${expectedProjectCount}`);
    console.log(`Actually loaded projects: ${actualProjects.length}`);
    console.log(`Loading success rate: ${((actualProjects.length / expectedProjectCount) * 100).toFixed(1)}%`);
    
    console.log('\nProject breakdown:');
    actualProjects.forEach(project => {
      const sessionCount = project.sessions.length;
      const todoCount = project.sessions.reduce((total, s) => total + s.todos.length, 0);
      console.log(`  ${project.path}: ${sessionCount} sessions, ${todoCount} todos`);
    });
    
    const missedCount = expectedProjectCount - actualProjects.length;
    if (missedCount > 0) {
      console.log(`\n⚠️  MISSING: ${missedCount} project directories were not loaded!`);
    }
  });
});

// Temporary test implementation - we'll replace this with the actual function
async function loadProjectsForTesting(): AsyncResult<Project[]> {
  const projects = new Map<string, Project>();
  const projectDirsListResult = await ResultUtils.fromPromise(fs.readdir(projectsDir));
  
  if (!projectDirsListResult.success) {
    return Err(
      'Failed to read projects directory',
      projectDirsListResult.error
    );
  }
  
  const projectDirsList = projectDirsListResult.value;
    
    for (const flatDir of projectDirsList) {
        const projectDirPath = path.join(projectsDir, flatDir);
        const projectFilesResult = await ResultUtils.fromPromise(fs.readdir(projectDirPath));
        
        if (!projectFilesResult.success) {
          console.error(`Error processing project directory ${flatDir}:`, projectFilesResult.error);
          continue; // Skip this directory
        }
        
        const projectFiles = projectFilesResult.value;
        
        // Look for .session_*.json files
        const sessionFiles = projectFiles.filter(file => file.match(/^\.session_.+\.json$/));
        
        if (sessionFiles.length > 0) {
          // Simple path reconstruction for testing
          const reconstructedPath = flatDir.replace(/-/g, '/').replace(/^\//, '');
          const actualPath = reconstructedPath.startsWith('Users') ? `/${reconstructedPath}` : reconstructedPath;
          
          if (!projects.has(actualPath)) {
            projects.set(actualPath, {
              path: actualPath,
              sessions: [],
              mostRecentTodoDate: new Date(0)
            });
          }
          
          const project = projects.get(actualPath)!;
          
          // Process each session file
          for (const sessionFile of sessionFiles) {
              const sessionFilePath = path.join(projectDirPath, sessionFile);
              
              const statsResult = await ResultUtils.fromPromise(fs.stat(sessionFilePath));
              if (!statsResult.success) {
                console.error(`Error reading session file stats ${sessionFile}:`, statsResult.error);
                continue;
              }
              const stats = statsResult.value;
              
              const contentResult = await ResultUtils.fromPromise(fs.readFile(sessionFilePath, 'utf-8'));
              if (!contentResult.success) {
                console.error(`Error reading session file ${sessionFile}:`, contentResult.error);
                continue;
              }
              const content = contentResult.value;
              
              const parseResult = await ResultUtils.fromPromise(Promise.resolve(JSON.parse(content)));
              if (!parseResult.success) {
                console.error(`Error parsing session file ${sessionFile}:`, parseResult.error);
                continue;
              }
              const sessionData = parseResult.value;
              
              // Handle different session file formats
              let todos: Todo[] = [];
              let sessionId: string = '';
              let sessionActualPath = actualPath;
              
              if (Array.isArray(sessionData)) {
                todos = sessionData;
                const sessionMatch = sessionFile.match(/^\.session_(.+)\.json$/);
                sessionId = sessionMatch ? sessionMatch[1] : sessionFile;
              } else if (sessionData && typeof sessionData === 'object') {
                todos = sessionData.todos || [];
                sessionId = sessionData.sessionId || sessionData.id || '';
                if (sessionData.projectPath) {
                  sessionActualPath = sessionData.projectPath;
                }
                
                if (!sessionId) {
                  const sessionMatch = sessionFile.match(/^\.session_(.+)\.json$/);
                  sessionId = sessionMatch ? sessionMatch[1] : sessionFile;
                }
              }
              
              if (!Array.isArray(todos)) continue;
              
              // Update project path if we found a better one
              if (sessionActualPath !== actualPath && !projects.has(sessionActualPath)) {
                const updatedProject = projects.get(actualPath)!;
                projects.delete(actualPath);
                updatedProject.path = sessionActualPath;
                projects.set(sessionActualPath, updatedProject);
                project.path = sessionActualPath;
              }
              
              const finalProject = projects.get(sessionActualPath) || project;
              
              if (!finalProject.mostRecentTodoDate || stats.mtime > finalProject.mostRecentTodoDate) {
                finalProject.mostRecentTodoDate = stats.mtime;
              }
              
              finalProject.sessions.push({
                id: sessionId,
                todos: todos,
                lastModified: stats.mtime,
                filePath: sessionFilePath
              });
              
          }
        } else {
          // Project directory with no session files - still count it
          const reconstructedPath = flatDir.replace(/-/g, '/').replace(/^\//, '');
          const actualPath = reconstructedPath.startsWith('Users') ? `/${reconstructedPath}` : reconstructedPath;
          
          if (!projects.has(actualPath)) {
            projects.set(actualPath, {
              path: actualPath,
              sessions: [],
              mostRecentTodoDate: new Date(0)
            });
          }
        }
    }
    
    return Ok(Array.from(projects.values()));
}