import React, { useState, useEffect, useRef } from 'react';
import { useDismissableMenu } from './components/hooks/useDismissableMenu';
import './App.css';
import { PaneHeader, PaneControls } from './components/PaneLayout';
import type { Project, SortMethod, EmptyMode } from './components/projects/types';
import { getLocalStorageItem } from './components/projects/utils';
import { sortProjects, getSortSymbol } from './components/projects/sorting';
import { SortMenu } from './components/projects/SortMenu';
import { EmptyModeMenu } from './components/projects/EmptyModeMenu';
import { ProjectList } from './components/projects/ProjectList';

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

export function ProjectsPane({
  projects,
  selectedProject,
  onSelectProject,
  onProjectContextMenu,
  onRefresh,
  activityMode,
  setActivityMode,
  deletedProjects,
  emptyMode,
  onEmptyModeChange
}: ProjectsPaneProps) {
  const [sortMethod, setSortMethod] = useState<SortMethod>(() => {
    const savedResult = getLocalStorageItem('ui.sortMethod');
    const saved = savedResult.success ? savedResult.value : null;
    return saved === '0' || saved === '1' || saved === '2' ? (Number(saved) as SortMethod) : 1;
  });

  const [showFailedReconstructions, setShowFailedReconstructions] = useState(false);
  const [modeMenuVisible, setModeMenuVisible] = useState(false);
  const [modeMenuPos, setModeMenuPos] = useState<{x:number;y:number}>({x:0,y:0});
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [sortMenuPos, setSortMenuPos] = useState<{x:number;y:number}>({x:0,y:0});

  const holdTimerRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const sortHoldTimerRef = useRef<number | null>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useDismissableMenu(modeMenuVisible, setModeMenuVisible, menuRef);
  useDismissableMenu(sortMenuVisible, setSortMenuVisible, sortMenuRef);

  // Save sort method to localStorage
  useEffect(() => {
    // retyper:disable-next-line find-exceptions
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ui.sortMethod', String(sortMethod));
      }
    } catch {} // EXEMPTION: localStorage access can fail, but it's not critical
  }, [sortMethod]);

  // Sort projects
  const sortedProjects = sortProjects(projects, sortMethod);

  const handleSortMethodChange = (method: SortMethod) => {
    setSortMethod(method);
    setSortMenuVisible(false);
  };

  const handleModeChange = (mode: EmptyMode) => {
    onEmptyModeChange(mode);
    setModeMenuVisible(false);
  };

  const getEmptyModeSymbol = (mode: EmptyMode): string => {
    switch (mode) {
      case 'all': return '?';
      case 'has_sessions': return '';
      case 'has_todos': return '📋';
      case 'active_only': return '!';
      default: return '?';
    }
  };

  const getEmptyModeTitle = (mode: EmptyMode): string => {
    switch (mode) {
      case 'all': return 'Show all projects. Click to cycle  Hold/Right-click to choose.';
      case 'has_sessions': return 'Show only projects with sessions. Click to cycle  Hold/Right-click to choose.';
      case 'has_todos': return 'Show only projects with todos. Click to cycle  Hold/Right-click to choose.';
      case 'active_only': return 'Show only projects with active (incomplete) todos. Click to cycle  Hold/Right-click to choose.';
      default: return 'Filter projects. Click to cycle  Hold/Right-click to choose.';
    }
  };

  return (
    <div className="projects-pane">
      <PaneHeader>
        <div className="sidebar-header-top">
          <div className="projects-header-left">
            <h2>Projects ({sortedProjects.length})</h2>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button
              className={`filter-toggle pane-button ${activityMode ? 'active' : ''}`}
              onClick={() => setActivityMode(!activityMode)}
              title="Auto-select the most recent session when navigating projects"
              style={{ minWidth: 96 }}
            >
              ACTIVITY
            </button>
          </div>
        </div>
      </PaneHeader>

      <PaneControls className="sidebar-controls">
        <div className="sort-controls">
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
            onMouseLeave={() => {
              if (sortHoldTimerRef.current) {
                window.clearTimeout(sortHoldTimerRef.current);
                sortHoldTimerRef.current = null;
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (sortHoldTimerRef.current) {
                window.clearTimeout(sortHoldTimerRef.current);
                sortHoldTimerRef.current = null;
              }
              setSortMenuPos({ x: e.clientX, y: e.clientY });
              setSortMenuVisible(true);
            }}
            title={
              sortMethod === 0
                ? 'Sort projects alphabetically by name. Click to cycle  Hold/Right-click to choose.'
                : sortMethod === 1
                ? 'Sort projects by most recent activity first. Click to cycle  Hold/Right-click to choose.'
                : 'Sort projects by total todo count (highest first). Click to cycle  Hold/Right-click to choose.'
            }
          >
            {getSortSymbol(sortMethod)}
          </button>

          <SortMenu
            visible={sortMenuVisible}
            position={sortMenuPos}
            currentSort={sortMethod}
            onSortChange={handleSortMethodChange}
            menuRef={sortMenuRef}
          />
        </div>

        <div className="filter-toggles" style={{ position: 'relative' }}>
          <button
            className="filter-toggle pane-button active mode-btn"
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
            title={getEmptyModeTitle(emptyMode)}
          >
            {getEmptyModeSymbol(emptyMode)}
          </button>

          <EmptyModeMenu
            visible={modeMenuVisible}
            position={modeMenuPos}
            currentMode={emptyMode}
            onModeChange={handleModeChange}
            menuRef={menuRef}
          />
        </div>
      </PaneControls>

      <ProjectList
        projects={sortedProjects}
        selectedProject={selectedProject}
        onSelectProject={onSelectProject}
        onProjectContextMenu={onProjectContextMenu}
        deletedProjects={deletedProjects}
        emptyMode={emptyMode}
        showFailedReconstructions={showFailedReconstructions}
      />
    </div>
  );
}