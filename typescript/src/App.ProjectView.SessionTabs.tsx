import React from 'react';

interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
  id?: string;
  created?: Date;
}

interface Session {
  id: string;
  todos: Todo[];
  lastModified: Date;
  created?: Date;
  filePath?: string;
}

interface Project {
  path: string;
  sessions: Session[];
  mostRecentTodoDate?: Date;
}

// Helper function to format dates in UK format: dd-MMM-yyyy
function formatUKDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Helper function to format time in UK format: HH:mm
function formatUKTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

interface SessionTabsProps {
  selectedProject: Project | null;
  selectedSession: Session | null;
  onSessionSelect: (session: Session) => void;
  selectedTabs: Set<string>;
  onStartMerge: () => void;
  onTabClick: (e: React.MouseEvent, session: Session) => void;
  onTabRightClick: (e: React.MouseEvent, session: Session) => void;
  showContextMenu: boolean;
  contextMenuPosition: { x: number; y: number };
  onContextMenuCopyId: () => void;
  onContextMenuClose: () => void;
}

export function SessionTabs({ 
  selectedProject, 
  selectedSession, 
  selectedTabs,
  onStartMerge,
  onTabClick,
  onTabRightClick,
  showContextMenu,
  contextMenuPosition,
  onContextMenuCopyId
}: SessionTabsProps) {

  const getStatusCounts = (session: Session) => {
    const counts = session.todos.reduce((acc, todo) => {
      acc[todo.status] = (acc[todo.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      pending: counts.pending || 0,
      in_progress: counts.in_progress || 0,
      completed: counts.completed || 0
    };
  };
  
  const getSessionTooltip = (session: Session, project: Project, isMultiSelected: boolean) => {
    const counts = getStatusCounts(session);
    const projectName = project.path ? project.path.split(/[\\/]/).pop() : 'Unknown Project';
    
    // Get the todo folder path - handle undefined filePath
    const filePath = session.filePath || '';
    const lastSlashIndex = filePath ? Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\')) : -1;
    const todoFolderPath = lastSlashIndex > 0 ? filePath.substring(0, lastSlashIndex) : 'Unknown';
    const fileName = filePath ? filePath.split(/[\\/]/).pop() : 'Unknown';
    
    const tooltipLines = [
      `Project Name: ${projectName}`,
      `Project Path: ${project.path}`,
      `Todo Folder: ${todoFolderPath}`,
      `Session ID: ${session.id}`,
      `File: ${fileName}`,
      '',
      'Todo Summary:',
      `  ${counts.pending} Pending`,
      `  ${counts.in_progress} In Progress`,
      `  ${counts.completed} Completed`,
      `  Total: ${session.todos.length} todos`,
      '',
      `Last Modified: ${formatUKDate(session.lastModified)} ${formatUKTime(session.lastModified)}`
    ];
    
    // Add merge instruction
    if (isMultiSelected) {
      tooltipLines.push('', '✓ Selected for merge');
    } else {
      tooltipLines.push('', 'Shift+Click or Right-Click to select for merge');
    }
    
    return tooltipLines.join('\n');
  };

  if (!selectedProject) {
    return null;
  }

  return (
    <div className="session-tabs">
      {selectedProject.sessions
        .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
        .map((session) => {
        const counts = getStatusCounts(session);
        const isSelected = selectedSession?.id === session.id;
        const isMultiSelected = selectedTabs.has(session.id);
        
        return (
          <div
            key={session.id}
            className={`session-tab ${isSelected ? 'active' : ''} ${isMultiSelected ? 'multi-selected' : ''}`}
            onClick={(e) => onTabClick(e, session)}
            onContextMenu={(e) => onTabRightClick(e, session)}
            title={getSessionTooltip(session, selectedProject, isMultiSelected)}
          >
            <div className="session-info">
              <div className="session-id">{session.id.substring(0, 6)}</div>
              <div className="session-date">
                {formatUKDate(session.lastModified)} {formatUKTime(session.lastModified)}
              </div>
            </div>
          </div>
        );
      })}
      {selectedTabs.size >= 2 && (
        <button className="merge-button" onClick={onStartMerge}>
          Merge Selected ({selectedTabs.size})
        </button>
      )}

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
        >
          <div className="context-menu-item" onClick={onContextMenuCopyId}>
            Copy Session ID
          </div>
        </div>
      )}
    </div>
  );
}