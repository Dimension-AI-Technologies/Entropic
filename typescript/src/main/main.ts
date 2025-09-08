import electron from 'electron';
const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = electron;
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import type { BrowserWindow as BrowserWindowType } from 'electron';
import { TodoManager } from '../utils/TodoManager.js';
import { ResultUtils } from '../utils/Result.js';
import { PathUtils } from '../utils/PathUtils.js';

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
}

// Convert flattened path back to real path - BEST EFFORT
// Claude flattens paths inconsistently, making it impossible to perfectly reverse
// For display purposes, we'll make a best guess
function convertFlattenedPath(flatPath: string): string {
  // Use the shared PathUtils for consistent path reconstruction
  return PathUtils.guessPathFromFlattenedName(flatPath);
}

// Find project path for a session ID
async function findProjectForSession(sessionId: string): Promise<string | null> {
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
async function getRealProjectPath(sessionId: string): Promise<PathReconstructionResult> {
  // Use the shared PathUtils for consistent path handling
  return await PathUtils.getRealProjectPath(sessionId);
}

// These functions are now handled by PathUtils - keeping stubs for compatibility
// Validate if a path exists on the filesystem
function validatePath(testPath: string): boolean {
  return PathUtils.validatePath(testPath);
}

// Best-effort conversion of flattened path
function guessPathFromFlattenedName(flatPath: string): string {
  return PathUtils.guessPathFromFlattenedName(flatPath);
}

// Create or update project metadata
async function saveProjectMetadata(flattenedPath: string, realPath: string): Promise<void> {
  // Use the shared PathUtils for consistent metadata handling
  return await PathUtils.saveProjectMetadata(flattenedPath, realPath);
}

// Load all todos data
async function loadTodosData(): Promise<Project[]> {
  const projects = new Map<string, Project>();
  const logPath = path.join(process.cwd(), 'project.load.log');
  const logEntries: string[] = [];
  const timestamp = new Date().toISOString();
  
  logEntries.push(`=== Project Load Log - ${timestamp} ===`);
  logEntries.push(`Working Directory: ${process.cwd()}`);
  logEntries.push(`Projects Directory: ${projectsDir}`);
  logEntries.push('');
  
  // First, validate all project directories can be reconstructed
  try {
    const projectDirsList = await fs.readdir(projectsDir);
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
  } catch (error) {
    logEntries.push(`Error scanning project directories: ${error}`);
  }
  
  try {
    // Read all todo files
    const todoFiles = await fs.readdir(todosDir);
    
    for (const file of todoFiles) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const filePath = path.join(todosDir, file);
        const stats = await fs.stat(filePath);
        
        const content = await fs.readFile(filePath, 'utf-8');
        const todos = JSON.parse(content);
        
        // Include empty sessions too - they might have completed todos
        if (!Array.isArray(todos)) continue;
        
        // Extract session ID
        const sessionMatch = file.match(/^([a-f0-9-]+)-agent/);
        const fullSessionId = sessionMatch ? sessionMatch[1] : 'unknown';
        const sessionId = fullSessionId.substring(0, 8);
        
        // Try to get project path from the todo file itself first
        let projectPath = 'Unknown Project';
        
        // Check if the todo file contains project information
        // Some newer Claude sessions might store this
        if (typeof content === 'string') {
          try {
            // Try parsing the raw content to see if there's metadata
            const lines = content.split('\n');
            for (const line of lines.slice(0, 5)) { // Check first few lines
              if (line.includes('project_path') || line.includes('projectPath')) {
                const match = line.match(/"project_path"\s*:\s*"([^"]+)"|"projectPath"\s*:\s*"([^"]+)"/);
                if (match) {
                  projectPath = match[1] || match[2];
                  // console.log(`Found project path in todo file: ${projectPath}`);
                  break;
                }
              }
            }
          } catch {
            // Ignore parsing errors
          }
        }
        
        // If we didn't find it in the file, try the project directories
        if (projectPath === 'Unknown Project') {
          const result = await getRealProjectPath(fullSessionId);
          if (result.path && result.path !== 'Unknown Project') {
            projectPath = result.path;
            logEntries.push(`✓ SUCCESS: Session ${sessionId} -> ${result.path}`);
            // Save metadata for future use if we found the path
            if (result.flattenedDir) {
              await saveProjectMetadata(result.flattenedDir, result.path);
            }
          } else {
            projectPath = 'Unknown Project';
            // Detailed failure logging
            let failureDetails = `✗ FAILED: Session ${sessionId}`;
            if (result.flattenedDir) {
              failureDetails += `\n    Flattened dir: ${result.flattenedDir}`;
            }
            if (result.reconstructionAttempt) {
              failureDetails += `\n    Attempted path: ${result.reconstructionAttempt}`;
            }
            if (result.failureReason) {
              failureDetails += `\n    Reason: ${result.failureReason}`;
            }
            logEntries.push(failureDetails);
          }
        }
        
        // Get or create project
        if (!projects.has(projectPath)) {
          projects.set(projectPath, {
            path: projectPath,
            sessions: [],
            mostRecentTodoDate: stats.mtime
          });
        }
        
        const project = projects.get(projectPath)!;
        
        // Track most recent todo date for the project
        if (!project.mostRecentTodoDate || stats.mtime > project.mostRecentTodoDate) {
          project.mostRecentTodoDate = stats.mtime;
        }
        
        project.sessions.push({
          id: sessionId,
          todos: todos,
          lastModified: stats.mtime,
          filePath: filePath
        });
        
      } catch (error) {
        console.error(`Error reading ${file}:`, error);
      }
    }
    
    // Also check current_todos.json
    try {
      const currentTodosPath = path.join(logsDir, 'current_todos.json');
      const content = await fs.readFile(currentTodosPath, 'utf-8');
      const data = JSON.parse(content);
      
      if (data.todos && Array.isArray(data.todos)) {
        const sessionId = data.session_id ? data.session_id.substring(0, 8) : 'current';
        // Use the project path from the file if available
        let projectPath = data.project_path || data.projectPath;
        
        // If no project path, use the current working directory
        if (!projectPath) {
          const cwd = process.cwd();
          projectPath = cwd;
          // console.log('Using current working directory:', projectPath);
        }
        
        // console.log(`Current session project path: ${projectPath}`);
        
        if (!projects.has(projectPath)) {
          projects.set(projectPath, {
            path: projectPath,
            sessions: [],
            mostRecentTodoDate: new Date()
          });
        }
        
        const project = projects.get(projectPath)!;
        const currentDate = new Date();
        
        // Track most recent todo date for the project
        if (!project.mostRecentTodoDate || currentDate > project.mostRecentTodoDate) {
          project.mostRecentTodoDate = currentDate;
        }
        
        project.sessions.push({
          id: sessionId,
          todos: data.todos,
          lastModified: currentDate
        });
      }
    } catch (error) {
      // Current todos file might not exist
    }
    
  } catch (error) {
    console.error('Error loading todos:', error);
  }
  
  // Write log file
  try {
    logEntries.push('');
    logEntries.push(`=== Summary ===`);
    logEntries.push(`Total projects: ${projects.size}`);
    logEntries.push(`Successful reconstructions: ${logEntries.filter(l => l.includes('✓ SUCCESS')).length}`);
    logEntries.push(`Failed reconstructions: ${logEntries.filter(l => l.includes('✗ FAILED')).length}`);
    
    await fs.writeFile(logPath, logEntries.join('\n'), 'utf-8');
    // console.log(`Project load log written to: ${logPath}`);
  } catch (error) {
    console.error('Failed to write project load log:', error);
  }
  
  return Array.from(projects.values());
}

async function takeScreenshot() {
  if (!mainWindow) return;
  
  try {
    const image = await mainWindow.webContents.capturePage();
    const buffer = image.toPNG();
    
    // Save to a timestamped file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const screenshotPath = path.join(os.tmpdir(), `todo-app-${timestamp}.png`);
    
    await fs.writeFile(screenshotPath, buffer);
    
    // Show success dialog with path
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Screenshot Saved',
      message: 'Screenshot saved successfully',
      detail: `Saved to: ${screenshotPath}`,
      buttons: ['OK']
    });
    
    console.log(`Screenshot saved to: ${screenshotPath}`);
  } catch (error) {
    console.error('Failed to take screenshot:', error);
    dialog.showErrorBox('Screenshot Failed', 'Failed to capture screenshot');
  }
}

function showHelp() {
  const helpContent = `
ClaudeToDo Help

WHAT THIS DOES
Monitor todo lists from Claude Code sessions. View todos by project. Track progress.

INTERFACE
• Left pane: Projects (folders where you used Claude Code)
• Right pane: Sessions (Claude conversations) and their todos
• Status icons: ● pending, ◐ in progress, ● completed

NAVIGATION  
• Click projects to switch between them
• Click sessions to view their todos
• Most recent project/session loads automatically

CONTROLS
• Edit todos: Double-click any todo text
• Move todos: Drag and drop to reorder
• Select multiple: Ctrl/Cmd+click, Shift+click for ranges
• Delete todos: Select and press Delete key
• Keyboard shortcuts work as expected

SORTING & FILTERING
• Sort projects: Alphabetical, by recent activity, by todo count
• Filter todos: Show all, pending only, or active only
• Adjust spacing: Normal, compact, or minimal padding

SESSION MANAGEMENT
• Merge sessions: Ctrl/Cmd+click multiple tabs, right-click → Merge
• Delete sessions: Right-click tab → Delete
• Failed reconstructions show when session files can't be found

ACTIVITY MODE
• Toggle Activity Mode button for live updates
• Auto-focuses newest session changes
• Polls for updates when enabled

TECHNICAL
• Data source: ~/.claude/todos/ folder (Claude Code session files)
• Project mapping: Attempts to match sessions to project directories
• File operations: Read-only monitoring, safe to delete files externally

That's it. No features you don't need.`;

  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'ClaudeToDo Help',
    message: 'ClaudeToDo Help',
    detail: helpContent,
    buttons: ['Close'],
    defaultId: 0
  });
}

function setupMenu() {
  const isMac = process.platform === 'darwin';
  
  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS app menu
    ...(isMac ? [{
      label: app.getName(),
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const }
      ]
    }] : []),
    
    // File menu (minimal)
    {
      label: 'File',
      submenu: [
        {
          label: 'Refresh Projects',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow?.webContents.reload();
          }
        },
        { type: 'separator' as const },
        isMac ? { role: 'close' as const } : { role: 'quit' as const }
      ]
    },
    
    // Edit menu (essential only)
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const }
      ]
    },
    
    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        {
          label: 'Take Screenshot',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => takeScreenshot()
        },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const }
      ]
    },
    
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
          { type: 'separator' as const },
          { role: 'window' as const }
        ] : [
          { role: 'close' as const }
        ])
      ]
    },
    
    // Help menu
    {
      role: 'help',
      submenu: [
        {
          label: 'ClaudeToDo Help',
          accelerator: 'F1',
          click: showHelp
        },
        { type: 'separator' as const },
        {
          label: 'Claude Code',
          click: () => {
            shell.openExternal('https://claude.ai/code');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

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
    icon: path.join(__dirname, '../../assets/icon.png')
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
  
  // Set up streamlined application menu
  setupMenu();
}

app.whenReady().then(() => {
  // Handle IPC requests for todos data
  ipcMain.handle('get-todos', async () => {
    console.log('[IPC] get-todos called');
    const result = await loadTodosData();
    console.log('[IPC] Returning', result.length, 'projects');
    return result;
  });

  // Handle screenshot request
  ipcMain.handle('take-screenshot', async () => {
    console.log('[IPC] take-screenshot called');
    await takeScreenshot();
    return true;
  });
  
  // Handle save todos request using TodoManager
  ipcMain.handle('save-todos', async (event: any, filePath: string, todos: Todo[]) => {
    // Using imported TodoManager and ResultUtils
    
    const manager = new TodoManager(filePath);
    const result = await manager.writeTodos(todos);
    
    if (ResultUtils.isSuccess(result)) {
      return true;
    } else {
      console.error('Error saving todos:', result.error);
      return false;
    }
  });
  
  // Handle delete todo file request using TodoManager
  ipcMain.handle('delete-todo-file', async (event: any, filePath: string) => {
    // Using imported TodoManager and ResultUtils
    
    const manager = new TodoManager(filePath);
    const result = await manager.deleteFile();
    
    if (ResultUtils.isSuccess(result)) {
      return true;
    } else {
      console.error('Error deleting todo file:', result.error);
      return false;
    }
  });
  
  // Handle get project prompts request
  ipcMain.handle('get-project-prompts', async (event: any, projectPath: string) => {
    try {
      console.log(`Getting project prompts for: ${projectPath}`);
      
      // Use the shared PathUtils to find the project directory
      // This ensures we use the same logic as todo loading for consistent results
      const result = await PathUtils.findProjectDirectory(projectPath);
      
      if (!result.found || !result.projectDir) {
        console.log(`No project directory found for: ${projectPath}`);
        return [];
      }
      
      const projectDir = result.projectDir;
      console.log(`Found project directory: ${projectDir}`);
      
      console.log(`Looking for JSONL files in: ${projectDir}`);
      
      // Get all JSONL files in the project directory
      const files = await fs.readdir(projectDir);
      const jsonlFiles = files.filter(file => file.endsWith('.jsonl')).sort();
      
      console.log(`Found ${jsonlFiles.length} JSONL files`);
      
      const prompts: any[] = [];
      let totalLines = 0;
      
      // Process ALL files to get complete history
      for (let i = 0; i < jsonlFiles.length; i++) {
        const file = jsonlFiles[i];
        const filePath = path.join(projectDir, file);
        
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.split('\n').filter(line => line.trim());
          totalLines += lines.length;
          
          // Process all lines in the file
          for (let j = 0; j < lines.length; j++) {
            const line = lines[j];
            try {
              const entry = JSON.parse(line);
              
              // Include both user and assistant messages
              if ((entry.type === 'user' && entry.message?.role === 'user') ||
                  (entry.type === 'assistant' && entry.message?.role === 'assistant')) {
                prompts.push({
                  timestamp: entry.timestamp || new Date().toISOString(),
                  message: {
                    role: entry.message.role,
                    content: entry.message.content ? 
                      (entry.message.content.length > 1000 ? 
                        entry.message.content.substring(0, 1000) + '...' : 
                        entry.message.content) : ''
                  },
                  sessionId: entry.sessionId || 'unknown',
                  uuid: entry.uuid || `${file}-${j}-${Date.now()}`
                });
              }
            } catch (parseError) {
              // Skip invalid lines silently
            }
          }
        } catch (fileError) {
          console.error(`Error reading file ${file}:`, fileError);
        }
      }
      
      console.log(`Extracted ${prompts.length} prompts from ${totalLines} total lines`);
      
      
      return prompts;
      
    } catch (error) {
      console.error('Error getting project prompts:', error);
      return [];
    }
  });
  
  createWindow();

  // Take a screenshot after a longer delay for debugging to let app fully load
  setTimeout(async () => {
    console.log('Taking automatic screenshot for debugging...');
    await takeScreenshot();
  }, 8000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});