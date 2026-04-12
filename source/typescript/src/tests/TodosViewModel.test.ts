import { describe, it, expect, beforeEach } from '@jest/globals';
import { TodosViewModel } from '../viewmodels/TodosViewModel';
import { Todo, Session, ITodoRepository } from '../models/Todo';
import { AsyncResult, Ok, Err } from '../utils/Result';

// Simple in-memory todo repository for testing
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
      // Create new session if it doesn't exist
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

  // Test helper methods
  addSession(session: Session): void {
    this.sessions.push(session);
  }

  clear(): void {
    this.sessions = [];
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
        id: 'empty-session-000',
        todos: [],
        lastModified: new Date('2024-01-13T16:00:00Z'),
        created: new Date('2024-01-13T16:00:00Z'),
        filePath: 'empty-session-000-agent-empty-session-000.json'
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
        lastModified: new Date('2024-01-12T11:20:00Z'),
        created: new Date('2024-01-12T10:00:00Z'),
        filePath: 'macron-session-789-agent-macron-session-789.json',
        projectPath: '/Users/doowell2/Source/repos/DT/MacroN'
      }
    ];
  }
}

describe('TodosViewModel', () => {
  let viewModel: TodosViewModel;
  let mockRepository: InMemoryTodoRepository;
  let sampleSessions: Session[];

  beforeEach(() => {
    sampleSessions = InMemoryTodoRepository.createSampleSessions();
    mockRepository = new InMemoryTodoRepository(sampleSessions);
    viewModel = new TodosViewModel(mockRepository);
  });

  describe('loadSessions', () => {
    it('should load all sessions from repository', async () => {
      const result = await viewModel.loadSessions();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(4); // Based on sample data
        expect(viewModel.getSessions()).toHaveLength(4);
      }
    });

    it('should handle repository errors gracefully', async () => {
      // Create a repository that will fail
      const failingRepository = new InMemoryTodoRepository([]);
      failingRepository.getAllSessions = async () => ({
        success: false,
        error: 'Repository connection failed'
      });

      const failingViewModel = new TodosViewModel(failingRepository);
      const result = await failingViewModel.loadSessions();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Repository connection failed');
      expect(failingViewModel.hasError()).toBe(true);
      expect(failingViewModel.getError()).toBe('Repository connection failed');
    });

    it('should set loading state during operation', async () => {
      expect(viewModel.isLoading()).toBe(false);
      
      const loadPromise = viewModel.loadSessions();
      expect(viewModel.isLoading()).toBe(true);
      
      await loadPromise;
      expect(viewModel.isLoading()).toBe(false);
    });

    it('should clear errors on successful load', async () => {
      // Force an error first
      viewModel['error'] = 'Previous error';
      
      const result = await viewModel.loadSessions();
      
      expect(result.success).toBe(true);
      expect(viewModel.hasError()).toBe(false);
      expect(viewModel.getError()).toBe(null);
    });
  });

  describe('session access methods', () => {
    beforeEach(async () => {
      await viewModel.loadSessions();
    });

    it('should return all sessions', async () => {
      const sessions = viewModel.getSessions();
      expect(sessions).toHaveLength(4);
      expect(sessions[0].id).toBe('current-session-123'); // Most recent first
    });

    it('should return immutable session array', async () => {
      const sessions1 = viewModel.getSessions();
      const sessions2 = viewModel.getSessions();
      
      expect(sessions1).not.toBe(sessions2); // Different array references
      expect(sessions1).toEqual(sessions2); // Same content
    });

    it('should find session by ID', async () => {
      const session = viewModel.getSessionById('current-session-123');
      
      expect(session).not.toBeNull();
      expect(session?.id).toBe('current-session-123');
      expect(session?.todos).toHaveLength(3);
    });

    it('should return null for non-existent session ID', async () => {
      const session = viewModel.getSessionById('non-existent-session');
      expect(session).toBeNull();
    });
  });

  describe('project filtering', () => {
    beforeEach(async () => {
      await viewModel.loadSessions();
    });

    it('should filter sessions by project path', async () => {
      const entropicSessions = viewModel.getSessionsForProject('/Users/doowell2/Source/repos/DT/Entropic');
      
      expect(entropicSessions).toHaveLength(2); // current-session-123 and previous-session-456
      expect(entropicSessions.every(s => s.projectPath === '/Users/doowell2/Source/repos/DT/Entropic')).toBe(true);
    });

    it('should return empty array for project with no sessions', async () => {
      const sessions = viewModel.getSessionsForProject('/Users/doowell2/NonExistent');
      expect(sessions).toHaveLength(0);
    });

    it('should handle sessions without project paths', async () => {
      const allSessions = viewModel.getSessions();
      const sessionWithoutProject = allSessions.find(s => !s.projectPath);
      
      expect(sessionWithoutProject).toBeDefined();
      expect(sessionWithoutProject?.id).toBe('empty-session-000');
    });
  });

  describe('todo management', () => {
    beforeEach(async () => {
      await viewModel.loadSessions();
    });

    it('should get all todos from all sessions', async () => {
      const todos = viewModel.getAllTodos();
      
      // current-session-123: 3 todos, previous-session-456: 2 todos, macron-session-789: 2 todos, empty-session-000: 0 todos
      expect(todos).toHaveLength(7);
    });

    it('should get todos for specific session', async () => {
      const todos = viewModel.getTodosForSession('current-session-123');
      
      expect(todos).toHaveLength(3);
      expect(todos[0].content).toBe('Implement MVVM architecture for todo management');
      expect(todos[0].status).toBe('in_progress');
    });

    it('should return empty array for non-existent session', async () => {
      const todos = viewModel.getTodosForSession('non-existent');
      expect(todos).toHaveLength(0);
    });

    it('should filter todos by status', async () => {
      const completedTodos = viewModel.getTodosByStatus('completed');
      const inProgressTodos = viewModel.getTodosByStatus('in_progress');
      const pendingTodos = viewModel.getTodosByStatus('pending');
      
      expect(completedTodos.length).toBeGreaterThan(0);
      expect(inProgressTodos.length).toBeGreaterThan(0);
      expect(pendingTodos.length).toBeGreaterThan(0);
      
      expect(completedTodos.every(t => t.status === 'completed')).toBe(true);
      expect(inProgressTodos.every(t => t.status === 'in_progress')).toBe(true);
      expect(pendingTodos.every(t => t.status === 'pending')).toBe(true);
    });

    it('should filter todos by priority', async () => {
      const highPriorityTodos = viewModel.getTodosByPriority('high');
      const mediumPriorityTodos = viewModel.getTodosByPriority('medium');
      const lowPriorityTodos = viewModel.getTodosByPriority('low');
      
      expect(highPriorityTodos.every(t => t.priority === 'high')).toBe(true);
      expect(mediumPriorityTodos.every(t => t.priority === 'medium')).toBe(true);
      expect(lowPriorityTodos.every(t => t.priority === 'low')).toBe(true);
    });
  });

  describe('session statistics', () => {
    beforeEach(async () => {
      await viewModel.loadSessions();
    });

    it('should count total sessions', async () => {
      expect(viewModel.getSessionCount()).toBe(4);
    });

    it('should count sessions with todos', async () => {
      expect(viewModel.getSessionsWithTodosCount()).toBe(3); // excluding empty-session-000
    });

    it('should count empty sessions', async () => {
      expect(viewModel.getEmptySessionsCount()).toBe(1); // empty-session-000
    });

    it('should count total todos', async () => {
      expect(viewModel.getTotalTodoCount()).toBe(7);
    });

    it('should count todos by status', async () => {
      const statusCounts = viewModel.getTodoStatusCounts();
      
      expect(statusCounts.completed).toBeGreaterThan(0);
      expect(statusCounts.in_progress).toBeGreaterThan(0);
      expect(statusCounts.pending).toBeGreaterThan(0);
      expect(statusCounts.completed + statusCounts.in_progress + statusCounts.pending).toBe(7);
    });
  });

  describe('session sorting', () => {
    beforeEach(async () => {
      await viewModel.loadSessions();
    });

    it('should sort sessions by date (most recent first)', async () => {
      const sessions = viewModel.getSessionsSortedByDate();
      
      expect(sessions).toHaveLength(4);
      expect(sessions[0].id).toBe('current-session-123'); // Most recent
      expect(sessions[3].id).toBe('macron-session-789'); // Oldest
      
      // Verify sorting order
      for (let i = 0; i < sessions.length - 1; i++) {
        expect(sessions[i].lastModified.getTime()).toBeGreaterThanOrEqual(
          sessions[i + 1].lastModified.getTime()
        );
      }
    });

    it('should sort sessions by todo count (most todos first)', async () => {
      const sessions = viewModel.getSessionsSortedByTodoCount();
      
      expect(sessions).toHaveLength(4);
      expect(sessions[0].todos.length).toBeGreaterThanOrEqual(sessions[1].todos.length);
      expect(sessions[1].todos.length).toBeGreaterThanOrEqual(sessions[2].todos.length);
      expect(sessions[2].todos.length).toBeGreaterThanOrEqual(sessions[3].todos.length);
    });
  });

  describe('todo mutation operations', () => {
    beforeEach(async () => {
      await viewModel.loadSessions();
    });

    it('should save todos for session', async () => {
      const sessionId = 'current-session-123';
      const newTodos: Todo[] = [
        {
          content: 'New todo item',
          status: 'pending',
          priority: 'medium'
        }
      ];
      
      const result = await viewModel.saveTodosForSession(sessionId, newTodos);
      
      expect(result.success).toBe(true);
      
      // Verify the todos were saved
      const updatedTodos = viewModel.getTodosForSession(sessionId);
      expect(updatedTodos).toHaveLength(1);
      expect(updatedTodos[0].content).toBe('New todo item');
    });

    it('should handle save errors gracefully', async () => {
      // Create a repository that will fail on save
      const failingRepository = new InMemoryTodoRepository([]);
      failingRepository.saveTodosForSession = async () => ({
        success: false,
        error: 'Save operation failed'
      });

      const failingViewModel = new TodosViewModel(failingRepository);
      const result = await failingViewModel.saveTodosForSession('test', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Save operation failed');
    });
  });

  describe('error handling', () => {
    it('should track and clear errors', async () => {
      expect(viewModel.hasError()).toBe(false);
      expect(viewModel.getError()).toBe(null);
      
      // Force an error
      const failingRepository = new InMemoryTodoRepository([]);
      failingRepository.getAllSessions = async () => ({
        success: false,
        error: 'Test error'
      });

      const failingViewModel = new TodosViewModel(failingRepository);
      await failingViewModel.loadSessions();
      
      expect(failingViewModel.hasError()).toBe(true);
      expect(failingViewModel.getError()).toBe('Test error');
    });
  });

  describe('refresh functionality', () => {
    it('should reload sessions when refreshed', async () => {
      // Load initial data
      await viewModel.loadSessions();
      expect(viewModel.getSessionCount()).toBe(4);
      
      // Modify repository data
      mockRepository.clear();
      mockRepository.addSession({
        id: 'new-session',
        todos: [{ content: 'New todo', status: 'pending' }],
        lastModified: new Date(),
        created: new Date(),
        filePath: 'new-session.json'
      });
      
      // Refresh should pick up the changes
      const result = await viewModel.refresh();
      
      expect(result.success).toBe(true);
      expect(viewModel.getSessionCount()).toBe(1);
      expect(viewModel.getSessionById('new-session')).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty repository', async () => {
      const emptyRepository = new InMemoryTodoRepository([]);
      const emptyViewModel = new TodosViewModel(emptyRepository);

      const result = await emptyViewModel.loadSessions();

      expect(result.success).toBe(true);
      expect(emptyViewModel.getSessionCount()).toBe(0);
      expect(emptyViewModel.getAllTodos()).toHaveLength(0);
    });

    it('should handle sessions with same modification time', async () => {
      const sameTime = new Date();
      const sessions: Session[] = [
        {
          id: 'session-1',
          todos: [],
          lastModified: sameTime,
          created: sameTime,
          filePath: 'session-1.json'
        },
        {
          id: 'session-2', 
          todos: [],
          lastModified: sameTime,
          created: sameTime,
          filePath: 'session-2.json'
        }
      ];
      
      const sameTimeRepository = new InMemoryTodoRepository(sessions);
      const sameTimeViewModel = new TodosViewModel(sameTimeRepository);
      
      await sameTimeViewModel.loadSessions();
      
      expect(sameTimeViewModel.getSessionCount()).toBe(2);
      // Should handle same timestamps gracefully
      const sortedSessions = sameTimeViewModel.getSessionsSortedByDate();
      expect(sortedSessions).toHaveLength(2);
    });
  });
});