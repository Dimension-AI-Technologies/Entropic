// @must_test(REQ-ARC-003)
// EXEMPTION: exceptions - DI container getters and utilities don't need Result<T>
// Proper MVVM dependency injection: wires IPC repositories with ViewModels.
import { dlog } from '../utils/log';
import { ProjectsViewModel } from '../viewmodels/ProjectsViewModel';
import { TodosViewModel } from '../viewmodels/TodosViewModel';
import { IPCProjectRepository } from '../repositories/IPCProjectRepository';
import { IPCTodoRepository } from '../repositories/IPCTodoRepository';

// Global provider allow-list controlled by title bar toggles.
// Shared by reference with the IPC repositories so filter changes take effect on next refresh.
const providerAllow: Record<string, boolean> = { claude: true, codex: true, gemini: true };
export function setProviderAllow(next: Partial<Record<string, boolean>>) {
  Object.assign(providerAllow, next || {});
  console.log('[DIContainer] Provider filters updated:', providerAllow);
}

/**
 * Dependency injection container for MVVM architecture.
 * Wires IPC repositories (renderer-side) with proper ViewModels.
 * Follows garage-project scale - simple but testable.
 */
export class DIContainer {
  private static instance: DIContainer;
  private projectsViewModel: ProjectsViewModel;
  private todosViewModel: TodosViewModel;

  private constructor() {
    dlog('[DIContainer] MVVM container initializing');

    const projectRepo = new IPCProjectRepository(providerAllow);
    const todoRepo = new IPCTodoRepository(providerAllow);

    this.projectsViewModel = new ProjectsViewModel(projectRepo);
    this.todosViewModel = new TodosViewModel(todoRepo);
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  getProjectsViewModel(): ProjectsViewModel {
    return this.projectsViewModel;
  }

  getTodosViewModel(): TodosViewModel {
    return this.todosViewModel;
  }
}
