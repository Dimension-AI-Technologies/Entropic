import { ITodoRepository, Todo, Session } from '../models/Todo';
import { AsyncResult, Ok, Err } from '../utils/Result';

/**
 * Mock implementation of ITodoRepository for testing
 * Uses authentic-looking sample data based on real Claude Code sessions
 */
export class MockTodoRepository implements ITodoRepository {
  private sessions: Map<string, Session> = new Map();
  private readonly delay: number;

  constructor(sessions?: Session[], delayMs: number = 10) {
    this.delay = delayMs;
    
    if (sessions) {
      sessions.forEach(session => {
        this.sessions.set(session.id, session);
      });
    } else {
      // Initialize with authentic sample data
      this.initializeWithSampleData();
    }
  }

  async getAllSessions(): AsyncResult<Session[]> {
    await this.simulateDelay();
    const sessions = Array.from(this.sessions.values())
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    return Ok(sessions);
  }

  async getSession(sessionId: string): AsyncResult<Session | null> {
    await this.simulateDelay();
    const session = this.sessions.get(sessionId) || null;
    return Ok(session);
  }

  async getSessionsForProject(projectPath: string): AsyncResult<Session[]> {
    await this.simulateDelay();
    const projectSessions = Array.from(this.sessions.values())
      .filter(session => session.projectPath === projectPath)
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    return Ok(projectSessions);
  }

  async getAllTodos(): AsyncResult<Todo[]> {
    await this.simulateDelay();
    const allTodos: Todo[] = [];
    for (const session of this.sessions.values()) {
      allTodos.push(...session.todos);
    }
    return Ok(allTodos);
  }

  async getTodosForSession(sessionId: string): AsyncResult<Todo[]> {
    await this.simulateDelay();
    const session = this.sessions.get(sessionId);
    if (!session) {
      return Ok([]);
    }
    return Ok([...session.todos]); // Return copy to avoid mutation
  }

  async saveTodosForSession(sessionId: string, todos: Todo[]): AsyncResult<void> {
    await this.simulateDelay();
    
    let session = this.sessions.get(sessionId);
    if (!session) {
      // Create new session if it doesn't exist
      session = {
        id: sessionId,
        todos: [],
        lastModified: new Date(),
        created: new Date(),
        filePath: `${sessionId}-agent-${sessionId}.json`
      };
      this.sessions.set(sessionId, session);
    }

    // Update session with new todos
    session.todos = [...todos]; // Store copy to avoid mutation
    session.lastModified = new Date();
    
    return Ok(undefined);
  }

  async sessionExists(sessionId: string): AsyncResult<boolean> {
    await this.simulateDelay();
    return Ok(this.sessions.has(sessionId));
  }

  getTodosDirectoryPath(): string {
    return '/mock/todos/directory';
  }

  // Test helper methods

  /**
   * Add a session to the mock repository (test helper)
   */
  addSession(session: Session): void {
    this.sessions.set(session.id, session);
  }

  /**
   * Remove a session from the mock repository (test helper)
   */
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Clear all sessions (test helper)
   */
  clear(): void {
    this.sessions.clear();
  }

  /**
   * Get count of sessions (test helper)
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Create authentic sample sessions based on real Claude Code usage patterns
   */
  static createSampleSessions(): Session[] {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    return [
      {
        id: 'current-session-123',
        todos: [
          {
            content: 'Implement MVVM architecture for todo management',
            status: 'in_progress',
            priority: 'high',
            created: oneHourAgo
          },
          {
            content: 'Write unit tests for TodosViewModel',
            status: 'pending',
            priority: 'medium',
            created: oneHourAgo
          },
          {
            content: 'Update DIContainer with todo repository',
            status: 'completed',
            priority: 'high',
            created: oneHourAgo
          }
        ],
        lastModified: now,
        created: oneHourAgo,
        filePath: 'current-session-123-agent-current-session-123.json',
        projectPath: '/Users/doowell2/Source/repos/DT/Entropic'
      },
      {
        id: 'previous-session-456',
        todos: [
          {
            content: 'Fix project loading to show all 12 projects',
            status: 'completed',
            priority: 'high',
            created: oneDayAgo
          },
          {
            content: 'Create ProjectsViewModel with comprehensive tests',
            status: 'completed',
            priority: 'high', 
            created: oneDayAgo
          }
        ],
        lastModified: oneDayAgo,
        created: oneDayAgo,
        filePath: 'previous-session-456-agent-previous-session-456.json',
        projectPath: '/Users/doowell2/Source/repos/DT/Entropic'
      },
      {
        id: 'macron-session-789',
        todos: [
          {
            content: 'Implement F# GARCH parameter renaming',
            status: 'completed',
            priority: 'medium',
            created: fourDaysAgo
          },
          {
            content: 'Update build configuration',
            status: 'completed',
            priority: 'low',
            created: fourDaysAgo
          }
        ],
        lastModified: fourDaysAgo,
        created: fourDaysAgo,
        filePath: 'macron-session-789-agent-macron-session-789.json',
        projectPath: '/Users/doowell2/Source/repos/DT/MacroN'
      },
      {
        id: 'empty-session-000',
        todos: [],
        lastModified: threeDaysAgo,
        created: threeDaysAgo,
        filePath: 'empty-session-000-agent-empty-session-000.json'
      }
    ];
  }

  private initializeWithSampleData(): void {
    const sampleSessions = MockTodoRepository.createSampleSessions();
    sampleSessions.forEach(session => {
      this.sessions.set(session.id, session);
    });
  }

  private async simulateDelay(): Promise<void> {
    if (this.delay > 0) {
      return new Promise(resolve => setTimeout(resolve, this.delay));
    }
  }
}