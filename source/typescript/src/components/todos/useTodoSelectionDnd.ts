import { useEffect, useState } from 'react';
import type { Session, Todo } from '../../models/Todo';

interface Options {
  selectedSession: Session | null;
  editedTodos: Todo[] | null;
  setEditedTodos: (next: Todo[]) => void;
  editingIndex: number | null;
  setIsDirty: (dirty: boolean) => void;
}

export function useTodoSelectionDnd({ selectedSession, editedTodos, setEditedTodos, editingIndex, setIsDirty }: Options) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const clearSelection = () => {
    setSelectedIndices(new Set());
    setLastSelectedIndex(null);
  };

  const moveSelectedItems = (direction: 'up' | 'down') => {
    if (selectedIndices.size === 0 || !editedTodos) return;
    const sorted = Array.from(selectedIndices).sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) return;
    }
    const firstIndex = sorted[0];
    const lastIndex = sorted[sorted.length - 1];
    if (direction === 'up' && firstIndex > 0) {
      const next = [...editedTodos];
      const itemToMove = next[firstIndex - 1];
      for (let i = firstIndex; i <= lastIndex; i++) next[i - 1] = next[i];
      next[lastIndex] = itemToMove;
      const newSelection = new Set(Array.from(selectedIndices).map((i) => i - 1));
      setSelectedIndices(newSelection);
      setLastSelectedIndex((lastSelectedIndex || 0) - 1);
      setEditedTodos(next);
    } else if (direction === 'down' && lastIndex < editedTodos.length - 1) {
      const next = [...editedTodos];
      const itemToMove = next[lastIndex + 1];
      for (let i = lastIndex; i >= firstIndex; i--) next[i + 1] = next[i];
      next[firstIndex] = itemToMove;
      const newSelection = new Set(Array.from(selectedIndices).map((i) => i + 1));
      setSelectedIndices(newSelection);
      setLastSelectedIndex((lastSelectedIndex || 0) + 1);
      setEditedTodos(next);
    }
    setIsDirty(true);
  };

  const handleTodoClick = (e: React.MouseEvent, index: number) => {
    if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const newSelection = new Set<number>();
      for (let i = start; i <= end; i++) newSelection.add(i);
      setSelectedIndices(newSelection);
      setLastSelectedIndex(index);
    } else if (e.ctrlKey || e.metaKey) {
      const newSelection = new Set(selectedIndices);
      if (newSelection.has(index)) newSelection.delete(index);
      else newSelection.add(index);
      setSelectedIndices(newSelection);
      setLastSelectedIndex(index);
    } else {
      setSelectedIndices(new Set([index]));
      setLastSelectedIndex(index);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
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
      const next = [...editedTodos];
      const [moved] = next.splice(draggedIndex, 1);
      next.splice(dropIndex, 0, moved);
      setEditedTodos(next);
      setIsDirty(true);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const isContiguousSelection = () => {
    if (selectedIndices.size <= 1) return true;
    const sorted = Array.from(selectedIndices).sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) if (sorted[i] !== sorted[i - 1] + 1) return false;
    return true;
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
        return;
      }
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
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedIndices, editingIndex, editedTodos]);

  return {
    draggedIndex,
    dragOverIndex,
    setDragOverIndex,
    selectedIndices,
    lastSelectedIndex,
    setSelectedIndices,
    clearSelection,
    moveSelectedItems,
    handleTodoClick,
    handleDragStart,
    handleDragOver,
    handleDrop,
    isContiguousSelection,
  };
}
