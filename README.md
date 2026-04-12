# Entropic

Real-time monitoring dashboard for AI coding agents (Claude Code, OpenAI Codex, Google Gemini). Track TODO lists, session history, git repositories, and commit activity across all your projects from a unified desktop interface.

## Overview

Entropic is a cross-platform companion application that ingests session and history data from multiple AI coding assistants, merges them into a unified provider-aware data model, and renders a live dashboard with project activity, session diagnostics, and maintenance tooling.

The primary implementation is a .NET 10 / Avalonia desktop app (F# core + C# GUI). Legacy Electron/TypeScript, PowerShell, and Bash monitors are also included in the repo.

## Quick Start (.NET Desktop App)

```sh
cd source/dotnet
dotnet build Entropic.slnx
dotnet run --project Entropic.GUI/Entropic.GUI.csproj
```

Auto-detects agent data under `~/.claude`, `~/.codex`, and `~/.gemini`. No configuration required.

## Core Features

- **Live TODO Tracking** — Per-project and global TODO views with real-time updates
- **Session History** — Rendered JSONL transcripts per session (markdown, code blocks)
- **Multi-Agent Support** — Unified view across Claude Code, Codex, and Gemini
- **Git Integration** — Repository discovery, ahead/behind status, language detection
- **Commit View** — Per-repo commit history on demand
- **Chat View** — Full transcript rendering with 4 display modes (WebView, plain, inline runs, AvaloniaEdit)
- **Keyboard-driven** — Ctrl+1–5 tab switching, F5 refresh, F1 help

## Documentation

- [README.Vision.md](README.Vision.md) — Vision & goals
- [README.Functional.md](README.Functional.md) — Functional capabilities
- [README.Architecture.md](README.Architecture.md) — Architecture & diagrams
- [README.Technical.md](README.Technical.md) — Technical stack & specs
- [README.Data.md](README.Data.md) — Data sources & handling
- [README.Security.md](README.Security.md) — Security posture
- [README.Deploy.md](README.Deploy.md) — Build & deployment

## Alternative Implementations

- **TypeScript / Electron** — see `source/typescript/`
- **PowerShell 7** — see [README-ps.md](README-ps.md)
- **Bash** — see [README-sh.md](README-sh.md)

## Project Structure

```
Entropic/
├── source/
│   ├── dotnet/         # Primary: F# Core + C# Avalonia GUI
│   ├── typescript/     # Legacy Electron GUI
├── powershell7/        # PowerShell terminal monitor
├── bash/               # Bash terminal monitor
├── Structure.md        # Detailed directory layout
├── Hexagon.md          # Hexagonal architecture design
```

---

**License:** MIT — **Authors:** Dimension Zero, Jameson Nyp
