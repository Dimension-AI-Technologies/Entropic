// EXEMPTION: exceptions - test utility functions don't need Result<T>
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ProjectsViewModel } from '../viewmodels/ProjectsViewModel';
import { TodosViewModel } from '../viewmodels/TodosViewModel';
import { IProjectRepository, Project } from '../models/Project';
import { ITodoRepository, Todo, Session } from '../models/Todo';
import { AsyncResult, Ok, Err } from '../utils/Result';

// Simple in-memory implementations for testing
class InMemoryProjectRepository implements IProjectRepository {
  private projects: Project[] = [];

  constructor(initialProjects: Project[] = []) {
    this.projects = [...initialProjects];
  }

  async getAllProjects(): AsyncResult<Project[]> {
    return Ok([...this.projects]);
  }

  async getProject(id: string): AsyncResult<Project | null> {
    const project = this.projects.find(p => p.id === id);
    return Ok(project || null);
  }

  async projectExists(id: string): AsyncResult<boolean> {
    const exists = this.projects.some(p => p.id === id);
    return Ok(exists);
  }

  static createSampleProjects(): Project[] {
    return [
      {
        id: 'entropic-project',
        path: '/Users/doowell2/Source/repos/DT/Entropic',
        flattenedDir: '-Users-doowell2-Source-repos-DT-Entropic',
        pathExists: true,
        lastModified: new Date('2024-01-15T10:30:00Z')
      },
      {
        id: 'macron-project',
        path: '/Users/doowell2/Source/repos/DT/MacroN',
        flattenedDir: '-Users-doowell2-Source-repos-DT-MacroN',
        pathExists: true,
        lastModified: new Date('2024-01-13T11:20:00Z')
      },
      {
        id: 'missing-project',
        path: '/Users/doowell2/NonExistent/Project',
        flattenedDir: '-Users-doowell2-NonExistent-Project',
        pathExists: false,
        lastModified: new Date('2024-01-10T08:00:00Z')
      }
    ];
  }
}

class InMemoryTodoRepository implements ITodoRepository {
  private sessions: Session[] = [];

  constructor(initialSessions: Session[] = []) {
    this.sessions = [...initialSessions];
  }

  async getAllSessions(): AsyncResult<Session[]> {
    return Ok([...this.sessions]);
  }

  async getSession(sessionId: string): AsyncResult<Session | null> {
    const session = this.sessions.find(s => s.id === sessionId);
    return Ok(session || null);
  }

  async getSessionsForProject(projectPath: string): AsyncResult<Session[]> {
    const projectSessions = this.sessions.filter(s => s.projectPath === projectPath);
    return Ok([...projectSessions]);
  }

  async getAllTodos(): AsyncResult<Todo[]> {
    const allTodos = this.sessions.flatMap(s => s.todos);
    return Ok([...allTodos]);
  }

  async getTodosForSession(sessionId: string): AsyncResult<Todo[]> {
    const session = this.sessions.find(s => s.id === sessionId);
    return Ok(session ? [...session.todos] : []);
  }

  async saveTodosForSession(sessionId: string, todos: Todo[]): AsyncResult<void> {
    const session = this.sessions.find(s => s.id === sessionId);
    if (session) {
      session.todos = [...todos];
      session.lastModified = new Date();
    } else {
      this.sessions.push({
        id: sessionId,
        todos: [...todos],
        lastModified: new Date(),
        created: new Date(),
        filePath: `${sessionId}.json`
      });
    }
    return Ok(undefined);
  }

  async sessionExists(sessionId: string): AsyncResult<boolean> {
    const exists = this.sessions.some(s => s.id === sessionId);
    return Ok(exists);
  }

  getTodosDirectoryPath(): string {
    return '/tmp/test-todos';
  }

  static createSampleSessions(): Session[] { // EXEMPTION: test utility factory
    return [
      {
        id: 'current-session-123',
        todos: [
          {
            content: 'Implement MVVM architecture for todo management',
            status: 'in_progress',
            priority: 'high'
          },
          {
            content: 'Add comprehensive unit tests for ViewModels',
            status: 'pending',
            priority: 'medium'
          },
          {
            content: 'Set up dependency injection container',
            status: 'completed',
            priority: 'high'
          }
        ],
        lastModified: new Date('2024-01-15T10:30:00Z'),
        created: new Date('2024-01-15T09:00:00Z'),
        filePath: 'current-session-123-agent-current-session-123.json',
        projectPath: '/Users/doowell2/Source/repos/DT/Entropic'
      },
      {
        id: 'previous-session-456',
        todos: [
          {
            content: 'Refactor existing todo management code',
            status: 'completed',
            priority: 'medium'
          },
          {
            content: 'Design project data models',
            status: 'completed',
            priority: 'high'
          }
        ],
        lastModified: new Date('2024-01-14T15:45:00Z'),
        created: new Date('2024-01-14T14:00:00Z'),
        filePath: 'previous-session-456-agent-previous-session-456.json',
        projectPath: '/Users/doowell2/Source/repos/DT/Entropic'
      },
      {
        id: 'macron-session-789',
        todos: [
          {
            content: 'Implement GARCH model estimation',
            status: 'in_progress',
            priority: 'high'
          },
          {
            content: 'Add F# interop for statistical functions',
            status: 'pending',
            priority: 'low'
          }
        ],
        lastModified: new Date('2024-01-13T11:20:00Z'),
        created: new Date('2024-01-13T10:00:00Z'),
        filePath: 'macron-session-789-agent-macron-session-789.json',
        projectPath: '/Users/doowell2/Source/repos/DT/MacroN'
      }
    ];
  }
}

describe('Project-Todo MVVM Integration', () => {
  let projectsViewModel: ProjectsViewModel;
  let todosViewModel: TodosViewModel;
  let projectRepository: InMemoryProjectRepository;
  let todoRepository: InMemoryTodoRepository;

  beforeEach(() => {
    const sampleProjects = InMemoryProjectRepository.createSampleProjects();
    const sampleSessions = InMemoryTodoRepository.createSampleSessions();

    projectRepository = new InMemoryProjectRepository(sampleProjects);
    todoRepository = new InMemoryTodoRepository(sampleSessions);

    projectsViewModel = new ProjectsViewModel(projectRepository);
    todosViewModel = new TodosViewModel(todoRepository);
  });

  describe('ViewModels integration', () => {
    it('should load projects and sessions independently', async () => {
      const projectsResult = await projectsViewModel.loadProjects();
      const sessionsResult = await todosViewModel.loadSessions();

      expect(projectsResult.success).toBe(true);
      expect(sessionsResult.success).toBe(true);

      if (projectsResult.success && sessionsResult.success) {
        expect(projectsResult.value.length).toBeGreaterThan(0);
        expect(sessionsResult.value.length).toBeGreaterThan(0);
      }
    });

    it('should filter sessions by project path', async () => {
      await projectsViewModel.loadProjects();
      await todosViewModel.loadSessions();

      const projects = projectsViewModel.getProjects();
      const entropicProject = projects.find(p => p.path.includes('Entropic'));

      if (entropicProject) {
        const entropicSessions = todosViewModel.getSessionsForProject(entropicProject.path);
        expect(entropicSessions.length).toBeGreaterThan(0);
        
        // Verify all returned sessions are for the correct project
        entropicSessions.forEach(session => {
          expect(session.projectPath).toBe(entropicProject.path);
        });
      }
    });

    it('should provide project and session statistics', async () => {
      await projectsViewModel.loadProjects();
      await todosViewModel.loadSessions();

      // Project statistics
      const projectCount = projectsViewModel.getProjectCount();
      const existingProjectCount = projectsViewModel.getExistingProjectCount();
      
      expect(projectCount).toBeGreaterThan(0);
      expect(existingProjectCount).toBeGreaterThanOrEqual(0);
      expect(existingProjectCount).toBeLessThanOrEqual(projectCount);

      // Session and todo statistics
      const sessionCount = todosViewModel.getSessionCount();
      const todoCount = todosViewModel.getTotalTodoCount();
      const statusCounts = todosViewModel.getTodoStatusCounts();
      
      expect(sessionCount).toBeGreaterThan(0);
      expect(todoCount).toBeGreaterThan(0);
      expect(statusCounts.completed + statusCounts.in_progress + statusCounts.pending).toBe(todoCount);
    });

    it('should handle error states gracefully', async () => {
      // Create repositories that will fail
      const failingProjectRepo = new InMemoryProjectRepository([]);
      failingProjectRepo.getAllProjects = async () => ({
        success: false,
        error: 'Project repository failed'
      });

      const failingTodoRepo = new InMemoryTodoRepository([]);
      failingTodoRepo.getAllSessions = async () => ({
        success: false,
        error: 'Todo repository failed'
      });

      const failingProjectsVM = new ProjectsViewModel(failingProjectRepo);
      const failingTodosVM = new TodosViewModel(failingTodoRepo);

      const projectsResult = await failingProjectsVM.loadProjects();
      const sessionsResult = await failingTodosVM.loadSessions();

      expect(projectsResult.success).toBe(false);
      expect(sessionsResult.success).toBe(false);
      expect(failingProjectsVM.getError()).toBe('Project repository failed');
      expect(failingTodosVM.getError()).toBe('Todo repository failed');
    });

    it('should maintain independent loading states', async () => {
      // Test that one ViewModel loading doesn't affect the other
      expect(projectsViewModel.getIsLoading()).toBe(false);
      expect(todosViewModel.isLoading()).toBe(false);

      const projectsPromise = projectsViewModel.loadProjects();
      const sessionsPromise = todosViewModel.loadSessions();

      // Both should be loading independently
      await Promise.all([projectsPromise, sessionsPromise]);

      expect(projectsViewModel.getIsLoading()).toBe(false);
      expect(todosViewModel.isLoading()).toBe(false);
    });
  });

  describe('Simple repository testing', () => {
    it('should create different repository instances for isolation', () => {
      const repo1 = new InMemoryProjectRepository([]);
      const repo2 = new InMemoryProjectRepository([]);
      const todoRepo1 = new InMemoryTodoRepository([]);
      const todoRepo2 = new InMemoryTodoRepository([]);

      expect(repo1).not.toBe(repo2); // Different instances
      expect(todoRepo1).not.toBe(todoRepo2); // Different instances
    });

    it('should work with different data sets', async () => {
      const emptyProjectRepo = new InMemoryProjectRepository([]);
      const emptyTodoRepo = new InMemoryTodoRepository([]);

      const emptyProjectsVM = new ProjectsViewModel(emptyProjectRepo);
      const emptyTodosVM = new TodosViewModel(emptyTodoRepo);

      const projectsResult = await emptyProjectsVM.loadProjects();
      const sessionsResult = await emptyTodosVM.loadSessions();

      expect(projectsResult.success).toBe(true);
      expect(sessionsResult.success).toBe(true);

      if (projectsResult.success) {
        expect(projectsResult.value).toHaveLength(0);
      }
      if (sessionsResult.success) {
        expect(sessionsResult.value).toHaveLength(0);
      }
    });
  });

  describe('Real-world workflow simulation', () => {
    it('should simulate project selection and todo viewing workflow', async () => {
      // Load all data
      await projectsViewModel.loadProjects();
      await todosViewModel.loadSessions();

      // Get a project with sessions
      const projects = projectsViewModel.getProjects();
      const projectWithSessions = projects.find(project => {
        const sessions = todosViewModel.getSessionsForProject(project.path);
        return sessions.length > 0;
      });

      if (projectWithSessions) {
        // Get sessions for selected project
        const sessions = todosViewModel.getSessionsForProject(projectWithSessions.path);
        expect(sessions.length).toBeGreaterThan(0);

        // Get todos for first session
        const firstSession = sessions[0];
        const todos = todosViewModel.getTodosForSession(firstSession.id);
        
        // Should be able to get todos (could be empty)
        expect(Array.isArray(todos)).toBe(true);

        // Filter todos by status
        const allTodos = todosViewModel.getAllTodos();
        const completedTodos = todosViewModel.getTodosByStatus('completed');
        const pendingTodos = todosViewModel.getTodosByStatus('pending');
        const inProgressTodos = todosViewModel.getTodosByStatus('in_progress');

        expect(completedTodos.every(t => t.status === 'completed')).toBe(true);
        expect(pendingTodos.every(t => t.status === 'pending')).toBe(true);
        expect(inProgressTodos.every(t => t.status === 'in_progress')).toBe(true);
        
        // Total should match
        expect(completedTodos.length + pendingTodos.length + inProgressTodos.length).toBe(allTodos.length);
      }
    });

    it('should handle session-based todo management', async () => {
      await todosViewModel.loadSessions();

      // Get a session to test with
      const sessions = todosViewModel.getSessions();
      if (sessions.length > 0) {
        const testSession = sessions[0];
        const originalTodos = todosViewModel.getTodosForSession(testSession.id);

        // Test save operation
        const newTodos = [
          { content: 'Integration test todo', status: 'pending' as const, priority: 'medium' as const },
          { content: 'Another test todo', status: 'completed' as const, priority: 'low' as const }
        ];

        const saveResult = await todosViewModel.saveTodosForSession(testSession.id, newTodos);
        expect(saveResult.success).toBe(true);

        // Verify todos were saved locally
        const updatedTodos = todosViewModel.getTodosForSession(testSession.id);
        expect(updatedTodos).toHaveLength(2);
        expect(updatedTodos[0].content).toBe('Integration test todo');
        expect(updatedTodos[1].content).toBe('Another test todo');
      }
    });
  });
});