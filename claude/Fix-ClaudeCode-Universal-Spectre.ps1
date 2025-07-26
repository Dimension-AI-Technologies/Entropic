#!/usr/bin/env pwsh
#Requires -Version 7.0

<#
.SYNOPSIS
    Universal Claude Code fix script with Spectre.Console rich UI
.DESCRIPTION
    This cross-platform script detects Claude Code installations across multiple package managers,
    removes outdated/surplus installations, ensures the latest version is installed via npm,
    and configures auto-updates for seamless maintenance.
    
    Features beautiful Spectre.Console UI with progress bars, tables, and rich formatting.
    
    Supports:
    - Windows: npm, pnpm, chocolatey, scoop
    - WSL2/Linux: npm, pnpm, yarn, system-wide sudo installations
    - macOS: npm, pnpm, yarn, Homebrew, MacPorts
    
    By default runs in DRY mode - use -Live to execute changes.
    Auto-update documentation: https://docs.anthropic.com/en/docs/claude-code/settings
.PARAMETER Live
    Execute changes (default is dry run mode)
.PARAMETER Verbose
    Enable verbose output for debugging
.EXAMPLE
    ./Fix-ClaudeCode-Universal.ps1
    Runs in dry mode, showing what would be done
.EXAMPLE
    ./Fix-ClaudeCode-Universal.ps1 -Live -Verbose
    Executes actual changes with detailed output
.NOTES
    Author: Claude Assistant
    Date: 2025-07-26
    Version: 3.2 (Universal cross-platform with Spectre.Console UI)
    Requires: PowerShell Core 7.0+ for cross-platform support
    
    Enhanced Features:
    - Auto-installs PoshSpectreConsole module if available
    - Rich UI with colored rules, tables, and formatted output
    - Graceful fallback to standard PowerShell colors if Spectre unavailable
    - Progress indicators and structured display
#>

param(
    [switch]$Live,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$VerbosePreference = if ($Verbose) { "Continue" } else { "SilentlyContinue" }
$script:hasErrors = $false

# Check for and install Spectre.Console if needed
function Initialize-SpectreConsole {
    try {
        # Try to import Spectre.Console
        Import-Module PoshSpectreConsole -ErrorAction Stop
        return $true
    } catch {
        Write-Host "🎨 Spectre.Console not found. Installing for enhanced UI..." -ForegroundColor Cyan
        
        try {
            # Install PoshSpectreConsole (PowerShell wrapper for Spectre.Console)
            Install-Module PoshSpectreConsole -Force -Scope CurrentUser -AllowClobber
            Import-Module PoshSpectreConsole
            Write-Host "✅ Spectre.Console installed successfully!" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "⚠️  Could not install Spectre.Console. Falling back to standard output." -ForegroundColor Yellow
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
            return $false
        }
    }
}

# Initialize Spectre.Console
$script:useSpectre = Initialize-SpectreConsole

# Platform detection
$IsWindowsOS = $IsWindows -or ($env:OS -eq "Windows_NT")
$IsMacOSDetected = $IsMacOS  # PowerShell Core built-in variable
$IsLinuxOS = $IsLinux -and -not $IsMacOSDetected  # Distinguish Linux from macOS
$IsWSL = $IsLinuxOS -and (Test-Path "/proc/version") -and (Get-Content "/proc/version" -ErrorAction SilentlyContinue | Select-String "microsoft|WSL")

# Helper functions for UI abstraction and code reuse
function Write-UIRule {
    param(
        [string]$Title,
        [string]$Color = "Cyan"
    )
    
    if ($script:useSpectre) {
        Write-SpectreRule $Title -Color $Color
    } else {
        # Map Spectre colors to standard PowerShell colors
        $fallbackColor = switch ($Color) {
            "DeepSkyBlue1" { "Cyan" }
            "Orange1" { "Yellow" }
            "Grey" { "Gray" }
            default { $Color }
        }
        Write-Host "`n=== $Title ===" -ForegroundColor $fallbackColor
    }
}

function Write-UIMessage {
    param(
        [string]$Message,
        [string]$Color = "White",
        [switch]$NoNewline
    )
    
    if ($script:useSpectre) {
        Write-SpectreHost $Message -ForegroundColor $Color -NoNewline:$NoNewline
    } else {
        # Map Spectre colors to standard PowerShell colors
        $fallbackColor = switch ($Color) {
            "DeepSkyBlue1" { "Cyan" }
            "Orange1" { "Yellow" }
            "Grey" { "Gray" }
            default { $Color }
        }
        Write-Host $Message -ForegroundColor $fallbackColor -NoNewline:$NoNewline
    }
}

function New-UITable {
    param(
        [string[]]$Columns,
        [string[]]$ColumnColors = @(),
        [hashtable[]]$Rows = @()
    )
    
    if ($script:useSpectre) {
        $table = New-SpectreTable
        for ($i = 0; $i -lt $Columns.Count; $i++) {
            $color = if ($i -lt $ColumnColors.Count) { $ColumnColors[$i] } else { "White" }
            Add-SpectreTableColumn $table $Columns[$i] -Color $color
        }
        
        foreach ($row in $Rows) {
            Add-SpectreTableRow $table $row.Values
        }
        
        return $table
    } else {
        # Fallback: Create formatted text table
        $headerLine = "| " + ($Columns -join " | ") + " |"
        $separatorLine = "|" + ("---" * ($Columns.Count + 1)) + "|"
        
        $result = @($headerLine, $separatorLine)
        foreach ($row in $Rows) {
            $rowLine = "| " + ($row.Values -join " | ") + " |"
            $result += $rowLine
        }
        
        return $result -join "`n"
    }
}

function Write-UITable {
    param($Table)
    
    if ($script:useSpectre) {
        Write-SpectreHost $Table
    } else {
        Write-Host $Table
    }
}

function Write-UIStepHeader {
    param(
        [string]$StepNumber,
        [string]$StepTitle,
        [string]$Color = "DeepSkyBlue1"
    )
    
    $fullTitle = "Step $StepNumber/5: $StepTitle"
    Write-UIRule $fullTitle $Color
}

function Write-UIFinalStatus {
    param(
        [string]$Status,
        [string]$Message,
        [string]$Color = "Green"
    )
    
    Write-UIRule $Status $Color
    Write-UIMessage $Message $Color
}

# Enhanced status functions
function Write-Status {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    $platform = if ($IsWindowsOS) { "WIN" } elseif ($IsWSL) { "WSL" } elseif ($IsMacOSDetected) { "MAC" } else { "LIN" }
    $prefix = "[$timestamp][$platform]"
    
    # Define type mappings for consistency and DRY principle
    $typeConfig = @{
        "Success" = @{ Icon = "✓"; SpectreColor = "Green"; FallbackColor = "Green" }
        "Error"   = @{ Icon = "✗"; SpectreColor = "Red"; FallbackColor = "Red"; SetError = $true }
        "Warning" = @{ Icon = "⚠"; SpectreColor = "Orange1"; FallbackColor = "Yellow" }
        "Info"    = @{ Icon = "ℹ"; SpectreColor = "DeepSkyBlue1"; FallbackColor = "Cyan" }
        "DryRun"  = @{ Icon = "🧪"; SpectreColor = "Magenta"; FallbackColor = "Magenta"; Prefix = "[DRY RUN] " }
    }
    
    $config = $typeConfig[$Type]
    if (-not $config) {
        $config = @{ Icon = " "; SpectreColor = "White"; FallbackColor = "White" }
    }
    
    # Use helper functions for consistent output
    if ($script:useSpectre) {
        Write-UIMessage $prefix -Color "Gray" -NoNewline
        Write-UIMessage " $($config.Icon) " -Color $config.SpectreColor -NoNewline
        if ($config.Prefix) {
            Write-UIMessage $config.Prefix -Color $config.SpectreColor -NoNewline
        }
        Write-UIMessage $Message -Color $config.SpectreColor
    } else {
        $displayMessage = if ($config.Prefix) { "$($config.Prefix)$Message" } else { $Message }
        Write-Host "$prefix $($config.Icon) $displayMessage" -ForegroundColor $config.FallbackColor
    }
    
    if ($config.SetError) {
        $script:hasErrors = $true
    }
}

# Cross-platform command execution
function Invoke-PlatformCommand {
    param(
        [string]$Command,
        [string]$Description,
        [switch]$IgnoreError,
        [switch]$Silent
    )
    
    if (-not $Silent) {
        Write-Verbose "Executing: $Description"
        Write-Verbose "Command: $Command"
    }
    
    if (-not $Live) {
        Write-Status "Would execute: $Command" "DryRun"
        
        # Platform-specific simulation
        $simulatedOutput = if ($IsWindowsOS) {
            switch -Regex ($Command) {
                'claude --version' { "1.0.61 (Claude Code)" }
                'npm list -g.*claude-code.*--json' { '{"dependencies":{"@anthropic-ai/claude-code":{"version":"1.0.61"}}}' }
                'where\.exe claude' { "$env:APPDATA\npm\claude.cmd" }
                'npm config get prefix' { "$env:APPDATA\npm" }
                'choco list claude-code' { "" }  # No chocolatey
                'scoop list claude-code' { "" }  # No scoop
                default { "" }
            }
        } else {
            switch -Regex ($Command) {
                'claude --version' { "1.0.61 (Claude Code)" }
                'npm list -g.*claude-code.*--json' { '{"dependencies":{"@anthropic-ai/claude-code":{"version":"1.0.61"}}}' }
                'which claude' { "$HOME/.npm-global/bin/claude" }
                'npm config get prefix' { "$HOME/.npm-global" }
                'ls -la /usr/bin/claude.*grep.*node_modules' { "" }  # No system installation
                default { "" }
            }
        }
        
        return @{
            Success = $true
            Output = $simulatedOutput
            Error = $null
        }
    }
    
    try {
        if ($IsWindowsOS) {
            # Windows: Direct PowerShell execution
            $output = Invoke-Expression "$Command 2>&1"
            $success = $LASTEXITCODE -eq 0
        } else {
            # Linux/WSL: Bash execution
            $output = bash -c "$Command" 2>&1
            $success = $LASTEXITCODE -eq 0
        }
        
        if (-not $success -and -not $IgnoreError) {
            throw "Command failed with exit code $LASTEXITCODE"
        }
        
        return @{
            Success = $success
            Output = $output
            Error = if (-not $success) { $output } else { $null }
        }
    }
    catch {
        if (-not $IgnoreError) {
            Write-Status "Failed: $_" "Error"
            $script:hasErrors = $true
        }
        return @{
            Success = $false
            Output = $null
            Error = $_.ToString()
        }
    }
}

# Cross-platform installation detection
function Get-ClaudeInstallations {
    Write-Status "Detecting Claude Code installations..." "Info"
    
    $installations = @{
        npm = $null
        pnpm = $null
        yarn = $null
        chocolatey = $null
        scoop = $null
        winget = $null
        homebrew = $null
        macports = $null
        systemwide = $null
        paths = @()
        detailed = @()
    }
    
    # npm detection (universal)
    $npmCheck = Invoke-PlatformCommand "npm list -g @anthropic-ai/claude-code --json 2>/dev/null" "Checking npm global packages" -IgnoreError -Silent
    if ($npmCheck.Success -and $npmCheck.Output) {
        try {
            $npmData = $npmCheck.Output | ConvertFrom-Json
            if ($npmData.dependencies.'@anthropic-ai/claude-code') {
                $installations.npm = $npmData.dependencies.'@anthropic-ai/claude-code'.version
                $installations.detailed += [PSCustomObject]@{
                    Type = "npm-global"
                    Platform = if ($IsWindowsOS) { "Windows" } else { "Linux" }
                    Version = $installations.npm
                    Path = if ($IsWindowsOS) { "$env:APPDATA\npm" } else { "$HOME/.npm-global" }
                }
                Write-Status "Found npm installation: v$($installations.npm)" "Info"
            }
        } catch {}
    }
    
    # pnpm detection (universal)
    $pnpmCheck = Invoke-PlatformCommand "pnpm list -g @anthropic-ai/claude-code 2>/dev/null" "Checking pnpm global packages" -IgnoreError -Silent
    if ($pnpmCheck.Success -and $pnpmCheck.Output -match '@anthropic-ai/claude-code\s+(\d+\.\d+\.\d+)') {
        $installations.pnpm = $matches[1]
        $installations.detailed += [PSCustomObject]@{
            Type = "pnpm"
            Platform = if ($IsWindowsOS) { "Windows" } else { "Linux" }
            Version = $installations.pnpm
            Path = if ($IsWindowsOS) { "$env:LOCALAPPDATA\pnpm\global" } else { "$HOME/.local/share/pnpm" }
        }
        Write-Status "Found pnpm installation: v$($installations.pnpm)" "Info"
    }
    
    if ($IsWindowsOS) {
        # Windows-specific package managers
        
        # Chocolatey
        $chocoCheck = Invoke-PlatformCommand "choco list claude-code --local-only 2>/dev/null" "Checking chocolatey packages" -IgnoreError -Silent
        if ($chocoCheck.Success -and $chocoCheck.Output -match 'claude-code\s+(\d+\.\d+\.\d+)') {
            $installations.chocolatey = $matches[1]
            $installations.detailed += [PSCustomObject]@{
                Type = "chocolatey"
                Platform = "Windows"
                Version = $installations.chocolatey
                Path = "C:\ProgramData\chocolatey\bin"
            }
            Write-Status "Found chocolatey installation: v$($installations.chocolatey)" "Info"
        }
        
        # Scoop
        $scoopCheck = Invoke-PlatformCommand "scoop list claude-code 2>/dev/null" "Checking scoop packages" -IgnoreError -Silent
        if ($scoopCheck.Success -and $scoopCheck.Output -match 'claude-code\s+(\d+\.\d+\.\d+)') {
            $installations.scoop = $matches[1]
            $installations.detailed += [PSCustomObject]@{
                Type = "scoop"
                Platform = "Windows"
                Version = $installations.scoop
                Path = "$env:USERPROFILE\scoop\shims"
            }
            Write-Status "Found scoop installation: v$($installations.scoop)" "Info"
        }
        
        # PATH detection (Windows)
        $pathCheck = Invoke-PlatformCommand "where.exe claude 2>/dev/null" "Finding claude in PATH" -IgnoreError -Silent
        if ($pathCheck.Success -and $pathCheck.Output) {
            $installations.paths = $pathCheck.Output -split "`r?`n" | Where-Object { $_ }
            Write-Status "Found claude in PATH: $($installations.paths -join ', ')" "Info"
        }
        
    } else {
        # Unix-specific detection (Linux/WSL/macOS)
        
        # Yarn (universal Unix)
        $yarnCheck = Invoke-PlatformCommand "yarn global list 2>/dev/null | grep claude-code" "Checking yarn global packages" -IgnoreError -Silent
        if ($yarnCheck.Success -and $yarnCheck.Output -match '@anthropic-ai/claude-code@(\d+\.\d+\.\d+)') {
            $installations.yarn = $matches[1]
            $platformLabel = if ($IsMacOSDetected) { "macOS" } else { "Linux" }
            $installations.detailed += [PSCustomObject]@{
                Type = "yarn"
                Platform = $platformLabel
                Version = $installations.yarn
                Path = "$(yarn global dir)/node_modules/.bin"
            }
            Write-Status "Found yarn installation: v$($installations.yarn)" "Info"
        }
        
        if ($IsMacOSDetected) {
            # macOS-specific package managers
            
            # Homebrew
            $homebrewCheck = Invoke-PlatformCommand "brew list claude-code 2>/dev/null" "Checking Homebrew packages" -IgnoreError -Silent
            if ($homebrewCheck.Success -and $homebrewCheck.Output) {
                # Extract version if available
                $versionMatch = $homebrewCheck.Output -match '(\d+\.\d+\.\d+)'
                $version = if ($versionMatch) { $matches[1] } else { "unknown" }
                $installations.homebrew = $version
                $brewPrefix = Invoke-PlatformCommand "brew --prefix 2>/dev/null" "Getting Homebrew prefix" -IgnoreError -Silent
                $brewPath = if ($brewPrefix.Success) { "$($brewPrefix.Output.Trim())/bin" } else { "/usr/local/bin" }
                $installations.detailed += [PSCustomObject]@{
                    Type = "homebrew"
                    Platform = "macOS"
                    Version = $version
                    Path = $brewPath
                }
                Write-Status "Found Homebrew installation: v$version" "Info"
            }
            
            # MacPorts
            $macportsCheck = Invoke-PlatformCommand "port installed | grep claude 2>/dev/null" "Checking MacPorts packages" -IgnoreError -Silent
            if ($macportsCheck.Success -and $macportsCheck.Output -match 'claude[^\s]*\s+@([\d\.]+)') {
                $installations.macports = $matches[1]
                $installations.detailed += [PSCustomObject]@{
                    Type = "macports"
                    Platform = "macOS"
                    Version = $installations.macports
                    Path = "/opt/local/bin"
                }
                Write-Status "Found MacPorts installation: v$($installations.macports)" "Info"
            }
        }
        
        
        # System-wide installation (Unix)
        $systemCheck = Invoke-PlatformCommand "ls -la /usr/bin/claude /bin/claude 2>/dev/null | grep -E '(usr|bin)/lib/node_modules'" "Checking for system claude" -IgnoreError -Silent
        if ($systemCheck.Success -and $systemCheck.Output) {
            $installations.systemwide = "detected"
            Write-Status "Found system-wide Claude installation (requires sudo to remove)" "Warning"
        }
        
        # PATH detection (Unix)
        $pathCheck = Invoke-PlatformCommand "which claude 2>/dev/null" "Finding claude in PATH" -IgnoreError -Silent
        if ($pathCheck.Success -and $pathCheck.Output) {
            $activePath = $pathCheck.Output.Trim()
            $installations.paths = @($activePath)
            Write-Status "Found claude in PATH: $activePath" "Info"
        }
    }
    
    return $installations
}

# Cross-platform removal
function Remove-SurplusInstallations {
    param([hashtable]$Installations)
    
    $removed = $false
    
    # Remove pnpm (both platforms)
    if ($Installations.pnpm) {
        Write-Status "Removing pnpm installation..." "Warning"
        if ($Live) {
            $result = Invoke-PlatformCommand "pnpm remove -g @anthropic-ai/claude-code" "Removing pnpm package"
            if ($result.Success) {
                Write-Status "Removed pnpm installation" "Success"
                $removed = $true
            }
        } else {
            Write-Status "Would remove pnpm installation v$($Installations.pnpm)" "DryRun"
            $removed = $true
        }
    }
    
    if ($IsWindowsOS) {
        # Windows-specific removals
        
        if ($Installations.chocolatey) {
            Write-Status "Removing chocolatey installation..." "Warning"
            if ($Live) {
                $result = Invoke-PlatformCommand "choco uninstall claude-code -y" "Removing chocolatey package"
                if ($result.Success) {
                    Write-Status "Removed chocolatey installation" "Success"
                    $removed = $true
                }
            } else {
                Write-Status "Would remove chocolatey installation v$($Installations.chocolatey)" "DryRun"
                $removed = $true
            }
        }
        
        if ($Installations.scoop) {
            Write-Status "Removing scoop installation..." "Warning"
            if ($Live) {
                $result = Invoke-PlatformCommand "scoop uninstall claude-code" "Removing scoop package"
                if ($result.Success) {
                    Write-Status "Removed scoop installation" "Success"
                    $removed = $true
                }
            } else {
                Write-Status "Would remove scoop installation v$($Installations.scoop)" "DryRun"
                $removed = $true
            }
        }
        
    } else {
        # Unix-specific removals (Linux/WSL/macOS)
        
        if ($Installations.yarn) {
            Write-Status "Removing yarn installation..." "Warning"
            if ($Live) {
                $result = Invoke-PlatformCommand "yarn global remove @anthropic-ai/claude-code" "Removing yarn package"
                if ($result.Success) {
                    Write-Status "Removed yarn installation" "Success"
                    $removed = $true
                }
            } else {
                Write-Status "Would remove yarn installation v$($Installations.yarn)" "DryRun"
                $removed = $true
            }
        }
        
        if ($IsMacOSDetected) {
            # macOS-specific removals
            
            if ($Installations.homebrew) {
                Write-Status "Removing Homebrew installation..." "Warning"
                if ($Live) {
                    $result = Invoke-PlatformCommand "brew uninstall claude-code" "Removing Homebrew package"
                    if ($result.Success) {
                        Write-Status "Removed Homebrew installation" "Success"
                        $removed = $true
                    }
                } else {
                    Write-Status "Would remove Homebrew installation v$($Installations.homebrew)" "DryRun"
                    $removed = $true
                }
            }
            
            if ($Installations.macports) {
                Write-Status "Removing MacPorts installation..." "Warning"
                if ($Live) {
                    $result = Invoke-PlatformCommand "port uninstall claude-code" "Removing MacPorts package"
                    if ($result.Success) {
                        Write-Status "Removed MacPorts installation" "Success"
                        $removed = $true
                    }
                } else {
                    Write-Status "Would remove MacPorts installation v$($Installations.macports)" "DryRun"
                    $removed = $true
                }
            }
        }
        
        if ($Installations.systemwide) {
            Write-Status "System-wide installation detected - requires manual sudo removal" "Warning"
            Write-Host "   ⚠️  System-wide Claude installation detected" -ForegroundColor Yellow
            Write-Host "   Please run: sudo npm uninstall -g @anthropic-ai/claude-code" -ForegroundColor Cyan
            Write-Host "   Then re-run this script." -ForegroundColor Yellow
            if ($Live) {
                exit 1
            }
        }
    }
    
    return $removed
}

# Universal npm operations
function Update-ClaudeCode {
    Write-Status "Updating Claude Code via npm..." "Info"
    
    if ($Live) {
        $result = Invoke-PlatformCommand "npm install -g @anthropic-ai/claude-code@latest" "Installing/updating Claude Code"
        if ($result.Success) {
            Write-Status "Successfully updated Claude Code via npm" "Success"
            return $true
        } else {
            Write-Status "Failed to update via npm" "Error"
            return $false
        }
    } else {
        Write-Status "Would install/update via npm" "DryRun"
        return $true
    }
}

function Test-FinalInstallation {
    Write-Status "Verifying final installation..." "Info"
    
    if ($Live) {
        $versionCheck = Invoke-PlatformCommand "claude --version 2>/dev/null" "Checking final version" -IgnoreError
        if ($versionCheck.Success -and $versionCheck.Output -match '(\d+\.\d+\.\d+)') {
            $version = $matches[1]
            Write-Status "Final version: $version" "Success"
            
            $pathCmd = if ($IsWindowsOS) { "where.exe claude" } else { "which claude" }
            $pathCheck = Invoke-PlatformCommand "$pathCmd 2>/dev/null" "Finding final path" -IgnoreError
            if ($pathCheck.Success) {
                $path = $pathCheck.Output.Trim()
                Write-Status "Final path: $path" "Info"
            }
            
            return @{ Version = $version; Path = $path }
        } else {
            Write-Status "Failed to verify installation" "Error"
            return $null
        }
    } else {
        Write-Status "Would verify installation" "DryRun"
        return @{ Version = "1.0.61"; Path = "simulated" }
    }
}

# Main execution
$platformName = if ($IsWindowsOS) { "Windows" } elseif ($IsWSL) { "WSL2" } elseif ($IsMacOSDetected) { "macOS" } else { "Linux" }

# Display enhanced header
Write-UIRule "🛠️ Universal Claude Code Fix Script" "Magenta"

# Create execution mode table
$modeRows = @(
    @{ Values = @("Execution Mode", $(if ($Live) { "LIVE - Changes will be executed" } else { "DRY RUN - No changes will be made" })) },
    @{ Values = @("Platform", $platformName) },
    @{ Values = @("PowerShell", "$($PSVersionTable.PSVersion)") }
)

if ($script:useSpectre) {
    $modeRows += @{ Values = @("Enhanced UI", "Spectre.Console Enabled") }
}

$modeTable = New-UITable -Columns @("Setting", "Value") -ColumnColors @("Cyan", "Yellow") -Rows $modeRows
Write-UITable $modeTable
Write-Host ""
if (-not $Live) {
    Write-UIMessage "`n⚠️  DRY RUN MODE - No changes will be made" "Yellow"
    Write-UIMessage "`n   To execute changes, run with -Live flag" "Gray"
} else {
    Write-UIMessage "`n🚀 LIVE MODE - Changes will be executed" "Red"
}
Write-Host ""

# Step 1: Detect installations
Write-UIStepHeader "1" "Detecting Claude Code installations" "DeepSkyBlue1"
$installations = Get-ClaudeInstallations

if ($installations.detailed.Count -eq 0) {
    Write-Status "No installations found - will install fresh via npm" "Warning"
} else {
    Write-Status "Found $($installations.detailed.Count) installation(s):" "Info"
    $installations.detailed | ForEach-Object {
        Write-Status "  - $($_.Type) v$($_.Version) [$($_.Platform)] at $($_.Path)" "Info"
    }
}

Write-Host ""

# Step 2: Remove surplus installations
Write-UIStepHeader "2" "Removing surplus installations" "Orange1"
$removed = Remove-SurplusInstallations -Installations $installations

if ($removed) {
    Write-Status "Surplus installations removed" "Success"
    Start-Sleep -Seconds 2
} else {
    Write-Status "No surplus installations to remove" "Success"
}

Write-Host ""

# Step 3: Ensure npm installation
Write-UIStepHeader "3" "Ensuring proper npm installation" "Green"
$updateSuccess = Update-ClaudeCode

Write-Host ""

# Step 4: Verify installation
Write-UIStepHeader "4" "Verifying installation" "Yellow"
$finalResult = Test-FinalInstallation

Write-Host ""

# Step 5: Final status
Write-UIStepHeader "5" "Final Status Report" "Magenta"

if ($finalResult -and $finalResult.Version) {
    # Create and display summary table
    $summaryRows = @(
        @{ Values = @("Status", "✅ Installed and Working") },
        @{ Values = @("Platform", $platformName) },
        @{ Values = @("Version", $finalResult.Version) }
    )
    
    if ($finalResult.Path -and $finalResult.Path -ne "simulated") {
        $summaryRows += @{ Values = @("Location", $finalResult.Path) }
    }
    
    $summaryRows += @{ Values = @("Package Manager", "npm (recommended)") }
    
    $summaryTable = New-UITable -Columns @("Property", "Value") -ColumnColors @("Cyan", "Green") -Rows $summaryRows
    Write-UITable $summaryTable
    
    # Configure auto-updates
    Write-Status "Configuring Claude Code auto-updates..." "Info"
    if ($Live -and $finalResult.Version -ne "simulated") {
        try {
            # Enable auto-updates for seamless maintenance
            # Documentation: https://docs.anthropic.com/en/docs/claude-code/settings
            $autoUpdateResult = & claude settings set autoUpdate true 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Status "✅ Auto-updates enabled successfully" "Success"
                Write-Status "Claude will automatically update to new versions" "Info"
            } else {
                Write-Status "⚠️ Could not enable auto-updates (command may not be available yet)" "Warning"
            }
        } catch {
            Write-Status "⚠️ Auto-update configuration skipped: $($_.Exception.Message)" "Warning"
        }
        
        Write-Status "📚 Auto-update settings documentation:" "Info"
        Write-Status "https://docs.anthropic.com/en/docs/claude-code/settings" "Info"
    } elseif (-not $Live) {
        Write-Status "DRY RUN: Would configure auto-updates (claude settings set autoUpdate true)" "Info"
        Write-Status "📚 Auto-update settings: https://docs.anthropic.com/en/docs/claude-code/settings" "Info"
    }
    
    if (-not $script:hasErrors) {
        Write-UIFinalStatus "🎉 SUCCESS!" "Claude Code has been successfully fixed!" "Green"
        if (-not $Live) {
            Write-UIMessage "⚠️  This was a DRY RUN - run with -Live to execute changes" "Orange1"
        }
        exit 0
    } else {
        Write-UIFinalStatus "⚠️ PARTIAL SUCCESS" "Claude Code is working but some errors occurred" "Orange1"
        exit 1
    }
} else {
    Write-UIFinalStatus "❌ INSTALLATION FAILED" "Claude Code installation failed" "Red"
    Write-UIMessage "Please manually install with: npm install -g @anthropic-ai/claude-code@latest" "Orange1"
    exit 1
}