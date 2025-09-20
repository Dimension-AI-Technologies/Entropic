import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GitView } from '../App.GitView';

describe('GitView', () => {
  beforeEach(() => {
    (window as any).electronAPI = {
      getGitStatus: jest.fn().mockResolvedValue({
        success: true,
        value: [
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
        ],
      }),
    };
  });

  test('renders repositories returned by electron API', async () => {
    render(<GitView spacingMode="normal" />);

    const remoteCell = await screen.findByText('git@github.com:example/alpha.git');
    const row = remoteCell.closest('tr');
    expect(row).not.toBeNull();
    if (!row) throw new Error('Row not found');
    expect(row).toHaveTextContent('alpha');
    expect(row).toHaveTextContent('TypeScript, Shell');
    expect(row).toHaveTextContent('2');
    expect(row).toHaveTextContent('1');
  });
});
