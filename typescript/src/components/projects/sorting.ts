// Project sorting logic
import type { Project, SortMethod } from './types';

// Get sort symbol for display
export function getSortSymbol(sortMethod: SortMethod): string {
  switch (sortMethod) {
    case 0: return 'AZ';
    case 1: return '⏱';
    case 2: return '#';
    default: return '⏱';
  }
}

// Sort projects based on the selected method
export function sortProjects(projects: Project[], sortMethod: SortMethod): Project[] {
  const sorted = [...projects];

  switch (sortMethod) {
    case 0: // Alphabetic
      sorted.sort((a, b) => a.path.localeCompare(b.path));
      break;
    case 1: // Recent activity
      sorted.sort((a, b) => {
        const aDate = a.mostRecentTodoDate || new Date(0);
        const bDate = b.mostRecentTodoDate || new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
      break;
    case 2: // Todo count
      sorted.sort((a, b) => {
        const aTodos = a.sessions.reduce((sum, session) => sum + (session.todos?.length || 0), 0);
        const bTodos = b.sessions.reduce((sum, session) => sum + (session.todos?.length || 0), 0);
        return bTodos - aTodos;
      });
      break;
  }

  return sorted;
}