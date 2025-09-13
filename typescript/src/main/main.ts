import electron from 'electron';
const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = electron;
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { watch } from 'node:fs';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import type { BrowserWindow as BrowserWindowType } from 'electron';
import { setupMenu } from './menu/setupMenu.js';
import { showHelp as showHelpDialog } from './menu/showHelp.js';
import { takeScreenshot } from './utils/screenshot.js';
import { setupFileWatching as setupFileWatchingExt, cleanupFileWatchers as cleanupFileWatchersExt } from './watchers/fileWatchers.js';
import { TodoManager } from '../utils/TodoManager.js';
import { Result, AsyncResult, Ok, Err, ResultUtils } from '../utils/Result.js';
import { PathUtils } from '../utils/PathUtils.js';
import { registerProjectsIpc } from './ipc/projects.js';
import { registerTodoIpc } from './ipc/todos.js';
import { registerFileIpc } from './ipc/files.js';
import { registerChatIpc } from './ipc/chat.js';

let mainWindow: BrowserWindowType | null = null;

// Paths to Claude directories
const claudeDir = path.join(os.homedir(), '.claude');
const todosDir = path.join(claudeDir, 'todos');
const projectsDir = path.join(claudeDir, 'projects');
const logsDir = path.join(claudeDir, 'logs');

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
  flattenedDir?: string; // The original flattened directory name
  pathExists?: boolean;  // Whether the reconstructed path actually exists
}

// Convert flattened path back to real path - BEST EFFORT
// Claude flattens paths inconsistently, making it impossible to perfectly reverse
// For display purposes, we'll make a best guess
function convertFlattenedPath(flatPath: string): string {
  // Use the shared PathUtils for consistent path reconstruction
  return PathUtils.guessPathFromFlattenedName(flatPath);
}

// Find project path for a session ID
async function findProjectForSession(sessionId: string): AsyncResult<string | null> {
  // Use the shared PathUtils for consistent path handling
  return await PathUtils.findProjectForSession(sessionId);
}

// Result type for path reconstruction
interface PathReconstructionResult {
  path: string | null;
  flattenedDir?: string;
  reconstructionAttempt?: string;
  failureReason?: string;
}

// Get real project path from metadata or session files
async function getRealProjectPath(sessionId: string): AsyncResult<PathReconstructionResult> {
  // Use the shared PathUtils for consistent path handling
  return await PathUtils.getRealProjectPath(sessionId);
}

// These functions are now handled by PathUtils - keeping stubs for compatibility
// Validate if a path exists on the filesystem
function validatePath(testPath: string): boolean {
  const result = PathUtils.validatePath(testPath);
  return result.success ? result.value : false;
}

// Best-effort conversion of flattened path
function guessPathFromFlattenedName(flatPath: string): string {
  return PathUtils.guessPathFromFlattenedName(flatPath);
}

// Create or update project metadata
async function saveProjectMetadata(flattenedPath: string, realPath: string): AsyncResult<void> {
  // Use the shared PathUtils for consistent metadata handling
  return await PathUtils.saveProjectMetadata(flattenedPath, realPath);
}

// Load all todos data
async function loadTodosData(): AsyncResult<Project[]> {
  const projects = new Map<string, Project>();
  const logPath = path.join(process.cwd(), 'project.load.log');
  const logEntries: string[] = [];
  const timestamp = new Date().toISOString();
  
  logEntries.push(`=== Project Load Log - ${timestamp} ===`);
  logEntries.push(`Working Directory: ${process.cwd()}`);
  logEntries.push(`Projects Directory: ${projectsDir}`);
  logEntries.push('');
  
  // First, validate all project directories can be reconstructed
  const projectDirsResult = await ResultUtils.fromPromise(fs.readdir(projectsDir));
  if (projectDirsResult.success) {
    const projectDirsList = projectDirsResult.value;
    logEntries.push(`Found ${projectDirsList.length} flattened project directories:`);
    logEntries.push('');
    
    for (const flatDir of projectDirsList) {
      const reconstructed = guessPathFromFlattenedName(flatDir);
      const exists = validatePath(reconstructed);
      if (exists) {
        logEntries.push(`\u2713 ${flatDir} -> ${reconstructed}`);
      } else {
        logEntries.push(`\u2717 ${flatDir} -> ${reconstructed} [DOES NOT EXIST]`);
      }
    }
    logEntries.push('');
    logEntries.push('--- Session Processing ---');
    logEntries.push('');
  } else {
    logEntries.push(`Error scanning project directories: ${projectDirsResult.error}`);
  }
  
  // Simple directory-based approach: Process each project directory
  const projectDirsListResult = await ResultUtils.fromPromise(fs.readdir(projectsDir));
  if (!projectDirsListResult.success) {
    logEntries.push(`Error reading project directories: ${projectDirsListResult.error}`);
    return Err(`Failed to read project directories: ${projectDirsListResult.error}`);
  }
  
  const projectDirsList = projectDirsListResult.value;
  
  for (const flatDir of projectDirsList) {
    const projectDirPath = path.join(projectsDir, flatDir);
    const projectFilesResult = await ResultUtils.fromPromise(fs.readdir(projectDirPath));
    if (!projectFilesResult.success) {
      logEntries.push(`Error reading project directory ${flatDir}: ${projectFilesResult.error}`);
      continue; // Skip this project directory
    }
    const projectFiles = projectFilesResult.value;
        
        // Reconstruct the real project path and check if it exists
        const reconstructedPath = guessPathFromFlattenedName(flatDir);
        const pathExists = validatePath(reconstructedPath);
        
        // Look for .session_*.json files only (JSONL files are for History view, not Projects pane)
        const sessionFiles = projectFiles.filter(file => file.match(/^\.session_.+\.json$/));
        
        const status = pathExists ? '✅' : '⚠️';
        logEntries.push(`Processing project: ${flatDir} -> ${reconstructedPath} ${status}`);
        
        // Determine most recent date from session files only
        let mostRecentDate = new Date(0);
        for (const file of sessionFiles) {
          const filePath = path.join(projectDirPath, file);
          const statsResult = await ResultUtils.fromPromise(fs.stat(filePath));
          if (statsResult.success && statsResult.value.mtime > mostRecentDate) {
            mostRecentDate = statsResult.value.mtime;
          }
          // Ignore file stat errors, continue with next file
        }
        
        // ALWAYS create the project - this is the key change!
        projects.set(reconstructedPath, {
          path: reconstructedPath,
          sessions: [],
          mostRecentTodoDate: mostRecentDate,
          flattenedDir: flatDir,
          pathExists: pathExists
        });
        
        // If there are session files, we'll show this as "with sessions"
        // Otherwise it will show as "empty" but still be visible
        
        // Process session files only (JSONL files are for History view)
        if (sessionFiles.length > 0) {
          // Process each session file
          for (const dataFile of sessionFiles) {
            const dataFilePath = path.join(projectDirPath, dataFile);
            const statsResult = await ResultUtils.fromPromise(fs.stat(dataFilePath));
            if (!statsResult.success) {
              logEntries.push(`  Error reading stats for ${dataFile}: ${statsResult.error}`);
              continue;
            }
            const stats = statsResult.value;
            
            const contentResult = await ResultUtils.fromPromise(fs.readFile(dataFilePath, 'utf-8'));
            if (!contentResult.success) {
              logEntries.push(`  Error reading file ${dataFile}: ${contentResult.error}`);
              continue;
            }
            const content = contentResult.value;
            
            // Handle session JSON files only
            let todos: Todo[] = [];
            let sessionId: string = '';
            let actualProjectPath: string = reconstructedPath;
            
            // Process .session_*.json files only
            const parseResult = await ResultUtils.fromPromise(Promise.resolve(JSON.parse(content)));
            if (!parseResult.success) {
              logEntries.push(`  Error parsing JSON in ${dataFile}: ${parseResult.error}`);
              continue;
            }
            const sessionData = parseResult.value;
              
              if (Array.isArray(sessionData)) {
                // Legacy format: direct array of todos
                todos = sessionData;
                const sessionMatch = dataFile.match(/^\.session_(.+)\.json$/);
                sessionId = sessionMatch ? sessionMatch[1] : dataFile;
              } else if (sessionData && typeof sessionData === 'object') {
                // New structured format
                todos = sessionData.todos || [];
                sessionId = sessionData.sessionId || sessionData.id || '';
                // Use project path from session data if available and valid
                if (sessionData.projectPath && validatePath(sessionData.projectPath)) {
                  actualProjectPath = sessionData.projectPath;
                }
                
                // Fallback: extract from filename
                if (!sessionId) {
                  const sessionMatch = dataFile.match(/^\.session_(.+)\.json$/);
                  sessionId = sessionMatch ? sessionMatch[1] : dataFile;
                }
              } else {
                continue; // Skip invalid session files
              }
              
              if (!Array.isArray(todos)) continue;
              
              logEntries.push(`  Found session: ${sessionId} with ${todos.length} todos`);
              
              // Get the project (it should already exist from the outer loop)
              let project = projects.get(actualProjectPath);
              
              // If the actual project path is different from reconstructed, we may need to move or create it
              if (!project) {
                // Check if we need to move from reconstructed path to actual path
                const reconstructedProject = projects.get(reconstructedPath);
                if (reconstructedProject && reconstructedProject.sessions.length === 0) {
                  // Move the empty project to the actual path
                  projects.delete(reconstructedPath);
                  reconstructedProject.path = actualProjectPath;
                  projects.set(actualProjectPath, reconstructedProject);
                  project = reconstructedProject;
                } else {
                  // Create a new project for the actual path
                  project = {
                    path: actualProjectPath,
                    sessions: [],
                    mostRecentTodoDate: new Date(0)
                  };
                  projects.set(actualProjectPath, project);
                }
              }
              
              // Track most recent todo date for the project
              if (!project.mostRecentTodoDate || stats.mtime > project.mostRecentTodoDate) {
                project.mostRecentTodoDate = stats.mtime;
              }
              
              project.sessions.push({
                id: sessionId,
                todos: todos,
                lastModified: stats.mtime,
                filePath: dataFilePath
              });
          }
        }
      }
  // End of project directory processing loop
    
  // Projects pane populated from directory structure only
  
  // LIVE VALIDATION: Check if we loaded all expected projects
  let expectedProjectCount = 0;
  let projectsWithSessions = 0;
  let emptyProjects = 0;
  
  const allProjectDirsResult = await ResultUtils.fromPromise(fs.readdir(projectsDir));
  if (allProjectDirsResult.success) {
    const allProjectDirs = allProjectDirsResult.value;
    expectedProjectCount = allProjectDirs.length;
    
    const loadedProjects = Array.from(projects.values());
    projectsWithSessions = loadedProjects.filter(p => p.sessions.length > 0).length;
    emptyProjects = loadedProjects.filter(p => p.sessions.length === 0).length;
    
    // VALIDATION ALERTS
    if (projects.size !== expectedProjectCount) {
      console.error(`🚨 PROJECT LOADING MISMATCH!`);
      console.error(`   Expected: ${expectedProjectCount} project directories`);
      console.error(`   Loaded: ${projects.size} projects`);
      console.error(`   Missing: ${expectedProjectCount - projects.size} projects`);
      
      // Find which directories weren't loaded
      const loadedPaths = new Set(loadedProjects.map(p => p.path));
      const missedDirs: string[] = [];
      
      for (const dir of allProjectDirs) {
        const reconstructed = guessPathFromFlattenedName(dir);
        if (!loadedPaths.has(reconstructed)) {
          missedDirs.push(dir);
        }
      }
      
      if (missedDirs.length > 0) {
        console.error(`   Missed directories: ${missedDirs.join(', ')}`);
        logEntries.push('');
        logEntries.push(`🚨 VALIDATION FAILURE:`);
        logEntries.push(`Expected ${expectedProjectCount} projects, only loaded ${projects.size}`);
        logEntries.push(`Missed directories: ${missedDirs.join(', ')}`);
      }
    } else {
      console.log(`✅ PROJECT LOADING SUCCESS: Loaded all ${projects.size}/${expectedProjectCount} expected projects`);
    }
    
    if (emptyProjects > 0) {
      console.warn(`⚠️  ${emptyProjects} projects have no sessions (empty projects)`);
    }
    
    console.log(`📊 LOADING STATS: ${projectsWithSessions} with sessions, ${emptyProjects} empty, ${projects.size} total`);
  } else {
    console.error('Failed to validate project loading:', allProjectDirsResult.error);
  }
  
  // Write log file
  logEntries.push('');
  logEntries.push(`=== Summary ===`);
  logEntries.push(`Expected project directories: ${expectedProjectCount}`);
  logEntries.push(`Total projects loaded: ${projects.size}`);
  logEntries.push(`Projects with sessions: ${projectsWithSessions}`);
  logEntries.push(`Empty projects: ${emptyProjects}`);
  logEntries.push(`Loading success rate: ${((projects.size / expectedProjectCount) * 100).toFixed(1)}%`);
  logEntries.push(`Successful reconstructions: ${logEntries.filter(l => l.includes('✓ SUCCESS')).length}`);
  logEntries.push(`Failed reconstructions: ${logEntries.filter(l => l.includes('✗ FAILED')).length}`);
  
  const writeLogResult = await ResultUtils.fromPromise(
    fs.writeFile(logPath, logEntries.join('\n'), 'utf-8')
  );
  if (!writeLogResult.success) {
    console.error('Failed to write project load log:', writeLogResult.error);
  }
  
  return Ok(Array.from(projects.values()));
}

// takeScreenshot moved to src/main/utils/screenshot.ts

// showHelp moved to src/main/menu/showHelp.ts

// setupMenu moved to src/main/menu/setupMenu.ts

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'ClaudeToDo - Session Monitor',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    // Remove hiddenInset to show normal title bar
    // titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1d21',
    icon: path.join(__dirname, '../../assets/ClaudeLogo.png')
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow!.loadURL('http://localhost:5173');
    mainWindow!.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow!.loadFile(path.join(__dirname, '../renderer/index.html'));
    // TEMPORARILY open DevTools in production to debug
    mainWindow!.webContents.openDevTools();
  }

  mainWindow!.on('closed', () => {
    mainWindow = null;
  });
  
  // Set up streamlined application menu (moved to separate module)
  setupMenu({
    onShowHelp: () => {
      if (mainWindow) showHelpDialog(mainWindow);
    },
    onTakeScreenshot: () => {
      if (mainWindow) void takeScreenshot(mainWindow);
    },
  });
}

// File watching moved to src/main/watchers/fileWatchers.ts
let fileWatchers: fsSync.FSWatcher[] = [];

// Single instance lock - prevent multiple instances from running
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.error('[SingleInstance] Another instance is already running. Exiting...');
  app.quit();
} else {
  // Handle when second instance is attempted
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('[SingleInstance] Second instance attempted, focusing existing window');
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  // Register IPC handlers via modules
  registerProjectsIpc(ipcMain, { projectsDir, logsDir });
  registerTodoIpc(ipcMain);
  registerFileIpc(ipcMain);
  registerChatIpc(ipcMain);
  
  createWindow();
  
  // Set up file watching after window is created
  if (mainWindow) {
    fileWatchers = setupFileWatchingExt(mainWindow, {
      projectsDir,
      todosDir,
      logsDir,
    });
  }

  // Take a screenshot after a longer delay for debugging to let app fully load
  setTimeout(async () => {
    console.log('Taking automatic screenshot for debugging...');
    if (mainWindow) {
      await takeScreenshot(mainWindow);
    }
  }, 8000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      if (mainWindow) {
        fileWatchers = setupFileWatchingExt(mainWindow, { projectsDir, todosDir, logsDir });
      }
    }
  });
});

app.on('window-all-closed', () => {
  cleanupFileWatchersExt(fileWatchers);
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  cleanupFileWatchersExt(fileWatchers);
});
