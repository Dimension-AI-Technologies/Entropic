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

  // Convert project path to flattened path format
  const getFlattenedProjectPath = (projectPath: string): string => {
    return projectPath.replace(/\//g, '-');
  };

  const loadPrompts = async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    setError(null);
    try {
      // Get project prompts from main process
      const projectPrompts = await window.electronAPI.getProjectPrompts(selectedProject.path);
      
      // Validate prompts data
      if (!Array.isArray(projectPrompts)) {
        throw new Error('Invalid prompts data received');
      }
      
      // Filter out invalid entries and sort chronologically
      const validPrompts = projectPrompts.filter(p => 
        p && p.timestamp && p.message && p.message.content
      );
      
      const sortedPrompts = validPrompts.sort((a: PromptEntry, b: PromptEntry) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
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
  }, [selectedProject?.path]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
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
        <h3>Prompt History: {selectedProject.path}</h3>
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
          <p>JSONL files are expected at: ~/.claude/projects/{getFlattenedProjectPath(selectedProject.path)}/*.jsonl</p>
        </div>
      )}

      <div className="prompts-list">
        {prompts.map((prompt, index) => (
          <div key={prompt.uuid} className={`prompt-entry ${prompt.message.role}`}>
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