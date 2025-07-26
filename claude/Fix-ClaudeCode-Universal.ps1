#!/usr/bin/env pwsh
#Requires -Version 7.0

<#
.SYNOPSIS
    Universal Claude Code fix script for Windows and WSL2/Linux
.DESCRIPTION
    This cross-platform script detects Claude Code installations across multiple package managers,
    removes outdated/surplus installations, and ensures the latest version is installed via npm.
    
    Supports:
    - Windows: npm, pnpm, chocolatey, scoop
    - WSL2/Linux: npm, pnpm, yarn, system-wide sudo installations
    
    By default runs in DRY mode - use -Live to execute changes.
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
    Version: 3.0 (Universal cross-platform)
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
$IsLinuxOS = $IsLinux -or (Test-Path "/proc/version")
$IsWSL = $IsLinuxOS -and (Get-Content "/proc/version" -ErrorAction SilentlyContinue | Select-String "microsoft|WSL")

# Enhanced status functions
function Write-Status {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    $platform = if ($IsWindowsOS) { "WIN" } elseif ($IsWSL) { "WSL" } else { "LIN" }
    
    switch ($Type) {
        "Success" { Write-Host "[$timestamp][$platform] ✓ $Message" -ForegroundColor Green }
        "Error"   { Write-Host "[$timestamp][$platform] ✗ $Message" -ForegroundColor Red; $script:hasErrors = $true }
        "Warning" { Write-Host "[$timestamp][$platform] ⚠ $Message" -ForegroundColor Yellow }
        "Info"    { Write-Host "[$timestamp][$platform] ℹ $Message" -ForegroundColor Cyan }
        "DryRun"  { Write-Host "[$timestamp][$platform] 🧪 [DRY RUN] $Message" -ForegroundColor Magenta }
        default   { Write-Host "[$timestamp][$platform]   $Message" }
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
        # Linux/WSL-specific detection
        
        # Yarn
        $yarnCheck = Invoke-PlatformCommand "yarn global list 2>/dev/null | grep claude-code" "Checking yarn global packages" -IgnoreError -Silent
        if ($yarnCheck.Success -and $yarnCheck.Output -match '@anthropic-ai/claude-code@(\d+\.\d+\.\d+)') {
            $installations.yarn = $matches[1]
            $installations.detailed += [PSCustomObject]@{
                Type = "yarn"
                Platform = "Linux"
                Version = $installations.yarn
                Path = "$(yarn global dir)/node_modules/.bin"
            }
            Write-Status "Found yarn installation: v$($installations.yarn)" "Info"
        }
        
        # System-wide installation (Linux/WSL)
        $systemCheck = Invoke-PlatformCommand "ls -la /usr/bin/claude /bin/claude 2>/dev/null | grep -E '(usr|bin)/lib/node_modules'" "Checking for system claude" -IgnoreError -Silent
        if ($systemCheck.Success -and $systemCheck.Output) {
            $installations.systemwide = "detected"
            Write-Status "Found system-wide Claude installation (requires sudo to remove)" "Warning"
        }
        
        # PATH detection (Linux)
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
        # Linux/WSL-specific removals
        
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
$platformName = if ($IsWindowsOS) { "Windows" } elseif ($IsWSL) { "WSL2" } else { "Linux" }

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
Write-Status "Step 1/5: Detecting Claude Code installations" "Info"
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
Write-Status "Step 2/5: Removing surplus installations" "Info"
$removed = Remove-SurplusInstallations -Installations $installations

if ($removed) {
    Write-Status "Surplus installations removed" "Success"
    Start-Sleep -Seconds 2
} else {
    Write-Status "No surplus installations to remove" "Success"
}

Write-Host ""

# Step 3: Ensure npm installation
Write-Status "Step 3/5: Ensuring proper npm installation" "Info"
$updateSuccess = Update-ClaudeCode

Write-Host ""

# Step 4: Verify installation
Write-Status "Step 4/5: Verifying installation" "Info"
$finalResult = Test-FinalInstallation

Write-Host ""

# Step 5: Final status
Write-Status "Step 5/5: Final Status Report" "Info"
Write-Status "=================================" "Info"

if ($finalResult -and $finalResult.Version) {
    Write-Status "✅ Claude Code is installed and working" "Success"
    Write-Status "Platform: $platformName" "Info"
    Write-Status "Version: $($finalResult.Version)" "Success"
    if ($finalResult.Path -and $finalResult.Path -ne "simulated") {
        Write-Status "Location: $($finalResult.Path)" "Info"
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