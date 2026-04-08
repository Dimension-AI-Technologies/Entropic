# Entropic — Architecture

Entropic follows a **hexagonal (ports & adapters)** architecture. The F# core owns the domain model and defines ports; provider-specific adapters and the C# Avalonia GUI plug into those ports.

## Solution layout

```
source/dotnet/Entropic.slnx
├── Entropic.Core             (F# class lib, net10.0)   — domain, ports, adapters, aggregation
├── Entropic.Core.Tests       (F# xUnit,    net10.0)
├── Entropic.GUI              (C# Avalonia, net10.0)    — MVVM desktop UI
└── Entropic.GUI.Tests        (C# xUnit,    net10.0)
```

## High-level diagram

```
 ┌──────────────────────────────────────────────────────────────────┐
 │                       Entropic.GUI  (C# / Avalonia)              │
 │                                                                  │
 │   Views (XAML)              ViewModels (CommunityToolkit.Mvvm)   │
 │   ┌───────────────┐         ┌────────────────────────────┐       │
 │   │ MainWindow    │◄───────►│ MainWindowViewModel        │       │
 │   │ ProjectView   │         │ ├─ ProjectsViewModel       │       │
 │   │ GlobalView    │         │ ├─ GlobalViewModel         │       │
 │   │ GitView       │         │ ├─ GitViewModel            │       │
 │   │ CommitView    │         │ ├─ CommitViewModel         │       │
 │   │ ChatView      │         │ └─ ChatViewModel           │       │
 │   └───────────────┘         └──────────────┬─────────────┘       │
 │                                            │                    │
 │   Services: SingleInstanceGuard, Toast, ErrorBoundary, Screenshot│
 └────────────────────────────────────────────┼────────────────────┘
                                              │  (calls into F# Core)
                                              ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │                     Entropic.Core  (F#)                          │
 │                                                                  │
 │   Domain.fs                                                      │
 │   ┌──────────────────────────────────────────┐                   │
 │   │ Todo · Session · Project · ProjectStats  │                   │
 │   │ TodoStatus · Provider                    │                   │
 │   └──────────────────────────────────────────┘                   │
 │                                                                  │
 │   Ports.fs                                                       │
 │   ┌──────────────────────────────────────────┐                   │
 │   │ IProviderPort   ─ FetchProjects          │                   │
 │   │                 ─ WatchChanges           │                   │
 │   │                 ─ CollectDiagnostics     │                   │
 │   │                 ─ RepairMetadata         │                   │
 │   │ IEventPort · IPersistencePort            │                   │
 │   └─────────────┬────────────────────────────┘                   │
 │                 │                                                │
 │   Aggregator.fs │   merges (provider, path) → unified projects   │
 │                 ▼                                                │
 │   Adapters/                                                      │
 │   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
 │   │ClaudeAdapter │ │ CodexAdapter │ │GeminiAdapter │             │
 │   └──────┬───────┘ └──────┬───────┘ └──────┬───────┘             │
 │          │                │                │                    │
 │   Support: JsonlParser · FileWatcher · TodoManager               │
 │            SessionManager · ProviderDetection · Diagnostics      │
 │            RepairStrategies · Git/GitIntegration                 │
 └──────────┼────────────────┼────────────────┼────────────────────┘
            │                │                │
            ▼                ▼                ▼
     ~/.claude/…       ~/.codex/…        ~/.gemini/…   (+ .git repos)
```

## Flow: "what's in my TODO list right now?"

```
 FileWatcher fires ──► Adapter re-parses JSONL/JSON ──► Aggregator merges
     ▲                                                         │
     │                                                         ▼
  debounce                                        ViewModel raises PropertyChanged
     │                                                         │
     └─────── filesystem events ◄──── user edits ──────────────┘
                                                               ▼
                                                        View re-renders
```

## Key design decisions

- **F# for domain, C# for UI.** F# is terse and type-safe for parsing and aggregation; C# + CommunityToolkit.Mvvm is the path of least resistance for Avalonia.
- **Hexagonal ports.** The GUI never touches `~/.claude` directly; it goes through `IProviderPort`. Adding a new agent = new adapter, zero GUI changes.
- **Aggregation key = (provider, path/id).** The Aggregator deduplicates projects observed by multiple adapters using the project path; sessions use session id.
- **Debounced file watching.** Raw FS events are noisy; a debounce window collapses bursts into one refresh.
- **Read-only adapters.** No adapter writes back to agent directories. Repair operations, when added, write sidecar metadata files under explicit user action only.
- **Lazy commit loading.** Commit history is expensive; loaded on demand per repo.
- **Single-instance guard.** A mutex/lockfile prevents duplicate processes from racing on the same filesystem state.
