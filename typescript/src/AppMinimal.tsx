import React, { useState, useEffect } from 'react';
import './App.css';

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
    };
  }
}

function AppMinimal() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    console.log('[AppMinimal] Loading todos...');
    try {
      const data = await window.electronAPI.getTodos();
      console.log('[AppMinimal] Got data:', data.length, 'projects');
      setProjects(data);
      setLoading(false);
    } catch (error) {
      console.error('[AppMinimal] Error loading todos:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', color: 'white' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div className="app" style={{ padding: '20px', color: 'white' }}>
      <h1>Todo Monitor - Minimal Version</h1>
      <p>Projects loaded: {projects.length}</p>
      <button onClick={loadTodos}>Refresh</button>
      
      <div style={{ marginTop: '20px' }}>
        {projects.map((project, i) => (
          <div key={i} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #444' }}>
            <h3>{project.path}</h3>
            <p>Sessions: {project.sessions.length}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AppMinimal;