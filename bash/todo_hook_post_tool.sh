#!/bin/bash

# PostToolUse hook for TodoWrite tool
# Captures todo data and writes to a JSON file for monitoring

TODO_DATA_FILE="$HOME/.claude/logs/current_todos.json"
TODOS_DIR="$HOME/.claude/todos"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Read the hook input from stdin
HOOK_INPUT=$(cat)

# Parse the JSON to extract todo information
echo "$HOOK_INPUT" | jq '{
    timestamp: .timestamp,
    session_id: .session_id,
    cwd: .cwd,
    todos: .tool_response.newTodos,
    last_updated: "'"$TIMESTAMP"'"
}' > "$TODO_DATA_FILE"

# Create a simple flag file to trigger monitors
touch "$HOME/.claude/todos_updated.flag"

# Also write a sidecar metadata file for robust session→project mapping
mkdir -p "$TODOS_DIR" 2>/dev/null
SESSION_ID=$(echo "$HOOK_INPUT" | jq -r '.session_id // empty')
if [ -n "$SESSION_ID" ]; then
  META_FILE="$TODOS_DIR/${SESSION_ID}-agent.meta.json"
  PROJECT_PATH=$(echo "$HOOK_INPUT" | jq -r '.cwd // empty')
  if [ -n "$PROJECT_PATH" ]; then
    printf '{"projectPath":"%s","timestamp":"%s"}\n' "$PROJECT_PATH" "$TIMESTAMP" > "$META_FILE"
  fi
fi

# Exit successfully
exit 0
