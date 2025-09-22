import path from 'node:path';
import fs from 'node:fs/promises';
import { parseJsonSafe } from '../../utils/JsonUtils.js';
import { PathUtils } from '../../utils/PathUtils.js';
import { ResultUtils, type Result } from '../../utils/Result.js';
import type { Todo, Session } from '../../types/index.js';

/**
 * Load a session from a JSONL file
 */
export async function loadSessionFromFile(
  filePath: string,
  logEntries: string[]
): Promise<Session | null> {
  const filename = path.basename(filePath);

  // Read file content
  const contentResult = await ResultUtils.fromPromise(fs.readFile(filePath, 'utf-8'));
  if (!contentResult.success) {
    logEntries.push(`  ✗ failed to read ${filename}: ${contentResult.error}`);
    return null;
  }

  // Parse JSON content
  const parseResult = parseJsonSafe(contentResult.value);
  if (!parseResult.success) {
    logEntries.push(`  ✗ parse failed for ${filename}: ${parseResult.error}`);
    return null;
  }

  const data = parseResult.value;
  const todos: Todo[] = Array.isArray(data.todos) ? data.todos : [];

  // Extract session ID
  let sessionId = data.sessionId || data.session_id || data.id;
  if (!sessionId && filename.includes('-agent-')) {
    const parts = filename.split('-agent-');
    sessionId = parts[0];
  }
  if (!sessionId) {
    sessionId = filename.replace('.json', '');
  }

  return {
    id: sessionId,
    todos,
    lastModified: data.lastModified || data.updatedAt || new Date(),
    created: data.created || data.createdAt,
    filePath
  };
}

/**
 * Load sessions from a directory
 */
export async function loadSessionsFromDirectory(
  dirPath: string,
  logEntries: string[]
): Promise<Session[]> {
  const sessions: Session[] = [];

  const filesResult = await ResultUtils.fromPromise(fs.readdir(dirPath));
  if (!filesResult.success) {
    logEntries.push(`  ✗ failed to read directory ${dirPath}: ${filesResult.error}`);
    return sessions;
  }

  for (const file of filesResult.value) {
    if (!file.endsWith('.json')) continue;

    const filePath = path.join(dirPath, file);
    const session = await loadSessionFromFile(filePath, logEntries);
    if (session) {
      sessions.push(session);
    }
  }

  return sessions;
}

/**
 * Extract project path from session metadata
 */
export async function extractProjectPath(
  sessionId: string,
  flattenedDir: string,
  metadataPath?: string,
  logEntries?: string[]
): Promise<string | null> {
  // Try to read metadata file if it exists
  if (metadataPath) {
    const metaReadResult = await ResultUtils.fromPromise(fs.readFile(metadataPath, 'utf-8'));
    if (metaReadResult.success) {
      const metaParseResult = parseJsonSafe(metaReadResult.value);
      if (metaParseResult.success) {
        const meta = metaParseResult.value;
        if (meta && typeof meta.projectPath === 'string') {
          return meta.projectPath;
        }
      }
    }
  }

  // Try to get real project path from PathUtils
  const projPathResult = await PathUtils.getRealProjectPath(sessionId);
  if (projPathResult.success && projPathResult.value?.path) {
    return projPathResult.value.path;
  }

  // Fallback to guessing from flattened name
  if (flattenedDir) {
    return PathUtils.guessPathFromFlattenedName(flattenedDir);
  }

  return null;
}