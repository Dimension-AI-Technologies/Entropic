import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync, { Dirent } from 'node:fs';
import os from 'node:os';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { Ok, Err, type AsyncResult } from '../utils/Result.js';

export interface GitRepoStatus {
  name: string;
  relativePath: string;
  languages: string[];
  remoteUrl: string | null;
  lastLocalCommit: string | null;
  lastRemoteCommit: string | null;
  ahead: number;
  behind: number;
}

export interface GitCommitSummary {
  repo: string;
  relativePath: string;
  commits: Array<{
    hash: string;
    date: string;
    message: string;
    author: string;
    coAuthors: string[];
    stats: {
      additions: number;
      deletions: number;
      filesChanged: number;
    };
  }>;
}

const execFileAsync = promisify(execFile);

function asString(output: string | Buffer): string {
  return typeof output === 'string' ? output : output.toString('utf-8');
}

const EXTENSION_LANG_MAP: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.py': 'Python',
  '.rb': 'Ruby',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.swift': 'Swift',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.c': 'C',
  '.h': 'C/C++',
  '.hpp': 'C++',
  '.hh': 'C++',
  '.hxx': 'C++',
  '.php': 'PHP',
  '.scala': 'Scala',
  '.clj': 'Clojure',
  '.cljs': 'ClojureScript',
  '.edn': 'Clojure',
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.zsh': 'Shell',
  '.fish': 'Shell',
  '.ps1': 'PowerShell',
  '.psm1': 'PowerShell',
  '.pl': 'Perl',
  '.pm': 'Perl',
  '.lua': 'Lua',
  '.ex': 'Elixir',
  '.exs': 'Elixir',
  '.dart': 'Dart',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.less': 'Less',
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.toml': 'TOML',
  '.md': 'Markdown',
};

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'vendor', 'dist', 'build', '.next']);

export async function collectGitStatus(baseDir?: string): AsyncResult<GitRepoStatus[]> {
  const root = baseDir || path.join(os.homedir(), 'source', 'repos');
  try {
    const exists = fsSync.existsSync(root);
    if (!exists) {
      return Ok([]);
    }
    const repos: string[] = [];
    await findGitRepos(root, repos);

    const results: GitRepoStatus[] = [];
    for (const repoPath of repos.sort()) {
      const status = await inspectRepo(root, repoPath);
      if (status.success && status.value) {
        results.push(status.value);
      }
    }
    return Ok(results);
  } catch (error: any) {
    return Err(error?.message || 'Failed to collect git status', error);
  }
}

export async function collectCommitHistory(baseDir?: string, limit = 50): AsyncResult<GitCommitSummary[]> {
  const root = baseDir || path.join(os.homedir(), 'source', 'repos');
  try {
    const exists = fsSync.existsSync(root);
    if (!exists) return Ok([]);
    const repos: string[] = [];
    await findGitRepos(root, repos);
    const summaries: GitCommitSummary[] = [];
    for (const repoPath of repos.sort()) {
      const summary = await inspectCommits(root, repoPath, limit);
      if (summary.success && summary.value) summaries.push(summary.value);
    }
    return Ok(summaries);
  } catch (error: any) {
    return Err(error?.message || 'Failed to collect commit history', error);
  }
}

async function findGitRepos(root: string, output: string[]): Promise<void> {
  const stack: string[] = [root];
  while (stack.length) {
    const dir = stack.pop();
    if (!dir) continue;
    let entries: Dirent[] = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    const hasGit = entries.some(e => e.isDirectory() && e.name === '.git');
    if (hasGit) {
      output.push(dir);
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (IGNORED_DIRS.has(entry.name)) continue;
      stack.push(path.join(dir, entry.name));
    }
  }
}

async function inspectRepo(root: string, repoPath: string): AsyncResult<GitRepoStatus | null> {
  try {
    const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' } as NodeJS.ProcessEnv;
    const relativePath = path.relative(root, repoPath) || path.basename(repoPath);

    const name = path.basename(repoPath);
    const remoteUrl = await getRemoteUrl(repoPath, env);
    const lastLocalCommit = await getCommitDate(repoPath, 'HEAD', env);

    let upstream: string | null = null;
    try {
      const { stdout } = await execGit(repoPath, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], env);
      upstream = stdout.trim();
    } catch {
      upstream = null;
    }

    let lastRemoteCommit: string | null = null;
    let ahead = 0;
    let behind = 0;
    if (upstream) {
      try {
        await execGit(repoPath, ['fetch', '--quiet'], env);
      } catch {}
      try {
        const { stdout } = await execGit(repoPath, ['rev-list', '--left-right', '--count', `HEAD...${upstream}`], env);
        const [aheadStr, behindStr] = stdout.trim().split(/\s+/);
        const aheadNum = Number.parseInt(aheadStr, 10);
        const behindNum = Number.parseInt(behindStr, 10);
        if (!Number.isNaN(aheadNum)) ahead = aheadNum;
        if (!Number.isNaN(behindNum)) behind = behindNum;
      } catch {}
      lastRemoteCommit = await getCommitDate(repoPath, upstream, env);
    }

    const languages = await detectLanguages(repoPath, env);

    return Ok({
      name,
      relativePath,
      languages,
      remoteUrl,
      lastLocalCommit,
      lastRemoteCommit,
      ahead,
      behind,
    });
  } catch (error: any) {
    return Err(error?.message || 'Failed to inspect repo', error);
  }
}

async function inspectCommits(root: string, repoPath: string, limit: number): AsyncResult<GitCommitSummary | null> {
  try {
    const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' } as NodeJS.ProcessEnv;
    const relativePath = path.relative(root, repoPath) || path.basename(repoPath);
    const name = path.basename(repoPath);

    const format = '%H%x1f%cI%x1f%an%x1f%ae%x1f%B%x1e';
    const { stdout } = await execGit(repoPath, ['log', `-n${limit}`, `--format=${format}`], env);
    const rawCommits = asString(stdout).split('\x1e').filter(Boolean);
    const commits: GitCommitSummary['commits'] = [];

    for (const raw of rawCommits) {
      const [hashRaw, dateRaw, authorName, authorEmail, body] = raw.split('\x1f');
      const hash = (hashRaw || '').trim();
      const date = (dateRaw || '').trim();
      const trimmedBody = body || '';
      const messageLine = trimmedBody.split(/\r?\n/).find(Boolean) || '';
      const stats = await getCommitStats(repoPath, hash, env);
      const coAuthors = extractCoAuthors(trimmedBody);
      commits.push({
        hash,
        date,
        message: messageLine,
        author: `${authorName || ''}${authorEmail ? ` <${authorEmail}>` : ''}`.trim(),
        coAuthors,
        stats,
      });
    }

    return Ok({
      repo: name,
      relativePath,
      commits,
    });
  } catch (error: any) {
    return Err(error?.message || 'Failed to inspect commits', error);
  }
}

function extractCoAuthors(message: string): string[] {
  const lines = message.split(/\r?\n/);
  const coAuthors: string[] = [];
  for (const line of lines) {
    const match = line.match(/^Co-Authored-By:\s*(.+)$/i);
    if (match) {
      coAuthors.push(match[1].trim());
    }
  }
  return coAuthors;
}

async function getCommitStats(repoPath: string, hash: string, env: NodeJS.ProcessEnv) {
  try {
    const { stdout } = await execGit(repoPath, ['show', '--numstat', '--format=%H', hash], env);
    const lines = asString(stdout).split(/\r?\n/);
    let additions = 0;
    let deletions = 0;
    let filesChanged = 0;
    for (const line of lines) {
      const match = line.match(/^(\d+)\t(\d+)\t.+$/);
      if (match) {
        additions += Number(match[1]);
        deletions += Number(match[2]);
        filesChanged += 1;
      }
    }
    return { additions, deletions, filesChanged };
  } catch {
    return { additions: 0, deletions: 0, filesChanged: 0 };
  }
}

async function getRemoteUrl(repoPath: string, env: NodeJS.ProcessEnv): Promise<string | null> {
  try {
    const { stdout } = await execGit(repoPath, ['remote', 'get-url', 'origin'], env);
    return asString(stdout).trim() || null;
  } catch {
    return null;
  }
}

async function getCommitDate(repoPath: string, ref: string, env: NodeJS.ProcessEnv): Promise<string | null> {
  try {
    const { stdout } = await execGit(repoPath, ['log', '-1', '--format=%cI', ref], env);
    return asString(stdout).trim() || null;
  } catch {
    return null;
  }
}

async function detectLanguages(repoPath: string, env: NodeJS.ProcessEnv): Promise<string[]> {
  try {
    const { stdout } = await execGit(repoPath, ['ls-files'], env);
    const files = asString(stdout).split('\n').filter(Boolean);
    const counts = new Map<string, number>();
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!ext) continue;
      const language = EXTENSION_LANG_MAP[ext];
      if (!language) continue;
      counts.set(language, (counts.get(language) || 0) + 1);
    }
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 3).map(([lang]) => lang);
  } catch {
    return [];
  }
}

async function execGit(repoPath: string, args: string[], env: NodeJS.ProcessEnv) {
  return execFileAsync('git', args, { cwd: repoPath, env });
}
