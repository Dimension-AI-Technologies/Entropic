import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';

interface GitRepoStatus {
  name: string;
  relativePath: string;
  languages: string[];
  remoteUrl: string | null;
  lastLocalCommit: string | null;
  lastRemoteCommit: string | null;
  ahead: number;
  behind: number;
}

type SpacingMode = 'wide' | 'normal' | 'compact';

interface GitViewProps {
  spacingMode: SpacingMode;
}

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

export function GitView({ spacingMode }: GitViewProps) {
  const [repos, setRepos] = useState<GitRepoStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!window.electronAPI?.getGitStatus) {
      setError('Git status API unavailable');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.getGitStatus();
      if (result && typeof result === 'object' && 'success' in result) {
        if (result.success) {
          setRepos(Array.isArray(result.value) ? result.value : []);
        } else {
          setError(result.error || 'Failed to load git status');
          setRepos([]);
        }
      } else if (Array.isArray(result)) {
        setRepos(result);
      } else {
        setError('Unsupported response from git status');
        setRepos([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load git status');
      setRepos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    let aheadTotal = 0;
    let behindTotal = 0;
    let stale = 0;
    repos.forEach(r => {
      aheadTotal += r.ahead || 0;
      behindTotal += r.behind || 0;
      if ((r.ahead || 0) > 0 || (r.behind || 0) > 0) stale += 1;
    });
    return { aheadTotal, behindTotal, stale };
  }, [repos]);

  const rowPadding = spacingMode === 'wide' ? 14 : spacingMode === 'normal' ? 10 : 6;

  return (
    <div data-testid="git-view" className="global-view git-view" style={{ padding: 16, color: 'white', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ color: '#a2a7ad', fontSize: 12, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span>{repos.length} Repos • {summary.stale} Out of Sync • ↑{summary.aheadTotal} ↓{summary.behindTotal}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {error && <span style={{ color: '#ff7b7b' }}>{error}</span>}
          <button className="pane-button" onClick={load} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>
      <div className="git-table-wrapper" style={{ flex: 1, overflow: 'auto', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(17,20,24,0.55)' }}>
        <table className="git-table">
          <thead>
            <tr>
              <th style={{ width: '18%' }}>Project</th>
              <th style={{ width: '22%' }}>Relative Path</th>
              <th style={{ width: '14%' }}>Languages</th>
              <th style={{ width: '18%' }}>Remote</th>
              <th style={{ width: '12%' }}>Last Local</th>
              <th style={{ width: '12%' }}>Last Remote</th>
              <th style={{ width: '2%' }}>Ahead</th>
              <th style={{ width: '2%' }}>Behind</th>
            </tr>
          </thead>
          <tbody>
            {repos.length === 0 && !loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#9ba0a7' }}>
                  {error ? 'Unable to load repository status.' : 'No repositories detected under ~/source/repos.'}
                </td>
              </tr>
            ) : (
              repos.map((repo) => (
                <tr key={repo.relativePath || repo.name} style={{ paddingBlock: rowPadding }}>
                  <td>{repo.name}</td>
                  <td className="git-row-path">{repo.relativePath || '—'}</td>
                  <td>{repo.languages && repo.languages.length ? repo.languages.join(', ') : '—'}</td>
                  <td className="git-row-remote">{repo.remoteUrl || '—'}</td>
                  <td>{formatDate(repo.lastLocalCommit)}</td>
                  <td>{formatDate(repo.lastRemoteCommit)}</td>
                  <td className={repo.ahead > 0 ? 'git-count-positive' : ''}>{repo.ahead}</td>
                  <td className={repo.behind > 0 ? 'git-count-negative' : ''}>{repo.behind}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
