import { useState, useEffect, useRef } from 'react';
import './App.css';
import { DIContainer } from './services/DIContainer';
import { Project as MVVMProject } from './models/Project';
import { useDismissableMenu } from './components/hooks/useDismissableMenu';

interface GlobalViewProps {
  spacingMode?: 'wide' | 'normal' | 'compact';
}

type ProviderAwareProject = MVVMProject & { provider?: string };
export function GlobalView({ spacingMode = 'compact' }: GlobalViewProps) {
  const [projects, setProjects] = useState<ProviderAwareProject[]>([]);
  const [version, setVersion] = useState(0);
  const [diag, setDiag] = useState<{ total: number; per: Record<string, number> }>({ total: 0, per: {} });
  const [activeOnly, setActiveOnly] = useState<boolean>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ui.globalActiveOnly') : null;
    return saved === '1';
  });
  const [providerFilter, setProviderFilter] = useState<{ claude: boolean; codex: boolean }>(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('ui.providerFilter') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        return { claude: parsed.claude !== false, codex: parsed.codex !== false };
      }
    } catch {}
    return { claude: true, codex: true };
  });

  const container = DIContainer.getInstance();
  const projectsViewModel = container.getProjectsViewModel();
  const todosViewModel = container.getTodosViewModel();

  useEffect(() => {
    const updateProjects = () => setProjects(projectsViewModel.getProjects());
    updateProjects();
    const unProjects = projectsViewModel.onChange(updateProjects);
    const unTodos = todosViewModel.onChange(() => setVersion(v => v + 1));
    // Fetch diagnostics for banner (hex, per provider)
    (async () => {
      try {
        const d = await (window as any).electronAPI?.collectDiagnosticsHex?.();
        if (d && typeof d.totalUnknown === 'number') {
          const per: Record<string, number> = {};
          for (const r of (d.providers || [])) per[String(r.id).toLowerCase()] = Number(r.unknownCount) || 0;
          setDiag({ total: d.totalUnknown, per });
        }
      } catch {}
    })();
    return () => {
      const u = unProjects as any; if (typeof u === 'function') u();
      unTodos();
    };
  }, [projectsViewModel, todosViewModel]);
  
  useEffect(() => {
    try { localStorage.setItem('ui.globalActiveOnly', activeOnly ? '1' : '0'); } catch {}
  }, [activeOnly]);
  useEffect(() => {
    try { localStorage.setItem('ui.providerFilter', JSON.stringify(providerFilter)); } catch {}
  }, [providerFilter]);

  // Build rows per session across all projects for better coverage
  const allRows = todosViewModel.getSessions().map((s: any) => {
    const proj = projects.find(p => p.path === (s as any).projectPath);
    const p = proj || ({ id: ((s as any).projectPath || '').replace(/[\\/:]/g, '-'), path: (s as any).projectPath || '', flattenedDir: '', pathExists: true, lastModified: s.lastModified } as any);
    return { p, s };
  }).sort((a, b) => b.s.lastModified.getTime() - a.s.lastModified.getTime());
  const rows = allRows.filter(({ s }) => {
    const prov = String(((s as any)?.provider) || 'claude').toLowerCase();
    const allow = prov === 'codex' ? providerFilter.codex : providerFilter.claude;
    if (!allow) return false;
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
        return { padY: 12, headerPad: 12, dateWidth: 170, font: 13 };
      case 'normal':
        return { padY: 6, headerPad: 10, dateWidth: 160, font: 13 };
      case 'compact':
      default:
        return { padY: 0, headerPad: 8, dateWidth: 150, font: 12 };
    }
  })();

  // CSS classes for layout; spacing applied via pad-[mode] class
  const formatDate = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mon = months[d.getMonth()];
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${dd}-${mon}-${yy} ${hh}:${mm}:${ss}`;
  };
  const dot = (color: string) => ({ width: 8, height: 8, borderRadius: 8, background: color, display: 'inline-block', marginRight: 8 });

  // Context menu state for project column
  const [projMenu, setProjMenu] = useState<{visible:boolean;x:number;y:number;row?:{p:any;s:any}}>(() => ({visible:false,x:0,y:0}));
  const projMenuRef = useRef<HTMLDivElement>(null);
  useDismissableMenu(projMenu.visible, (v) => setProjMenu(s => ({ ...s, visible: v })), projMenuRef);

  // Counts reflecting current filter
  const filteredProjects = new Set(rows.map(r => r.p.id)).size;
  const filteredSessions = rows.length;
  const filteredTodos = rows.reduce((sum, r) => sum + ((r.s.todos || []).filter((t: any) => activeOnly ? t.status !== 'completed' : true).length), 0);

  // Simple virtualization for large datasets
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);
  useEffect(() => {
    const el = listRef.current;
    const onScroll = () => setScrollTop(el?.scrollTop || 0);
    const onResize = () => setViewportH(el?.clientHeight || 600);
    if (el) {
      el.addEventListener('scroll', onScroll);
      onResize();
    }
    window.addEventListener('resize', onResize);
    return () => {
      if (el) el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);
  const rowHeight = spacingMode === 'wide' ? 64 : (spacingMode === 'normal' ? 56 : 48);
  const total = rows.length;
  const totalHeight = total * rowHeight;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 5);
  const visibleCount = Math.min(total, Math.ceil(viewportH / rowHeight) + 10);
  const end = Math.min(total, start + visibleCount);
  const padTop = start * rowHeight;
  const padBottom = totalHeight - padTop - (end - start) * rowHeight;

  return (
    <div className="global-view" style={{ padding: 16, color: 'white', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ color: '#a2a7ad', fontSize: 12, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span>{filteredProjects} Projects • {filteredSessions} Sessions • {filteredTodos} ToDos</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="filter-toggles" title="Filter by provider">
            <button
              className={`filter-toggle ${providerFilter.claude ? 'active' : ''}`}
              onClick={() => setProviderFilter(f => ({ ...f, claude: !f.claude }))}
            >Claude</button>
            <button
              className={`filter-toggle ${providerFilter.codex ? 'active' : ''}`}
              onClick={() => setProviderFilter(f => ({ ...f, codex: !f.codex }))}
            >Codex</button>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }} title="Hide sessions with only completed items">
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
            <span>Active only</span>
          </label>
        </div>
      </div>
      {diag.total > 0 && (
        <div style={{ background: '#3a2f10', border: '1px solid #806200', color: '#ffd666', padding: 8, borderRadius: 6, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span>
            Warning: {diag.total} unanchored todo session{diag.total!==1?'s':''} detected
            {(() => {
              const parts: string[] = [];
              if (typeof diag.per.claude === 'number') parts.push(`Claude: ${diag.per.claude}`);
              if (typeof diag.per.codex === 'number') parts.push(`Codex: ${diag.per.codex}`);
              return parts.length ? ` (${parts.join(' • ')})` : '';
            })()}
            .
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="filter-toggle" onClick={async ()=>{ try { await (window as any).electronAPI?.repairMetadataHex?.(undefined, true); const d=await (window as any).electronAPI?.collectDiagnosticsHex?.(); if (d) { const per: any = {}; for (const r of (d.providers||[])) per[String(r.id).toLowerCase()] = Number(r.unknownCount)||0; setDiag({ total: d.totalUnknown||0, per }); } (window as any).__addToast?.('Dry Run (All) complete'); } catch {} }}>Dry Run (All)</button>
            <button className="filter-toggle" onClick={async ()=>{ try { await (window as any).electronAPI?.repairMetadataHex?.(undefined, false); const d=await (window as any).electronAPI?.collectDiagnosticsHex?.(); if (d) { const per: any = {}; for (const r of (d.providers||[])) per[String(r.id).toLowerCase()] = Number(r.unknownCount)||0; setDiag({ total: d.totalUnknown||0, per }); } (window as any).__addToast?.('Repair (All) complete'); } catch {} }}>Repair Live (All)</button>
            {typeof diag.per.claude === 'number' && (
              <>
                <button className="filter-toggle" onClick={async ()=>{ try { await (window as any).electronAPI?.repairMetadataHex?.('claude', true); const d=await (window as any).electronAPI?.collectDiagnosticsHex?.(); if (d) { const per: any = {}; for (const r of (d.providers||[])) per[String(r.id).toLowerCase()] = Number(r.unknownCount)||0; setDiag({ total: d.totalUnknown||0, per }); } (window as any).__addToast?.('Dry Run (Claude) complete'); } catch {} }}>Dry Run (Claude)</button>
                <button className="filter-toggle" onClick={async ()=>{ try { await (window as any).electronAPI?.repairMetadataHex?.('claude', false); const d=await (window as any).electronAPI?.collectDiagnosticsHex?.(); if (d) { const per: any = {}; for (const r of (d.providers||[])) per[String(r.id).toLowerCase()] = Number(r.unknownCount)||0; setDiag({ total: d.totalUnknown||0, per }); } (window as any).__addToast?.('Repair (Claude) complete'); } catch {} }}>Repair (Claude)</button>
              </>
            )}
            {typeof diag.per.codex === 'number' && (
              <>
                <button className="filter-toggle" onClick={async ()=>{ try { await (window as any).electronAPI?.repairMetadataHex?.('codex', true); const d=await (window as any).electronAPI?.collectDiagnosticsHex?.(); if (d) { const per: any = {}; for (const r of (d.providers||[])) per[String(r.id).toLowerCase()] = Number(r.unknownCount)||0; setDiag({ total: d.totalUnknown||0, per }); } (window as any).__addToast?.('Dry Run (Codex) complete'); } catch {} }}>Dry Run (Codex)</button>
                <button className="filter-toggle" onClick={async ()=>{ try { await (window as any).electronAPI?.repairMetadataHex?.('codex', false); const d=await (window as any).electronAPI?.collectDiagnosticsHex?.(); if (d) { const per: any = {}; for (const r of (d.providers||[])) per[String(r.id).toLowerCase()] = Number(r.unknownCount)||0; setDiag({ total: d.totalUnknown||0, per }); } (window as any).__addToast?.('Repair (Codex) complete'); } catch {} }}>Repair (Codex)</button>
              </>
            )}
          </div>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div className={`global-table ${spacingMode}`} style={{ height: '100%' }}>
          <div className="global-header">
          <div>Project</div>
          <div className="global-cell date" style={{ textAlign: 'left' }}>Date</div>
          <div>Current</div>
          <div>Next</div>
        </div>
          <div ref={listRef} className="global-rows" style={{ flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative' }}>
          <div style={{ height: padTop }} />
          {rows.slice(start, end).map(({ p, s }) => {
            const curr = pickCurrent(s.todos || []);
            const next = pickNext(s.todos || [], curr);
            const hasActive = (s.todos || []).some((t: any) => t.status !== 'completed');
            const accent = hasActive ? '#2ACB68' : '#5b6168';
            // Robust project name inference
            const inferFromFile = () => {
              const fp = (s as any).filePath || '';
              const m = fp.match(/\.claude[\\\/]projects[\\\/]([^\\\/]+)/);
              if (m && m[1]) {
                const flat = m[1];
                const parts = flat.split('-').filter(Boolean);
                return parts.length ? parts[parts.length - 1] : flat;
              }
              return '';
            };
            const projName = (() => {
              const byPath = (p.path || '').split(/[\\/]/).pop();
              if (byPath) return byPath;
              const bySessionPath = ((s as any).projectPath || '').split(/[\\/]/).pop();
              if (bySessionPath) return bySessionPath;
              const byFile = inferFromFile();
              if (byFile) return byFile;
              return 'Unknown Project';
            })();
            const shortId = s.id.substring(0,6);
            const goto = (todo: any) => { const idx = (s.todos || []).indexOf(todo); (window as any).__navigateToProjectSession?.((s as any).projectPath || p.path, s.id, idx >= 0 ? idx : undefined); };
            return (
              <div key={`${p.id}-${s.id}`} className={`global-row pad-${spacingMode}`}>
                <div
                  className="global-cell global-project"
                  onContextMenu={(e) => { e.preventDefault(); setProjMenu({ visible: true, x: e.clientX, y: e.clientY, row: { p, s } }); }}
                  title="Right-click for options"
                >
                  <div className="accent" style={{ background: accent }} />
                  <div className="name">
                    {projName}
                    <span className="sid">({shortId})</span>
                    {(() => { const pl = String(((s as any)?.provider) || 'Claude').toLowerCase(); return (
                      <span className={`provider-badge provider-${pl}`} title={`Provider: ${((s as any)?.provider) || 'Claude'}`}>
                        {pl === 'codex' ? 'Codex' : 'Claude'}
                      </span>
                    ); })()}
                  </div>
                </div>
                <div className="global-cell date">{formatDate(s.lastModified)}</div>
                <div className={`global-cell ${curr ? 'clickable' : ''}`} onClick={() => curr && goto(curr)} title={curr ? 'Go to this task' : ''}>
                  <span className="dot dot-amber"></span>
                  {curr ? curr.content : <span style={{ opacity: 0.6 }}>No task</span>}
                </div>
                <div className={`global-cell ${next ? 'clickable' : ''}`} onClick={() => next && goto(next)} title={next ? 'Go to this task' : ''}>
                  <span className="dot dot-blue"></span>
                  {next ? next.content : <span style={{ opacity: 0.6 }}>No next task</span>}
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div style={{ padding: 16, color: '#a2a7ad' }}>No sessions found</div>
          )}
          <div style={{ height: padBottom }} />
          </div>
        </div>
      </div>
      {projMenu.visible && projMenu.row && (
        <div ref={projMenuRef} style={{ position: 'fixed', top: projMenu.y + 6, left: projMenu.x + 6, background: '#2f3136', color: '#e6e7e8', border: '1px solid #3b3e44', borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,0.4)', zIndex: 9999, minWidth: 200, padding: 6 }} onMouseLeave={() => setProjMenu(s => ({...s, visible:false}))}>
          <button className="filter-toggle" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', margin: 0 }} onClick={() => { navigator.clipboard.writeText((projMenu.row!.p.path || '').split(/[\\/]/).pop() || ''); (window as any).__addToast?.('Copied project name'); setProjMenu(s => ({...s, visible:false})); }}>Copy Project Name</button>
          <button className="filter-toggle" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', margin: 0 }} onClick={() => { navigator.clipboard.writeText(projMenu.row!.p.path || (projMenu.row as any).s.projectPath || ''); (window as any).__addToast?.('Copied project path'); setProjMenu(s => ({...s, visible:false})); }}>Copy Project Path</button>
          <button className="filter-toggle" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', margin: 0 }} onClick={() => { navigator.clipboard.writeText(projMenu.row!.s.id); (window as any).__addToast?.('Copied session ID'); setProjMenu(s => ({...s, visible:false})); }}>Copy Session ID</button>
          <button className="filter-toggle" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', margin: 0 }} onClick={() => { const curr = (projMenu.row!.s.todos || []).find((t:any)=>t.status==='in_progress') || (projMenu.row!.s.todos||[]).find((t:any)=>t.status==='pending'); if (curr) navigator.clipboard.writeText(curr.content); (window as any).__addToast?.('Copied current task'); setProjMenu(s => ({...s, visible:false})); }}>Copy Current Task</button>
          <button className="filter-toggle" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', margin: 0 }} onClick={() => { const todos=(projMenu.row!.s.todos||[]); const curr=todos.find((t:any)=>t.status==='in_progress')||todos.find((t:any)=>t.status==='pending'); const idx=curr?todos.indexOf(curr):-1; const next=idx>=0?todos.slice(idx+1).find((t:any)=>t.status==='pending')||todos.find((t:any)=>t.status==='pending'):null; if (next) navigator.clipboard.writeText(next.content); (window as any).__addToast?.('Copied next task'); setProjMenu(s => ({...s, visible:false})); }}>Copy Next Task</button>
        </div>
      )}
    </div>
  );
}
