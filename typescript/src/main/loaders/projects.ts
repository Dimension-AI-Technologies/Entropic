import path from 'node:path';
import fs from 'node:fs/promises';
import { Ok, Err, ResultUtils, type AsyncResult } from '../../utils/Result.js';
import { processProjectDirectory, calculateProjectStats } from './projectProcessor.js';
import { processTodosDirectory } from './todosDirectoryProcessor.js';
import { logInitialDirectoryScan, validateProjectLoading, writeSummaryLog } from './projectLogger.js';

interface ExtendedProject {
  path: string;
  sessions: any[];
  mostRecentTodoDate?: Date;
  flattenedDir?: string;
  pathExists?: boolean;
  startDate?: Date;
  totalTodos?: number;
  activeTodos?: number;
}

export async function loadTodosData(
  projectsDir: string,
  logsDir: string,
  todosDir?: string
): AsyncResult<ExtendedProject[]> {
  const projects = new Map<string, ExtendedProject>();
  const logPath = path.join(process.cwd(), 'project.load.log');
  const logEntries: string[] = [];
  const timestamp = new Date().toISOString();

  // Initialize log
  logEntries.push(`=== Project Load Log - ${timestamp} ===`);
  logEntries.push(`Working Directory: ${process.cwd()}`);
  logEntries.push(`Projects Directory: ${projectsDir}`);
  if (todosDir) logEntries.push(`Todos Directory: ${todosDir}`);
  logEntries.push('');

  // Log initial directory scan
  await logInitialDirectoryScan(projectsDir, logEntries);

  // Process project directories
  const projectDirsListResult = await ResultUtils.fromPromise(fs.readdir(projectsDir));
  if (!projectDirsListResult.success) {
    logEntries.push(`Error reading project directories: ${projectDirsListResult.error}`);
    return Err(`Failed to read project directories: ${projectDirsListResult.error}`);
  }

  const projectDirsList = projectDirsListResult.value;

  for (const flatDir of projectDirsList) {
    await processProjectDirectory(flatDir, projectsDir, projects, logEntries);
  }

  // Merge sessions from todos directory
  if (todosDir) {
    await processTodosDirectory(todosDir, projectsDir, projects, logEntries);
  }

  // Validate project loading
  const validationResult = await validateProjectLoading(projectsDir, projects, logEntries);

  // Calculate project statistics
  calculateProjectStats(projects);

  // Write summary to log
  await writeSummaryLog(logPath, logEntries, validationResult, projects);

  return Ok(Array.from(projects.values()));
}