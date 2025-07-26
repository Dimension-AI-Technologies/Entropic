#!/usr/bin/env pwsh
#Requires -Version 7.0

<#
.SYNOPSIS
    Universal Claude Code fix script for Windows, WSL2/Linux, and macOS
.DESCRIPTION
    This cross-platform script detects Claude Code installations across multiple package managers,
    removes outdated/surplus installations, ensures the latest version is installed via npm,
    and configures auto-updates for seamless maintenance.
    
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
    Version: 3.1 (Universal cross-platform with macOS support)
    Requires: PowerShell Core 7.0+ for cross-platform support
#>

param(
    [switch]$Live,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$VerbosePreference = if ($Verbose) { "Continue" } else { "SilentlyContinue" }
$script:hasErrors = $false

# Platform detection
$IsWindowsOS = $IsWindows -or ($env:OS -eq "Windows_NT")
$IsMacOSDetected = $IsMacOS  # PowerShell Core built-in variable
$IsLinuxOS = $IsLinux -and -not $IsMacOSDetected  # Distinguish Linux from macOS
$IsWSL = $IsLinuxOS -and (Test-Path "/proc/version") -and (Get-Content "/proc/version" -ErrorAction SilentlyContinue | Select-String "microsoft|WSL")

# Enhanced status functions with centralized configuration
function Write-Status {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    $platform = Get-PlatformLabel
    
    # Define type mappings for consistency and DRY principle
    $typeConfig = @{
        "Success" = @{ Icon = "✓"; Color = "Green" }
        "Error"   = @{ Icon = "✗"; Color = "Red"; SetError = $true }
        "Warning" = @{ Icon = "⚠"; Color = "Yellow" }
        "Info"    = @{ Icon = "ℹ"; Color = "Cyan" }
        "DryRun"  = @{ Icon = "🧪"; Color = "Magenta"; Prefix = "[DRY RUN] " }
    }
    
    $config = $typeConfig[$Type]
    if (-not $config) {
        $config = @{ Icon = " "; Color = "White" }
    }
    
    $displayMessage = if ($config.Prefix) { "$($config.Prefix)$Message" } else { $Message }
    Write-Host "[$timestamp][$platform] $($config.Icon) $displayMessage" -ForegroundColor $config.Color
    
    if ($config.SetError) {
        $script:hasErrors = $true
    }
}

# Helper function for platform detection
function Get-PlatformLabel {
    if ($IsWindowsOS) { return "WIN" }
    elseif ($IsWSL) { return "WSL" }
    elseif ($IsMacOSDetected) { return "MAC" }
    else { return "LIN" }
}

# Helper function for step headers
function Write-StepHeader {
    param(
        [string]$StepNumber,
        [string]$StepTitle
    )
    
    Write-Status "Step $StepNumber/5: $StepTitle" "Info"
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

# Helper function for package manager detection
function Test-PackageManager {
    param(
        [string]$Manager,
        [hashtable]$Installations
    )
    
    $config = @{
        "npm" = @{
            Command = "npm list -g @anthropic-ai/claude-code --json 2>/dev/null"
            Description = "Checking npm global packages"
            JsonPath = "dependencies.'@anthropic-ai/claude-code'.version"
            WindowsPath = "$env:APPDATA\npm"
            UnixPath = "$HOME/.npm-global"
        }
        "pnpm" = @{
            Command = "pnpm list -g @anthropic-ai/claude-code 2>/dev/null"
            Description = "Checking pnpm global packages"
            RegexPattern = '@anthropic-ai/claude-code\s+(\d+\.\d+\.\d+)'
            WindowsPath = "$env:LOCALAPPDATA\pnpm\global"
            UnixPath = "$HOME/.local/share/pnpm"
        }
        "yarn" = @{
            Command = "yarn global list 2>/dev/null | grep claude-code"
            Description = "Checking yarn global packages"
            RegexPattern = '@anthropic-ai/claude-code@(\d+\.\d+\.\d+)'
            UnixPath = "/usr/local/share/.config/yarn/global/node_modules/.bin"
        }
    }
    
    $managerConfig = $config[$Manager]
    if (-not $managerConfig) { return }
    
    $check = Invoke-PlatformCommand $managerConfig.Command $managerConfig.Description -IgnoreError -Silent
    if (-not $check.Success -or -not $check.Output) { return }
    
    $version = $null
    
    if ($managerConfig.JsonPath) {
        try {
            $jsonData = $check.Output | ConvertFrom-Json
            $version = Invoke-Expression "`$jsonData.$($managerConfig.JsonPath)"
        } catch { return }
    } elseif ($managerConfig.RegexPattern -and $check.Output -match $managerConfig.RegexPattern) {
        $version = $matches[1]
    }
    
    if ($version) {
        $Installations[$Manager] = $version
        $platformLabel = if ($IsWindowsOS) { "Windows" } elseif ($IsMacOSDetected) { "macOS" } else { "Linux" }
        $path = if ($IsWindowsOS -and $managerConfig.WindowsPath) { $managerConfig.WindowsPath } else { $managerConfig.UnixPath }
        
        $Installations.detailed += [PSCustomObject]@{
            Type = if ($Manager -eq "npm") { "npm-global" } else { $Manager }
            Platform = $platformLabel
            Version = $version
            Path = $path
        }
        
        Write-Status "Found $Manager installation: v$version" "Info"
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
    
    # Universal package manager detection with helper function
    Test-PackageManager "npm" $installations
    Test-PackageManager "pnpm" $installations
    
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
        
        # Yarn detection for Unix systems
        Test-PackageManager "yarn" $installations
        
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

# Helper function for package removal
function Remove-Package {
    param(
        [string]$Manager,
        [string]$Version,
        [string]$Command
    )
    
    Write-Status "Removing $Manager installation..." "Warning"
    if ($Live) {
        $result = Invoke-PlatformCommand $Command "Removing $Manager package"
        if ($result.Success) {
            Write-Status "Removed $Manager installation" "Success"
            return $true
        }
    } else {
        Write-Status "Would remove $Manager installation v$Version" "DryRun"
        return $true
    }
    return $false
}

# Cross-platform removal
function Remove-SurplusInstallations {
    param([hashtable]$Installations)
    
    $removed = $false
    
    # Define removal commands for each package manager
    $removalCommands = @{
        "pnpm" = "pnpm remove -g @anthropic-ai/claude-code"
        "chocolatey" = "choco uninstall claude-code -y"
        "scoop" = "scoop uninstall claude-code"
        "yarn" = "yarn global remove @anthropic-ai/claude-code"
        "homebrew" = "brew uninstall claude-code"
        "macports" = "port uninstall claude-code"
    }
    
    # Remove surplus package managers (keep npm as preferred)
    $surplusManagers = @("pnpm")
    
    if ($IsWindowsOS) {
        $surplusManagers += @("chocolatey", "scoop")
    } else {
        $surplusManagers += @("yarn")
        if ($IsMacOSDetected) {
            $surplusManagers += @("homebrew", "macports")
        }
    }
    
    foreach ($manager in $surplusManagers) {
        if ($Installations[$manager]) {
            $wasRemoved = Remove-Package $manager $Installations[$manager] $removalCommands[$manager]
            if ($wasRemoved) { $removed = $true }
        }
    }
    
    # Handle system-wide installation special case
    if ($Installations.systemwide) {
        Write-Status "System-wide installation detected - requires manual sudo removal" "Warning"
        Write-Host "   ⚠️  System-wide Claude installation detected" -ForegroundColor Yellow
        Write-Host "   Please run: sudo npm uninstall -g @anthropic-ai/claude-code" -ForegroundColor Cyan
        Write-Host "   Then re-run this script." -ForegroundColor Yellow
        if ($Live) {
            exit 1
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

# Helper function for platform name
function Get-PlatformName {
    if ($IsWindowsOS) { return "Windows" }
    elseif ($IsWSL) { return "WSL2" }
    elseif ($IsMacOSDetected) { return "macOS" }
    else { return "Linux" }
}

# Main execution
$platformName = Get-PlatformName

Write-Host "`n=== Universal Claude Code Fix Script ===" -ForegroundColor Magenta
Write-Host "Platform: $platformName" -ForegroundColor Gray
Write-Host "PowerShell: $($PSVersionTable.PSVersion)" -ForegroundColor Gray

if (-not $Live) {
    Write-Host "`n⚠️  DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host "   To execute changes, run with -Live flag" -ForegroundColor Gray
} else {
    Write-Host "`n🚀 LIVE MODE - Changes will be executed" -ForegroundColor Red
}
Write-Host ""

# Step 1: Detect installations
Write-StepHeader "1" "Detecting Claude Code installations"
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
Write-StepHeader "2" "Removing surplus installations"
$removed = Remove-SurplusInstallations -Installations $installations

if ($removed) {
    Write-Status "Surplus installations removed" "Success"
    Start-Sleep -Seconds 2
} else {
    Write-Status "No surplus installations to remove" "Success"
}

Write-Host ""

# Step 3: Ensure npm installation
Write-StepHeader "3" "Ensuring proper npm installation"
$updateSuccess = Update-ClaudeCode

Write-Host ""

# Step 4: Verify installation
Write-StepHeader "4" "Verifying installation"
$finalResult = Test-FinalInstallation

Write-Host ""

# Step 5: Final status
Write-StepHeader "5" "Final Status Report"

if ($finalResult -and $finalResult.Version) {
    Write-Status "✅ Claude Code is installed and working" "Success"
    Write-Status "Platform: $platformName" "Info"
    Write-Status "Version: $($finalResult.Version)" "Success"
    if ($finalResult.Path -and $finalResult.Path -ne "simulated") {
        Write-Status "Location: $($finalResult.Path)" "Info"
    }
    
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
        Write-Host "`n✓ Claude Code has been successfully fixed!" -ForegroundColor Green
        if (-not $Live) {
            Write-Host "⚠️  This was a DRY RUN - run with -Live to execute changes" -ForegroundColor Yellow
        }
        exit 0
    } else {
        Write-Host "`n⚠ Claude Code is working but some errors occurred" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Status "❌ Claude Code installation failed" "Error"
    Write-Status "Please manually install with: npm install -g @anthropic-ai/claude-code@latest" "Warning"
    Write-Host "`n✗ Failed to fix Claude Code installation" -ForegroundColor Red
    exit 1
}