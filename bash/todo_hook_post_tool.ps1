$ErrorActionPreference = 'Stop'

# PostToolUse hook for TodoWrite tool
# Captures todo data and writes to a JSON file for monitoring

$TodoDataFile = "$env:USERPROFILE\.claude\logs\current_todos.json"
$TodosDir     = "$env:USERPROFILE\.claude\todos"
$Timestamp    = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

# Read the hook input from stdin
$HookInput = [Console]::In.ReadToEnd()

# Parse the JSON to extract todo information and write output file
$parsed = $HookInput | ConvertFrom-Json
$output = [ordered]@{
    timestamp    = $parsed.timestamp
    session_id   = $parsed.session_id
    cwd          = $parsed.cwd
    todos        = $parsed.tool_response.newTodos
    last_updated = $Timestamp
}
$outputDir = Split-Path $TodoDataFile -Parent
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}
$output | ConvertTo-Json -Depth 10 | Set-Content -Path $TodoDataFile -Encoding utf8

# Create a simple flag file to trigger monitors
$flagFile = "$env:USERPROFILE\.claude\todos_updated.flag"
$null = New-Item -ItemType File -Path $flagFile -Force

# Also write a sidecar metadata file for robust session->project mapping
if (-not (Test-Path $TodosDir)) {
    New-Item -ItemType Directory -Path $TodosDir -Force | Out-Null
}

$SessionId = $parsed.session_id
if (-not [string]::IsNullOrEmpty($SessionId)) {
    $MetaFile   = Join-Path $TodosDir "${SessionId}-agent.meta.json"
    $ProjectPath = $parsed.cwd
    if (-not [string]::IsNullOrEmpty($ProjectPath)) {
        [ordered]@{ projectPath = $ProjectPath; timestamp = $Timestamp } |
            ConvertTo-Json | Set-Content -Path $MetaFile -Encoding utf8
    }
}

exit 0
