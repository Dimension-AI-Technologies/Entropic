import { describe, it, expect, beforeEach } from '@jest/globals';
import { DIContainer } from '../services/DIContainer';
import { MockProjectRepository } from '../repositories/MockProjectRepository';
import { MockTodoRepository } from '../repositories/MockTodoRepository';
import { ProjectsViewModel } from '../viewmodels/ProjectsViewModel';
import { TodosViewModel } from '../viewmodels/TodosViewModel';

describe('Project-Todo MVVM Integration', () => {
  let container: DIContainer;
  let projectsViewModel: ProjectsViewModel;
  let todosViewModel: TodosViewModel;

  beforeEach(() => {
    container = DIContainer.createTestContainer();
    projectsViewModel = container.getProjectsViewModel();
    todosViewModel = container.getTodosViewModel();
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
      // Create container with failing repositories
      const failingContainer = new DIContainer();
      
      const failingProjectRepo = new MockProjectRepository([]);
      failingProjectRepo.getAllProjects = async () => ({
        success: false,
        error: 'Project repository failed'
      });
      
      const failingTodoRepo = new MockTodoRepository([]);
      failingTodoRepo.getAllSessions = async () => ({
        success: false,
        error: 'Todo repository failed'
      });

      failingContainer.setProjectRepository(failingProjectRepo);
      failingContainer.setTodoRepository(failingTodoRepo);

      const failingProjectsVM = failingContainer.getProjectsViewModel();
      const failingTodosVM = failingContainer.getTodosViewModel();

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

  describe('DIContainer functionality', () => {
    it('should provide singleton ViewModels', () => {
      const vm1 = container.getProjectsViewModel();
      const vm2 = container.getProjectsViewModel();
      const tvm1 = container.getTodosViewModel();
      const tvm2 = container.getTodosViewModel();

      expect(vm1).toBe(vm2); // Same instance
      expect(tvm1).toBe(tvm2); // Same instance
    });

    it('should recreate ViewModels when repositories change', () => {
      const originalProjectsVM = container.getProjectsViewModel();
      const originalTodosVM = container.getTodosViewModel();

      // Change repositories
      const newProjectRepo = new MockProjectRepository([]);
      const newTodoRepo = new MockTodoRepository([]);
      container.setProjectRepository(newProjectRepo);
      container.setTodoRepository(newTodoRepo);

      const newProjectsVM = container.getProjectsViewModel();
      const newTodosVM = container.getTodosViewModel();

      expect(newProjectsVM).not.toBe(originalProjectsVM);
      expect(newTodosVM).not.toBe(originalTodosVM);
    });

    it('should reset to filesystem repositories', () => {
      // Change to mock repositories
      container.setProjectRepository(new MockProjectRepository([]));
      container.setTodoRepository(new MockTodoRepository([]));

      // Reset should restore filesystem repositories
      container.reset();

      const projectRepo = container.getProjectRepository();
      const todoRepo = container.getTodoRepository();

      expect(projectRepo.constructor.name).toBe('FileSystemProjectRepository');
      expect(todoRepo.constructor.name).toBe('FileSystemTodoRepository');
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
          { content: 'Integration test todo', status: 'pending' as const },
          { content: 'Another test todo', status: 'completed' as const }
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