import React, { useState, useEffect } from 'react';
import { Todo, Session, Project } from '../types';
import ClaudeLogo from '../../assets/ClaudeLogo.png';

interface GlobalOverviewProps {
  projects: Project[];
  onTodoClick: (project: Project, session: Session, todoIndex: number) => void;
  onRefresh?: () => void;
  spacingMode?: SpacingMode;
}

type SortColumn = 'project' | 'session' | 'active' | 'date' | 'next';
type SortDirection = 'asc' | 'desc';
type SpacingMode = 'wide' | 'normal' | 'compact';

export const GlobalOverview: React.FC<GlobalOverviewProps> = ({ projects, onTodoClick, onRefresh, spacingMode = 'compact' }) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [activityLog, setActivityLog] = useState<string>('Ready');
  
  // Update refresh time when projects change
  useEffect(() => {
    setLastRefreshTime(new Date());
    setActivityLog(`Loaded ${projects.length} projects`);
  }, [projects]);
  
  const handleRefresh = () => {
    if (onRefresh) {
      setActivityLog('Refreshing...');
      onRefresh();
    }
  };
  
  // Helper function to get the most recent todo date for a project
  const getProjectMostRecentDate = (project: Project) => {
    let mostRecentDate: Date | null = null;
    project.sessions.forEach(session => {
      if (!mostRecentDate || session.lastModified > mostRecentDate) {
        mostRecentDate = session.lastModified;
      }
    });
    return mostRecentDate || new Date(0);
  };

  // Get flat list of all active tasks with their details
  const getTableData = () => {
    const tableRows: Array<{
      project: Project;
      projectName: string;
      session: Session;
      sessionId: string;
      activeTask: Todo;
      activeTaskIndex: number;
      taskDate: Date;
      nextTask?: Todo;
      nextTaskIndex?: number;
    }> = [];

    projects.forEach(project => {
      const projectName = project.path?.split(/[\\/]/).pop() || 'Unknown Project';
      
      project.sessions.forEach(session => {
        session.todos.forEach((todo, index) => {
          if (todo.status === 'in_progress') {
            // Find the next pending task in the same session
            let nextTask: Todo | undefined;
            let nextTaskIndex: number | undefined;
            
            for (let i = index + 1; i < session.todos.length; i++) {
              if (session.todos[i].status === 'pending') {
                nextTask = session.todos[i];
                nextTaskIndex = i;
                break;
              }
            }

            tableRows.push({
              project,
              projectName,
              session,
              sessionId: session.id.substring(0, 6),
              activeTask: todo,
              activeTaskIndex: index,
              taskDate: session.lastModified, // Using session date as task date
              nextTask,
              nextTaskIndex
            });
          }
        });
      });
    });

    // Sort the table data based on current sort column and direction
    tableRows.sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'project':
          comparison = a.projectName.localeCompare(b.projectName);
          break;
        case 'session':
          comparison = a.sessionId.localeCompare(b.sessionId);
          break;
        case 'active':
          comparison = a.activeTask.content.localeCompare(b.activeTask.content);
          break;
        case 'date':
          comparison = a.taskDate.getTime() - b.taskDate.getTime();
          break;
        case 'next':
          const aNext = a.nextTask?.content || '';
          const bNext = b.nextTask?.content || '';
          comparison = aNext.localeCompare(bNext);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return tableRows;
  };

  const handleColumnClick = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const tableData = getTableData();

  if (tableData.length === 0) {
    return (
      <div className="global-overview-fullscreen">
        <div className="global-empty-state">
          <img src={ClaudeLogo} alt="Claude" className="claude-logo-large throb-rotate" />
          <h1>🎉 All Caught Up!</h1>
          <p>No active todos found across all projects</p>
        </div>
      </div>
    );
  }

  // Format date for display
  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}-${month} ${hours}:${minutes}`;
  };

  return (
    <div className="global-overview-fullscreen">

      <div className="global-table-container">
        <table className={`global-table spacing-${spacingMode}`}>
          <thead>
            <tr>
              <th 
                className="sortable-header"
                onClick={() => handleColumnClick('project')}
              >
                Project{getSortIndicator('project')}
              </th>
              <th 
                className="sortable-header"
                onClick={() => handleColumnClick('session')}
              >
                Session #{getSortIndicator('session')}
              </th>
              <th 
                className="sortable-header"
                onClick={() => handleColumnClick('active')}
              >
                Active Task{getSortIndicator('active')}
              </th>
              <th 
                className="sortable-header"
                onClick={() => handleColumnClick('date')}
              >
                Date{getSortIndicator('date')}
              </th>
              <th 
                className="sortable-header"
                onClick={() => handleColumnClick('next')}
              >
                Next Task{getSortIndicator('next')}
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={`${row.project.path}-${row.session.id}-${row.activeTaskIndex}`} className="table-row">
                <td className="project-cell">
                  <div className="project-name">📁 {row.projectName}</div>
                </td>
                <td className="session-cell">
                  {row.sessionId}
                </td>
                <td 
                  className="active-task-cell clickable"
                  onClick={() => onTodoClick(row.project, row.session, row.activeTaskIndex)}
                >
                  <div className="task-item-inline active-task">
                    <span className="task-status">▶</span>
                    <span className="task-content">{row.activeTask.content}</span>
                  </div>
                </td>
                <td className="date-cell">
                  {formatDate(row.taskDate)}
                </td>
                <td 
                  className={`next-task-cell ${row.nextTask ? 'clickable' : ''}`}
                  onClick={() => row.nextTask && row.nextTaskIndex !== undefined ? 
                    onTodoClick(row.project, row.session, row.nextTaskIndex) : undefined}
                >
                  {row.nextTask ? (
                    <div className="task-item-inline next-task">
                      <span className="task-status">○</span>
                      <span className="task-content">{row.nextTask.content}</span>
                    </div>
                  ) : (
                    <div className="task-placeholder">No next task</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Status bar */}
      <div className="status-bar">
        <div className="status-bar-left">
          Last updated: {lastRefreshTime.toLocaleString('en-GB')}
        </div>
        <div className="status-bar-right">
          {activityLog}
        </div>
      </div>
    </div>
  );
};