import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import '@testing-library/jest-dom';
import '../tests/setupElectronApi';
import { ProjectsPaneMVVM } from '../components/ProjectsPaneMVVM';
import { Ok } from '../utils/Result';

// Mock the PaneLayout components
jest.mock('../components/PaneLayout', () => ({
  PaneHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  PaneControls: ({ children, className }: any) => <div className={className}>{children}</div>
}));

describe('ProjectsPaneMVVM (direct facade)', () => {
  // Minimal fake VMs to keep this test agnostic of DIContainer shape
  let listeners = new Set<() => void>();
  const viewModel: any = {
    _projects: [] as any[],
    async loadProjects() { return Ok(this._projects); },
    async refresh() { return Ok(this._projects); },
    getProjects() { return this._projects; },
    setProjects(p: any[]) { this._projects = p; listeners.forEach(f=>f()); },
    onChange(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); },
    offChange(cb: () => void) { listeners.delete(cb); },
    getDisplayName(p:any){ const parts=(p.path||'').split(/[\\/]/); return parts[parts.length-1]||p.path; },
    getStatusIcon(p:any){ return p.pathExists ? '✅' : '⚠️'; },
    getTooltip(p:any){ if (p.pathExists) { return `Path: ${p.path}\nLast Modified: ${p.lastModified}`; } return `Path: ${p.path} (does not exist)\nFlattened: ${p.flattenedDir||p.id}`; }
  };
  const todosViewModel: any = {
    _sessions: [] as any[],
    onChange(cb: () => void){ return () => {}; },
    getSessionsForProject(_path: string){ return []; }
  };
  let sampleProjects: any[];
  let mockOnSelectProject: (project: any) => void;
  let mockOnRefresh: () => void;
  let mockSetActivityMode: (active: boolean) => void;
  let capturedCalls: { selectProject: any[], refresh: number, activityMode: boolean[] };

  beforeEach(() => {
    const now = Date.now();
    sampleProjects = [
      { id: '-tmp-ProjectOne', path: '/tmp/ProjectOne', pathExists: true, lastModified: new Date(now - 1000) },
      { id: '-tmp-ProjectTwo', path: '/tmp/ProjectTwo', pathExists: true, lastModified: new Date(now - 2000) },
      { id: 'test-project-alpha', path: 'Unknown Project', pathExists: false, flattenedDir: 'test-project-alpha', lastModified: new Date(now - 3000) },
    ];
    viewModel.setProjects(sampleProjects);

    // Reset captured calls
    capturedCalls = { selectProject: [], refresh: 0, activityMode: [] };

    // Authentic function implementations that capture calls
    mockOnSelectProject = (project: any) => {
      capturedCalls.selectProject.push(project);
    };
    mockOnRefresh = () => {
      capturedCalls.refresh++;
    };
    mockSetActivityMode = (active: boolean) => {
      capturedCalls.activityMode.push(active);
    };
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
      expect(screen.getByText(/Projects \(/)).toBeInTheDocument();
    });

    // Should show project names with status icons for existing projects
    await waitFor(() => {
      expect(screen.getByText(/✅ ProjectOne/)).toBeInTheDocument();
      expect(screen.getByText(/✅ ProjectTwo/)).toBeInTheDocument();
    });

    // Should not show unmatched project by default
    expect(screen.queryByText(/⚠️ test-project-alpha/)).not.toBeInTheDocument();
  });

  it('should handle project selection', async () => {
    render(<ProjectsPaneMVVM {...getDefaultProps()} />);

    await waitFor(() => { expect(screen.getByText(/✅ ProjectOne/)).toBeInTheDocument(); });

    // Click on a project
    const entropicProject = screen.getByText(/✅ ProjectOne/);
    fireEvent.click(entropicProject.closest('.project-item')!);

    expect(capturedCalls.selectProject.length).toBe(1);
    expect(capturedCalls.selectProject[0]).toEqual(
      expect.objectContaining({
        id: '-tmp-ProjectOne',
        path: '/tmp/ProjectOne'
      })
    );
  });

  it('should handle refresh button', async () => {
    render(<ProjectsPaneMVVM {...getDefaultProps()} />);

    await waitFor(() => { expect(screen.getByText(/Projects \(/)).toBeInTheDocument(); });

    const refreshButton = screen.getByTitle('Refresh projects and todos');
    expect(refreshButton).not.toBeDisabled();
    
    fireEvent.click(refreshButton);

    expect(capturedCalls.refresh).toBe(1);
  });

  it('should toggle activity mode', async () => {
    render(<ProjectsPaneMVVM {...getDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByText('Activity')).toBeInTheDocument();
    });

    const activityCheckbox = screen.getByRole('checkbox');
    fireEvent.click(activityCheckbox);
    expect(capturedCalls.activityMode.length).toBeGreaterThan(0);
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

    // Toggle both buttons and assert class changes occur
    const wasEmptyActive = emptyButton.classList.contains('active');
    const wasFailedActive = failedButton.classList.contains('active');
    fireEvent.click(emptyButton);
    expect(emptyButton.classList.contains('active')).toBe(!wasEmptyActive);
    fireEvent.click(failedButton);
    expect(failedButton.classList.contains('active')).toBe(!wasFailedActive);
  });

  it('should filter out deleted projects', async () => {
    const deletedProjects = new Set(['/tmp/ProjectOne']);
    
    render(
      <ProjectsPaneMVVM 
        {...getDefaultProps()} 
        deletedProjects={deletedProjects}
      />
    );

    // Should not show the deleted project
    await waitFor(() => { expect(screen.queryByText(/✅ ProjectOne/)).not.toBeInTheDocument(); });
  });

  it('should show basic controls', async () => {
    render(<ProjectsPaneMVVM {...getDefaultProps()} />);
    await waitFor(()=>{ expect(screen.getByText('Activity')).toBeInTheDocument(); });
  });

  it('should handle context menu events', async () => {
    const capturedContextMenuCalls: any[] = [];
    const mockOnProjectContextMenu = (event: any, project: any) => {
      capturedContextMenuCalls.push({ event, project });
    };

    render(
      <ProjectsPaneMVVM
        {...getDefaultProps()}
        onProjectContextMenu={mockOnProjectContextMenu}
      />
    );

    await waitFor(() => { expect(screen.getByText(/✅ ProjectOne/)).toBeInTheDocument(); });

    // Right-click on a project
    const entropicProject = screen.getByText(/✅ ProjectOne/);
    fireEvent.contextMenu(entropicProject.closest('.project-item')!);

    expect(capturedContextMenuCalls.length).toBe(1);
    expect(capturedContextMenuCalls[0]).toHaveProperty('event');
    expect(capturedContextMenuCalls[0]).toHaveProperty('project');
  });

  it('should show project tooltips', async () => {
    render(<ProjectsPaneMVVM {...getDefaultProps()} />);

    await waitFor(() => { expect(screen.getByText(/✅ ProjectOne/)).toBeInTheDocument(); });

    const entropicProject = screen.getByText(/✅ ProjectOne/).closest('.project-item')!;
    const tooltip = entropicProject.getAttribute('title');
    
    expect(tooltip).toContain('/tmp/ProjectOne');
    expect(tooltip).toContain('Last Modified:');
  });

  it('should indicate unmatched projects', async () => {
    render(<ProjectsPaneMVVM {...getDefaultProps()} />);

    await waitFor(() => { expect(screen.getByText(/Projects \(/)).toBeInTheDocument(); });

    // Enable Failed filter to show unmatched projects
    const failedButton = screen.getByText('Failed');
    fireEvent.click(failedButton);

    await waitFor(() => { expect(screen.getByText(/Projects \(/)).toBeInTheDocument(); });

    // Should show unmatched project entry (badge visible)
    await waitFor(() => {
      const badge = document.querySelector('.empty-badge');
      expect(badge).not.toBeNull();
    });
  });
});
