import React, { forwardRef } from 'react';
import type { Project } from '../models/Project';

interface Props {
  x: number;
  y: number;
  project: Project;
  onCopyProjectName: () => void;
  onCopyProjectPath: () => void;
  onCopyFlattenedPath: () => void;
  onDeleteProject: () => void;
}

export const ProjectContextMenu = forwardRef<HTMLDivElement, Props>(function ProjectContextMenu(
  { x, y, project, onCopyProjectName, onCopyProjectPath, onCopyFlattenedPath, onDeleteProject },
  ref
) {
  return (
    <div
      ref={ref}
      className="context-menu"
      style={{
        position: 'fixed',
        top: y,
        left: x,
        background: '#2a2d31',
        border: '1px solid #3f4448',
        borderRadius: '4px',
        padding: '4px 0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        zIndex: 1000,
        minWidth: '200px',
      }}
    >
      <div
        className="context-menu-item"
        onClick={onCopyProjectName}
        style={{ padding: '8px 16px', cursor: 'pointer', color: '#e1e1e1', fontSize: '13px' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#3a3d41')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        Copy Project Name
      </div>
      <div
        className="context-menu-item"
        onClick={onCopyProjectPath}
        style={{ padding: '8px 16px', cursor: 'pointer', color: '#e1e1e1', fontSize: '13px' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#3a3d41')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        Copy Project Path
      </div>
      <div
        className="context-menu-item"
        onClick={onCopyFlattenedPath}
        style={{ padding: '8px 16px', cursor: 'pointer', color: '#e1e1e1', fontSize: '13px' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#3a3d41')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        Copy Flattened Path
      </div>
      <div style={{ height: '1px', background: '#3f4448', margin: '4px 0' }} />
      <div
        className="context-menu-item"
        onClick={onDeleteProject}
        style={{ padding: '8px 16px', cursor: 'pointer', color: '#ff6b6b', fontSize: '13px' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#3a3d41')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        Delete Project
      </div>
    </div>
  );
});

