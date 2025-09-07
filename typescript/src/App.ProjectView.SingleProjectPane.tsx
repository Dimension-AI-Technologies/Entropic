import React, { useState, useEffect } from 'react';
import './App.css';
import { BoidSystem } from './components/BoidSystem';
import { AnimatedBackground } from './components/AnimatedBackground';
import { SessionTabs } from './App.ProjectView.SessionTabs';
import { SessionControls } from './App.ProjectView.SessionControls';
import { TodoList } from './App.ProjectView.TodoList';
import { MergeDialog } from './App.ProjectView.MergeDialog';
import { PromptView } from './App.ProjectView.PromptView';

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

declare global {
  interface Window {
    electronAPI: {
      getTodos: () => Promise<Project[]>;
      saveTodos: (filePath: string, todos: Todo[]) => Promise<boolean>;
      deleteTodoFile: (filePath: string) => Promise<boolean>;
      getProjectPrompts: (projectPath: string) => Promise<any[]>;
    };
  }
}

type SpacingMode = 'wide' | 'normal' | 'compact';
type FilterState = {
  completed: boolean;
  in_progress: boolean;
  pending: boolean;
};

interface SingleProjectPaneProps {
  selectedProject: Project | null;
  selectedSession: Session | null;
  onSessionSelect: (session: Session) => void;
  onLoadTodos: () => Promise<void>;
}

export function SingleProjectPane({ 
  selectedProject, 
  selectedSession, 
  onSessionSelect,
  onLoadTodos 
}: SingleProjectPaneProps) {
  const [spacingMode, setSpacingMode] = useState<SpacingMode>('compact');
  const [viewMode, setViewMode] = useState<'todo' | 'prompt'>('todo');
  const [filterState, setFilterState] = useState<FilterState>({
    completed: true,
    in_progress: true,
    pending: true
  });
  
  // Edit state management
  const [editedTodos, setEditedTodos] = useState<Todo[] | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Tab multi-select for merging
  const [selectedTabs, setSelectedTabs] = useState<Set<string>>(new Set());
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeSource, setMergeSource] = useState<Session | null>(null);
  const [mergeTarget, setMergeTarget] = useState<Session | null>(null);
  const [contextMenuTab, setContextMenuTab] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // Click outside handler for context menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.context-menu')) {
        setShowContextMenu(false);
      }
    };
    
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

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
    const sessions = selectedProject?.sessions.filter(s => 
      tabArray.includes(s.id)
    ) || [];
    
    console.log('Starting merge with tabs:', tabArray);
    console.log('Found sessions:', sessions.map(s => s.id));
    
    if (sessions.length >= 2) {
      // Sort by date - newest is target, all others are sources
      const sorted = sessions.sort((a, b) => 
        b.lastModified.getTime() - a.lastModified.getTime()
      );
      const target = sorted[0];
      const sources = sorted.slice(1);
      
      // Calculate merge preview
      const preview = calculateMergePreview(sources, target);
      
      setMergeTarget(target);
      setMergeSources(sources);
      setMergeSource(sources[0]); // For backward compatibility
      setMergePreview(preview);
      setShowMergeDialog(true);
    } else {
      console.error('Could not find enough sessions for merge. Found:', sessions.length);
    }
  };

  const calculateMergePreview = (sources: Session[], target: Session) => {
    let totalNewTodos = 0;
    let totalDuplicates = 0;
    const steps: Array<{source: string; target: string; todos: number}> = [];
    
    const targetContents = new Set(target.todos.map(t => t.content.toLowerCase()));
    const mergedContents = new Set(targetContents);
    
    for (const source of sources) {
      let stepNewTodos = 0;
      let stepDuplicates = 0;
      
      for (const todo of source.todos) {
        const lowerContent = todo.content.toLowerCase();
        if (mergedContents.has(lowerContent)) {
          stepDuplicates++;
        } else {
          stepNewTodos++;
          mergedContents.add(lowerContent);
        }
      }
      
      totalNewTodos += stepNewTodos;
      totalDuplicates += stepDuplicates;
      steps.push({
        source: source.id.substring(0, 8),
        target: target.id.substring(0, 8),
        todos: stepNewTodos
      });
    }
    
    return {
      totalTodos: target.todos.length + totalNewTodos,
      duplicates: totalDuplicates,
      newTodos: totalNewTodos,
      steps
    };
  };

  const handleDeleteSession = async () => {
    if (!selectedSession || !selectedSession.filePath) return;
    
    try {
      const success = await window.electronAPI.deleteTodoFile(selectedSession.filePath);
      if (success) {
        setShowDeleteConfirm(false);
        setEditedTodos(null);
        setIsDirty(false);
        await onLoadTodos();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
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

  const displayTodos = editedTodos || selectedSession?.todos || [];

  if (!selectedProject) {
    return (
      <div className="main-content">
        <AnimatedBackground />
        <BoidSystem />
        <div className="no-project-selected">
          <h2>No Project Selected</h2>
          <p>Select a project from the sidebar to view its sessions and todos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <AnimatedBackground />
      <BoidSystem />
      
      <SessionControls
        selectedProject={selectedProject}
        selectedSession={selectedSession}
        onLoadTodos={onLoadTodos}
        selectedTabs={selectedTabs}
        onStartMerge={startMerge}
        spacingMode={spacingMode}
        onSpacingModeChange={setSpacingMode}
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
            selectedProject={selectedProject}
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
          />
          
          <TodoList
            selectedProject={selectedProject}
            selectedSession={selectedSession}
            onLoadTodos={onLoadTodos}
            selectedTabs={selectedTabs}
            onTabClick={handleTabClick}
            spacingMode={spacingMode}
            filterState={filterState}
          />
        </>
      )}
      
      {viewMode === 'prompt' && (
        <PromptView selectedProject={selectedProject} />
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
        onLoadTodos={onLoadTodos}
      />
    </div>
  );
}