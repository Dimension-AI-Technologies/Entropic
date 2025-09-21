# Entropic - Multi-Provider AI Todo GUI, Project History & Git Status Monitor

<!-- Project badges -->
[![GitHub Stars](https://img.shields.io/github/stars/dimension-zero/Entropic?style=social)](https://github.com/dimension-zero/Entropic/stargazers)
[![Forks](https://img.shields.io/github/forks/dimension-zero/Entropic?style=social)](https://github.com/dimension-zero/Entropic/network/members)
[![Watchers](https://img.shields.io/github/watchers/dimension-zero/Entropic?style=social)](https://github.com/dimension-zero/Entropic/watchers)
[![Clones](https://img.shields.io/badge/dynamic/json?color=success&label=clones&query=%24.count&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fdimension-zero%2FEntropic%2Ftraffic%2Fclones&logo=git)](https://github.com/dimension-zero/Entropic)
[![Open Issues](https://img.shields.io/github/issues/dimension-zero/Entropic)](https://github.com/dimension-zero/Entropic/issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/dimension-zero/Entropic)](https://github.com/dimension-zero/Entropic/pulls)
[![Last Commit](https://img.shields.io/github/last-commit/dimension-zero/Entropic)](https://github.com/dimension-zero/Entropic/commits)
[![License](https://img.shields.io/github/license/dimension-zero/Entropic)](#license)
[![Code Size](https://img.shields.io/github/languages/code-size/dimension-zero/Entropic)](https://github.com/dimension-zero/Entropic)
[![Top Language](https://img.shields.io/github/languages/top/dimension-zero/Entropic)](https://github.com/dimension-zero/Entropic)

![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-2ea44f)
![Electron](https://img.shields.io/badge/Electron-36.x-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)

A comprehensive monitoring system for AI coding assistants that provides real-time tracking across **Claude Code**, **OpenAI Codex**, and **Google Gemini**. Displays live updates of Todo items, project history, and Git repository status with commit monitoring.

**Multi-Provider Support:**
- 🤖 **Claude Code** - Official Anthropic CLI integration
- 🔧 **OpenAI Codex** - Full session and project tracking
- 💎 **Google Gemini** - Complete workflow monitoring

**Git Integration:**
- 📊 **Repository Status** - Real-time monitoring of all Git repositories
- 📝 **Commit History** - Detailed commit tracking with stats and co-authors
- 🔄 **Live Updates** - Automatic refresh of repository states

Available as a cross-platform TypeScript/Electron GUI and terminal versions in PowerShell by [dimension-zero](@dimension-zero) and original Bash by [@JamesonNyp](@JamesonNyp).

![Claude Code Todo Tracker Live Monitor](Todo%20Tracker.png)

## Overview

This project provides comprehensive monitoring for multiple AI coding assistants and Git repositories. It integrates with hook systems from Claude Code, OpenAI Codex, and Google Gemini to capture and display todo updates, project history, and Git status in real-time. When any supported AI tool modifies todos or project state, Entropic provides a unified live monitoring dashboard.

## Features

**Multi-Provider AI Integration:**
- 🤖 **Claude Code**: Full TodoWrite tool integration with real-time updates
- 🔧 **OpenAI Codex**: Session and project tracking with metadata support
- 💎 **Google Gemini**: Complete workflow monitoring and history
- 🔄 **Provider Filtering**: Toggle between providers or view all simultaneously

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

## How It Works

**Multi-Provider Data Collection:**
1. **Claude Code Integration**: Intercepts PostToolUse events for TodoWrite
   - Captures todo data from Claude Code sessions
   - Extracts relevant information (todos, session, directory)
   - Saves formatted JSON to `~/.claude/logs/current_todos.json`

2. **Codex & Gemini Monitoring**: Watches session files and project directories
   - Monitors `~/.codex/todos/` and `~/.gemini/sessions/` for updates
   - Associates sessions with projects via metadata files
   - Tracks project history and todo state changes

**Git Repository Tracking:**
3. **Repository Discovery**: Automatically finds all Git repositories in your workspace
   - Scans for `.git` directories recursively
   - Identifies programming languages used in each repository
   - Tracks remote repository URLs and status

4. **Live Monitoring**: Provides real-time updates across all data sources
   - Watches files for changes using native OS mechanisms
   - Parses and displays data with color coding and filtering
   - Updates display automatically with minimal resource usage

## Available Implementations

### TypeScript/Electron GUI Version (`typescript/`) - Cross-Platform Desktop Application
- **Modern Desktop GUI**: Slack-like interface with dark theme
- **Cross-platform**: Runs as a native desktop app on Windows, macOS, and Linux
- **Multi-Provider Support**: Unified interface for Claude Code, OpenAI Codex, and Google Gemini
- **Git Integration**: Built-in Git status monitoring and commit history viewer
- **Advanced Features**:
  - Real-time monitoring of all AI provider sessions across projects
  - Provider filtering with toggle controls (Claude/Codex/Gemini)
  - Multiple view modes: Project Todos, Project History, Global View, Git Status, Commit History
  - Tri-state toggle controls for sorting and spacing customization
  - Session tabs with automatic deduplication
  - Auto-refresh every 5 seconds
  - Visual status indicators and progress tracking
- **Easy Installation**: `npm install` and `npm start` to run
- See [typescript/README.md](typescript/README.md) for setup instructions

### PowerShell 7 Version (`powershell7/`) - Recommended for Cross-Platform Use
- **Truly cross-platform**: Runs natively on Windows, macOS, and Linux
- No external dependencies required
- Built-in JSON parsing and file watching
- While PowerShell may seem unfamiliar to Unix users, it solves many traditional shell scripting limitations:
  - Consistent behavior across all platforms
  - Structured data handling (objects vs text streams)
  - No need for external tools like `jq`, `sed`, or `awk`
  - Robust error handling and debugging
- See [README-ps.md](README-ps.md) for setup instructions

### Bash Version (`bash/`) - For macOS and Linux
- Works on Linux, macOS, and WSL2 (not native Windows)
- Requires `jq` for JSON parsing
- Optionally uses `inotifywait` (Linux) or `fswatch` (macOS) for file monitoring
- See [README-sh.md](README-sh.md) for setup instructions

## Project Structure

```
cc-todo-hook-tracker/
├── README.md           # This file
├── README-sh.md        # Bash setup guide
├── README-ps.md        # PowerShell setup guide
├── TESTING-ps.md       # PowerShell testing guide
├── Todo Tracker.png    # Screenshot of the monitor
├── bash/               # Bash implementation
│   ├── todo_hook_post_tool.sh
│   └── todo_live_monitor.sh
├── powershell7/        # PowerShell 7 implementation
│   ├── todo_hook_post_tool.ps1
│   ├── todo_live_monitor.ps1
│   └── tests/          # Test scripts
└── typescript/         # Electron GUI implementation
    ├── src/            # React/TypeScript source
    ├── package.json    # Node dependencies
    └── README.md       # GUI setup guide
```

## Quick Start

1. Choose your preferred implementation:
   - **Desktop GUI (Electron)**: Follow [typescript/README.md](typescript/README.md)
   - **Terminal (PowerShell 7)**: Follow [README-ps.md](README-ps.md)
   - **Terminal (Bash)**: Follow [README-sh.md](README-sh.md)

2. Configure Claude Code hooks to use the appropriate script; the GUI is triggered by hooks

3. Start the monitor:
   - GUI version: from typescript directory, run `npm run build` and `npm start` to launch the Electron app
   - Terminal versions: Run monitor script in a separate terminal

4. Use Claude Code normally - todos will appear automatically!

## File Storage

All implementations use the same file structure:
```
~/.claude/
├── settings.json               # Claude Code configuration
├── logs/
│   └── current_todos.json      # Current todo state data
└── scripts/                    # (Optional) Script installation location
```

## Codex Provider Hooks (optional but recommended)

To help Entropic reliably associate Codex sessions with projects, write a sidecar metadata file next to each Codex todo file:

- Path: `~/.codex/todos/{sessionId}-agent.meta.json`
- Content: `{ "projectPath": "/absolute/path/to/your/project" }`

Example scripts and details are in `HOOKS-codex.md`.

## License

MIT License - Feel free to modify and distribute

## Contributing

Contributions are welcome. Please feel free to submit pull requests or open issues for bugs and feature requests.

## Author

* TypeScript/Electron GUI by Dimension Zero (@dimension-zero)
* PowerShell implementation by Dimension Zero (@dimension-zero)
* Original Bash CLI version created by Jameson Nyp (@JamesonNyp) [cc-todo-hook-tracker](https://github.com/JamesonNyp/cc-todo-hook-tracker)
