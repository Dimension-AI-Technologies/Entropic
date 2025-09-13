import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import { SplashScreen } from './components/SplashScreen';
import { ProjectView } from './App.ProjectView';
import { GlobalView } from './App.GlobalView';
import { UnifiedTitleBar } from './components/UnifiedTitleBar';
import { AnimatedBackground } from './components/AnimatedBackground';
import { BoidSystem } from './components/BoidSystem';
import { DIContainer } from './services/DIContainer';


function App() {
  console.error('[APP] App component rendering!');
  const [loading, setLoading] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState<string[]>([]);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [viewMode, setViewMode] = useState<'project' | 'global'>('project');
  const [spacingMode, setSpacingMode] = useState<'wide' | 'normal' | 'compact'>('compact');
  
  // Activity mode state for auto-selection
  const [activityMode, setActivityMode] = useState(false);
  
  // Initialize MVVM container and viewModels using useMemo to prevent recreation
  const { container, projectsViewModel, todosViewModel, initError } = useMemo(() => {
    console.error('[APP] Getting DIContainer instance...');
    try {
      const container = DIContainer.getInstance();
      console.error('[APP] DIContainer obtained successfully');
      
      const projectsViewModel = container.getProjectsViewModel();
      console.error('[APP] ProjectsViewModel obtained successfully');
      
      const todosViewModel = container.getTodosViewModel();
      console.error('[APP] TodosViewModel obtained successfully');
      
      return { container, projectsViewModel, todosViewModel, initError: null };
    } catch (error) {
      console.error('[APP] CRITICAL ERROR initializing ViewModels:', error);
      return { container: null, projectsViewModel: null, todosViewModel: null, initError: error };
    }
  }, []); // Empty dependency array ensures this only runs once
  
  // Handle initialization error
  if (initError) {
    return <div style={{ color: 'white', padding: '20px' }}>Error initializing app: {String(initError)}</div>;
  }

  // Initialize app loading sequence
  useEffect(() => {
    console.log('[App] Setting up initialization...');
    setLoadingSteps(['Initializing application...']);
    
    // Use Promise-based delay instead of setTimeout
    const initApp = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('[App] Async timer completed, showing main app');
      setLoadingSteps(prev => [...prev, 'Loading complete!']);
      setLoadingComplete(true);
      setLoading(false);
      console.log('[App] Set loading to false');
    };
    
    initApp().catch(console.error);
  }, []); // Only run once on mount

  // Refresh function for ViewModels
  const handleRefresh = async () => {
    console.log('[App] Refreshing data...');
    await projectsViewModel.refresh();
    await todosViewModel.refresh();
  };


  console.log('[App] Current state - loading:', loading, 'viewMode:', viewMode);
  
  if (loading) {
    console.log('[App] Rendering SplashScreen, loading:', loading);
    return (
      <SplashScreen 
        loadingSteps={loadingSteps}
        isComplete={loadingComplete}
      />
    );
  }
  
  console.log('[App] Past loading check, rendering main app. ViewMode:', viewMode);
  console.error('[APP RENDER] About to render main app structure');
  
  // Calculate stats for unified title bar
  const getSelectedProjectName = () => {
    // For Project View, get the selected project name
    // This will need to be enhanced when we integrate with ProjectView state
    return 'Project View';
  };

  const getTotalActiveTodos = () => {
    try {
      const statusCounts = todosViewModel.getTodoStatusCounts();
      return statusCounts.in_progress || 0;
    } catch (error) {
      console.error('[App] Error getting todo status counts:', error);
      return 0;
    }
  };


  // Full app with all components
  return (
    <div className="app">
      {/* Background animations - centered on entire window */}
      <AnimatedBackground />
      <BoidSystem />
      
      <UnifiedTitleBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        spacingMode={spacingMode}
        onSpacingModeChange={setSpacingMode}
        onRefresh={handleRefresh}
        selectedProjectName={viewMode === 'project' ? getSelectedProjectName() : undefined}
        todoCount={getTotalActiveTodos()}
        projectCount={(() => {
          try {
            return projectsViewModel.getProjectCount();
          } catch (error) {
            console.error('[App] Error getting project count:', error);
            return 0;
          }
        })()}
      />
      
      {/* Content area - either project view or global view */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {viewMode === 'global' ? (
          <GlobalView 
            spacingMode={spacingMode} 
          />
        ) : (
          <ProjectView 
            activityMode={activityMode}
            setActivityMode={setActivityMode}
          />
        )}
      </div>
    </div>
  );
}

export default App;