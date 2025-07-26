<#
.SYNOPSIS
    Fixes Claude Code installation issues on Windows by managing multiple package managers
.DESCRIPTION
    This script detects Claude Code installations across npm and pnpm, removes duplicates,
    and ensures the latest version is installed via npm.
    By default runs in DRY mode - use -Live to execute changes.
.NOTES
    Author: Claude Assistant
    Date: 2025-07-26
    Version: 1.1
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

Write-Info "=== Claude Code Fix Script for Windows ==="
Write-Info "Starting at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

if (-not $Live) {
    Write-Warning "Running in DRY RUN mode - no changes will be made"
    Write-Warning "Use -Live flag to execute changes"
} else {
    Write-Success "Running in LIVE mode - changes will be executed"
}

Write-Host ""

# Step 1: Detect Claude Code installations
Write-Info "[Step 1/8] Detecting Claude Code installations..."

$installations = @{
    npm = $null
    pnpm = $null
    chocolatey = $null
    scoop = $null
    paths = @()
}

# Check npm installation
try {
    $npmList = npm list -g @anthropic-ai/claude-code --json 2>$null | ConvertFrom-Json
    if ($npmList.dependencies.'@anthropic-ai/claude-code') {
        $installations.npm = $npmList.dependencies.'@anthropic-ai/claude-code'.version
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
        Write-Verbose "Found scoop installation: $($installations.scoop)"
    }
} catch {
    Write-Verbose "No scoop installation found"
}

# Find all claude executables in PATH
$claudePaths = where.exe claude 2>$null
if ($claudePaths) {
    $installations.paths = $claudePaths -split "`r?`n" | Where-Object { $_ }
    Write-Verbose "Found claude executables: $($installations.paths -join ', ')"
}

# Display found installations
$foundCount = 0
Write-Info "Found installations:"
if ($installations.npm) { Write-Info "  - npm: v$($installations.npm)"; $foundCount++ }
if ($installations.pnpm) { Write-Info "  - pnpm: v$($installations.pnpm)"; $foundCount++ }
if ($installations.chocolatey) { Write-Info "  - chocolatey: v$($installations.chocolatey)"; $foundCount++ }
if ($installations.scoop) { Write-Info "  - scoop: v$($installations.scoop)"; $foundCount++ }
if ($installations.paths.Count -gt 0) {
    Write-Info "  - Executable paths:"
    $installations.paths | ForEach-Object { Write-Info "    * $_" }
}

if ($foundCount -eq 0 -and $installations.paths.Count -eq 0) {
    Write-Warning "No Claude Code installations found!"
}

Write-Host ""

# Step 2: Uninstall surplus installations (keep npm, remove others)
Write-Info "[Step 2/8] Removing surplus installations (keeping npm)..."

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

# Step 3: Update npm version
Write-Info "[Step 3/8] Updating Claude Code via npm..."

$updateSuccess = $false
if ($Live) {
    try {
        # First try to update if already installed
        if ($installations.npm) {
            Write-Info "Attempting to update existing npm installation..."
            $result = npm update -g @anthropic-ai/claude-code 2>&1
        }
        
        # Install/update to latest
        Write-Info "Installing latest version via npm..."
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
    if ($installations.npm) {
        Write-DryRun "Would update existing npm installation from v$($installations.npm)"
        Write-DryRun "Command: npm update -g @anthropic-ai/claude-code"
    }
    Write-DryRun "Would install latest version via npm"
    Write-DryRun "Command: npm install -g @anthropic-ai/claude-code@latest"
    # Simulate success in dry run
    $updateSuccess = $true
}

Write-Host ""

# Step 4: Check version after update
Write-Info "[Step 4/8] Checking version after update..."

$currentVersion = $null
if ($Live) {
    try {
        $versionOutput = claude --version 2>&1
        if ($versionOutput -match '(\d+\.\d+\.\d+)') {
            $currentVersion = $matches[1]
            Write-Info "Current version: $currentVersion"
        } else {
            Write-Warning "Could not parse version from: $versionOutput"
        }
    } catch {
        Write-Error "Failed to check version: $_"
    }
} else {
    Write-DryRun "Would check version with: claude --version"
    # Simulate finding latest version in dry run
    $currentVersion = "1.0.61"
    Write-DryRun "Simulated version check result: $currentVersion"
}

Write-Host ""

# Step 5: If update failed, uninstall and reinstall
if (-not $updateSuccess -or -not $currentVersion) {
    Write-Warning "[Step 5/8] Update failed, attempting complete reinstall..."
    
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
        Write-DryRun "Would uninstall npm version"
        Write-DryRun "Command: npm uninstall -g @anthropic-ai/claude-code"
        Write-DryRun "Would clean npm cache"
        Write-DryRun "Command: npm cache clean --force"
        Write-DryRun "Would reinstall Claude Code"
        Write-DryRun "Command: npm install -g @anthropic-ai/claude-code@latest"
    }
} else {
    Write-Info "[Step 5/8] Skipping reinstall (update was successful)"
}

Write-Host ""

# Step 6: Check version after reinstall
Write-Info "[Step 6/8] Checking final version..."

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
    Write-DryRun "Would check path with: where.exe claude"
    $finalPath = "C:\Users\mathew.burkitt\AppData\Roaming\npm\claude.cmd"
    Write-DryRun "Simulated path: $finalPath"
}

Write-Host ""

# Step 7: Fix PATH environment variable
Write-Info "[Step 7/8] Checking and fixing PATH order..."

# Get current PATH entries
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$systemPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
$currentPath = $env:PATH

# Find package manager paths
$pathEntries = $currentPath -split ';' | Where-Object { $_ }
$npmPath = $pathEntries | Where-Object { $_ -match '\\npm(?:\\|$)' -and $_ -notmatch 'pnpm' } | Select-Object -First 1
$pnpmPath = $pathEntries | Where-Object { $_ -match '\\pnpm(?:\\|$)' } | Select-Object -First 1
$chocoPath = $pathEntries | Where-Object { $_ -match 'chocolatey' } | Select-Object -First 1
$scoopPath = $pathEntries | Where-Object { $_ -match 'scoop' } | Select-Object -First 1

# Check PATH order
$pathIssues = @()
$npmIndex = if ($npmPath) { [array]::IndexOf($pathEntries, $npmPath) } else { -1 }
$pnpmIndex = if ($pnpmPath) { [array]::IndexOf($pathEntries, $pnpmPath) } else { -1 }

if ($npmIndex -gt -1 -and $pnpmIndex -gt -1 -and $pnpmIndex -lt $npmIndex) {
    $pathIssues += "pnpm path comes before npm path (priority issue)"
}

if ($npmPath -and $userPath -notmatch [regex]::Escape($npmPath)) {
    $pathIssues += "npm path not found in user PATH variable"
}

# Display PATH analysis
Write-Info "Current PATH analysis:"
if ($npmPath) { Write-Info "  - npm path: $npmPath (index: $npmIndex)" }
if ($pnpmPath) { Write-Info "  - pnpm path: $pnpmPath (index: $pnpmIndex)" }
if ($chocoPath) { Write-Info "  - chocolatey path: $chocoPath" }
if ($scoopPath) { Write-Info "  - scoop path: $scoopPath" }

if ($pathIssues.Count -gt 0) {
    Write-Warning "PATH issues found:"
    $pathIssues | ForEach-Object { Write-Warning "  - $_" }
    
    if ($Live) {
        Write-Info "Fixing PATH order..."
        try {
            # Get user PATH entries
            $userPathEntries = $userPath -split ';' | Where-Object { $_ }
            
            # Remove all package manager paths
            $cleanedEntries = $userPathEntries | Where-Object { 
                $_ -notmatch 'npm' -and 
                $_ -notmatch 'pnpm' -and 
                $_ -notmatch 'chocolatey.*claude' -and 
                $_ -notmatch 'scoop.*claude'
            }
            
            # Add npm path first if it exists
            if ($npmPath) {
                $newUserPath = @($npmPath) + $cleanedEntries
            } else {
                # If no npm path exists, use default
                $defaultNpmPath = "$env:APPDATA\npm"
                $newUserPath = @($defaultNpmPath) + $cleanedEntries
            }
            
            # Add other paths after npm
            if ($pnpmPath -and $installations.pnpm) {
                $newUserPath += $pnpmPath
            }
            
            # Join and set new PATH
            $newUserPathString = $newUserPath -join ';'
            [Environment]::SetEnvironmentVariable("PATH", $newUserPathString, "User")
            
            # Update current session
            $env:PATH = $newUserPathString + ';' + $systemPath
            
            Write-Success "Fixed PATH order - npm now has priority"
            Write-Info "New user PATH order:"
            $newUserPath | Select-Object -First 5 | ForEach-Object { Write-Info "  $_" }
            if ($newUserPath.Count -gt 5) { Write-Info "  ... and $($newUserPath.Count - 5) more entries" }
        } catch {
            Write-Error "Failed to fix PATH: $_"
        }
    } else {
        Write-DryRun "Would fix PATH order by:"
        Write-DryRun "  1. Removing all package manager paths from user PATH"
        Write-DryRun "  2. Adding npm path first: $(if ($npmPath) { $npmPath } else { "$env:APPDATA\npm" })"
        Write-DryRun "  3. Adding other package manager paths after npm"
        Write-DryRun "  4. Updating environment variable for future sessions"
    }
} else {
    Write-Success "PATH order is correct - npm has priority"
}

Write-Host ""

# Step 8: Report final status
Write-Info "[Step 8/8] Final Status Report"
Write-Info "================================"

if ($finalVersion) {
    Write-Success "Claude Code is installed and working"
    Write-Success "Version: $finalVersion"
    if ($finalPath) {
        Write-Success "Location: $finalPath"
    }
    
    # Check for latest version
    Write-Info ""
    Write-Info "Checking for updates..."
    if ($Live) {
        try {
            $npmView = npm view @anthropic-ai/claude-code version 2>$null
            if ($npmView) {
                Write-Info "Latest available version: $npmView"
                if ($npmView -eq $finalVersion) {
                    Write-Success "You have the latest version!"
                } else {
                    Write-Warning "Update available: $npmView"
                }
            }
        } catch {
            Write-Verbose "Could not check latest version"
        }
    } else {
        Write-DryRun "Would check latest version with: npm view @anthropic-ai/claude-code version"
        $npmView = "1.0.61"
        Write-DryRun "Simulated latest version: $npmView"
        if ($npmView -eq $finalVersion) {
            Write-Success "You would have the latest version!"
        } else {
            Write-Warning "Update would be available: $npmView"
        }
    }
} else {
    Write-Error "Claude Code installation failed"
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