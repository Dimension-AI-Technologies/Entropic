import { useState, useEffect, useMemo } from 'react';
import { PaneHeader, PaneControls } from './components/PaneLayout';
import { useRef } from 'react';
import { useDismissableMenu } from './components/hooks/useDismissableMenu';
// Result helpers are not needed here

interface PromptEntry {
  timestamp: string;
  message: {
    role: 'user' | 'assistant';
    content: string;
  };
  sessionId: string;
  uuid: string;
}

interface PromptViewProps {
  selectedProject: {
    path: string;
    sessions: any[];
    mostRecentTodoDate?: Date;
  } | null;
  spacingMode?: 'wide' | 'normal' | 'compact';
}

export function PromptView({ selectedProject, spacingMode = 'compact' }: PromptViewProps) {
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ui.historySortOrder') as any : null;
    return saved === 'asc' || saved === 'desc' ? saved : 'asc';
  });
  const [menuState, setMenuState] = useState<{ visible: boolean; x: number; y: number; prompt?: PromptEntry }>(() => ({ visible: false, x: 0, y: 0 }));
  const promptMenuRef = useRef<HTMLDivElement>(null);
  useDismissableMenu(menuState.visible, (v) => setMenuState(s => ({ ...s, visible: v })), promptMenuRef);

  // Convert project path to flattened path format (replace both forward and backslashes)
  const getFlattenedProjectPath = (projectPath: string): string => {
    return projectPath.replace(/[/\\]/g, '-');
  };

  const loadPrompts = async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    setError(null);
    try {
      // Get project prompts from main process
      const result = await window.electronAPI.getProjectPrompts(selectedProject.path);
      
      console.log('PromptView: Received result from backend:', result);
      
      // Check if the result is successful
      if (!result.success || !result.value) {
        console.error('PromptView: Failed to get prompts:', result.error);
        setError(result.error || 'Failed to load prompts');
        setPrompts([]);
        setLoading(false);
        return;
      }
      
      const projectPrompts = result.value;
      console.log('PromptView: Type of prompts:', typeof projectPrompts);
      console.log('PromptView: Is array?', Array.isArray(projectPrompts));
      
      // Validate prompts data
      if (!Array.isArray(projectPrompts)) {
        console.error('PromptView: Not an array!', projectPrompts);
        // Return early instead of throwing
        console.error('PromptView: Invalid prompts data received');
        setError('Invalid prompts data received');
        setPrompts([]);
        setLoading(false);
        return;
      }
      
      console.log(`PromptView: Total prompts received: ${projectPrompts.length}`);
      
      // Filter out invalid entries and sort chronologically
      const validPrompts = projectPrompts.filter(p => {
        const isValid = p && p.timestamp && p.message && typeof p.message.content === 'string';
        if (!isValid && p) {
          console.log('PromptView: Invalid prompt entry:', p);
        }
        return isValid;
      });
      
      console.log(`PromptView: Valid prompts after filtering: ${validPrompts.length}`);
      
      const sortedPrompts = validPrompts.sort((a: PromptEntry, b: PromptEntry) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      });
      
      setPrompts(sortedPrompts);
    } catch (error) {
      console.error('Error loading prompts:', error);
      setError(error instanceof Error ? error.message : 'Failed to load prompts');
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Clear prompts immediately when project changes
    if (!selectedProject) {
      setPrompts([]);
      setError(null);
      return;
    }
    
    // Clear existing prompts before loading new ones
    setPrompts([]);
    loadPrompts();
  }, [selectedProject?.path, sortOrder]);

  // Persist sort order
  useEffect(() => {
    try { localStorage.setItem('ui.historySortOrder', sortOrder); } catch {}
  }, [sortOrder]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  };

  const formatPromptContent = (content: string) => {
    // Truncate very long prompts
    if (content.length > 500) {
      return content.substring(0, 500) + '...';
    }
    return content;
  };

  // Spacing settings for tiles
  const tileSpacing = useMemo(() => {
    switch (spacingMode) {
      case 'wide': return 12;
      case 'normal': return 6;
      default: return 0;
    }
  }, [spacingMode]);

  if (!selectedProject) {
    return (
      <div className="prompt-history-view" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <PaneHeader className="project-header"><h1>Select a project</h1></PaneHeader>
      </div>
    );
  }

  const flatPath = getFlattenedProjectPath(selectedProject.path);
  return (
    <div className="prompt-history-view" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Controls row: left = flattened path, right = sort toggle */}
      <PaneControls className="pane-controls">
        {/* Left: flattened path */}
        <div
          style={{ flex: 1, color: '#b9bbbe', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
          title="Click or right-click to copy flattened path"
          onClick={() => { try { navigator.clipboard.writeText(flatPath); (window as any).__addToast?.('Copied flattened path'); } catch {} }}
          onContextMenu={(e) => { e.preventDefault(); try { navigator.clipboard.writeText(flatPath); (window as any).__addToast?.('Copied flattened path'); } catch {} }}
        >
          {flatPath}
        </div>
        {/* Right: sort order + loading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="sort-controls" title="Sort order">
            <button
              className={`spacing-btn spacing-cycle-btn active`}
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              style={{ minWidth: 140 }}
              title={sortOrder === 'asc' ? 'Oldest first' : 'Newest first'}
            >
              {sortOrder === 'asc' ? '↑ Oldest First' : '↓ Newest First'}
            </button>
          </div>
          <div style={{ minWidth: 120, textAlign: 'right', color: '#b9bbbe' }}>{loading ? 'Loading…' : ''}</div>
        </div>
      </PaneControls>

      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      )}

      {!loading && !error && prompts.length === 0 && (
        <div className="no-prompts">
          <p>No prompts found for this project.</p>
          <p>The system searches for JSONL files using the same path resolution logic as todo loading.</p>
          <p>Expected locations: ~/.claude/projects/[project-directory]/*.jsonl</p>
        </div>
      )}

      <div className="prompts-list" style={{ overflowY: 'auto', padding: 12 }}>
        {prompts.map((prompt, index) => (
          <div
            key={prompt.uuid || `prompt-${index}`}
            className={`prompt-entry ${prompt.message.role}`}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenuState({ visible: true, x: e.clientX, y: e.clientY, prompt });
            }}
            style={{ marginBottom: tileSpacing }}
          >
            <div className="prompt-header">
              <span className="prompt-number">#{index + 1}</span>
              <span className="prompt-time">{formatTime(prompt.timestamp)}</span>
              <span className="prompt-role">{prompt.message.role}</span>
              <span className="session-id">{prompt.sessionId ? prompt.sessionId.substring(0, 8) : 'Unknown'}</span>
            </div>
            <div className="prompt-content">
              {formatPromptContent(prompt.message.content)}
            </div>
          </div>
        ))}
      </div>

      {menuState.visible && (
        <div
          ref={promptMenuRef}
          style={{ position: 'fixed', top: menuState.y + 6, left: menuState.x + 6, background: '#2f3136', color: '#e6e7e8', border: '1px solid #3b3e44', borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,0.4)', zIndex: 9999, minWidth: 160, padding: 6 }}
          onMouseLeave={() => setMenuState(s => ({ ...s, visible: false }))}
        >
          <button
            className="filter-toggle"
            onClick={() => { if (menuState.prompt) { navigator.clipboard.writeText(menuState.prompt.message.content); (window as any).__addToast?.('Copied prompt'); } setMenuState(s => ({ ...s, visible: false })); }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', margin: 0 }}
          >
            Copy Prompt
          </button>
          <button
            className="filter-toggle"
            onClick={() => { if (menuState.prompt) { navigator.clipboard.writeText(menuState.prompt.uuid || menuState.prompt.sessionId || ''); (window as any).__addToast?.('Copied prompt ID'); } setMenuState(s => ({ ...s, visible: false })); }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', margin: 0 }}
          >
            Copy Prompt ID
          </button>
        </div>
      )}
    </div>
  );
}

// Note: electronAPI.getProjectPrompts is added in preload.ts
// Type is handled in the main global declaration
