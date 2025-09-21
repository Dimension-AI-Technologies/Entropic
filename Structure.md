# Entropic Project Structure

```
Entropic/
├── README.md                # Main documentation
├── README-sh.md             # Bash implementation guide
├── README-ps.md             # PowerShell implementation guide
├── TESTING-ps.md            # PowerShell testing guide
├── HOOKS-codex.md           # Codex provider hooks documentation
├── HISTORY.md               # Project history and changelog
├── TODO.md                  # Project todos and roadmap
├── Hexagon.md               # Hexagon architecture documentation
├── Structure.md             # This file - project structure overview
├── Todo Tracker.png         # Screenshot of the terminal monitor
├── GlobalView.png           # Screenshot of global view in GUI
├── ProjectView.png          # Screenshot of project view in GUI
├── Launch-TodoMonitor.ps1   # PowerShell launcher script
├── .gitignore               # Git ignore file
│
├── bash/                    # Bash implementation
│   ├── todo_hook_post_tool.sh     # Hook script for Claude Code
│   └── todo_live_monitor.sh       # Live monitoring script
│
├── powershell7/             # PowerShell 7 implementation
│   ├── todo_hook_post_tool.ps1    # Hook script for Claude Code
│   ├── todo_live_monitor.ps1      # Live monitoring script
│   └── tests/                     # Test scripts
│       ├── test_hook.ps1          # Hook testing
│       ├── test_monitor.ps1       # Monitor testing
│       └── test_integration.ps1   # Integration testing
│
└── typescript/              # Electron GUI implementation
    ├── README.md            # GUI setup and usage guide
    ├── package.json         # Node.js dependencies
    ├── package-lock.json    # Locked dependency versions
    ├── tsconfig.json        # TypeScript configuration
    ├── tsconfig.main.json   # Main process TypeScript config
    ├── tsconfig.preload.json # Preload script TypeScript config
    ├── electron.vite.config.ts # Vite configuration for Electron
    ├── jest.config.ts       # Jest testing configuration
    ├── test-app.md          # Testing documentation
    ├── final-verification.md # Final verification checklist
    ├── Note.Electron.Preload.Scripts.md # Preload script notes
    │
    ├── src/                 # Source code
    │   ├── App.tsx          # Main React application
    │   ├── App.test.tsx     # App component tests
    │   ├── App.ProjectView.tsx    # Project view component
    │   ├── App.GlobalView.tsx     # Global view component
    │   ├── App.GitView.tsx        # Git status view component
    │   ├── App.CommitView.tsx     # Commit history view component
    │   ├── App.TitleBar.tsx       # Title bar component
    │   ├── App.SplashScreen.tsx   # Splash screen component
    │   ├── styles.css       # Application styles
    │   ├── index.tsx        # React entry point
    │   ├── setupTests.ts    # Test setup
    │   │
    │   ├── main/            # Electron main process
    │   │   ├── main.ts      # Main process entry
    │   │   ├── ipc.ts       # IPC communication handlers
    │   │   ├── gitStatus.ts # Git status collection
    │   │   ├── ipc/         # IPC modules
    │   │   │   ├── projects.ts      # Projects IPC
    │   │   │   ├── todos.ts         # Todos IPC
    │   │   │   └── gitStatus.ts     # Git status IPC
    │   │   └── watchers/    # File watchers
    │   │       ├── fileWatchers.ts  # File watching setup
    │   │       └── projectWatchers.ts # Project monitoring
    │   │
    │   ├── preload/         # Preload scripts
    │   │   └── preload.ts   # Preload script for renderer
    │   │
    │   ├── services/        # Business logic
    │   │   ├── DIContainer.ts       # Dependency injection
    │   │   ├── ProjectRepository.ts # Project data access
    │   │   ├── TodoRepository.ts    # Todo data access
    │   │   ├── ProjectsViewModel.ts # Projects view model
    │   │   ├── TodosViewModel.ts    # Todos view model
    │   │   └── Aggregator.ts        # Data aggregation
    │   │
    │   ├── tests/           # Test files
    │   │   ├── Aggregator.test.ts   # Aggregator tests
    │   │   ├── ProjectsViewModel.test.ts # Projects VM tests
    │   │   ├── TodosViewModel.test.ts    # Todos VM tests
    │   │   ├── GitView.test.tsx     # Git view tests
    │   │   ├── CommitView.test.tsx  # Commit view tests
    │   │   ├── gitStatus.test.ts    # Git status tests
    │   │   └── providerFilter.real.test.ts # Provider filter tests
    │   │
    │   └── utils/           # Utility functions
    │       ├── Result.ts    # Result<T> error handling
    │       ├── files.ts     # File system utilities
    │       └── log.ts       # Logging utilities
    │
    ├── dist/                # Build output (generated)
    │   ├── main/            # Compiled main process
    │   ├── preload/         # Compiled preload scripts
    │   └── renderer/        # Compiled renderer process
    │
    ├── scripts/             # Build and utility scripts
    │   └── vite-build.mjs   # Vite build script
    │
    └── node_modules/        # NPM dependencies (generated)
```

## Key Directories

- **`bash/`** - Original Bash implementation for terminal-based monitoring
- **`powershell7/`** - Cross-platform PowerShell implementation
- **`typescript/`** - Modern Electron GUI application with React and TypeScript
- **`typescript/src/main/`** - Electron main process code (Node.js environment)
- **`typescript/src/preload/`** - Preload scripts for secure IPC communication
- **`typescript/src/services/`** - Business logic with MVVM pattern
- **`typescript/src/tests/`** - Comprehensive test suite using Jest

## Build Artifacts

- **`typescript/dist/`** - Compiled TypeScript output
- **`typescript/node_modules/`** - NPM dependencies
- **`electron-run.log`** - Electron runtime logs
- **`project.load.log`** - Project loading logs