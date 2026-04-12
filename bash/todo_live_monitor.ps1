$ErrorActionPreference = 'Stop'

# Live Todo Monitor - Displays current todos with color coding
# Run this in a separate terminal window for real-time updates

$TodoDataFile = "$env:USERPROFILE\.claude\logs\current_todos.json"

# ANSI escape sequences
$RED           = "`e[0;31m"
$GREEN         = "`e[0;32m"
$BLUE          = "`e[0;34m"
$YELLOW        = "`e[1;33m"
$CYAN          = "`e[0;36m"
$NC            = "`e[0m"
$BOLD          = "`e[1m"
$DIM           = "`e[2m"
$STRIKETHROUGH = "`e[9m"

# Global state
$script:HeaderLines       = 0
$script:TodoSectionStart  = 0
$script:LastTodoCount     = 0
$script:LastUpdateTime    = 0

function Display-Header {
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

    if (-not (Test-Path $TodoDataFile)) {
        Write-Host "${RED}No todo data available yet...${NC}"
        Write-Host "Waiting for TodoWrite events from Claude Code..."
        Write-Host "${DIM}Press Ctrl+C to exit monitor${NC}"
        $script:HeaderLines = 3
        return
    }

    $jsonContent = Get-Content $TodoDataFile -Raw | ConvertFrom-Json
    $sessionId   = if ($jsonContent.session_id) { $jsonContent.session_id } else { 'unknown' }
    $cwd         = if ($jsonContent.cwd)        { $jsonContent.cwd }        else { 'unknown' }
    $cwdName     = Split-Path $cwd -Leaf

    Write-Host "${BOLD}${CYAN}===============================================================${NC}"
    Write-Host "${BOLD}${CYAN}                 CLAUDE CODE TODO MONITOR                    ${NC}"
    Write-Host "${BOLD}${CYAN}===============================================================${NC}"
    Write-Host ""
    $shortId = if ($sessionId.Length -gt 8) { $sessionId.Substring(0,8) + '...' } else { $sessionId }
    Write-Host "${DIM}Session: $shortId | Directory: $cwdName${NC}"
    Write-Host "${DIM}Legend: ${GREEN}${STRIKETHROUGH}Completed${NC} ${DIM}| ${BLUE}${BOLD}Active${NC} ${DIM}| Pending | Press Ctrl+C to exit${NC}"
    Write-Host ""

    $script:HeaderLines      = 7
    $script:TodoSectionStart = $script:HeaderLines + 1
}

function Update-Todos {
    $currentTime = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $timestamp   = Get-Date -Format 'HH:mm:ss'

    if (($currentTime - $script:LastUpdateTime) -lt 1) { return }
    $script:LastUpdateTime = $currentTime

    if (-not (Test-Path $TodoDataFile)) { return }

    $jsonContent = Get-Content $TodoDataFile -Raw | ConvertFrom-Json
    $todos       = $jsonContent.todos
    $todoCount   = if ($todos) { @($todos).Count } else { 0 }

    # Move cursor to todo section start
    [Console]::Write("`e[$($script:TodoSectionStart);1H")

    if ($todoCount -eq 0) {
        # Clear to end of screen
        [Console]::Write("`e[0J")
        Write-Host "${YELLOW}No todos found | Last update: $timestamp${NC}"
        $script:LastTodoCount = 0
        return
    }

    # Clear current line and write header
    [Console]::Write("`e[2K")
    Write-Host "${BOLD}Current Todos ($todoCount) | Updated: $timestamp${NC}"

    $todoLines = @()
    foreach ($todo in $todos) {
        $content = $todo.content
        $status  = $todo.status
        switch ($status) {
            'completed'  { $todoLines += "  ${GREEN}${STRIKETHROUGH}v $content${NC}" }
            { $_ -in 'active','in_progress','working' } {
                              $todoLines += "  ${BLUE}${BOLD}> $content${NC}" }
            default      { $todoLines += "  o $content" }
        }
    }

    foreach ($line in $todoLines) {
        [Console]::Write("`e[2K")
        Write-Host $line
    }

    # Clear extra lines if list shrank
    if ($script:LastTodoCount -gt $todoLines.Count) {
        $linesToClear = $script:LastTodoCount - $todoLines.Count
        for ($i = 0; $i -lt $linesToClear; $i++) {
            [Console]::Write("`e[2K`n")
        }
        if ($linesToClear -gt 0) {
            [Console]::Write("`e[${linesToClear}A")
        }
    }

    $script:LastTodoCount = $todoLines.Count
}

function Start-Monitoring {
    # Clear screen
    [Console]::Write("`e[2J`e[H")
    Display-Header
    Update-Todos

    # PowerShell has no inotifywait/fswatch equivalent built-in; use polling.
    # On Windows, FileSystemWatcher provides event-driven updates.
    $watchDir  = Split-Path $TodoDataFile -Parent
    $watchFile = Split-Path $TodoDataFile -Leaf

    if (Test-Path $watchDir) {
        $watcher                     = [System.IO.FileSystemWatcher]::new($watchDir, $watchFile)
        $watcher.NotifyFilter        = [System.IO.NotifyFilters]::LastWrite
        $watcher.EnableRaisingEvents = $true

        Write-Host "${DIM}Using FileSystemWatcher for efficient change detection${NC}"

        while ($true) {
            # WaitForChanged blocks for up to 3 seconds, then loops to allow Ctrl+C
            $change = $watcher.WaitForChanged([System.IO.WatcherChangeTypes]::Changed, 3000)
            if (-not $change.TimedOut) {
                Update-Todos
            }
        }
    } else {
        # Fallback polling when directory doesn't exist yet
        Write-Host "${YELLOW}Note: Using polling method (directory not found, will retry)${NC}"
        $lastMtime = $null
        while ($true) {
            if (Test-Path $TodoDataFile) {
                $currentMtime = (Get-Item $TodoDataFile).LastWriteTimeUtc
                if ($currentMtime -ne $lastMtime) {
                    Update-Todos
                    $lastMtime = $currentMtime
                }
            }
            Start-Sleep -Seconds 3
        }
    }
}

# Handle Ctrl+C gracefully
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Write-Host ""
    Write-Host "${YELLOW}Todo Monitor stopped${NC}"
}

try {
    Start-Monitoring
} finally {
    Write-Host ""
    Write-Host "${YELLOW}Todo Monitor stopped${NC}"
}
