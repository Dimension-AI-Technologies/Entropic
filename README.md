# Entropic

Real-time monitoring dashboard for AI coding agents (Claude Code, OpenAI Codex, Google Gemini). Track TODO lists, project history, and Git repositories across all your projects from a unified desktop interface.

## Overview

Entropic is a cross-platform companion application that ingests session and history data from multiple AI coding assistants, merges them into a unified provider-aware data model, and renders a live dashboard with project activity, session diagnostics, and maintenance tooling. Available as an Electron/TypeScript GUI, PowerShell CLI, and Bash CLI.

**Core Features:**
- 📋 **Live TODO Tracking** — Per-project TODO lists and global TODO view with real-time updates
- 💬 **Session History** — Amalgamated user-prompt history per project for workflow review
- 🌐 **Multi-Agent Support** — Unified interface for Claude Code, OpenAI Codex, and Google Gemini
- 🔄 **Git Integration** — Real-time repository status, commit history, and language detection
- 🎨 **Visual Monitoring** — Color-coded status indicators, session tabs, and automatic refresh every 5 seconds

## Setup

### TypeScript/Electron GUI (recommended)

```sh
cd typescript
npm install
npm run build
npm start
```

Runs as a native desktop application on Windows, macOS, and Linux. Auto-detects AI agent session data from `~/.claude`, `~/.codex`, and `~/.gemini` directories.

### PowerShell Monitor

```powershell
powershell7/Launch-TodoMonitor.ps1
```

Cross-platform terminal monitor using PowerShell 7. See `README-ps.md` for configuration.

### Bash Monitor

```bash
bash/todo_live_monitor.sh
```

Original lightweight terminal monitor. See `README-sh.md` for setup.

## Usage

**Desktop App:**
- Switch between Project TODOs, Project History, Global View, Git Status, and Commit History tabs
- Toggle provider filters (Claude/Codex/Gemini) and customize spacing density
- Right-click for context menus; use diagnostics panel to repair metadata
- Auto-refresh monitors all source directories; manual refresh available via menu

**Hook Integration:**
Claude Code users can optionally configure hooks to automatically emit sidecar metadata files. Creates `~/.claude/todos/{sessionId}-agent.meta.json` with project path information for accurate session-to-project mapping. See `HOOKS-codex.md` for Codex automation examples.

## Project Structure

- **`typescript/`** — Electron GUI with React components, IPC handlers, and file watchers
- **`powershell7/`** — PowerShell implementation with test suite
- **`bash/`** — Minimal Bash monitor
- **`Structure.md`** — Detailed directory layout and architecture
- **`Hexagon.md`** — Hexagon pattern design documentation

## Testing & Build

```sh
npm test              # Run Jest unit/integration suite
npm test:watch       # Watch mode
npm test:coverage    # Coverage report
npm run dist         # Create platform installers (AppImage, macOS, Windows portable)
```

---

**License:** MIT | **Authors:** Dimension Zero, Jameson Nyp
```