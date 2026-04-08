# Entropic — Technical Specifications

## Runtime & languages

| Component         | Language | Framework |
|-------------------|----------|-----------|
| Entropic.Core     | F#       | .NET 10   |
| Entropic.GUI      | C#       | .NET 10 + Avalonia 11.3.12 |
| Tests             | F# / C#  | xUnit     |

- **Target framework:** `net10.0`
- **Output type:** `WinExe` (cross-platform via Avalonia — runs on Windows, macOS, Linux)
- **Solution file:** `source/dotnet/Entropic.slnx` (modern SLNX format)

## UI stack

- **Avalonia** 11.3.12 — cross-platform XAML UI
- **Avalonia.Fluent** theme
- **Avalonia.Controls.DataGrid** 11.3.12
- **Avalonia.AvaloniaEdit** 11.4.1 — text editor control
- **AvaloniaEdit.TextMate** 11.4.1 — syntax highlighting grammars
- **Microsoft.Web.WebView2** 1.0.3856.49 — HTML rendering for Chat View
- **Inter** font (bundled)
- **Theming:** Dark / Light with Discord-inspired palette (accent `#5865f2`, surface `#36393f`)

## MVVM

- **CommunityToolkit.Mvvm** 8.2.1 — `[ObservableProperty]`, `[RelayCommand]` source generators
- One ViewModel per view; `MainWindowViewModel` orchestrates cross-view state (selected tab, provider filters, activity mode)

## Testing

- **xUnit** 2.9.3
- **Microsoft.NET.Test.Sdk** 17.14.1
- **coverlet.collector** 6.0.4
- Separate test projects for Core (F#) and GUI (C#)
- `@must_test` traceability attributes link tests to requirement IDs (`REQ-PLT`, `REQ-TOD`, `REQ-PRV`, `REQ-SES`, `REQ-GIT`, `REQ-DGN`, `REQ-HOK`, `REQ-GUI`, `REQ-ARC`)

## Key modules (Core)

| File                         | Responsibility                               |
|------------------------------|----------------------------------------------|
| `Domain.fs`                  | Algebraic types: Todo, Session, Project, …   |
| `Ports.fs`                   | Port interfaces (provider, event, persistence) |
| `Aggregator.fs`              | Merge & dedupe projects/sessions             |
| `Adapters/ClaudeAdapter.fs`  | Read `~/.claude/projects/`, `~/.claude/todos/` |
| `Adapters/CodexAdapter.fs`   | Read `~/.codex/…`                            |
| `Adapters/GeminiAdapter.fs`  | Read `~/.gemini/…`                           |
| `JsonlParser.fs`             | Shared JSONL line-parser                     |
| `FileWatcher.fs`             | Debounced filesystem watcher                 |
| `TodoManager.fs`             | TODO lifecycle + status transitions          |
| `SessionManager.fs`          | Session lookups, session-index parsing       |
| `ProviderDetection.fs`       | Identify which provider owns a directory    |
| `Diagnostics.fs`             | Collect corruption/missing-metadata reports  |
| `RepairStrategies.fs`        | Fix missing sidecars (opt-in)                |
| `Git/GitIntegration.fs`      | Repo discovery, status, commits, language   |

## Key services (GUI)

| Service                | Purpose                                        |
|------------------------|------------------------------------------------|
| `SingleInstanceGuard`  | Enforce one Entropic process per user          |
| `ToastService`         | Transient notifications                        |
| `ErrorBoundaryService` | Surface unhandled exceptions as toasts         |
| `ScreenshotService`    | Capture current view                           |

## Non-.NET implementations

| Dir              | Runtime        | Notes                              |
|------------------|----------------|------------------------------------|
| `source/typescript/` | Node / Electron / React | Legacy GUI, still builds |
| `powershell7/`   | PowerShell 7+  | Terminal monitor, test suite included |
| `bash/`          | Bash           | Minimal terminal monitor           |

Per CLAUDE.md policy: new scripts are PowerShell Core or Python only; `.sh`/`.bat`/`.cmd` are banned. Existing bash scripts are legacy.

## Constraints & conventions

- **No project-level env vars.** System-wide only (e.g. `PATH`).
- **Result<T> over exceptions** in new code.
- **No network.** Local filesystem only.
- **Non-aggressive timeouts.** No self-defeating short timeouts.
- **Garage-scale.** This is a 1-person prototype; avoid enterprise complexity.
