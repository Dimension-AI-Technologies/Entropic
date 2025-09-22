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
 * Process todos directory and merge with existing projects
 */
export async function processTodosDirectory(
  todosDir: string,
  projectsDir: string,
  projects: Map<string, ExtendedProject>,
  logEntries: string[]
): Promise<void> {
  if (!todosDir || !fsSync.existsSync(todosDir)) return;

  logEntries.push('');
  logEntries.push('--- Todos Directory Merge ---');

  const todoFilesResult = await ResultUtils.fromPromise(fs.readdir(todosDir));
  if (!todoFilesResult.success) {
    logEntries.push(`Error reading todos directory: ${todoFilesResult.error}`);
    return;
  }

  const todoFiles = todoFilesResult.value.filter(f => /-agent(?:-[0-9a-f-]+)?\.json$/.test(f));
  logEntries.push(`Found ${todoFiles.length} todo session files`);

  for (const filename of todoFiles) {
    await processTodoFile(filename, todosDir, projectsDir, projects, logEntries);
  }
}

/**
 * Process a single todo file
 */
async function processTodoFile(
  filename: string,
  todosDir: string,
  projectsDir: string,
  projects: Map<string, ExtendedProject>,
  logEntries: string[]
): Promise<void> {
  const match = filename.match(/^([0-9a-f-]+)-agent(?:-[0-9a-f-]+)?\.json$/);
  if (!match) return;

  const sessionId = match[1];
  const filePath = path.join(todosDir, filename);

  const statsResult = await ResultUtils.fromPromise(fs.stat(filePath));
  if (!statsResult.success) {
    logEntries.push(`  ✗ stat failed for ${filename}: ${statsResult.error}`);
    return;
  }

  const contentResult = await ResultUtils.fromPromise(fs.readFile(filePath, 'utf-8'));
  if (!contentResult.success) {
    logEntries.push(`  ✗ read failed for ${filename}: ${contentResult.error}`);
    return;
  }

  const parseResult = parseJsonSafe(contentResult.value);
  if (!parseResult.success) {
    logEntries.push(`  ✗ parse failed for ${filename}: ${parseResult.error}`);
    return;
  }

  const { todos, projectPath } = extractTodosFromParsedData(parseResult.value);
  const resolvedPath = await resolveProjectPath(sessionId, todosDir, projectPath, projectsDir);

  const validateResult = PathUtils.validatePath(resolvedPath.path);
  const pathExists = validateResult.success ? validateResult.value : false;

  // Get or create project
  if (!projects.has(resolvedPath.path)) {
    projects.set(resolvedPath.path, {
      path: resolvedPath.path,
      sessions: [],
      mostRecentTodoDate: statsResult.value.mtime,
      flattenedDir: resolvedPath.flattenedDir,
      pathExists,
    });
  } else {
    const p = projects.get(resolvedPath.path)!;
    if (!p.mostRecentTodoDate || statsResult.value.mtime > p.mostRecentTodoDate) {
      p.mostRecentTodoDate = statsResult.value.mtime;
    }
  }

  // Backfill metadata if needed
  if (resolvedPath.flattenedDir && resolvedPath.path) {
    await writeProjectMetadataIfNeeded(
      projectsDir,
      resolvedPath.flattenedDir,
      resolvedPath.path,
      logEntries
    );
  }

  // Update or add session
  const project = projects.get(resolvedPath.path)!;
  updateProjectSession(project, sessionId, todos, statsResult.value.mtime, filePath);

  // Update project dates from directory if needed
  await updateProjectDatesFromDirectory(project, projectsDir);
}

/**
 * Extract todos from parsed JSON data
 */
function extractTodosFromParsedData(parsed: any): {
  todos: Todo[];
  projectPath: string | null;
} {
  let todos: Todo[] = [];
  let projectPath: string | null = null;

  if (Array.isArray(parsed)) {
    todos = parsed.map((t: any) => ({
      content: String(t.content || ''),
      status: ['pending', 'in_progress', 'completed'].includes(t.status) ? t.status : 'pending',
      activeForm: t.activeForm,
      id: t.id,
      created: t.created ? new Date(t.created) : undefined, // EXEMPTION: simple Date constructor
    }));
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.todos)) {
      todos = parsed.todos.map((t: any) => ({
        content: String(t.content || ''),
        status: ['pending', 'in_progress', 'completed'].includes(t.status) ? t.status : 'pending',
        activeForm: t.activeForm,
        id: t.id,
        created: t.created ? new Date(t.created) : undefined, // EXEMPTION: simple Date constructor
      }));
    }
    if (parsed.projectPath && typeof parsed.projectPath === 'string') {
      projectPath = parsed.projectPath;
    }
  }

  return { todos, projectPath };
}

/**
 * Resolve the actual project path for a session
 */
async function resolveProjectPath(
  sessionId: string,
  todosDir: string,
  explicitProjectPath: string | null,
  projectsDir: string
): Promise<{ path: string; flattenedDir?: string }> {
  // Try sidecar metadata first
  const metaFile = path.join(todosDir, `${sessionId}-agent.meta.json`);
  if (fsSync.existsSync(metaFile)) {
    const metaReadResult = await ResultUtils.fromPromise(fs.readFile(metaFile, 'utf-8'));
    if (metaReadResult.success) {
      const metaParseResult = parseJsonSafe(metaReadResult.value);
      if (metaParseResult.success) {
        const meta = metaParseResult.value;
        if (meta && typeof meta.projectPath === 'string') {
          explicitProjectPath = explicitProjectPath || meta.projectPath;
        }
      }
    }
  }

  // Resolve via PathUtils if not explicitly provided
  const projPathResult = await PathUtils.getRealProjectPath(sessionId);
  const realPath = (projPathResult.success && projPathResult.value.path) ? projPathResult.value.path : null;
  const flattenedDir = projPathResult.success ? projPathResult.value.flattenedDir : undefined;

  let targetPath = explicitProjectPath || realPath ||
    (flattenedDir ? PathUtils.guessPathFromFlattenedName(flattenedDir) : 'Unknown Project');

  // Validate explicit project path if provided
  if (explicitProjectPath) {
    const validateResult = PathUtils.validatePath(explicitProjectPath);
    if (!validateResult.success || !validateResult.value) {
      targetPath = realPath ||
        (flattenedDir ? PathUtils.guessPathFromFlattenedName(flattenedDir) : 'Unknown Project');
    }
  }

  return { path: targetPath, flattenedDir };
}

/**
 * Update or add session to project
 */
function updateProjectSession(
  project: ExtendedProject,
  sessionId: string,
  todos: Todo[],
  mtime: Date,
  filePath: string
): void {
  const existingIndex = project.sessions.findIndex(s => s.id === sessionId);
  const sessionData = {
    id: sessionId,
    todos,
    lastModified: mtime,
    filePath,
  } as Session;

  if (existingIndex >= 0) {
    // Prefer JSON todos when present
    const existing = project.sessions[existingIndex];
    const shouldReplace = (existing.todos?.length || 0) < todos.length;
    if (shouldReplace) {
      project.sessions[existingIndex] = sessionData;
    } else {
      // Keep existing but update lastModified if newer
      if (mtime > existing.lastModified) {
        existing.lastModified = mtime;
      }
    }
  } else {
    project.sessions.push(sessionData);
  }
}

/**
 * Write project metadata if it doesn't exist
 */
async function writeProjectMetadataIfNeeded(
  projectsDir: string,
  flattenedDir: string,
  projectPath: string,
  logEntries: string[]
): Promise<void> {
  const projDir = path.join(projectsDir, flattenedDir);
  const metadataPath = path.join(projDir, 'metadata.json');

  if (!fsSync.existsSync(metadataPath)) {
    const writeResult = await ResultUtils.fromPromise(
      fs.writeFile(metadataPath, JSON.stringify({ path: projectPath }, null, 2), 'utf-8')
    );
    if (!writeResult.success) {
      logEntries.push(`  Warning: Could not write project metadata.json: ${writeResult.error}`);
    }
  }
}

/**
 * Update project dates from directory stats if needed
 */
async function updateProjectDatesFromDirectory(
  project: ExtendedProject,
  projectsDir: string
): Promise<void> {
  if ((!project.startDate || !project.mostRecentTodoDate) && project.flattenedDir) {
    const projDirPath = path.join(projectsDir, project.flattenedDir);
    const projStat = await ResultUtils.fromPromise(fs.stat(projDirPath));
    if (projStat.success) {
      if (!project.startDate || project.startDate.getTime() === 0) {
        project.startDate = projStat.value.birthtime;
      }
      if (!project.mostRecentTodoDate || project.mostRecentTodoDate.getTime() === 0) {
        project.mostRecentTodoDate = projStat.value.mtime;
      }
    }
  }
}