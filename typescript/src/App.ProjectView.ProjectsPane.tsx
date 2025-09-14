import React, { useState } from 'react';
import './App.css';
import { PaneHeader, PaneControls } from './components/PaneLayout';

interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
  id?: string;
  created?: Date;
}

interface Session {
  id: string;
  todos: Todo[];
  lastModified: Date;
  created?: Date;
  filePath?: string;
}

interface Project {
  path: string;
  sessions: Session[];
  mostRecentTodoDate?: Date;
}

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

type EmptyMode = 'all' | 'has_sessions' | 'has_todos' | 'active_only';

interface ProjectsPaneProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
  onProjectContextMenu?: (e: React.MouseEvent, project: Project) => void;
  onRefresh?: () => void;
  activityMode: boolean;
  setActivityMode: (mode: boolean) => void;
  deletedProjects?: Set<string>;
  emptyMode: EmptyMode;
  onEmptyModeChange: (mode: EmptyMode) => void;
}

export function ProjectsPane({ projects, selectedProject, onSelectProject, onProjectContextMenu, onRefresh, activityMode, setActivityMode, deletedProjects, emptyMode, onEmptyModeChange }: ProjectsPaneProps) {
  const [sortMethod, setSortMethod] = useState<SortMethod>(1); // recent
  const [showFailedReconstructions, setShowFailedReconstructions] = useState(false); // hide failed path reconstructions by default

  const handleProjectClick = (project: Project) => {
    onSelectProject(project);
  };

  const handleProjectContextMenu = (e: React.MouseEvent, project: Project) => {
    if (onProjectContextMenu) {
      onProjectContextMenu(e, project);
    }
  };

  const getSortSymbol = (method: number) => {
    switch(method) {
      case 0: return 'AZ';
      case 1: return '⏱';
      case 2: return '#';
      default: return '';
    }
  };

  // Filter projects based on emptyMode
  let filteredProjects = (projects || []).filter(p => {
    if (!p || typeof p !== 'object') return false;
    const hasSessions = Array.isArray(p.sessions) && p.sessions.length > 0;
    const hasTodos = hasSessions && p.sessions.some(s => Array.isArray(s.todos) && s.todos.length > 0);
    const hasActive = hasSessions && p.sessions.some(s => Array.isArray(s.todos) && s.todos.some(t => t.status !== 'completed'));

    switch (emptyMode) {
      case 'all':
        return true; // show all projects
      case 'has_sessions':
        return hasSessions;
      case 'has_todos':
        return hasTodos;
      case 'active_only':
        return hasActive;
    }
  });
  
  // Further filter based on failed reconstructions
  if (!showFailedReconstructions) {
    filteredProjects = filteredProjects.filter(p => 
      p.path !== 'Unknown Project' && 
      p.path !== null && 
      p.path !== ''
    );
  }
  
  // Filter out deleted projects for immediate UI updates
  if (deletedProjects && deletedProjects.size > 0) {
    filteredProjects = filteredProjects.filter(p => !deletedProjects.has(p.path));
  }
  
  // Helper function to get most recent todo date for a project
  const getMostRecentTodoDate = (project: Project): Date => {
    let mostRecent = new Date(0);
    if (project.sessions) {
      project.sessions.forEach(session => {
      const sessionDate = new Date(session.lastModified);
      if (sessionDate > mostRecent) {
        mostRecent = sessionDate;
      }
      });
    }
    return mostRecent;
  };

  const sortedProjects = filteredProjects && Array.isArray(filteredProjects) && filteredProjects.length ? 
    [...filteredProjects].sort((a, b) => {
      // Enhanced null safety for sorting
      if (!a || !b) return 0;
      
      try {
        switch(sortMethod) {
          case 0: // alphabetic
            const pathA = a.path || '';
            const pathB = b.path || '';
            return pathA.localeCompare(pathB);
          case 1: // recent
            const dateA = getMostRecentTodoDate(a);
            const dateB = getMostRecentTodoDate(b);
            return dateB.getTime() - dateA.getTime();
          case 2: // todos
            const countA = a.sessions && Array.isArray(a.sessions) ? 
              a.sessions.reduce((sum, s) => sum + (s && s.todos && Array.isArray(s.todos) ? s.todos.length : 0), 0) : 0;
            const countB = b.sessions && Array.isArray(b.sessions) ? 
              b.sessions.reduce((sum, s) => sum + (s && s.todos && Array.isArray(s.todos) ? s.todos.length : 0), 0) : 0;
            return countB - countA;
          default:
            return 0;
        }
      } catch (error) {
        console.error('[ProjectsPane] Error in sorting:', error);
        return 0;
      }
    }) : [];

  return (
    <div className="sidebar">
      <PaneHeader className="sidebar-header">
        <div className="sidebar-header-top">
          <div className="projects-header-left">
            {onRefresh && (
              <button 
                className="refresh-btn" 
                onClick={onRefresh}
                title="Refresh projects and todos"
              >
                ↻
              </button>
            )}
            <h2>Projects ({sortedProjects.length})</h2>
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
              title={sortMethod === 0 ? 'Sort projects alphabetically by name (click for date sort)' : sortMethod === 1 ? 'Sort projects by most recent activity (click for count sort)' : 'Sort projects by number of todos (click for alphabetic sort)'}
            >
              {getSortSymbol(sortMethod)}
            </button>
          </div>
          <div className="filter-toggles">
            <button
              className={`filter-toggle active`}
              onClick={() => {
                const modes: EmptyMode[] = ['all', 'has_sessions', 'has_todos', 'active_only'];
                const idx = modes.indexOf(emptyMode);
                const next = modes[(idx + 1) % modes.length];
                onEmptyModeChange(next);
              }}
              title={`Cycle: ALL → SESSION → TODOs → ACTIVE (current: ${emptyMode.replace('_', ' ').toUpperCase()})`}
            >
              {emptyMode === 'all' ? 'ALL' : emptyMode === 'has_sessions' ? 'SESSION' : emptyMode === 'has_todos' ? 'TODOs' : 'ACTIVE'}
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
      <div className="sidebar-projects">
        {sortedProjects && Array.isArray(sortedProjects) ? sortedProjects.map((project) => {
          if (!project || typeof project !== 'object') return null;
          
          const todoCount = project.sessions && Array.isArray(project.sessions) ? 
            project.sessions.reduce((sum, s) => sum + (s && s.todos && Array.isArray(s.todos) ? s.todos.length : 0), 0) : 0;
          const activeCount = project.sessions && Array.isArray(project.sessions) ?
            project.sessions.reduce((sum, s) => sum + (s && s.todos && Array.isArray(s.todos) ? s.todos.filter(t => t.status !== 'completed').length : 0), 0) : 0;
          
          const sessionCount = project.sessions && Array.isArray(project.sessions) ? project.sessions.length : 0;
          const projectPath = project.path || '';
          const projectKey = projectPath || `project-${Math.random()}`;
          const startDate = (() => {
            if (!project.sessions || project.sessions.length === 0) return null;
            const earliest = new Date(Math.min(...project.sessions.map(s => new Date(s.lastModified).getTime())));
            return earliest;
          })();
          
          return (
            <div
              key={projectKey}
              className={`project-item ${selectedProject === project ? 'selected' : ''} ${todoCount === 0 ? 'empty-project' : ''}`}
              onClick={() => handleProjectClick(project)}
              onContextMenu={(e) => handleProjectContextMenu(e, project)}
            >
              <div className="project-name">
                {projectPath ? projectPath.split(/[\\/]/).pop() : 'Unknown Project'}
                {todoCount === 0 && <span className="empty-badge"> (empty)</span>}
              </div>
              <div className="project-stats">
                {sessionCount} • {todoCount}{activeCount > 0 ? ` • ${activeCount} active` : ''}
                {startDate && (
                  <> • since {formatUKDate(startDate)}</>
                )}
                {project.mostRecentTodoDate && (
                  <> • {formatUKDate(new Date(project.mostRecentTodoDate))} {formatUKTime(new Date(project.mostRecentTodoDate))}</>
                )}
              </div>
            </div>
          );
        }).filter(Boolean) : null}
      </div>
    </div>
  );
}
