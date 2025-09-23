#!/bin/bash

# Create test data in the actual directories
echo "Creating test data..."

# Claude test data
mkdir -p ~/.claude/projects/TEST-claude-project
mkdir -p ~/.claude/todos
echo '{"sessionId":"test-claude-1","provider":"claude","todos":[{"content":"TEST: Claude task","status":"pending"}],"updatedAt":'$(date +%s000)'}' > ~/.claude/todos/test-claude-session.jsonl

# Codex test data
mkdir -p ~/.codex/projects/TEST-codex-project  
mkdir -p ~/.codex/todos
echo '{"sessionId":"test-codex-1","provider":"codex","todos":[{"content":"TEST: Codex task","status":"pending"}],"updatedAt":'$(date +%s000)'}' > ~/.codex/todos/test-codex-session.jsonl

# Gemini test data
mkdir -p ~/.gemini/sessions
echo '{"sessionId":"test-gemini-1","provider":"gemini","todos":[{"content":"TEST: Gemini task","status":"pending"}],"updatedAt":'$(date +%s000)'}' > ~/.gemini/sessions/test-gemini-session.jsonl

echo "Test data created. Starting app..."
echo ""
echo "MANUAL TEST STEPS:"
echo "1. App should show TEST projects from all 3 providers"
echo "2. Click provider toggles in title bar to filter"
echo "3. Verify projects appear/disappear correctly"
echo ""

# Start the app in background
npm start &
APP_PID=$!

echo "App started with PID $APP_PID"
echo "Test for 30 seconds then auto-cleanup..."

# Wait for testing
sleep 30

# Kill the app
kill $APP_PID 2>/dev/null

# Cleanup test data
echo "Cleaning up test data..."
rm -rf ~/.claude/projects/TEST-claude-project
rm -f ~/.claude/todos/test-claude-session.jsonl
rm -rf ~/.codex/projects/TEST-codex-project
rm -f ~/.codex/todos/test-codex-session.jsonl
rm -f ~/.gemini/sessions/test-gemini-session.jsonl

echo "Test complete and cleaned up!"
