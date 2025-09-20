# Entropic - Multi-Provider Todo Monitor

[![GitHub Clones](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.github.com%2Frepos%2FDoowell2%2FEntropic%2Ftraffic%2Fclones&query=%24.count&label=clones&color=blue)](https://github.com/Doowell2/Entropic)
[![GitHub Stars](https://img.shields.io/github/stars/Doowell2/Entropic?style=social)](https://github.com/Doowell2/Entropic)

A beautiful Slack-like Electron app for monitoring todo lists across multiple AI coding assistants - Claude Code, OpenAI Codex, and Google Gemini CLI.

## Features

- **Multi-Provider Support**: Works with Claude Code, OpenAI Codex, and Google Gemini CLI
- **Provider Filtering**: Toggle visibility for each provider independently
- **Slack-like UI**: Clean, modern interface with dark theme
- **Project Sidebar**: All projects with active todos listed on the left
- **Session Tabs**: Each project shows tabs for different AI assistant sessions
- **Live Updates**: Auto-refreshes every 5 seconds with file watching
- **Status Indicators**: Visual indicators for completed (✓), active (▶), and pending (○) todos
- **Sorted Display**: Todos sorted by status - completed first, then active, then pending
- **Global View**: See all todos across all providers and projects in one place

## Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start the built app
npm start

# Package for distribution
npm run dist
```

## Development

The app uses:
- **Electron** for desktop app framework
- **React** for UI components
- **TypeScript** for type safety
- **Vite** for fast development builds

### Project Structure

```
typescript/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # Main process entry point
│   │   └── preload.ts  # Preload script for IPC
│   ├── App.tsx         # Main React component
│   ├── App.css         # Slack-like styling
│   └── main.tsx        # Renderer entry point
├── package.json
├── tsconfig.json       # TypeScript config for renderer
├── tsconfig.main.json  # TypeScript config for main process
└── vite.config.ts      # Vite configuration
```

## Supported AI Assistants

Entropic monitors todo lists from:

- **Claude Code**: Reads from `~/.claude/` directory
- **OpenAI Codex**: Reads from `~/.codex/` directory
- **Google Gemini CLI**: Reads from `~/.gemini/` directory

Each provider can be toggled on/off independently via the title bar controls.

## How It Works

1. **Main Process** (`main.ts`):
   - Reads todo files from provider directories (`~/.claude/`, `~/.codex/`, `~/.gemini/`)
   - Reads project mappings from provider-specific project directories
   - Converts flattened paths back to real paths
   - Provides IPC endpoint for renderer to fetch data
   - Monitors file system changes for live updates

2. **Preload Script** (`preload.ts`):
   - Safely exposes `getTodos` API to renderer

3. **Renderer Process** (`App.tsx`):
   - Fetches todo data via IPC from all providers
   - Displays projects in sidebar with provider indicators
   - Shows session tabs for selected project
   - Renders todos with status indicators
   - Auto-refreshes on file system changes
   - Provider filtering via title bar toggles

## Building for Distribution

```bash
# Windows
npm run dist

# The packaged app will be in the `release` folder
```

## Usage

1. Start the app
2. Projects with todos appear in the left sidebar
3. Click a project to view its sessions
4. Click session tabs to switch between different Claude Code sessions
5. Todos are displayed with:
   - Numbers for easy reference
   - Status icons and colors
   - Sorted by completion status

The app automatically refreshes every 5 seconds to show the latest todos.