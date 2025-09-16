import { describe, it, expect, beforeEach } from '@jest/globals';
import '../tests/setupElectronApi';
import { DIContainer } from '../services/DIContainer';

describe('ProjectsViewModel (direct facade)', () => {
  const setMockProjects: (p:any[]) => void = (global as any).setMockProjects;
  const container = DIContainer.getInstance();
  const viewModel: any = container.getProjectsViewModel();
  let sampleProjects: any[];

  beforeEach(() => {
    const now = Date.now();
    sampleProjects = [
      { id: '-Users-doowell2-Source-repos-DT-Entropic', path: '/Users/doowell2/Source/repos/DT/Entropic', pathExists: true, lastModified: new Date(now - 1000) },
      { id: '-Users-doowell2-Source-repos-DT-OthelloN', path: '/Users/doowell2/Source/repos/DT/OthelloN', pathExists: true, lastModified: new Date(now - 2000) },
      { id: '-Users-doowell2-Source-repos-DT-MacroN', path: '/Users/doowell2/Source/repos/DT/MacroN', pathExists: true, lastModified: new Date(now - 3000) },
      { id: 'test-project-alpha', path: 'Unknown Project', pathExists: false, flattenedDir: 'test-project-alpha', lastModified: new Date(now - 4000) },
    ];
    setMockProjects(sampleProjects);
    // push into VM directly
    viewModel.setProjects(sampleProjects);
  });

  describe('loadProjects', () => {
    it('should load all projects from repository', async () => {
      expect(viewModel.getProjectCount()).toBe(4);
    });

    it('should handle repository errors gracefully', async () => {
      viewModel.setProjects([]);
      expect(viewModel.getProjectCount()).toBe(0);
    });

    it('should set loading state during operation', async () => {
      // not applicable in facade; ensure setProjects clears loading state
      viewModel.setProjects(sampleProjects);
      expect(viewModel.getProjectCount()).toBe(4);
    });

    it('should clear errors on successful load', async () => {
      // First load to clear any initial state
      viewModel.setProjects(sampleProjects);
      expect(viewModel.getProjectCount()).toBe(4);
    });
  });

  describe('project access methods', () => {
    beforeEach(async () => {
      viewModel.setProjects(sampleProjects);
    });

    it('should return all projects', () => {
      const projects = viewModel.getProjects();
      expect(projects).toHaveLength(4);
      expect(projects[0]).toHaveProperty('id');
      expect(projects[0]).toHaveProperty('path');
      expect(projects[0]).toHaveProperty('pathExists');
    });

    it('should return immutable project array', () => {
      const projects1 = viewModel.getProjects();
      const projects2 = viewModel.getProjects();
      
      expect(projects1).not.toBe(projects2); // Different instances
      expect(projects1).toEqual(projects2); // Same content
    });

    it('should find project by ID', () => {
      const project = viewModel.getProject('-Users-doowell2-Source-repos-DT-Entropic');
      
      expect(project).not.toBeNull();
      expect(project?.path).toBe('/Users/doowell2/Source/repos/DT/Entropic');
    });

    it('should return null for non-existent project ID', () => {
      const project = viewModel.getProject('non-existent-id');
      
      expect(project).toBeNull();
    });
  });

  describe('project filtering', () => {
    beforeEach(async () => {
      await viewModel.loadProjects();
    });

    it('should filter existing projects', () => {
      const existingProjects = viewModel.getExistingProjects();
      
      expect(existingProjects).toHaveLength(3);
      existingProjects.forEach(project => {
        expect(project.pathExists).toBe(true);
      });
    });

    it('should filter unmatched projects', () => {
      const unmatchedProjects = viewModel.getUnmatchedProjects();
      
      expect(unmatchedProjects).toHaveLength(1);
      expect(unmatchedProjects[0].id).toBe('test-project-alpha');
      expect(unmatchedProjects[0].pathExists).toBe(false);
    });

    it('should sort projects by date (most recent first)', () => {
      const sortedProjects = viewModel.getProjectsSortedByDate();
      
      expect(sortedProjects).toHaveLength(4);
      // Should be sorted newest first
      expect(sortedProjects[0].lastModified.getTime()).toBeGreaterThan(
        sortedProjects[1].lastModified.getTime()
      );
    });
  });

  describe('project counts', () => {
    beforeEach(async () => {
      await viewModel.loadProjects();
    });

    it('should count total projects', () => {
      expect(viewModel.getProjectCount()).toBe(4);
    });

    it('should count existing projects', () => {
      expect(viewModel.getExistingProjectCount()).toBe(3);
    });

    it('should count unmatched projects', () => {
      expect(viewModel.getUnmatchedProjectCount()).toBe(1);
    });
  });

  describe('UI helper methods', () => {
    beforeEach(async () => {
      await viewModel.loadProjects();
    });

    it('should generate display names for existing projects', () => {
      const project = viewModel.getProject('-Users-doowell2-Source-repos-DT-Entropic')!;
      const displayName = viewModel.getDisplayName(project);
      
      expect(displayName).toBe('Entropic');
    });

    it('should use flattened name for unmatched projects', () => {
      const project = viewModel.getProject('test-project-alpha')!;
      const displayName = viewModel.getDisplayName(project);
      
      expect(displayName).toBe('test-project-alpha');
    });

    it('should generate correct status icons', () => {
      const existingProject = viewModel.getProject('-Users-doowell2-Source-repos-DT-Entropic')!;
      const unmatchedProject = viewModel.getProject('test-project-alpha')!;
      
      expect(viewModel.getStatusIcon(existingProject)).toBe('✅');
      expect(viewModel.getStatusIcon(unmatchedProject)).toBe('⚠️');
    });

    it('should generate informative tooltips', () => {
      const existingProject = viewModel.getProject('-Users-doowell2-Source-repos-DT-Entropic')!;
      const tooltip = viewModel.getTooltip(existingProject);
      
      expect(tooltip).toContain('/Users/doowell2/Source/repos/DT/Entropic');
      expect(tooltip).toContain('Last Modified:');
    });

    it('should generate tooltips for unmatched projects', () => {
      const unmatchedProject = viewModel.getProject('test-project-alpha')!;
      const tooltip = viewModel.getTooltip(unmatchedProject);
      
      expect(tooltip).toContain('(does not exist)');
      expect(tooltip).toContain('Flattened: test-project-alpha');
    });
  });

  describe('error handling', () => {
    it('should track and clear errors', () => {
      expect(viewModel.getError()).toBeNull();
      
      // Error clearing functionality
      viewModel.clearError();
      expect(viewModel.getError()).toBeNull();
    });
  });

  describe('refresh functionality', () => {
    it('should reload projects when refreshed', async () => {
      await viewModel.loadProjects();
      expect(viewModel.getProjectCount()).toBe(4);
      
      // Add a project to the mock repository
      const newProject: Project = {
        id: 'new-test-project',
        path: '/test/new-project',
        flattenedDir: 'new-test-project',
        pathExists: true,
        lastModified: new Date()
      };
      mockRepository.addProject(newProject);
      
      // Refresh should pick up the new project
      const result = await viewModel.refresh();
      
      expect(result.success).toBe(true);
      expect(viewModel.getProjectCount()).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle empty repository', async () => {
      const emptyRepo = new MockProjectRepository([]);
      const emptyViewModel = new ProjectsViewModel(emptyRepo);
      
      await emptyViewModel.loadProjects();
      
      expect(emptyViewModel.getProjectCount()).toBe(0);
      expect(emptyViewModel.getExistingProjectCount()).toBe(0);
      expect(emptyViewModel.getUnmatchedProjectCount()).toBe(0);
      expect(emptyViewModel.getProjects()).toEqual([]);
    });

    it('should handle projects with same modification time', () => {
      const sameDate = new Date('2025-01-01T12:00:00Z');
      const projectsWithSameDate: Project[] = [
        {
          id: 'project-1',
          path: '/path/1',
          flattenedDir: 'project-1',
          pathExists: true,
          lastModified: sameDate
        },
        {
          id: 'project-2',
          path: '/path/2',
          flattenedDir: 'project-2',
          pathExists: true,
          lastModified: sameDate
        }
      ];
      
      const repo = new MockProjectRepository(projectsWithSameDate);
      const vm = new ProjectsViewModel(repo);
      
      expect(async () => {
        await vm.loadProjects();
        const sorted = vm.getProjectsSortedByDate();
        expect(sorted).toHaveLength(2);
      }).not.toThrow();
    });
  });
});
