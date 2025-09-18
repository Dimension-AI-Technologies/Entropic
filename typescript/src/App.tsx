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
  const DEBUG = !!(import.meta as any)?.env?.DEV;
  const dlog = (...args: any[]) => { if (DEBUG) console.log(...args); };
  dlog('[APP] App component rendering!');
  dlog('=== APP DEBUG: Function App() called ===');
  
  // Simple boolean loading state - no complex objects
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<{ claude: boolean; codex: boolean; gemini: boolean }>({ claude: false, codex: false, gemini: false });
  const [bootSteps, setBootSteps] = useState<string[]>(['Initializing application...']);
  const [providerFilter, setProviderFilter] = useState<{ claude: boolean; codex: boolean; gemini: boolean }>(() => {
    try {
      const raw = localStorage.getItem('ui.providerFilter');
      if (raw) {
        const p = JSON.parse(raw);
        return { claude: p.claude !== false, codex: p.codex !== false, gemini: p.gemini !== false };
      }
    } catch {}
    return { claude: true, codex: true, gemini: true };
  });
  
  const [viewMode, setViewMode] = useState<'project' | 'global'>('project');
  const [spacingMode, setSpacingMode] = useState<'wide' | 'normal' | 'compact'>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ui.spacingMode') as any : null;
    return saved === 'wide' || saved === 'normal' || saved === 'compact' ? saved : 'compact';
  });
  const [toasts, setToasts] = useState<Array<{ id: number; text: string }>>([]);
  const [reloading, setReloading] = useState(false);
  
  // Activity mode state for auto-selection
  const [activityMode, setActivityMode] = useState(false);
  const [statusText, setStatusText] = useState('Ready');
  
  // Initialize MVVM container and viewModels using useMemo to prevent recreation
  const { container, projectsViewModel, todosViewModel, initError } = useMemo(() => {
    dlog('[APP] Getting DIContainer instance...');
    try {
      const container = DIContainer.getInstance();
      dlog('[APP] DIContainer obtained successfully');
      
      const projectsViewModel = container.getProjectsViewModel();
      dlog('[APP] ProjectsViewModel obtained successfully');
      
      const todosViewModel = container.getTodosViewModel();
      dlog('[APP] TodosViewModel obtained successfully');
      
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

  // Boot: detect providers then continue to app load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBootSteps(['Scanning coding agents...']);
        const pres = await (window as any).electronAPI?.getProviderPresence?.();
        if (!cancelled && pres) {
          setProviders({ claude: !!pres.claude, codex: !!pres.codex, gemini: !!pres.gemini });
          const found: string[] = [];
          if (pres.claude) found.push('Claude');
          if (pres.codex) found.push('Codex');
          if (pres.gemini) found.push('Gemini');
          setBootSteps([
            'Scanning coding agents...',
            `Found: ${found.length ? found.join(', ') : 'None'}`,
            'Loading projects...'
          ]);
        }
      } catch {}
      // small delay for splash; proceed
      if (!cancelled) setTimeout(() => setLoading(false), 900);
    })();
    return () => { cancelled = true; };
  }, []);

  // Apply provider filter to DI and persist
  useEffect(() => {
    try { localStorage.setItem('ui.providerFilter', JSON.stringify(providerFilter)); } catch {}
    try { const { setProviderAllow } = require('./services/DIContainer'); setProviderAllow(providerFilter); } catch {}
  }, [providerFilter]);
  
  // Subscribe to VM changes for status bar counts
  useEffect(() => {
    if (!projectsViewModel || !todosViewModel) return;
    const update = () => {
      try {
        const sessions = todosViewModel.getSessions();
        const activeTodos = sessions.reduce((sum, s) => sum + (s.todos?.filter(t => t.status !== 'completed').length || 0), 0);
        const uniqueProjects = new Set(
          sessions
            .map((s: any) => s.projectPath || '')
            .filter((p: string) => p && p !== 'Unknown Project')
        );
        setStatusText(`${uniqueProjects.size} projects • ${activeTodos} active todos`);
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
  
  // Persist spacingMode
  useEffect(() => {
    try { localStorage.setItem('ui.spacingMode', spacingMode); } catch {}
  }, [spacingMode]);

  // Expose toast helper
  useEffect(() => {
    (window as any).__addToast = (text: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, text }]);
      setTimeout(() => setToasts((prev) => prev.filter(t => t.id !== id)), 2500);
    };
    return () => { try { delete (window as any).__addToast; } catch {} };
  }, []);
  
  // Listen for screenshot notifications from main and show consistent toast
  useEffect(() => {
    const api: any = (window as any).electronAPI;
    if (!api?.onScreenshotTaken) return;
    const off = api.onScreenshotTaken((_e: any, data: any) => {
      const p = data?.path;
      if (p) (window as any).__addToast?.(`Screenshot saved. Path copied: ${p}`);
      else (window as any).__addToast?.(`Screenshot failed: ${data?.error || 'Unknown reason'}`);
    });
    return () => { try { off?.(); } catch {} };
  }, []);
  
  // Add debugging for loading state changes
  useEffect(() => {
    dlog('[App] loading state changed to:', loading);
  }, [loading]);

  // Refresh function for ViewModels - with safety checks to prevent crashes
  const handleRefresh = async () => {
    console.log('[App] Refreshing data...');
    setReloading(true);
    setStatusText('Reloading...');
    try {
      // Clear models so UI empties before reload
      if (projectsViewModel && typeof projectsViewModel.setProjects === 'function') {
        projectsViewModel.setProjects([]);
      }
      try { (todosViewModel as any)?.clearAll?.(); } catch {}
      (window as any).__addToast?.('Reloading...');

      if (projectsViewModel && typeof projectsViewModel.refresh === 'function') {
        try {
          await projectsViewModel.refresh();
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          (window as any).__addToast?.(`Project refresh failed: ${msg}`);
          console.error('Project refresh failed:', e);
        }
      }
      if (todosViewModel && typeof todosViewModel.refresh === 'function') {
        try {
          await todosViewModel.refresh();
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          (window as any).__addToast?.(`Session refresh failed: ${msg}`);
          console.error('Session refresh failed:', e);
        }
      }
      (window as any).__addToast?.('Refresh complete');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[App] Error during refresh:', error);
      (window as any).__addToast?.(`Refresh failed: ${msg}`);
    } finally {
      setReloading(false);
    }
  };


  // Log current loading state
  dlog('[App] Current loading state:', loading, 'viewMode:', viewMode);
  
  // Check simple loading state
  if (loading) {
    dlog('[App] Rendering SplashScreen, loading:', loading);
    return (
      <SplashScreen loadingSteps={bootSteps} isComplete={false} providers={providers} />
    );
  }
  
  dlog('[APP DEBUG] Past loading check, loading=false - SUCCESS!');
  
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
          providerFilter={providerFilter}
          onProviderFilterChange={setProviderFilter}
        />
        
        {/* Content area - either project view or global view */}
        <div className="content-area" style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {(() => {
            dlog(`[APP RENDER DEBUG] viewMode = "${viewMode}", about to render ${viewMode === 'global' ? 'GlobalView' : 'ProjectView'}`);
            if (viewMode === 'global') {
              dlog('[APP RENDER] Rendering GlobalView component');
              return <GlobalView spacingMode={spacingMode} />;
            } else {
              dlog('[APP RENDER] Rendering ProjectView component');
              return <ProjectView activityMode={activityMode} setActivityMode={setActivityMode} spacingMode={spacingMode} onSpacingModeChange={setSpacingMode} />;
            }
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
