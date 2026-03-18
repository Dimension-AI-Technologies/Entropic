// EXEMPTION: exceptions - test utility functions don't need Result<T>
import { Aggregator } from '../main/core/aggregator';
import type { ProviderPort, EventPort } from '../main/core/ports';
import type { Project, Session } from '../main/core/domain';
import { Ok as ok, Err as err, type Result, type AsyncResult } from '../utils/Result';

function mkSession(provider: string, id: string, updatedAt = Date.now()): Session {
  return {
    provider,
    sessionId: id,
    todos: [],
    updatedAt,
  } as Session;
}

function mkProject(provider: string, path: string, sessions: Session[] = []): Project { // EXEMPTION: test utility factory
  return {
    provider,
    projectPath: path,
    flattenedDir: path.replace(/[\\/:]/g, '-'),
    startDate: Date.now() - 1_000,
    mostRecentTodoDate: sessions.reduce((m, s) => Math.max(m, s.updatedAt ?? 0), 0),
    sessions,
    stats: { todos: sessions.length, active: sessions.length, completed: 0 },
    pathExists: true,
  } as Project;
}

describe('Aggregator', () => {
  test('merges provider results and dedupes sessions per provider/project', async () => {
    const providerA: ProviderPort = {
      id: 'claude',
      async fetchProjects() {
        return ok([
          mkProject('claude', '/alpha', [mkSession('claude', 's1'), mkSession('claude', 's2')]),
          mkProject('claude', '/beta', [mkSession('claude', 's3')]),
        ]);
      },
      watchChanges: () => () => {},
      collectDiagnostics: async () => ok({ unknownCount: 0, details: '' }),
      repairMetadata: async () => ok({ planned: 0, written: 0, unknownCount: 0 }),
    };

    const providerB: ProviderPort = {
      id: 'codex',
      async fetchProjects() {
        return ok([
          mkProject('codex', '/alpha', [mkSession('codex', 's10'), mkSession('codex', 's2')]),
          mkProject('codex', '/gamma', [mkSession('codex', 's11')]),
        ]);
      },
      watchChanges: () => () => {},
      collectDiagnostics: async () => ok({ unknownCount: 0, details: '' }),
      repairMetadata: async () => ok({ planned: 0, written: 0, unknownCount: 0 }),
    };

    let eventTriggered = 0;
    const events: EventPort = {
      dataChanged() {
        eventTriggered += 1;
      },
    };

    const aggregator = new Aggregator([providerA, providerB], events);
    const result = await aggregator.getProjects();

    expect(result.success).toBe(true);
    if (!result.success) return;

    const projects = result.value;
    const keys = projects.map((p) => `${p.provider}::${p.projectPath}`).sort();
    expect(keys).toEqual([
      'claude::/alpha',
      'claude::/beta',
      'codex::/alpha',
      'codex::/gamma',
    ]);

    const codexAlpha = projects.find((p) => p.provider === 'codex' && p.projectPath === '/alpha');
    expect(codexAlpha).toBeTruthy();
    if (!codexAlpha) return;

    const sessionKeys = new Set(codexAlpha.sessions.map((s) => `${s.provider}::${s.sessionId}`));
    expect(sessionKeys.size).toBe(codexAlpha.sessions.length);
    expect(eventTriggered).toBe(1);
  });

  test('reports error when every provider fails', async () => {
    const failing: ProviderPort = {
      id: 'gemini',
      fetchProjects: async () => err('boom'),
      watchChanges: () => () => {},
      collectDiagnostics: async () => err('boom'),
      repairMetadata: async () => err('boom'),
    };

    const aggregator = new Aggregator([failing]);
    const result = await aggregator.getProjects();

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toBe('boom');
  });
});
