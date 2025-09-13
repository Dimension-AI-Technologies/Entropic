import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { ProjectsPaneMVVM } from './components/ProjectsPaneMVVM';
import { SingleProjectPane } from './App.ProjectView.SingleProjectPane';
import { DIContainer } from './services/DIContainer';
import { Project as MVVMProject } from './models/Project';
import { Session, Todo } from './models/Todo';
import { ProjectContextMenu } from './components/ProjectContextMenu';
import { useResize } from './components/hooks/useResize';


interface ProjectViewProps {
  activityMode: boolean;
  setActivityMode: (mode: boolean) => void;
}

export function ProjectView({ activityMode, setActivityMode }: ProjectViewProps) {
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

  // Get ViewModels from container
  const container = DIContainer.getInstance();
  const projectsViewModel = container.getProjectsViewModel();
  const todosViewModel = container.getTodosViewModel();
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Subscribe to ViewModel changes and sync local state
  useEffect(() => {
    // Initial load
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
    
    updateProjects();
    updateSessions();
    
    // Subscribe to changes
    const unsubscribeProjects = projectsViewModel.onChange(updateProjects);
    const unsubscribeTodos = todosViewModel.onChange(updateSessions);
    
    return () => {
      unsubscribeProjects();
      unsubscribeTodos();
    };
  }, [projectsViewModel, todosViewModel])

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

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu]);

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
        <ProjectsPaneMVVM
          viewModel={projectsViewModel}
          todosViewModel={todosViewModel}
          selectedProject={selectedMVVMProject}
          onSelectProject={selectMVVMProject}
          onProjectContextMenu={handleMVVMProjectContextMenu}
          onRefresh={async () => {
            await projectsViewModel.refresh();
            await todosViewModel.refresh();
          }}
          activityMode={activityMode}
          setActivityMode={setActivityMode}
          deletedProjects={deletedProjects}
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
      />
      
      {/* Context Menu */}
      {contextMenu && (
        <ProjectContextMenu
          ref={contextMenuRef}
          x={contextMenu.x}
          y={contextMenu.y}
          project={contextMenu.project}
          onCopyProjectName={handleCopyProjectName}
          onCopyProjectPath={handleCopyProjectPath}
          onCopyFlattenedPath={handleCopyFlattenedPath}
          onDeleteProject={handleDeleteProject}
        />
      )}
    </div>
  );
}
