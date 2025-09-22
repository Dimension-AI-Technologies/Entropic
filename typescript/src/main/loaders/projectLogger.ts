import path from 'node:path';
import fs from 'node:fs/promises';
import { ResultUtils } from '../../utils/Result.js';
import { PathUtils } from '../../utils/PathUtils.js';

interface ValidationResult {
  expectedProjectCount: number;
  projectsWithSessions: number;
  emptyProjects: number;
}

/**
 * Log initial directory scan
 */
export async function logInitialDirectoryScan(
  projectsDir: string,
  logEntries: string[]
): Promise<void> {
  const projectDirsResult = await ResultUtils.fromPromise(fs.readdir(projectsDir));
  if (projectDirsResult.success) {
    const projectDirsList = projectDirsResult.value;
    logEntries.push(`Found ${projectDirsList.length} flattened project directories:`);
    logEntries.push('');

    for (const flatDir of projectDirsList) {
      const reconstructed = PathUtils.guessPathFromFlattenedName(flatDir);
      const validateResult = PathUtils.validatePath(reconstructed);
      const exists = validateResult.success ? validateResult.value : false;
      if (exists) {
        logEntries.push(`✓ ${flatDir} -> ${reconstructed}`);
      } else {
        logEntries.push(`✗ ${flatDir} -> ${reconstructed} [DOES NOT EXIST]`);
      }
    }
    logEntries.push('');
    logEntries.push('--- Session Processing ---');
    logEntries.push('');
  } else {
    logEntries.push(`Error scanning project directories: ${projectDirsResult.error}`);
  }
}

/**
 * Validate project loading
 */
export async function validateProjectLoading(
  projectsDir: string,
  projects: Map<string, any>,
  logEntries: string[]
): Promise<ValidationResult> {
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
        const reconstructed = PathUtils.guessPathFromFlattenedName(dir);
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

  return { expectedProjectCount, projectsWithSessions, emptyProjects };
}

/**
 * Write summary log
 */
export async function writeSummaryLog(
  logPath: string,
  logEntries: string[],
  validationResult: ValidationResult,
  projects: Map<string, any>
): Promise<void> {
  const { expectedProjectCount, projectsWithSessions, emptyProjects } = validationResult;

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
}