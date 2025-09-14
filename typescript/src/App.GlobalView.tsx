import { useState, useEffect } from 'react';
import './App.css';
import { DIContainer } from './services/DIContainer';
import { Project as MVVMProject } from './models/Project';

interface GlobalViewProps {
  spacingMode?: 'wide' | 'normal' | 'compact';
}

export function GlobalView({ spacingMode = 'compact' }: GlobalViewProps) {
  const [projects, setProjects] = useState<MVVMProject[]>([]);
  const [version, setVersion] = useState(0);
  const [activeOnly, setActiveOnly] = useState(false);

  const container = DIContainer.getInstance();
  const projectsViewModel = container.getProjectsViewModel();
  const todosViewModel = container.getTodosViewModel();

  useEffect(() => {
    const updateProjects = () => setProjects(projectsViewModel.getProjects());
    updateProjects();
    const unProjects = projectsViewModel.onChange(updateProjects);
    const unTodos = todosViewModel.onChange(() => setVersion(v => v + 1));
    return () => {
      const u = unProjects as any; if (typeof u === 'function') u();
      unTodos();
    };
  }, [projectsViewModel, todosViewModel]);

  // Build rows per session, latest first
  const allRows = projects.flatMap(p => {
    const sessions = todosViewModel.getSessionsForProject(p.path);
    return sessions.map(s => ({ p, s }));
  }).sort((a, b) => b.s.lastModified.getTime() - a.s.lastModified.getTime());
  const rows = allRows.filter(({ s }) => {
    if (!activeOnly) return true;
    const hasActive = (s.todos || []).some((t: any) => t.status !== 'completed');
    return hasActive;
  });

  const pickCurrent = (todos: any[]) => {
    if (!Array.isArray(todos) || todos.length === 0) return null;
    return todos.find(t => t.status === 'in_progress')
      || todos.find(t => t.status === 'pending')
      || todos[0];
  };
  const pickNext = (todos: any[], current: any) => {
    if (!Array.isArray(todos) || todos.length === 0) return null;
    const idx = current ? todos.indexOf(current) : -1;
    // Next pending item after current, or first pending
    const after = idx >= 0 ? todos.slice(idx + 1) : todos;
    return after.find(t => t.status === 'pending') || todos.find(t => t.status === 'pending') || null;
  };

  // Stats for subtitle (based on filtered rows)
  const activeTodos = rows.reduce((sum, r) => sum + ((r.s.todos || []).filter((t: any) => t.status !== 'completed').length), 0);
  const activeProjects = new Set(rows.map(r => r.p.id)).size;

  // Spacing presets tied to app spacingMode
  const spacing = (() => {
    switch (spacingMode) {
      case 'wide':
        return { pad: 14, headerPad: 12, dateWidth: 170, font: 13 };
      case 'normal':
        return { pad: 10, headerPad: 10, dateWidth: 160, font: 13 };
      case 'compact':
      default:
        return { pad: 8, headerPad: 8, dateWidth: 150, font: 12 };
    }
  })();

  // Column widths: Project | Current | Date | Next
  const gridCols = `2fr 4fr ${spacing.dateWidth}px 4fr`;
  const headerStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: gridCols, padding: `${spacing.headerPad}px 14px`, background: '#2a2d33', color: '#bfc3c8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 };
  const cellBase: React.CSSProperties = { padding: `${spacing.pad}px 14px`, borderTop: '1px solid #30343a', display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center', background: '#23262b', fontSize: spacing.font };
  const dot = (color: string) => ({ width: 8, height: 8, borderRadius: 8, background: color, display: 'inline-block', marginRight: 8 });

  return (
    <div className="global-view" style={{ padding: 16, color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ width: 18, height: 18, borderRadius: 18, background: '#e79b5c', boxShadow: '0 0 8px rgba(231,155,92,0.6)' }} />
        <div style={{ fontSize: 18, fontWeight: 600 }}>Global Activity Overview</div>
      </div>
      <div style={{ color: '#a2a7ad', fontSize: 12, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{activeTodos} active todos across {activeProjects} projects</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }} title="Hide sessions with only completed items">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
          <span>Active only</span>
        </label>
      </div>
      <div style={{ border: '1px solid #3a3d42', borderRadius: 6, overflow: 'hidden', background: '#202328' }}>
        <div style={headerStyle}>
          <div>Project</div>
          <div>Current Task</div>
          <div style={{ textAlign: 'left' }}>Date</div>
          <div>Next Task</div>
        </div>
        <div>
          {rows.map(({ p, s }) => {
            const curr = pickCurrent(s.todos || []);
            const next = pickNext(s.todos || [], curr);
            const hasActive = (s.todos || []).some((t: any) => t.status !== 'completed');
            const accent = hasActive ? '#2ACB68' : '#5b6168';
            return (
              <div key={`${p.id}-${s.id}`} style={cellBase}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 4, height: 24, background: accent, borderRadius: 2, marginRight: 10 }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.path.split(/[\\/]/).pop()}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{s.id.substring(0, 6)}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#e6e7e8' }}>
                  <span style={dot('#e0b012')}></span>
                  {curr ? curr.content : <span style={{ opacity: 0.6 }}>No task</span>}
                </div>
                <div style={{ fontSize: 12, color: '#c9cbce' }}>{s.lastModified.toLocaleString()}</div>
                <div style={{ fontSize: 13, color: '#c9cbce' }}>
                  <span style={dot('#7aa0f7')}></span>
                  {next ? next.content : <span style={{ opacity: 0.6 }}>No next task</span>}
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div style={{ padding: 16, color: '#a2a7ad' }}>No sessions found</div>
          )}
        </div>
      </div>
    </div>
  );
}
