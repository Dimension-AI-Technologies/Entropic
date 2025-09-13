import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { ProjectsPaneMVVM } from '../components/ProjectsPaneMVVM';
import { ProjectsViewModel } from '../viewmodels/ProjectsViewModel';
import { TodosViewModel } from '../viewmodels/TodosViewModel';
import { MockProjectRepository } from '../repositories/MockProjectRepository';
import { MockTodoRepository } from '../repositories/MockTodoRepository';
import { Project } from '../models/Project';

// Mock the PaneLayout components
jest.mock('../components/PaneLayout', () => ({
  PaneHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  PaneControls: ({ children, className }: any) => <div className={className}>{children}</div>
}));

describe('ProjectsPaneMVVM', () => {
  let viewModel: ProjectsViewModel;
  let todosViewModel: TodosViewModel;
  let mockRepository: MockProjectRepository;
  let mockTodoRepository: MockTodoRepository;
  let sampleProjects: Project[];
  let mockOnSelectProject: jest.Mock;
  let mockOnRefresh: jest.Mock;
  let mockSetActivityMode: jest.Mock;

  beforeEach(() => {
    sampleProjects = MockProjectRepository.createSampleProjects();
    mockRepository = new MockProjectRepository(sampleProjects);
    viewModel = new ProjectsViewModel(mockRepository);
    
    const sampleSessions = MockTodoRepository.createSampleSessions();
    mockTodoRepository = new MockTodoRepository(sampleSessions);
    todosViewModel = new TodosViewModel(mockTodoRepository);
    
    mockOnSelectProject = jest.fn();
    mockOnRefresh = jest.fn();
    mockSetActivityMode = jest.fn();
  });

  const getDefaultProps = () => ({
    viewModel,
    todosViewModel,
    selectedProject: null,
    onSelectProject: mockOnSelectProject,
    onRefresh: mockOnRefresh,
    activityMode: false,
    setActivityMode: mockSetActivityMode
  });

  it('should render projects list', async () => {
    render(<ProjectsPaneMVVM {...getDefaultProps()} />);

    // Wait for projects to load and loading to complete
    await waitFor(() => {
      expect(screen.getByText(/Projects \(3\)/)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Should show project count (3 existing, 1 unmatched filtered out by default)
    expect(screen.getByText(/Projects \(3\)/)).toBeInTheDocument();

    // Should show project names with status icons for existing projects
    await waitFor(() => {
      expect(screen.getByText(/✅ Entropic/)).toBeInTheDocument();
      expect(screen.getByText(/✅ MacroN/)).toBeInTheDocument();
      expect(screen.getByText(/✅ \.claude/)).toBeInTheDocument();
    });

    // Should not show unmatched project by default
    expect(screen.queryByText(/⚠️ test-project-alpha/)).not.toBeInTheDocument();
  });

  it('should handle project selection', async () => {
    render(<ProjectsPaneMVVM {...getDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByText(/✅ Entropic/)).toBeInTheDocument();
    });

    // Click on a project
    const entropicProject = screen.getByText(/✅ Entropic/);
    fireEvent.click(entropicProject.closest('.project-item')!);

    expect(mockOnSelectProject).toHaveBeenCalledTimes(1);
    expect(mockOnSelectProject).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '-Users-doowell2-Source-repos-DT-Entropic',
        path: '/Users/doowell2/Source/repos/DT/Entropic'
      })
    );
  });

  it('should handle refresh button', async () => {
    render(<ProjectsPaneMVVM {...getDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByText(/Projects \(3\)/)).toBeInTheDocument();
    });

    const refreshButton = screen.getByTitle('Refresh projects and todos');
    expect(refreshButton).not.toBeDisabled();
    
    fireEvent.click(refreshButton);

    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('should toggle activity mode', async () => {
    render(<ProjectsPaneMVVM {...getDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByText('Activity')).toBeInTheDocument();
    });

    const activityCheckbox = screen.getByRole('checkbox');
    fireEvent.click(activityCheckbox);

    expect(mockSetActivityMode).toHaveBeenCalledWith(true);
  });

  it('should cycle through sort methods', async () => {
    render(<ProjectsPaneMVVM {...getDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByText('⏱')).toBeInTheDocument(); // Default is recent sort
    });

    const sortButton = screen.getByText('⏱');
    
    // Click to change to todos sort
    fireEvent.click(sortButton);
    expect(screen.getByText('#')).toBeInTheDocument();

    // Click to change to alphabetic sort
    fireEvent.click(sortButton);
    expect(screen.getByText('AZ')).toBeInTheDocument();

    // Click to cycle back to recent sort
    fireEvent.click(sortButton);
    expect(screen.getByText('⏱')).toBeInTheDocument();
  });

  it('should toggle filter buttons', async () => {
    render(<ProjectsPaneMVVM {...getDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByText('Empty')).toBeInTheDocument();
    });

    const emptyButton = screen.getByText('Empty');
    const failedButton = screen.getByText('Failed');

    // Initially not active
    expect(emptyButton).not.toHaveClass('active');
    expect(failedButton).not.toHaveClass('active');

    // Click to activate
    fireEvent.click(emptyButton);
    expect(emptyButton).toHaveClass('active');

    fireEvent.click(failedButton);
    expect(failedButton).toHaveClass('active');
  });

  it('should filter out deleted projects', async () => {
    const deletedProjects = new Set(['/Users/doowell2/Source/repos/DT/Entropic']);
    
    render(
      <ProjectsPaneMVVM 
        {...getDefaultProps()} 
        deletedProjects={deletedProjects}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Projects \(2\)/)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Should show 2 projects instead of 3 (one is deleted, one filtered by default)
    expect(screen.getByText(/Projects \(2\)/)).toBeInTheDocument();

    // Should not show the deleted project
    expect(screen.queryByText(/✅ Entropic/)).not.toBeInTheDocument();
  });

  it('should show loading state', async () => {
    // Create a slow repository for testing loading state
    const slowRepository = new MockProjectRepository([]);
    // Mock the getAllProjects to return after a delay
    const originalGetAllProjects = slowRepository.getAllProjects;
    slowRepository.getAllProjects = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return originalGetAllProjects.call(slowRepository);
    };

    const slowViewModel = new ProjectsViewModel(slowRepository);

    render(<ProjectsPaneMVVM {...getDefaultProps()} viewModel={slowViewModel} />);

    // Should show loading state initially
    expect(screen.getByText(/Loading.../)).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading.../)).not.toBeInTheDocument();
    });
  });

  it('should handle context menu events', async () => {
    const mockOnProjectContextMenu = jest.fn();

    render(
      <ProjectsPaneMVVM 
        {...getDefaultProps()} 
        onProjectContextMenu={mockOnProjectContextMenu}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/✅ Entropic/)).toBeInTheDocument();
    });

    // Right-click on a project
    const entropicProject = screen.getByText(/✅ Entropic/);
    fireEvent.contextMenu(entropicProject.closest('.project-item')!);

    expect(mockOnProjectContextMenu).toHaveBeenCalledTimes(1);
  });

  it('should show project tooltips', async () => {
    render(<ProjectsPaneMVVM {...getDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByText(/✅ Entropic/)).toBeInTheDocument();
    });

    const entropicProject = screen.getByText(/✅ Entropic/).closest('.project-item')!;
    const tooltip = entropicProject.getAttribute('title');
    
    expect(tooltip).toContain('/Users/doowell2/Source/repos/DT/Entropic');
    expect(tooltip).toContain('Last Modified:');
  });

  it('should indicate unmatched projects', async () => {
    render(<ProjectsPaneMVVM {...getDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByText(/Projects \(3\)/)).toBeInTheDocument();
    });

    // Enable Failed filter to show unmatched projects
    const failedButton = screen.getByText('Failed');
    fireEvent.click(failedButton);

    await waitFor(() => {
      expect(screen.getByText(/Projects \(4\)/)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/⚠️ test-project-alpha/)).toBeInTheDocument();
    });

    // Should show unmatched badge for projects that don't exist
    expect(screen.getByText('(unmatched)')).toBeInTheDocument();
  });
});