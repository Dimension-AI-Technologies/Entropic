import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { PathUtils } from '../../utils/PathUtils.js';

/** Best-effort async I/O — returns undefined on failure instead of throwing. */
async function tryIO<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try { return await fn(); } catch { return undefined; }
}

/** Best-effort sync check — returns false on failure. */
function existsSafe(p: string): boolean {
  try { return fsSync.existsSync(p); } catch { return false; }
}

type RepairSummary = {
  projectsScanned: number;
  todosScanned: number;
  metadataWritten: number;
  metadataPlanned: number;
  matchedByJsonl: number;
  matchedBySidecar: number;
  matchedByContent: number;
  matchedByEnvironment: number;
  matchedByLogFile: number;
  unknownSessions: Array<{ sessionId: string; todoFile: string; reason: string }>; 
  dryRun: boolean;
};

const TODO_FILE_RE = /^([0-9a-f-]+)-agent(?:-[0-9a-f-]+)?\.json$/;

// @must_test(REQ-DGN-001)
// @must_test(REQ-DGN-003)
// @must_test(REQ-DGN-004)
// @must_test(REQ-SES-004)
export async function repairProjectMetadata(projectsDir: string, todosDir?: string, dryRun: boolean = true): Promise<RepairSummary> {
  const summary: RepairSummary = {
    projectsScanned: 0,
    todosScanned: 0,
    metadataWritten: 0,
    metadataPlanned: 0,
    matchedByJsonl: 0,
    matchedBySidecar: 0,
    matchedByContent: 0,
    matchedByEnvironment: 0,
    matchedByLogFile: 0,
    unknownSessions: [],
    dryRun,
  };

  async function writeMetaIfMissing(metaPath: string, payload: object): Promise<void> {
    if (existsSafe(metaPath)) return;
    summary.metadataPlanned++;
    if (!dryRun) {
      const wrote = await tryIO(() => fs.writeFile(metaPath, JSON.stringify(payload, null, 2), 'utf-8'));
      if (wrote !== undefined) summary.metadataWritten++;
    }
  }

  // @must_test(REQ-HOK-003)
  async function writeSidecarMeta(sessionId: string, projectPath: string): Promise<void> {
    if (!todosDir) return;
    const sidecar = path.join(todosDir, `${sessionId}-agent.meta.json`);
    if (!existsSafe(sidecar) && !dryRun) {
      await tryIO(() => fs.writeFile(sidecar, JSON.stringify({ projectPath }, null, 2), 'utf-8'));
    }
  }

  // 1) Ensure every valid flattened project dir has metadata.json
  const projectDirs = (await tryIO(() => fs.readdir(projectsDir))) ?? [];
  summary.projectsScanned = projectDirs.length;

  for (const flat of projectDirs) {
    const projPath = path.join(projectsDir, flat);
    const stat = await tryIO(() => fs.stat(projPath));
    if (!stat || !stat.isDirectory()) continue;
    const reconstructed = PathUtils.guessPathFromFlattenedName(flat);
    const valid = PathUtils.validatePath(reconstructed);
    if (valid.success && valid.value) {
      await writeMetaIfMissing(path.join(projPath, 'metadata.json'), { path: reconstructed });
    }
  }

  // 2) Scan todos sessions and backfill based on JSONL filename match or sidecar meta
  if (todosDir && existsSafe(todosDir)) {
    const todoFiles = (await tryIO(() => fs.readdir(todosDir))) ?? [];
    for (const file of todoFiles) {
      const m = file.match(TODO_FILE_RE);
      if (!m) continue;
      summary.todosScanned++;
      const sessionId = m[1];
      let resolved = false;

      // Strategy 1: Prefer sidecar meta
      resolved = await tryResolveBySidecar(sessionId, todosDir, projectsDir, summary, writeMetaIfMissing, writeSidecarMeta);

      // Strategy 2: Match JSONL filename in project dirs
      if (!resolved) {
        resolved = await tryResolveByJsonl(sessionId, projectDirs, projectsDir, summary, writeMetaIfMissing, writeSidecarMeta);
      }

      // Strategy 3: Scan JSONL content for "Working directory:" pattern
      if (!resolved) {
        resolved = await tryResolveByContent(sessionId, projectDirs, projectsDir, summary, writeMetaIfMissing, writeSidecarMeta);
      }

      // Strategy 4: Check environment variables in JSONL for cwd/pwd
      if (!resolved) {
        resolved = await tryResolveByEnvVars(sessionId, projectDirs, projectsDir, summary, writeMetaIfMissing, writeSidecarMeta);
      }

      // Strategy 5: Check logs/current_todos.json for project paths
      if (!resolved && todosDir) {
        resolved = await tryResolveByLogFile(sessionId, todosDir, projectsDir, summary, writeMetaIfMissing, writeSidecarMeta);
      }

      if (!resolved) {
        summary.unknownSessions.push({ sessionId, todoFile: file, reason: 'No matching found via JSONL, sidecar, content analysis, environment vars, or log files' });
      }
    }
  }

  return summary;
}

type MetaWriter = (metaPath: string, payload: object) => Promise<void>;
type SidecarWriter = (sessionId: string, projectPath: string) => Promise<void>;

async function tryResolveBySidecar(
  sessionId: string, todosDir: string, projectsDir: string,
  summary: RepairSummary, writeMetaIfMissing: MetaWriter, writeSidecarMeta: SidecarWriter,
): Promise<boolean> {
  const sidecar = path.join(todosDir, `${sessionId}-agent.meta.json`);
  if (!existsSafe(sidecar)) return false;
  const raw = await tryIO(() => fs.readFile(sidecar, 'utf-8'));
  if (!raw) return false;
  const meta = JSON.parse(raw);
  if (!meta || typeof meta.projectPath !== 'string') return false;
  const flat = PathUtils.createFlattenedPath(meta.projectPath);
  const projDir = path.join(projectsDir, flat);
  if (!existsSafe(projDir)) return false;
  await writeMetaIfMissing(path.join(projDir, 'metadata.json'), { path: meta.projectPath });
  summary.matchedBySidecar++;
  await writeSidecarMeta(sessionId, meta.projectPath);
  return true;
}

async function tryResolveByJsonl(
  sessionId: string, projectDirs: string[], projectsDir: string,
  summary: RepairSummary, writeMetaIfMissing: MetaWriter, writeSidecarMeta: SidecarWriter,
): Promise<boolean> {
  for (const flat of projectDirs) {
    const dir = path.join(projectsDir, flat);
    const files = await tryIO(() => fs.readdir(dir));
    if (!files || !files.includes(`${sessionId}.jsonl`)) continue;
    const real = PathUtils.guessPathFromFlattenedName(flat);
    const valid = PathUtils.validatePath(real);
    if (!valid.success || !valid.value) continue;
    await writeMetaIfMissing(path.join(dir, 'metadata.json'), { path: real });
    summary.matchedByJsonl++;
    await writeSidecarMeta(sessionId, real);
    return true;
  }
  return false;
}

function parseJsonlLines(content: string, maxLines: number): string[] {
  return content.split('\n').filter(l => l.trim()).slice(0, maxLines);
}

async function tryResolveByContent(
  sessionId: string, projectDirs: string[], projectsDir: string,
  summary: RepairSummary, writeMetaIfMissing: MetaWriter, writeSidecarMeta: SidecarWriter,
): Promise<boolean> {
  for (const flat of projectDirs) {
    const dir = path.join(projectsDir, flat);
    const jsonlPath = path.join(dir, `${sessionId}.jsonl`);
    if (!existsSafe(jsonlPath)) continue;
    const content = await tryIO(() => fs.readFile(jsonlPath, 'utf-8'));
    if (!content) continue;
    for (const line of parseJsonlLines(content, 50)) {
      const parsed = await tryIO(async () => JSON.parse(line));
      if (!parsed) continue;
      const text = JSON.stringify(parsed).toLowerCase();
      if (!text.includes('working directory:')) continue;
      const match = text.match(/working directory:\s*([^"\\]+)/);
      if (!match?.[1]) continue;
      const inferredPath = match[1].replace(/\\\\/g, '/').trim();
      if (!inferredPath || inferredPath.length <= 3) continue;
      await writeMetaIfMissing(path.join(dir, 'metadata.json'), { path: inferredPath });
      summary.matchedByContent++;
      await writeSidecarMeta(sessionId, inferredPath);
      return true;
    }
  }
  return false;
}

const ENV_PATTERNS = [
  /"cwd":\s*"([^"]+)"/,
  /"pwd":\s*"([^"]+)"/,
  /current working directory[^:]*:\s*([^"\\,}]+)/i,
  /workspace[^:]*:\s*([^"\\,}]+)/i,
];

async function tryResolveByEnvVars(
  sessionId: string, projectDirs: string[], projectsDir: string,
  summary: RepairSummary, writeMetaIfMissing: MetaWriter, writeSidecarMeta: SidecarWriter,
): Promise<boolean> {
  for (const flat of projectDirs) {
    const dir = path.join(projectsDir, flat);
    const jsonlPath = path.join(dir, `${sessionId}.jsonl`);
    if (!existsSafe(jsonlPath)) continue;
    const content = await tryIO(() => fs.readFile(jsonlPath, 'utf-8'));
    if (!content) continue;
    for (const line of parseJsonlLines(content, 100)) {
      const parsed = await tryIO(async () => JSON.parse(line));
      if (!parsed) continue;
      const text = JSON.stringify(parsed);
      for (const pattern of ENV_PATTERNS) {
        const match = text.match(pattern);
        if (!match?.[1]) continue;
        const inferredPath = match[1].replace(/\\\\/g, '/').trim();
        if (!inferredPath || inferredPath.length <= 3 || inferredPath.includes('undefined')) continue;
        await writeMetaIfMissing(path.join(dir, 'metadata.json'), { path: inferredPath });
        summary.matchedByEnvironment++;
        await writeSidecarMeta(sessionId, inferredPath);
        return true;
      }
    }
  }
  return false;
}

async function tryResolveByLogFile(
  sessionId: string, todosDir: string, projectsDir: string,
  summary: RepairSummary, writeMetaIfMissing: MetaWriter, writeSidecarMeta: SidecarWriter,
): Promise<boolean> {
  const logsDir = path.join(path.dirname(todosDir), 'logs');
  const currentTodosPath = path.join(logsDir, 'current_todos.json');
  if (!existsSafe(currentTodosPath)) return false;
  const content = await tryIO(() => fs.readFile(currentTodosPath, 'utf-8'));
  if (!content) return false;
  const data = await tryIO(async () => JSON.parse(content));
  if (!data) return false;
  const text = JSON.stringify(data);
  if (!text.includes(sessionId)) return false;
  const patterns = [
    new RegExp(`${sessionId}[^}]*"projectPath":\\s*"([^"]+)"`, 'i'),
    new RegExp(`${sessionId}[^}]*"path":\\s*"([^"]+)"`, 'i'),
    new RegExp(`"([^"]+)"[^}]*${sessionId}`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const inferredPath = match[1].replace(/\\\\/g, '/').trim();
    if (!inferredPath || inferredPath.length <= 3 || inferredPath.includes(sessionId)) continue;
    const flat = PathUtils.createFlattenedPath(inferredPath);
    const projDir = path.join(projectsDir, flat);
    if (!existsSafe(projDir)) continue;
    await writeMetaIfMissing(path.join(projDir, 'metadata.json'), { path: inferredPath });
    summary.matchedByLogFile++;
    await writeSidecarMeta(sessionId, inferredPath);
    return true;
  }
  return false;
}

export async function collectDiagnostics(projectsDir: string, todosDir?: string): Promise<{ text: string; unknownCount: number; planned: number; written: number }> {
  const summary = await repairProjectMetadata(projectsDir, todosDir, true);
  const lines: string[] = [];
  lines.push('Diagnostics for Project/Todo Associations');
  lines.push('');
  lines.push(`Projects scanned: ${summary.projectsScanned}`);
  lines.push(`Todo sessions scanned: ${summary.todosScanned}`);
  lines.push(`Metadata files written: ${summary.metadataWritten}`);
  lines.push(`Matched via sidecar meta: ${summary.matchedBySidecar}`);
  lines.push(`Matched via JSONL filename: ${summary.matchedByJsonl}`);
  lines.push(`Matched via content analysis: ${summary.matchedByContent}`);
  lines.push(`Matched via environment vars: ${summary.matchedByEnvironment}`);
  lines.push(`Matched via log files: ${summary.matchedByLogFile}`);
  lines.push('');
  if (summary.unknownSessions.length === 0) {
    lines.push('All todo sessions are anchored to projects.');
  } else {
    lines.push(`Unanchored sessions (${summary.unknownSessions.length}):`);
    for (const u of summary.unknownSessions.slice(0, 200)) {
      lines.push(`  - ${u.sessionId} (${u.todoFile}): ${u.reason}`);
    }
    if (summary.unknownSessions.length > 200) {
      lines.push(`  ...and ${summary.unknownSessions.length - 200} more`);
    }
  }
  return { text: lines.join('\n'), unknownCount: summary.unknownSessions.length, planned: summary.metadataPlanned, written: summary.metadataWritten };
}
