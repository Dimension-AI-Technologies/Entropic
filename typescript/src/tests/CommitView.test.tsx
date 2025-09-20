import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommitView } from '../App.CommitView';

describe('CommitView', () => {
  beforeEach(() => {
    (window as any).electronAPI = {
      getGitCommits: jest.fn().mockResolvedValue({
        success: true,
        value: [
          {
            repo: 'alpha',
            relativePath: 'alpha',
            commits: [
              {
                hash: 'abcdef1234567890',
                date: '2024-02-10T10:00:00Z',
                message: 'Initial commit',
                author: 'Alice <alice@example.com>',
                coAuthors: ['Bob <bob@example.com>'],
                stats: { additions: 10, deletions: 2, filesChanged: 3 },
              },
            ],
          },
          {
            repo: 'bravo',
            relativePath: 'bravo',
            commits: [],
          },
        ],
      }),
    };
  });

  test('renders repos and commits returned by API', async () => {
    render(<CommitView spacingMode="normal" />);

    const repoButtons = await screen.findAllByText('alpha');
    expect(repoButtons.length).toBeGreaterThan(0);

    await waitFor(() => expect(screen.getByText('Initial commit')).toBeInTheDocument());
    expect(screen.getByText('Initial commit')).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('allows switching repositories', async () => {
    render(<CommitView spacingMode="normal" />);

    await screen.findAllByText('alpha');
    const bravoButtons = screen.getAllByText('bravo');
    const bravoButton = bravoButtons[0].closest('button') ?? bravoButtons[0];
    fireEvent.click(bravoButton);

    await waitFor(() => expect(screen.getByText('No commits found.')).toBeInTheDocument());
  });
});
