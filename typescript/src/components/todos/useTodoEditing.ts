import { useState } from 'react';
import { Result, Ok, Err } from '../../utils/Result';
import type { Session, Todo } from '../../models/Todo';

interface Options {
  selectedSession: Session | null;
  onLoadTodos: () => Promise<void>;
}

export function useTodoEditing({ selectedSession, onLoadTodos }: Options) {
  const [editedTodos, setEditedTodos] = useState<Todo[] | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const startEdit = (index: number) => {
    if (!editedTodos && selectedSession) {
      setEditedTodos([...selectedSession.todos]);
    }
    setEditingIndex(index);
    const base = editedTodos ?? selectedSession?.todos ?? [];
    setEditingContent(base[index]?.content ?? '');
  };

  const saveEdit = () => {
    if (editingIndex !== null && editingContent.trim() && editedTodos) {
      const next = [...editedTodos];
      next[editingIndex] = { ...next[editingIndex], content: editingContent.trim() };
      setEditedTodos(next);
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
    const base = editedTodos ?? selectedSession?.todos ?? [];
    const next = base.filter((_, i) => i !== index);
    setEditedTodos(next);
    setIsDirty(true);
  };

  const handleStatusToggle = (index: number) => {
    const base = editedTodos || selectedSession?.todos || [];
    const next = [...base];
    const todo = next[index];
    if (!todo) return;
    if (todo.status === 'pending') todo.status = 'in_progress';
    else if (todo.status === 'in_progress') todo.status = 'completed';
    else todo.status = 'pending';
    setEditedTodos(next);
    setIsDirty(true);
  };

  const handleSave = async (): Promise<Result<void>> => {
    if (!selectedSession || !editedTodos || !selectedSession.filePath) {
      return Err('Invalid session or todos state');
    }
    try {
      const success = await window.electronAPI.saveTodos(selectedSession.filePath, editedTodos);
      if (success) {
        setIsDirty(false);
        await onLoadTodos();
        return Ok(undefined);
      }
      return Err('Save operation returned false');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Failed to save todos:', error);
      return Err(`Failed to save todos: ${msg}`, error);
    }
  };

  const handleCancel = () => {
    setEditedTodos(null);
    setIsDirty(false);
  };

  return {
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
  };
}
