import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

type SpacingMode = 'wide' | 'normal' | 'compact';

export interface CommitStats {
  additions: number;
  deletions: number;
  totalLines: number;
  filesAdded: number;
  filesChanged: number;
  filesDeleted: number;
}

export interface CommitEntry {
  hash: string;
  date: string;
  message: string;
  authorName: string;
  authorEmail?: string;
  coAuthors: string[];
  stats: CommitStats;
}

export interface RepoCommits {
  repo: string;
  relativePath: string;
  commits: CommitEntry[];
}

interface CommitViewProps {
  spacingMode: SpacingMode;
  repos: RepoCommits[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const formatDate = (iso: string) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
};

export function CommitView({ spacingMode, repos, loading, error, onRefresh }: CommitViewProps) {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [sort, setSort] = useState<{ column: 'date' | 'author' | 'coAuthor' | 'lines' | 'files'; direction: 'asc' | 'desc' }>({ column: 'date', direction: 'desc' });

  useEffect(() => {
    if (!repos.length) {
      setSelectedRepo(null);
      return;
    }
    setSelectedRepo(prev => {
      if (prev && repos.some(r => r.relativePath === prev)) {
        return prev;
      }
      return repos[0].relativePath;
    });
  }, [repos]);

  const selected = useMemo(() => repos.find(r => r.relativePath === selectedRepo) || null, [repos, selectedRepo]);
  const commits = selected?.commits ?? [];

  const stripEmail = (value: string) => value.replace(/\s*<.*?>\s*/g, '').trim();

  const sortedCommits = useMemo(() => {
    const data = [...commits];
    const compare = (a: CommitEntry, b: CommitEntry) => {
      const dir = sort.direction === 'asc' ? 1 : -1;
      switch (sort.column) {
        case 'date': {
          const aTime = new Date(a.date).getTime();
          const bTime = new Date(b.date).getTime();
          return (aTime - bTime) * dir;
        }
        case 'author': {
          return a.authorName.localeCompare(b.authorName) * dir;
        }
        case 'coAuthor': {
          const aCo = stripEmail(a.coAuthors[0] || '').localeCompare(stripEmail(b.coAuthors[0] || ''));
          if (aCo !== 0) return aCo * dir;
          return a.coAuthors.length - b.coAuthors.length;
        }
        case 'lines': {
          return (a.stats.totalLines - b.stats.totalLines) * dir;
        }
        case 'files': {
          const aTotal = a.stats.filesAdded + a.stats.filesChanged + a.stats.filesDeleted;
          const bTotal = b.stats.filesAdded + b.stats.filesChanged + b.stats.filesDeleted;
          return (aTotal - bTotal) * dir;
        }
        default:
          return 0;
      }
    };
    data.sort(compare);
    return data;
  }, [commits, sort]);

  const summary = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    let filesAdded = 0;
    let filesChanged = 0;
    let filesDeleted = 0;
    commits.forEach(c => {
      additions += c.stats?.additions ?? 0;
      deletions += c.stats?.deletions ?? 0;
      filesAdded += c.stats?.filesAdded ?? 0;
      filesChanged += c.stats?.filesChanged ?? 0;
      filesDeleted += c.stats?.filesDeleted ?? 0;
    });
    return { additions, deletions, filesAdded, filesChanged, filesDeleted };
  }, [commits]);

  const rowPadding = spacingMode === 'wide' ? 14 : spacingMode === 'normal' ? 10 : 6;

  const renderSortIndicator = (column: typeof sort.column) => {
    if (sort.column !== column) return null;
    return sort.direction === 'asc' ? ' ▲' : ' ▼';
  };

  const handleSort = (column: typeof sort.column) => {
    setSort(prev => prev.column === column ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { column, direction: column === 'date' ? 'desc' : 'asc' });
  };

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
          <button className="pane-button" onClick={onRefresh} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          {error && <div style={{ fontSize: 12, color: '#ff7b7b' }}>{error}</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#a2a7ad', fontSize: 12, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              {selected ? `${selected.repo} • ${selected.commits.length} commits` : 'Select a repository'}
              {' • Lines '} {summary.deletions} / {(summary.additions + summary.deletions)} / {summary.additions}
              {' • Files '} {summary.filesDeleted} / {summary.filesChanged} / {summary.filesAdded}
            </span>
          </div>
          <div className="commit-table-wrapper" style={{ flex: 1, overflow: 'auto', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(17,20,24,0.55)' }}>
            <table className="commit-table">
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>Commit</th>
                  <th style={{ whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => handleSort('date')}>Date{renderSortIndicator('date')}</th>
                  <th style={{ width: '32%' }}>Message</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('author')}>Author{renderSortIndicator('author')}</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('coAuthor')}>Co-Authors{renderSortIndicator('coAuthor')}</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('lines')}>Lines (−/Δ/+){renderSortIndicator('lines')}</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('files')}>Files (−/Δ/+){renderSortIndicator('files')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedCommits.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#9ba0a7' }}>No commits found.</td>
                  </tr>
                ) : (
                  sortedCommits.map(commit => (
                    <tr key={commit.hash} style={{ paddingBlock: rowPadding }}>
                      <td className="commit-hash" style={{ whiteSpace: 'nowrap' }}>{commit.hash.slice(0, 12)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(commit.date)}</td>
                      <td>{commit.message.split('\n')[0]}</td>
                      <td>{commit.authorName ? stripEmail(commit.authorName) : '—'}</td>
                      <td>{commit.coAuthors && commit.coAuthors.length ? commit.coAuthors.map(stripEmail).join(', ') : '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="git-count-negative">{commit.stats.deletions}</span>
                        {' / '}
                        {commit.stats.totalLines}
                        {' / '}
                        <span className="git-count-positive">{commit.stats.additions}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {commit.stats.filesDeleted}
                        {' / '}
                        {commit.stats.filesChanged}
                        {' / '}
                        {commit.stats.filesAdded}
                      </td>
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
