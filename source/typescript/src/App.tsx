import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './App.css';
import { SplashScreen } from './components/SplashScreen';
import { ProjectView } from './App.ProjectView';
import { GlobalView } from './App.GlobalView';
import { GitView, type GitRepoStatus } from './App.GitView';
import { CommitView, type RepoCommits } from './App.CommitView';
import { UnifiedTitleBar } from './components/UnifiedTitleBar';
import { AnimatedBackground } from './components/AnimatedBackground';
import { BoidSystem } from './components/BoidSystem';
import { DIContainer, setProviderAllow } from './services/DIContainer';


const DEFAULT_PROVIDER_FILTER = { claude: true, codex: true, gemini: true } as const;

function App() {
  const DEBUG = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production');
  const dlog = (...args: any[]) => { if (DEBUG) console.log(...args); };
  dlog('[APP] App component rendering!');
  dlog('=== APP DEBUG: Function App() called ===');
  
  // Simple boolean loading state - no complex objects
  const [loading, setLoading] = useState(() => (typeof process !== 'undefined' && process.env?.JEST_WORKER_ID ? false : true));
  const [providers, setProviders] = useState<{ claude: boolean; codex: boolean; gemini: boolean }>({ claude: false, codex: false, gemini: false });
  const [bootSteps, setBootSteps] = useState<string[]>(['Initializing application...']);
  const bootStartRef = useRef<number>(Date.now());
  const [bootReady, setBootReady] = useState(false);
  const isTestEnv = typeof process !== 'undefined' && !!process.env?.JEST_WORKER_ID;
  const [providerFilter, setProviderFilter] = useState<{ claude: boolean; codex: boolean; gemini: boolean }>(() => {
    try {
      const raw = localStorage.getItem('ui.providerFilter');
      if (raw) {
        const p = JSON.parse(raw);
        const sanitized = {
          claude: p?.claude !== false,
          codex: p?.codex !== false,
          gemini: p?.gemini !== false,
        };
        if (!sanitized.claude && !sanitized.codex && !sanitized.gemini) {
          return { ...DEFAULT_PROVIDER_FILTER };
        }
        return sanitized;
      }
    } catch {}
    return { ...DEFAULT_PROVIDER_FILTER };
  });
  
  const [viewMode, setViewMode] = useState<'project' | 'global' | 'git' | 'commit'>('project');
  const [spacingMode, setSpacingMode] = useState<'wide' | 'normal' | 'compact'>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ui.spacingMode') as any : null;
    return saved === 'wide' || saved === 'normal' || saved === 'compact' ? saved : 'compact';
  });
  const [toasts, setToasts] = useState<Array<{ id: number; text: string }>>([]);
  const [reloading, setReloading] = useState(false);
  
  // Activity mode state for auto-selection
  const [activityMode, setActivityMode] = useState(false);
  const [statusText, setStatusText] = useState('Ready');

  const [projectsAvailable, setProjectsAvailable] = useState(0);
  const [sessionsAvailable, setSessionsAvailable] = useState(0);
  const [gitRepos, setGitRepos] = useState<GitRepoStatus[]>([]);
  const [gitLoading, setGitLoading] = useState(false);
  const [gitError, setGitError] = useState<string | null>(null);
  const [gitLastLoaded, setGitLastLoaded] = useState<number | null>(null);

  const [commitRepos, setCommitRepos] = useState<RepoCommits[]>([]);
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [commitLastLoaded, setCommitLastLoaded] = useState<number | null>(null);
  const [viewModelsInitialized, setViewModelsInitialized] = useState(false);

  const STALE_MS = 5 * 60 * 1000;

  const loadGitStatus = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (!window.electronAPI?.getGitStatus) {
      setGitError('Git status API unavailable');
      setGitRepos([]);
      return;
    }
    if (!force) {
      if (gitLoading) return;
      if (gitRepos.length > 0 && gitLastLoaded && Date.now() - gitLastLoaded < STALE_MS) return;
    }
    setGitLoading(true);
    setGitError(null);
    try {
      const result = await window.electronAPI.getGitStatus();
      if (result && typeof result === 'object' && 'success' in result) {
        if (result.success) {
          setGitRepos(Array.isArray(result.value) ? result.value : []);
          setGitLastLoaded(Date.now());
        } else {
          setGitError(result.error || 'Failed to load git status');
          setGitRepos([]);
        }
      } else if (Array.isArray(result)) {
        setGitRepos(result);
        setGitLastLoaded(Date.now());
      } else {
        setGitError('Unsupported response from git status');
        setGitRepos([]);
      }
    } catch (e: any) {
      setGitError(e?.message || 'Failed to load git status');
      setGitRepos([]);
    } finally {
      setGitLoading(false);
    }
  }, [gitLoading, gitRepos, gitLastLoaded]);

  const loadCommitHistory = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (!window.electronAPI?.getGitCommits) {
      setCommitError('Commit API unavailable');
      setCommitRepos([]);
      return;
    }
    if (!force) {
      if (commitLoading) return;
      if (commitRepos.length > 0 && commitLastLoaded && Date.now() - commitLastLoaded < STALE_MS) return;
    }
    setCommitLoading(true);
    setCommitError(null);
    try {
      const result = await window.electronAPI.getGitCommits({ limit: 100 });
      if (result && typeof result === 'object' && 'success' in result) {
        if (result.success) {
          setCommitRepos(Array.isArray(result.value) ? result.value : []);
          setCommitLastLoaded(Date.now());
        } else {
          setCommitError(result.error || 'Failed to load commit history');
          setCommitRepos([]);
        }
      } else if (Array.isArray(result)) {
        setCommitRepos(result);
        setCommitLastLoaded(Date.now());
      } else {
        setCommitError('Unsupported response from commit history');
        setCommitRepos([]);
      }
    } catch (e: any) {
      setCommitError(e?.message || 'Failed to load commit history');
      setCommitRepos([]);
    } finally {
      setCommitLoading(false);
    }
  }, [commitLoading, commitRepos, commitLastLoaded]);
  
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
    bootStartRef.current = Date.now();
    setBootReady(false);
    if (isTestEnv) {
      setBootSteps(['Loading projects...']);
      setBootReady(true);
      setLoading(false);
      return () => { cancelled = true; };
    }
    setLoading(true);
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
    })();
    return () => { cancelled = true; };
  }, [projectsViewModel, todosViewModel, isTestEnv]);

  useEffect(() => {
    if (bootReady || !loading) return;
    if (viewModelsInitialized) {
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
  
  // Persist spacingMode
  useEffect(() => {
    try { localStorage.setItem('ui.spacingMode', spacingMode); } catch {}
  }, [spacingMode]);

  useEffect(() => {
    if (viewMode === 'git') {
      loadGitStatus({ force: true });
    }
    if (viewMode === 'commit') {
      loadCommitHistory({ force: true });
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
        const projectResult = await projectsViewModel.refresh();
        if (!projectResult.success) {
          (window as any).__addToast?.(`Project refresh failed: ${projectResult.error}`);
          console.error('Project refresh failed:', projectResult.error);
        }
      }
      if (todosViewModel && typeof todosViewModel.refresh === 'function') {
        const todoResult = await todosViewModel.refresh();
        if (!todoResult.success) {
          (window as any).__addToast?.(`Session refresh failed: ${todoResult.error}`);
          console.error('Session refresh failed:', todoResult.error);
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
