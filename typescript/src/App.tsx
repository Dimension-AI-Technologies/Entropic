import React, { useState, useCallback } from 'react';
import './App.css';
import { SplashScreen } from './components/SplashScreen';
import { ProjectView } from './App.ProjectView';
import { GlobalView } from './App.GlobalView';
import { GitView } from './App.GitView';
import { CommitView } from './App.CommitView';
import { UnifiedTitleBar } from './components/UnifiedTitleBar';
import { AnimatedBackground } from './components/AnimatedBackground';
import { BoidSystem } from './components/BoidSystem';
import { useGitStatus, useCommitHistory } from './hooks/useGitOperations';
import { useProviders } from './hooks/useProviders';
import { useBootSequence } from './hooks/useBootSequence';
import { useToasts } from './hooks/useToasts';
import { useViewMode } from './hooks/useViewMode';


function App() {
  const DEBUG = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production');
  const dlog = (...args: any[]) => { if (DEBUG) console.log(...args); };
  dlog('[APP] App component rendering!');
  dlog('=== APP DEBUG: Function App() called ===');

  const isTestEnv = typeof process !== 'undefined' && !!process.env?.JEST_WORKER_ID;

  // Use custom hooks for major functionality
  const { loading, bootSteps, bootReady, projectsViewModel, todosViewModel, initError } = useBootSequence(isTestEnv);
  const { providers, providerFilter, setProviderFilter } = useProviders(isTestEnv);
  const { gitRepos, gitLoading, gitError, loadGitStatus } = useGitStatus();
  const { commitRepos, commitLoading, commitError, loadCommitHistory } = useCommitHistory();
  const { toasts, addToast } = useToasts();
  const { viewMode, setViewMode } = useViewMode();

  // Local state that doesn't warrant extraction
  const [spacingMode, setSpacingMode] = useState<'wide' | 'normal' | 'compact'>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ui.spacingMode') as any : null;
    return saved === 'wide' || saved === 'normal' || saved === 'compact' ? saved : 'compact';
  });
  const [reloading, setReloading] = useState(false);
  const [activityMode, setActivityMode] = useState(false);
  const [statusText, setStatusText] = useState('Ready');
  const [projectsAvailable, setProjectsAvailable] = useState(0);
  const [sessionsAvailable, setSessionsAvailable] = useState(0);

  // Handle initialization error
  if (initError) {
    return <div style={{ color: 'white', padding: '20px' }}>Error initializing app: {String(initError)}</div>;
  }

  // Track boot readiness
  useEffect(() => {
    if (!bootReady && !loading && viewModelsInitialized) {
      setBootReady(true);
    }
  }, [bootReady, loading, viewModelsInitialized]);

  useEffect(() => {
    if (!bootReady || !loading) return;
    const minimumDuration = 900;
    const elapsed = Date.now() - bootStartRef.current;
    const wait = Math.max(0, minimumDuration - elapsed);
    if (wait === 0) {
      setLoading(false);
      return;
    }
    const timer = window.setTimeout(() => setLoading(false), wait);
    return () => window.clearTimeout(timer);
  }, [bootReady, loading]);

  // Apply provider filter to DI and persist, then trigger refresh so UI updates immediately
  useEffect(() => {
    console.log('[App] Provider filter changed:', providerFilter);
    try { localStorage.setItem('ui.providerFilter', JSON.stringify(providerFilter)); } catch {}
    setProviderAllow(providerFilter);
    // Refresh underlying view models to re-apply provider filtering
    console.log('[App] Refreshing ViewModels after filter change');
    // Using async IIFE since refresh now returns Result
    (async () => {
      const projectResult = await projectsViewModel?.refresh?.();
      if (projectResult && !projectResult.success) {
        console.error('[App] Failed to refresh projects:', projectResult.error);
      }
      const todoResult = await todosViewModel?.refresh?.();
      if (todoResult && !todoResult.success) {
        console.error('[App] Failed to refresh todos:', todoResult.error);
      }
    })();
  }, [providerFilter, projectsViewModel, todosViewModel]);
  
  // Subscribe to VM changes for status bar counts and boot availability tracking
  useEffect(() => {
    if (!projectsViewModel || !todosViewModel) return;
    const update = () => {
      try {
        const projectList = projectsViewModel.getProjects();
        const sessions = todosViewModel.getSessions();
        setProjectsAvailable(Array.isArray(projectList) ? projectList.length : 0);
        setSessionsAvailable(Array.isArray(sessions) ? sessions.length : 0);
        const activeTodos = sessions.reduce((sum, s) => sum + (s.todos?.filter(t => t.status !== 'completed').length || 0), 0);
        const uniqueProjects = new Set(
          sessions
            .map((s: any) => s.projectPath || '')
            .filter((p: string) => p && p !== 'Unknown Project')
        );
        setStatusText(`${uniqueProjects.size} projects • ${activeTodos} active todos`);
        setViewModelsInitialized(true);
      } catch {}
    };
    update();
    const unP = projectsViewModel.onChange(update);
    const unT = todosViewModel.onChange(update);
    return () => { (unP as any)?.(); unT(); };
  }, [projectsViewModel, todosViewModel]);

  // Expose navigation helper for Global view
  useEffect(() => {
    (window as any).__navigateToProjectSession = (projectPath: string, sessionId: string, todoIndex?: number) => {
      try {
        setViewMode('project');
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent('navToSession', { detail: { projectPath, sessionId, todoIndex } }));
        }, 0);
      } catch {}
    };
    return () => { try { delete (window as any).__navigateToProjectSession; } catch {} };
  }, []);

  // Listen for view switching from menu
  useEffect(() => {
    if (!window.electronAPI?.onSwitchView) return;

    const unsubscribe = window.electronAPI.onSwitchView((_event, data) => {
      if (data.mode === 'project') {
        setViewMode('project');
        // Handle subview (todo/history) if specified
        if (data.subview === 'history') {
          // Dispatch event to toggle to history view
          window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent('toggleProjectSubview', { detail: { subview: 'history' } }));
          }, 0);
        } else if (data.subview === 'todo') {
          // Dispatch event to toggle to todo view
          window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent('toggleProjectSubview', { detail: { subview: 'todo' } }));
          }, 0);
        }
      } else {
        // For other views, just set the mode
        setViewMode(data.mode as any);
      }
    });

    return () => unsubscribe();
  }, []);
  
  // Persist spacingMode
  useEffect(() => {
    try { localStorage.setItem('ui.spacingMode', spacingMode); } catch {}
  }, [spacingMode]);

  useEffect(() => {
    if (viewMode === 'git') {
      loadGitStatus();
    }
    if (viewMode === 'commit') {
      loadCommitHistory();
    }
  }, [viewMode, loadGitStatus, loadCommitHistory]);

  // Expose toast helper
  useEffect(() => {
    (window as any).__addToast = (text: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, text }]);
      setTimeout(() => setToasts((prev) => prev.filter(t => t.id !== id)), 2500);
    };
    return () => { try { delete (window as any).__addToast; } catch {} };
  }, []);
  
  useEffect(() => {
    if (isTestEnv) return;
    loadGitStatus({ force: true });
    loadCommitHistory({ force: true });
  }, [loadGitStatus, loadCommitHistory, isTestEnv]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const statusEl = document.getElementById('initial-splash-status');
    if (statusEl && bootSteps.length > 0) {
      statusEl.textContent = bootSteps[bootSteps.length - 1];
    }
  }, [bootSteps]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const statusEl = document.getElementById('initial-splash-status');
    if (statusEl) {
      statusEl.textContent = loading ? 'Loading projects...' : 'Ready';
    }
    if (!loading) {
      const splash = document.getElementById('initial-splash');
      if (splash) {
        splash.classList.add('is-hidden');
        window.setTimeout(() => {
          if (splash.parentElement) splash.parentElement.removeChild(splash);
        }, 240);
      }
    }
  }, [loading]);

  // Listen for screenshot notifications from main and show consistent toast
  useEffect(() => {
    const api: any = (window as any).electronAPI;
    if (!api?.onScreenshotTaken) return;
    const off = api.onScreenshotTaken((_e: any, data: any) => {
      const p = data?.path;
      if (p) addToast(`Screenshot saved. Path copied: ${p}`);
      else addToast(`Screenshot failed: ${data?.error || 'Unknown reason'}`);
    });
    return () => { try { off?.(); } catch {} };
  }, [addToast]);
  
  // Add debugging for loading state changes
  useEffect(() => {
    dlog('[App] loading state changed to:', loading);
  }, [loading]);

  // Refresh function for ViewModels - with safety checks to prevent crashes
  const handleRefresh = useCallback(async () => {
    console.log('[App] Refreshing data...');
    setReloading(true);
    setStatusText('Reloading...');
    try {
      // Clear models so UI empties before reload
      if (projectsViewModel && typeof projectsViewModel.setProjects === 'function') {
        projectsViewModel.setProjects([]);
      }
      try { (todosViewModel as any)?.clearAll?.(); } catch {}
      addToast('Reloading...');

      if (projectsViewModel && typeof projectsViewModel.refresh === 'function') {
        const projectResult = await projectsViewModel.refresh();
        if (!projectResult.success) {
          addToast(`Project refresh failed: ${projectResult.error}`);
          console.error('Project refresh failed:', projectResult.error);
        }
      }
      if (todosViewModel && typeof todosViewModel.refresh === 'function') {
        const todoResult = await todosViewModel.refresh();
        if (!todoResult.success) {
          addToast(`Session refresh failed: ${todoResult.error}`);
          console.error('Session refresh failed:', todoResult.error);
        }
      }
      addToast('Refresh complete');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[App] Error during refresh:', error);
      addToast(`Refresh failed: ${msg}`);
    } finally {
      setReloading(false);
      setStatusText('Ready');
    }
  }, [projectsViewModel, todosViewModel, addToast]);


  // Log current loading state
  dlog('[App] Current loading state:', loading, 'viewMode:', viewMode);
  
  if (loading) {
    dlog('[App] Rendering SplashScreen overlay, loading:', loading);
  } else {
    dlog('[APP DEBUG] Past loading check, loading=false - SUCCESS!');
  }

  // Calculate stats for unified title bar - simplified without crashing functions
  const getSelectedProjectName = () => 'Project View';
  const getTotalActiveTodos = () => 0; // Temporarily return 0 to avoid crashes

  // Full app with all components restored - React state timing issue is now fixed
  return (
    <div className="app" style={{ position: 'relative' }}>
      {loading && (
        <div
          className="initial-loading-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 17, 21, 0.92)',
            backdropFilter: 'blur(12px)'
          }}
        >
          <SplashScreen loadingSteps={bootSteps} isComplete={false} providers={providers} />
        </div>
      )}
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
          providerFilter={providerFilter}
          onProviderFilterChange={setProviderFilter}
        />
        
        {/* Content area - either project view or global view */}
        <div className="content-area" style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {(() => {
            dlog(`[APP RENDER DEBUG] viewMode = "${viewMode}"`);
            if (viewMode === 'global') {
              dlog('[APP RENDER] Rendering GlobalView component');
              return <GlobalView spacingMode={spacingMode} />;
            }
            if (viewMode === 'git') {
              dlog('[APP RENDER] Rendering GitView component');
              return (
                <GitView
                  spacingMode={spacingMode}
                  repos={gitRepos}
                  loading={gitLoading}
                  error={gitError}
                  onRefresh={loadGitStatus}
                />
              );
            }
            if (viewMode === 'commit') {
              dlog('[APP RENDER] Rendering CommitView component');
              return (
                <CommitView
                  spacingMode={spacingMode}
                  repos={commitRepos}
                  loading={commitLoading}
                  error={commitError}
                  onRefresh={loadCommitHistory}
                />
              );
            }
            dlog('[APP RENDER] Rendering ProjectView component');
            return <ProjectView activityMode={activityMode} setActivityMode={setActivityMode} spacingMode={spacingMode} onSpacingModeChange={setSpacingMode} />;
          })()}
          {/* Overlay during reload - scoped to content area only */}
          {reloading && (
            <div className="reloading-overlay">
              <div className="reloading-card">
                <div className="reloading-spinner" aria-label="Refreshing" />
                <div className="reloading-title">Refreshing...</div>
                <div className="reloading-sub">Please wait while data is refreshed</div>
              </div>
            </div>
          )}
        </div>
        {/* Toasts */}
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className="toast">{t.text}</div>
          ))}
        </div>
        {/* Universal Status Bar */}
        <div className="universal-status-bar" title="Application status">
          <span>{statusText}</span>
        </div>
      </div>
    </div>
  );
}

export default App;
