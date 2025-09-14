import { useState } from 'react';
import { ProgressOverlay } from './components/ProgressOverlay';
import { PaneHeader, PaneControls } from './components/PaneLayout';
import { Result, Ok, Err } from './utils/Result';

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
type ViewMode = 'todo' | 'prompt';
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
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function SessionControls({
  selectedProject,
  selectedSession,
  onLoadTodos,
  selectedTabs,
  onStartMerge,
  spacingMode: _spacingMode,
  onSpacingModeChange: _onSpacingModeChange,
  filterState,
  onFilterStateChange,
  showDeleteConfirm,
  onShowDeleteConfirm,
  onDeleteSession,
  displayTodosLength,
  viewMode,
  onViewModeChange
}: SessionControlsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState<string>("");

  const handleDeleteEmptySessionsInProject = async () => {
    if (!selectedProject || isDeleting) return;
    
    // Find all empty sessions in current project
    const emptySessions = selectedProject.sessions ? selectedProject.sessions.filter(s => s.todos && s.todos.length === 0) : [];
    
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
    setDeletionProgress("Starting deletion...");
    
    // Use Result pattern for the deletion operation
    const deletionResult = await (async (): Promise<Result<{deletedCount: number, failedCount: number}>> => {
      let deletedCount = 0;
      let failedCount = 0;
      
      for (let i = 0; i < emptySessions.length; i++) {
        const session = emptySessions[i];
        
        // Update progress with session name
        setDeletionProgress(`Deleting session ${session.id} (${i + 1}/${emptySessions.length})...`);
        
        if (session.filePath) {
          // Add small delay so user can see the progress
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Use Result pattern for individual deletion
          const deleteResult = await (async (): Promise<Result<boolean>> => {
            try {
              const success = await window.electronAPI.deleteTodoFile(session.filePath!);
              return Ok(success);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              console.error(`✗ Exception deleting session ${session.id}:`, error);
              return Err(`Error deleting session ${session.id}: ${errorMessage}`, error);
            }
          })();
          
          if (deleteResult.success && deleteResult.value) {
            deletedCount++;
            console.log(`✓ Deleted empty session: ${session.id} at ${session.filePath}`);
            setDeletionProgress(`✓ Deleted session ${session.id}`);
          } else {
            failedCount++;
            if (!deleteResult.success) {
              setDeletionProgress(`✗ Error deleting session ${session.id}`);
            } else {
              console.error(`✗ Failed to delete session ${session.id} at ${session.filePath}`);
              setDeletionProgress(`✗ Failed to delete session ${session.id}`);
            }
          }
        } else {
          console.warn(`Session ${session.id} has no filePath, skipping`);
          failedCount++;
        }
      }
      
      // Show final status
      setDeletionProgress(`Completed: ${deletedCount} deleted, ${failedCount} failed`);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Show result
      if (failedCount > 0) {
        alert(`Deleted ${deletedCount} empty session(s). Failed to delete ${failedCount} session(s).`);
      } else if (deletedCount > 0) {
        console.log(`Successfully deleted ${deletedCount} empty session(s)`);
      }
      
      // Keep the overlay visible during the refresh
      console.log("Refreshing project data after deletion...");
      setDeletionProgress("Refreshing project data...");
      
      return Ok({deletedCount, failedCount});
    })();
    
    // The finally block replacement - always execute cleanup
    // Call onLoadTodos so overlay stays visible
    const _refreshResult = await (async (): Promise<Result<void>> => {
      try {
        await onLoadTodos();
        console.log("Project data refreshed successfully");
        return Ok(undefined);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("Error refreshing project data:", error);
        return Err(`Error refreshing project data: ${errorMessage}`, error);
      }
    })();
    
    // NOW clear the loading state after refresh is complete
    setIsDeleting(false);
    setDeletionProgress("");
  };

  if (!selectedProject) {
    return null;
  }


  return (
    <>
      <PaneHeader className="project-header">
        <h1
          onClick={() => { try { navigator.clipboard.writeText(selectedProject.path); } catch(e) { console.warn('Clipboard write failed', e); } }}
          onContextMenu={(e) => { e.preventDefault(); try { navigator.clipboard.writeText(selectedProject.path); } catch(err) {} }}
          title="Click or right-click to copy project path"
        >
          {selectedProject.path}
          {selectedSession && viewMode === 'todo' && (
            <span className="todo-count-badge"> ({displayTodosLength})</span>
          )}
        </h1>
        
        {/* View mode slider */}
        <div
          className="view-mode-slider"
          role="button"
          title="Toggle between Todo and History"
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const isLeft = (e.clientX - rect.left) < rect.width / 2;
            onViewModeChange(isLeft ? 'todo' : 'prompt');
          }}
          style={{ position: 'relative', width: 180, height: 28, borderRadius: 16, background: '#2f3136', display: 'grid', gridTemplateColumns: '1fr 1fr', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: viewMode === 'todo' ? '#fff' : '#b9bbbe' }}>Todo</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: viewMode === 'prompt' ? '#fff' : '#b9bbbe' }}>History</div>
          <div style={{ position: 'absolute', top: 2, bottom: 2, width: '50%', left: viewMode === 'todo' ? 2 : 'calc(50% + 2px)', background: '#1264a3', borderRadius: 14, transition: 'left 120ms ease' }} />
        </div>
      </PaneHeader>
      {viewMode === 'todo' && (
        <PaneControls className="control-bar">
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
        
        <div className="delete-all-controls">
          {selectedTabs.size >= 2 && (
            <button className="merge-btn" onClick={onStartMerge}>
              Merge {selectedTabs.size} Sessions
            </button>
          )}
          {selectedProject.sessions && selectedProject.sessions.some(s => s.todos && s.todos.length === 0) && (
            <button 
              className="delete-empty-btn" 
              onClick={handleDeleteEmptySessionsInProject}
              title={`Delete all ${selectedProject.sessions ? selectedProject.sessions.filter(s => s.todos && s.todos.length === 0).length : 0} empty session(s) in this project`}
            >
              Delete Empty ({selectedProject.sessions ? selectedProject.sessions.filter(s => s.todos && s.todos.length === 0).length : 0})
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
      </PaneControls>
      )}

      {/* Progress overlay for delete operations */}
      <ProgressOverlay 
        message="Deleting empty sessions..."
        progress={deletionProgress || "Please wait while empty sessions are being deleted"}
        isVisible={isDeleting}
      />
    </>
  );
}
