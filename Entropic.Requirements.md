# Entropic — Product Requirements Document (Reverse-Engineered)

Reverse-engineered from codebase as of 2026-03-18. Requirement IDs follow `REQ-{category}-{sequence}` format.

**Categories:**
| Prefix | Domain |
|--------|--------|
| REQ-PLT | Platform & Infrastructure |
| REQ-TOD | TODO Tracking |
| REQ-PRV | Multi-Provider Support |
| REQ-SES | Session Management |
| REQ-GIT | Git Integration |
| REQ-DGN | Diagnostics & Repair |
| REQ-HOK | Hook Integration |
| REQ-GUI | Desktop GUI (Electron) |
| REQ-CLI | Terminal Implementations |
| REQ-BLD | Build & Distribution |
| REQ-ARC | Architecture & Quality |

---

## Requirements Index

| ID | Area | Title | Status | Version |
|----|------|-------|--------|---------|
| REQ-PLT-001 | Platform | Cross-Platform Desktop Application | Implemented | v1.0 |
| REQ-PLT-002 | Platform | Cross-Platform Terminal Monitor | Implemented | v1.0 |
| REQ-PLT-003 | Platform | Auto-Detection of Provider Data | Implemented | v1.0 |
| REQ-PLT-004 | Platform | Local-Only Processing | Implemented | v1.0 |
| REQ-PLT-005 | Platform | Single Instance | Implemented | v1.0 |
| REQ-PLT-006 | Platform | File-Based Configuration | Implemented | v1.0 |
| REQ-TOD-001 | TODO | Real-Time TODO Display | Implemented | v1.0 |
| REQ-TOD-002 | TODO | TODO Status States | Implemented | v1.0 |
| REQ-TOD-003 | TODO | Status Visual Indicators | Implemented | v1.0 |
| REQ-TOD-004 | TODO | Inline TODO Editing | Implemented | v1.0 |
| REQ-TOD-005 | TODO | TODO Deletion | Implemented | v1.0 |
| REQ-TOD-006 | TODO | Active Form Display | Implemented | v1.0 |
| REQ-TOD-007 | TODO | Per-Project TODO View | Implemented | v1.0 |
| REQ-TOD-008 | TODO | Global TODO View | Implemented | v1.0 |
| REQ-TOD-009 | TODO | TODO Sorting | Implemented | v1.0 |
| REQ-TOD-010 | TODO | TODO Persistence | Implemented | v1.0 |
| REQ-TOD-011 | TODO | TODO Filtering | Implemented | v1.0 |
| REQ-PRV-001 | Provider | Claude Code Provider | Implemented | v1.0 |
| REQ-PRV-002 | Provider | OpenAI Codex Provider | Implemented | v1.0 |
| REQ-PRV-003 | Provider | Google Gemini Provider | Implemented | v1.0 |
| REQ-PRV-004 | Provider | Provider Filter Toggles | Implemented | v1.0 |
| REQ-PRV-005 | Provider | Provider Badges | Implemented | v1.0 |
| REQ-PRV-006 | Provider | Provider-Agnostic Data Model | Implemented | v1.0 |
| REQ-PRV-007 | Provider | Provider Presence Detection | Implemented | v1.0 |
| REQ-PRV-008 | Provider | Unified Aggregation | Implemented | v1.0 |
| REQ-SES-001 | Session | Session Identification | Implemented | v1.0 |
| REQ-SES-002 | Session | Session Tabs | Implemented | v1.0 |
| REQ-SES-003 | Session | Session Metadata | Implemented | v1.0 |
| REQ-SES-004 | Session | Session-to-Project Mapping | Implemented | v1.0 |
| REQ-SES-005 | Session | Flattened Directory Path Reconstruction | Implemented | v1.0 |
| REQ-SES-006 | Session | Session Merge | Implemented | v1.0 |
| REQ-SES-007 | Session | Session Deletion | Implemented | v1.0 |
| REQ-SES-008 | Session | Session History and Prompts | Implemented | v1.0 |
| REQ-SES-009 | Session | Session Sorting | Implemented | v1.0 |
| REQ-GIT-001 | Git | Repository Discovery | Implemented | v1.0 |
| REQ-GIT-002 | Git | Repository Status | Implemented | v1.0 |
| REQ-GIT-003 | Git | Ahead Behind Tracking | Implemented | v1.0 |
| REQ-GIT-004 | Git | Language Detection | Implemented | v1.0 |
| REQ-GIT-005 | Git | Commit History View | Implemented | v1.0 |
| REQ-GIT-006 | Git | Git Status Summary | Implemented | v1.0 |
| REQ-GIT-007 | Git | On-Demand Loading | Implemented | v1.0 |
| REQ-DGN-001 | Diagnostics | Unanchored Session Detection | Implemented | v1.0 |
| REQ-DGN-002 | Diagnostics | Startup Repair Prompt | Implemented | v1.0 |
| REQ-DGN-003 | Diagnostics | Dry-Run Repair | Implemented | v1.0 |
| REQ-DGN-004 | Diagnostics | Live Repair | Implemented | v1.0 |
| REQ-DGN-005 | Diagnostics | Per-Provider Diagnostics | Implemented | v1.0 |
| REQ-DGN-006 | Diagnostics | Repair Threshold Configuration | Implemented | v1.0 |
| REQ-DGN-007 | Diagnostics | Default Dry-Run Safety | Implemented | v1.0 |
| REQ-HOK-001 | Hooks | Claude Code PostToolUse Hook | Implemented | v1.0 |
| REQ-HOK-002 | Hooks | Hook Data Capture | Implemented | v1.0 |
| REQ-HOK-003 | Hooks | Sidecar Metadata Emission | Implemented | v1.0 |
| REQ-HOK-004 | Hooks | Flag File Notification | Implemented | v1.0 |
| REQ-HOK-005 | Hooks | Hook Configuration Script | Implemented | v1.0 |
| REQ-HOK-006 | Hooks | Codex Hook Documentation | Implemented | v1.0 |
| REQ-GUI-001 | GUI | Tabbed Navigation | Implemented | v1.0 |
| REQ-GUI-002 | GUI | Three-Pane Project Layout | Implemented | v1.0 |
| REQ-GUI-003 | GUI | Project List Filtering | Implemented | v1.0 |
| REQ-GUI-004 | GUI | Context Menus | Implemented | v1.0 |
| REQ-GUI-005 | GUI | Spacing Modes | Implemented | v1.0 |
| REQ-GUI-006 | GUI | Dark Theme | Implemented | v1.0 |
| REQ-GUI-007 | GUI | Splash Screen | Implemented | v1.0 |
| REQ-GUI-008 | GUI | Toast Notifications | Implemented | v1.0 |
| REQ-GUI-009 | GUI | Screenshot Capture | Implemented | v1.0 |
| REQ-GUI-010 | GUI | Automated Screenshot Mode | Implemented | v1.0 |
| REQ-GUI-011 | GUI | Status Bar | Implemented | v1.0 |
| REQ-GUI-012 | GUI | Animated Background | Implemented | v1.0 |
| REQ-GUI-013 | GUI | Configurable Log Level | Implemented | v1.0 |
| REQ-GUI-014 | GUI | Window Defaults | Implemented | v1.0 |
| REQ-GUI-015 | GUI | Refresh Controls | Implemented | v1.0 |
| REQ-CLI-001 | CLI | PowerShell Live Monitor | Implemented | v1.0 |
| REQ-CLI-002 | CLI | PowerShell Spectre Monitor | Implemented | v1.0 |
| REQ-CLI-003 | CLI | Bash Live Monitor | Implemented | v1.0 |
| REQ-CLI-004 | CLI | Auto-Refresh Cycle | Implemented | v1.0 |
| REQ-CLI-005 | CLI | Debounced Updates | Implemented | v1.0 |
| REQ-CLI-006 | CLI | Session Display Limits | Implemented | v1.0 |
| REQ-BLD-001 | Build | Windows Distribution | Implemented | v1.0 |
| REQ-BLD-002 | Build | macOS Distribution | Implemented | v1.0 |
| REQ-BLD-003 | Build | Linux Distribution | Implemented | v1.0 |
| REQ-BLD-004 | Build | App Identity | Implemented | v1.0 |
| REQ-BLD-005 | Build | Build Pipeline | Implemented | v1.0 |
| REQ-BLD-006 | Build | Test Suite | Implemented | v1.0 |
| REQ-ARC-001 | Architecture | Hexagonal Architecture | Implemented | v1.0 |
| REQ-ARC-002 | Architecture | Result Type Error Handling | Implemented | v1.0 |
| REQ-ARC-003 | Architecture | MVVM Pattern | Implemented | v1.0 |
| REQ-ARC-004 | Architecture | IPC Boundary Isolation | Implemented | v1.0 |
| REQ-ARC-005 | Architecture | Signature-Based Cache Invalidation | Implemented | v1.0 |
| REQ-ARC-006 | Architecture | Debounced Event Propagation | Implemented | v1.0 |
| REQ-ARC-007 | Architecture | No External Dependencies for CLI | Implemented | v1.0 |
| REQ-ARC-008 | Architecture | Garage-Project Scale | Implemented | v1.0 |
| REQ-TOD-012 | TODO | TODO Drag-and-Drop Reordering | Implemented | v1.0 |
| REQ-GUI-016 | GUI | Activity Mode Auto-Focus | Implemented | v1.0 |
| REQ-GUI-017 | GUI | Project Sorting Options | Implemented | v1.0 |
| REQ-GUI-018 | GUI | Help Dialog | Implemented | v1.0 |
| REQ-GUI-019 | GUI | Error Boundary Recovery | Implemented | v1.0 |
| REQ-GUI-020 | GUI | Session Selection Persistence | Implemented | v1.0 |
| REQ-SES-010 | Session | Batch Empty Session Deletion | Implemented | v1.0 |
| REQ-GUI-021 | GUI | Progress Overlay | Implemented | v1.0 |

---

## Platform & Infrastructure

### `<REQ-PLT-001>` Cross-Platform Desktop Application
The system shall run as a native desktop application on Windows, macOS, and Linux using Electron.

### `<REQ-PLT-002>` Cross-Platform Terminal Monitor
The system shall provide terminal-based monitors in PowerShell Core and Bash for CLI-only environments.

### `<REQ-PLT-003>` Auto-Detection of Provider Data
The system shall auto-detect installed AI coding agents by probing for `~/.claude/`, `~/.codex/`, and `~/.gemini/` directories. No explicit configuration required.

### `<REQ-PLT-004>` Local-Only Processing
All data processing shall occur locally on the user's machine. No telemetry, diagnostics upload, or external service calls (beyond Git remotes).

### `<REQ-PLT-005>` Single Instance
The application shall enforce single-instance execution to prevent file watcher conflicts.

### `<REQ-PLT-006>` File-Based Configuration
Configuration shall be persisted via local files (`prefs.json`, `localStorage`) with no dependency on project-level environment variables.

---

## TODO Tracking

### `<REQ-TOD-001>` Real-Time TODO Display
The system shall display TODO items from all active AI coding sessions with real-time updates as underlying files change.

### `<REQ-TOD-002>` TODO Status States
Each TODO shall support three statuses: `pending`, `in_progress`, and `completed`.

### `<REQ-TOD-003>` Status Visual Indicators
TODO status shall be color-coded: green/checkmark for completed, blue/arrow for in-progress, gray/circle for pending.

### `<REQ-TOD-004>` Inline TODO Editing
Users shall be able to edit TODO content and toggle status directly in the UI.

### `<REQ-TOD-005>` TODO Deletion
Users shall be able to delete individual TODOs from a session.

### `<REQ-TOD-006>` Active Form Display
When a TODO has status `in_progress` and an `activeForm` field, the system shall display the activeForm text (present-continuous verb form) instead of the base content.

### `<REQ-TOD-007>` Per-Project TODO View
The system shall display TODOs grouped by project, with sessions shown as tabs within each project.

### `<REQ-TOD-008>` Global TODO View
The system shall provide an aggregated view of all TODOs across all projects and providers in a single table.

### `<REQ-TOD-009>` TODO Sorting
TODOs shall be sorted by status: in-progress first, then pending, then completed.

### `<REQ-TOD-010>` TODO Persistence
TODOs shall be persisted to `~/.claude/todos/{sessionId}-agent-{sessionId}.json` (and equivalent paths per provider) as JSON arrays.

### `<REQ-TOD-011>` TODO Filtering
The global view shall support filtering to show only active (non-completed) TODOs.

### `<REQ-TOD-012>` TODO Drag-and-Drop Reordering
Users shall be able to reorder TODOs via drag-and-drop and keyboard shortcuts (Ctrl/Cmd+Arrow). Multi-selection shall be supported via Ctrl/Cmd+Click (toggle) and Shift+Click (range). Only contiguous selections may be moved.

---

## Multi-Provider Support

### `<REQ-PRV-001>` Claude Code Provider
The system shall ingest session and TODO data from `~/.claude/projects/` and `~/.claude/todos/` directories.

### `<REQ-PRV-002>` OpenAI Codex Provider
The system shall ingest session and TODO data from `~/.codex/` directories, reading `rollout-*.jsonl` session files with `repoSlug` as project identifier.

### `<REQ-PRV-003>` Google Gemini Provider
The system shall ingest session data from `~/.gemini/sessions/*.jsonl`, using the `slug` field as project identifier.

### `<REQ-PRV-004>` Provider Filter Toggles
The UI shall provide per-provider toggle buttons (Claude, Codex, Gemini) to show/hide data from each provider. Filter state shall persist across sessions via localStorage.

### `<REQ-PRV-005>` Provider Badges
Each project and session row shall display a badge or logo identifying its source provider.

### `<REQ-PRV-006>` Provider-Agnostic Data Model
The core data model (Project, Session, Todo) shall be provider-agnostic. Provider identity shall be carried as a field, not encoded in the type system.

### `<REQ-PRV-007>` Provider Presence Detection
The system shall expose an IPC call (`get-provider-presence`) reporting which providers are installed on the current machine.

### `<REQ-PRV-008>` Unified Aggregation
A single Aggregator shall merge data from all providers, deduplicating projects by `(provider, projectPath)` and sessions by `(provider, sessionId)`.

---

## Session Management

### `<REQ-SES-001>` Session Identification
Sessions shall be identified by a unique `sessionId` (UUID) scoped per provider.

### `<REQ-SES-002>` Session Tabs
Within a selected project, each session shall appear as a navigable tab.

### `<REQ-SES-003>` Session Metadata
Each session shall track: sessionId, projectPath, filePath, provider, createdAt, updatedAt, and a list of TODOs.

### `<REQ-SES-004>` Session-to-Project Mapping
Sessions shall be mapped to projects via sidecar metadata files (`{sessionId}-agent.meta.json`) containing the `projectPath`.

### `<REQ-SES-005>` Flattened Directory Path Reconstruction
The system shall reconstruct real filesystem paths from Claude's flattened directory naming scheme (e.g., `C--Users-name-project` to `C:\Users\name\project`).

### `<REQ-SES-006>` Session Merge
Users shall be able to merge multiple sessions into a single target session. The merge dialog shall preview duplicate and new TODO counts before executing.

### `<REQ-SES-007>` Session Deletion
Users shall be able to delete individual sessions (with confirmation) or batch-delete all empty sessions within a project.

### `<REQ-SES-008>` Session History / Prompts
The system shall load and display JSONL chat history (user and assistant messages) per project, truncated at 1000 characters per message.

### `<REQ-SES-009>` Session Sorting
Sessions shall be sorted by last modification time, most recent first. Terminal monitors shall limit display to the 10-20 most recent sessions.

### `<REQ-SES-010>` Batch Empty Session Deletion
Users shall be able to delete all empty sessions (zero TODOs) within a project in a single operation. The UI shall show per-session deletion progress and report successes and failures.

---

## Git Integration

### `<REQ-GIT-001>` Repository Discovery
The system shall scan `~/source/repos` recursively for `.git` directories and list all discovered repositories.

### `<REQ-GIT-002>` Repository Status
For each repository, the system shall display: project name, relative path, remote URL, current branch, and last commit info.

### `<REQ-GIT-003>` Ahead/Behind Tracking
The system shall show the number of commits ahead of and behind the remote tracking branch for each repository.

### `<REQ-GIT-004>` Language Detection
The system shall detect programming languages per repository by analyzing file extensions, supporting 50+ languages (TypeScript, Python, Go, Rust, Java, etc.).

### `<REQ-GIT-005>` Commit History View
The system shall display per-repository commit history with: hash, date, message, author, co-authors (extracted from `Co-Authored-By:` trailers), and diffstat (additions, deletions, files changed).

### `<REQ-GIT-006>` Git Status Summary
The Git view shall show aggregate statistics: total repositories, out-of-sync count, total commits ahead/behind.

### `<REQ-GIT-007>` On-Demand Loading
Git data shall be fetched on-demand when the Git or Commit view is activated, not on startup.

---

## Diagnostics & Repair

### `<REQ-DGN-001>` Unanchored Session Detection
The system shall scan all providers for sessions that lack a valid `projectPath` (unanchored sessions) and report counts per provider.

### `<REQ-DGN-002>` Startup Repair Prompt
If the count of unanchored sessions exceeds a configurable threshold (default: 5), the system shall prompt the user at startup with options: Repair Live, Dry Run, or Ignore.

### `<REQ-DGN-003>` Dry-Run Repair
Dry-run mode shall display all planned metadata writes without modifying any files.

### `<REQ-DGN-004>` Live Repair
Live repair shall write `metadata.json` files with inferred project paths, reconstructed from flattened directory names with filesystem validation.

### `<REQ-DGN-005>` Per-Provider Diagnostics
Diagnostic reports shall break down unanchored session counts and repair actions per provider.

### `<REQ-DGN-006>` Repair Threshold Configuration
The unanchored-session threshold for triggering the repair prompt shall be configurable via `prefs.json` (`repair.threshold`).

### `<REQ-DGN-007>` Default Dry-Run Safety
Repair operations shall default to dry-run mode (`repair.defaultDryRun: true`).

---

## Hook Integration

### `<REQ-HOK-001>` Claude Code PostToolUse Hook
The system shall provide a PowerShell script (`todo_hook_post_tool.ps1`) that captures TODO data when Claude Code's `TodoWrite` tool fires.

### `<REQ-HOK-002>` Hook Data Capture
The hook shall read JSON from stdin, extract `tool_response.newTodos`, and write the result to `~/.claude/logs/current_todos.json` with timestamp, session_id, cwd, and todos array.

### `<REQ-HOK-003>` Sidecar Metadata Emission
The hook shall write a sidecar metadata file (`~/.claude/todos/{sessionId}-agent.meta.json`) containing the project path for session-to-project mapping.

### `<REQ-HOK-004>` Flag File Notification
The hook shall create a trigger flag file (`~/.claude/todos_updated.flag`) to notify file watchers of changes.

### `<REQ-HOK-005>` Hook Configuration Script
The system shall provide an interactive configuration script (`configure_claude_hook.ps1`) that registers the hook in Claude Code's `settings.json`, supporting dry-run, live, and auto modes.

### `<REQ-HOK-006>` Codex Hook Documentation
The system shall document hook integration patterns for OpenAI Codex agents.

---

## Desktop GUI (Electron)

### `<REQ-GUI-001>` Tabbed Navigation
The title bar shall provide tabs for: Project View, Global View, Git View, and Commit View.

### `<REQ-GUI-002>` Three-Pane Project Layout
Project View shall use a resizable three-pane layout: project list (left), session tabs (middle), and content area (right). Pane dividers shall be draggable with minimum 200px and maximum 600px constraints.

### `<REQ-GUI-003>` Project List Filtering
The project list shall support filter modes: All, Has Sessions, Has Todos, and Active Only.

### `<REQ-GUI-004>` Context Menus
Right-click on projects shall show: Copy Name, Copy Path, Copy Flattened Path, Delete Project. Right-click on sessions shall show: Delete Session (with confirmation).

### `<REQ-GUI-005>` Spacing Modes
The UI shall offer three spacing densities: Compact (6px), Normal (10px), and Wide (14px), persisted in localStorage.

### `<REQ-GUI-006>` Dark Theme
The application shall use a dark theme with background color `#1a1d21`.

### `<REQ-GUI-007>` Splash Screen
A splash screen shall display during boot showing initialization steps, detected providers, and a loading animation.

### `<REQ-GUI-008>` Toast Notifications
Non-blocking toast notifications shall appear in the bottom-right corner with auto-dismiss after 2.5 seconds for operation feedback.

### `<REQ-GUI-009>` Screenshot Capture
The system shall capture the application window as PNG, save to Desktop with timestamped filename, and copy the file path to clipboard. A toast shall confirm success.

### `<REQ-GUI-010>` Automated Screenshot Mode
Development flags `ENTROPIC_AUTOSNAP` and `ENTROPIC_AUTOSNAP_FORCE` shall trigger automatic screenshots after window load for testing.

### `<REQ-GUI-011>` Status Bar
A bottom status bar shall display: project count and active TODO count, updated on every data refresh.

### `<REQ-GUI-012>` Animated Background
The background shall feature an animated Claude logo with stochastic throb/rotation and a boid flocking particle system.

### `<REQ-GUI-013>` Configurable Log Level
A menu option shall allow setting console log level (silent through trace) and optionally writing logs to `~/temp/Entropic/`.

### `<REQ-GUI-014>` Window Defaults
The default window size shall be 1400x900 pixels.

### `<REQ-GUI-015>` Refresh Controls
The UI shall provide a manual refresh button. File watcher events shall trigger automatic refresh with 300ms debounce.

### `<REQ-GUI-016>` Activity Mode Auto-Focus
A toggle button shall enable activity mode, which automatically selects and scrolls to the most recently updated project and session when file changes are detected.

### `<REQ-GUI-017>` Project Sorting Options
The project list shall support multiple sort modes: alphabetical, by recent activity, and by TODO count. The selected sort mode shall persist in localStorage.

### `<REQ-GUI-018>` Help Dialog
A help dialog (accessible via F1 or Help menu) shall display keyboard shortcuts, navigation tips, and feature overview.

### `<REQ-GUI-019>` Error Boundary Recovery
A React error boundary shall catch component tree errors, display the error message and stack trace, and provide a reload button to recover without restarting the application.

### `<REQ-GUI-020>` Session Selection Persistence
The most recently selected project and session shall persist across view changes (Project/Global/Git/Commit tabs) via localStorage, restoring the selection when returning to Project View.

### `<REQ-GUI-021>` Progress Overlay
Long-running operations (batch deletion, repair) shall display a modal progress overlay with an animated spinner and detailed status messages.

---

## Terminal Implementations

### `<REQ-CLI-001>` PowerShell Live Monitor
A PowerShell 7 script (`todo_live_monitor.ps1`) shall display a real-time terminal UI with color-coded TODO statuses, session grouping, and FileSystemWatcher-based updates.

### `<REQ-CLI-002>` PowerShell Spectre Monitor
An enhanced PowerShell monitor (`todo_live_monitor_spectre.ps1`) shall use the Spectre.Console library for table-based rendering with panels and borders.

### `<REQ-CLI-003>` Bash Live Monitor
A Bash script (`todo_live_monitor.sh`) shall provide a lightweight terminal monitor using `inotifywait` (Linux) or `fswatch` (macOS), with polling fallback.

### `<REQ-CLI-004>` Auto-Refresh Cycle
Terminal monitors shall refresh automatically every 5 minutes (300 seconds) with a visible countdown timer, in addition to file-change-triggered updates.

### `<REQ-CLI-005>` Debounced Updates
Terminal monitors shall debounce file change events with a minimum 1-second interval between screen redraws.

### `<REQ-CLI-006>` Session Display Limits
Terminal monitors shall limit displayed sessions to 10 (basic) or 20 (Spectre) most recent, sorted by modification time.

---

## Build & Distribution

### `<REQ-BLD-001>` Windows Distribution
The build shall produce a portable Windows EXE (`ClaudeToDo-Windows.exe`).

### `<REQ-BLD-002>` macOS Distribution
The build shall produce a macOS directory bundle supporting both x64 and arm64 architectures.

### `<REQ-BLD-003>` Linux Distribution
The build shall produce a Linux AppImage for x64.

### `<REQ-BLD-004>` App Identity
The application ID shall be `com.claudecode.todomonitor` with product name `ClaudeToDo`.

### `<REQ-BLD-005>` Build Pipeline
The TypeScript codebase shall compile main process (Node.js), preload (CommonJS), and renderer (Vite) as separate build targets.

### `<REQ-BLD-006>` Test Suite
The project shall include a Jest test suite covering aggregator logic, ViewModel filtering, Git integration, and TODO management.

---

## Architecture & Quality

### `<REQ-ARC-001>` Hexagonal Architecture
The system shall follow a hexagonal (ports & adapters) architecture where the core domain is provider-agnostic, and provider-specific logic lives in adapter implementations of the `ProviderPort` interface.

### `<REQ-ARC-002>` Result Type Error Handling
All fallible operations shall return `Result<T>` (`{ success: boolean, value?: T, error?: string }`). Exceptions shall not be used for control flow.

### `<REQ-ARC-003>` MVVM Pattern
The Electron renderer shall use MVVM with a `DIContainer` managing `ProjectsViewModel` and `TodosViewModel`, separating data logic from React rendering.

### `<REQ-ARC-004>` IPC Boundary Isolation
The main process (file I/O, Git, providers) and renderer process (React UI) shall communicate exclusively through typed IPC handlers exposed via a CommonJS preload script.

### `<REQ-ARC-005>` Signature-Based Cache Invalidation
Provider adapters shall cache fetched data and invalidate based on directory-level signatures (file counts, modification times), not TTL.

### `<REQ-ARC-006>` Debounced Event Propagation
File system changes shall be debounced (300ms in Electron, 1s in CLI) before triggering UI refresh to prevent feedback loops and excessive redraws.

### `<REQ-ARC-007>` No External Dependencies for CLI
The PowerShell CLI monitor shall run with no external module dependencies (Spectre.Console variant is optional/auto-installed).

### `<REQ-ARC-008>` Garage-Project Scale
The system shall be designed for single-developer use. No distributed systems patterns, no complex deployment pipelines, no multi-tenant concerns.

---

*Generated by reverse-engineering the Entropic codebase (TypeScript/Electron, PowerShell 7, Bash) on 2026-03-18.*
