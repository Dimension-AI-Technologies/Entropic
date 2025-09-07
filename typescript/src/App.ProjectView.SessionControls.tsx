import React, { useState } from 'react';
import { ProgressOverlay } from './components/ProgressOverlay';

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

type SpacingMode = 'wide' | 'normal' | 'compact';
type FilterState = {
  completed: boolean;
  in_progress: boolean;
  pending: boolean;
};

interface SessionControlsProps {
  selectedProject: Project | null;
  selectedSession: Session | null;
  onLoadTodos: () => Promise<void>;
  selectedTabs: Set<string>;
  onStartMerge: () => void;
  spacingMode: SpacingMode;
  onSpacingModeChange: (mode: SpacingMode) => void;
  filterState: FilterState;
  onFilterStateChange: (filter: FilterState) => void;
  showDeleteConfirm: boolean;
  onShowDeleteConfirm: (show: boolean) => void;
  onDeleteSession: () => void;
  displayTodosLength: number;
}

export function SessionControls({
  selectedProject,
  selectedSession,
  onLoadTodos,
  selectedTabs,
  onStartMerge,
  spacingMode,
  onSpacingModeChange,
  filterState,
  onFilterStateChange,
  showDeleteConfirm,
  onShowDeleteConfirm,
  onDeleteSession,
  displayTodosLength
}: SessionControlsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteEmptySessionsInProject = async () => {
    if (!selectedProject || isDeleting) return;
    
    // Find all empty sessions in current project
    const emptySessions = selectedProject.sessions.filter(s => s.todos.length === 0);
    
    if (emptySessions.length === 0) {
      alert('No empty sessions found in this project.');
      return;
    }
    
    // Ask for confirmation
    const confirmation = window.confirm(
      `Found ${emptySessions.length} empty session${emptySessions.length > 1 ? 's' : ''} in "${
        selectedProject.path.split(/[\\/]/).pop()
      }".\n\nDelete ${emptySessions.length > 1 ? 'them' : 'it'}?`
    );
    
    if (!confirmation) return;
    
    // Start loading state
    setIsDeleting(true);
    
    try {
      // Delete each empty session
      let deletedCount = 0;
      let failedCount = 0;
      
      for (const session of emptySessions) {
        if (session.filePath) {
          try {
            await window.electronAPI.deleteTodoFile(session.filePath);
            deletedCount++;
            console.log(`Deleted empty session: ${session.id}`);
          } catch (error) {
            console.error(`Failed to delete session ${session.id}:`, error);
            failedCount++;
          }
        }
      }
      
      // Show result
      if (failedCount > 0) {
        alert(`Deleted ${deletedCount} empty session(s). Failed to delete ${failedCount} session(s).`);
      } else if (deletedCount > 0) {
        console.log(`Successfully deleted ${deletedCount} empty session(s)`);
      }
      
      // Force immediate reload of todos to reflect changes
      await onLoadTodos();
    } finally {
      // Stop loading state
      setIsDeleting(false);
    }
  };

  if (!selectedProject) {
    return null;
  }

  return (
    <>
      <div className="project-header">
        <h1>
          {selectedProject.path}
          {selectedSession && (
            <span className="todo-count-badge"> ({displayTodosLength})</span>
          )}
        </h1>
      </div>
      <div className="control-bar">
        <div className="filter-controls">
          <label title="Toggle which todo statuses are visible">Filter:</label>
          <div className="filter-toggle">
            <button
              className={`filter-btn ${filterState.completed ? 'active' : ''}`}
              onClick={() => onFilterStateChange({ ...filterState, completed: !filterState.completed })}
              title="Show/hide completed todos"
            >
              Done
            </button>
            <button
              className={`filter-btn ${filterState.in_progress ? 'active' : ''}`}
              onClick={() => onFilterStateChange({ ...filterState, in_progress: !filterState.in_progress })}
              title="Show/hide in-progress todos"
            >
              Doing
            </button>
            <button
              className={`filter-btn ${filterState.pending ? 'active' : ''}`}
              onClick={() => onFilterStateChange({ ...filterState, pending: !filterState.pending })}
              title="Show/hide pending todos"
            >
              Pending
            </button>
          </div>
        </div>
        
        <div className="padding-controls">
          <label className="spacing-label" title="Adjust the spacing between todo items">SPACING:</label>
          <div className="padding-buttons">
            <button
              className={`padding-btn spacing-cycle-btn active`}
              onClick={() => {
                const modes: SpacingMode[] = ['wide', 'normal', 'compact'];
                const currentIndex = modes.indexOf(spacingMode);
                const nextIndex = (currentIndex + 1) % modes.length;
                onSpacingModeChange(modes[nextIndex]);
              }}
              title="Click to cycle through spacing modes: Wide → Normal → Compact"
            >
              {spacingMode === 'wide' ? 'Wide' : spacingMode === 'normal' ? 'Normal' : 'Compact'}
            </button>
          </div>
        </div>
        
        <div className="delete-all-controls">
          {selectedTabs.size >= 2 && (
            <button className="merge-btn" onClick={onStartMerge}>
              Merge {selectedTabs.size} Sessions
            </button>
          )}
          {selectedProject.sessions.some(s => s.todos.length === 0) && (
            <button 
              className="delete-empty-btn" 
              onClick={handleDeleteEmptySessionsInProject}
              title={`Delete all ${selectedProject.sessions.filter(s => s.todos.length === 0).length} empty session(s) in this project`}
            >
              Delete Empty ({selectedProject.sessions.filter(s => s.todos.length === 0).length})
            </button>
          )}
          {!showDeleteConfirm ? (
            <button 
              className="delete-all-btn" 
              onClick={() => onShowDeleteConfirm(true)}
              title="Delete the currently selected session"
            >
              Delete Session
            </button>
          ) : (
            <div className="delete-confirm">
              <span>Delete this session?</span>
              <button className="confirm-yes" onClick={onDeleteSession}>Yes</button>
              <button className="confirm-no" onClick={() => onShowDeleteConfirm(false)}>No</button>
            </div>
          )}
        </div>
      </div>

      {/* Progress overlay for delete operations */}
      <ProgressOverlay 
        message="Deleting empty sessions..."
        progress="Please wait while empty sessions are being deleted"
        isVisible={isDeleting}
      />
    </>
  );
}

declare global {
  interface Window {
    electronAPI: {
      getTodos: () => Promise<Project[]>;
      saveTodos: (filePath: string, todos: Todo[]) => Promise<boolean>;
      deleteTodoFile: (filePath: string) => Promise<boolean>;
    };
  }
}