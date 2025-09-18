import { Aggregator } from '../main/core/aggregator';
import type { ProviderPort, EventPort } from '../main/core/ports';
import type { Project, Session } from '../main/core/domain';

function mkSession(provider: string, id: string, updatedAt = Date.now()): Session {
  return { provider, sessionId: id, todos: [], updatedAt } as any;
}

function mkProject(provider: string, path: string, sessions: Session[] = []): Project {
  return {
    provider,
    projectPath: path,
    startDate: Date.now() - 1000,
    mostRecentTodoDate: sessions.reduce((m, s) => Math.max(m, s.updatedAt || 0), 0),
    sessions,
    stats: { todos: sessions.length, active: sessions.length },
    pathExists: true,
  } as any;
}

function ok<T>(value: T) { return { success: true as const, value }; }
function err(msg: string) { return { success: false as const, error: msg }; }

describe('Aggregator', () => {
  test('merges projects from multiple providers and dedupes sessions', async () => {
    const provA: ProviderPort = {
      id: 'claude',
      async fetchProjects() {
        return ok([
          mkProject('claude', '/p1', [mkSession('claude', 's1'), mkSession('claude', 's2')]),
          mkProject('claude', '/p2', [mkSession('claude', 's3')]),
        ]);
      },
      watchChanges: () => () => {},
      collectDiagnostics: async () => ok({ unknownCount: 0, details: '' }),
      repairMetadata: async () => ok({ planned: 0, written: 0, unknownCount: 0 }),
    };
    const provB: ProviderPort = {
      id: 'codex',
      async fetchProjects() {
        return ok([
          mkProject('codex', '/p1', [mkSession('codex', 's10'), mkSession('codex', 's2') /* collision id across providers ok */]),
          mkProject('codex', '/p3', [mkSession('codex', 's11')]),
        ]);
      },
      watchChanges: () => () => {},
      collectDiagnostics: async () => ok({ unknownCount: 0, details: '' }),
      repairMetadata: async () => ok({ planned: 0, written: 0, unknownCount: 0 }),
    };

    let eventFired = false;
    const events: EventPort = { dataChanged() { eventFired = true; } };

    const aggr = new Aggregator([provA, provB], events);
    const res = await aggr.getProjects();
    expect(res.success).toBe(true);
    if (!res.success) return;

    const projects = res.value;
    // Expect distinct entries by (provider, projectPath)
    const keys = projects.map(p => `${p.provider}::${p.projectPath}`).sort();
    expect(keys).toEqual([
      'claude::/p1', 'claude::/p2', 'codex::/p1', 'codex::/p3'
    ]);

    // Sessions deduped per (provider, sessionId) within the same project/provider
    const p1Codex = projects.find(p => p.provider === 'codex' && p.projectPath === '/p1')!;
    const ids = new Set(p1Codex.sessions.map(s => `${s.provider}::${s.sessionId}`));
    expect(ids.size).toBe(p1Codex.sessions.length);

    // EventPort fired
    expect(eventFired).toBe(true);
  });

  test('returns error if all providers fail', async () => {
    const bad: ProviderPort = {
      id: 'x',
      fetchProjects: async () => err('nope'),
      watchChanges: () => () => {},
      collectDiagnostics: async () => err('nope'),
      repairMetadata: async () => err('nope'),
    };
    const aggr = new Aggregator([bad]);
    const res = await aggr.getProjects();
    expect(res.success).toBe(false);
  });
});

