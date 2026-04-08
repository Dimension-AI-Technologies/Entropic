# Entropic — Data Handling

## Where data comes from

Entropic is a pure consumer of data written by other tools. It owns no database. Everything it shows is read from the user's home directory or discovered git repositories.

| Source                             | Contents                                  | Owned by      |
|------------------------------------|-------------------------------------------|---------------|
| `~/.claude/projects/<slug>/*.jsonl` | Claude Code session transcripts          | Claude Code   |
| `~/.claude/projects/<slug>/sessions-index.json` | Session index                 | Claude Code   |
| `~/.claude/todos/*.json`           | Per-session TODO state                    | Claude Code   |
| `~/.codex/…`                       | Codex session + TODO state                | OpenAI Codex  |
| `~/.gemini/…`                      | Gemini session + TODO state               | Google Gemini |
| `<project>/.git/`                  | Git metadata (via LibGit2Sharp or shell) | Git           |

## File formats

### JSONL session transcripts (Claude)
Line-delimited JSON. Each line is a message-like record:
```json
{"role":"user","content":"…","timestamp":"…"}
{"role":"assistant","content":[…],"tool_use":[…]}
{"role":"meta","session_id":"…"}
```
Parsed by `JsonlParser.fs`. Robust to partial/truncated lines.

### TODO metadata (Claude)
JSON array of TODO items, one file per session, named `{sessionId}-agent-*.json`:
```json
[
  {"id":"…","content":"…","status":"pending|in_progress|completed",
   "activeForm":"…","createdAt":"…","updatedAt":"…"}
]
```
`id`, `activeForm`, `createdAt`, `updatedAt` are optional.

### Hook-emitted sidecar metadata (optional)
`~/.claude/todos/{sessionId}-agent.meta.json` — emitted by an optional Claude Code hook to record the project path for a session. Entropic uses this when present to map sessions to projects more accurately than path-slug heuristics.

## Aggregation

`Aggregator.fs` takes per-adapter `Project list` outputs and merges them:

- **Key:** `(Provider, canonicalizedPath)` for projects; `SessionId` for sessions.
- **Dedupe:** if two adapters report the same project (rare), they're coalesced by path.
- **Stats:** computed post-merge (`ProjectStats` — total TODOs, open count, last-activity timestamp).

## File watching

`FileWatcher.fs` wraps `System.IO.FileSystemWatcher` with a debounce:

- Watches `~/.claude/projects/`, `~/.claude/todos/`, and the equivalents for other providers.
- Debounce window collapses bursts of rename/write events into a single `RefreshRequested` signal.
- Core raises an event via `IEventPort`; the GUI ViewModels subscribe and re-run `Aggregator.getProjects()`.

## Persistence (what Entropic itself writes)

Entropic stores its own preferences in a single local file:

- `entropic.json` — UI preferences (theme, density, last selected tab, provider toggles, window geometry).

That is the full extent of Entropic's writes. It does **not** write to `~/.claude/`, `~/.codex/`, or `~/.gemini/` directories in the normal run loop.

The only exceptions are **explicit user-triggered repair operations** (`RepairStrategies.fs`), which may write sidecar metadata files to fix detected diagnostics. These actions require user confirmation.

## Caching

- **In-memory only.** Parsed projects/sessions are held in the ViewModels and rebuilt on each refresh.
- **No on-disk cache.** Restart re-parses everything. Parsing is fast enough at garage scale that a cache would add complexity without clear benefit.

## Data volume expectations

- Typical: tens of projects, hundreds of sessions, thousands of TODOs, JSONL files up to a few MB each.
- Chat View loads one session's JSONL at a time; larger transcripts render progressively via the WebView/AvaloniaEdit tabs.

## Privacy

- All data stays on the local machine. See [README.Security.md](README.Security.md).
