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
  matchedByContent: number;
  matchedByEnvironment: number;
  matchedByLogFile: number;
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
    matchedByContent: 0,
    matchedByEnvironment: 0,
    matchedByLogFile: 0,
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

      // Method 3: Scan JSONL content for "Working directory:" pattern
      if (!resolved) {
        try {
          for (const flat of projectDirs) {
            const dir = path.join(projectsDir, flat);
            const jsonlPath = path.join(dir, `${sessionId}.jsonl`);
            if (fsSync.existsSync(jsonlPath)) {
              try {
                const content = await fs.readFile(jsonlPath, 'utf-8');
                const lines = content.split('\n').filter(l => l.trim());
                for (const line of lines.slice(0, 50)) { // Check first 50 lines
                  try {
                    const parsed = JSON.parse(line);
                    const text = JSON.stringify(parsed).toLowerCase();
                    if (text.includes('working directory:')) {
                      const match = text.match(/working directory:\s*([^"\\]+)/);
                      if (match && match[1]) {
                        const inferredPath = match[1].replace(/\\\\/g, '/').trim();
                        if (inferredPath && inferredPath.length > 3) {
                          const metaPath = path.join(dir, 'metadata.json');
                          if (!fsSync.existsSync(metaPath)) {
                            summary.metadataPlanned++;
                            if (!dryRun) { 
                              try { 
                                await fs.writeFile(metaPath, JSON.stringify({ path: inferredPath }, null, 2), 'utf-8'); 
                                summary.metadataWritten++; 
                              } catch {} 
                            }
                          }
                          summary.matchedByContent++;
                          resolved = { flattened: flat, real: inferredPath };
                          break;
                        }
                      }
                    }
                  } catch {}
                  if (resolved) break;
                }
              } catch {}
              if (resolved) break;
            }
          }
        } catch {}
      }

      // Method 4: Check environment variables in JSONL for cwd/pwd
      if (!resolved) {
        try {
          for (const flat of projectDirs) {
            const dir = path.join(projectsDir, flat);
            const jsonlPath = path.join(dir, `${sessionId}.jsonl`);
            if (fsSync.existsSync(jsonlPath)) {
              try {
                const content = await fs.readFile(jsonlPath, 'utf-8');
                const lines = content.split('\n').filter(l => l.trim());
                for (const line of lines.slice(0, 100)) {
                  try {
                    const parsed = JSON.parse(line);
                    // Look for environment messages or cwd/pwd references
                    const text = JSON.stringify(parsed);
                    const patterns = [
                      /"cwd":\s*"([^"]+)"/,
                      /"pwd":\s*"([^"]+)"/,
                      /current working directory[^:]*:\s*([^"\\,}]+)/i,
                      /workspace[^:]*:\s*([^"\\,}]+)/i
                    ];
                    for (const pattern of patterns) {
                      const match = text.match(pattern);
                      if (match && match[1]) {
                        const inferredPath = match[1].replace(/\\\\/g, '/').trim();
                        if (inferredPath && inferredPath.length > 3 && !inferredPath.includes('undefined')) {
                          const metaPath = path.join(dir, 'metadata.json');
                          if (!fsSync.existsSync(metaPath)) {
                            summary.metadataPlanned++;
                            if (!dryRun) { 
                              try { 
                                await fs.writeFile(metaPath, JSON.stringify({ path: inferredPath }, null, 2), 'utf-8'); 
                                summary.metadataWritten++; 
                              } catch {} 
                            }
                          }
                          summary.matchedByEnvironment++;
                          resolved = { flattened: flat, real: inferredPath };
                          break;
                        }
                      }
                    }
                  } catch {}
                  if (resolved) break;
                }
              } catch {}
              if (resolved) break;
            }
          }
        } catch {}
      }

      // Method 5: Check logs/current_todos.json for project paths
      if (!resolved && todosDir) {
        try {
          const logsDir = path.join(path.dirname(todosDir), 'logs');
          const currentTodosPath = path.join(logsDir, 'current_todos.json');
          if (fsSync.existsSync(currentTodosPath)) {
            try {
              const content = await fs.readFile(currentTodosPath, 'utf-8');
              const data = JSON.parse(content);
              // Look for matching session ID in logs
              const text = JSON.stringify(data);
              if (text.includes(sessionId)) {
                // Try to extract project path from context around session ID
                const patterns = [
                  new RegExp(`${sessionId}[^}]*"projectPath":\s*"([^"]+)"`, 'i'),
                  new RegExp(`${sessionId}[^}]*"path":\s*"([^"]+)"`, 'i'),
                  new RegExp(`"([^"]+)"[^}]*${sessionId}`, 'i')
                ];
                for (const pattern of patterns) {
                  const match = text.match(pattern);
                  if (match && match[1]) {
                    const inferredPath = match[1].replace(/\\\\/g, '/').trim();
                    if (inferredPath && inferredPath.length > 3 && !inferredPath.includes(sessionId)) {
                      // Try to find or create the project directory
                      const flat = PathUtils.createFlattenedPath(inferredPath);
                      const projDir = path.join(projectsDir, flat);
                      if (fsSync.existsSync(projDir)) {
                        const metaPath = path.join(projDir, 'metadata.json');
                        if (!fsSync.existsSync(metaPath)) {
                          summary.metadataPlanned++;
                          if (!dryRun) { 
                            try { 
                              await fs.writeFile(metaPath, JSON.stringify({ path: inferredPath }, null, 2), 'utf-8'); 
                              summary.metadataWritten++; 
                            } catch {} 
                          }
                        }
                        summary.matchedByLogFile++;
                        resolved = { flattened: flat, real: inferredPath };
                        break;
                      }
                    }
                  }
                }
              }
            } catch {}
          }
        } catch {}
      }

      if (!resolved) {
        summary.unknownSessions.push({ sessionId, todoFile: file, reason: 'No matching found via JSONL, sidecar, content analysis, environment vars, or log files' });
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
