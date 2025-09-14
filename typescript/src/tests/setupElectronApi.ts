// Jest setup: provide a minimal electronAPI for renderer tests
(global as any).window = (global as any).window || {};
const store: { projects: any[] } = { projects: [] };

(window as any).electronAPI = {
  getTodos: async () => store.projects,
  onTodoFilesChanged: (_cb: any) => () => {},
};

// Helper to set mock projects for tests
(global as any).setMockProjects = (projects: any[]) => { store.projects = projects || []; };

