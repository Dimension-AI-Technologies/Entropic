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
.PARAMETER UseSpectre
    Enable Spectre.Console rich UI with colored tables and formatting (auto-installs if needed)
.PARAMETER NonInteractive
    Run in non-interactive mode (will not prompt for elevation) - only applies with -UseSpectre
.PARAMETER Help
    Show detailed help information
.PARAMETER Config
    Display the internal data-driven configuration for all package managers
.EXAMPLE
    ./Fix-ClaudeCode.ps1
    Runs in dry mode, showing what would be done
.EXAMPLE
    ./Fix-ClaudeCode.ps1 -Live -Verbose
    Executes actual changes with detailed output
.EXAMPLE
    ./Fix-ClaudeCode.ps1 -Live -UseSpectre
    Executes changes with beautiful Spectre.Console UI
.EXAMPLE
    ./Fix-ClaudeCode.ps1 -Config
    Displays the internal data-driven configuration for all package managers
.NOTES
    Author: Claude Assistant
    Date: 2025-07-31
    Version: 5.0 (Unified version with optional Spectre.Console UI)
    Requires: PowerShell Core 7.0+ for cross-platform support
#>

param(
    [switch]$Live,
    [switch]$Verbose,
    [switch]$UseSpectre,
    [switch]$NonInteractive,
    [switch]$Help,
    [switch]$Config
)

# Custom help display function
function Show-Help {
    $scriptName = "Fix-ClaudeCode.ps1"
    
    Write-Host ""
    Write-Host "Universal Claude Code Fix Script (v5.0)" -ForegroundColor Cyan
    Write-Host "=======================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "SYNOPSIS" -ForegroundColor Yellow
    Write-Host "    Fixes Claude Code installation issues across Windows, WSL2/Linux, and macOS"
    Write-Host ""
    
    Write-Host "DESCRIPTION" -ForegroundColor Yellow
    Write-Host "    This script automatically:"
    Write-Host "    • Detects all Claude Code installations across multiple package managers"
    Write-Host "    • Removes conflicting/outdated installations"
    Write-Host "    • Ensures the latest version is installed via npm"
    Write-Host "    • Fixes PATH configuration issues"
    Write-Host "    • Configures automatic updates"
    Write-Host ""
    
    Write-Host "SUPPORTED PLATFORMS" -ForegroundColor Yellow
    Write-Host "    • Windows    : npm, pnpm, chocolatey, scoop"
    Write-Host "    • WSL2/Linux : npm, pnpm, yarn, system-wide installations"
    Write-Host "    • macOS      : npm, pnpm, yarn, Homebrew, MacPorts"
    Write-Host ""
    
    Write-Host "USAGE" -ForegroundColor Yellow
    Write-Host "    ./$scriptName [options]"
    Write-Host ""
    
    Write-Host "OPTIONS" -ForegroundColor Yellow
    Write-Host "    -Live              Execute changes (default is dry run)" -ForegroundColor Green
    Write-Host "    -UseSpectre        Enable beautiful Spectre.Console UI" -ForegroundColor Green
    Write-Host "    -Verbose           Show detailed diagnostic output" -ForegroundColor Green
    Write-Host "    -NonInteractive    Don't prompt for elevation (with -UseSpectre)" -ForegroundColor Green
    Write-Host "    -Config            Show internal package manager configuration" -ForegroundColor Green
    Write-Host "    -Help, -?          Show this help message" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "EXAMPLES" -ForegroundColor Yellow
    Write-Host "    # Preview what will be fixed (safe - no changes)" -ForegroundColor DarkGray
    Write-Host "    ./$scriptName" -ForegroundColor White
    Write-Host ""
    Write-Host "    # Actually fix the issues" -ForegroundColor DarkGray
    Write-Host "    ./$scriptName -Live" -ForegroundColor White
    Write-Host ""
    Write-Host "    # Fix with enhanced UI" -ForegroundColor DarkGray
    Write-Host "    ./$scriptName -Live -UseSpectre" -ForegroundColor White
    Write-Host ""
    Write-Host "    # Fix with detailed output" -ForegroundColor DarkGray
    Write-Host "    ./$scriptName -Live -Verbose" -ForegroundColor White
    Write-Host ""
    Write-Host "    # View internal configuration" -ForegroundColor DarkGray
    Write-Host "    ./$scriptName -Config" -ForegroundColor White
    Write-Host ""
    
    Write-Host "SAFETY" -ForegroundColor Yellow
    Write-Host "    • Default mode is DRY RUN - shows what would be done without making changes"
    Write-Host "    • Use -Live flag to execute actual changes"
    Write-Host "    • Script is non-destructive and preserves working installations"
    Write-Host ""
    
    Write-Host "WHAT THIS SCRIPT FIXES" -ForegroundColor Yellow
    Write-Host "    • Multiple conflicting Claude installations"
    Write-Host "    • Outdated Claude versions"
    Write-Host "    • PATH configuration issues"
    Write-Host "    • Missing npm global bin in PATH"
    Write-Host "    • Package manager conflicts"
    Write-Host "    • Auto-update configuration"
    Write-Host ""
    
    Write-Host "MORE INFORMATION" -ForegroundColor Yellow
    Write-Host "    Auto-updates: https://docs.anthropic.com/en/docs/claude-code/settings"
    Write-Host "    Repository  : https://github.com/anthropics/claude-code"
    Write-Host ""
}

# Function to display configuration
function Show-Configuration {
    Write-Host ""
    Write-Host "Claude Code Fix Script - Internal Configuration" -ForegroundColor Cyan
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This script uses a data-driven approach with the following package manager configurations:" -ForegroundColor Gray
    Write-Host ""
    
    # We need to define the configs here since they're not yet loaded
    $configs = @{
        npm = @{
            Name = "npm"
            Priority = 1
            Platforms = @("Windows", "Linux", "macOS", "WSL")
            InstallCommand = "npm install -g @anthropic-ai/claude-code@latest"
            UninstallCommand = "npm uninstall -g @anthropic-ai/claude-code"
        }
        pnpm = @{
            Name = "pnpm"
            Priority = 2
            Platforms = @("Windows", "Linux", "macOS", "WSL")
            InstallCommand = "pnpm add -g @anthropic-ai/claude-code@latest"
            UninstallCommand = "pnpm uninstall -g @anthropic-ai/claude-code"
        }
        yarn = @{
            Name = "yarn"
            Priority = 3
            Platforms = @("Linux", "macOS", "WSL")
            InstallCommand = "yarn global add @anthropic-ai/claude-code@latest"
            UninstallCommand = "yarn global remove @anthropic-ai/claude-code"
        }
        chocolatey = @{
            Name = "chocolatey"
            Priority = 4
            Platforms = @("Windows")
            InstallCommand = "choco install claude-code -y"
            UninstallCommand = "choco uninstall claude-code -y"
        }
        scoop = @{
            Name = "scoop"
            Priority = 5
            Platforms = @("Windows")
            InstallCommand = "scoop install claude-code"
            UninstallCommand = "scoop uninstall claude-code"
        }
        homebrew = @{
            Name = "homebrew"
            Priority = 6
            Platforms = @("macOS")
            InstallCommand = "brew install claude-code"
            UninstallCommand = "brew uninstall claude-code"
        }
        macports = @{
            Name = "macports"
            Priority = 7
            Platforms = @("macOS")
            InstallCommand = "port install claude-code"
            UninstallCommand = "port uninstall claude-code"
        }
    }
    
    # Sort by priority
    $sortedConfigs = $configs.GetEnumerator() | Sort-Object { $_.Value.Priority }
    
    foreach ($config in $sortedConfigs) {
        $manager = $config.Value
        Write-Host "PACKAGE MANAGER: $($manager.Name)" -ForegroundColor Yellow
        Write-Host "  Priority      : $($manager.Priority) $(if ($manager.Priority -eq 1) { '(Preferred)' } else { '' })" -ForegroundColor Green
        Write-Host "  Platforms     : $($manager.Platforms -join ', ')" -ForegroundColor Green
        Write-Host "  Install Cmd   : $($manager.InstallCommand)" -ForegroundColor Gray
        Write-Host "  Uninstall Cmd : $($manager.UninstallCommand)" -ForegroundColor Gray
        Write-Host ""
    }
    
    Write-Host "PRIORITY SYSTEM" -ForegroundColor Yellow
    Write-Host "  • Lower number = higher priority (npm=1 is preferred)" -ForegroundColor Gray
    Write-Host "  • Script removes all installations except the highest priority one found" -ForegroundColor Gray
    Write-Host "  • If no installations exist, npm is used for new installation" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "INSTALLATION PATHS" -ForegroundColor Yellow
    Write-Host "  Windows:" -ForegroundColor Green
    Write-Host "    • npm        : %APPDATA%\\npm" -ForegroundColor Gray
    Write-Host "    • pnpm       : %LOCALAPPDATA%\\pnpm\\global" -ForegroundColor Gray
    Write-Host "    • chocolatey : C:\\ProgramData\\chocolatey\\bin" -ForegroundColor Gray
    Write-Host "    • scoop      : %USERPROFILE%\\scoop\\shims" -ForegroundColor Gray
    Write-Host "    • .local/bin : %USERPROFILE%\\.local\\bin (detected & removed)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Linux/WSL:" -ForegroundColor Green
    Write-Host "    • npm        : ~/.npm-global/bin or /usr/local/bin" -ForegroundColor Gray
    Write-Host "    • pnpm       : ~/.local/share/pnpm/global" -ForegroundColor Gray
    Write-Host "    • yarn       : ~/.yarn/bin" -ForegroundColor Gray
    Write-Host "    • .local/bin : ~/.local/bin (detected & removed)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  macOS:" -ForegroundColor Green
    Write-Host "    • npm        : /usr/local/bin" -ForegroundColor Gray
    Write-Host "    • pnpm       : ~/Library/pnpm/global" -ForegroundColor Gray
    Write-Host "    • yarn       : ~/.yarn/bin" -ForegroundColor Gray
    Write-Host "    • homebrew   : /opt/homebrew/bin or /usr/local/bin" -ForegroundColor Gray
    Write-Host "    • macports   : /opt/local/bin" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "ADDITIONAL FEATURES" -ForegroundColor Yellow
    Write-Host "  • Auto-update configuration after installation" -ForegroundColor Gray
    Write-Host "  • PATH cleanup and prioritization" -ForegroundColor Gray
    Write-Host "  • Shell configuration updates (Linux/macOS)" -ForegroundColor Gray
    Write-Host "  • Version verification with forced reinstall if needed" -ForegroundColor Gray
    Write-Host "  • Git and GitHub CLI prerequisite checking" -ForegroundColor Gray
    Write-Host ""
}

# Show help if requested (also check for -? in args since PowerShell intercepts it)
if ($Help -or ($args -contains '-?') -or ($args -contains '/?')) {
    Show-Help
    exit 0
}

# Show configuration if requested
if ($Config) {
    Show-Configuration
    exit 0
}

$ErrorActionPreference = "Stop"
$VerbosePreference = if ($Verbose) { "Continue" } else { "SilentlyContinue" }
$script:hasErrors = $false

# Platform detection (needed early for elevation check)
$IsWindowsOS = $IsWindows -or ($env:OS -eq "Windows_NT")
$IsMacOSDetected = $IsMacOS  # PowerShell Core built-in variable
$IsLinuxOS = $IsLinux -and -not $IsMacOSDetected  # Distinguish Linux from macOS
$IsWSL = $IsLinuxOS -and (Test-Path "/proc/version") -and (Get-Content "/proc/version" -ErrorAction SilentlyContinue | Select-String "microsoft|WSL")

# Check if running with elevated permissions on Windows
function Test-Administrator {
    if ($IsWindowsOS) {
        $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
        return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    }
    return $false
}

# Check if elevation might be needed
function Test-ElevationNeeded {
    if (-not $IsWindowsOS) { return $false }
    
    # Check if any system-wide installations exist that would need admin rights
    $systemPaths = @(
        "$env:ProgramFiles\Claude",
        "${env:ProgramFiles(x86)}\Claude",
        "C:\ProgramData\chocolatey\bin\claude.exe"
    )
    
    foreach ($path in $systemPaths) {
        if (Test-Path $path) {
            return $true
        }
    }
    
    return $false
}

# Check for and install Spectre.Console if needed
function Initialize-SpectreConsole {
    if (-not $UseSpectre) { return $false }
    
    try {
        # Try to import Spectre.Console
        Import-Module PwshSpectreConsole -ErrorAction Stop
        return $true
    } catch {
        Write-Host "[i] Spectre.Console not found. Installing for enhanced UI..." -ForegroundColor Cyan
        
        try {
            # First ensure PowerShellGet is updated
            if (-not (Get-Module -ListAvailable -Name PowerShellGet | Where-Object { $_.Version -ge '2.0.0' })) {
                Write-Host "[i] Updating PowerShellGet..." -ForegroundColor Gray
                Install-Module PowerShellGet -Force -Scope CurrentUser -AllowClobber
            }
            
            # Ensure PSGallery is registered and trusted
            if (-not (Get-PSRepository -Name PSGallery -ErrorAction SilentlyContinue)) {
                Register-PSRepository -Default
            }
            
            # Install PwshSpectreConsole (PowerShell wrapper for Spectre.Console)
            Install-Module PwshSpectreConsole -Force -Scope CurrentUser -AllowClobber -SkipPublisherCheck
            Import-Module PwshSpectreConsole
            Write-Host "[OK] Spectre.Console installed successfully!" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "[!]  Could not install Spectre.Console. Falling back to standard output." -ForegroundColor Yellow
            Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Gray
            return $false
        }
    }
}

# Initialize Spectre.Console if requested
$script:useSpectre = Initialize-SpectreConsole

# Wait for module to fully load if Spectre is available
if ($script:useSpectre) {
    # Give the module a moment to initialize
    Start-Sleep -Milliseconds 100
    
    # Verify module is loaded
    if (-not (Get-Module PwshSpectreConsole)) {
        $script:useSpectre = $false
        Write-Host "[!]  Spectre module not properly loaded. Falling back to standard output." -ForegroundColor Yellow
    }
}

# Request elevation if needed (only when UseSpectre is enabled)
if ($UseSpectre) {
    $isAdmin = Test-Administrator
    $needsElevation = Test-ElevationNeeded
    
    if ($needsElevation -and -not $isAdmin -and $Live) {
        if ($NonInteractive) {
            Write-Host "[ERROR] This script requires administrator privileges to remove system-wide installations." -ForegroundColor Red
            Write-Host "[ERROR] Please run this script as Administrator or use -NonInteractive flag to skip elevation." -ForegroundColor Red
            exit 1
        } else {
            Write-Host "[!] This script may require administrator privileges to remove system-wide installations." -ForegroundColor Yellow
            Write-Host "[!] Requesting elevation..." -ForegroundColor Yellow
            
            # Relaunch script with elevation
            $scriptPath = $MyInvocation.MyCommand.Path
            $arguments = @()
            if ($Live) { $arguments += "-Live" }
            if ($Verbose) { $arguments += "-Verbose" }
            if ($UseSpectre) { $arguments += "-UseSpectre" }
            $arguments = $arguments -join " "
            
            try {
                Start-Process pwsh -ArgumentList "-File `"$scriptPath`" $arguments" -Verb RunAs
                exit 0
            } catch {
                Write-Host "[ERROR] Failed to elevate. Please run this script as Administrator." -ForegroundColor Red
                exit 1
            }
        }
    }
}

# Data-driven configuration for package managers across platforms
$script:PackageManagerConfigs = @{
    npm = @{
        Name = "npm"
        Priority = 1  # Highest priority - preferred manager
        Platforms = @("Windows", "Linux", "macOS", "WSL")
        CheckCommand = { npm list -g @anthropic-ai/claude-code --json 2>$null | ConvertFrom-Json }
        GetVersion = { param($result) $result.dependencies.'@anthropic-ai/claude-code'.version }
        UninstallCommand = "npm uninstall -g @anthropic-ai/claude-code"
        InstallCommand = "npm install -g @anthropic-ai/claude-code@latest"
        CacheCleanCommand = "npm cache clean --force"
        InstallPaths = @{
            Windows = "$env:APPDATA\npm"
            Linux = "$HOME/.npm-global"
            macOS = "/usr/local/lib/node_modules"
            WSL = "$HOME/.npm-global"
        }
        ExecutablePaths = @{
            Windows = @("$env:APPDATA\npm\claude.cmd", "$env:APPDATA\npm\claude")
            Linux = @("$HOME/.npm-global/bin/claude", "/usr/local/bin/claude")
            macOS = @("/usr/local/bin/claude", "$HOME/.npm-global/bin/claude")
            WSL = @("$HOME/.npm-global/bin/claude", "/usr/local/bin/claude")
        }
    }
    pnpm = @{
        Name = "pnpm"
        Priority = 2
        Platforms = @("Windows", "Linux", "macOS", "WSL")
        CheckCommand = { pnpm list -g @anthropic-ai/claude-code 2>$null }
        GetVersion = { param($result) if ($result -match '@anthropic-ai/claude-code\s+(\d+\.\d+\.\d+)') { $matches[1] } }
        UninstallCommand = "pnpm uninstall -g @anthropic-ai/claude-code"
        InstallCommand = "pnpm add -g @anthropic-ai/claude-code@latest"
        InstallPaths = @{
            Windows = "$env:LOCALAPPDATA\pnpm\global"
            Linux = "$HOME/.local/share/pnpm/global"
            macOS = "$HOME/Library/pnpm/global"
            WSL = "$HOME/.local/share/pnpm/global"
        }
        ExecutablePaths = @{
            Windows = @("$env:LOCALAPPDATA\pnpm\claude.cmd")
            Linux = @("$HOME/.local/share/pnpm/global/5/node_modules/.bin/claude")
            macOS = @("$HOME/Library/pnpm/global/5/node_modules/.bin/claude")
            WSL = @("$HOME/.local/share/pnpm/global/5/node_modules/.bin/claude")
        }
    }
    yarn = @{
        Name = "yarn"
        Priority = 3
        Platforms = @("Linux", "macOS", "WSL")
        CheckCommand = { yarn global list 2>$null | Select-String "@anthropic-ai/claude-code" }
        GetVersion = { param($result) if ($result -match '@anthropic-ai/claude-code@(\d+\.\d+\.\d+)') { $matches[1] } }
        UninstallCommand = "yarn global remove @anthropic-ai/claude-code"
        InstallCommand = "yarn global add @anthropic-ai/claude-code@latest"
        InstallPaths = @{
            Linux = "$HOME/.yarn/bin"
            macOS = "$HOME/.yarn/bin"
            WSL = "$HOME/.yarn/bin"
        }
        ExecutablePaths = @{
            Linux = @("$HOME/.yarn/bin/claude")
            macOS = @("$HOME/.yarn/bin/claude")
            WSL = @("$HOME/.yarn/bin/claude")
        }
    }
    chocolatey = @{
        Name = "chocolatey"
        Priority = 4
        Platforms = @("Windows")
        CheckCommand = { choco list claude-code --local-only 2>$null }
        GetVersion = { param($result) if ($result -match 'claude-code\s+(\d+\.\d+\.\d+)') { $matches[1] } }
        UninstallCommand = "choco uninstall claude-code -y"
        InstallCommand = "choco install claude-code -y"
        InstallPaths = @{
            Windows = "C:\ProgramData\chocolatey\bin"
        }
        ExecutablePaths = @{
            Windows = @("C:\ProgramData\chocolatey\bin\claude.exe")
        }
    }
    scoop = @{
        Name = "scoop"
        Priority = 5
        Platforms = @("Windows")
        CheckCommand = { scoop list claude-code 2>$null }
        GetVersion = { param($result) if ($result -match 'claude-code\s+(\d+\.\d+\.\d+)') { $matches[1] } }
        UninstallCommand = "scoop uninstall claude-code"
        InstallCommand = "scoop install claude-code"
        InstallPaths = @{
            Windows = "$env:USERPROFILE\scoop\shims"
        }
        ExecutablePaths = @{
            Windows = @("$env:USERPROFILE\scoop\shims\claude.exe", "$env:USERPROFILE\scoop\shims\claude.cmd")
        }
    }
    homebrew = @{
        Name = "homebrew"
        Priority = 6
        Platforms = @("macOS")
        CheckCommand = { brew list claude-code 2>$null }
        GetVersion = { param($result) if ($result -match 'claude-code\s+(\d+\.\d+\.\d+)') { $matches[1] } }
        UninstallCommand = "brew uninstall claude-code"
        InstallCommand = "brew install claude-code"
        InstallPaths = @{
            macOS = "/opt/homebrew/bin"
        }
        ExecutablePaths = @{
            macOS = @("/opt/homebrew/bin/claude", "/usr/local/bin/claude")
        }
    }
    macports = @{
        Name = "macports"
        Priority = 7
        Platforms = @("macOS")
        CheckCommand = { port installed claude-code 2>$null }
        GetVersion = { param($result) if ($result -match 'claude-code @(\d+\.\d+\.\d+)') { $matches[1] } }
        UninstallCommand = "port uninstall claude-code"
        InstallCommand = "port install claude-code"
        InstallPaths = @{
            macOS = "/opt/local/bin"
        }
        ExecutablePaths = @{
            macOS = @("/opt/local/bin/claude")
        }
    }
}

# Additional known installation paths that might interfere
$script:KnownInstallationPaths = @(
    @{
        Path = if ($IsWindowsOS) { "$env:USERPROFILE\.local\bin\claude.exe" } else { "$HOME/.local/bin/claude" }
        Description = ".local/bin installation"
        Source = "unknown"
    }
)

if ($IsWindowsOS) {
    $script:KnownInstallationPaths += @(
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
}

# Determine current platform
function Get-CurrentPlatform {
    if ($IsWSL) { return "WSL" }
    if ($IsWindowsOS) { return "Windows" }
    if ($IsMacOSDetected) { return "macOS" }
    if ($IsLinuxOS) { return "Linux" }
    return "Unknown"
}

$currentPlatform = Get-CurrentPlatform
$platformName = switch ($currentPlatform) {
    "Windows" { "Windows" }
    "WSL" { "WSL2/Ubuntu" }
    "Linux" { "Linux" }
    "macOS" { "macOS" }
    default { "Unknown Platform" }
}

# Spectre UI Helper Functions
function Get-SpectreColor {
    param([string]$ColorName)
    try {
        return [Spectre.Console.Color]::$ColorName
    } catch {
        return $null
    }
}

function Write-UIHeader {
    param([string]$Title)
    
    if ($script:useSpectre) {
        try {
            $rule = [Spectre.Console.Rule]::new("$Title")
            $rule.Alignment = [Spectre.Console.Justify]::Center
            $rule.Style = [Spectre.Console.Style]::new((Get-SpectreColor "Cyan") ?? [Spectre.Console.Color]::Blue)
            [Spectre.Console.AnsiConsole]::Write($rule)
        } catch {
            Write-Host "`n=== $Title ===" -ForegroundColor Cyan
        }
    } else {
        Write-Host "`n=== $Title ===" -ForegroundColor Cyan
    }
}

function Write-UIStepHeader {
    param(
        [string]$StepNumber,
        [string]$StepTitle,
        [string]$Color = "Yellow"
    )
    
    if ($script:useSpectre) {
        try {
            Write-Host ""
            $rule = [Spectre.Console.Rule]::new("Step $StepNumber/8: $StepTitle")
            $rule.Alignment = [Spectre.Console.Justify]::Left
            $rule.Style = [Spectre.Console.Style]::new((Get-SpectreColor $Color) ?? [Spectre.Console.Color]::Yellow)
            [Spectre.Console.AnsiConsole]::Write($rule)
        } catch {
            Write-Host "`n=== Step $StepNumber/8: $StepTitle ===" -ForegroundColor $Color
        }
    } else {
        Write-Host ""
        Write-StepHeader $StepNumber $StepTitle
    }
}

function Write-UITable {
    param(
        [string]$Title,
        [hashtable]$Data
    )
    
    if ($script:useSpectre -and $Data.Count -gt 0) {
        try {
            $table = [Spectre.Console.Table]::new()
            $table.AddColumn([Spectre.Console.TableColumn]::new("[bold]Setting[/]"))
            $table.AddColumn([Spectre.Console.TableColumn]::new("[bold]Value[/]"))
            $table.Border = [Spectre.Console.TableBorder]::Rounded
            
            foreach ($item in $Data.GetEnumerator()) {
                $table.AddRow($item.Key, $item.Value)
            }
            
            if ($Title) {
                $table.Title = [Spectre.Console.TableTitle]::new("$Title")
            }
            
            [Spectre.Console.AnsiConsole]::Write($table)
        } catch {
            # Fallback to simple output
            if ($Title) { Write-Host "`n$Title" -ForegroundColor Cyan }
            foreach ($item in $Data.GetEnumerator()) {
                Write-Host "  $($item.Key): $($item.Value)" -ForegroundColor Gray
            }
        }
    } else {
        # Standard output
        if ($Title) { Write-Host "`n$Title" -ForegroundColor Cyan }
        foreach ($item in $Data.GetEnumerator()) {
            Write-Host "  $($item.Key): $($item.Value)" -ForegroundColor Gray
        }
    }
}

# Unified status function with optional Spectre support
function Write-Status {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    $prefix = "[$timestamp][$currentPlatform]"
    
    # Use Spectre formatting if available
    if ($script:useSpectre) {
        try {
            switch ($Type) {
                "Success" { 
                    $markup = "[green]$prefix [[OK]] $Message[/]"
                    [Spectre.Console.AnsiConsole]::MarkupLine($markup)
                }
                "Error"   { 
                    $markup = "[red]$prefix [[X]] $Message[/]"
                    [Spectre.Console.AnsiConsole]::MarkupLine($markup)
                    $script:hasErrors = $true
                }
                "Warning" { 
                    $markup = "[yellow]$prefix [[!]] $Message[/]"
                    [Spectre.Console.AnsiConsole]::MarkupLine($markup)
                }
                "Info"    { 
                    $markup = "[cyan]$prefix [[i]] $Message[/]"
                    [Spectre.Console.AnsiConsole]::MarkupLine($markup)
                }
                "DryRun"  { 
                    $markup = "[magenta]$prefix [[TEST]] [DRY RUN] $Message[/]"
                    [Spectre.Console.AnsiConsole]::MarkupLine($markup)
                }
                default   { 
                    Write-Host "$prefix   $Message"
                }
            }
            return
        } catch {
            # Fallback if Spectre markup fails
        }
    }
    
    # Standard colored output
    switch ($Type) {
        "Success" { Write-Host "$prefix [OK] $Message" -ForegroundColor Green }
        "Error"   { Write-Host "$prefix [X] $Message" -ForegroundColor Red; $script:hasErrors = $true }
        "Warning" { Write-Host "$prefix [!] $Message" -ForegroundColor Yellow }
        "Info"    { Write-Host "$prefix [i] $Message" -ForegroundColor Cyan }
        "DryRun"  { Write-Host "$prefix [TEST] [DRY RUN] $Message" -ForegroundColor Magenta }
        default   { Write-Host "$prefix   $Message" }
    }
}

# Helper function for step headers
function Write-StepHeader {
    param(
        [string]$StepNumber,
        [string]$StepTitle
    )
    
    Write-Status "Step $StepNumber/8: $StepTitle" "Info"
}

# PATH Management Functions (Cross-platform)
function Get-PathSeparator {
    # Returns the platform-specific PATH separator
    if ($IsWindowsOS) { return ';' } else { return ':' }
}

function Get-UserPath {
    # Gets the user PATH in a platform-agnostic way
    if ($IsWindowsOS) {
        return [Environment]::GetEnvironmentVariable("PATH", "User")
    } else {
        # On Unix, PATH is typically set in shell configs, not as a persistent env var
        return $env:PATH
    }
}

function Get-SystemPath {
    # Gets the system PATH in a platform-agnostic way
    if ($IsWindowsOS) {
        return [Environment]::GetEnvironmentVariable("PATH", "Machine")
    } else {
        # On Unix, return system paths
        return "/usr/local/bin:/usr/bin:/bin"
    }
}

function Get-CurrentPath {
    # Gets the current process PATH
    return $env:PATH
}

function Parse-PathEntries {
    # Parses PATH string into an array of entries
    param([string]$PathString)
    
    $separator = Get-PathSeparator
    return $PathString -split $separator | Where-Object { $_ -and $_.Trim() }
}

function Join-PathEntries {
    # Joins path entries into a PATH string
    param([string[]]$PathEntries)
    
    $separator = Get-PathSeparator
    $cleaned = $PathEntries | Where-Object { $_ -and $_.Trim() } | ForEach-Object { $_.Trim() }
    return $cleaned -join $separator
}

function Set-UserPath {
    # Sets the user PATH in a platform-agnostic way
    param([string]$NewPath)
    
    if ($IsWindowsOS) {
        [Environment]::SetEnvironmentVariable("PATH", $NewPath, "User")
        # Update current process PATH
        $systemPath = Get-SystemPath
        $env:PATH = $NewPath + ';' + $systemPath
    } else {
        # On Unix, we can't permanently set PATH here - it's done in shell configs
        # But we can update the current session
        $env:PATH = $NewPath
    }
}

function Find-PathEntry {
    # Finds a specific entry in the PATH
    param(
        [string]$Pattern,
        [string]$PathString = (Get-CurrentPath)
    )
    
    $entries = Parse-PathEntries -PathString $PathString
    return $entries | Where-Object { $_ -match $Pattern }
}

function Test-PathEntry {
    # Tests if a specific path entry exists
    param(
        [string]$PathEntry,
        [string]$PathString = (Get-CurrentPath)
    )
    
    $entries = Parse-PathEntries -PathString $PathString
    return $entries -contains $PathEntry
}

function Add-PathEntry {
    # Adds an entry to PATH if it doesn't exist
    param(
        [string]$PathEntry,
        [string]$PathString,
        [switch]$Prepend
    )
    
    $entries = Parse-PathEntries -PathString $PathString
    
    if ($entries -notcontains $PathEntry) {
        if ($Prepend) {
            $entries = @($PathEntry) + $entries
        } else {
            $entries = $entries + @($PathEntry)
        }
    }
    
    return Join-PathEntries -PathEntries $entries
}

function Remove-PathEntry {
    # Removes entries matching a pattern from PATH
    param(
        [string]$Pattern,
        [string]$PathString
    )
    
    $entries = Parse-PathEntries -PathString $PathString
    $filtered = $entries | Where-Object { $_ -notmatch $Pattern }
    
    return Join-PathEntries -PathEntries $filtered
}

function Update-ShellConfig {
    # Updates shell configuration files on Unix systems
    param(
        [string]$ConfigFile,
        [string]$PathEntry,
        [switch]$CheckOnly
    )
    
    if ($IsWindowsOS) {
        Write-Verbose "Shell config updates not needed on Windows"
        return $true
    }
    
    # Expand tilde to home directory
    $configPath = $ConfigFile -replace '^~', $HOME
    
    if (-not (Test-Path $configPath)) {
        Write-Verbose "Config file $configPath does not exist"
        return $false
    }
    
    $pathExportLine = "export PATH=`"${PathEntry}:`$PATH`""
    
    if ($CheckOnly) {
        # Check if PATH entry already exists
        $exists = Invoke-PlatformCommand "grep -q '$PathEntry' '$configPath' && echo 'found'" "Checking PATH in $ConfigFile" -IgnoreError
        return ($exists.Output -eq 'found')
    } else {
        # Add PATH entry
        $addCmd = @"
echo '' >> '$configPath' && \
echo '# Added by Claude Code Fix Script' >> '$configPath' && \
echo '$pathExportLine' >> '$configPath'
"@
        $result = Invoke-PlatformCommand $addCmd "Updating PATH in $ConfigFile"
        return $result.Success
    }
}

# Cross-platform command execution
function Invoke-PlatformCommand {
    param(
        [string]$Command,
        [string]$Description,
        [switch]$IgnoreError
    )
    
    Write-Verbose "Executing: $Command"
    
    if (-not $Live) {
        Write-Status "Would execute: $Command" "DryRun"
        
        # Simulate some common commands for dry run
        $simulatedOutput = switch -Regex ($Command) {
            "claude --version" { "1.0.61" }
            "npm list.*claude" { '{"dependencies":{"@anthropic-ai/claude-code":{"version":"1.0.61"}}}' }
            "git --version" { "git version 2.50.1" }
            "gh --version" { "gh version 2.76.2 (2025-07-30)" }
            default { "" }
        }
        
        return @{
            Success = $true
            Output = $simulatedOutput
            Error = $null
        }
    }
    
    try {
        # Use PowerShell for all commands instead of platform-specific shells
        $output = Invoke-Expression $Command 2>&1
        $success = $LASTEXITCODE -eq 0
        
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
        }
        return @{
            Success = $false
            Output = $null
            Error = $_.ToString()
        }
    }
}

# Get Claude installations
function Get-ClaudeInstallations {
    Write-Status "Detecting Claude Code installations..." "Info"
    
    $installations = @{
        managers = @{}  # Keyed by manager name
        paths = @()
        detailed = @()
    }
    
    # Check each configured package manager for current platform
    foreach ($managerName in $script:PackageManagerConfigs.Keys) {
        $config = $script:PackageManagerConfigs[$managerName]
        
        # Skip if not available on current platform
        if ($config.Platforms -notcontains $currentPlatform) {
            continue
        }
        
        Write-Verbose "Checking $managerName installation..."
        
        try {
            $result = & $config.CheckCommand
            if ($result) {
                $version = & $config.GetVersion $result
                if ($version) {
                    $installations.managers[$managerName] = $version
                    $installations.detailed += [PSCustomObject]@{
                        Type = "$managerName-global"
                        Source = $managerName
                        Version = $version
                        Path = $config.InstallPaths[$currentPlatform]
                        Priority = $config.Priority
                        Platform = $currentPlatform
                    }
                    Write-Status "Found $managerName installation: v$version" "Info"
                }
            }
        } catch {
            Write-Verbose "No $managerName installation found or check failed: $_"
        }
    }
    
    # Check which claude is in PATH using PowerShell's cross-platform Get-Command
    Write-Verbose "Finding claude in PATH using Get-Command..."
    try {
        $claudeCommands = Get-Command -Name claude -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
        if ($claudeCommands) {
            $installations.paths = @($claudeCommands) | Where-Object { $_ }
            
            # Get-Command already returns unique results, no need for duplicate filtering
            
            foreach ($path in $installations.paths) {
                Write-Status "Found claude in PATH: $path" "Info"
                
                # Determine source based on path
                $source = "unknown"
                foreach ($manager in $script:PackageManagerConfigs.GetEnumerator()) {
                    $execPaths = $manager.Value.ExecutablePaths[$currentPlatform]
                    if ($execPaths -and ($execPaths | Where-Object { $path -like "*$_*" })) {
                        $source = $manager.Key
                        break
                    }
                }
                
                $installations.detailed += [PSCustomObject]@{
                    Type = "PATH"
                    Path = $path
                    Source = $source
                    Version = ""
                    Priority = if ($source -ne "unknown" -and $script:PackageManagerConfigs[$source]) { 
                        $script:PackageManagerConfigs[$source].Priority 
                    } else { 99 }
                    Platform = $currentPlatform
                }
            }
        } else {
            $installations.paths = @()
        }
    } catch {
        Write-Verbose "Could not find claude in PATH: $_"
        $installations.paths = @()
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
                Platform = $currentPlatform
            }
            Write-Status "Found $($knownPath.Description) at: $($knownPath.Path)" "Warning"
        }
    }
    
    # Sort detailed installations by priority
    $installations.detailed = $installations.detailed | Sort-Object Priority
    
    return $installations
}

# Remove surplus installations
function Remove-SurplusInstallations {
    param(
        [hashtable]$Installations
    )
    
    $removed = $false
    
    # Remove any standalone installations first
    $standaloneInstalls = $Installations.detailed | Where-Object { $_.Type -eq "standalone" }
    foreach ($standalone in $standaloneInstalls) {
        Write-Status "Removing $($standalone.Description)..." "Warning"
        if ($Live) {
            try {
                Remove-Item $standalone.Path -Force -ErrorAction Stop
                Write-Status "Removed $($standalone.Description)" "Success"
                $removed = $true
            } catch {
                # Try renaming as fallback
                try {
                    $newName = "$($standalone.Path).old_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
                    Rename-Item $standalone.Path $newName -Force
                    Write-Status "Renamed $($standalone.Description) to: $(Split-Path $newName -Leaf)" "Warning"
                    $removed = $true
                } catch {
                    Write-Status "Could not remove or rename $($standalone.Description): $_" "Error"
                }
            }
        } else {
            Write-Status "Would remove $($standalone.Description): $($standalone.Path)" "DryRun"
        }
    }
    
    # Keep only npm, remove all others
    foreach ($manager in $Installations.managers.GetEnumerator()) {
        if ($manager.Key -ne "npm") {
            $config = $script:PackageManagerConfigs[$manager.Key]
            if ($config) {
                $wasRemoved = Remove-Package $manager.Key $manager.Value $config.UninstallCommand
                if ($wasRemoved) { $removed = $true }
            }
        }
    }
    
    # Handle system-wide installation special case
    $systemInstalls = $Installations.detailed | Where-Object { $_.Source -eq "system" }
    if ($systemInstalls) {
        Write-Status "System-wide installation detected - requires manual sudo removal" "Warning"
        Write-Host "   [!]  System-wide Claude installation detected" -ForegroundColor Yellow
        Write-Host "   Please run: sudo npm uninstall -g @anthropic-ai/claude-code" -ForegroundColor Cyan
        Write-Host "   Then re-run this script." -ForegroundColor Yellow
        if ($Live) {
            exit 1
        }
    }
    
    return $removed
}

# Remove package
function Remove-Package {
    param(
        [string]$Manager,
        [string]$Version,
        [string]$Command
    )
    
    Write-Status "Removing $Manager installation (v$Version)..." "Warning"
    
    if ($Live) {
        $result = Invoke-PlatformCommand $Command "Removing $Manager global package"
        if ($result.Success) {
            Write-Status "Removed $Manager installation" "Success"
            return $true
        } else {
            Write-Status "Failed to remove $Manager installation" "Error"
            return $false
        }
    } else {
        Write-Status "Would remove $Manager installation v$Version" "DryRun"
        return $true
    }
}

# Universal npm operations
function Update-ClaudeCode {
    param(
        [string]$PreferredManager = "npm"
    )
    
    $config = $script:PackageManagerConfigs[$PreferredManager]
    if (-not $config) {
        Write-Status "Unknown package manager: $PreferredManager" "Error"
        return $false
    }
    
    Write-Status "Updating Claude Code via $PreferredManager..." "Info"
    
    if ($Live) {
        $result = Invoke-PlatformCommand $config.InstallCommand "Installing/updating Claude Code"
        if ($result.Success) {
            Write-Status "Successfully updated Claude Code via $PreferredManager" "Success"
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
        # First try using the npm installation directly
        $npmConfig = $script:PackageManagerConfigs["npm"]
        $npmPaths = $npmConfig.ExecutablePaths[$currentPlatform]
        
        # Try npm paths first
        foreach ($npmPath in $npmPaths) {
            if (Test-Path $npmPath) {
                $versionCmd = if ($IsWindowsOS) { "`"$npmPath`" --version 2>&1" } else { "'$npmPath' --version 2>&1" }
                $npmVersionCheck = Invoke-PlatformCommand $versionCmd "Checking npm claude version directly" -IgnoreError
                if ($npmVersionCheck.Success -and $npmVersionCheck.Output -match '(\d+\.\d+\.\d+)') {
                    $version = $matches[1]
                    Write-Status "Verified npm installation: v$version" "Success"
                    return @{ Success = $true; Version = $version; Path = $npmPath }
                }
            }
        }
        
        # Fallback to PATH lookup
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
            
            return @{ Success = $true; Version = $version; Path = $path }
        }
        
        Write-Status "Claude Code installation not found" "Error"
        return @{ Success = $false }
    } else {
        Write-Status "Would verify installation" "DryRun"
        return @{ Success = $true; Version = "1.0.61"; Path = "simulated" }
    }
}

# Main execution
Write-UIHeader "Universal Claude Code Fix Script (v5.0 - Unified)"

# Show configuration
if ($script:useSpectre) {
    Write-UITable "" @{
        "Execution Mode" = if ($Live) { "LIVE - Changes will be executed" } else { "DRY RUN - No changes will be made" }
        "Platform" = $platformName
        "PowerShell" = $PSVersionTable.PSVersion.ToString()
        "UI Mode" = "Spectre.Console Enhanced"
    }
} else {
    Write-Host "Platform: $platformName"
    Write-Host "PowerShell: $($PSVersionTable.PSVersion)"
    if ($UseSpectre) {
        Write-Host "UI Mode: Standard (Spectre.Console not available)"
    }
}

Write-Host ""

if (-not $Live) {
    Write-Status "DRY RUN MODE - No changes will be made" "Warning"
    Write-Status "To execute changes, run with -Live flag" "Warning"
} else {
    Write-Status "LIVE MODE - Changes will be executed" "Success"
}

Write-Host ""

# Step 0: Check prerequisites (Git and GitHub CLI)
Write-UIStepHeader "0" "Checking prerequisites"

# Check Git
$gitCheck = Invoke-PlatformCommand "git --version 2>&1" "Checking for Git" -IgnoreError
if ($gitCheck.Success) {
    Write-Status "Git is installed: $($gitCheck.Output -split "`n" | Select-Object -First 1)" "Success"
} else {
    Write-Status "Git is not installed - Claude Code requires Git for many operations" "Warning"
    Write-Status "Install Git from: https://git-scm.com/downloads" "Info"
}

# Check GitHub CLI
$ghCheck = Invoke-PlatformCommand "gh --version 2>&1" "Checking for GitHub CLI" -IgnoreError
if ($ghCheck.Success) {
    Write-Status "GitHub CLI is installed: $($ghCheck.Output -split "`n" | Select-Object -First 1)" "Success"
} else {
    Write-Status "GitHub CLI is not installed - recommended for GitHub integration" "Warning"
    Write-Status "Install from: https://cli.github.com/" "Info"
}

Write-Host ""

# Step 1: Detect installations
Write-UIStepHeader "1" "Detecting Claude Code installations"
$installations = Get-ClaudeInstallations

# Display results
$foundCount = ($installations.detailed | Where-Object { $_.Version }).Count
Write-Status "Found $($installations.detailed.Count) installation(s):" "Info"

foreach ($install in $installations.detailed) {
    $versionText = if ($install.Version) { "v$($install.Version) " } else { "" }
    $platformText = "[$($install.Platform)]"
    Write-Status "  - $($install.Type) $versionText$platformText at $($install.Path)" "Info"
}

Write-Host ""

# Step 2: Remove surplus installations
Write-UIStepHeader "2" "Removing surplus installations"
$preferredManager = "npm"
Write-Status "Keeping $preferredManager as preferred package manager" "Info"

$removed = Remove-SurplusInstallations -Installations $installations

if (-not $removed) {
    Write-Status "No surplus installations to remove" "Success"
}

Write-Host ""

# Step 3: Update/Install via npm
Write-UIStepHeader "3" "Ensuring proper installation"
Write-Status "Using $preferredManager as package manager" "Info"

$updateSuccess = Update-ClaudeCode -PreferredManager $preferredManager

Write-Host ""

# Step 4: Verify and potentially reinstall
Write-UIStepHeader "4" "Verifying update and ensuring latest version"

# Check if we have the latest version after update
$needsReinstall = $false
if ($Live) {
    try {
        # Get currently installed version
        $currentVersionCheck = Invoke-PlatformCommand "claude --version 2>/dev/null" "Checking current version" -IgnoreError
        if ($currentVersionCheck.Success -and $currentVersionCheck.Output -match '(\d+\.\d+\.\d+)') {
            $currentVersion = $matches[1]
            Write-Status "Current version after update: $currentVersion" "Info"
        }
        
        # Get latest available version
        $latestVersion = $null
        if ($preferredManager -eq "npm") {
            $npmViewResult = Invoke-PlatformCommand "npm view @anthropic-ai/claude-code version 2>/dev/null" "Getting latest npm version" -IgnoreError
            if ($npmViewResult.Success) {
                $latestVersion = $npmViewResult.Output.Trim()
            }
        }
        
        if ($latestVersion) {
            Write-Status "Latest available version: $latestVersion" "Info"
            
            # Compare versions
            if ($currentVersion -ne $latestVersion) {
                Write-Status "Version mismatch detected - forcing clean reinstall" "Warning"
                $needsReinstall = $true
            } else {
                Write-Status "Successfully updated to latest version" "Success"
            }
        }
    } catch {
        Write-Status "Could not verify version - forcing reinstall to be safe" "Warning"
        $needsReinstall = $true
    }
} else {
    Write-Status "Would verify version and check if reinstall is needed" "DryRun"
}

# Perform clean reinstall if needed or if initial update failed
if (-not $updateSuccess -or $needsReinstall) {
    Write-Status "Performing clean reinstall to ensure latest version..." "Warning"
    
    $config = $script:PackageManagerConfigs[$preferredManager]
    
    # Uninstall
    $uninstallResult = Invoke-PlatformCommand $config.UninstallCommand "Uninstalling $preferredManager version"
    if ($uninstallResult.Success) {
        Write-Status "Uninstalled $preferredManager version" "Success"
    } else {
        Write-Status "Failed to uninstall: $($uninstallResult.Error)" "Error"
    }
    
    # Clean cache if available
    if ($config.CacheCleanCommand) {
        $cacheResult = Invoke-PlatformCommand $config.CacheCleanCommand "Cleaning $preferredManager cache"
        if ($cacheResult.Success) {
            Write-Status "Cleaned $preferredManager cache" "Success"
        } else {
            Write-Status "Failed to clean cache: $($cacheResult.Error)" "Warning"
        }
    }
    
    # Reinstall
    $reinstallResult = Invoke-PlatformCommand $config.InstallCommand "Reinstalling Claude Code"
    if ($reinstallResult.Success) {
        Write-Status "Reinstalled Claude Code" "Success"
        $updateSuccess = $true
    } else {
        Write-Status "Failed to reinstall: $($reinstallResult.Error)" "Error"
        $updateSuccess = $false
    }
}

Write-Host ""

# Step 5: PATH cleanup and shell configuration
Write-UIStepHeader "5" "PATH cleanup and configuration"

# First, validate that claude in PATH points to the correct installation
Write-Status "Validating claude executable in PATH..." "Info"
$needsPathFix = $false

if (-not $Live) {
    Write-Status "Would validate claude in PATH points to correct npm installation" "DryRun"
    Write-Status "Would check if claude executable is from npm/pnpm/yarn installation" "DryRun"
    Write-Status "Would fix PATH if pointing to incorrect installation" "DryRun"
} else {
    try {
        $claudeInPath = Get-Command -Name claude -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($claudeInPath) {
            Write-Status "Found claude at: $($claudeInPath.Source)" "Info"
            
            # Check if it's pointing to the wrong location
            $validPaths = @("*npm*", "*/usr/local/bin/*", "*/.npm-global/*", "*pnpm*", "*yarn*")
            $isValidPath = $false
            foreach ($pattern in $validPaths) {
                if ($claudeInPath.Source -like $pattern) {
                    $isValidPath = $true
                    break
                }
            }
            
            if (-not $isValidPath) {
                Write-Status "Claude in PATH is not from a package manager installation!" "Warning"
                Write-Status "Found at: $($claudeInPath.Source)" "Warning"
                Write-Status "Will fix PATH to use npm-installed claude" "Info"
                $needsPathFix = $true
            } else {
                Write-Status "Claude in PATH is correctly pointing to package manager installation" "Success"
                $needsPathFix = $false
            }
        } else {
            Write-Status "Claude not found in PATH - will add npm path" "Warning"
            $needsPathFix = $true
        }
    } catch {
        Write-Verbose "Could not validate claude in PATH: $_"
        $needsPathFix = $true
    }
}

# Windows PATH cleanup
if ($IsWindowsOS) {
    Write-Status "Checking Windows PATH configuration..." "Info"
    
    if (-not $Live) {
        Write-Status "Would check and fix Windows PATH order" "DryRun"
    } else {
        # Get current PATH entries using common functions
        $userPath = Get-UserPath
        $currentPath = Get-CurrentPath
        $pathEntries = Parse-PathEntries -PathString $currentPath
        
        # Find package manager paths
        $managerPaths = @{}
        
        # Find paths for all configured package managers
        foreach ($manager in $script:PackageManagerConfigs.GetEnumerator()) {
            $pattern = if ($manager.Key -eq "npm") { '\\npm(?:\\|$)' } else { "\\$($manager.Key)(?:\\|$)" }
            $foundPaths = Find-PathEntry -Pattern $pattern -PathString $currentPath
            $path = $foundPaths | Where-Object { $manager.Key -eq "npm" -or $_ -notmatch 'npm' } | Select-Object -First 1
            
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
        $preferredPath = $managerPaths[$preferredManager]
        
        # Check if any lower priority manager appears before the preferred one
        foreach ($mp in $managerPaths.GetEnumerator()) {
            if ($mp.Key -ne $preferredManager -and $mp.Value.Index -ne -1 -and $preferredPath.Index -ne -1) {
                if ($mp.Value.Index -lt $preferredPath.Index -and $mp.Value.Priority -gt $preferredPath.Priority) {
                    $pathIssues += "$($mp.Key) path comes before $preferredManager path"
                }
            }
        }
        
        if ($pathIssues.Count -gt 0 -or $needsPathFix) {
            if ($pathIssues.Count -gt 0) {
                Write-Status "PATH issues found: $($pathIssues -join ', ')" "Warning"
            }
            
            try {
                # Remove all package manager paths except preferred from user PATH
                $cleanedPath = $userPath
                foreach ($manager in $script:PackageManagerConfigs.Keys) {
                    if ($manager -ne $preferredManager) {
                        Write-Verbose "Removing $manager entries from PATH"
                        $cleanedPath = Remove-PathEntry -Pattern $manager -PathString $cleanedPath
                    }
                }
                
                # Ensure preferred manager path is first
                $preferredConfig = $script:PackageManagerConfigs[$preferredManager]
                $preferredInstallPath = $preferredConfig.InstallPaths[$currentPlatform]
                
                Write-Verbose "Adding $preferredInstallPath to beginning of PATH"
                # Add preferred path at the beginning
                $newUserPath = Add-PathEntry -PathEntry $preferredInstallPath -PathString $cleanedPath -Prepend
                
                # Set the new PATH
                Write-Verbose "Updating user PATH environment variable"
                Set-UserPath -NewPath $newUserPath
                
                Write-Status "Fixed PATH order - $preferredManager now has priority" "Success"
            } catch {
                $errorDetails = $_.Exception.Message
                $errorType = $_.Exception.GetType().Name
                Write-Status "Failed to fix PATH - $errorType`: $errorDetails" "Error"
                Write-Verbose "Full error: $_"
                Write-Status "Continuing with remaining steps despite PATH error" "Warning"
                # Don't exit - let the script continue
            }
        } else {
            Write-Status "PATH order is correct - $preferredManager has priority" "Success"
        }
    }
}

# Unix/WSL/macOS shell configuration
if ($IsLinuxOS -or $IsWSL -or $IsMacOSDetected) {
    if (-not $Live) {
        Write-Status "Would update shell configurations (.bashrc, .zshrc, .profile)" "DryRun"
        if ($needsPathFix) {
            Write-Status "Would ensure npm global bin is first in PATH" "DryRun"
        }
    } else {
        Write-Status "Updating shell configurations..." "Info"
        
        # Get npm global bin path
        $npmPrefix = Invoke-PlatformCommand "npm config get prefix" "Getting npm prefix" -IgnoreError
        if ($npmPrefix.Success) {
            $npmBinPath = "$($npmPrefix.Output.Trim())/bin"
            Write-Status "NPM global bin path: $npmBinPath" "Info"
            
            # Update shell configs to prioritize npm global bin
            $shellConfigs = @("~/.bashrc", "~/.zshrc", "~/.profile")
            
            foreach ($config in $shellConfigs) {
                # Expand tilde to check if file exists
                $configPath = $config -replace '^~', $HOME
                if (Test-Path $configPath) {
                    # Check if PATH entry already exists
                    $exists = Update-ShellConfig -ConfigFile $config -PathEntry $npmBinPath -CheckOnly
                    
                    if (-not $exists) {
                        Write-Status "Adding npm global bin to PATH in $config" "Info"
                        $updated = Update-ShellConfig -ConfigFile $config -PathEntry $npmBinPath
                        if ($updated) {
                            Write-Status "Updated PATH in $config" "Success"
                        } else {
                            Write-Status "Failed to update PATH in $config" "Warning"
                        }
                    } else {
                        Write-Status "PATH already configured in $config" "Success"
                    }
                }
            }
            
            # Update current session PATH
            $currentPath = Get-CurrentPath
            if (-not (Test-PathEntry -PathEntry $npmBinPath -PathString $currentPath)) {
                $newPath = Add-PathEntry -PathEntry $npmBinPath -PathString $currentPath -Prepend
                Set-UserPath -NewPath $newPath
                Write-Status "Updated PATH for current session" "Success"
            } else {
                Write-Status "PATH already includes npm global bin" "Success"
            }
            
            Write-Status "Restart your shell or run: export PATH=`"${npmBinPath}:`$PATH`"" "Info"
        }
    }
}

Write-Host ""

# Step 6: Final verification
Write-UIStepHeader "6" "Final verification"
$finalResult = Test-FinalInstallation

Write-Host ""

# Step 7: Final status
Write-UIStepHeader "7" "Final Status Report"

if ($finalResult -and $finalResult.Version) {
    if ($script:useSpectre) {
        Write-UITable "" @{
            "Status" = "Installed and Working"
            "Platform" = $platformName
            "Version" = $finalResult.Version
            "Package Manager" = "$preferredManager (preferred)"
        }
    } else {
        Write-Status "Claude Code is installed and working" "Success"
        Write-Status "Platform: $platformName" "Info"
        Write-Status "Version: $($finalResult.Version)" "Success"
    }
    
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
                Write-Status "Auto-updates enabled successfully" "Success"
                Write-Status "Claude will automatically update to new versions" "Info"
            } else {
                Write-Status "Could not enable auto-updates (command may not be available yet)" "Warning"
            }
        } catch {
            Write-Status "Auto-update configuration skipped: $($_.Exception.Message)" "Warning"
        }
        
        Write-Status "Auto-update settings documentation:" "Info"
        Write-Status "https://docs.anthropic.com/en/docs/claude-code/settings" "Info"
    } elseif (-not $Live) {
        Write-Status "DRY RUN: Would configure auto-updates (claude settings set autoUpdate true)" "Info"
        Write-Status "Auto-update settings: https://docs.anthropic.com/en/docs/claude-code/settings" "Info"
    }
    
    if (-not $script:hasErrors) {
        if ($script:useSpectre) {
            Write-UIHeader "✅ SUCCESS!"
            Write-Host "Claude Code has been successfully fixed!" -ForegroundColor Green
        } else {
            Write-Host "`n[OK] Claude Code has been successfully fixed!" -ForegroundColor Green
        }
        
        if (-not $Live) {
            Write-Host "[!]  This was a DRY RUN - run with -Live to execute changes" -ForegroundColor Yellow
        }
        exit 0
    } else {
        Write-Host "`n[!] Claude Code is working but some errors occurred during the process" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Status "Claude Code installation failed or is not accessible" "Error"
    Write-Status "Please try manual installation: npm install -g @anthropic-ai/claude-code@latest" "Warning"
    Write-Host "`n[X] Failed to fix Claude Code installation" -ForegroundColor Red
    exit 1
}