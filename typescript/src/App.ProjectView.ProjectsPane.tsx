import React, { useState, useEffect, useRef } from 'react';
import { useDismissableMenu } from './components/hooks/useDismissableMenu';
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
  const [sortMethod, setSortMethod] = useState<SortMethod>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ui.sortMethod') : null;
    return saved === '0' || saved === '1' || saved === '2' ? (Number(saved) as SortMethod) : 1;
  }); // recent
  const [showFailedReconstructions, setShowFailedReconstructions] = useState(false); // hide failed path reconstructions by default
  const [modeMenuVisible, setModeMenuVisible] = useState(false);
  const [modeMenuPos, setModeMenuPos] = useState<{x:number;y:number}>({x:0,y:0});
  const holdTimerRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [sortMenuPos, setSortMenuPos] = useState<{x:number;y:number}>({x:0,y:0});
  const sortHoldTimerRef = useRef<number | null>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useDismissableMenu(modeMenuVisible, setModeMenuVisible, menuRef);
  useDismissableMenu(sortMenuVisible, setSortMenuVisible, sortMenuRef);

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

  // Persist sort method
  useEffect(() => {
    try { localStorage.setItem('ui.sortMethod', String(sortMethod)); } catch {}
  }, [sortMethod]);

  return (
    <div className="sidebar">
      <PaneHeader className="sidebar-header">
        <div className="sidebar-header-top">
          <div className="projects-header-left">
            <h2>Projects ({sortedProjects.length})</h2>
          </div>
          {/* Activity slider styled like Todo/History slider, stuck to right edge */}
          <div className="activity-toggle" title="Auto-select the most recent session when navigating projects" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: activityMode ? '#ffffff' : '#8e9297', fontSize: 12 }}>Activity</span>
            <div
              role="button"
              aria-label="Activity slider"
              onClick={() => setActivityMode(!activityMode)}
              style={{ position: 'relative', width: 56, height: 22, borderRadius: 16, background: '#2f3136', cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ position: 'absolute', top: 2, bottom: 2, width: 24, left: activityMode ? 'calc(100% - 26px)' : 2, background: 'var(--accent)', borderRadius: 14, transition: 'left 120ms ease' }} />
            </div>
          </div>
        </div>
      </PaneHeader>
      <PaneControls className="sidebar-controls">
          <div className="sort-controls">
            <span className="sort-title">Sort</span>
            <button
              className="sort-button active"
              onMouseDown={(e) => {
                if (sortHoldTimerRef.current) window.clearTimeout(sortHoldTimerRef.current);
                sortHoldTimerRef.current = window.setTimeout(() => {
                  setSortMenuPos({ x: e.clientX, y: e.clientY });
                  setSortMenuVisible(true);
                }, 400);
              }}
              onMouseUp={() => {
                if (sortHoldTimerRef.current) {
                  window.clearTimeout(sortHoldTimerRef.current);
                  sortHoldTimerRef.current = null;
                  if (!sortMenuVisible) setSortMethod(((sortMethod + 1) % 3) as SortMethod);
                }
              }}
              onMouseLeave={() => { if (sortHoldTimerRef.current) { window.clearTimeout(sortHoldTimerRef.current); sortHoldTimerRef.current = null; } }}
              onContextMenu={(e) => { e.preventDefault(); if (sortHoldTimerRef.current) { window.clearTimeout(sortHoldTimerRef.current); sortHoldTimerRef.current = null; } setSortMenuPos({ x: e.clientX, y: e.clientY }); setSortMenuVisible(true); }}
              title={sortMethod === 0 ? 'Sort: A→Z (click to cycle • hold/right-click for menu)' : sortMethod === 1 ? 'Sort: Recent (click to cycle • hold/right-click for menu)' : 'Sort: Todos (click to cycle • hold/right-click for menu)'}
            >
              {getSortSymbol(sortMethod)}
            </button>
            {sortMenuVisible && (
              <div
                ref={sortMenuRef}
                style={{ position: 'fixed', top: sortMenuPos.y + 6, left: sortMenuPos.x + 6, background: '#2f3136', color: '#e6e7e8', border: '1px solid #3b3e44', borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,0.4)', zIndex: 9999, minWidth: 160, padding: 6 }}
              >
                {[['⏱ Recent', 1], ['# Todos', 2], ['AZ Alphabetic', 0]].map(([label, method]) => (
                  <button
                    key={String(method)}
                    onClick={() => { setSortMethod(method as SortMethod); setSortMenuVisible(false); }}
                    className={`filter-toggle pane-button ${sortMethod === method ? 'active' : ''}`}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', margin: 0 }}
                  >
                    {label as string}{sortMethod === method ? ' ✓' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="filter-toggles" style={{ position: 'relative' }}>
            <button
              className={`filter-toggle pane-button active mode-btn`}
              onMouseDown={(e) => {
                if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
                holdTimerRef.current = window.setTimeout(() => {
                  setModeMenuPos({ x: e.clientX, y: e.clientY });
                  setModeMenuVisible(true);
                }, 400);
              }}
              onMouseUp={() => {
                if (holdTimerRef.current) {
                  window.clearTimeout(holdTimerRef.current);
                  holdTimerRef.current = null;
                  if (!modeMenuVisible) {
                    const modes: EmptyMode[] = ['all', 'has_sessions', 'has_todos', 'active_only'];
                    const idx = modes.indexOf(emptyMode);
                    const next = modes[(idx + 1) % modes.length];
                    onEmptyModeChange(next);
                  }
                }
              }}
              onMouseLeave={() => {
                if (holdTimerRef.current) {
                  window.clearTimeout(holdTimerRef.current);
                  holdTimerRef.current = null;
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (holdTimerRef.current) {
                  window.clearTimeout(holdTimerRef.current);
                  holdTimerRef.current = null;
                }
                setModeMenuPos({ x: e.clientX, y: e.clientY });
                setModeMenuVisible(true);
              }}
              title={`Click to cycle • Hold/Right-click for menu (current: ${emptyMode.replace('_', ' ').toUpperCase()})`}
            >
              {emptyMode === 'all' ? 'ALL' : emptyMode === 'has_sessions' ? 'SESSION' : emptyMode === 'has_todos' ? 'TODOs' : 'ACTIVE'}
            </button>
            {modeMenuVisible && (
              <div
                ref={menuRef}
                style={{ position: 'fixed', top: modeMenuPos.y + 6, left: modeMenuPos.x + 6, background: '#2f3136', color: '#e6e7e8', border: '1px solid #3b3e44', borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,0.4)', zIndex: 9999, minWidth: 140, padding: 6 }}
              >
                {([ 
                  ['ALL', 'all'],
                  ['SESSION', 'has_sessions'],
                  ['TODOs', 'has_todos'],
                  ['ACTIVE', 'active_only'],
                ] as Array<[string, EmptyMode]>).map(([label, mode]) => (
                  <button
                    key={mode}
                    onClick={() => { onEmptyModeChange(mode as EmptyMode); setModeMenuVisible(false); }}
                    className={`filter-toggle pane-button ${emptyMode === (mode as EmptyMode) ? 'active' : ''}`}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', margin: 0 }}
                  >
                    {label}{emptyMode === mode ? ' ✓' : ''}
                  </button>
                ))}
              </div>
            )}
            <button
              className={`filter-toggle pane-button ${showFailedReconstructions ? 'active' : ''} failed-btn`}
              onClick={() => setShowFailedReconstructions(!showFailedReconstructions)}
              title="Show/hide projects with invalid file paths"
            >
              Failed
            </button>
          </div>
      </PaneControls>
      <div className="sidebar-projects" style={{ overflowY: 'auto' }}>
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
              <div className="project-name" title={projectPath}>
                {projectPath ? projectPath.split(/[\\/]/).pop() : 'Unknown Project'}
                <span style={{ opacity: 0.8, fontSize: 12, fontWeight: 400 }}> ({sessionCount} • {todoCount} • {activeCount})</span>
              </div>
              <div className="project-stats">
                {startDate && (<>{formatUKDate(startDate)}</>)}
                {project.mostRecentTodoDate && (<> • {formatUKDate(new Date(project.mostRecentTodoDate))} {formatUKTime(new Date(project.mostRecentTodoDate))}</>)}
              </div>
            </div>
          );
        }).filter(Boolean) : null}
      </div>
    </div>
  );
}
