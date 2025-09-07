import React, { useState, useEffect } from 'react';

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
  onLoadTodos: () => Promise<void>;
  selectedTabs: Set<string>;
  onTabClick: (e: React.MouseEvent, session: Session) => void;
  spacingMode: SpacingMode;
  filterState: FilterState;
}

export function TodoList({ 
  selectedProject, 
  selectedSession, 
  onLoadTodos,
  selectedTabs,
  onTabClick,
  spacingMode,
  filterState
}: TodoListProps) {
  // Edit state management
  const [editedTodos, setEditedTodos] = useState<Todo[] | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  
  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape key to clear selection
      if (e.key === 'Escape') {
        clearSelection();
        return;
      }
      
      // Handle arrow keys for moving selected items
      if (selectedIndices.size > 0 && !editingIndex) {
        if (e.key === 'ArrowUp' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          moveSelectedItems('up');
        } else if (e.key === 'ArrowDown' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          moveSelectedItems('down');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndices, editingIndex]);

  const clearSelection = () => {
    setSelectedIndices(new Set());
    setLastSelectedIndex(null);
  };

  const moveSelectedItems = (direction: 'up' | 'down') => {
    if (selectedIndices.size === 0 || !editedTodos) return;
    
    // Check if selection is contiguous
    const sorted = Array.from(selectedIndices).sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) return; // Non-contiguous, don't move
    }
    
    const firstIndex = sorted[0];
    const lastIndex = sorted[sorted.length - 1];
    
    if (direction === 'up' && firstIndex > 0) {
      const newTodos = [...editedTodos];
      const itemToMove = newTodos[firstIndex - 1];
      
      // Move all selected items up
      for (let i = firstIndex; i <= lastIndex; i++) {
        newTodos[i - 1] = newTodos[i];
      }
      newTodos[lastIndex] = itemToMove;
      
      // Update selection indices
      const newSelection = new Set(Array.from(selectedIndices).map(i => i - 1));
      setSelectedIndices(newSelection);
      setLastSelectedIndex((lastSelectedIndex || 0) - 1);
      
      setEditedTodos(newTodos);
      setIsDirty(true);
    } else if (direction === 'down' && lastIndex < editedTodos.length - 1) {
      const newTodos = [...editedTodos];
      const itemToMove = newTodos[lastIndex + 1];
      
      // Move all selected items down
      for (let i = lastIndex; i >= firstIndex; i--) {
        newTodos[i + 1] = newTodos[i];
      }
      newTodos[firstIndex] = itemToMove;
      
      // Update selection indices
      const newSelection = new Set(Array.from(selectedIndices).map(i => i + 1));
      setSelectedIndices(newSelection);
      setLastSelectedIndex((lastSelectedIndex || 0) + 1);
      
      setEditedTodos(newTodos);
      setIsDirty(true);
    }
  };

  const handleTodoClick = (e: React.MouseEvent, index: number) => {
    if (e.shiftKey && lastSelectedIndex !== null) {
      // Range selection
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const newSelection = new Set<number>();
      for (let i = start; i <= end; i++) {
        newSelection.add(i);
      }
      setSelectedIndices(newSelection);
      setLastSelectedIndex(index);
    } else if (e.ctrlKey || e.metaKey) {
      // Toggle selection
      const newSelection = new Set(selectedIndices);
      if (newSelection.has(index)) {
        newSelection.delete(index);
      } else {
        newSelection.add(index);
      }
      setSelectedIndices(newSelection);
      setLastSelectedIndex(index);
    } else {
      // Single selection
      setSelectedIndices(new Set([index]));
      setLastSelectedIndex(index);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    // Initialize edited todos if not already
    if (!editedTodos && selectedSession) {
      setEditedTodos([...selectedSession.todos]);
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex && editedTodos) {
      const newTodos = [...editedTodos];
      const [movedTodo] = newTodos.splice(draggedIndex, 1);
      newTodos.splice(dropIndex, 0, movedTodo);
      setEditedTodos(newTodos);
      setIsDirty(true);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const startEdit = (index: number) => {
    if (!editedTodos && selectedSession) {
      setEditedTodos([...selectedSession.todos]);
    }
    setEditingIndex(index);
    setEditingContent(editedTodos ? editedTodos[index].content : selectedSession?.todos[index].content || '');
  };

  const saveEdit = () => {
    if (editingIndex !== null && editingContent.trim() && editedTodos) {
      const newTodos = [...editedTodos];
      newTodos[editingIndex] = { ...newTodos[editingIndex], content: editingContent.trim() };
      setEditedTodos(newTodos);
      setIsDirty(true);
      setEditingIndex(null);
      setEditingContent('');
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingContent('');
  };

  const handleDelete = (index: number) => {
    if (!editedTodos && selectedSession) {
      setEditedTodos([...selectedSession.todos]);
    }
    if (editedTodos) {
      const newTodos = editedTodos.filter((_, i) => i !== index);
      setEditedTodos(newTodos);
      setIsDirty(true);
      clearSelection();
    }
  };

  const handleSave = async () => {
    if (!selectedSession || !editedTodos || !selectedSession.filePath) return;
    
    try {
      const success = await window.electronAPI.saveTodos(selectedSession.filePath, editedTodos);
      if (success) {
        setIsDirty(false);
        await onLoadTodos();
      }
    } catch (error) {
      console.error('Failed to save todos:', error);
    }
  };

  const handleCancel = () => {
    setEditedTodos(null);
    setIsDirty(false);
    clearSelection();
  };

  const getStatusSymbol = (status: string) => {
    switch (status) {
      case 'completed': return '✓';
      case 'in_progress': return '▶';
      case 'pending': return '○';
      default: return '?';
    }
  };

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

  const isContiguousSelection = () => {
    if (selectedIndices.size <= 1) return true;
    const sorted = Array.from(selectedIndices).sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) return false;
    }
    return true;
  };

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
            <button className="discard-btn" onClick={handleCancel}>Discard</button>
          </div>
        )}
        <div className={`todos-list padding-${spacingMode}`}>
          {filteredTodos.map((todo, index) => {
            const originalIndex = displayTodos.indexOf(todo);
            const isSelected = selectedIndices.has(originalIndex);
            const sequenceNumber = index + 1;
            
            return (
              <div
                key={`${todo.id || index}-${originalIndex}`}
                className={`todo-item ${isSelected ? 'selected' : ''} ${
                  dragOverIndex === originalIndex ? 'drag-over' : ''
                }`}
                draggable={!editingIndex}
                onDragStart={(e) => handleDragStart(e, originalIndex)}
                onDragOver={(e) => handleDragOver(e, originalIndex)}
                onDrop={(e) => handleDrop(e, originalIndex)}
                onDragLeave={() => setDragOverIndex(null)}
                onClick={(e) => handleTodoClick(e, originalIndex)}
              >
                <span className="todo-sequence">{sequenceNumber}.</span>
                <span className={`status-icon ${todo.status}`}>
                  {getStatusSymbol(todo.status)}
                </span>
                {editingIndex === originalIndex ? (
                  <input
                    type="text"
                    className="todo-edit-input"
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    onBlur={saveEdit}
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="todo-content">
                      {todo.id && <span className="todo-id">[{todo.id.substring(0, 4)}] </span>}
                      {todo.content}
                    </span>
                    <div className="todo-actions">
                      <button 
                        className="edit-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(originalIndex);
                        }}
                      >
                        ✏️
                      </button>
                      <button 
                        className="delete-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(originalIndex);
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>
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