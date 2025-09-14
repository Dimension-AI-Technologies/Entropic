import React, { useEffect } from 'react';
import type { Project } from '../../models/Project';
import { ProjectContextMenu } from '../ProjectContextMenu';

interface Props {
  visible: boolean;
  x: number;
  y: number;
  project: Project;
  onCopyProjectName: () => void;
  onCopyProjectPath: () => void;
  onCopyFlattenedPath: () => void;
  onDeleteProject: () => void;
  onClose: () => void;
  isSelected?: boolean;
  onEnsureSelected?: () => void;
}

export function ProjectContextMenuController({ visible, x, y, project, onCopyProjectName, onCopyProjectPath, onCopyFlattenedPath, onDeleteProject, onClose, isSelected, onEnsureSelected }: Props) {
  if (!visible) return null;
  useEffect(() => {
    if (visible && !isSelected && onEnsureSelected) {
      onEnsureSelected();
    }
    // run on mount/visibility change
  }, [visible, isSelected]);
  return (
    <ProjectContextMenu
      x={x}
      y={y}
      project={project}
      onCopyProjectName={onCopyProjectName}
      onCopyProjectPath={onCopyProjectPath}
      onCopyFlattenedPath={onCopyFlattenedPath}
      onDeleteProject={onDeleteProject}
      onClose={onClose}
    />
  );
}
