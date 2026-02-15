#Requires -Version 7.0

<#
.SYNOPSIS
    [DEPRECATED] Use Fix-ClaudeCode-Universal.ps1 or Fix-ClaudeCode-Universal-Spectre.ps1 instead
.DESCRIPTION
    This script is deprecated. Please use the Universal versions which support all platforms including Windows.
    - Fix-ClaudeCode-Universal.ps1 - Standard version
    - Fix-ClaudeCode-Universal-Spectre.ps1 - Enhanced UI version
    
    Original description:
    Fixes Claude Code installation issues on Windows by managing multiple package managers
.DESCRIPTION
    This script detects Claude Code installations across npm, pnpm, chocolatey, and scoop,
    removes duplicates, ensures the latest version is installed via npm, and configures
    auto-updates for seamless maintenance.
    By default runs in DRY mode - use -Live to execute changes.
    Auto-update documentation: https://docs.anthropic.com/en/docs/claude-code/settings
.NOTES
    Author: Claude Assistant
    Date: 2025-07-31
    Version: 3.0 (Data-driven configuration approach)
#>

param(
    [switch]$Live,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$VerbosePreference = if ($Verbose) { "Continue" } else { "SilentlyContinue" }

# Data-driven configuration for package managers and installation paths
$script:PackageManagerConfigs = @{
    npm = @{
        Name = "npm"
        Priority = 1  # Highest priority - preferred manager
        CheckCommand = { npm list -g @anthropic-ai/claude-code --json 2>$null | ConvertFrom-Json }
        GetVersion = { param($result) $result.dependencies.'@anthropic-ai/claude-code'.version }
        InstallPath = "$env:APPDATA\npm"
        UninstallCommand = "npm uninstall -g @anthropic-ai/claude-code"
        InstallCommand = "npm install -g @anthropic-ai/claude-code@latest"
        CacheCleanCommand = "npm cache clean --force"
        ExecutablePaths = @(
            "$env:APPDATA\npm\claude.cmd",
            "$env:APPDATA\npm\claude"
        )
    }
    pnpm = @{
        Name = "pnpm"
        Priority = 2
        CheckCommand = { pnpm list -g @anthropic-ai/claude-code 2>$null }
        GetVersion = { param($result) if ($result -match '@anthropic-ai/claude-code\s+(\d+\.\d+\.\d+)') { $matches[1] } }
        InstallPath = "$env:LOCALAPPDATA\pnpm\global"
        UninstallCommand = "pnpm uninstall -g @anthropic-ai/claude-code"
        InstallCommand = "pnpm add -g @anthropic-ai/claude-code@latest"
        ExecutablePaths = @(
            "$env:LOCALAPPDATA\pnpm\claude.cmd",
            "$env:LOCALAPPDATA\pnpm\claude"
        )
    }
    chocolatey = @{
        Name = "chocolatey"
        Priority = 3
        CheckCommand = { choco list claude-code --local-only 2>$null }
        GetVersion = { param($result) if ($result -match 'claude-code\s+(\d+\.\d+\.\d+)') { $matches[1] } }
        InstallPath = "C:\ProgramData\chocolatey\bin"
        UninstallCommand = "choco uninstall claude-code -y"
        InstallCommand = "choco install claude-code -y"
        ExecutablePaths = @(
            "C:\ProgramData\chocolatey\bin\claude.exe"
        )
    }
    scoop = @{
        Name = "scoop"
        Priority = 4
        CheckCommand = { scoop list claude-code 2>$null }
        GetVersion = { param($result) if ($result -match 'claude-code\s+(\d+\.\d+\.\d+)') { $matches[1] } }
        InstallPath = "$env:USERPROFILE\scoop\shims"
        UninstallCommand = "scoop uninstall claude-code"
        InstallCommand = "scoop install claude-code"
        ExecutablePaths = @(
            "$env:USERPROFILE\scoop\shims\claude.exe",
            "$env:USERPROFILE\scoop\shims\claude.cmd"
        )
    }
}

# Additional known installation paths that might interfere
$script:KnownInstallationPaths = @(
    @{
        Path = "$env:USERPROFILE\.local\bin\claude.exe"
        Description = ".local/bin installation"
        Source = "unknown"
    },
    @{
        Path = "$env:ProgramFiles\Claude\claude.exe"
        Description = "Program Files installation"
        Source = "installer"
    },
    @{
        Path = "${env:ProgramFiles(x86)}\Claude\claude.exe"
        Description = "Program Files (x86) installation"
        Source = "installer"
    }
)

# Unified status function with centralized configuration
function Write-Status {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    # Define type mappings for consistency and DRY principle
    $typeConfig = @{
        "Success" = @{ Color = "Green"; Icon = "[OK]" }
        "Error"   = @{ Color = "Red"; Icon = "[X]" }
        "Warning" = @{ Color = "Yellow"; Icon = "[!]" }
        "Info"    = @{ Color = "Cyan"; Icon = "[i]" }
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

# Enhanced installation detection function using data-driven approach
function Get-ClaudeInstallations {
    $installations = @{
        managers = @{}  # Keyed by manager name
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
                # Determine source based on path patterns from configs
                $source = "unknown"
                foreach ($manager in $script:PackageManagerConfigs.GetEnumerator()) {
                    if ($path -like "*$($manager.Key)*") {
                        $source = $manager.Key
                        break
                    }
                }
                
                $installations.detailed += [PSCustomObject]@{
                    Type = "PATH"
                    Path = $path
                    Source = $source
                    Priority = if ($source -ne "unknown") { $script:PackageManagerConfigs[$source].Priority } else { 99 }
                }
            }
        }
    } catch {
        Write-Verbose "where.exe check failed: $($_.Exception.Message)"
    }
    
    # Check each configured package manager
    foreach ($managerName in $script:PackageManagerConfigs.Keys) {
        $config = $script:PackageManagerConfigs[$managerName]
        Write-Verbose "Checking $managerName installation..."
        
        try {
            $result = & $config.CheckCommand
            if ($result) {
                $version = & $config.GetVersion $result
                if ($version) {
                    $installations.managers[$managerName] = $version
                    $installations.detailed += [PSCustomObject]@{
                        Type = "$managerName-global"
                        Path = $config.InstallPath
                        Source = $managerName
                        Version = $version
                        Priority = $config.Priority
                    }
                    Write-Verbose "Found $managerName installation: $version"
                }
            }
        } catch {
            Write-Verbose "No $managerName installation found or check failed: $_"
        }
    }
    
    # Check for additional known installation paths
    foreach ($knownPath in $script:KnownInstallationPaths) {
        if (Test-Path $knownPath.Path) {
            $installations.detailed += [PSCustomObject]@{
                Type = "standalone"
                Path = $knownPath.Path
                Source = $knownPath.Source
                Description = $knownPath.Description
                Priority = 100  # Lowest priority for removal
            }
        }
    }
    
    # Sort detailed installations by priority
    $installations.detailed = $installations.detailed | Sort-Object Priority
    
    return $installations
}

# Legacy wrapper for compatibility
function Get-ClaudeInstallationsLegacy {
    $installations = Get-ClaudeInstallations
    return @{
        npm = $installations.managers.npm
        pnpm = $installations.managers.pnpm
        chocolatey = $installations.managers.chocolatey
        scoop = $installations.managers.scoop
        paths = $installations.paths
        detailed = $installations.detailed
    }
}

# Show deprecation warning
Write-Warning "=== DEPRECATED SCRIPT ==="
Write-Warning "This script is deprecated. Please use one of the following instead:"
Write-Warning "  - Fix-ClaudeCode-Universal.ps1 (standard version)"
Write-Warning "  - Fix-ClaudeCode-Universal-Spectre.ps1 (enhanced UI version)"
Write-Warning ""
Write-Warning "The Universal scripts support Windows, WSL2, Linux, and macOS."
Write-Warning "Press Ctrl+C to cancel or wait 10 seconds to continue anyway..."
Start-Sleep -Seconds 10

Write-Info "=== Claude Code Fix Script for Windows (v3.0 - Data-Driven) ==="
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

# Display manager installations sorted by priority
foreach ($manager in $installations.managers.GetEnumerator() | Sort-Object { $script:PackageManagerConfigs[$_.Key].Priority }) {
    $priority = $script:PackageManagerConfigs[$manager.Key].Priority
    Write-Info "  - $($manager.Key): v$($manager.Value) (priority: $priority)"
}

if ($installations.detailed.Count -gt 0) {
    Write-Info "  - Detailed installations:"
    $installations.detailed | ForEach-Object { 
        $versionText = if ($_.Version) { " v$($_.Version)" } else { "" }
        $descText = if ($_.Description) { " - $($_.Description)" } else { "" }
        Write-Info "    * $($_.Type): $($_.Source)$versionText at $($_.Path)$descText" 
    }
}

if ($foundCount -eq 0 -and $installations.paths.Count -eq 0) {
    Write-Warning "No Claude Code installations found!"
    $preferredManager = $script:PackageManagerConfigs.GetEnumerator() | 
        Sort-Object { $_.Value.Priority } | 
        Select-Object -First 1
    
    if ($Live) {
        Write-Info "Installing fresh copy via $($preferredManager.Key)..."
        Invoke-Expression $preferredManager.Value.InstallCommand
    } else {
        Write-DryRun "Would install fresh copy via $($preferredManager.Key)"
        Write-DryRun "Command: $($preferredManager.Value.InstallCommand)"
    }
    exit 0
}

Write-Host ""

# Step 2: Remove surplus installations (keep highest priority only)
$preferredManager = $script:PackageManagerConfigs.GetEnumerator() | 
    Where-Object { $installations.managers.ContainsKey($_.Key) } |
    Sort-Object { $_.Value.Priority } | 
    Select-Object -First 1

if (-not $preferredManager) {
    # If no package manager installation found, default to npm
    $preferredManager = @{ Key = "npm"; Value = $script:PackageManagerConfigs["npm"] }
}

Write-StepHeader "2" "Removing surplus installations (keeping $($preferredManager.Key))"

# First remove any standalone installations that might interfere
$standaloneInstalls = $installations.detailed | Where-Object { $_.Type -eq "standalone" }
foreach ($standalone in $standaloneInstalls) {
    if (Test-Path $standalone.Path) {
        if ($Live) {
            Write-Info "Removing $($standalone.Description) that may interfere..."
            try {
                Remove-Item $standalone.Path -Force
                Write-Success "Removed $($standalone.Description)"
            } catch {
                Write-Warning "Could not remove $($standalone.Description): $_"
            }
        } else {
            Write-DryRun "Would remove $($standalone.Description): $($standalone.Path)"
        }
    }
}

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

# Uninstall surplus package managers (all except the preferred one)
foreach ($managerEntry in $installations.managers.GetEnumerator()) {
    if ($managerEntry.Key -ne $preferredManager.Key) {
        $config = $script:PackageManagerConfigs[$managerEntry.Key]
        $success = Uninstall-Package $managerEntry.Key $managerEntry.Value $config.UninstallCommand
        if (-not $success) {
            $uninstallSuccess = $false
        }
    }
}

Write-Host ""

# Step 3: Ensure proper installation with preferred package manager
Write-StepHeader "3" "Ensuring proper installation via $($preferredManager.Key)"

# Update Claude Code via preferred package manager
$updateResult = Invoke-NpmOperation $preferredManager.Value.InstallCommand "Installing/updating to latest version via $($preferredManager.Key)..."
$updateSuccess = $updateResult.Success

if ($updateSuccess) {
    Write-Success "Successfully updated Claude Code via $($preferredManager.Key)"
} else {
    Write-Error "Failed to update via $($preferredManager.Key): $($updateResult.Error)"
}

Write-Host ""

# Step 4: Verify the update and force reinstall if needed
Write-StepHeader "4" "Verifying update and ensuring latest version"

# Check if we have the latest version after update
$needsReinstall = $false
if ($Live) {
    try {
        # Get currently installed version
        $currentVersionCheck = claude --version 2>&1
        if ($currentVersionCheck -match '(\d+\.\d+\.\d+)') {
            $currentVersion = $matches[1]
            Write-Info "Current version after update: $currentVersion"
        }
        
        # Get latest available version using preferred package manager
        $latestVersion = if ($preferredManager.Key -eq "npm") {
            npm view @anthropic-ai/claude-code version 2>$null
        } else {
            # For other package managers, try to get version info
            $null  # Will trigger reinstall to be safe
        }
        if ($latestVersion) {
            Write-Info "Latest available version: $latestVersion"
            
            # Compare versions
            if ($currentVersion -ne $latestVersion) {
                Write-Warning "Version mismatch detected - forcing clean reinstall"
                $needsReinstall = $true
            } else {
                Write-Success "Successfully updated to latest version"
            }
        }
    } catch {
        Write-Warning "Could not verify version - forcing reinstall to be safe"
        $needsReinstall = $true
    }
} else {
    Write-DryRun "Would verify version and check if reinstall is needed"
}

# Perform clean reinstall if needed or if initial update failed
if (-not $updateSuccess -or $needsReinstall) {
    Write-Info "Performing clean reinstall to ensure latest version..."
    
    # Perform clean reinstall using preferred package manager
    $uninstallResult = Invoke-NpmOperation $preferredManager.Value.UninstallCommand "Uninstalling $($preferredManager.Key) version..."
    if ($uninstallResult.Success) {
        Write-Success "Uninstalled $($preferredManager.Key) version"
    } else {
        Write-Error "Failed to uninstall: $($uninstallResult.Error)"
    }
    
    # Clean cache if available for this package manager
    if ($preferredManager.Value.CacheCleanCommand) {
        $cacheResult = Invoke-NpmOperation $preferredManager.Value.CacheCleanCommand "Cleaning $($preferredManager.Key) cache..."
        if ($cacheResult.Success) {
            Write-Success "Cleaned $($preferredManager.Key) cache"
        } else {
            Write-Warning "Failed to clean cache: $($cacheResult.Error)"
        }
    }
    
    $reinstallResult = Invoke-NpmOperation $preferredManager.Value.InstallCommand "Reinstalling Claude Code..."
    if ($reinstallResult.Success) {
        Write-Success "Reinstalled Claude Code"
        $updateSuccess = $true
    } else {
        Write-Error "Failed to reinstall: $($reinstallResult.Error)"
        $updateSuccess = $false
    }
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
$managerPaths = @{}

# Find paths for all configured package managers
foreach ($manager in $script:PackageManagerConfigs.GetEnumerator()) {
    $pattern = if ($manager.Key -eq "npm") { '\\npm(?:\\|$)' } else { "\\$($manager.Key)(?:\\|$)" }
    $path = $pathEntries | Where-Object { $_ -match $pattern -and ($manager.Key -eq "npm" -or $_ -notmatch 'npm') } | Select-Object -First 1
    if ($path) {
        $managerPaths[$manager.Key] = @{
            Path = $path
            Index = [array]::IndexOf($pathEntries, $path)
            Priority = $manager.Value.Priority
        }
    }
}

# Check PATH order and fix if needed
$pathIssues = @()
$preferredPath = $managerPaths[$preferredManager.Key]

# Check if any lower priority manager appears before the preferred one
foreach ($mp in $managerPaths.GetEnumerator()) {
    if ($mp.Key -ne $preferredManager.Key -and $mp.Value.Index -ne -1 -and $preferredPath.Index -ne -1) {
        if ($mp.Value.Index -lt $preferredPath.Index -and $mp.Value.Priority -gt $preferredPath.Priority) {
            $pathIssues += "$($mp.Key) path comes before $($preferredManager.Key) path (priority issue)"
        }
    }
}

if ($npmIndex -gt -1 -and $pnpmIndex -gt -1 -and $pnpmIndex -lt $npmIndex) {
    $pathIssues += "pnpm path comes before npm path (priority issue)"
}

Write-Info "Current PATH analysis:"
foreach ($mp in $managerPaths.GetEnumerator() | Sort-Object { $_.Value.Priority }) {
    Write-Info "  - $($mp.Key) path: $($mp.Value.Path) (index: $($mp.Value.Index), priority: $($mp.Value.Priority))"
}

if ($pathIssues.Count -gt 0) {
    Write-Warning "PATH issues found: $($pathIssues -join ', ')"
    
    if ($Live) {
        Write-Info "Fixing PATH order..."
        try {
            # Get user PATH entries and remove all package manager paths except preferred
            $userPathEntries = $userPath -split ';' | Where-Object { $_ }
            $cleanedEntries = $userPathEntries | Where-Object { 
                $keep = $true
                foreach ($manager in $script:PackageManagerConfigs.Keys) {
                    if ($manager -ne $preferredManager.Key -and $_ -match $manager) {
                        $keep = $false
                        break
                    }
                }
                $keep
            }
            
            # Ensure preferred manager path is first
            $preferredInstallPath = $preferredManager.Value.InstallPath
            if ($preferredPath) {
                $newUserPath = @($preferredPath.Path) + ($cleanedEntries | Where-Object { $_ -ne $preferredPath.Path })
            } else {
                $newUserPath = @($preferredInstallPath) + $cleanedEntries
            }
            
            $newUserPathString = $newUserPath -join ';'
            [Environment]::SetEnvironmentVariable("PATH", $newUserPathString, "User")
            $env:PATH = $newUserPathString + ';' + $systemPath
            
            Write-Success "Fixed PATH order - $($preferredManager.Key) now has priority"
        } catch {
            Write-Error "Failed to fix PATH: $_"
        }
    } else {
        Write-DryRun "Would fix PATH order to prioritize $($preferredManager.Key)"
    }
} else {
    Write-Success "PATH order is correct - $($preferredManager.Key) has priority"
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
    Write-Success "Claude Code is installed and working"
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
                    Write-Success "You have the latest version!"
                } else {
                    Write-Warning "Update available: $npmView"
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
                Write-Success "Auto-updates enabled successfully"
                Write-Info "Claude will automatically update to new versions"
            } else {
                Write-Warning "Could not enable auto-updates (command may not be available yet)"
            }
        } catch {
            Write-Warning "Auto-update configuration skipped: $($_.Exception.Message)"
        }
        
        Write-Host ""
        Write-Info "Auto-update settings documentation:"
        Write-Info "https://docs.anthropic.com/en/docs/claude-code/settings"
    } elseif (-not $Live) {
        Write-DryRun "Would configure auto-updates (claude settings set autoUpdate true)"
        Write-Info "Auto-update settings: https://docs.anthropic.com/en/docs/claude-code/settings"
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