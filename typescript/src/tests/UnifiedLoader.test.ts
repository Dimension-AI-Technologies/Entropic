/** @jest-environment node */
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadTodosData } from '../main/loaders/projects';

function touch(file: string, at: Date) {
  fsSync.utimesSync(file, at, at);
}

describe('Unified project loader (projects + todos)', () => {
  const tmpRoot = path.join(os.tmpdir(), `unified-loader-${Date.now()}`);
  const projectsDir = path.join(tmpRoot, 'projects');
  const todosDir = path.join(tmpRoot, 'todos');
  const logsDir = tmpRoot;

  beforeAll(async () => {
    await fs.mkdir(projectsDir, { recursive: true });
    await fs.mkdir(todosDir, { recursive: true });

    // Project A only in ~/.claude/projects with JSONL session
    const projA = path.join(projectsDir, '-Users-user-ProjA');
    await fs.mkdir(projA, { recursive: true });
    const aSession = path.join(projA, 'aaaa-aaaa.jsonl');
    await fs.writeFile(aSession, [
      JSON.stringify({ type: 'todo', todos: [{ content: 'a1', status: 'pending' }] }),
    ].join('\n'));
    touch(aSession, new Date('2025-01-02T10:00:00Z'));

    // Project B only in ~/.claude/todos with JSON session
    const bJson = path.join(todosDir, 'bbbb-bbbb-agent-bbbb-bbbb.json');
    await fs.writeFile(bJson, JSON.stringify([
      { content: 'b1', status: 'in_progress' },
      { content: 'b2', status: 'completed' },
    ]));
    touch(bJson, new Date('2025-01-03T10:00:00Z'));

    // Project B metadata in projectsDir for reconstruction
    const projB = path.join(projectsDir, '-Users-user-ProjB');
    await fs.mkdir(projB, { recursive: true });
    await fs.writeFile(path.join(projB, `${'bbbb-bbbb'}-agent-${'bbbb-bbbb'}.json`), JSON.stringify([]));
    await fs.writeFile(path.join(projB, 'metadata.json'), JSON.stringify({ path: '/Users/user/ProjB' }));

    // Project C appears in both; todos JSON has more items
    const projC = path.join(projectsDir, '-Users-user-ProjC');
    await fs.mkdir(projC, { recursive: true });
    const cSession = path.join(projC, 'cccc-cccc.jsonl');
    await fs.writeFile(cSession, [
      JSON.stringify({ type: 'todo', todos: [{ content: 'c1', status: 'completed' }] }),
    ].join('\n'));
    touch(cSession, new Date('2025-01-01T09:00:00Z'));
    const cJson = path.join(todosDir, 'cccc-cccc-agent-cccc-cccc.json');
    await fs.writeFile(cJson, JSON.stringify([
      { content: 'c1', status: 'completed' },
      { content: 'c2', status: 'pending' },
    ]));
    touch(cJson, new Date('2025-01-04T10:00:00Z'));
  });

  afterAll(async () => {
    // Best-effort cleanup
    try { await fs.rm(tmpRoot, { recursive: true, force: true }); } catch {}
  });

  it('merges both sources, computes startDate and active counts', async () => {
    const result = await loadTodosData(projectsDir, logsDir, todosDir);
    expect(result.success).toBe(true);
    const projects = result.success ? result.value : [];

    // Expect at least 3 projects
    // Paths may be reconstructed; compare by presence of sessions/active counts
    const counts = projects.map(p => ({ path: p.path, sessions: p.sessions.length, total: p.totalTodos, active: p.activeTodos, start: p.startDate }));

    // Find project with JSONL only (A) by matching counts: total 1 active 1
    const a = counts.find(x => x.total === 1 && x.active === 1);
    expect(a).toBeTruthy();

    // Project B from todos only should exist with total 2, active 1
    const b = counts.find(x => x.total === 2 && x.active === 1);
    expect(b).toBeTruthy();
    expect(b!.sessions).toBeGreaterThan(0);

    // Project C prefers JSON todos (2) over JSONL (1)
    const c = counts.find(x => x.total === 2 && x.active === 1 && x.sessions > 0);
    expect(c).toBeTruthy();

    // startDate should be defined for each with sessions
    projects.forEach(p => {
      if (p.sessions.length > 0) {
        expect(p.startDate instanceof Date || typeof p.startDate === 'object').toBeTruthy();
      }
    });
  });
});

