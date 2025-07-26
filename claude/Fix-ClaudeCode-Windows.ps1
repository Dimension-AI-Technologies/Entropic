<#
.SYNOPSIS
    Fixes Claude Code installation issues on Windows by managing multiple package managers
.DESCRIPTION
    This script detects Claude Code installations across npm, pnpm, chocolatey, and scoop,
    removes duplicates, ensures the latest version is installed via npm, and configures
    auto-updates for seamless maintenance.
    By default runs in DRY mode - use -Live to execute changes.
    Auto-update documentation: https://docs.anthropic.com/en/docs/claude-code/settings
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

# Unified status function with centralized configuration
function Write-Status {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    # Define type mappings for consistency and DRY principle
    $typeConfig = @{
        "Success" = @{ Color = "Green"; Icon = "✓" }
        "Error"   = @{ Color = "Red"; Icon = "✗" }
        "Warning" = @{ Color = "Yellow"; Icon = "⚠" }
        "Info"    = @{ Color = "Cyan"; Icon = "ℹ" }
        "DryRun"  = @{ Color = "Magenta"; Prefix = "[DRY RUN] " }
    }
    
    $config = $typeConfig[$Type]
    if (-not $config) {
        $config = @{ Color = "White"; Icon = " " }
    }
    
    $displayMessage = if ($config.Prefix) { "$($config.Prefix)$Message" } else { $Message }
    $fullMessage = if ($config.Icon) { "$($config.Icon) $displayMessage" } else { $displayMessage }
    
    Write-Host $fullMessage -ForegroundColor $config.Color
}

# Legacy function wrappers for backwards compatibility
function Write-Success { Write-Status $args[0] "Success" }
function Write-Info { Write-Status $args[0] "Info" }
function Write-Warning { Write-Status $args[0] "Warning" }
function Write-Error { Write-Status $args[0] "Error" }
function Write-DryRun { Write-Status $args[0] "DryRun" }

# Helper function for step headers
function Write-StepHeader {
    param(
        [string]$StepNumber,
        [string]$StepTitle,
        [string]$TotalSteps = "6"
    )
    
    Write-Status "[Step $StepNumber/$TotalSteps] $StepTitle" "Info"
}

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
Write-StepHeader "1" "Detecting Claude Code installations"

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
Write-StepHeader "2" "Removing surplus installations (keeping npm)"

$uninstallSuccess = $true

# Helper function for npm operations
function Invoke-NpmOperation {
    param(
        [string]$Operation,
        [string]$Description
    )
    
    if ($Live) {
        try {
            Write-Info $Description
            $result = Invoke-Expression "$Operation 2>&1"
            
            if ($LASTEXITCODE -eq 0) {
                return @{ Success = $true; Output = $result }
            } else {
                throw "$Operation failed with exit code $LASTEXITCODE"
            }
        } catch {
            return @{ Success = $false; Error = $_.ToString() }
        }
    } else {
        Write-DryRun $Description
        Write-DryRun "Command: $Operation"
        return @{ Success = $true; Output = "Simulated success" }
    }
}

# Helper function for package uninstallation
function Uninstall-Package {
    param(
        [string]$PackageManager,
        [string]$Version,
        [string]$Command
    )
    
    if ($Live) {
        Write-Info "Uninstalling $PackageManager version..."
        try {
            $result = Invoke-Expression "$Command 2>&1"
            Write-Success "Removed $PackageManager installation"
            return $true
        } catch {
            Write-Error "Failed to uninstall $PackageManager version: $_"
            return $false
        }
    } else {
        Write-DryRun "Would uninstall $PackageManager version: $Version"
        Write-DryRun "Command: $Command"
        return $true
    }
}

# Define uninstall commands for each package manager
$uninstallCommands = @{
    "pnpm" = "pnpm uninstall -g @anthropic-ai/claude-code"
    "chocolatey" = "choco uninstall claude-code -y"
    "scoop" = "scoop uninstall claude-code"
}

# Uninstall surplus package managers
foreach ($manager in @("pnpm", "chocolatey", "scoop")) {
    if ($installations[$manager]) {
        $success = Uninstall-Package $manager $installations[$manager] $uninstallCommands[$manager]
        if (-not $success) {
            $uninstallSuccess = $false
        }
    }
}

Write-Host ""

# Step 3: Ensure proper npm installation
Write-StepHeader "3" "Ensuring proper npm installation"

# Update Claude Code via npm
$updateResult = Invoke-NpmOperation "npm install -g @anthropic-ai/claude-code@latest" "Installing/updating to latest version via npm..."
$updateSuccess = $updateResult.Success

if ($updateSuccess) {
    Write-Success "Successfully updated Claude Code via npm"
} else {
    Write-Error "Failed to update via npm: $($updateResult.Error)"
}

Write-Host ""

# Step 4: If update failed, perform clean reinstall
if (-not $updateSuccess) {
    Write-StepHeader "4" "Update failed, performing clean reinstall"
    
    # Perform clean reinstall using helper functions
    $uninstallResult = Invoke-NpmOperation "npm uninstall -g @anthropic-ai/claude-code" "Uninstalling npm version..."
    if ($uninstallResult.Success) {
        Write-Success "Uninstalled npm version"
    } else {
        Write-Error "Failed to uninstall: $($uninstallResult.Error)"
    }
    
    $cacheResult = Invoke-NpmOperation "npm cache clean --force" "Cleaning npm cache..."
    if ($cacheResult.Success) {
        Write-Success "Cleaned npm cache"
    } else {
        Write-Warning "Failed to clean cache: $($cacheResult.Error)"
    }
    
    $reinstallResult = Invoke-NpmOperation "npm install -g @anthropic-ai/claude-code@latest" "Reinstalling Claude Code..."
    if ($reinstallResult.Success) {
        Write-Success "Reinstalled Claude Code"
        $updateSuccess = $true
    } else {
        Write-Error "Failed to reinstall: $($reinstallResult.Error)"
        $updateSuccess = $false
    }
} else {
    Write-StepHeader "4" "Skipping reinstall (update was successful)"
}

Write-Host ""

# Step 5: PATH cleanup and verification
Write-StepHeader "5" "PATH cleanup and verification"

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
Write-StepHeader "6" "Final verification and status report"

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
    
    # Configure auto-updates for Windows
    Write-Host ""
    Write-Info "Configuring Claude Code auto-updates for Windows..."
    if ($Live -and $finalVersion -ne "simulated") {
        try {
            # Enable auto-updates for seamless maintenance
            # Documentation: https://docs.anthropic.com/en/docs/claude-code/settings
            $autoUpdateResult = & claude settings set autoUpdate true 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "✅ Auto-updates enabled successfully"
                Write-Info "Claude will automatically update to new versions"
            } else {
                Write-Warning "⚠️ Could not enable auto-updates (command may not be available yet)"
            }
        } catch {
            Write-Warning "⚠️ Auto-update configuration skipped: $($_.Exception.Message)"
        }
        
        Write-Host ""
        Write-Info "📚 Auto-update settings documentation:"
        Write-Info "https://docs.anthropic.com/en/docs/claude-code/settings"
    } elseif (-not $Live) {
        Write-DryRun "Would configure auto-updates (claude settings set autoUpdate true)"
        Write-Info "📚 Auto-update settings: https://docs.anthropic.com/en/docs/claude-code/settings"
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