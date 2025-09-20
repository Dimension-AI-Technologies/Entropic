import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';

type SpacingMode = 'wide' | 'normal' | 'compact';

interface CommitStats {
  additions: number;
  deletions: number;
  filesChanged: number;
}

interface CommitEntry {
  hash: string;
  date: string;
  message: string;
  author: string;
  coAuthors: string[];
  stats: CommitStats;
}

interface RepoCommits {
  repo: string;
  relativePath: string;
  commits: CommitEntry[];
}

interface CommitViewProps {
  spacingMode: SpacingMode;
}

const formatDate = (iso: string) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

export function CommitView({ spacingMode }: CommitViewProps) {
  const [repos, setRepos] = useState<RepoCommits[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!window.electronAPI?.getGitCommits) {
      setError('Commit API unavailable');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.getGitCommits({ limit: 100 });
      if (result && typeof result === 'object' && 'success' in result) {
        if (result.success) {
          const reposData = Array.isArray(result.value) ? result.value : [];
          setRepos(reposData);
          if (reposData.length > 0) {
            setSelectedRepo((prev) => prev && reposData.some(r => r.relativePath === prev) ? prev : reposData[0].relativePath);
          }
        } else {
          setError(result.error || 'Failed to load commit history');
          setRepos([]);
          setSelectedRepo(null);
        }
      } else if (Array.isArray(result)) {
        setRepos(result);
        if (result.length > 0) {
          setSelectedRepo(result[0].relativePath);
        }
      } else {
        setError('Unsupported response from commit history');
        setRepos([]);
        setSelectedRepo(null);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load commit history');
      setRepos([]);
      setSelectedRepo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedRepo && repos.length > 0) {
      setSelectedRepo(repos[0].relativePath);
    }
  }, [repos, selectedRepo]);

  const selected = useMemo(() => repos.find(r => r.relativePath === selectedRepo) || null, [repos, selectedRepo]);

  const commits = selected?.commits ?? [];
  const rowPadding = spacingMode === 'wide' ? 14 : spacingMode === 'normal' ? 10 : 6;

  const summary = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    let files = 0;
    commits.forEach(c => {
      additions += c.stats?.additions ?? 0;
      deletions += c.stats?.deletions ?? 0;
      files += c.stats?.filesChanged ?? 0;
    });
    return { additions, deletions, files };
  }, [commits]);

  return (
    <div data-testid="commit-view" className="global-view commit-view" style={{ padding: 16, color: 'white', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexShrink: 0 }}>
        <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#a2a7ad' }}>Repositories</div>
          <div className="commit-repo-list" style={{ flex: 1, overflow: 'auto', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(17,20,24,0.55)' }}>
            {repos.length === 0 && !loading ? (
              <div style={{ padding: 16, color: '#9ba0a7', fontSize: 13 }}>
                {error ? 'Unable to load repositories.' : 'No repositories detected.'}
              </div>
            ) : (
              repos.map(repo => (
                <button
                  key={repo.relativePath}
                  className={`commit-repo-item ${repo.relativePath === selectedRepo ? 'active' : ''}`}
                  onClick={() => setSelectedRepo(repo.relativePath)}
                >
                  <div className="commit-repo-name">{repo.repo}</div>
                  <div className="commit-repo-path">{repo.relativePath}</div>
                  <div className="commit-repo-meta">{repo.commits.length} commits</div>
                </button>
              ))
            )}
          </div>
          <button className="pane-button" onClick={load} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          {error && <div style={{ fontSize: 12, color: '#ff7b7b' }}>{error}</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#a2a7ad', fontSize: 12, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{selected ? `${selected.repo} • ${selected.commits.length} commits` : 'Select a repository'} • +{summary.additions} / -{summary.deletions} • Δ files {summary.files}</span>
          </div>
          <div className="commit-table-wrapper" style={{ flex: 1, overflow: 'auto', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(17,20,24,0.55)' }}>
            <table className="commit-table">
              <thead>
                <tr>
                  <th style={{ width: '14%' }}>Commit</th>
                  <th style={{ width: '14%' }}>Date</th>
                  <th style={{ width: '32%' }}>Message</th>
                  <th style={{ width: '16%' }}>Author</th>
                  <th style={{ width: '12%' }}>Co-Authors</th>
                  <th style={{ width: '6%' }}>+ Lines</th>
                  <th style={{ width: '6%' }}>- Lines</th>
                  <th style={{ width: '6%' }}>Files</th>
                </tr>
              </thead>
              <tbody>
                {commits.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#9ba0a7' }}>No commits found.</td>
                  </tr>
                ) : (
                  commits.map(commit => (
                    <tr key={commit.hash} style={{ paddingBlock: rowPadding }}>
                      <td className="commit-hash">{commit.hash.slice(0, 12)}</td>
                      <td>{formatDate(commit.date)}</td>
                      <td>{commit.message.split('\n')[0]}</td>
                      <td>{commit.author || '—'}</td>
                      <td>{commit.coAuthors && commit.coAuthors.length ? commit.coAuthors.join(', ') : '—'}</td>
                      <td className={commit.stats.additions > 0 ? 'git-count-positive' : ''}>{commit.stats.additions}</td>
                      <td className={commit.stats.deletions > 0 ? 'git-count-negative' : ''}>{commit.stats.deletions}</td>
                      <td>{commit.stats.filesChanged}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
