import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import { Ok, Err, ResultUtils, type AsyncResult } from '../../utils/Result.js';
import { PathUtils } from '../../utils/PathUtils.js';

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
  flattenedDir?: string;
  pathExists?: boolean;
  startDate?: Date;
  totalTodos?: number;
  activeTodos?: number;
}

const validatePath = (testPath: string): boolean => {
  const result = PathUtils.validatePath(testPath);
  return result.success ? result.value : false;
};

const guessPathFromFlattenedName = (flatPath: string): string => {
  return PathUtils.guessPathFromFlattenedName(flatPath);
};

export async function loadTodosData(projectsDir: string, logsDir: string, todosDir?: string): AsyncResult<Project[]> {
  const projects = new Map<string, Project>();
  const logPath = path.join(process.cwd(), 'project.load.log');
  const logEntries: string[] = [];
  const timestamp = new Date().toISOString();

  logEntries.push(`=== Project Load Log - ${timestamp} ===`);
  logEntries.push(`Working Directory: ${process.cwd()}`);
  logEntries.push(`Projects Directory: ${projectsDir}`);
  if (todosDir) logEntries.push(`Todos Directory: ${todosDir}`);
  logEntries.push('');

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
      continue;
    }
    const projectFiles = projectFilesResult.value;

    const reconstructedPath = guessPathFromFlattenedName(flatDir);
    const pathExists = validatePath(reconstructedPath);

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
    try {
      if (pathExists) {
        const metadataPath = path.join(projectDirPath, 'metadata.json');
        if (!fsSync.existsSync(metadataPath)) {
          await fs.writeFile(metadataPath, JSON.stringify({ path: reconstructedPath }, null, 2), 'utf-8');
        }
      }
    } catch {}

    if (sessionFiles.length > 0) {
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

        let todos: Todo[] = [];
        // Extract session ID from filename (UUID.jsonl)
        const sessionId = dataFile.replace('.jsonl', '');
        let actualProjectPath: string = reconstructedPath;

        // Parse JSONL format (JSON Lines - one JSON object per line)
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            
            // Look for todo-related events in Claude session data
            if (event.type === 'todo' || event.todos) {
              if (Array.isArray(event.todos)) {
                todos.push(...event.todos);
              } else if (event.content && event.status) {
                // Single todo event
                todos.push({
                  content: event.content,
                  status: event.status,
                  activeForm: event.activeForm,
                  id: event.id,
                  created: event.created ? new Date(event.created) : undefined
                });
              }
            }
          } catch (err) {
            // Skip lines that aren't valid JSON
            continue;
          }
        }
        
        if (todos.length === 0) {
          // If no todos found, create a placeholder session to show it exists
          logEntries.push(`  Found session: ${sessionId} (no todos extracted from JSONL)`);
        }

        // Continue even if no todos found - session still exists

        logEntries.push(`  Found session: ${sessionId} with ${todos.length} todos`);

        let project = projects.get(actualProjectPath);
        if (!project) {
          const reconstructedProject = projects.get(reconstructedPath);
          if (reconstructedProject && reconstructedProject.sessions.length === 0) {
            projects.delete(reconstructedPath);
            reconstructedProject.path = actualProjectPath;
            projects.set(actualProjectPath, reconstructedProject);
            project = reconstructedProject;
          } else {
            project = {
              path: actualProjectPath,
              sessions: [],
              mostRecentTodoDate: new Date(0),
            } as Project;
            projects.set(actualProjectPath, project);
          }
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
    }
  }

  // --- Phase 2: Merge sessions from ~/.claude/todos JSON files (authoritative TODO lists)
  if (todosDir && fsSync.existsSync(todosDir)) {
    logEntries.push('');
    logEntries.push('--- Todos Directory Merge ---');
    const todoFilesResult = await ResultUtils.fromPromise(fs.readdir(todosDir));
    if (todoFilesResult.success) {
      const todoFiles = todoFilesResult.value.filter(f => /-agent(?:-[0-9a-f-]+)?\.json$/.test(f));
      logEntries.push(`Found ${todoFiles.length} todo session files`);
      for (const filename of todoFiles) {
        const match = filename.match(/^([0-9a-f-]+)-agent(?:-[0-9a-f-]+)?\.json$/);
        if (!match) continue;
        const sessionId = match[1];
        const filePath = path.join(todosDir, filename);
        const statsResult = await ResultUtils.fromPromise(fs.stat(filePath));
        if (!statsResult.success) {
          logEntries.push(`  ✗ stat failed for ${filename}: ${statsResult.error}`);
          continue;
        }
        const contentResult = await ResultUtils.fromPromise(fs.readFile(filePath, 'utf-8'));
        if (!contentResult.success) {
          logEntries.push(`  ✗ read failed for ${filename}: ${contentResult.error}`);
          continue;
        }
        let todos: Todo[] = [];
        let explicitProjectPath: string | null = null;
        try {
          const parsed = JSON.parse(contentResult.value);
          if (Array.isArray(parsed)) {
            todos = parsed.map((t: any) => ({
              content: String(t.content || ''),
              status: ['pending','in_progress','completed'].includes(t.status) ? t.status : 'pending',
              activeForm: t.activeForm,
              id: t.id,
              created: t.created ? new Date(t.created) : undefined,
            }));
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.todos)) {
              todos = parsed.todos.map((t: any) => ({
                content: String(t.content || ''),
                status: ['pending','in_progress','completed'].includes(t.status) ? t.status : 'pending',
                activeForm: t.activeForm,
                id: t.id,
                created: t.created ? new Date(t.created) : undefined,
              }));
            }
            if (parsed.projectPath && typeof parsed.projectPath === 'string') {
              explicitProjectPath = parsed.projectPath;
            }
          }
        } catch (e) {
          logEntries.push(`  ✗ parse failed for ${filename}`);
          continue;
        }

        // Resolve project real path from session
        // Try sidecar metadata first
        try {
          const metaFile = path.join(todosDir!, `${sessionId}-agent.meta.json`);
          if (fsSync.existsSync(metaFile)) {
            const metaRaw = await fs.readFile(metaFile, 'utf-8');
            const meta = JSON.parse(metaRaw);
            if (meta && typeof meta.projectPath === 'string') {
              explicitProjectPath = explicitProjectPath || meta.projectPath;
            }
          }
        } catch {}

        // Resolve via PathUtils if not explicitly provided
        const projPathResult = await PathUtils.getRealProjectPath(sessionId);
        const realPath = (projPathResult.success && projPathResult.value.path) ? projPathResult.value.path : null;
        const flattenedDir = projPathResult.success ? projPathResult.value.flattenedDir : undefined;
        let targetPath = explicitProjectPath || realPath || (flattenedDir ? guessPathFromFlattenedName(flattenedDir) : 'Unknown Project');

        // Validate explicit project path if provided
        if (explicitProjectPath && !validatePath(explicitProjectPath)) {
          targetPath = realPath || (flattenedDir ? guessPathFromFlattenedName(flattenedDir) : 'Unknown Project');
        }
        const pathExists = realPath ? validatePath(realPath) : validatePath(targetPath);

        if (!projects.has(targetPath)) {
          projects.set(targetPath, {
            path: targetPath,
            sessions: [],
            mostRecentTodoDate: statsResult.value.mtime,
            flattenedDir: flattenedDir,
            pathExists,
          });
        } else {
          const p = projects.get(targetPath)!;
          if (!p.mostRecentTodoDate || statsResult.value.mtime > p.mostRecentTodoDate) {
            p.mostRecentTodoDate = statsResult.value.mtime;
          }
        }

        // Backfill metadata.json for this project if we know the flattenedDir/realPath
        try {
          if (flattenedDir && (realPath || explicitProjectPath)) {
            const projDir = path.join(projectsDir, flattenedDir);
            const metadataPath = path.join(projDir, 'metadata.json');
            const toWrite = realPath || explicitProjectPath!;
            if (!fsSync.existsSync(metadataPath)) {
              await fs.writeFile(metadataPath, JSON.stringify({ path: toWrite }, null, 2), 'utf-8');
            }
          }
        } catch {}

        const project = projects.get(targetPath)!;
        const existingIndex = project.sessions.findIndex(s => s.id === sessionId);
        const sessionData = {
          id: sessionId,
          todos,
          lastModified: statsResult.value.mtime,
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
            if (statsResult.value.mtime > existing.lastModified) {
              existing.lastModified = statsResult.value.mtime;
            }
          }
        } else {
          project.sessions.push(sessionData);
        }

        // Fallback: if project lacks dates, use directory stats when possible
        if ((!project.startDate || !project.mostRecentTodoDate) && project.flattenedDir) {
          const projDirPath = path.join(projectsDir, project.flattenedDir);
          const projStat = await ResultUtils.fromPromise(fs.stat(projDirPath));
          if (projStat.success) {
            if (!project.startDate || project.startDate.getTime() === 0) project.startDate = projStat.value.birthtime;
            if (!project.mostRecentTodoDate || project.mostRecentTodoDate.getTime() === 0) project.mostRecentTodoDate = projStat.value.mtime;
          }
        }
      }
    } else {
      logEntries.push(`Error reading todos directory: ${todoFilesResult.error}`);
    }
  }

  let expectedProjectCount = 0;
  let projectsWithSessions = 0;
  let emptyProjects = 0;

  const allProjectDirsResult = await ResultUtils.fromPromise(fs.readdir(projectsDir));
  if (allProjectDirsResult.success) {
    const allProjectDirs = allProjectDirsResult.value;
    expectedProjectCount = allProjectDirs.length;

    const loadedProjects = Array.from(projects.values());
    projectsWithSessions = loadedProjects.filter((p) => p.sessions.length > 0).length;
    emptyProjects = loadedProjects.filter((p) => p.sessions.length === 0).length;

    if (projects.size !== expectedProjectCount) {
      console.error(`🚨 PROJECT LOADING MISMATCH!`);
      console.error(`   Expected: ${expectedProjectCount} project directories`);
      console.error(`   Loaded: ${projects.size} projects`);
      console.error(`   Missing: ${expectedProjectCount - projects.size} projects`);

      const loadedPaths = new Set(loadedProjects.map((p) => p.path));
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

  // Compute aggregate fields (startDate, totals)
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

  logEntries.push('');
  logEntries.push(`=== Summary ===`);
  logEntries.push(`Expected project directories: ${expectedProjectCount}`);
  logEntries.push(`Total projects loaded: ${projects.size}`);
  logEntries.push(`Projects with sessions: ${projectsWithSessions}`);
  logEntries.push(`Empty projects: ${emptyProjects}`);
  logEntries.push(`Loading success rate: ${((projects.size / expectedProjectCount) * 100).toFixed(1)}%`);
  logEntries.push(`Successful reconstructions: ${logEntries.filter((l) => l.includes('✓ SUCCESS')).length}`);
  logEntries.push(`Failed reconstructions: ${logEntries.filter((l) => l.includes('✗ FAILED')).length}`);

  const writeLogResult = await ResultUtils.fromPromise(fs.writeFile(logPath, logEntries.join('\n'), 'utf-8'));
  if (!writeLogResult.success) {
    console.error('Failed to write project load log:', writeLogResult.error);
  }

  return Ok(Array.from(projects.values()));
}
