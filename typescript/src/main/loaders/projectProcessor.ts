import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { ResultUtils } from '../../utils/Result.js';
import { PathUtils } from '../../utils/PathUtils.js';
import { parseJsonSafe } from '../../utils/JsonUtils.js';
import type { Todo, Session } from '../../types/index.js';

interface ExtendedProject {
  path: string;
  sessions: Session[];
  mostRecentTodoDate?: Date;
  flattenedDir?: string;
  pathExists?: boolean;
  startDate?: Date;
  totalTodos?: number;
  activeTodos?: number;
}

/**
 * Process a single project directory and extract sessions
 */
export async function processProjectDirectory(
  flatDir: string,
  projectsDir: string,
  projects: Map<string, ExtendedProject>,
  logEntries: string[]
): Promise<void> {
  const projectDirPath = path.join(projectsDir, flatDir);
  const projectFilesResult = await ResultUtils.fromPromise(fs.readdir(projectDirPath));
  if (!projectFilesResult.success) {
    logEntries.push(`Error reading project directory ${flatDir}: ${projectFilesResult.error}`);
    return;
  }
  const projectFiles = projectFilesResult.value;

  const reconstructedPath = PathUtils.guessPathFromFlattenedName(flatDir);
  const validateResult = PathUtils.validatePath(reconstructedPath);
  const pathExists = validateResult.success ? validateResult.value : false;

  // Look for JSONL files with UUID names (Claude session files)
  const sessionFiles = projectFiles.filter((file) => file.match(/^[a-f0-9-]+\.jsonl$/));

  const status = pathExists ? '✅' : '⚠️';
  logEntries.push(`Processing project: ${flatDir} -> ${reconstructedPath} ${status}`);

  // Capture directory stats as a fallback for dates
  const dirStatResult = await ResultUtils.fromPromise(fs.stat(projectDirPath));
  const dirBirth = dirStatResult.success ? dirStatResult.value.birthtime : new Date(0);
  const dirMtime = dirStatResult.success ? dirStatResult.value.mtime : new Date(0);

  let mostRecentDate = new Date(0);
  for (const file of sessionFiles) {
    const filePath = path.join(projectDirPath, file);
    const statsResult = await ResultUtils.fromPromise(fs.stat(filePath));
    if (statsResult.success && statsResult.value.mtime > mostRecentDate) {
      mostRecentDate = statsResult.value.mtime;
    }
  }

  projects.set(reconstructedPath, {
    path: reconstructedPath,
    sessions: [],
    mostRecentTodoDate: mostRecentDate.getTime() > 0 ? mostRecentDate : dirMtime,
    flattenedDir: flatDir,
    pathExists: pathExists,
    startDate: dirBirth.getTime() > 0 ? dirBirth : undefined,
  });

  // Backfill metadata.json with the real path for future lookups
  if (pathExists) {
    await writeProjectMetadata(projectDirPath, reconstructedPath, logEntries);
  }

  // Process session files
  for (const dataFile of sessionFiles) {
    await processSessionFile(
      dataFile,
      projectDirPath,
      reconstructedPath,
      projects,
      logEntries
    );
  }
}

/**
 * Process a single session JSONL file
 */
async function processSessionFile(
  dataFile: string,
  projectDirPath: string,
  reconstructedPath: string,
  projects: Map<string, ExtendedProject>,
  logEntries: string[]
): Promise<void> {
  const dataFilePath = path.join(projectDirPath, dataFile);
  const statsResult = await ResultUtils.fromPromise(fs.stat(dataFilePath));
  if (!statsResult.success) {
    logEntries.push(`  Error reading stats for ${dataFile}: ${statsResult.error}`);
    return;
  }
  const stats = statsResult.value;

  const contentResult = await ResultUtils.fromPromise(fs.readFile(dataFilePath, 'utf-8'));
  if (!contentResult.success) {
    logEntries.push(`  Error reading file ${dataFile}: ${contentResult.error}`);
    return;
  }
  const content = contentResult.value;

  let todos: Todo[] = [];
  // Extract session ID from filename (UUID.jsonl)
  const sessionId = dataFile.replace('.jsonl', '');

  // Parse JSONL format (JSON Lines - one JSON object per line)
  const lines = content.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const parseResult = parseJsonSafe(line);
    if (!parseResult.success) {
      // Skip lines that aren't valid JSON
      continue;
    }

    const event = parseResult.value;

    // Look for todo-related events in Claude session data
    if (event.type === 'todo' || event.todos) {
      if (Array.isArray(event.todos)) {
        todos.push(...event.todos);
      } else if (event.content && event.status) {
        // Single todo event
        todos.push({ // EXEMPTION: simple array operation with Date constructor
          content: event.content,
          status: event.status,
          activeForm: event.activeForm,
          id: event.id,
          created: event.created ? new Date(event.created) : undefined
        });
      }
    }
  }

  logEntries.push(`  Found session: ${sessionId} with ${todos.length} todos`);

  let project = projects.get(reconstructedPath);
  if (!project) {
    project = {
      path: reconstructedPath,
      sessions: [],
      mostRecentTodoDate: new Date(0),
    } as ExtendedProject;
    projects.set(reconstructedPath, project);
  }

  if (!project.mostRecentTodoDate || stats.mtime > project.mostRecentTodoDate) {
    project.mostRecentTodoDate = stats.mtime;
  }

  project.sessions.push({
    id: sessionId,
    todos: todos,
    lastModified: stats.mtime,
    filePath: dataFilePath,
  });
}

/**
 * Write project metadata file
 */
export async function writeProjectMetadata(
  projectDirPath: string,
  projectPath: string,
  logEntries: string[]
): Promise<void> {
  const metadataPath = path.join(projectDirPath, 'metadata.json');
  if (!fsSync.existsSync(metadataPath)) {
    const writeResult = await ResultUtils.fromPromise(
      fs.writeFile(metadataPath, JSON.stringify({ path: projectPath }, null, 2), 'utf-8')
    );
    if (!writeResult.success) {
      logEntries.push(`  Warning: Could not write metadata.json: ${writeResult.error}`);
    }
  }
}

/**
 * Calculate project statistics
 */
export function calculateProjectStats(projects: Map<string, ExtendedProject>): void {
  for (const p of projects.values()) {
    const dates = p.sessions.map(s => s.lastModified).filter(Boolean) as Date[];
    if (dates.length > 0) {
      p.startDate = new Date(Math.min(...dates.map(d => d.getTime())));
      if (!p.mostRecentTodoDate) {
        p.mostRecentTodoDate = new Date(Math.max(...dates.map(d => d.getTime())));
      }
    }
    let total = 0;
    let active = 0;
    for (const s of p.sessions) {
      total += (s.todos?.length || 0);
      active += (s.todos?.filter(t => t.status !== 'completed').length || 0);
    }
    p.totalTodos = total;
    p.activeTodos = active;
  }
}