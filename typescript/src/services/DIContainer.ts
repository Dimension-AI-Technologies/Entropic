import { IProjectRepository } from '../models/Project';
import { MockProjectRepository } from '../repositories/MockProjectRepository';
import { IPCProjectRepository } from '../repositories/IPCProjectRepository';
import { ProjectsViewModel } from '../viewmodels/ProjectsViewModel';
import { ITodoRepository } from '../models/Todo';
import { MockTodoRepository } from '../repositories/MockTodoRepository';
import { IPCTodoRepository } from '../repositories/IPCTodoRepository';
import { TodosViewModel } from '../viewmodels/TodosViewModel';
import { IChatRepository } from '../models/Chat';
import { MockChatRepository } from '../repositories/MockChatRepository';
import { IPCChatRepository } from '../repositories/IPCChatRepository';
import { ChatHistoryViewModel } from '../viewmodels/ChatHistoryViewModel';

/**
 * Simple dependency injection container for MVVM architecture
 * Follows garage-project scale - simple but testable
 */
export class DIContainer {
  private static instance: DIContainer;
  private projectRepository: IProjectRepository;
  private projectsViewModel: ProjectsViewModel;
  private todoRepository: ITodoRepository;
  private todosViewModel: TodosViewModel;
  private chatRepository: IChatRepository;
  private chatHistoryViewModel: ChatHistoryViewModel;

  private constructor() {
    console.error('[DIContainer] Constructor called');
    // Use IPC repository when running in Electron renderer, mock otherwise (for tests)
    const isElectron = typeof window !== 'undefined' && window.electronAPI;
    console.error('[DIContainer] isElectron:', isElectron, 'window.electronAPI:', typeof window !== 'undefined' ? window.electronAPI : 'no window');
    
    try {
      if (isElectron) {
        // Use IPC-based repositories in Electron renderer
        console.error('[DIContainer] Creating IPC repositories...');
        this.projectRepository = new IPCProjectRepository();
        this.todoRepository = new IPCTodoRepository();
        this.chatRepository = new IPCChatRepository();
        console.error('[DIContainer] IPC repositories created successfully');
      } else {
        // Use mock repositories for tests and non-Electron environments
        // FileSystem repositories cannot be used in browser due to Node.js dependencies
        console.error('[DIContainer] Creating Mock repositories...');
        this.projectRepository = new MockProjectRepository();
        this.todoRepository = new MockTodoRepository();
        this.chatRepository = new MockChatRepository();
        console.error('[DIContainer] Mock repositories created successfully');
      }
    } catch (error) {
      // Fallback to mock repositories instead of throwing
      console.error('[DIContainer] ERROR in repository setup. Falling back to mocks:', error);
      this.projectRepository = new MockProjectRepository();
      this.todoRepository = new MockTodoRepository();
      this.chatRepository = new MockChatRepository();
    }

    // ViewModels should always be created from whichever repositories are available
    try {
      console.error('[DIContainer] Creating ViewModels...');
      this.projectsViewModel = new ProjectsViewModel(this.projectRepository);
      console.error('[DIContainer] ProjectsViewModel created');
      this.todosViewModel = new TodosViewModel(this.todoRepository);
      console.error('[DIContainer] TodosViewModel created');
      this.chatHistoryViewModel = new ChatHistoryViewModel(this.chatRepository);
      console.error('[DIContainer] ChatHistoryViewModel created');
    } catch (error) {
      // As a last resort, create empty mocks to avoid throwing during construction
      console.error('[DIContainer] ERROR creating ViewModels. Creating with mocks:', error);
      this.projectRepository = new MockProjectRepository();
      this.todoRepository = new MockTodoRepository();
      this.chatRepository = new MockChatRepository();
      this.projectsViewModel = new ProjectsViewModel(this.projectRepository);
      this.todosViewModel = new TodosViewModel(this.todoRepository);
      this.chatHistoryViewModel = new ChatHistoryViewModel(this.chatRepository);
    }
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * Get the projects repository
   */
  getProjectRepository(): IProjectRepository {
    return this.projectRepository;
  }

  /**
   * Get the projects view model (singleton)
   */
  getProjectsViewModel(): ProjectsViewModel {
    return this.projectsViewModel;
  }

  /**
   * Get the todo repository
   */
  getTodoRepository(): ITodoRepository {
    return this.todoRepository;
  }

  /**
   * Get the todos view model (singleton)
   */
  getTodosViewModel(): TodosViewModel {
    return this.todosViewModel;
  }

  /**
   * Get the chat repository
   */
  getChatRepository(): IChatRepository {
    return this.chatRepository;
  }

  /**
   * Get the chat history view model (singleton)
   */
  getChatHistoryViewModel(): ChatHistoryViewModel {
    return this.chatHistoryViewModel;
  }

  /**
   * Override repository (useful for testing)
   */
  setProjectRepository(repository: IProjectRepository): void {
    this.projectRepository = repository;
    // Recreate ViewModel with new repository
    this.projectsViewModel = new ProjectsViewModel(repository);
  }

  /**
   * Override todo repository (useful for testing)
   */
  setTodoRepository(repository: ITodoRepository): void {
    this.todoRepository = repository;
    // Recreate ViewModel with new repository
    this.todosViewModel = new TodosViewModel(repository);
  }

  /**
   * Override chat repository (useful for testing)
   */
  setChatRepository(repository: IChatRepository): void {
    this.chatRepository = repository;
    // Recreate ViewModel with new repository
    this.chatHistoryViewModel = new ChatHistoryViewModel(repository);
  }

  /**
   * Create a test container with mock repository
   */
  static createTestContainer(): DIContainer {
    const container = new DIContainer();
    const mockProjectRepo = new MockProjectRepository(MockProjectRepository.createSampleProjects());
    const mockTodoRepo = new MockTodoRepository(MockTodoRepository.createSampleSessions());
    const mockChatRepo = new MockChatRepository(MockChatRepository.createSamplePrompts());
    container.setProjectRepository(mockProjectRepo);
    container.setTodoRepository(mockTodoRepo);
    container.setChatRepository(mockChatRepo);
    return container;
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    // Reset to the same configuration as constructor
    const isElectron = typeof window !== 'undefined' && window.electronAPI;
    
    if (isElectron) {
      this.projectRepository = new IPCProjectRepository();
      this.todoRepository = new IPCTodoRepository();
      this.chatRepository = new IPCChatRepository();
    } else {
      this.projectRepository = new MockProjectRepository();
      this.todoRepository = new MockTodoRepository();
      this.chatRepository = new MockChatRepository();
    }
    
    this.projectsViewModel = new ProjectsViewModel(this.projectRepository);
    this.todosViewModel = new TodosViewModel(this.todoRepository);
    this.chatHistoryViewModel = new ChatHistoryViewModel(this.chatRepository);
  }
}
