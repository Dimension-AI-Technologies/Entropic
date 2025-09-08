import React, { useState, useEffect } from 'react';

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
}

export function PromptView({ selectedProject }: PromptViewProps) {
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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
      const projectPrompts = await window.electronAPI.getProjectPrompts(selectedProject.path);
      
      console.log('PromptView: Received prompts from backend:', projectPrompts);
      console.log('PromptView: Type of prompts:', typeof projectPrompts);
      console.log('PromptView: Is array?', Array.isArray(projectPrompts));
      
      // Validate prompts data
      if (!Array.isArray(projectPrompts)) {
        console.error('PromptView: Not an array!', projectPrompts);
        throw new Error('Invalid prompts data received');
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
    loadPrompts();
  }, [selectedProject?.path, sortOrder]);

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

  if (!selectedProject) {
    return (
      <div className="prompt-history-view">
        <h3>Select a project to view prompt history</h3>
      </div>
    );
  }

  return (
    <div className="prompt-history-view">
      <div className="prompt-history-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Prompt History: {selectedProject.path}</h3>
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="sort-toggle-btn"
            title={`Sort ${sortOrder === 'asc' ? 'newest first' : 'oldest first'}`}
          >
            {sortOrder === 'asc' ? '↑ Oldest First' : '↓ Newest First'}
          </button>
        </div>
        <p className="flattened-path">
          Flattened path: {getFlattenedProjectPath(selectedProject.path)}
        </p>
        {loading && <span className="loading-indicator">Loading...</span>}
      </div>

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

      <div className="prompts-list">
        {prompts.map((prompt, index) => (
          <div key={prompt.uuid || `prompt-${index}`} className={`prompt-entry ${prompt.message.role}`}>
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
    </div>
  );
}

// Note: electronAPI.getProjectPrompts is added in preload.ts
// Type is handled in the main global declaration