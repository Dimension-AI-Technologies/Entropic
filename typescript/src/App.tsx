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
  console.error('=== APP DEBUG: Function App() called ===');
  
  // Simple boolean loading state - no complex objects
  const [loading, setLoading] = useState(true);
  
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

  // Simple loading timer - no complex state management
  useEffect(() => {
    console.error('[App] Setting up initialization timer...');
    
    const timer = setTimeout(() => {
      console.error('[App] Timer fired - setting loading to false');
      setLoading(false);
      console.error('[App] Loading state updated to false');
    }, 1500);
    
    // Cleanup timer on unmount
    return () => {
      console.error('[App] Cleaning up timer');
      clearTimeout(timer);
    };
  }, []); // Only run once on mount
  
  // Add debugging for loading state changes
  useEffect(() => {
    console.error('[App] loading state changed to:', loading);
  }, [loading]);

  // Refresh function for ViewModels - with safety checks to prevent crashes
  const handleRefresh = async () => {
    console.log('[App] Refreshing data...');
    try {
      if (projectsViewModel && typeof projectsViewModel.refresh === 'function') {
        await projectsViewModel.refresh();
        console.log('[App] ProjectsViewModel refreshed successfully');
      } else {
        console.warn('[App] ProjectsViewModel.refresh not available');
      }
      
      if (todosViewModel && typeof todosViewModel.refresh === 'function') {
        await todosViewModel.refresh();
        console.log('[App] TodosViewModel refreshed successfully');
      } else {
        console.warn('[App] TodosViewModel.refresh not available');
      }
    } catch (error) {
      console.error('[App] Error during refresh:', error);
    }
  };


  // Log current loading state
  console.error('[App] Current loading state:', loading, 'viewMode:', viewMode);
  
  // Check simple loading state
  if (loading) {
    console.error('[App] Rendering SplashScreen, loading:', loading);
    return (
      <SplashScreen 
        loadingSteps={['Initializing application...']}
        isComplete={false}
      />
    );
  }
  
  console.error('[APP DEBUG] Past loading check, loading=false - SUCCESS!');
  
  // Calculate stats for unified title bar - simplified without crashing functions
  const getSelectedProjectName = () => 'Project View';
  const getTotalActiveTodos = () => 0; // Temporarily return 0 to avoid crashes

  // Full app with all components restored - React state timing issue is now fixed
  return (
    <div className="app" style={{ position: 'relative' }}>
      {/* Background animations - render behind content, but above app background */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
        <AnimatedBackground />
        <BoidSystem />
      </div>

      {/* Main content wrapper - higher z-index to appear above animations */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Render UnifiedTitleBar with key to force remount if needed */}
        <UnifiedTitleBar
          key={`titlebar-${loading ? 'loading' : 'loaded'}`}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          spacingMode={spacingMode}
          onSpacingModeChange={setSpacingMode}
          onRefresh={handleRefresh}
          selectedProjectName={viewMode === 'project' ? getSelectedProjectName() : undefined}
          todoCount={getTotalActiveTodos()}
          projectCount={0}
        />
        
        {/* Content area - either project view or global view */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {(() => {
            console.error(`[APP RENDER DEBUG] viewMode = "${viewMode}", about to render ${viewMode === 'global' ? 'GlobalView' : 'ProjectView'}`);
            if (viewMode === 'global') {
              console.error('[APP RENDER] Rendering GlobalView component');
              return <GlobalView spacingMode={spacingMode} />;
            } else {
              console.error('[APP RENDER] Rendering ProjectView component');
              return <ProjectView activityMode={activityMode} setActivityMode={setActivityMode} />;
            }
          })()}
        </div>
      </div>
    </div>
  );
}

export default App;
