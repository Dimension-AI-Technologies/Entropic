# Run-CodeQualityScripts.ps1
# Runs all other PowerShell scripts in this directory alphabetically and outputs their results

$ErrorActionPreference = "Continue"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Heuristic parser to extract metrics from a script's output
function Get-MetricsFromOutput {
    param(
        [Parameter(Mandatory=$true)]
        [object[]]$Output,
        [string]$ScriptName
    )

    $total = $null
    $issues = $null
    $skipped = 0

    # Normalize to strings, one line per entry
    $lines = @()
    foreach ($o in $Output) {
        if ($o -is [System.Management.Automation.ErrorRecord]) {
            $lines += ($o.Exception.Message)
        } else {
            # Split in case objects render with newlines
            $lines += ($o.ToString() -split "`r?`n")
        }
    }

    # Try explicit summary patterns first
    foreach ($line in $lines) {
        if ($null -eq $total) {
            if ($line -match '^\s*Total files scanned:\s*(\d+)\s*$') { $total = [int]$Matches[1]; continue }
            if ($line -match '^\s*Files scanned:\s*(\d+)\s*$') { $total = [int]$Matches[1]; continue }
            if ($line -match 'Found\s*(\d+)\s*TypeScript files to analyze') { $total = [int]$Matches[1]; continue }
        }
        if ($null -eq $issues) {
            if ($line -match '^\s*Files with [^:]+:\s*(\d+)\s*$') { $issues = [int]$Matches[1]; continue }
            if ($line -match '^\s*Total duplicate declarations:\s*(\d+)\s*$') { $issues = [int]$Matches[1]; continue }
            if ($line -match '^\s*CRITICAL ISSUES FOUND!') { $issues = 1; continue }
            if ($line -match '^\s*No (?:duplicate|critical|timeout|issues?) .*found!?\s*$') { $issues = 0; continue }
        }
        # Skipped/unreadable lines
        if ($line -match 'Warning: Could not read file') { $skipped++ }
        if ($line -match '\bSkipped\b|\bexcluded\b') { $skipped++ }
    }

    # Script-specific refinements
    if ($ScriptName -eq 'Find-Timeouts.ps1') {
        # Count only CRITICAL files as issues; warnings are informational
        $criticalFiles = New-Object System.Collections.Generic.HashSet[string]
        foreach ($line in $lines) {
            if ($line -match '^\s*\[CRITICAL\]\s+(.+)$') { $null = $criticalFiles.Add($Matches[1].Trim()) }
            if ($line -match '^\s*Files scanned:\s*(\d+)\s*$') { $total = [int]$Matches[1] }
        }
        $issues = $criticalFiles.Count
        if ($null -eq $total) {
            # Derive from OK/CRITICAL/WARNING tags if needed
            $ok = ($lines | Where-Object { $_ -match '^\s*\[OK\]\s+' }).Count
            $warn = ($lines | Where-Object { $_ -match '^\s*\[WARNING\]\s+' }).Count
            $total = $ok + $warn + $issues
        }
        $skipped = 0
        $clean = [Math]::Max(0, $total - $issues)
        return [PSCustomObject]@{ Total=[int]$total; Issues=[int]$issues; Clean=[int]$clean; Skipped=[int]$skipped }
    }
    if ($ScriptName -eq 'Find-Fakes.ps1') {
        # Treat as informational only; not issues
        foreach ($line in $lines) {
            if ($line -match '^\s*Files scanned:\s*(\d+)\s*$') { $total = [int]$Matches[1] }
        }
        if ($null -eq $total) { $total = 0 }
        return [PSCustomObject]@{ Total=[int]$total; Issues=0; Clean=[int]$total; Skipped=0 }
    }

    if ($ScriptName -eq 'Find-Exceptions.ps1') {
        foreach ($line in $lines) {
            if ($line -match '^\s*Total files scanned:\s*(\d+)\s*$') { $total = [int]$Matches[1] }
            if ($line -match '^\s*Total throw statements:\s*(\d+)\s*$') { $issues = [int]$Matches[1] }
        }
        if ($null -eq $total) { $total = 0 }
        if ($null -eq $issues) { $issues = 0 }
        $clean = [Math]::Max(0, $total - $issues)
        return [PSCustomObject]@{ Total=[int]$total; Issues=[int]$issues; Clean=[int]$clean; Skipped=0 }
    }

    if ($ScriptName -eq 'Find-PSEmojisAndUnicode.ps1') {
        foreach ($line in $lines) {
            if ($line -match '^\s*Total files scanned:\s*(\d+)\s*$') { $total = [int]$Matches[1] }
            if ($line -match '^\s*Files with Unicode:\s*(\d+)\s*$') { $issues = [int]$Matches[1] }
        }
        if ($null -eq $total) { $total = 0 }
        if ($null -eq $issues) { $issues = 0 }
        $clean = [Math]::Max(0, $total - $issues)
        return [PSCustomObject]@{ Total=[int]$total; Issues=[int]$issues; Clean=[int]$clean; Skipped=0 }
    }

    # Fallback to tag-based parsing if still unknown
    if ($null -eq $issues -or $null -eq $total) {
        $issuePaths = New-Object System.Collections.Generic.HashSet[string]
        $okPaths = New-Object System.Collections.Generic.HashSet[string]
        foreach ($line in $lines) {
            # [CRITICAL] path or [WARNING] path or [OK] path
            if ($line -match '^\s*\[(CRITICAL|WARNING)\]\s+(.+)$') {
                $null = $issuePaths.Add($Matches[2].Trim())
            } elseif ($line -match '^\s*\[OK\]\s+(.+)$') {
                $null = $okPaths.Add($Matches[1].Trim())
            }
            if ($line -match '^\s*Files with [^:]+:\s*(\d+)\s*$' -and $null -eq $issues) {
                $issues = [int]$Matches[1]
            }
            if ($line -match '^\s*Files scanned:\s*(\d+)\s*$' -and $null -eq $total) {
                $total = [int]$Matches[1]
            }
        }
        if ($null -eq $issues -and $issuePaths.Count -gt 0) { $issues = $issuePaths.Count }
        if ($null -eq $total -and ($okPaths.Count -gt 0 -or $issuePaths.Count -gt 0)) { $total = $okPaths.Count + $issuePaths.Count }
    }

    if ($null -eq $total) { $total = 0 }
    if ($null -eq $issues) { $issues = 0 }

    $clean = [Math]::Max(0, $total - $issues - $skipped)

    [PSCustomObject]@{
        Total = [int]$total
        Issues = [int]$issues
        Clean = [int]$clean
        Skipped = [int]$skipped
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     CODE QUALITY CHECK SUITE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get all .ps1 files except this one, sorted alphabetically
$scripts = Get-ChildItem -Path $scriptDir -Filter "*.ps1" | 
    Where-Object { $_.Name -ne "Run-CodeQualityScripts.ps1" } | 
    Sort-Object Name

if ($scripts.Count -eq 0) {
    Write-Host "No code quality scripts found in $scriptDir" -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($scripts.Count) code quality scripts to run:" -ForegroundColor Green
$scripts | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }
Write-Host ""

$totalStartTime = Get-Date
$results = @()
$logRoot = Join-Path $scriptDir "_logs"
if (-not (Test-Path $logRoot)) { New-Item -ItemType Directory -Path $logRoot | Out-Null }

foreach ($script in $scripts) {
    $scriptName = $script.BaseName
    $startTime = Get-Date
    
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host "Running: $($script.Name)" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host ""
    
    try {
        # Capture host output using transcript
        $timestamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
        $logFile = Join-Path $logRoot ("{0}-{1}.log" -f $script.BaseName, $timestamp)
        try { Stop-Transcript | Out-Null } catch {}
        Start-Transcript -Path $logFile -IncludeInvocationHeader:$false -Force | Out-Null
        # Execute the script (its Write-Host output goes to transcript)
        $null = & $script.FullName 2>&1
        Stop-Transcript | Out-Null

        # Load transcript content for metrics
        $output = @(Get-Content -Path $logFile)

        $duration = (Get-Date) - $startTime
        if ($output -and $output.Count -gt 0) {
            $metrics = Get-MetricsFromOutput -Output $output -ScriptName $script.Name
        } else {
            $metrics = [PSCustomObject]@{ Total = 0; Issues = 0; Clean = 0; Skipped = 0 }
        }
        $results += [PSCustomObject]@{
            Script = $script.Name
            Status = "Success"
            Duration = $duration.TotalSeconds
            FilesWithIssues = $metrics.Issues
            FilesClean = $metrics.Clean
            FilesSkipped = $metrics.Skipped
        }
        
        Write-Host ""
        Write-Host "OK Completed in $([math]::Round($duration.TotalSeconds, 2)) seconds" -ForegroundColor Green
    }
    catch {
        $duration = (Get-Date) - $startTime
        Write-Host "ERROR running $($script.Name): $_" -ForegroundColor Red
        $results += [PSCustomObject]@{
            Script = $script.Name
            Status = "Failed"
            Duration = $duration.TotalSeconds
            FilesWithIssues = 0
            FilesClean = 0
            FilesSkipped = 0
        }
    }
    
    Write-Host ""
}

$totalDuration = (Get-Date) - $totalStartTime

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "         SUMMARY REPORT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Script Results:" -ForegroundColor Yellow
$results | Format-Table -Property Script, Status, @{Label="Duration (s)"; Expression={[math]::Round($_.Duration, 2)}}, @{Label="Files (issues)"; Expression={$_.FilesWithIssues}}, @{Label="Files (clean)"; Expression={$_.FilesClean}}, @{Label="Files (skipped)"; Expression={$_.FilesSkipped}} -AutoSize

$successCount = ($results | Where-Object { $_.Status -eq "Success" }).Count
$failCount = ($results | Where-Object { $_.Status -eq "Failed" }).Count

Write-Host ""
Write-Host "Total Scripts Run: $($results.Count)" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
if ($failCount -gt 0) {
    Write-Host "Failed: $failCount" -ForegroundColor Red
}

Write-Host ""
Write-Host "Total Execution Time: $([math]::Round($totalDuration.TotalSeconds, 2)) seconds" -ForegroundColor Cyan
Write-Host ""

if ($failCount -gt 0) {
    Write-Host "WARNING: Some scripts failed. Review the output above for details." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "All code quality checks completed successfully!" -ForegroundColor Green
    exit 0
}
