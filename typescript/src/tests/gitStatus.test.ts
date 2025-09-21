import path from 'node:path';
import os from 'node:os';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { collectGitStatus, collectCommitHistory } from '../main/gitStatus';

const runGit = (cwd: string, args: string[]) => {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
};

describe('git status collectors', () => {
  jest.setTimeout(20000);

  let rootDir: string;
  let repoDir: string;

  beforeAll(async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'entropic-gitstatus-'));
    repoDir = path.join(rootDir, 'sample-repo');
    await mkdir(repoDir, { recursive: true });

    runGit(repoDir, ['init']);
    runGit(repoDir, ['config', 'user.name', 'Test User']);
    runGit(repoDir, ['config', 'user.email', 'test@example.com']);

    const filePath = path.join(repoDir, 'index.ts');
    await writeFile(filePath, 'export const value = 42;\n');
    runGit(repoDir, ['add', '.']);
    runGit(repoDir, ['commit', '-m', 'Initial commit\n\nCo-Authored-By: Co Author <co@example.com>']);

    // Second commit with modifications
    await writeFile(filePath, 'export const value = 99;\n');
    await writeFile(path.join(repoDir, 'README.md'), '# Sample\n');
    runGit(repoDir, ['add', '.']);
    runGit(repoDir, ['commit', '-m', 'Update value']);
  });

  afterAll(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  test('collectGitStatus returns repository summary', async () => {
    const result = await collectGitStatus(rootDir);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.length).toBe(1);
    const repo = result.value[0];
    expect(repo.name).toBe('sample-repo');
    expect(repo.relativePath).toBe('sample-repo');
    expect(Array.isArray(repo.languages)).toBe(true);
    expect(repo.languages).toContain('TypeScript');
    expect(repo.lastLocalCommit).toBeTruthy();
    expect(repo.ahead).toBe(0);
    expect(repo.behind).toBe(0);
  });

  test('collectCommitHistory returns commits with stats and co-authors', async () => {
    const result = await collectCommitHistory(rootDir, 5);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.length).toBe(1);
    const repo = result.value[0];
    expect(repo.repo).toBe('sample-repo');
    expect(repo.commits.length).toBeGreaterThanOrEqual(2);
    const firstCommit = repo.commits.find(c => c.message.startsWith('Initial commit'));
    expect(firstCommit).toBeTruthy();
    if (!firstCommit) return;
    expect(firstCommit.coAuthors).toContain('Co Author <co@example.com>');
    expect(firstCommit.stats.additions).toBeGreaterThanOrEqual(1);
    expect(firstCommit.stats.filesChanged).toBeGreaterThanOrEqual(1);
  });
});
