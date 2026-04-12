$ErrorActionPreference = 'Stop'

# Create test data in the actual directories
Write-Host "Creating test data..."

$epochMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

# Claude test data
New-Item -ItemType Directory -Path "$env:USERPROFILE\.claude\projects\TEST-claude-project" -Force | Out-Null
New-Item -ItemType Directory -Path "$env:USERPROFILE\.claude\todos" -Force | Out-Null
"{`"sessionId`":`"test-claude-1`",`"provider`":`"claude`",`"todos`":[{`"content`":`"TEST: Claude task`",`"status`":`"pending`"}],`"updatedAt`":$epochMs}" |
    Set-Content -Path "$env:USERPROFILE\.claude\todos\test-claude-session.jsonl" -Encoding utf8

# Codex test data
New-Item -ItemType Directory -Path "$env:USERPROFILE\.codex\projects\TEST-codex-project" -Force | Out-Null
New-Item -ItemType Directory -Path "$env:USERPROFILE\.codex\todos" -Force | Out-Null
"{`"sessionId`":`"test-codex-1`",`"provider`":`"codex`",`"todos`":[{`"content`":`"TEST: Codex task`",`"status`":`"pending`"}],`"updatedAt`":$epochMs}" |
    Set-Content -Path "$env:USERPROFILE\.codex\todos\test-codex-session.jsonl" -Encoding utf8

# Gemini test data
New-Item -ItemType Directory -Path "$env:USERPROFILE\.gemini\sessions" -Force | Out-Null
"{`"sessionId`":`"test-gemini-1`",`"provider`":`"gemini`",`"todos`":[{`"content`":`"TEST: Gemini task`",`"status`":`"pending`"}],`"updatedAt`":$epochMs}" |
    Set-Content -Path "$env:USERPROFILE\.gemini\sessions\test-gemini-session.jsonl" -Encoding utf8

Write-Host "Test data created. Starting app..."
Write-Host ""
Write-Host "MANUAL TEST STEPS:"
Write-Host "1. App should show TEST projects from all 3 providers"
Write-Host "2. Click provider toggles in title bar to filter"
Write-Host "3. Verify projects appear/disappear correctly"
Write-Host ""

# Start the app in background
$appProcess = Start-Process -FilePath "npm" -ArgumentList "start" -PassThru -NoNewWindow

Write-Host "App started with PID $($appProcess.Id)"
Write-Host "Test for 30 seconds then auto-cleanup..."

# Wait for testing
Start-Sleep -Seconds 30

# Kill the app
if (-not $appProcess.HasExited) {
    Stop-Process -Id $appProcess.Id -Force -ErrorAction SilentlyContinue
}

# Cleanup test data
Write-Host "Cleaning up test data..."
Remove-Item -Recurse -Force "$env:USERPROFILE\.claude\projects\TEST-claude-project"  -ErrorAction SilentlyContinue
Remove-Item -Force         "$env:USERPROFILE\.claude\todos\test-claude-session.jsonl" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.codex\projects\TEST-codex-project"    -ErrorAction SilentlyContinue
Remove-Item -Force         "$env:USERPROFILE\.codex\todos\test-codex-session.jsonl"  -ErrorAction SilentlyContinue
Remove-Item -Force         "$env:USERPROFILE\.gemini\sessions\test-gemini-session.jsonl" -ErrorAction SilentlyContinue

Write-Host "Test complete and cleaned up!"
