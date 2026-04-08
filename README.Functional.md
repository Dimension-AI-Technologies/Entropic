# Entropic — Functional Capabilities

Entropic presents five primary views in a tabbed desktop UI. Each view is backed by its own ViewModel and draws from the same underlying provider-aggregated data.

## 1. Project View (Tab 1 — Ctrl+1)

Per-project drill-down of TODOs and sessions.

- Project list with sort modes: **Recent**, **Name**, **TODO count**
- Session tabs per project, each showing its TODO list with status (pending, in-progress, completed)
- Provider filter toggles (Claude / Codex / Gemini)
- Activity mode highlights recently touched projects
- "View Chat" button jumps the selected session into the Chat View

## 2. Global View (Tab 2 — Ctrl+2)

Single flat DataGrid of every TODO across every project and every provider.

- Provider badges and status indicators
- Sortable/filterable columns
- Useful for "what am I supposed to be doing right now" at a glance

## 3. Git View (Tab 3 — Ctrl+3)

Live scan of git repositories discovered under the projects the agents have touched.

- Ahead/behind tracking against upstream
- Dirty/clean status
- Primary language detection
- Repo-level overview without shell access

## 4. Commit View (Tab 4 — Ctrl+4)

On-demand commit history per repository.

- Select a repo → load its recent commits
- Author, date, hash, message
- Loaded lazily to keep startup fast

## 5. Chat View (Tab 5 — Ctrl+5)

Rendered session transcripts from Claude Code JSONL files.

- Four display modes in sub-tabs:
  - **WebView** — HTML-rendered markdown + syntax-highlighted code
  - **Plain Text** — raw text fallback
  - **Inline Runs** — Avalonia inline run rendering
  - **AvaloniaEdit** — editor-style with TextMate syntax highlighting
- Search, filter, follow-mode (auto-scroll as new messages arrive)
- User/assistant/tool message bubbles
- Loaded via ProjectView → "View Chat" or directly from session navigation

## Cross-cutting features

- **Auto-refresh** via filesystem watchers (debounced) on `~/.claude/projects/`, `~/.claude/todos/`, etc.
- **Manual refresh** — F5
- **Help dialog** — F1
- **Toast notifications** for errors and state changes
- **Spacing density** — compact / normal / wide
- **Dark / Light themes**
- **Single-instance guard** — only one Entropic process per user session
- **Diagnostics & repair** — detect and fix missing or corrupted metadata sidecars
- **Screenshot service** — capture the current view

## Provider support matrix

| Provider     | TODOs | Sessions | Chat rendering |
|--------------|:-----:|:--------:|:--------------:|
| Claude Code  | ✅    | ✅       | ✅             |
| OpenAI Codex | ✅    | ✅       | —              |
| Gemini       | ✅    | ✅       | —              |

Chat View currently renders Claude JSONL only; Codex/Gemini chat rendering is future work.
