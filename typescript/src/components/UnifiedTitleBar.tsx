import React from 'react';
import ClaudeLogo from '../../assets/ClaudeLogo.png';

type ViewMode = 'project' | 'global';
type SpacingMode = 'wide' | 'normal' | 'compact';

interface UnifiedTitleBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  spacingMode: SpacingMode;
  onSpacingModeChange: (mode: SpacingMode) => void;
  onRefresh?: () => void;
  // Optional project-specific data for title
  selectedProjectName?: string;
  todoCount?: number;
  projectCount?: number;
}

export function UnifiedTitleBar({
  viewMode,
  onViewModeChange,
  spacingMode,
  onSpacingModeChange,
  onRefresh,
  selectedProjectName,
  todoCount,
  projectCount
}: UnifiedTitleBarProps) {
  console.log('[UnifiedTitleBar] Rendering, viewMode:', viewMode);

  return (
    <div className="unified-title-bar">
      <div className="unified-title-bar-content">
        {/* Left: Refresh button */}
        <div className="title-bar-left">
          {onRefresh && (
            <button 
              className="refresh-btn" 
              onClick={onRefresh}
              title="Refresh projects and todos"
            >
              ↻
            </button>
          )}
        </div>

        {/* Center: Project View button + Claude logo + Global View button */}
        <div className="title-bar-center">
          <button
            className={`view-toggle-btn ${viewMode === 'project' ? 'active' : ''}`}
            onClick={() => onViewModeChange('project')}
            title="View individual project todos"
          >
            Project View
          </button>
          
          <img src={ClaudeLogo} alt="Claude" className="claude-logo throb-rotate" />
          
          <button
            className={`view-toggle-btn ${viewMode === 'global' ? 'active' : ''}`}
            onClick={() => onViewModeChange('global')}
            title="View all active todos across projects"
          >
            Global View
          </button>
        </div>

        {/* Right: Spacing controls only */}
        <div className="title-bar-right">

          {/* Spacing controls */}
          <div className="title-bar-spacing-controls">
            <label className="spacing-label" title="Adjust the spacing between rows">SPACING:</label>
            <div className="spacing-buttons">
              <button
                className="spacing-btn spacing-cycle-btn active"
                onClick={() => {
                  const modes: SpacingMode[] = ['wide', 'normal', 'compact'];
                  const currentIndex = modes.indexOf(spacingMode);
                  const nextIndex = (currentIndex + 1) % modes.length;
                  onSpacingModeChange(modes[nextIndex]);
                }}
                title="Click to cycle through spacing modes: Wide → Normal → Compact"
              >
                {spacingMode === 'wide' ? 'Wide' : spacingMode === 'normal' ? 'Normal' : 'Compact'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}