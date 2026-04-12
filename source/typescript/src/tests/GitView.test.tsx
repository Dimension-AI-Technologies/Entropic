import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GitView, type GitRepoStatus } from '../App.GitView';

describe('GitView', () => {
  const repos: GitRepoStatus[] = [
    {
      name: 'alpha',
      relativePath: 'alpha',
      languages: ['TypeScript', 'Shell'],
      remoteUrl: 'git@github.com:example/alpha.git',
      lastLocalCommit: '2024-01-10T12:00:00Z',
      lastRemoteCommit: '2024-01-08T09:30:00Z',
      ahead: 2,
      behind: 1,
    },
  ];

  test('renders provided repositories', () => {
    render(
      <GitView
        spacingMode="normal"
        repos={repos}
        loading={false}
        error={null}
        onRefresh={jest.fn()}
      />
    );

    const remoteCell = screen.getByText('git@github.com:example/alpha.git');
    const row = remoteCell.closest('tr');
    expect(row).not.toBeNull();
    if (!row) return;
    expect(row).toHaveTextContent('alpha');
    expect(row).toHaveTextContent('TypeScript, Shell');
    expect(row).toHaveTextContent('2');
    expect(row).toHaveTextContent('1');
  });
});
