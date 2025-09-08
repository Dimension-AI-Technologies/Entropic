import React from 'react';

/**
 * Shared layout components to ensure perfect alignment between panes.
 * These components enforce consistent heights and structure.
 */

interface PaneHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function PaneHeader({ children, className = '' }: PaneHeaderProps) {
  return (
    <div 
      className={`pane-header-component ${className}`}
      style={{
        height: '45px',
        padding: '6px 20px',
        borderBottom: '1px solid #35373b',
        background: '#222529',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      {children}
    </div>
  );
}

interface PaneControlsProps {
  children: React.ReactNode;
  className?: string;
}

export function PaneControls({ children, className = '' }: PaneControlsProps) {
  return (
    <div 
      className={`pane-controls-component ${className}`}
      style={{
        height: '38px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 20px',
        background: '#2f3136',
        borderBottom: '1px solid #35373b',
        boxSizing: 'border-box',
        gap: '12px'
      }}
    >
      {children}
    </div>
  );
}

/**
 * Layout constants for use in other components
 */
export const PANE_LAYOUT = {
  HEADER_HEIGHT: 45,
  CONTROLS_HEIGHT: 38,
  TOTAL_CHROME_HEIGHT: 83, // header + controls
  PADDING: 6,
  BORDER_COLOR: '#35373b',
  HEADER_BG: '#222529',
  CONTROLS_BG: '#2f3136'
} as const;