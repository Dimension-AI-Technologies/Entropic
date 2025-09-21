import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommitView, type RepoCommits } from '../App.CommitView';

const repos: RepoCommits[] = [
  {
    repo: 'alpha',
    relativePath: 'alpha',
    commits: [
      {
        hash: 'abcdef1234567890',
        date: '2024-02-10T10:00:00Z',
        message: 'Initial commit',
        authorName: 'Alice Doe',
        coAuthors: ['Bob <bob@example.com>'],
        stats: { additions: 10, deletions: 2, totalLines: 12, filesAdded: 1, filesChanged: 1, filesDeleted: 1 },
      },
    ],
  },
  {
    repo: 'bravo',
    relativePath: 'bravo',
    commits: [],
  },
];

describe('CommitView', () => {
  test('renders provided data', () => {
    render(
      <CommitView
        spacingMode="normal"
        repos={repos}
        loading={false}
        error={null}
        onRefresh={jest.fn()}
      />
    );

    expect(screen.getAllByText('alpha').length).toBeGreaterThan(0);
    expect(screen.getByText('Initial commit')).toBeInTheDocument();
    expect(screen.getByText('Alice Doe')).toBeInTheDocument();
    expect(screen.getByText((content, node) => node?.textContent === '2 / 12 / 10')).toBeInTheDocument();
    expect(screen.getByText((content, node) => node?.textContent === '1 / 1 / 1')).toBeInTheDocument();
  });

  test('allows switching repositories', () => {
    render(
      <CommitView
        spacingMode="normal"
        repos={repos}
        loading={false}
        error={null}
        onRefresh={jest.fn()}
      />
    );

    const bravoButton = screen.getAllByText('bravo')[0].closest('button')!;
    fireEvent.click(bravoButton);

    expect(screen.getByText('No commits found.')).toBeInTheDocument();
  });
});
