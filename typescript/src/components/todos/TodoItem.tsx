import React from 'react';

export interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
  id?: string;
  created?: Date;
}

interface TodoItemProps {
  todo: Todo;
  originalIndex: number;
  sequenceNumber: number;
  isSelected: boolean;
  isDragOver: boolean;
  editingIndex: number | null;
  editingContent: string;
  onStartEdit: (index: number) => void;
  onChangeEdit: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (index: number) => void;
  onToggleStatus: (index: number) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: () => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>, index: number) => void;
}

export function TodoItem(props: TodoItemProps) {
  const {
    todo,
    originalIndex,
    sequenceNumber,
    isSelected,
    isDragOver,
    editingIndex,
    editingContent,
    onStartEdit,
    onChangeEdit,
    onSaveEdit,
    onCancelEdit,
    onDelete,
    onToggleStatus,
    onDragStart,
    onDragOver,
    onDrop,
    onDragLeave,
    onClick,
  } = props;

  return (
    <div
      className={`todo-item ${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
      draggable={editingIndex === null}
      onDragStart={(e) => onDragStart(e, originalIndex)}
      onDragOver={(e) => onDragOver(e, originalIndex)}
      onDrop={(e) => onDrop(e, originalIndex)}
      onDragLeave={onDragLeave}
      onClick={(e) => onClick(e, originalIndex)}
    >
      <span className="todo-sequence">{sequenceNumber}.</span>
      <input
        type="checkbox"
        className={`todo-checkbox ${todo.status}`}
        checked={todo.status === 'completed'}
        onChange={(e) => {
          e.stopPropagation();
          onToggleStatus(originalIndex);
        }}
        title={`Status: ${todo.status}`}
      />
      {editingIndex === originalIndex ? (
        <input
          type="text"
          className="todo-edit-input"
          value={editingContent}
          onChange={(e) => onChangeEdit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveEdit();
            if (e.key === 'Escape') onCancelEdit();
          }}
          onBlur={onSaveEdit}
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
                onStartEdit(originalIndex);
              }}
            >
              ✏️
            </button>
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(originalIndex);
              }}
            >
              🗑️
            </button>
          </div>
        </>
      )}
    </div>
  );
}

