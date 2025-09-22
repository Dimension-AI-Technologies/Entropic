// Sort menu component
import React from 'react';
import type { SortMethod } from './types';

interface SortMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  currentSort: SortMethod;
  onSortChange: (method: SortMethod) => void;
  menuRef: React.RefObject<HTMLDivElement>;
}

export function SortMenu({ visible, position, currentSort, onSortChange, menuRef }: SortMenuProps) {
  if (!visible) return null;

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
        minWidth: 160,
        padding: 6
      }}
    >
      {[['⏱ Recent', 1], ['# Todos', 2], ['AZ Alphabetic', 0]].map(([label, method]) => (
        <button
          key={String(method)}
          onClick={() => onSortChange(method as SortMethod)}
          className={`filter-toggle pane-button ${currentSort === method ? 'active' : ''}`}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '6px 10px',
            margin: 0
          }}
        >
          {label as string}{currentSort === method ? ' ✓' : ''}
        </button>
      ))}
    </div>
  );
}