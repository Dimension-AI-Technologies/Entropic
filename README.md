# Entropic - AI Coding Agent TODO, History and Git live status monitor GUI + CLI tools

<!-- Project badges -->
<div align="center">

[![GitHub Stars](https://img.shields.io/github/stars/dimension-zero/Entropic?style=social)](https://github.com/dimension-zero/Entropic/stargazers)
[![Forks](https://img.shields.io/github/forks/dimension-zero/Entropic?style=social)](https://github.com/dimension-zero/Entropic/network/members)
[![Watchers](https://img.shields.io/github/watchers/dimension-zero/Entropic?style=social)](https://github.com/dimension-zero/Entropic/watchers)
![Clones](https://img.shields.io/badge/clones-154/14days-success?logo=git)

[![Open Issues](https://img.shields.io/github/issues/dimension-zero/Entropic)](https://github.com/dimension-zero/Entropic/issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/dimension-zero/Entropic)](https://github.com/dimension-zero/Entropic/pulls)
[![Last Commit](https://img.shields.io/github/last-commit/dimension-zero/Entropic)](https://github.com/dimension-zero/Entropic/commits)

[![License](https://img.shields.io/github/license/dimension-zero/Entropic)](#license)
[![Code Size](https://img.shields.io/github/languages/code-size/dimension-zero/Entropic)](https://github.com/dimension-zero/Entropic)
[![Top Language](https://img.shields.io/github/languages/top/dimension-zero/Entropic)](https://github.com/dimension-zero/Entropic)

Entropic is a desktop companion for AI coding agents (Claude Code, OpenAI Codex, Google Gemini). The TypeScript/Electron app ingests the session and history folders created in `~/.claude`, `~/.codex`, and `~/.gemini`, merges them into a provider-aware data model, and renders a real-time dashboard with project activity, session diagnostics, prompt history, and maintenance tooling. The repository still ships the original PowerShell and Bash monitors for terminal-first workflows.

</div>

**Entropic** provides comprehensive monitoring for AI coding assistants, allowing you to track Project TODO lists and Project chat history in real-time. It offers a Global Git view showing status across all projects, plus a single-Project commit view to examine the detailed history of commits. Monitor your development workflow across **Claude Code**, **OpenAI Codex**, and **Google Gemini** from a unified interface.

**Multi-Agent Monitoring:**

Three monitoring modes provide complete visibility:
- 📋 **Per-Project TODO Lists** - Live updates of TODO items as they're created, modified, and completed
- 💬 **Per-Project User-Prompt History** - Amalgamated history of all user prompts to review project evolution
- 🌐 **Global View** - Shows current and next TODOs across all projects simultaneously

Key capabilities:
- **Live Updates** - Project TODO view and Global TODO view update in real-time
- **History Tracking** - Project History view amalgamates all user-prompts per project for comprehensive review
- **Multi-CLI Support** - Supports Claude Code, OpenAI Codex, and Google Gemini CLI tools

**Git Integration:**
- 📊 **Repository Status** - Real-time monitoring of Git repositories under ~/source directory on Windows, macOS and Linux
- 📝 **Commit History** - Detailed commit tracking with stats and co-authors
- 🔄 **Live Updates** - Automatic refresh of repository states

**Available as:**
- Cross-platform Electron/TypeScript GUI
- Cross-platform CLI / PowerShell version
- Original Bash version by [@JamesonNyp](@JamesonNyp)

## Overview

This project provides comprehensive monitoring for multiple AI coding assistants and Git repositories. It integrates with hook systems from Claude Code, OpenAI Codex, and Google Gemini to capture and display todo updates, project history, and Git status in real-time. When any supported AI tool modifies todos or project state, Entropic provides a unified live monitoring dashboard.

## TypeScript / Electron application

**Multi Coding Agent Integration:**
- 🤖 **Claude Code**: Full TodoWrite tool integration with real-time updates
- 🔧 **OpenAI Codex**: Session and project tracking with metadata support
- 💎 **Google Gemini**: Complete workflow monitoring and history
- 🔄 **Agent Filtering**: Toggle between agents or view all simultaneously

**Git Repository Monitoring:**
- 📊 **Repository Status**: Real-time tracking of all Git repositories in your workspace
- 📝 **Commit History**: Detailed commit logs with statistics and co-author information
- 🔍 **Language Detection**: Automatic identification of programming languages per repository
- 🌐 **Remote Tracking**: Monitor ahead/behind status with remote repositories

**Visual Interface:**
- 🎨 **Color-Coded Status**: Visual indicators for different todo states
  - ✅ Green for completed items
  - ▶️ Blue for active/in-progress items
  - ○ Default for pending items
- 📊 **Session Tracking**: Displays session ID and working directory
- ⚡ **Efficient Monitoring**: Uses native file watching for minimal resource usage
- 🌍 **Cross-Platform**: Available in TypeScript/Electron GUI, PowerShell, and Bash implementations

- **Project view**: Auto-selects recent projects, restores last selection, filters todos by status, supports tab multi-select with merge previews, and provides delete/cleanup actions for session files.
- **Global view**: Summarises provider activity, shows unknown-session diagnostics, and exposes repair buttons that call `repairMetadataHex` with dry-run or live modes.
- **Unified title bar**: Toggles between project and global layouts, adjusts spacing density, runs manual refresh, and lets you enable/disable providers via a persistent allow-list.
- **Prompt history**: Loads JSONL transcripts through `getProjectPrompts`, supports chronological toggling, and offers context menus for quick actions.
- **Visual polish**: Animated background, boids simulation, and toast notifications (`__addToast`) keep long-running monitors informative without overwhelming the data.

**Multi Coding Agent Data Collection:**
1. **Claude Code Integration**: Intercepts PostToolUse events for TodoWrite
   - Captures todo data from Claude Code sessions
   - Extracts relevant information (todos, session, directory)
   - Saves formatted JSON to `~/.claude/logs/current_todos.json`

2. **OpenAI Codex Monitoring**: Watches Codex session files and project directories
   - Monitors `~/.codex/todos/` for todo updates
   - Tracks `~/.codex/projects/` for project history
   - Associates sessions with projects via metadata files
   - Maintains real-time synchronization with Codex CLI state

3. **Google Gemini Monitoring**: Watches Gemini session directories
   - Monitors `~/.gemini/sessions/` for session updates
   - Tracks todo state changes and project associations
   - Processes session metadata for project linkage
   - Provides unified view with other AI providers

**Git Repository Tracking:**
4. **Repository Discovery**: Automatically finds all Git repositories in your workspace
   - Scans for `.git` directories recursively
   - Identifies programming languages used in each repository
   - Tracks remote repository URLs and status

5. **Live Monitoring**: Provides real-time updates across all data sources
   - Watches files for changes using native OS mechanisms
   - Parses and displays data with color coding and filtering
   - Updates display automatically with minimal resource usage

### Data sources and file watching

### TypeScript/Electron GUI Version (`typescript/`) - Cross-Platform Desktop Application
- **Modern Desktop GUI**: Slack-like interface with dark theme
- **Cross-platform**: Runs as a native desktop app on Windows, macOS, and Linux
- **Multi Coding Agent Support**: Unified interface for Claude Code, OpenAI Codex, and Google Gemini
- **Git Integration**: Built-in Git status monitoring and commit history viewer
- **Advanced Features**:
  - Real-time monitoring of all AI agent sessions across projects
  - Agent filtering with toggle controls (Claude/Codex/Gemini)
  - Multiple view modes: Project Todos, Project History, Global View, Git Status, Commit History
  - Tri-state toggle controls for sorting and spacing customization
  - Session tabs with automatic deduplication
  - Auto-refresh every 5 seconds
  - Visual status indicators and progress tracking
- **Easy Installation**: `npm install` and `npm start` to run
- See [typescript/README.md](typescript/README.md) for setup instructions

### Maintenance and diagnostics

- Adapters expose `collectDiagnostics`/`repairMetadata`; the global view drives them through `collectDiagnosticsHex` and `repairMetadataHex` IPC calls.
- Repairs backfill `metadata.json` files to make future path reconstruction deterministic and report unknown sessions per provider.
- UI actions let you delete empty session files, purge obsolete tabs, and trigger screenshots (`take-screenshot`) for documentation or regression capture.

![Claude Code Todo Tracker Live Monitor](Todo%20Tracker.png)

## Project Structure

See [Structure.md](Structure.md) for detailed project structure.

```
Entropic/
├── README.md           # Main documentation
├── Structure.md        # Detailed project structure
├── bash/               # Bash terminal implementation
├── powershell7/        # PowerShell implementation
└── typescript/         # Electron GUI implementation
    ├── src/            # Source code
    │   ├── main/       # Electron main process
    │   ├── preload/    # Preload scripts
    │   ├── services/   # Business logic (MVVM)
    │   └── tests/      # Test suite
    └── dist/           # Build output
```

After building, launch the production bundle with `npm start`.

### Build and package

```bash
npm run build      # compile main, preload, and renderer bundles
npm start          # run the compiled output inside Electron
npm run dist       # create platform-specific installers (AppImage, macOS dir, Windows portable)
```

## Codex Agent Hooks (optional but recommended)

### Testing

```bash
npm test           # Jest unit/integration suite (aggregator, repositories, view models, UI)
npm test:watch
npm test:coverage
```

Browser-oriented tests use `jest-environment-jsdom`; helper mocks live in `src/tests/__mocks__`.

### Automation and debugging

- `npm run verify:screenshot` enables `ENTROPIC_AUTOSNAP=1` and grabs renderer snapshots via `scripts/launch-autosnap.mjs`.
- `typescript/project.load.log` captures every ingest attempt, including path reconstruction decisions and session counts.

## Repository layout

```
.
+-- README.md                  # This file
+-- TODO.md, Hexagon.md        # Planning and design notes
+-- typescript/                # Electron/React implementation
|   +-- src/
|   |   +-- main/              # Electron main process, adapters, IPC, watchers
|   |   +-- components/        # Renderer UI (title bar, panes, menus, boids, merge helpers)
|   |   +-- utils/             # Shared Result/Path/Todo helpers
|   |   +-- viewmodels/        # Legacy MVVM layer maintained for tests
|   |   +-- tests/             # Jest specs and integration harnesses
|   +-- assets/                # Logos and imagery used in the UI
|   +-- scripts/               # Build helpers, autosnap, update-to-latest
+-- powershell7/               # Cross-platform terminal monitor (PowerShell)
+-- bash/                      # Minimal Bash monitor
+-- GlobalView.png, ProjectView.png, Todo Tracker.png
```

## Other implementations

PowerShell and Bash monitors remain available for headless or remote workflows. See `README-ps.md` and `README-sh.md` for setup instructions and command examples.

## Codex provider metadata

To help the Codex adapter associate todos with real project paths, create sidecar files at `~/.codex/todos/{sessionId}-agent.meta.json` containing:

```json
{ "projectPath": "/absolute/path/to/project" }
```

Automation hooks in `HOOKS-codex.md` show how to emit these files from tool events.

## License

MIT License - feel free to modify and redistribute.

## Contributing

Issues and pull requests are welcome. Please run the Jest suite before submitting patches.

## Authors

* TypeScript/Electron GUI by Dimension Zero ([@dimension-zero](https://github.com/dimension-zero))
* PowerShell implementation by Dimension Zero ([@dimension-zero](https://github.com/dimension-zero))
* Original Bash CLI version created by Jameson Nyp ([@JamesonNyp](https://github.com/JamesonNyp)) [cc-todo-hook-tracker](https://github.com/JamesonNyp/cc-todo-hook-tracker)

Entropic has been created by Dimension Technologies (www.ditech.ai) for the open-source community.
