import React, { useState, useEffect } from 'react';
import { ProjectsViewModel } from '../viewmodels/ProjectsViewModel';
import { TodosViewModel } from '../viewmodels/TodosViewModel';
import { Project } from '../models/Project';
import '../App.css';
import { PaneHeader, PaneControls } from './PaneLayout';

type SortMethod = 0 | 1 | 2; // 0=alphabetic, 1=recent, 2=todos

// Helper function to format dates in UK format: dd-MMM-yyyy
function formatUKDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Helper function to format time in UK format: HH:mm
function formatUKTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

interface ProjectsPaneMVVMProps {
  viewModel: ProjectsViewModel;
  todosViewModel: TodosViewModel;
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
  onProjectContextMenu?: (e: React.MouseEvent, project: Project) => void;
  onRefresh?: () => void;
  activityMode: boolean;
  setActivityMode: (mode: boolean) => void;
  deletedProjects?: Set<string>;
}

export function ProjectsPaneMVVM({ 
  viewModel, 
  todosViewModel,
  selectedProject, 
  onSelectProject, 
  onProjectContextMenu, 
  onRefresh, 
  activityMode, 
  setActivityMode, 
  deletedProjects 
}: ProjectsPaneMVVMProps) {
  const [sortMethod, setSortMethod] = useState<SortMethod>(1); // recent
  // Default: show empty projects, hide unmatched (per tests)
  const [showEmptyProjects, setShowEmptyProjects] = useState(true);
  const [showFailedReconstructions, setShowFailedReconstructions] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load projects on mount and listen to ViewModel changes
  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      setError(null);

      const result = await viewModel.loadProjects();
      if (result.success) {
        setProjects(result.value);
      } else {
        setError(result.error);
        setProjects([]);
      }
      setIsLoading(false);
    };

    // Initial load
    loadProjects();

    // Listen for changes from the ViewModel (reactive updates)
    const handleChange = () => {
      console.log('[ProjectsPaneMVVM] ViewModel notified of change, updating projects');
      setProjects(viewModel.getProjects());
    };
    
    viewModel.onChange(handleChange);
    
    // Cleanup
    return () => {
      viewModel.offChange(handleChange);
    };
  }, [viewModel]);

  // Re-render when todos data changes so filters based on sessions are accurate
  useEffect(() => {
    const unsubscribe = todosViewModel.onChange(() => {
      // Trigger a re-render by updating a harmless state (projects length noop)
      setProjects(prev => [...prev]);
    });
    return () => unsubscribe();
  }, [todosViewModel]);

  const handleProjectClick = (project: Project) => {
    onSelectProject(project);
  };

  const handleProjectContextMenu = (e: React.MouseEvent, project: Project) => {
    if (onProjectContextMenu) {
      onProjectContextMenu(e, project);
    }
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      onRefresh(); // Call parent refresh for compatibility
    }
    
    // Also refresh through ViewModel
    setIsLoading(true);
    const result = await viewModel.refresh();
    if (result.success) {
      setProjects(result.value);
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  };

  const getSortSymbol = (method: number) => {
    switch(method) {
      case 0: return 'AZ';
      case 1: return '⏱';
      case 2: return '#';
      default: return '';
    }
  };

  // Apply filters using ViewModel methods - ensure projects is never undefined
  let filteredProjects = projects || [];

  // Filter by empty projects (based on sessions/todos)
  if (!showEmptyProjects) {
    filteredProjects = filteredProjects.filter(project => {
      const sessions = todosViewModel.getSessionsForProject(project.path);
      if (!sessions || sessions.length === 0) return false;
      const totalTodoCount = sessions.reduce((sum, s) => sum + (s.todos?.length || 0), 0);
      return totalTodoCount > 0;
    });
  }

  // Filter by failed reconstructions (unmatched projects)
  if (!showFailedReconstructions) {
    filteredProjects = filteredProjects.filter(p => p.pathExists);
  }

  // Filter out deleted projects for immediate UI updates
  if (deletedProjects && deletedProjects.size > 0) {
    filteredProjects = filteredProjects.filter(p => !deletedProjects.has(p.path));
  }

  // Sort projects using ViewModel helper methods - ensure filteredProjects is safe
  const sortedProjects = filteredProjects && filteredProjects.length ? [...filteredProjects].sort((a, b) => {
    switch(sortMethod) {
      case 0: // alphabetic
        const nameA = viewModel.getDisplayName(a);
        const nameB = viewModel.getDisplayName(b);
        return nameA.localeCompare(nameB);
      case 1: // recent (most recent first)
        return b.lastModified.getTime() - a.lastModified.getTime();
      case 2: // todos (placeholder - will be implemented when we have todo data)
        // For now, sort by path exists (existing projects first)
        if (a.pathExists === b.pathExists) {
          return b.lastModified.getTime() - a.lastModified.getTime();
        }
        return a.pathExists ? -1 : 1;
      default:
        return 0;
    }
  }) : [];

  if (error) {
    return (
      <div className="sidebar">
        <PaneHeader className="sidebar-header">
          <h2>Projects (Error)</h2>
        </PaneHeader>
        <div className="error-message" style={{ padding: '20px', color: '#ff6b6b', background: '#2a2d31', borderRadius: '4px', margin: '10px' }}>
          <h3 style={{ marginTop: 0 }}>Error Loading Projects</h3>
          <p>{error}</p>
          <button onClick={handleRefresh} style={{ 
            display: 'block', 
            marginTop: '10px',
            padding: '8px 12px',
            background: '#4f545c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PaneHeader className="sidebar-header">
        <div className="sidebar-header-top">
          <div className="projects-header-left">
            {onRefresh && (
              <button 
                className="refresh-btn" 
                onClick={handleRefresh}
                disabled={isLoading}
                title="Refresh projects and todos"
              >
                {isLoading ? '⟳' : '↻'}
              </button>
            )}
            <h2>
              Projects ({sortedProjects.length})
              {isLoading && <span style={{ fontSize: '12px', marginLeft: '5px' }}>Loading...</span>}
            </h2>
          </div>
          <div className="activity-toggle" title="Auto-select the most recent session when navigating projects">
            <label>
              <span>Activity</span>
              <input
                type="checkbox"
                checked={activityMode}
                onChange={(e) => setActivityMode(e.target.checked)}
              />
            </label>
          </div>
        </div>
      </PaneHeader>
      <PaneControls className="sidebar-controls">
          <div className="sort-controls">
            <button
              className="sort-button active"
              onClick={() => setSortMethod(((sortMethod + 1) % 3) as SortMethod)}
              title={
                sortMethod === 0
                  ? 'Sort projects alphabetically by name. Click to cycle modes.'
                  : sortMethod === 1
                  ? 'Sort projects by most recent activity first. Click to cycle modes.'
                  : 'Sort projects by total todo count (highest first). Click to cycle modes.'
              }
            >
              {getSortSymbol(sortMethod)}
            </button>
          </div>
          <div className="filter-toggles">
            <button
              className={`filter-toggle ${showEmptyProjects ? 'active' : ''}`}
              onClick={() => setShowEmptyProjects(!showEmptyProjects)}
              title="Show/hide projects with no todos"
            >
              Empty
            </button>
            <button
              className={`filter-toggle ${showFailedReconstructions ? 'active' : ''}`}
              onClick={() => setShowFailedReconstructions(!showFailedReconstructions)}
              title="Show/hide projects with invalid file paths"
            >
              Failed
            </button>
          </div>
      </PaneControls>
      <div className="sidebar-projects" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
        {sortedProjects.map((project) => {
          const displayName = viewModel.getDisplayName(project);
          const statusIcon = viewModel.getStatusIcon(project);
          const tooltip = viewModel.getTooltip(project);
          const prjSessions = todosViewModel.getSessionsForProject(project.path);
          const isEmpty = !prjSessions || prjSessions.length === 0 || prjSessions.every(s => (s.todos?.length || 0) === 0);
          
          return (
            <div
              key={project.id}
              className={`project-item ${selectedProject?.id === project.id ? 'selected' : ''} ${isEmpty ? 'empty-project' : ''}`}
              onClick={() => handleProjectClick(project)}
              onContextMenu={(e) => handleProjectContextMenu(e, project)}
              title={tooltip}
            >
              <div className="project-name">
                {statusIcon} {displayName}
                {isEmpty && <span className="empty-badge"> (unmatched)</span>}
              </div>
              <div className="project-stats">
                {/* Placeholder for session count and todo count - will be implemented with todo integration */}
                {formatUKDate(project.lastModified)} {formatUKTime(project.lastModified)}
              </div>
            </div>
          );
        })}
        {sortedProjects.length === 0 && !isLoading && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'gray', fontSize: '13px' }}>
            <p>No projects found.</p>
            <p style={{ marginTop: '8px', fontSize: '11px', color: '#888' }}>
              This panel will automatically populate with projects when you use Claude Code.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
