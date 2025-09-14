# Entropic

![License](https://img.shields.io/github/license/dimension-zero/Entropic)
![Windows](https://img.shields.io/badge/Windows-0078D6?logo=windows&logoColor=white)
![macOS](https://img.shields.io/badge/macOS-000000?logo=apple&logoColor=white)
![Linux](https://img.shields.io/badge/Linux-FCC624?logo=linux&logoColor=black)
![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Electron 38](https://img.shields.io/badge/Electron-38.0-47848F?logo=electron&logoColor=white)
![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![PowerShell 7.x](https://img.shields.io/badge/PowerShell-7.x-5391FE?logo=powershell&logoColor=white)
![Watchers](https://img.shields.io/github/watchers/dimension-zero/Entropic)
![Stars](https://img.shields.io/github/stars/dimension-zero/Entropic)
![Downloads](https://img.shields.io/github/downloads/dimension-zero/Entropic/total)
![Commit activity](https://img.shields.io/github/commit-activity/m/dimension-zero/Entropic)
![Contributors](https://img.shields.io/github/contributors/dimension-zero/Entropic)

Note: The desktop GUI uses Node.js/TypeScript (Electron). PowerShell scripts target PowerShell 7.x; the GUI itself does not require .NET.

Cross‑platform app to watch Claude Code TODO lists and project histories in one centralised GUI.

Inspired by the Bash original of JamesonNyp/cc-todo-hook-tracker, it was first translated to a cross‑platform PowerShell equivalent and then evolved into the present desktop GUI in TypeScript/Electron.

![Claude Code Todo Tracker Live Monitor](Todo%20Tracker.png)

## What It Does

Entropic listens to Claude Code’s TodoWrite activity and presents your work in three complementary ways:

- Project ToDo View: Focus on a single project’s sessions and todos with filtering, sorting, merging empty sessions, and quick copy actions.
- Project History View: Browse per‑project prompt/history timelines (switchable from the Project view) to understand how work evolved.
- Global View: See active todos across all projects in one place with fast navigation back into project context.

The terminal implementations (PowerShell and Bash) provide lightweight live monitoring of the same Todo data written by Claude Code.

## Lineage & Credits

- Bash original: Jameson Nyp (@JamesonNyp)
- PowerShell translation and TypeScript/Electron GUI: dimension-zero (@dimension-zero)

## Key Functionality

GUI (TypeScript/Electron)
- Three views: Project ToDo, Project History, and Global View
- Real‑time updates from Claude Code sessions
- Project/session selection, filtering and spacing controls
- Clipboard helpers for project name/path and current/next task
- Screenshot shortcut (menu and title bar) that copies saved path

PowerShell (cross‑platform terminal)
- Native file watching across Windows, macOS, and Linux
- Structured JSON handling without external tools
- Color/status indicators and session context

Bash (terminal)
- Minimal dependency monitor driven by fs events
- Uses jq for JSON and fswatch/inotify for file watching

## Install, Configure, Run

Prerequisites for all versions
- Claude Code writing Todo state to the standard locations under `~/.claude/`
- The project/session data under `~/.claude/projects` and active todos under `~/.claude/todos`

GUI (TypeScript/Electron)
- Requirements: Node.js 18+ and npm; Windows/macOS/Linux supported
- Install
  - `cd typescript`
  - `npm install`
- Run (development)
  - `npm run dev` (starts main + renderer with hot reload)
- Run (production locally)
  - `npm run build`
  - `npm start`
- Package installers (optional)
  - `npm run dist` (build + package for your platform)

PowerShell (cross‑platform)
- Requirements: PowerShell 7+ on Windows/macOS/Linux
- Configure
  - Point your Claude hook for TodoWrite PostToolUse to the PowerShell hook in `powershell7/` (see README‑ps.md)
  - Ensure `~/.claude/logs` and `~/.claude/todos` exist
- Run
  - Launch the live monitor script from `powershell7/` (see README‑ps.md) or use `./Launch-TodoMonitor.ps1`

Bash
- Requirements: `jq`, plus `inotifywait` (Linux) or `fswatch` (macOS)
- Configure
  - Point your Claude hook for TodoWrite PostToolUse to the Bash hook in `bash/` (see README‑sh.md)
  - Ensure `~/.claude/logs` and `~/.claude/todos` exist
- Run
  - Start the live monitor script from `bash/` (see README‑sh.md)

## Project Structure

```
Entropic/
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
│   └── tests/
└── typescript/         # Electron GUI implementation
    ├── src/            # React/TypeScript/Electron source
    ├── package.json    # Node dependencies
    └── README.md       # Additional GUI notes
```

## License

MIT License

## Contributing

Issues and PRs are welcome. Bug reports, small fixes, and feature suggestions all help.

## Credits

- Original Bash version: Jameson Nyp (@JamesonNyp)
- TypeScript and GUI versions by dimension-zero (@dimension-zero)
