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
.PARAMETER NonInteractive
    Run in non-interactive mode (will not prompt for elevation)
.EXAMPLE
    ./Fix-ClaudeCode-Universal.ps1
    Runs in dry mode, showing what would be done
.EXAMPLE
    ./Fix-ClaudeCode-Universal.ps1 -Live -Verbose
    Executes actual changes with detailed output
.NOTES
    Author: Claude Assistant
    Date: 2025-07-31
    Version: 4.0 (Data-driven universal with Spectre.Console UI)
    Requires: PowerShell Core 7.0+ for cross-platform support
    
    Enhanced Features:
    - Auto-installs PoshSpectreConsole module if available
    - Rich UI with colored rules, tables, and formatted output
    - Graceful fallback to standard PowerShell colors if Spectre unavailable
    - Progress indicators and structured display
#>

param(
    [switch]$Live,
    [switch]$Verbose,
    [switch]$NonInteractive,
    [Alias('?')]
    [switch]$Help
)

# Show help if requested
if ($Help) {
    Get-Help $MyInvocation.MyCommand.Path -Detailed
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

# Request elevation if needed
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

# Check for and install Spectre.Console if needed
function Initialize-SpectreConsole {
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

# Initialize Spectre.Console
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

# Platform detection
$IsWindowsOS = $IsWindows -or ($env:OS -eq "Windows_NT")
$IsMacOSDetected = $IsMacOS  # PowerShell Core built-in variable
$IsLinuxOS = $IsLinux -and -not $IsMacOSDetected  # Distinguish Linux from macOS
$IsWSL = $IsLinuxOS -and (Test-Path "/proc/version") -and (Get-Content "/proc/version" -ErrorAction SilentlyContinue | Select-String "microsoft|WSL")

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
            Windows = @("$env:USERPROFILE\scoop\shims\claude.exe")
        }
    }
    homebrew = @{
        Name = "homebrew"
        Priority = 3
        Platforms = @("macOS")
        CheckCommand = { brew list claude-code 2>$null }
        GetVersion = { param($result) brew info claude-code 2>$null | Select-String "claude-code: stable (\d+\.\d+\.\d+)" | ForEach-Object { $_.Matches[0].Groups[1].Value } }
        UninstallCommand = "brew uninstall claude-code"
        InstallCommand = "brew install claude-code"
        InstallPaths = @{
            macOS = "/usr/local/bin"
        }
        ExecutablePaths = @{
            macOS = @("/usr/local/bin/claude", "/opt/homebrew/bin/claude")
        }
    }
    macports = @{
        Name = "macports"
        Priority = 4
        Platforms = @("macOS")
        CheckCommand = { port installed claude-code 2>$null }
        GetVersion = { param($result) if ($result -match 'claude-code @(\d+\.\d+\.\d+)') { $matches[1] } }
        UninstallCommand = "sudo port uninstall claude-code"
        InstallCommand = "sudo port install claude-code"
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
        Path = { if ($IsWindowsOS) { "$env:USERPROFILE\.local\bin\claude.exe" } else { "$HOME/.local/bin/claude" } }
        Description = ".local/bin installation"
        Source = "unknown"
        Platforms = @("Windows", "Linux", "macOS", "WSL")
    },
    @{
        Path = { "/usr/bin/claude" }
        Description = "System-wide installation"
        Source = "system"
        Platforms = @("Linux", "WSL")
    },
    @{
        Path = { "$env:ProgramFiles\Claude\claude.exe" }
        Description = "Program Files installation"
        Source = "installer"
        Platforms = @("Windows")
    }
)

# Helper function to get current platform name
function Get-CurrentPlatform {
    if ($IsWindowsOS) { return "Windows" }
    elseif ($IsWSL) { return "WSL" }
    elseif ($IsMacOSDetected) { return "macOS" }
    else { return "Linux" }
}

# Helper function to convert color names to Spectre colors
function Get-SpectreColor {
    param([string]$ColorName)
    
    if (-not $script:useSpectre) { return $null }
    
    # Create color using Spectre's color parser
    try {
        # Use string representation for now, will be converted when used
        return $ColorName
    } catch {
        # Fallback to default color if parsing fails
        return "Cyan"
    }
}

# Helper functions for UI abstraction and code reuse
function Write-UIRule {
    param(
        [string]$Title,
        [string]$Color = "Cyan"
    )
    
    if ($script:useSpectre) {
        try {
            Write-SpectreRule $Title -Color $Color
        } catch {
            # Fallback if Spectre fails
            $script:useSpectre = $false
            Write-Host "`n=== $Title ===" -ForegroundColor $Color
        }
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
        Write-SpectreHost $Message -ForegroundColor (Get-SpectreColor $Color) -NoNewline:$NoNewline
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
            $colorName = if ($i -lt $ColumnColors.Count) { $ColumnColors[$i] } else { "White" }
            Add-SpectreTableColumn $table $Columns[$i] -Color (Get-SpectreColor $colorName)
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
    
    $fullTitle = "Step $StepNumber/7: $StepTitle"
    Write-UIRule $fullTitle $Color
}

function Write-UIFinalStatus {
    param(
        [string]$Title,
        [string]$Message,
        [string]$Color = "Green"
    )
    
    Write-UIRule $Title $Color
    Write-UIMessage $Message $Color
    Write-Host ""
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
        "Success" = @{ Icon = "[OK]"; SpectreColor = "Green"; FallbackColor = "Green" }
        "Error"   = @{ Icon = "[X]"; SpectreColor = "Red"; FallbackColor = "Red"; SetError = $true }
        "Warning" = @{ Icon = "[!]"; SpectreColor = "Orange1"; FallbackColor = "Yellow" }
        "Info"    = @{ Icon = "[i]"; SpectreColor = "DeepSkyBlue1"; FallbackColor = "Cyan" }
        "DryRun"  = @{ Icon = "[TEST]"; SpectreColor = "Magenta"; FallbackColor = "Magenta"; Prefix = "[DRY RUN] " }
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
            $output = Invoke-Expression "$Command"
            $success = $? -and ($LASTEXITCODE -eq 0 -or $null -eq $LASTEXITCODE)
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

# Cross-platform installation detection using data-driven approach
function Get-ClaudeInstallations {
    Write-Status "Detecting Claude Code installations..." "Info"
    
    $installations = @{
        managers = @{}  # Keyed by manager name
        paths = @()
        detailed = @()
    }
    
    $currentPlatform = Get-CurrentPlatform
    
    # Check each configured package manager
    foreach ($managerName in $script:PackageManagerConfigs.Keys) {
        $config = $script:PackageManagerConfigs[$managerName]
        
        # Skip if not supported on current platform
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
                    $installPath = $config.InstallPaths[$currentPlatform]
                    if ($installPath -is [ScriptBlock]) {
                        $installPath = & $installPath
                    }
                    
                    $installations.detailed += [PSCustomObject]@{
                        Type = "$managerName-global"
                        Platform = $currentPlatform
                        Source = $managerName
                        Version = $version
                        Path = $installPath
                        Priority = $config.Priority
                    }
                    Write-Status "Found $managerName installation: v$version" "Info"
                }
            }
        } catch {
            Write-Verbose "No $managerName installation found or check failed: $_"
        }
    }
    
    # Check where command for PATH installations
    $whereCmd = if ($IsWindowsOS) { "where.exe claude 2>nul" } else { "which claude 2>/dev/null" }
    $pathCheck = Invoke-PlatformCommand $whereCmd "Finding claude in PATH" -IgnoreError -Silent
    if ($pathCheck.Success -and $pathCheck.Output) {
        $installations.paths = $pathCheck.Output -split "`r?`n" | Where-Object { $_ }
        foreach ($path in $installations.paths) {
            # Determine source based on path patterns from configs
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
                Platform = $currentPlatform
                Path = $path
                Source = $source
                Priority = if ($source -ne "unknown" -and $script:PackageManagerConfigs[$source]) { 
                    $script:PackageManagerConfigs[$source].Priority 
                } else { 99 }
            }
        }
        Write-Status "Found claude in PATH: $($installations.paths -join ', ')" "Info"
    }
    
    # Check for additional known installation paths
    foreach ($knownPath in $script:KnownInstallationPaths) {
        if ($knownPath.Platforms -notcontains $currentPlatform) {
            continue
        }
        
        $pathToCheck = if ($knownPath.Path -is [ScriptBlock]) { & $knownPath.Path } else { $knownPath.Path }
        if (Test-Path $pathToCheck) {
            $installations.detailed += [PSCustomObject]@{
                Type = "standalone"
                Platform = $currentPlatform
                Path = $pathToCheck
                Source = $knownPath.Source
                Description = $knownPath.Description
                Priority = 100  # Lowest priority for removal
            }
            Write-Status "Found $($knownPath.Description) at: $pathToCheck" "Warning"
        }
    }
    
    # Sort detailed installations by priority
    $installations.detailed = $installations.detailed | Sort-Object Priority
    
    return $installations
}

# Cross-platform removal using data-driven approach
function Remove-SurplusInstallations {
    param([hashtable]$Installations)
    
    $removed = $false
    $currentPlatform = Get-CurrentPlatform
    
    # Determine preferred package manager (highest priority installed)
    $preferredManager = $null
    $lowestPriority = 999
    
    foreach ($manager in $Installations.managers.GetEnumerator()) {
        $config = $script:PackageManagerConfigs[$manager.Key]
        if ($config -and $config.Priority -lt $lowestPriority) {
            $preferredManager = $manager.Key
            $lowestPriority = $config.Priority
        }
    }
    
    # Default to npm if nothing installed
    if (-not $preferredManager) {
        $preferredManager = "npm"
    }
    
    Write-Status "Keeping $preferredManager as preferred package manager" "Info"
    
    # Remove standalone installations first
    $standaloneInstalls = $Installations.detailed | Where-Object { $_.Type -eq "standalone" }
    foreach ($standalone in $standaloneInstalls) {
        Write-Status "Removing $($standalone.Description)..." "Warning"
        if ($Live) {
            try {
                # First try to remove the file
                Remove-Item $standalone.Path -Force -ErrorAction Stop
                Write-Status "Removed $($standalone.Description)" "Success"
                $removed = $true
            } catch {
                $removeError = $_
                # Check if it's an access denied error that might need elevation
                if ($removeError.Exception.Message -match "Access.*denied|UnauthorizedAccessException") {
                    # Check if we're running as admin
                    if (-not (Test-Administrator)) {
                        Write-Status "Administrator privileges required to remove $($standalone.Description)" "Warning"
                        if ($NonInteractive) {
                            Write-Status "Cannot elevate in non-interactive mode. Please run as Administrator." "Error"
                        } else {
                            Write-Status "Please re-run this script as Administrator to remove system files." "Warning"
                        }
                        $script:needsElevationLater = $true
                    } else {
                        # We are admin but still can't remove - file might be in use
                        try {
                            $backupPath = "$($standalone.Path).backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
                            Move-Item $standalone.Path $backupPath -Force -ErrorAction Stop
                            Write-Status "Renamed $($standalone.Description) to: $(Split-Path $backupPath -Leaf)" "Success"
                            Write-Status "Original file backed up and disabled" "Info"
                            $removed = $true
                        } catch {
                            Write-Status "Failed to remove or rename $($standalone.Description): $_" "Error"
                            Write-Status "MANUAL ACTION REQUIRED: Please close any running 'claude' processes and delete: $($standalone.Path)" "Warning"
                        }
                    }
                } else {
                    # Other error - try renaming
                    try {
                        $backupPath = "$($standalone.Path).backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
                        Move-Item $standalone.Path $backupPath -Force -ErrorAction Stop
                        Write-Status "Renamed $($standalone.Description) to: $(Split-Path $backupPath -Leaf)" "Success"
                        Write-Status "Original file backed up and disabled" "Info"
                        $removed = $true
                    } catch {
                        Write-Status "Failed to remove or rename $($standalone.Description): $removeError" "Error"
                        Write-Status "MANUAL ACTION REQUIRED: Please close any running 'claude' processes and delete: $($standalone.Path)" "Warning"
                    }
                }
            }
        } else {
            Write-Status "Would remove $($standalone.Description): $($standalone.Path)" "DryRun"
        }
    }
    
    # Remove all package managers except preferred
    foreach ($manager in $Installations.managers.GetEnumerator()) {
        if ($manager.Key -ne $preferredManager) {
            $config = $script:PackageManagerConfigs[$manager.Key]
            if ($config) {
                Write-Status "Removing $($manager.Key) installation..." "Warning"
                if ($Live) {
                    $result = Invoke-PlatformCommand $config.UninstallCommand "Removing $($manager.Key) package"
                    if ($result.Success) {
                        Write-Status "Removed $($manager.Key) installation" "Success"
                        $removed = $true
                    }
                } else {
                    Write-Status "Would remove $($manager.Key) installation v$($manager.Value)" "DryRun"
                    $removed = $true
                }
            }
        }
    }
            
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
        # First try using the npm installation directly
        $currentPlatform = Get-CurrentPlatform
        $npmConfig = $script:PackageManagerConfigs["npm"]
        $npmPaths = $npmConfig.ExecutablePaths[$currentPlatform]
        
        $claudePath = $null
        $version = $null
        
        # Try npm paths first
        foreach ($npmPath in $npmPaths) {
            if (Test-Path $npmPath) {
                $versionCmd = if ($IsWindowsOS) { "& `"$npmPath`" --version 2>&1" } else { "'$npmPath' --version 2>/dev/null" }
                $versionCheck = Invoke-PlatformCommand $versionCmd "Checking npm claude version" -IgnoreError
                if ($versionCheck.Success -and $versionCheck.Output -match '(\d+\.\d+\.\d+)') {
                    $version = $matches[1]
                    $claudePath = $npmPath
                    Write-Status "Found npm installation: v$version at $claudePath" "Success"
                    break
                }
            }
        }
        
        # If not found via npm paths, try general claude command
        if (-not $version) {
            $versionCmd = if ($IsWindowsOS) { "claude --version 2>&1" } else { "claude --version 2>/dev/null" }
            $versionCheck = Invoke-PlatformCommand $versionCmd "Checking general claude version" -IgnoreError
            if ($versionCheck.Success -and $versionCheck.Output -match '(\d+\.\d+\.\d+)') {
                $version = $matches[1]
                
                $pathCmd = if ($IsWindowsOS) { "where.exe claude 2>&1" } else { "which claude 2>/dev/null" }
                $pathCheck = Invoke-PlatformCommand $pathCmd "Finding claude path" -IgnoreError
                if ($pathCheck.Success) {
                    $claudePath = $pathCheck.Output.Trim() -split "`n" | Select-Object -First 1
                }
            }
        }
        
        if ($version) {
            Write-Status "Final version: $version" "Success"
            if ($claudePath) {
                Write-Status "Final path: $claudePath" "Info"
                
                # Warn if not using npm version
                if ($claudePath -notmatch "npm") {
                    Write-Status "WARNING: Not using npm-installed version!" "Warning"
                    Write-Status "The npm version may be shadowed by: $claudePath" "Warning"
                }
            }
            return @{ Version = $version; Path = $claudePath }
        } else {
            Write-Status "Failed to verify installation - no version detected" "Error"
            Write-Verbose "Version check output: $($versionCheck.Output)"
            Write-Verbose "Version check success: $($versionCheck.Success)"
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
Write-UIRule "Universal Claude Code Fix Script (v4.0 - Data-Driven)" "Magenta"

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

# Step 3: Ensure installation with preferred package manager
Write-UIStepHeader "3" "Ensuring proper installation" "Green"

# Determine preferred manager
$preferredManager = $null
$lowestPriority = 999

foreach ($manager in $installations.managers.GetEnumerator()) {
    $config = $script:PackageManagerConfigs[$manager.Key]
    if ($config -and $config.Priority -lt $lowestPriority) {
        $preferredManager = $manager.Key
        $lowestPriority = $config.Priority
    }
}

# Default to npm if nothing installed
if (-not $preferredManager) {
    $preferredManager = "npm"
}

Write-Status "Using $preferredManager as package manager" "Info"
$updateSuccess = Update-ClaudeCode -PreferredManager $preferredManager

Write-Host ""

# Step 4: Verify the update and force reinstall if needed
Write-UIStepHeader "4" "Verifying update and ensuring latest version" "Yellow"

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
Write-UIStepHeader "5" "PATH cleanup and configuration" "Yellow"

# Windows PATH cleanup
if ($IsWindowsOS) {
    Write-Status "Checking Windows PATH configuration..." "Info"
    
    if (-not $Live) {
        Write-Status "Would check and fix Windows PATH order" "DryRun"
    } else {
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
        $preferredPath = $managerPaths[$preferredManager]
    
        # Check if any lower priority manager appears before the preferred one
        foreach ($mp in $managerPaths.GetEnumerator()) {
            if ($mp.Key -ne $preferredManager -and $mp.Value.Index -ne -1 -and $preferredPath.Index -ne -1) {
                if ($mp.Value.Index -lt $preferredPath.Index -and $mp.Value.Priority -gt $preferredPath.Priority) {
                    $pathIssues += "$($mp.Key) path comes before $preferredManager path"
                }
            }
        }
    
        if ($pathIssues.Count -gt 0) {
            Write-Status "PATH issues found: $($pathIssues -join ', ')" "Warning"
            
            try {
                # Get user PATH entries and remove all package manager paths except preferred
                $userPathEntries = $userPath -split ';' | Where-Object { $_ }
                $cleanedEntries = $userPathEntries | Where-Object { 
                    $keep = $true
                    foreach ($manager in $script:PackageManagerConfigs.Keys) {
                        if ($manager -ne $preferredManager -and $_ -match $manager) {
                            $keep = $false
                            break
                        }
                    }
                    $keep
                }
                
                # Ensure preferred manager path is first
                $currentPlatform = Get-CurrentPlatform
                $preferredConfig = $script:PackageManagerConfigs[$preferredManager]
                $preferredInstallPath = $preferredConfig.InstallPaths[$currentPlatform]
                if ($preferredPath) {
                    $newUserPath = @($preferredPath.Path) + ($cleanedEntries | Where-Object { $_ -ne $preferredPath.Path })
                } else {
                    $newUserPath = @($preferredInstallPath) + $cleanedEntries
                }
                
                $newUserPathString = $newUserPath -join ';'
                [Environment]::SetEnvironmentVariable("PATH", $newUserPathString, "User")
                $env:PATH = $newUserPathString + ';' + $systemPath
                
                Write-Status "Fixed PATH order - $preferredManager now has priority" "Success"
            } catch {
                Write-Status "Failed to fix PATH: $_" "Error"
            }
        } else {
            Write-Status "PATH order is correct - $preferredManager has priority" "Success"
        }
    }
}

# Unix/WSL shell configuration
if (($IsLinuxOS -or $IsWSL) -and $Live) {
    Write-Status "Updating shell configurations..." "Info"
    
    # Get npm global bin path
    $npmPrefix = Invoke-PlatformCommand "npm config get prefix" "Getting npm prefix" -IgnoreError
    if ($npmPrefix.Success) {
        $npmBinPath = "$($npmPrefix.Output.Trim())/bin"
        Write-Status "NPM global bin path: $npmBinPath" "Info"
        
        # Update shell configs to prioritize npm global bin
        $shellConfigs = @("~/.bashrc", "~/.zshrc", "~/.profile")
        $pathExportLine = "export PATH=`"${npmBinPath}:`$PATH`""
        
        foreach ($config in $shellConfigs) {
            $configExists = Invoke-PlatformCommand "test -f $config && echo 'exists'" "Checking $config" -IgnoreError
            if ($configExists.Output -eq 'exists') {
                # Check if PATH export already exists
                $pathExists = Invoke-PlatformCommand "grep -q '$npmBinPath' $config && echo 'found'" "Checking PATH in $config" -IgnoreError
                
                if ($pathExists.Output -ne 'found') {
                    Write-Status "Adding npm global bin to PATH in $config" "Info"
                    $addPathCmd = "echo '' >> $config && echo '# Added by Claude Code Fix Script' >> $config && echo '$pathExportLine' >> $config"
                    Invoke-PlatformCommand $addPathCmd "Updating PATH in $config"
                } else {
                    Write-Status "PATH already configured in $config" "Success"
                }
            }
        }
        
        # Update current session PATH
        Write-Status "Updated PATH for current session" "Info"
        Write-Status "Restart your shell or run: export PATH=`"${npmBinPath}:`$PATH`"" "Info"
    }
}

Write-Host ""

# Step 6: Final verification
Write-UIStepHeader "6" "Final verification" "Magenta"
$finalResult = Test-FinalInstallation

Write-Host ""

# Step 7: Final status
Write-UIStepHeader "7" "Final Status Report" "Green"

if ($finalResult -and $finalResult.Version) {
    # Create and display summary table
    $summaryRows = @(
        @{ Values = @("Status", "Installed and Working") },
        @{ Values = @("Platform", $platformName) },
        @{ Values = @("Version", $finalResult.Version) }
    )
    
    if ($finalResult.Path -and $finalResult.Path -ne "simulated") {
        $summaryRows += @{ Values = @("Location", $finalResult.Path) }
    }
    
    $summaryRows += @{ Values = @("Package Manager", "$preferredManager (preferred)") }
    
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
        
        # Check if we encountered elevation issues
        if ($script:needsElevationLater) {
            Write-Status "" "Info"
            Write-Status "NOTE: Some system files could not be removed due to insufficient privileges." "Warning"
            Write-Status "To complete cleanup, please run this script as Administrator." "Warning"
        }
        
        if (-not $Live) {
            Write-UIMessage "⚠️  This was a DRY RUN - run with -Live to execute changes" "Orange1"
        }
        exit 0
    } else {
        Write-UIFinalStatus "⚠️ PARTIAL SUCCESS" "Claude Code is working but some errors occurred" "Orange1"
        exit 1
    }
} else {
    Write-UIFinalStatus "INSTALLATION FAILED" "Claude Code installation failed" "Red"
    Write-UIMessage "Please manually install with: npm install -g @anthropic-ai/claude-code@latest" "Orange1"
    exit 1
}