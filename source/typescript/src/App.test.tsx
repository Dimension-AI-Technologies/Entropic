import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

jest.mock('./services/DIContainer', () => {
  const mockSetProviderAllow = jest.fn();
  const projectListeners = new Set<() => void>();
  const todoListeners = new Set<() => void>();
  let projectData: any[] = [];
  let sessionData: any[] = [];

  const projectsViewModel = {
    refresh: jest.fn(async () => ({ success: true as const, value: undefined })),
    getProjects: jest.fn(() => projectData),
    getProjectsSortedByDate: jest.fn(() => [...projectData]),
    onChange: jest.fn((cb: () => void) => {
      projectListeners.add(cb);
      return () => projectListeners.delete(cb);
    }),
  };

  const todosViewModel = {
    refresh: jest.fn(async () => ({ success: true as const, value: undefined })),
    getSessions: jest.fn(() => sessionData),
    onChange: jest.fn((cb: () => void) => {
      todoListeners.add(cb);
      return () => todoListeners.delete(cb);
    }),
  };

  const container = {
    getProjectsViewModel: () => projectsViewModel,
    getTodosViewModel: () => todosViewModel,
  };

  const getInstanceMock = jest.fn(() => container);

  return {
    __esModule: true,
    DIContainer: { getInstance: getInstanceMock },
    setProviderAllow: mockSetProviderAllow,
    __test__: {
      mockSetProviderAllow,
      projectListeners,
      todoListeners,
      projectsViewModel,
      todosViewModel,
      getInstanceMock,
      get projectData() {
        return projectData;
      },
      set projectData(value: any[]) {
        projectData = value;
      },
      get sessionData() {
        return sessionData;
      },
      set sessionData(value: any[]) {
        sessionData = value;
      },
      reset() {
        projectData = [];
        sessionData = [];
        projectListeners.clear();
        todoListeners.clear();
        mockSetProviderAllow.mockClear();
        projectsViewModel.refresh.mockClear();
        projectsViewModel.getProjects.mockClear();
        projectsViewModel.getProjectsSortedByDate.mockClear();
        projectsViewModel.onChange.mockClear();
        todosViewModel.refresh.mockClear();
        todosViewModel.getSessions.mockClear();
        todosViewModel.onChange.mockClear();
        getInstanceMock.mockClear();
      },
    },
  };
});

const diModule = require('./services/DIContainer') as any;
const diTest = diModule.__test__;

let lastTitleBarProps: any;
let lastProjectViewProps: any;

jest.mock('./components/UnifiedTitleBar', () => ({
  UnifiedTitleBar: (props: any) => {
    lastTitleBarProps = props;
    return <div data-testid="title-bar">{props.viewMode}</div>;
  },
}));

jest.mock('./App.ProjectView', () => ({
  ProjectView: (props: any) => {
    lastProjectViewProps = props;
    return <div data-testid="project-view">Project view ({props.activityMode ? 'on' : 'off'})</div>;
  },
}));

jest.mock('./App.GlobalView', () => ({
  GlobalView: () => <div data-testid="global-view">Global view</div>,
}));

jest.mock('./components/SplashScreen', () => ({
  SplashScreen: () => <div data-testid="splash">Loading...</div>,
}));

jest.mock('./components/AnimatedBackground', () => ({
  AnimatedBackground: () => null,
}));

jest.mock('./components/BoidSystem', () => ({
  BoidSystem: () => null,
}));

function primeData() {
  diTest.projectData = [
    {
      path: '/tmp/project',
      provider: 'claude',
      flattenedDir: 'tmp-project',
      mostRecentTodoDate: Date.now(),
      sessions: [],
    },
  ];
  diTest.sessionData = [];
}

describe('App', () => {
  beforeEach(() => {
    diTest.reset();
    primeData();
    localStorage.clear();
    (window as any).electronAPI = {
      getProviderPresence: jest.fn().mockResolvedValue({ claude: true, codex: true, gemini: true }),
      getProjects: jest.fn().mockResolvedValue({ success: true, value: diTest.projectData }),
      onScreenshotTaken: jest.fn().mockReturnValue(() => {}),
      getGitStatus: jest.fn().mockResolvedValue({
        success: true,
        value: [
          {
            name: 'Repo',
            relativePath: 'repo',
            languages: ['ts'],
            remoteUrl: null,
            lastLocalCommit: null,
            lastRemoteCommit: null,
            ahead: 0,
            behind: 0,
          },
        ],
      }),
      getGitCommits: jest.fn().mockResolvedValue({
        success: true,
        value: [
          {
            repo: 'Repo',
            relativePath: 'repo',
            commits: [
              {
                hash: 'abcdef1234567890',
                date: new Date().toISOString(),
                message: 'Initial commit',
                authorName: 'Tester',
                coAuthors: [],
                stats: {
                  additions: 1,
                  deletions: 0,
                  totalLines: 1,
                  filesAdded: 1,
                  filesChanged: 0,
                  filesDeleted: 0,
                },
              },
            ],
          },
        ],
      }),
    };
    lastTitleBarProps = undefined;
    lastProjectViewProps = undefined;
  });

  async function renderApp() {
    const renderResult = render(<App />);
    await waitFor(() => expect(screen.queryByTestId('project-view')).toBeInTheDocument(), {
      timeout: 2000,
    });
    return renderResult;
  }

  test('renders project view after splash and switches to global view when requested', async () => {
    await renderApp();
    expect(screen.queryByTestId('splash')).not.toBeInTheDocument();

    expect(lastTitleBarProps).toBeDefined();
    act(() => {
      lastTitleBarProps.onViewModeChange('global');
    });
    await waitFor(() => expect(screen.getByTestId('global-view')).toBeInTheDocument());
  });

  test('applies provider filter changes via DI container and persists preference', async () => {
    await renderApp();
    expect(lastTitleBarProps).toBeDefined();

    act(() => {
      lastTitleBarProps.onProviderFilterChange?.({ claude: false, codex: true, gemini: true });
    });

    await waitFor(() => {
      expect(diTest.mockSetProviderAllow).toHaveBeenLastCalledWith({ claude: false, codex: true, gemini: true });
    });
    expect(JSON.parse(localStorage.getItem('ui.providerFilter') || '{}')).toEqual({ claude: false, codex: true, gemini: true });
    await waitFor(() => {
      expect(diTest.projectsViewModel.refresh).toHaveBeenCalled();
      expect(diTest.todosViewModel.refresh).toHaveBeenCalled();
    });
  });

  test('updates activity mode state when ProjectView requests a toggle', async () => {
    await renderApp();
    expect(lastProjectViewProps.activityMode).toBe(false);

    await act(async () => {
      lastProjectViewProps.setActivityMode(true);
    });

    await waitFor(() => expect(screen.getByTestId('project-view')).toHaveTextContent('Project view (on)'));
  });

  test('switches to git view when requested', async () => {
    await renderApp();
    expect(lastTitleBarProps).toBeDefined();

    act(() => {
      lastTitleBarProps.onViewModeChange('git');
    });

    await waitFor(() => expect(screen.getByTestId('git-view')).toBeInTheDocument());
  });

  test('switches to commit view when requested', async () => {
    await renderApp();
    expect(lastTitleBarProps).toBeDefined();

    act(() => {
      lastTitleBarProps.onViewModeChange('commit');
    });

    await waitFor(() => expect(screen.getByTestId('commit-view')).toBeInTheDocument());
  });
});
