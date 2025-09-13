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
}

const validatePath = (testPath: string): boolean => {
  const result = PathUtils.validatePath(testPath);
  return result.success ? result.value : false;
};

const guessPathFromFlattenedName = (flatPath: string): string => {
  return PathUtils.guessPathFromFlattenedName(flatPath);
};

export async function loadTodosData(projectsDir: string, logsDir: string): AsyncResult<Project[]> {
  const projects = new Map<string, Project>();
  const logPath = path.join(process.cwd(), 'project.load.log');
  const logEntries: string[] = [];
  const timestamp = new Date().toISOString();

  logEntries.push(`=== Project Load Log - ${timestamp} ===`);
  logEntries.push(`Working Directory: ${process.cwd()}`);
  logEntries.push(`Projects Directory: ${projectsDir}`);
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

    const sessionFiles = projectFiles.filter((file) => file.match(/^\.session_.+\.json$/));

    const status = pathExists ? '✅' : '⚠️';
    logEntries.push(`Processing project: ${flatDir} -> ${reconstructedPath} ${status}`);

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
      mostRecentTodoDate: mostRecentDate,
      flattenedDir: flatDir,
      pathExists: pathExists,
    });

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
        let sessionId = '';
        let actualProjectPath: string = reconstructedPath;

        const parseResult = await ResultUtils.fromPromise(Promise.resolve(JSON.parse(content)));
        if (!parseResult.success) {
          logEntries.push(`  Error parsing JSON in ${dataFile}: ${parseResult.error}`);
          continue;
        }
        const sessionData = parseResult.value;

        if (Array.isArray(sessionData)) {
          todos = sessionData;
          const sessionMatch = dataFile.match(/^\.session_(.+)\.json$/);
          sessionId = sessionMatch ? sessionMatch[1] : dataFile;
        } else if (sessionData && typeof sessionData === 'object') {
          todos = sessionData.todos || [];
          sessionId = sessionData.sessionId || sessionData.id || '';
          if (sessionData.projectPath && validatePath(sessionData.projectPath)) {
            actualProjectPath = sessionData.projectPath;
          }
          if (!sessionId) {
            const sessionMatch = dataFile.match(/^\.session_(.+)\.json$/);
            sessionId = sessionMatch ? sessionMatch[1] : dataFile;
          }
        } else {
          continue;
        }

        if (!Array.isArray(todos)) continue;

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

