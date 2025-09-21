import { DIContainer, setProviderAllow as setAllow } from '../services/DIContainer';
import { Ok } from '../utils/Result';

// Minimal mock electronAPI for provider presence and projects
(global as any).window = (global as any).window || {};
(window as any).electronAPI = {
  async getProjects() {
    return Ok([
      { provider: 'claude', projectPath: '/a', sessions: [{ provider: 'claude', sessionId: 'c1', todos: [], updatedAt: Date.now() }] },
      { provider: 'codex', projectPath: '/a', sessions: [{ provider: 'codex', sessionId: 'o1', todos: [], updatedAt: Date.now() }] },
      { provider: 'gemini', projectPath: '/b', sessions: [{ provider: 'gemini', sessionId: 'g1', todos: [], updatedAt: Date.now() }] },
    ]);
  },
  onDataChanged: (cb: () => void) => cb,
};

describe('DI provider filter', () => {
  test('projects & sessions reflect provider allow-list', async () => {
    const c = DIContainer.getInstance();
    const projectsVM: any = c.getProjectsViewModel();
    const todosVM: any = c.getTodosViewModel();

    // Baseline all true
    await projectsVM.refresh();
    await todosVM.refresh();
    expect(projectsVM.getProjects().map((p: any) => p.provider).sort()).toEqual(['claude', 'codex', 'gemini']);

    // Disable codex
    setAllow({ codex: false });
    await new Promise(r => setTimeout(r, 300));
    await projectsVM.refresh();
    await todosVM.refresh();
    expect(projectsVM.getProjects().map((p: any) => p.provider).sort()).toEqual(['claude', 'gemini']);

    // Only codex
    setAllow({ claude: false, codex: true, gemini: false });
    await new Promise(r => setTimeout(r, 300));
    await projectsVM.refresh();
    await todosVM.refresh();
    expect(projectsVM.getProjects().map((p: any) => p.provider).sort()).toEqual(['codex']);
  });
});
