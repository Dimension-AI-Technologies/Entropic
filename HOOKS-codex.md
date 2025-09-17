Codex Hooks — Sidecar Metadata for Entropic

Goal
- Help Entropic anchor Codex todo sessions to real project paths by writing a small sidecar file alongside each todo JSON.

Directory layout
- Todos: `~/.codex/todos/`
- Projects: `~/.codex/projects/` (flattened directories created by Entropic)
- Sidecar meta file: `~/.codex/todos/{sessionId}-agent.meta.json`

Sidecar format
- JSON object with a single field:
  { "projectPath": "/absolute/path/to/your/project" }

When to write it
- Whenever Codex emits or updates a todo file `~/.codex/todos/{sessionId}-agent.json`, also write the matching `-agent.meta.json` file with the current project path.

macOS/Linux (bash) example
  #!/usr/bin/env bash
  set -euo pipefail

  SESSION_ID="$1"            # pass current session id
  PROJECT_PATH="$2"          # pass absolute project path
  CODEX_HOME="$HOME/.codex"
  TODOS_DIR="$CODEX_HOME/todos"

  mkdir -p "$TODOS_DIR"
  META_FILE="$TODOS_DIR/${SESSION_ID}-agent.meta.json"

  printf '{"projectPath":"%s"}\n' "$PROJECT_PATH" > "$META_FILE"

PowerShell 7 example
  param(
    [Parameter(Mandatory=$true)][string]$SessionId,
    [Parameter(Mandatory=$true)][string]$ProjectPath
  )

  $CodexHome = Join-Path $HOME ".codex"
  $TodosDir  = Join-Path $CodexHome "todos"
  New-Item -ItemType Directory -Force -Path $TodosDir | Out-Null

  $MetaFile  = Join-Path $TodosDir ("{0}-agent.meta.json" -f $SessionId)
  $MetaJson  = @{ projectPath = $ProjectPath } | ConvertTo-Json -Compress
  Set-Content -Path $MetaFile -Value $MetaJson -Encoding UTF8

Notes
- Entropic’s repair command will also backfill missing `metadata.json` inside `~/.codex/projects/<flattened>` based on this sidecar.
- Sidecar files are safe to overwrite; Entropic reads the latest value.
- If you cannot provide a hook, Entropic can often infer project paths by scanning JSONL and logs, but the sidecar yields the most reliable results.

