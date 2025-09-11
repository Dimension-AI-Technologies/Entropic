import React, { useState, useEffect } from 'react';
import './App.css';
import { SplashScreen } from './components/SplashScreen';
import { ProjectView } from './App.ProjectView';
import { GlobalView } from './App.GlobalView';
import { UnifiedTitleBar } from './components/UnifiedTitleBar';
import { Result, Ok, Err } from './utils/Result';

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

declare global {
  interface Window {
    electronAPI: {
      getTodos: () => Promise<Project[]>;
      saveTodos: (filePath: string, todos: Todo[]) => Promise<boolean>;
      deleteTodoFile: (filePath: string) => Promise<boolean>;
      onTodoFilesChanged: (callback: (event: any, data: any) => void) => () => void;
    };
  }
}

function App() {
  console.error('[APP] App component rendering!');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState<string[]>([]);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [viewMode, setViewMode] = useState<'project' | 'global'>('project');
  const [spacingMode, setSpacingMode] = useState<'wide' | 'normal' | 'compact'>('compact');
  
  // Activity mode state for auto-selection
  const [activityMode, setActivityMode] = useState(false);
  const [lastGlobalMostRecentTime, setLastGlobalMostRecentTime] = useState<Date | null>(null);
  
  // State for cross-view navigation
  const [selectedProjectPath, setSelectedProjectPath] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedTodoIndex, setSelectedTodoIndex] = useState<number | null>(null);

  // Function to find and select the globally most recent session
  const selectMostRecentSession = (projects: Project[]) => {
    let mostRecentProject: Project | null = null;
    let mostRecentSession: Session | null = null;
    let mostRecentDate: Date | null = null;
    
    // Find the absolutely most recent session across all projects
    for (const project of projects) {
      for (const session of project.sessions) {
        const sessionDate = new Date(session.lastModified);
        if (!mostRecentDate || sessionDate > mostRecentDate) {
          mostRecentDate = sessionDate;
          mostRecentProject = project;
          mostRecentSession = session;
        }
      }
    }
    
    // Select the most recent session found
    if (mostRecentProject && mostRecentSession) {
      // Switch to project view and select the most recent session
      setViewMode('project');
      // The ProjectView component will handle the selection internally
    }
  };

  // Load todos data initially and set up file watching
  useEffect(() => {
    loadTodos();
    
    // Set up file watching for immediate updates when hooks write files
    // This replaces polling - updates happen instantly when files change
    const cleanup = window.electronAPI.onTodoFilesChanged((event: any, data: any) => {
      console.log('[App] File change detected:', data);
      // Always reload data when files change (immediate updates)
      loadTodos();
    });
    
    return () => {
      cleanup(); // Clean up the file watcher listener
    };
  }, []); // Only set up once on mount

  const loadTodos = async (): Promise<Result<void>> => {
    console.log('[App] loadTodos called');
    
    // Use Result pattern for the entire loading operation
    const loadResult = await (async (): Promise<Result<Project[]>> => {
      try {
        // Initial loading step
        setLoadingSteps(['Fetching todo data...']);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const data = await window.electronAPI.getTodos();
        console.log('[App] Got data from IPC:', data.length, 'projects');
        
        // Show found projects
        setLoadingSteps(prev => [...prev, `Found ${data.length} projects`]);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        return Ok(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Failed to load todos:', error);
        setLoadingSteps(prev => [...prev, `Error: ${errorMessage}`]);
        return Err(`Failed to load todos: ${errorMessage}`, error);
      }
    })();
    
    if (!loadResult.success) {
      setLoadingComplete(true);
      setTimeout(() => {
        setLoading(false);
      }, 1000);
      return loadResult;
    }
    
    const data = loadResult.value;
      
      // Process projects with visible delays
      const deduplicatedData: Project[] = [];
      
      for (let i = 0; i < data.length; i++) {
        const project = data[i];
        const projectName = project.path?.split(/[\\/]/).pop() || 'Unknown';
        
        setLoadingSteps(prev => [...prev, `Processing: ${projectName}`]);
        
        // Deduplicate sessions within the project
        const processedProject = {
          ...project,
          sessions: project.sessions.reduce((unique: Session[], session) => {
            const existing = unique.find(s => s.id === session.id);
            if (existing) {
              // Merge todos and use latest modified date
              const allTodos = [...existing.todos, ...session.todos];
              const uniqueTodos = allTodos.filter((todo, index, self) => 
                index === self.findIndex(t => t.content === todo.content && t.status === todo.status)
              );
              existing.todos = uniqueTodos;
              existing.lastModified = new Date(Math.max(existing.lastModified.getTime(), session.lastModified.getTime()));
            } else {
              unique.push(session);
            }
            return unique;
          }, [])
        };
        
        deduplicatedData.push(processedProject);
        
        // Add a small delay for user visibility, but not too long
        // Faster for large numbers of projects
        const delay = data.length > 10 ? 50 : 150;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      setLoadingSteps(prev => [...prev, 'Deduplication complete']);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('[App] Setting projects:', deduplicatedData.length, 'projects');
      setProjects(deduplicatedData);
      
      // Activity mode: Auto-focus on the globally most recent session
      if (activityMode) {
        let globalMostRecentProject: Project | null = null;
        let globalMostRecentSession: Session | null = null;
        let globalMostRecentTime: Date | null = null;
        
        // Find the globally most recent session across all projects
        for (const project of deduplicatedData) {
          for (const session of project.sessions) {
            const sessionTime = new Date(session.lastModified);
            if (!globalMostRecentTime || sessionTime > globalMostRecentTime) {
              globalMostRecentTime = sessionTime;
              globalMostRecentProject = project;
              globalMostRecentSession = session;
            }
          }
        }
        
        // Auto-select if we found a more recent session than what we knew before
        if (globalMostRecentProject && globalMostRecentSession && globalMostRecentTime) {
          if (!lastGlobalMostRecentTime || globalMostRecentTime > lastGlobalMostRecentTime) {
            setLoadingSteps(prev => [...prev, `Selecting recent session: ${globalMostRecentSession.id.substring(0, 6)}`]);
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Find the most relevant todo to select (first in_progress, then first pending)
            let todoIndexToSelect = -1;
            const todos = globalMostRecentSession.todos;
            
            // First, look for the first in_progress todo
            todoIndexToSelect = todos.findIndex(t => t.status === 'in_progress');
            
            // If no in_progress, look for the first pending todo
            if (todoIndexToSelect === -1) {
              todoIndexToSelect = todos.findIndex(t => t.status === 'pending');
            }
            
            // If still no match, select the first todo if any exist
            if (todoIndexToSelect === -1 && todos.length > 0) {
              todoIndexToSelect = 0;
            }
            
            // Switch to project view and auto-select the project, session, and todo
            setViewMode('project');
            setSelectedProjectPath(globalMostRecentProject.path);
            setSelectedSessionId(globalMostRecentSession.id);
            setSelectedTodoIndex(todoIndexToSelect >= 0 ? todoIndexToSelect : null);
          }
          
          // Always update our knowledge of the global most recent time
          setLastGlobalMostRecentTime(globalMostRecentTime);
        }
      }
      
      setLoadingSteps(prev => [...prev, 'Loading complete!']);
      setLoadingComplete(true);
      console.log('[App] Loading complete, hiding splash screen in 500ms');
      // Delay hiding splash screen slightly to show completion
      setTimeout(() => {
        console.log('[App] Hiding splash screen, setting loading to false');
        setLoading(false);
      }, 500);
      
      return Ok(undefined);
  };

  const handleGlobalTodoClick = (project: Project, session: Session, todoIndex: number) => {
    // Set the selected project and session
    setSelectedProjectPath(project.path);
    setSelectedSessionId(session.id);
    // Switch to project view
    setViewMode('project');
  };

  if (loading) {
    console.log('[App] Rendering SplashScreen, loading:', loading);
    return (
      <SplashScreen 
        loadingSteps={loadingSteps}
        isComplete={loadingComplete}
      />
    );
  }
  
  console.log('[App] Past loading check, rendering main app. ViewMode:', viewMode, 'Projects:', projects.length);
  console.error('[APP RENDER] About to render main app structure');
  
  // Calculate stats for unified title bar
  const getSelectedProjectName = () => {
    // For Project View, get the selected project name
    // This will need to be enhanced when we integrate with ProjectView state
    return 'Project View';
  };

  const getTotalActiveTodos = () => {
    return projects.reduce((total, project) => {
      return total + project.sessions.reduce((sessionTotal, session) => {
        return sessionTotal + session.todos.filter(todo => todo.status === 'in_progress').length;
      }, 0);
    }, 0);
  };

  // For debugging: Simple render first
  if (!projects || projects.length === 0) {
    return (
      <div className="app" style={{ padding: '20px', color: 'white' }}>
        <h2>No projects loaded yet...</h2>
        <button onClick={loadTodos}>Reload</button>
      </div>
    );
  }

  // Full app with all components
  return (
    <div className="app">
      <UnifiedTitleBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        spacingMode={spacingMode}
        onSpacingModeChange={setSpacingMode}
        onRefresh={loadTodos}
        selectedProjectName={viewMode === 'project' ? getSelectedProjectName() : undefined}
        todoCount={getTotalActiveTodos()}
        projectCount={projects.length}
      />
      
      {/* Content area - either project view or global view */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {viewMode === 'global' ? (
          <GlobalView 
            projects={projects} 
            onTodoClick={handleGlobalTodoClick} 
            onRefresh={async () => { await loadTodos(); }} 
            spacingMode={spacingMode} 
          />
        ) : (
          <ProjectView 
            projects={projects} 
            onLoadTodos={async () => { await loadTodos(); }}
            initialProjectPath={selectedProjectPath}
            initialSessionId={selectedSessionId}
            initialTodoIndex={selectedTodoIndex}
            activityMode={activityMode}
            setActivityMode={setActivityMode}
          />
        )}
      </div>
    </div>
  );
}

export default App;