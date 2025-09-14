import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { PathUtils } from '../../utils/PathUtils.js';

type RepairSummary = {
  projectsScanned: number;
  todosScanned: number;
  metadataWritten: number;
  metadataPlanned: number;
  matchedByJsonl: number;
  matchedBySidecar: number;
  unknownSessions: Array<{ sessionId: string; todoFile: string; reason: string }>; 
  dryRun: boolean;
};

const TODO_FILE_RE = /^([0-9a-f-]+)-agent(?:-[0-9a-f-]+)?\.json$/;

export async function repairProjectMetadata(projectsDir: string, todosDir?: string, dryRun: boolean = true): Promise<RepairSummary> {
  const summary: RepairSummary = {
    projectsScanned: 0,
    todosScanned: 0,
    metadataWritten: 0,
    metadataPlanned: 0,
    matchedByJsonl: 0,
    matchedBySidecar: 0,
    unknownSessions: [],
    dryRun,
  };

  // 1) Ensure every valid flattened project dir has metadata.json
  let projectDirs: string[] = [];
  try {
    projectDirs = await fs.readdir(projectsDir);
  } catch {}
  summary.projectsScanned = projectDirs.length;

  for (const flat of projectDirs) {
    const projPath = path.join(projectsDir, flat);
    try {
      const stat = await fs.stat(projPath);
      if (!stat.isDirectory()) continue;
    } catch { continue; }
    const reconstructed = PathUtils.guessPathFromFlattenedName(flat);
    const valid = PathUtils.validatePath(reconstructed);
    if (valid.success && valid.value) {
      const metaPath = path.join(projPath, 'metadata.json');
      if (!fsSync.existsSync(metaPath)) {
        summary.metadataPlanned++;
        if (!dryRun) { try { await fs.writeFile(metaPath, JSON.stringify({ path: reconstructed }, null, 2), 'utf-8'); summary.metadataWritten++; } catch {} }
      }
    }
  }

  // 2) Scan todos sessions and backfill based on JSONL filename match or sidecar meta
  if (todosDir && fsSync.existsSync(todosDir)) {
    let todoFiles: string[] = [];
    try { todoFiles = await fs.readdir(todosDir); } catch {}
    for (const file of todoFiles) {
      const m = file.match(TODO_FILE_RE);
      if (!m) continue;
      summary.todosScanned++;
      const sessionId = m[1];
      let resolved: { flattened?: string; real?: string } | null = null;

      // Prefer sidecar meta first
      try {
        const sidecar = path.join(todosDir, `${sessionId}-agent.meta.json`);
        if (fsSync.existsSync(sidecar)) {
          const raw = await fs.readFile(sidecar, 'utf-8');
          const meta = JSON.parse(raw);
          if (meta && typeof meta.projectPath === 'string') {
            const flat = PathUtils.createFlattenedPath(meta.projectPath);
            const projDir = path.join(projectsDir, flat);
            if (fsSync.existsSync(projDir)) {
              const metaPath = path.join(projDir, 'metadata.json');
              if (!fsSync.existsSync(metaPath)) {
                summary.metadataPlanned++;
                if (!dryRun) { try { await fs.writeFile(metaPath, JSON.stringify({ path: meta.projectPath }, null, 2), 'utf-8'); summary.metadataWritten++; } catch {} }
              }
              summary.matchedBySidecar++;
              resolved = { flattened: flat, real: meta.projectPath };
            }
          }
        }
      } catch {}

      if (!resolved) {
        // Search for matching JSONL in projects
        for (const flat of projectDirs) {
          const dir = path.join(projectsDir, flat);
          try {
            const files = await fs.readdir(dir);
            if (files.includes(`${sessionId}.jsonl`)) {
              const real = PathUtils.guessPathFromFlattenedName(flat);
              const valid = PathUtils.validatePath(real);
              if (valid.success && valid.value) {
                const metaPath = path.join(dir, 'metadata.json');
                if (!fsSync.existsSync(metaPath)) {
                  summary.metadataPlanned++;
                  if (!dryRun) { try { await fs.writeFile(metaPath, JSON.stringify({ path: real }, null, 2), 'utf-8'); summary.metadataWritten++; } catch {} }
                }
                summary.matchedByJsonl++;
                resolved = { flattened: flat, real };
              }
              break;
            }
          } catch {}
        }
      }

      if (!resolved) {
        summary.unknownSessions.push({ sessionId, todoFile: file, reason: 'No matching JSONL in projects and no sidecar metadata' });
      }
    }
  }

  return summary;
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
