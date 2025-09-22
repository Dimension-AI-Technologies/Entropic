// Project list rendering component
import React from 'react';
import type { Project, EmptyMode } from './types';
import { formatUKDate, formatUKTime } from './utils';

interface ProjectListProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
  onProjectContextMenu?: (e: React.MouseEvent, project: Project) => void;
  deletedProjects?: Set<string>;
  emptyMode: EmptyMode;
  showFailedReconstructions: boolean;
}

export function ProjectList({
  projects,
  selectedProject,
  onSelectProject,
  onProjectContextMenu,
  deletedProjects,
  emptyMode,
  showFailedReconstructions
}: ProjectListProps) {
  // Filter projects based on empty mode
  const filteredProjects = projects.filter(project => {
    if (deletedProjects?.has(project.path)) return false;

    switch (emptyMode) {
      case 'all':
        return true;
      case 'has_sessions':
        return project.sessions.length > 0;
      case 'has_todos':
        return project.sessions.some(session => session.todos?.length > 0);
      case 'active_only':
        return project.sessions.some(session =>
          session.todos?.some(todo => todo.status !== 'completed')
        );
      default:
        return true;
    }
  });

  // Further filter based on failed reconstructions setting
  const displayProjects = showFailedReconstructions
    ? filteredProjects
    : filteredProjects.filter(project => !project.path.includes('Unknown') && !project.path.includes('FAILED'));

  if (displayProjects.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
        No projects found
      </div>
    );
  }

  return (
    <div className="projects-list">
      {displayProjects.map(project => {
        const totalTodos = project.sessions.reduce((sum, session) => sum + (session.todos?.length || 0), 0);
        const activeTodos = project.sessions.reduce((sum, session) =>
          sum + (session.todos?.filter(todo => todo.status !== 'completed').length || 0), 0
        );
        const completedTodos = totalTodos - activeTodos;

        return (
          <div
            key={project.path}
            className={`project-item ${selectedProject?.path === project.path ? 'selected' : ''}`}
            onClick={() => onSelectProject(project)}
            onContextMenu={(e) => onProjectContextMenu?.(e, project)}
            style={{ cursor: 'pointer' }}
          >
            <div className="project-header">
              <div className="project-name" title={project.path}>
                {project.path.split('/').pop() || project.path}
              </div>
              <div className="project-stats">
                {totalTodos > 0 && (
                  <span className="todo-count">
                    {activeTodos > 0 && <span className="active-todos">{activeTodos}</span>}
                    {completedTodos > 0 && <span className="completed-todos">/{completedTodos}</span>}
                    {activeTodos === 0 && completedTodos === 0 && <span>{totalTodos}</span>}
                  </span>
                )}
                <span className="session-count">{project.sessions.length} sessions</span>
              </div>
            </div>

            {project.mostRecentTodoDate && (
              <div className="project-meta">
                <span className="last-activity">
                  {formatUKDate(project.mostRecentTodoDate)} {formatUKTime(project.mostRecentTodoDate)}
                </span>
                {project.provider && (
                  <span className="provider">{project.provider}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}