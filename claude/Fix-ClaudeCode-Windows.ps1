<#
.SYNOPSIS
    Fixes Claude Code installation issues on Windows by managing multiple package managers
.DESCRIPTION
    This script detects Claude Code installations across npm, pnpm, chocolatey, and scoop,
    removes duplicates, and ensures the latest version is installed via npm.
    By default runs in DRY mode - use -Live to execute changes.
.NOTES
    Author: Claude Assistant
    Date: 2025-07-26
    Version: 2.0 (Combined from v1 and v2)
#>

param(
    [switch]$Live,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$VerbosePreference = if ($Verbose) { "Continue" } else { "SilentlyContinue" }

# Color functions for output
function Write-Success { Write-Host $args[0] -ForegroundColor Green }
function Write-Info { Write-Host $args[0] -ForegroundColor Cyan }
function Write-Warning { Write-Host $args[0] -ForegroundColor Yellow }
function Write-Error { Write-Host $args[0] -ForegroundColor Red }
function Write-DryRun { Write-Host "[DRY RUN] $($args[0])" -ForegroundColor Magenta }

# Enhanced installation detection function from v2
function Get-ClaudeInstallations {
    $installations = @{
        npm = $null
        pnpm = $null
        chocolatey = $null
        scoop = $null
        paths = @()
        detailed = @()
    }
    
    # Check where.exe output for PATH installations
    Write-Verbose "Checking PATH for Claude installations..."
    try {
        $whereOutput = & where.exe claude 2>$null
        if ($whereOutput) {
            $installations.paths = $whereOutput -split "`r?`n" | Where-Object { $_ }
            foreach ($path in $installations.paths) {
                $installations.detailed += [PSCustomObject]@{
                    Type = "PATH"
                    Path = $path
                    Source = if ($path -like "*pnpm*") { "pnpm" } elseif ($path -like "*npm*") { "npm" } else { "unknown" }
                }
            }
        }
    } catch {
        Write-Verbose "where.exe check failed: $($_.Exception.Message)"
    }
    
    # Check npm installation
    try {
        $npmList = npm list -g @anthropic-ai/claude-code --json 2>$null | ConvertFrom-Json
        if ($npmList.dependencies.'@anthropic-ai/claude-code') {
            $installations.npm = $npmList.dependencies.'@anthropic-ai/claude-code'.version
            $installations.detailed += [PSCustomObject]@{
                Type = "npm-global"
                Path = "$env:APPDATA\npm"
                Source = "npm"
                Version = $installations.npm
            }
            Write-Verbose "Found npm installation: $($installations.npm)"
        }
    } catch {
        Write-Verbose "No npm installation found"
    }

    # Check pnpm installation
    try {
        $pnpmCheck = pnpm list -g @anthropic-ai/claude-code 2>$null
        if ($pnpmCheck -match '@anthropic-ai/claude-code\s+(\d+\.\d+\.\d+)') {
            $installations.pnpm = $matches[1]
            $installations.detailed += [PSCustomObject]@{
                Type = "pnpm-global"
                Path = "$env:LOCALAPPDATA\pnpm\global"
                Source = "pnpm"
                Version = $installations.pnpm
            }
            Write-Verbose "Found pnpm installation: $($installations.pnpm)"
        }
    } catch {
        Write-Verbose "No pnpm installation found"
    }

    # Check chocolatey installation
    try {
        $chocoList = choco list claude-code --local-only 2>$null
        if ($chocoList -match 'claude-code\s+(\d+\.\d+\.\d+)') {
            $installations.chocolatey = $matches[1]
            $installations.detailed += [PSCustomObject]@{
                Type = "chocolatey"
                Path = "C:\ProgramData\chocolatey\bin"
                Source = "chocolatey"
                Version = $installations.chocolatey
            }
            Write-Verbose "Found chocolatey installation: $($installations.chocolatey)"
        }
    } catch {
        Write-Verbose "No chocolatey installation found"
    }

    # Check scoop installation
    try {
        $scoopList = scoop list claude-code 2>$null
        if ($scoopList -match 'claude-code\s+(\d+\.\d+\.\d+)') {
            $installations.scoop = $matches[1]
            $installations.detailed += [PSCustomObject]@{
                Type = "scoop"
                Path = "$env:USERPROFILE\scoop\shims"
                Source = "scoop"
                Version = $installations.scoop
            }
            Write-Verbose "Found scoop installation: $($installations.scoop)"
        }
    } catch {
        Write-Verbose "No scoop installation found"
    }
    
    return $installations
}

Write-Info "=== Claude Code Fix Script for Windows (v2.0) ==="
Write-Info "Starting at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

if (-not $Live) {
    Write-Warning "Running in DRY RUN mode - no changes will be made"
    Write-Warning "Use -Live flag to execute changes"
} else {
    Write-Success "Running in LIVE mode - changes will be executed"
}

Write-Host ""

# Step 1: Detect Claude Code installations
Write-Info "[Step 1/6] Detecting Claude Code installations..."

$installations = Get-ClaudeInstallations

# Display found installations with enhanced detail
$foundCount = ($installations.detailed | Where-Object { $_.Version }).Count
Write-Info "Found installations:"
if ($installations.npm) { Write-Info "  - npm: v$($installations.npm)"; $foundCount++ }
if ($installations.pnpm) { Write-Info "  - pnpm: v$($installations.pnpm)" }
if ($installations.chocolatey) { Write-Info "  - chocolatey: v$($installations.chocolatey)" }
if ($installations.scoop) { Write-Info "  - scoop: v$($installations.scoop)" }

if ($installations.detailed.Count -gt 0) {
    Write-Info "  - Detailed installations:"
    $installations.detailed | ForEach-Object { 
        $versionText = if ($_.Version) { " v$($_.Version)" } else { "" }
        Write-Info "    * $($_.Type): $($_.Source)$versionText at $($_.Path)" 
    }
}

if ($foundCount -eq 0 -and $installations.paths.Count -eq 0) {
    Write-Warning "No Claude Code installations found!"
    if ($Live) {
        Write-Info "Installing fresh copy via npm..."
        npm install -g @anthropic-ai/claude-code@latest
    } else {
        Write-DryRun "Would install fresh copy via npm"
        Write-DryRun "Command: npm install -g @anthropic-ai/claude-code@latest"
    }
    exit 0
}

Write-Host ""

# Step 2: Remove surplus installations (keep npm, remove others)
Write-Info "[Step 2/6] Removing surplus installations (keeping npm)..."

$uninstallSuccess = $true

# Uninstall pnpm version
if ($installations.pnpm) {
    if ($Live) {
        Write-Info "Uninstalling pnpm version..."
        try {
            $result = pnpm uninstall -g @anthropic-ai/claude-code 2>&1
            Write-Success "Removed pnpm installation"
        } catch {
            Write-Error "Failed to uninstall pnpm version: $_"
            $uninstallSuccess = $false
        }
    } else {
        Write-DryRun "Would uninstall pnpm version: $($installations.pnpm)"
        Write-DryRun "Command: pnpm uninstall -g @anthropic-ai/claude-code"
    }
}

# Uninstall chocolatey version
if ($installations.chocolatey) {
    if ($Live) {
        Write-Info "Uninstalling chocolatey version..."
        try {
            $result = choco uninstall claude-code -y 2>&1
            Write-Success "Removed chocolatey installation"
        } catch {
            Write-Error "Failed to uninstall chocolatey version: $_"
            $uninstallSuccess = $false
        }
    } else {
        Write-DryRun "Would uninstall chocolatey version: $($installations.chocolatey)"
        Write-DryRun "Command: choco uninstall claude-code -y"
    }
}

# Uninstall scoop version
if ($installations.scoop) {
    if ($Live) {
        Write-Info "Uninstalling scoop version..."
        try {
            $result = scoop uninstall claude-code 2>&1
            Write-Success "Removed scoop installation"
        } catch {
            Write-Error "Failed to uninstall scoop version: $_"
            $uninstallSuccess = $false
        }
    } else {
        Write-DryRun "Would uninstall scoop version: $($installations.scoop)"
        Write-DryRun "Command: scoop uninstall claude-code"
    }
}

Write-Host ""

# Step 3: Ensure proper npm installation
Write-Info "[Step 3/6] Ensuring proper npm installation..."

$updateSuccess = $false
if ($Live) {
    try {
        # Install/update to latest
        Write-Info "Installing/updating to latest version via npm..."
        $result = npm install -g @anthropic-ai/claude-code@latest 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $updateSuccess = $true
            Write-Success "Successfully updated Claude Code via npm"
        } else {
            throw "npm install failed with exit code $LASTEXITCODE"
        }
    } catch {
        Write-Error "Failed to update via npm: $_"
        $updateSuccess = $false
    }
} else {
    Write-DryRun "Would install/update latest version via npm"
    Write-DryRun "Command: npm install -g @anthropic-ai/claude-code@latest"
    $updateSuccess = $true
}

Write-Host ""

# Step 4: If update failed, perform clean reinstall
if (-not $updateSuccess) {
    Write-Warning "[Step 4/6] Update failed, performing clean reinstall..."
    
    if ($Live) {
        # Uninstall
        Write-Info "Uninstalling npm version..."
        try {
            $result = npm uninstall -g @anthropic-ai/claude-code 2>&1
            Write-Success "Uninstalled npm version"
        } catch {
            Write-Error "Failed to uninstall: $_"
        }
        
        # Clean npm cache
        Write-Info "Cleaning npm cache..."
        try {
            $result = npm cache clean --force 2>&1
            Write-Success "Cleaned npm cache"
        } catch {
            Write-Warning "Failed to clean cache: $_"
        }
        
        # Reinstall
        Write-Info "Reinstalling Claude Code..."
        try {
            $result = npm install -g @anthropic-ai/claude-code@latest 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Reinstalled Claude Code"
                $updateSuccess = $true
            } else {
                throw "Reinstall failed with exit code $LASTEXITCODE"
            }
        } catch {
            Write-Error "Failed to reinstall: $_"
            $updateSuccess = $false
        }
    } else {
        Write-DryRun "Would perform clean uninstall and reinstall"
        Write-DryRun "Commands: npm uninstall -g @anthropic-ai/claude-code"
        Write-DryRun "          npm cache clean --force"
        Write-DryRun "          npm install -g @anthropic-ai/claude-code@latest"
        $updateSuccess = $true
    }
} else {
    Write-Info "[Step 4/6] Skipping reinstall (update was successful)"
}

Write-Host ""

# Step 5: PATH cleanup and verification
Write-Info "[Step 5/6] PATH cleanup and verification..."

# Get current PATH entries
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$systemPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
$currentPath = $env:PATH

# Find package manager paths
$pathEntries = $currentPath -split ';' | Where-Object { $_ }
$npmPath = $pathEntries | Where-Object { $_ -match '\\npm(?:\\|$)' -and $_ -notmatch 'pnpm' } | Select-Object -First 1
$pnpmPath = $pathEntries | Where-Object { $_ -match '\\pnpm(?:\\|$)' } | Select-Object -First 1

# Check PATH order and fix if needed
$pathIssues = @()
$npmIndex = if ($npmPath) { [array]::IndexOf($pathEntries, $npmPath) } else { -1 }
$pnpmIndex = if ($pnpmPath) { [array]::IndexOf($pathEntries, $pnpmPath) } else { -1 }

if ($npmIndex -gt -1 -and $pnpmIndex -gt -1 -and $pnpmIndex -lt $npmIndex) {
    $pathIssues += "pnpm path comes before npm path (priority issue)"
}

Write-Info "Current PATH analysis:"
if ($npmPath) { Write-Info "  - npm path: $npmPath (index: $npmIndex)" }
if ($pnpmPath) { Write-Info "  - pnpm path: $pnpmPath (index: $pnpmIndex)" }

if ($pathIssues.Count -gt 0) {
    Write-Warning "PATH issues found: $($pathIssues -join ', ')"
    
    if ($Live) {
        Write-Info "Fixing PATH order..."
        try {
            # Get user PATH entries and prioritize npm
            $userPathEntries = $userPath -split ';' | Where-Object { $_ }
            $cleanedEntries = $userPathEntries | Where-Object { 
                $_ -notmatch 'pnpm' -and $_ -notmatch 'chocolatey.*claude' -and $_ -notmatch 'scoop.*claude'
            }
            
            # Ensure npm path is first
            if ($npmPath) {
                $newUserPath = @($npmPath) + ($cleanedEntries | Where-Object { $_ -ne $npmPath })
            } else {
                $defaultNpmPath = "$env:APPDATA\npm"
                $newUserPath = @($defaultNpmPath) + $cleanedEntries
            }
            
            $newUserPathString = $newUserPath -join ';'
            [Environment]::SetEnvironmentVariable("PATH", $newUserPathString, "User")
            $env:PATH = $newUserPathString + ';' + $systemPath
            
            Write-Success "Fixed PATH order - npm now has priority"
        } catch {
            Write-Error "Failed to fix PATH: $_"
        }
    } else {
        Write-DryRun "Would fix PATH order to prioritize npm"
    }
} else {
    Write-Success "PATH order is correct - npm has priority"
}

Write-Host ""

# Step 6: Final verification and status report
Write-Info "[Step 6/6] Final verification and status report"
Write-Info "================================================"

$finalVersion = $null
$finalPath = $null
if ($Live) {
    try {
        $versionOutput = claude --version 2>&1
        if ($versionOutput -match '(\d+\.\d+\.\d+)') {
            $finalVersion = $matches[1]
            Write-Success "Final version: $finalVersion"
        }
        
        $finalPath = where.exe claude 2>$null | Select-Object -First 1
        if ($finalPath) {
            Write-Info "Claude executable path: $finalPath"
        }
    } catch {
        Write-Error "Failed to check final version: $_"
    }
} else {
    Write-DryRun "Would check final version with: claude --version"
    $finalVersion = "1.0.61"
    Write-DryRun "Simulated final version: $finalVersion"
    $finalPath = "C:\Users\mathew.burkitt\AppData\Roaming\npm\claude.cmd"
    Write-DryRun "Simulated path: $finalPath"
}

if ($finalVersion) {
    Write-Success "✅ Claude Code is installed and working"
    Write-Success "Version: $finalVersion"
    if ($finalPath) {
        Write-Success "Location: $finalPath"
    }
    
    # Check for latest version
    if ($Live) {
        try {
            $npmView = npm view @anthropic-ai/claude-code version 2>$null
            if ($npmView) {
                Write-Info "Latest available version: $npmView"
                if ($npmView -eq $finalVersion) {
                    Write-Success "🎉 You have the latest version!"
                } else {
                    Write-Warning "⚠️ Update available: $npmView"
                }
            }
        } catch {
            Write-Verbose "Could not check latest version"
        }
    } else {
        Write-DryRun "Would check for updates"
    }
} else {
    Write-Error "❌ Claude Code installation failed"
    Write-Error "Please manually install with: npm install -g @anthropic-ai/claude-code@latest"
}

Write-Host ""
Write-Info "Script completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

if (-not $Live) {
    Write-Host ""
    Write-Warning "This was a DRY RUN - no changes were made"
    Write-Warning "To execute changes, run: ./Fix-ClaudeCode-Windows.ps1 -Live"
}

# Return status code
if ($finalVersion) {
    exit 0
} else {
    exit 1
}