import React, { useEffect } from 'react';
import { TodoItem } from './components/todos/TodoItem';
import { useTodoEditing } from './components/todos/useTodoEditing';
import { useTodoSelectionDnd } from './components/todos/useTodoSelectionDnd';

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

// Helper function to format time in UK format: HH:mm
function formatUKTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

interface TodoListProps {
  selectedProject: Project | null;
  selectedSession: Session | null;
  selectedTodoIndex: number | null;
  onLoadTodos: () => Promise<void>;
  selectedTabs: Set<string>;
  onTabClick: (e: React.MouseEvent, session: Session) => void;
  spacingMode: SpacingMode;
  filterState: FilterState;
}

export function TodoList({ 
  selectedProject, 
  selectedSession,
  selectedTodoIndex,
  onLoadTodos,
  selectedTabs,
  onTabClick,
  spacingMode,
  filterState
}: TodoListProps) {
  const {
    editedTodos,
    setEditedTodos,
    isDirty,
    setIsDirty,
    editingIndex,
    editingContent,
    setEditingContent,
    startEdit,
    saveEdit,
    cancelEdit,
    handleDelete,
    handleStatusToggle,
    handleSave,
    handleCancel,
  } = useTodoEditing({ selectedSession, onLoadTodos });

  const {
    dragOverIndex,
    setDragOverIndex,
    selectedIndices,
    lastSelectedIndex,
    clearSelection,
    moveSelectedItems,
    handleTodoClick,
    handleDragStart,
    handleDragOver,
    handleDrop,
    isContiguousSelection,
  } = useTodoSelectionDnd({ selectedSession, editedTodos: editedTodos, setEditedTodos: (t) => setEditedTodos(t as any), editingIndex, setIsDirty });
  
  // Auto-select the todo when selectedTodoIndex changes
  useEffect(() => {
    if (selectedTodoIndex !== null && selectedTodoIndex >= 0 && selectedSession) {
      const fakeEvent = {
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        preventDefault() {},
        stopPropagation() {},
      } as any;
      handleTodoClick(fakeEvent, selectedTodoIndex);
    }
  }, [selectedTodoIndex, selectedSession?.id]); // Re-run when session changes too
  
  // Keyboard handling moved into hook

  // Selection and DnD moved into hook

  // Click selection moved into hook

  // DnD moved into hook

  // Edit handling moved into hook; wrap cancel/delete to also clear selection
  const handleCancelAndClear = () => { handleCancel(); clearSelection(); };
  const handleDeleteAndClear = (index: number) => { handleDelete(index); clearSelection(); };

  const displayTodos = editedTodos || selectedSession?.todos || [];
  
  const filteredTodos = displayTodos.filter(todo => {
    switch (todo.status) {
      case 'completed':
        return filterState.completed;
      case 'in_progress':
        return filterState.in_progress;
      case 'pending':
        return filterState.pending;
      default:
        return true;
    }
  });


  if (!selectedSession) {
    return null;
  }

  return (
    <div 
      className={`session-content ${selectedTabs.has(selectedSession.id) ? 'multi-selected' : ''}`}
      onClick={(e) => {
        // Only handle shift-click or ctrl/cmd-click for merge selection
        // Ignore clicks on interactive elements
        const target = e.target as HTMLElement;
        if (target.closest('.todo-item') || target.closest('.edit-controls') || target.closest('.status-bar')) {
          return;
        }
        
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          onTabClick(e, selectedSession);
        }
      }}
      onContextMenu={(e) => {
        // Right-click also selects for merge
        // Ignore clicks on interactive elements
        const target = e.target as HTMLElement;
        if (target.closest('.todo-item') || target.closest('.edit-controls') || target.closest('.status-bar')) {
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        onTabClick({ ...e, shiftKey: true } as any, selectedSession);
      }}
      title=""
    >
      <div className="todos-container">
        {isDirty && (
          <div className="edit-controls">
            <button className="save-btn" onClick={handleSave}>Save</button>
            <button className="discard-btn" onClick={handleCancelAndClear}>Discard</button>
          </div>
        )}
        <div className={`todos-list padding-${spacingMode}`}>
          {filteredTodos.map((todo, index) => {
            const originalIndex = displayTodos.indexOf(todo);
            const isSelected = selectedIndices.has(originalIndex);
            const sequenceNumber = index + 1;
            return (
              <TodoItem
                key={`${todo.id || index}-${originalIndex}`}
                todo={todo}
                originalIndex={originalIndex}
                sequenceNumber={sequenceNumber}
                isSelected={isSelected}
                isDragOver={dragOverIndex === originalIndex}
                editingIndex={editingIndex}
                editingContent={editingContent}
                onStartEdit={startEdit}
                onChangeEdit={setEditingContent}
                onSaveEdit={saveEdit}
                onCancelEdit={cancelEdit}
                onDelete={handleDeleteAndClear}
                onToggleStatus={handleStatusToggle}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragLeave={() => setDragOverIndex(null)}
                onClick={handleTodoClick}
              />
            );
          })}
        </div>
        <div className="status-bar">
          <div className="status-bar-left">
            {selectedIndices.size === 0 && displayTodos.length > 0 && (
              <span>Click to select items • Shift+Click for range • Ctrl+Click for multi-select • Drag to reorder</span>
            )}
            {selectedIndices.size === 1 && (
              <span>Click to select • Shift+Click for range • Ctrl+Click to multi-select • Drag to reorder • Ctrl+↑↓ to move</span>
            )}
            {selectedIndices.size > 1 && isContiguousSelection() && (
              <span>{selectedIndices.size} items selected • Ctrl+↑↓ to move • Drag to reorder • Escape to clear</span>
            )}
            {selectedIndices.size > 1 && !isContiguousSelection() && (
              <span>{selectedIndices.size} items selected (non-contiguous) • Select adjacent items to move • Escape to clear</span>
            )}
          </div>
          <div className="status-bar-right">
            <span className="activity-log">
              {isDirty ? 'Modified •' : ''} 
              {selectedSession ? `${selectedSession.todos.filter(t => t.status === 'completed').length}/${selectedSession.todos.length} completed` : 'No session'}
              {selectedSession?.lastModified && ` • Updated: ${formatUKTime(selectedSession.lastModified)}`}
            </span>
          </div>
        </div>
      </div>
    </div>
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
