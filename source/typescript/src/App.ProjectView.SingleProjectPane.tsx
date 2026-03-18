import React, { useState, useEffect } from 'react';
import './App.css';
// import { BoidSystem } from './components/BoidSystem';
// import { AnimatedBackground } from './components/AnimatedBackground';
import { SessionTabs } from './App.ProjectView.SessionTabs';
import { SessionControls } from './App.ProjectView.SessionControls';
import { TodoList } from './App.ProjectView.TodoList';
import { MergeDialog } from './App.ProjectView.MergeDialog';
import { PromptView } from './App.ProjectView.PromptView';
import { Result, Ok, Err } from './utils/Result';
import { calculateMergePreview as calcMergePreview } from './components/merge/preview';
import { DIContainer } from './services/DIContainer';
// import { Todo as DomainTodo, Session as DomainSession } from './models/Todo';

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

// Global electronAPI type is declared in src/types/index.ts

type SpacingMode = 'wide' | 'normal' | 'compact';
type FilterState = {
  completed: boolean;
  in_progress: boolean;
  pending: boolean;
};

type EmptyMode = 'all' | 'has_sessions' | 'has_todos' | 'active_only';

interface SingleProjectPaneProps {
  selectedProject: any | null; // MVVMProject or legacy Project
  selectedSession: Session | null;
  selectedTodoIndex: number | null;
  onSessionSelect: (session: Session) => void;
  onRefresh: () => Promise<void>;
  emptyMode: EmptyMode;
  spacingMode: 'wide' | 'normal' | 'compact';
  onSpacingModeChange: (mode: 'wide' | 'normal' | 'compact') => void;
}

export function SingleProjectPane({ 
  selectedProject, 
  selectedSession,
  selectedTodoIndex,
  onSessionSelect,
  onRefresh,
  emptyMode,
  spacingMode,
  onSpacingModeChange
}: SingleProjectPaneProps) {
  // Initialize MVVM ViewModels
  const container = DIContainer.getInstance();
  const todosViewModel = container.getTodosViewModel();
  
  // Load sessions on component mount and when selectedProject changes
  useEffect(() => {
    if (selectedProject) {
      todosViewModel.loadSessions();
    }
  }, [selectedProject, todosViewModel]);
  
  // spacingMode is managed by parent
  const [viewMode, setViewMode] = useState<'todo' | 'prompt'>('todo');
  const [filterState, setFilterState] = useState<FilterState>({
    completed: true,
    in_progress: true,
    pending: true
  });
  
  // Edit state management
  const [editedTodos, setEditedTodos] = useState<Todo[] | null>(null);
  // Removed unused isDirty state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Tab multi-select for merging
  const [selectedTabs, setSelectedTabs] = useState<Set<string>>(new Set());
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeSource, setMergeSource] = useState<Session | null>(null);
  const [mergeTarget, setMergeTarget] = useState<Session | null>(null);
  const [contextMenuTab, setContextMenuTab] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // Session context menu closes via overlay in SessionContextMenu

  // Tab selection for merging
  const handleTabClick = (e: React.MouseEvent, session: Session) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault();
      // Toggle tab selection for merge (Ctrl/Cmd+click or Shift+click)
      setSelectedTabs(prev => {
        const newSet = new Set(prev);
        if (newSet.has(session.id)) {
          newSet.delete(session.id);
        } else {
          // Allow multiple selections for merge
          newSet.add(session.id);
        }
        return newSet;
      });
    } else {
      // Normal tab selection
      setSelectedTabs(new Set());
      onSessionSelect(session);
    }
  };

  const handleTabRightClick = (e: React.MouseEvent, session: Session) => {
    e.preventDefault();
    setContextMenuTab(session.id);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const [mergeSources, setMergeSources] = useState<Session[]>([]);
  const [mergePreview, setMergePreview] = useState<{
    totalTodos: number;
    duplicates: number;
    newTodos: number;
    steps: Array<{source: string; target: string; todos: number}>;
  } | null>(null);

  const startMerge = () => {
    if (selectedTabs.size < 2) {
      console.error('Merge requires at least 2 selected tabs, got:', selectedTabs.size);
      return;
    }
    
    const tabArray = Array.from(selectedTabs);
    const sessions = filteredSessions.filter(s => 
      tabArray.includes(s.id)
    ) || [];
    
    console.log('Starting merge with tabs:', tabArray);
    console.log('Found sessions:', sessions ? sessions.map(s => s.id) : []);
    
    if (sessions && sessions.length >= 2) {
      // Sort by date - newest is target, all others are sources
      const sorted = sessions.sort((a, b) => 
        b.lastModified.getTime() - a.lastModified.getTime()
      );
      const target = sorted[0];
      const sources = sorted.slice(1);
      
      // Calculate merge preview
      const preview = calcMergePreview(sources as any, target as any);
      
      setMergeTarget(target);
      setMergeSources(sources);
      setMergeSource(sources[0]); // For backward compatibility
      setMergePreview(preview);
      setShowMergeDialog(true);
    } else {
      console.error('Could not find enough sessions for merge. Found:', sessions.length);
    }
  };

  // Moved to helper for clarity

  const handleDeleteSession = async (): Promise<Result<void>> => {
    if (!selectedSession || !selectedSession.filePath) {
      return Err('Invalid session or file path');
    }
    
    // Use Result pattern instead of try-catch
    const deleteResult = await (async (): Promise<Result<boolean>> => {
      try {
        const success = await window.electronAPI.deleteTodoFile(selectedSession.filePath!);
        return Ok(success);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Failed to delete session:', error);
        return Err(`Failed to delete session: ${errorMessage}`, error);
      }
    })();
    
    if (deleteResult.success && deleteResult.value) {
      setShowDeleteConfirm(false);
      setEditedTodos(null);
      // No local dirty state to reset here
      await onRefresh();
      return Ok(undefined);
    } else if (!deleteResult.success) {
      // Error already logged in the inner function
      return deleteResult;
    } else {
      return Err('Delete operation returned false');
    }
  };

  const handleContextMenuCopyId = () => {
    if (contextMenuTab) {
      navigator.clipboard.writeText(contextMenuTab);
      setShowContextMenu(false);
    }
  };

  const handleCloseMergeDialog = () => {
    setShowMergeDialog(false);
    setSelectedTabs(new Set());
    setMergeSource(null);
    setMergeSources([]);
    setMergeTarget(null);
    setMergePreview(null);
  };

  // If the current selection is hidden by the filter, auto-select the most recent visible
  useEffect(() => {
    if (!selectedProject || !selectedSession) return;
    const all = todosViewModel.getSessionsForProject(selectedProject.path);
    const visible = all.filter(s => {
      switch (emptyMode) {
        case 'all':
        case 'has_sessions':
          return true;
        case 'has_todos':
          return Array.isArray(s.todos) && s.todos.length > 0;
        case 'active_only':
          return Array.isArray(s.todos) && s.todos.some(t => t.status !== 'completed');
      }
    });
    if (!visible.some(s => s.id === selectedSession.id) && visible.length > 0) {
      const mostRecent = [...visible].sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())[0];
      onSessionSelect(mostRecent);
    }
  }, [selectedProject, selectedSession, emptyMode, todosViewModel, onSessionSelect]);

  const displayTodos = editedTodos || selectedSession?.todos || [];

  if (!selectedProject) {
    return (
      <div className="main-content">
        <div className="no-project-selected">
          <h2>No Project Selected</h2>
          <p>Select a project from the sidebar to view its sessions and todos.</p>
        </div>
      </div>
    );
  }

  // Enrich selected project with live sessions from TodosViewModel
  const allSessions = todosViewModel.getSessionsForProject(selectedProject.path);
  const filteredSessions = allSessions.filter(s => {
    switch (emptyMode) {
      case 'all':
      case 'has_sessions':
        return true;
      case 'has_todos':
        return Array.isArray(s.todos) && s.todos.length > 0;
      case 'active_only':
        return Array.isArray(s.todos) && s.todos.some(t => t.status !== 'completed');
    }
  });

  const enrichedProject: Project = {
    path: selectedProject.path,
    sessions: filteredSessions,
    mostRecentTodoDate: selectedProject.mostRecentTodoDate,
  } as any;

  

  return (
    <div className="main-content">
      
      <SessionControls
        selectedProject={enrichedProject}
        selectedSession={selectedSession}
        onRefresh={onRefresh}
        selectedTabs={selectedTabs}
        onStartMerge={startMerge}
        spacingMode={spacingMode}
        onSpacingModeChange={onSpacingModeChange}
        filterState={filterState}
        onFilterStateChange={setFilterState}
        showDeleteConfirm={showDeleteConfirm}
        onShowDeleteConfirm={setShowDeleteConfirm}
        onDeleteSession={handleDeleteSession}
        displayTodosLength={displayTodos.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      {viewMode === 'todo' && (
        <>
          <SessionTabs
            selectedProject={enrichedProject}
            selectedSession={selectedSession}
            onSessionSelect={onSessionSelect}
            selectedTabs={selectedTabs}
            onStartMerge={startMerge}
            onTabClick={handleTabClick}
            onTabRightClick={handleTabRightClick}
            showContextMenu={showContextMenu}
            contextMenuPosition={contextMenuPosition}
            onContextMenuCopyId={handleContextMenuCopyId}
            onContextMenuClose={() => setShowContextMenu(false)}
            contextMenuSessionId={contextMenuTab}
            onContextMenuDelete={() => {
              setShowContextMenu(false);
              setShowDeleteConfirm(true);
            }}
          />
          
          <TodoList
            selectedProject={enrichedProject}
            selectedSession={selectedSession}
            selectedTodoIndex={selectedTodoIndex}
            onRefresh={onRefresh}
            selectedTabs={selectedTabs}
            onTabClick={handleTabClick}
            spacingMode={spacingMode}
            filterState={filterState}
          />
        </>
      )}
      
      {viewMode === 'prompt' && (
        <PromptView selectedProject={enrichedProject} spacingMode={spacingMode} />
      )}
      
      <MergeDialog
        showMergeDialog={showMergeDialog}
        mergeTarget={mergeTarget}
        mergeSources={mergeSources}
        mergePreview={mergePreview}
        selectedTabs={selectedTabs}
        onPerformMerge={async () => {}} // Will be handled by MergeDialog itself
        onCloseMergeDialog={handleCloseMergeDialog}
        onSessionSelect={onSessionSelect}
        onRefresh={onRefresh}
      />
    </div>
  );
}
