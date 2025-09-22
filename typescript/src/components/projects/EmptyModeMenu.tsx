// Empty mode filter menu component
import React from 'react';
import type { EmptyMode } from './types';

interface EmptyModeMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  currentMode: EmptyMode;
  onModeChange: (mode: EmptyMode) => void;
  menuRef: React.RefObject<HTMLDivElement>;
}

export function EmptyModeMenu({ visible, position, currentMode, onModeChange, menuRef }: EmptyModeMenuProps) {
  if (!visible) return null;

  const modes: Array<[string, EmptyMode]> = [
    ['All Projects', 'all'],
    ['Has Sessions', 'has_sessions'],
    ['Has Todos', 'has_todos'],
    ['Active Only', 'active_only']
  ];

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: position.y + 6,
        left: position.x + 6,
        background: '#2f3136',
        color: '#e6e7e8',
        border: '1px solid #3b3e44',
        borderRadius: 6,
        boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
        zIndex: 9999,
        minWidth: 140,
        padding: 6
      }}
    >
      {modes.map(([label, mode]) => (
        <button
          key={mode}
          onClick={() => onModeChange(mode)}
          className={`filter-toggle pane-button ${currentMode === mode ? 'active' : ''}`}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '6px 10px',
            margin: 0
          }}
        >
          {label}{currentMode === mode ? ' ✓' : ''}
        </button>
      ))}
    </div>
  );
}