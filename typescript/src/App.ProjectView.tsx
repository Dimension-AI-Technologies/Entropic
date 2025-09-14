import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { ProjectsPane } from './App.ProjectView.ProjectsPane';
import { SingleProjectPane } from './App.ProjectView.SingleProjectPane';
import { DIContainer } from './services/DIContainer';
import { Project as MVVMProject } from './models/Project';
import { Session, Todo } from './models/Todo';
import { ProjectContextMenuController } from './components/menus/ProjectContextMenuController';
import { useResize } from './components/hooks/useResize';


interface ProjectViewProps {
  activityMode: boolean;
  setActivityMode: (mode: boolean) => void;
}

export function ProjectView({ activityMode, setActivityMode }: ProjectViewProps) {
  console.error('[ProjectView] ===== COMPONENT FUNCTION CALLED =====');
  console.log('[ProjectView] Rendering');
  const [projects, setProjects] = useState<MVVMProject[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedMVVMProject, setSelectedMVVMProject] = useState<MVVMProject | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedTodoIndex, setSelectedTodoIndex] = useState<number | null>(null);
  const [projectSessionMap, setProjectSessionMap] = useState<Map<string, string>>(new Map());
  const { leftPaneWidth, setLeftPaneWidth, isResizing, setIsResizing } = useResize(260, 200, 400);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, project: MVVMProject} | null>(null);
  const [deletedProjects, setDeletedProjects] = useState<Set<string>>(new Set());
  const [emptyMode, setEmptyMode] = useState<'all' | 'has_sessions' | 'has_todos' | 'active_only'>('has_todos');

  // Get ViewModels from container
  const container = DIContainer.getInstance();
  const projectsViewModel = container.getProjectsViewModel();
  const todosViewModel = container.getTodosViewModel();
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Legacy project format for compatibility with existing components
  const [legacyProjects, setLegacyProjects] = useState<Array<{
    path: string;
    sessions: Array<{
      id: string;
      todos: Todo[];
      lastModified: Date;
      created?: Date;
      filePath?: string;
    }>;
    mostRecentTodoDate?: Date;
  }>>([]);
  
  // Enhanced legacy projects that merge in MVVM session data
  const [enhancedLegacyProjects, setEnhancedLegacyProjects] = useState<Array<{
    path: string;
    sessions: Array<{
      id: string;
      todos: Todo[];
      lastModified: Date;
      created?: Date;
      filePath?: string;
    }>;
    mostRecentTodoDate?: Date;
  }>>([]);

  // Subscribe to ViewModel changes and sync local state
  useEffect(() => {
    // Initial load - get the actual data from Electron API directly as fallback
    const loadLegacyData = async () => {
      try {
        if (window.electronAPI?.getTodos) {
          const rawProjects = await window.electronAPI.getTodos();
          console.log('[ProjectView] Got raw projects directly:', rawProjects.length);
          setLegacyProjects(rawProjects);
        } else {
          console.warn('[ProjectView] electronAPI.getTodos not available; skipping legacy load');
          setLegacyProjects([]);
        }
      } catch (error) {
        console.error('[ProjectView] Failed to load legacy data:', error);
      }
    };
    
    const updateProjects = () => {
      const vmProjects = projectsViewModel.getProjects();
      setProjects(vmProjects);
      console.log('[ProjectView] Updated projects from ViewModel:', vmProjects.length);
    };
    
    const updateSessions = () => {
      const vmSessions = todosViewModel.getSessions();
      setSessions(vmSessions);
      console.log('[ProjectView] Updated sessions from ViewModel:', vmSessions.length);
    };
    
    // Load legacy data immediately
    console.error('[ProjectView] ===== LOADING LEGACY DATA =====');
    loadLegacyData();
    
    updateProjects();
    updateSessions();
    
    // Subscribe to changes
    const unsubscribeProjects = projectsViewModel.onChange(updateProjects);
    const unsubscribeTodos = todosViewModel.onChange(updateSessions);
    
    return () => {
      unsubscribeProjects();
      unsubscribeTodos();
    };
  }, [projectsViewModel, todosViewModel]);

  // Effect to merge MVVM sessions into legacy project format
  useEffect(() => {
    const mergeSessionsIntoProjects = () => {
      const enhanced = legacyProjects.map(legacyProject => {
        // Find all sessions for this project path
        const projectSessions = sessions.filter(s => s.projectPath === legacyProject.path);
        
        // Convert MVVM sessions to legacy format
        const legacySessions = projectSessions.map(s => ({
          id: s.id,
          todos: s.todos,
          lastModified: s.lastModified,
          created: s.created,
          filePath: s.filePath
        }));
        
        // Use existing sessions if no MVVM sessions found, otherwise merge
        const finalSessions = legacySessions.length > 0 ? legacySessions : legacyProject.sessions || [];
        
        return {
          ...legacyProject,
          sessions: finalSessions,
          mostRecentTodoDate: legacyProject.mostRecentTodoDate || 
            (finalSessions.length > 0 ? 
              finalSessions.reduce((latest, session) => 
                session.lastModified > latest ? session.lastModified : latest, 
                new Date(0)
              ) : undefined)
        };
      });
      
      console.log('[ProjectView] Enhanced legacy projects:', enhanced.length, 'projects with merged sessions');
      setEnhancedLegacyProjects(enhanced);
    };
    
    mergeSessionsIntoProjects();
  }, [legacyProjects, sessions]);

  // Resizing logic moved to useResize hook

  // Auto-select most recent project and session on initial load
  useEffect(() => {
    if (!selectedMVVMProject && projects.length > 0) {
      // Select the most recently modified project
      const sortedProjects = projectsViewModel.getProjectsSortedByDate();
      if (sortedProjects.length > 0) {
        setSelectedMVVMProject(sortedProjects[0]);
      }
    }
    
    if (!selectedSession && sessions.length > 0) {
      // Select the most recently modified session
      const sortedSessions = todosViewModel.getSessionsSortedByDate();
      if (sortedSessions.length > 0) {
        setSelectedSession(sortedSessions[0]);
      }
    }
  }, [projects, sessions, selectedMVVMProject, selectedSession, projectsViewModel, todosViewModel]);

  // Update selected project when projects change
  useEffect(() => {
    if (selectedMVVMProject) {
      const updated = projects.find(p => p.id === selectedMVVMProject.id);
      if (updated) {
        setSelectedMVVMProject(updated);
      }
    }
    
    // Update selected session when sessions change
    if (selectedSession) {
      const updated = sessions.find(s => s.id === selectedSession.id);
      if (updated) {
        setSelectedSession(updated);
      }
    }
  }, [projects, sessions, selectedMVVMProject, selectedSession]);


  // Handle MVVM project selection
  const selectMVVMProject = (mvvmProject: MVVMProject) => {
    // Save current session selection before switching
    if (selectedMVVMProject && selectedSession) {
      setProjectSessionMap(prev => {
        const newMap = new Map(prev);
        newMap.set(selectedMVVMProject.path, selectedSession.id);
        return newMap;
      });
    }
    
    setSelectedMVVMProject(mvvmProject);
    
    // Check if we have a previously selected session for this project
    const rememberedSessionId = projectSessionMap.get(mvvmProject.path);
    if (rememberedSessionId) {
      const rememberedSession = sessions.find(s => s.id === rememberedSessionId);
      if (rememberedSession) {
        setSelectedSession(rememberedSession);
        return;
      }
    }
    
    // Otherwise, select the most recent session for this project
    const projectSessions = todosViewModel.getSessionsForProject(mvvmProject.path);
    if (projectSessions.length > 0) {
      const mostRecent = [...projectSessions].sort((a, b) => 
        b.lastModified.getTime() - a.lastModified.getTime()
      )[0];
      setSelectedSession(mostRecent);
    } else {
      setSelectedSession(null);
    }
  };
  
  const selectSession = (session: Session) => {
    setSelectedSession(session);
    
    // Remember this session selection for the current project
    if (selectedMVVMProject) {
      setProjectSessionMap(prev => {
        const newMap = new Map(prev);
        newMap.set(selectedMVVMProject.path, session.id);
        return newMap;
      });
    }
  };

  // Project context menu closes via overlay in ProjectContextMenu

  const handleMVVMProjectContextMenu = (e: React.MouseEvent, mvvmProject: MVVMProject) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, project: mvvmProject });
  };
  
  const getFlattenedPath = (projectPath: string): string => {
    // Convert project path to flattened path format used in ~/.claude/projects
    let flatPath = projectPath;
    
    // Assume Unix-style paths for now, can be enhanced later
    // Replace home directory pattern
    if (flatPath.startsWith('/Users/')) {
      const parts = flatPath.split('/');
      if (parts.length > 2) {
        flatPath = `-Users-${parts[2]}${flatPath.substring(`/Users/${parts[2]}`.length)}`;
      }
    }
    
    // Replace path separators with hyphens
    flatPath = flatPath.replace(/[/\\]/g, '-');
    
    // Handle Windows-style paths
    if (flatPath.includes(':')) {
      flatPath = flatPath.replace(':', '');
    }
    
    return flatPath;
  };
  
  const handleCopyProjectName = () => {
    if (contextMenu) {
      const projectName = contextMenu.project.path.split(/[\\/]/).pop() || 'Unknown';
      navigator.clipboard.writeText(projectName);
      setContextMenu(null);
    }
  };
  
  const handleCopyProjectPath = () => {
    if (contextMenu) {
      navigator.clipboard.writeText(contextMenu.project.path);
      setContextMenu(null);
    }
  };
  
  const handleCopyFlattenedPath = () => {
    if (contextMenu) {
      const flatPath = getFlattenedPath(contextMenu.project.path);
      // Construct the full path manually without Node.js path module
      const homePath = '/Users/' + (contextMenu.project.path.split('/')[2] || 'unknown');
      const fullPath = `${homePath}/.claude/projects/${flatPath}`;
      navigator.clipboard.writeText(fullPath);
      setContextMenu(null);
    }
  };
  
  const handleDeleteProject = async () => {
    if (contextMenu) {
      const projectToDelete = contextMenu.project;
      const projectName = projectToDelete.path.split(/[\\/]/).pop() || 'Unknown';
      
      // Show confirmation dialog
      if (window.confirm(`Are you sure you want to delete the project "${projectName}"?\n\nThis will remove it from the list but won't delete any files on disk.`)) {
        // Close context menu immediately
        setContextMenu(null);
        
        // Immediately hide the project from UI by adding it to deletedProjects
        setDeletedProjects(prev => {
          const newSet = new Set(prev);
          newSet.add(projectToDelete.path);
          return newSet;
        });
        
        // If this is the selected project, clear selection
        if (selectedMVVMProject?.path === projectToDelete.path) {
          setSelectedMVVMProject(null);
          setSelectedSession(null);
          setSelectedTodoIndex(null);
        }
        
        // Get the flattened path for the project
        const flatPath = getFlattenedPath(projectToDelete.path);
        const projectDirPath = `/Users/${projectToDelete.path.split('/')[2] || 'unknown'}/.claude/projects/${flatPath}`;
        
        try {
          // Call backend to delete the project directory
          const result = await window.electronAPI.deleteProjectDirectory(projectDirPath);
          
          if (result.success && result.value) {
            console.log('Successfully deleted project directory:', projectDirPath);
          } else if (result.success) {
            console.log('Could not delete project directory (may not exist):', projectDirPath);
          } else {
            console.error('Error deleting project directory:', result.error);
          }
        } catch (error) {
          console.error('Error calling deleteProjectDirectory:', error);
          // Continue anyway - we still want to remove from UI
        }
        
        // Force refresh ViewModels to get updated list
        await projectsViewModel.refresh();
        await todosViewModel.refresh();
      } else {
        setContextMenu(null);
      }
    }
  };

  return (
    <div className="app-main">
      {/* Projects Pane (Left) */}
      <div className="sidebar" style={{ width: leftPaneWidth }}>
        <ProjectsPane
          projects={enhancedLegacyProjects}
          selectedProject={selectedMVVMProject ? {
            path: selectedMVVMProject.path,
            sessions: sessions.filter(s => s.projectPath === selectedMVVMProject.path).map(s => ({
              id: s.id,
              todos: s.todos,
              lastModified: s.lastModified,
              created: s.created,
              filePath: s.filePath
            })),
            mostRecentTodoDate: selectedMVVMProject.lastModified
          } : null}
          onSelectProject={(project) => {
            const mvvmProject = projects.find(p => p.path === project.path) || {
              id: project.path.replace(/[/\\:]/g, '-'),
              path: project.path,
              flattenedDir: project.path.replace(/[/\\:]/g, '-'),
              pathExists: true,
              lastModified: project.mostRecentTodoDate || new Date()
            };
            selectMVVMProject(mvvmProject);
          }}
          onProjectContextMenu={handleMVVMProjectContextMenu}
          onRefresh={async () => {
          if (window.electronAPI?.getTodos) {
            const rawProjects = await window.electronAPI.getTodos();
            setLegacyProjects(rawProjects);
          }
          await projectsViewModel.refresh();
          await todosViewModel.refresh();
        }}
          activityMode={activityMode}
          setActivityMode={setActivityMode}
          deletedProjects={deletedProjects}
          emptyMode={emptyMode}
          onEmptyModeChange={setEmptyMode}
        />
      </div>
      
      {/* Resizable Divider */}
      <div 
        className="divider" 
        onMouseDown={() => setIsResizing(true)}
      />
      
      {/* Single Project Pane (Right) */}
      <SingleProjectPane
        selectedProject={selectedMVVMProject}
        selectedSession={selectedSession}
        selectedTodoIndex={selectedTodoIndex}
        onSessionSelect={selectSession}
        onRefresh={async () => {
          await projectsViewModel.refresh();
          await todosViewModel.refresh();
        }}
        emptyMode={emptyMode}
      />
      
      {/* Context Menu */}
      {contextMenu && (
        <ProjectContextMenuController
          visible={!!contextMenu}
          x={contextMenu.x}
          y={contextMenu.y}
          project={contextMenu.project}
          onCopyProjectName={handleCopyProjectName}
          onCopyProjectPath={handleCopyProjectPath}
          onCopyFlattenedPath={handleCopyFlattenedPath}
          onDeleteProject={handleDeleteProject}
          isSelected={selectedMVVMProject?.path === contextMenu.project.path}
          onEnsureSelected={() => selectMVVMProject(contextMenu.project)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
