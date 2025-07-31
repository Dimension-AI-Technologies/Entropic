#!/usr/bin/env pwsh
#Requires -Version 7.0

<#
.SYNOPSIS
    [DEPRECATED] Use Fix-ClaudeCode-Universal.ps1 or Fix-ClaudeCode-Universal-Spectre.ps1 instead
.DESCRIPTION
    This script is deprecated. Please use the Universal versions which support all platforms including WSL2.
    - Fix-ClaudeCode-Universal.ps1 - Standard version
    - Fix-ClaudeCode-Universal-Spectre.ps1 - Enhanced UI version
    
    Original description:
    Fix Claude Code installation issues in WSL2/Ubuntu
.DESCRIPTION
    This script detects multiple Claude Code installations, removes surplus ones (pnpm),
    updates the npm version, ensures a clean installation, and configures auto-updates 
    for seamless maintenance.
    
    By default runs in DRY RUN mode showing what would be done.
    Use -Live flag to actually make changes.
    Auto-update documentation: https://docs.anthropic.com/en/docs/claude-code/settings
.PARAMETER Live
    Execute changes (default is dry run mode)
.PARAMETER Verbose
    Enable verbose output for debugging
.EXAMPLE
    ./Fix-ClaudeCode-WSL2.ps1
    Runs in dry mode, showing what would be done
.EXAMPLE
    ./Fix-ClaudeCode-WSL2.ps1 -Live -Verbose
    Executes actual changes to fix Claude Code
.NOTES
    Run this script from within WSL2/Ubuntu using PowerShell Core
    Version: 3.0 (Data-driven configuration approach)
#>

param(
    [switch]$Live,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$VerbosePreference = if ($Verbose) { "Continue" } else { "SilentlyContinue" }
$script:hasErrors = $false

# Data-driven configuration for package managers in WSL2/Linux
$script:PackageManagerConfigs = @{
    npm = @{
        Name = "npm"
        Priority = 1  # Highest priority - preferred manager
        CheckCommand = { npm list -g @anthropic-ai/claude-code --json 2>/dev/null | ConvertFrom-Json }
        GetVersion = { param($result) $result.dependencies.'@anthropic-ai/claude-code'.version }
        UninstallCommand = "npm uninstall -g @anthropic-ai/claude-code"
        InstallCommand = "npm install -g @anthropic-ai/claude-code@latest"
        CacheCleanCommand = "npm cache clean --force"
        InstallPath = "$HOME/.npm-global"
        ExecutablePaths = @("$HOME/.npm-global/bin/claude", "/usr/local/bin/claude")
    }
    pnpm = @{
        Name = "pnpm"
        Priority = 2
        CheckCommand = { pnpm list -g @anthropic-ai/claude-code 2>/dev/null }
        GetVersion = { param($result) if ($result -match '@anthropic-ai/claude-code\s+(\d+\.\d+\.\d+)') { $matches[1] } }
        UninstallCommand = "pnpm remove -g @anthropic-ai/claude-code"
        InstallCommand = "pnpm add -g @anthropic-ai/claude-code@latest"
        InstallPath = "$HOME/.local/share/pnpm/global"
        ExecutablePaths = @("$HOME/.local/share/pnpm/global/5/node_modules/.bin/claude")
    }
    yarn = @{
        Name = "yarn"
        Priority = 3
        CheckCommand = { yarn global list 2>/dev/null | grep claude-code }
        GetVersion = { param($result) if ($result -match '@anthropic-ai/claude-code@(\d+\.\d+\.\d+)') { $matches[1] } }
        UninstallCommand = "yarn global remove @anthropic-ai/claude-code"
        InstallCommand = "yarn global add @anthropic-ai/claude-code@latest"
        InstallPath = "$HOME/.yarn/bin"
        ExecutablePaths = @("$HOME/.yarn/bin/claude")
    }
}

# Additional known installation paths that might interfere
$script:KnownInstallationPaths = @(
    @{
        Path = "$HOME/.local/bin/claude"
        Description = ".local/bin installation"
        Source = "unknown"
    },
    @{
        Path = "/usr/bin/claude"
        Description = "System-wide installation"
        Source = "system"
        RequiresSudo = $true
    },
    @{
        Path = "/usr/local/bin/claude"
        Description = "Local system installation"
        Source = "system"
        RequiresSudo = $true
    }
)

function Write-Status {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    switch ($Type) {
        "Success" { Write-Host "[$timestamp] [OK] $Message" -ForegroundColor Green }
        "Error"   { Write-Host "[$timestamp] [X] $Message" -ForegroundColor Red; $script:hasErrors = $true }
        "Warning" { Write-Host "[$timestamp] [!] $Message" -ForegroundColor Yellow }
        "Info"    { Write-Host "[$timestamp] [i] $Message" -ForegroundColor Cyan }
        "DryRun"  { Write-Host "[$timestamp] [TEST] $Message" -ForegroundColor Magenta }
        default   { Write-Host "[$timestamp]   $Message" }
    }
}

# Centralized command simulation mapping for DRY principle
$script:simulationMap = @{
    'claude --version' = "1.0.61 (Claude Code)"
    'npm list -g.*claude-code.*--json' = '{"dependencies":{"@anthropic-ai/claude-code":{"version":"1.0.61"}}}'
    'pnpm list -g.*claude-code.*--json' = '[{"name":"@anthropic-ai/claude-code","version":"1.0.61"}]'
    'yarn global list.*claude-code' = ''  # No yarn installation
    'which claude$' = "/home/doowell/.npm-global/bin/claude"
    'which -a claude' = "/home/doowell/.npm-global/bin/claude"
    'npm config get prefix' = "/home/doowell/.npm-global"
    'npm view.*version' = "1.0.61"
    'npm update -g.*claude-code' = "updated 1 package in 5s"
    'npm install -g.*latest' = "added 12 packages in 6s"
    'npm uninstall -g' = "removed 1 package in 3s"
    'pnpm remove -g' = "Removed @anthropic-ai/claude-code"
    'rm -f.*pnpm.*claude' = ""  # Silent removal
    'hash -r' = ""  # Silent hash refresh
    'npm cache clean' = "npm cache cleaned"
    'test -f.*bashrc.*echo.*exists' = "exists"
    'test -f.*zshrc.*echo.*exists' = ""  # zsh not installed
    'test -f.*profile.*echo.*exists' = "exists"
    'grep -q.*npm-global.*echo.*found' = ""  # PATH not yet configured
    'echo.*Claude Code Fix Script' = ""  # Adding to shell config
    'export PATH.*which claude' = "/home/doowell/.npm-global/bin/claude"
    'ls -la /usr/bin/claude /bin/claude.*grep.*node_modules' = ""  # No system installation
}

# Helper function to get simulated output
function Get-SimulatedOutput {
    param([string]$Command)
    
    foreach ($pattern in $script:simulationMap.Keys) {
        if ($Command -match $pattern) {
            return $script:simulationMap[$pattern]
        }
    }
    return ""
}

function Invoke-BashCommand {
    param(
        [string]$Command,
        [string]$Description,
        [switch]$IgnoreError
    )
    
    Write-Status "Executing: $Description" "Info"
    Write-Verbose "Command: $Command"
    
    if (-not $Live) {
        Write-Status "DRY RUN: Would execute: $Command" "Warning"
        
        return @{
            Success = $true
            Output = Get-SimulatedOutput $Command
            Error = $null
        }
    }
    
    try {
        $output = bash -c "$Command" 2>&1
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
            $script:hasErrors = $true
        }
        return @{
            Success = $false
            Output = $null
            Error = $_.ToString()
        }
    }
}

function Get-ClaudeInstallations {
    Write-Status "Detecting Claude Code installations..." "Info"
    
    $installations = @{
        managers = @{}  # Keyed by manager name
        paths = @()
        detailed = @()
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
                        Source = $managerName
                        Version = $version
                        Path = $config.InstallPath
                        Priority = $config.Priority
                    }
                    Write-Status "Found $managerName installation: v$version" "Info"
                }
            }
        } catch {
            Write-Verbose "No $managerName installation found or check failed: $_"
        }
    }
    
    # Check which claude is in PATH
    $whichResult = Invoke-BashCommand -Command "which -a claude 2>/dev/null" -Description "Finding claude in PATH" -IgnoreError
    if ($whichResult.Success -and $whichResult.Output) {
        $installations.paths = $whichResult.Output -split "`n" | Where-Object { $_ }
        foreach ($path in $installations.paths) {
            # Determine source based on path patterns from configs
            $source = "unknown"
            foreach ($manager in $script:PackageManagerConfigs.GetEnumerator()) {
                if ($path -match $manager.Key -or ($manager.Value.ExecutablePaths | Where-Object { $path -eq $_ })) {
                    $source = $manager.Key
                    break
                }
            }
            
            $installations.detailed += [PSCustomObject]@{
                Type = "PATH"
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
        if (Test-Path $knownPath.Path) {
            $installations.detailed += [PSCustomObject]@{
                Type = "standalone"
                Path = $knownPath.Path
                Source = $knownPath.Source
                Description = $knownPath.Description
                RequiresSudo = $knownPath.RequiresSudo
                Priority = 100  # Lowest priority for removal
            }
            Write-Status "Found $($knownPath.Description) at: $($knownPath.Path)" "Warning"
        }
    }
    
    # Try to get active version
    $versionResult = Invoke-BashCommand -Command "claude --version 2>/dev/null" -Description "Getting active version" -IgnoreError
    if ($versionResult.Success) {
        $activeVersion = $versionResult.Output -replace '.*?(\d+\.\d+\.\d+).*', '$1'
        Write-Status "Active version: v$activeVersion" "Info"
    }
    
    # Sort detailed installations by priority
    $installations.detailed = $installations.detailed | Sort-Object Priority
    
    return $installations
}

# Helper function for package removal
function Remove-PackageManager {
    param(
        [string]$Manager,
        [string]$Version
    )
    
    Write-Status "Removing $Manager installation (v$Version)..." "Warning"
    
    $config = $script:PackageManagerConfigs[$Manager]
    if ($config) {
        $result = Invoke-BashCommand -Command $config.UninstallCommand -Description "Removing $Manager global package"
        if ($result.Success) {
            Write-Status "Removed $Manager installation" "Success"
            
            # Additional cleanup for pnpm
            if ($Manager -eq "pnpm") {
                Invoke-BashCommand -Command "rm -f ~/.local/share/pnpm/*/node_modules/.bin/claude" -Description "Removing pnpm claude binary" -IgnoreError
                Invoke-BashCommand -Command "rm -rf ~/.local/share/pnpm/*/node_modules/@anthropic-ai/claude-code" -Description "Removing pnpm claude package" -IgnoreError
            }
            
            return $true
        } else {
            Write-Status "Failed to remove $Manager installation" "Error"
            return $false
        }
    }
    
    return $false
}

function Remove-SurplusInstallations {
    param(
        [hashtable]$Installations
    )
    
    $removed = $false
    
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
        if ($standalone.RequiresSudo) {
            Write-Status "System-wide installation detected - requires manual sudo removal" "Warning"
            Write-Host "   [!]  $($standalone.Description) detected at $($standalone.Path)" -ForegroundColor Yellow
            Write-Host "   Please run: sudo rm $($standalone.Path)" -ForegroundColor Cyan
            Write-Host "   Then re-run this script." -ForegroundColor Yellow
            if ($Live) {
                exit 1
            }
        } else {
            Write-Status "Removing $($standalone.Description)..." "Warning"
            if ($Live) {
                $result = Invoke-BashCommand -Command "rm -f $($standalone.Path)" -Description "Removing $($standalone.Description)" -IgnoreError
                if ($result.Success) {
                    Write-Status "Removed $($standalone.Description)" "Success"
                    $removed = $true
                }
            } else {
                Write-Status "Would remove $($standalone.Description): $($standalone.Path)" "DryRun"
            }
        }
    }
    
    # Remove all package managers except preferred
    foreach ($manager in $Installations.managers.GetEnumerator()) {
        if ($manager.Key -ne $preferredManager) {
            $config = $script:PackageManagerConfigs[$manager.Key]
            if ($config) {
                $wasRemoved = Remove-PackageManager $manager.Key $manager.Value
                if ($wasRemoved) { $removed = $true }
            }
        }
    }
    
    if ($removed) {
        # Refresh PATH
        Invoke-BashCommand -Command "hash -r" -Description "Refreshing command hash table" -IgnoreError
    }
    
    return $removed
}

# Helper function for npm operations
function Invoke-NpmOperation {
    param(
        [string]$Command,
        [string]$Description,
        [switch]$GetVersion
    )
    
    $result = Invoke-BashCommand -Command $Command -Description $Description
    
    if ($result.Success -and $GetVersion) {
        $versionResult = Invoke-BashCommand -Command "claude --version 2>/dev/null" -Description "Checking version" -IgnoreError
        if ($versionResult.Success) {
            $version = $versionResult.Output -replace '.*?(\d+\.\d+\.\d+).*', '$1'
            return @{ Success = $true; Version = $version }
        }
    }
    
    return $result
}

function Update-ClaudeCode {
    Write-Status "Updating Claude Code via npm..." "Info"
    
    $updateResult = Invoke-NpmOperation "npm update -g @anthropic-ai/claude-code" "Updating npm package" -GetVersion
    
    if ($updateResult.Success -and $updateResult.Version) {
        Write-Status "Successfully updated to v$($updateResult.Version)" "Success"
        return $true
    }
    
    return $false
}

function Reinstall-ClaudeCode {
    Write-Status "Update failed. Performing clean reinstall..." "Warning"
    
    # Define reinstall steps
    $reinstallSteps = @(
        @{ Command = "npm uninstall -g @anthropic-ai/claude-code"; Description = "Removing npm package" },
        @{ Command = "npm cache clean --force"; Description = "Cleaning npm cache" },
        @{ Command = "npm install -g @anthropic-ai/claude-code@latest"; Description = "Installing latest version" },
        @{ Command = "hash -r"; Description = "Refreshing command hash table" }
    )
    
    # Execute reinstall steps
    foreach ($step in $reinstallSteps) {
        Invoke-BashCommand -Command $step.Command -Description $step.Description -IgnoreError
    }
    
    # Check final result
    $versionResult = Invoke-NpmOperation "claude --version 2>/dev/null" "Checking reinstalled version" -GetVersion
    if ($versionResult.Success -and $versionResult.Version) {
        Write-Status "Successfully reinstalled v$($versionResult.Version)" "Success"
        return $true
    }
    
    return $false
}

function Get-LatestVersion {
    Write-Status "Checking latest available version..." "Info"
    $result = Invoke-BashCommand -Command "npm view @anthropic-ai/claude-code version" -Description "Getting latest npm version" -IgnoreError
    if ($result.Success) {
        return $result.Output.Trim()
    }
    return $null
}

# Main execution
# Show deprecation warning
Write-Host "`n=== DEPRECATED SCRIPT ===" -ForegroundColor Red
Write-Host "This script is deprecated. Please use one of the following instead:" -ForegroundColor Yellow
Write-Host "  - Fix-ClaudeCode-Universal.ps1 (standard version)" -ForegroundColor Yellow
Write-Host "  - Fix-ClaudeCode-Universal-Spectre.ps1 (enhanced UI version)" -ForegroundColor Yellow
Write-Host "" -ForegroundColor Yellow
Write-Host "The Universal scripts support Windows, WSL2, Linux, and macOS." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to cancel or wait 10 seconds to continue anyway..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "`n=== Claude Code WSL2/Ubuntu Fix Script ===" -ForegroundColor Magenta
Write-Host "This script will fix Claude Code installation issues in WSL2`n" -ForegroundColor Gray

if (-not $Live) {
    Write-Host "`n⚠️  DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host "   To execute changes, run with -Live flag: ./Fix-ClaudeCode-WSL2.ps1 -Live`n" -ForegroundColor Gray
} else {
    Write-Host "`n🚀 LIVE MODE - Changes will be made to your system`n" -ForegroundColor Red
}

# Step 1: Detect installations
$installations = Get-ClaudeInstallations

if ($installations.Count -eq 0) {
    Write-Status "No Claude Code installations found" "Warning"
    Write-Status "Installing Claude Code fresh..." "Info"
    $installSuccess = Reinstall-ClaudeCode
} else {
    Write-Status "Found $($installations.Count) installation(s)" "Info"
    
    # Step 2: Check for system-installed Claude (CRITICAL ENHANCEMENT)
    $systemClaude = Invoke-BashCommand -Command "ls -la /usr/bin/claude /bin/claude 2>/dev/null | grep -E '(usr|bin)/lib/node_modules'" -Description "Checking for system npm claude" -IgnoreError
    if ($systemClaude.Success -and $systemClaude.Output) {
        Write-Status "Found system-wide npm Claude installation (requires sudo to remove)" "Warning"
        Write-Host "`n⚠️  System-wide Claude installation detected at /usr/bin/claude" -ForegroundColor Yellow
        Write-Host "   This requires sudo to remove. Please run:" -ForegroundColor Yellow
        Write-Host "   sudo npm uninstall -g @anthropic-ai/claude-code" -ForegroundColor Cyan
        Write-Host "`n   After removing, re-run this script." -ForegroundColor Yellow
        
        if (-not $Live) {
            Write-Status "In live mode, this script would exit here for manual sudo removal" "Warning"
        } else {
            exit 1
        }
    }
    
    # Step 3: Remove surplus installations
    $removed = Remove-SurplusInstallations -Installations $installations
    
    if ($removed) {
        Write-Status "Removed surplus installations" "Success"
        Start-Sleep -Seconds 2  # Give system time to update
    }
    
    # Step 4: Update npm version
    $updateSuccess = Update-ClaudeCode
    
    # Step 5: If update fails, reinstall
    if (-not $updateSuccess) {
        $installSuccess = Reinstall-ClaudeCode
    } else {
        $installSuccess = $true
    }
}

# Step 6: Fix PATH Configuration
Write-Host "`n=== Fixing PATH Configuration ===" -ForegroundColor Magenta

# Get npm global bin path
$npmBinResult = Invoke-BashCommand -Command "npm config get prefix" -Description "Getting npm global prefix" -IgnoreError
if ($npmBinResult.Success) {
    $npmPrefix = $npmBinResult.Output.Trim()
    $npmBinPath = "$npmPrefix/bin"
    Write-Status "NPM global bin path: $npmBinPath" "Info"
    
    # Check if npm's claude is the latest
    $npmClaudeCheck = Invoke-BashCommand -Command "$npmBinPath/claude --version 2>/dev/null" -Description "Checking npm claude version" -IgnoreError
    if ($npmClaudeCheck.Success) {
        $npmClaudeVersion = $npmClaudeCheck.Output -replace '.*?(\d+\.\d+\.\d+).*', '$1'
        Write-Status "NPM Claude version: v$npmClaudeVersion" "Info"
    }
    
    # Update shell configs to prioritize npm global bin
    $shellConfigs = @("~/.bashrc", "~/.zshrc", "~/.profile")
    $pathExportLine = "export PATH=`"${npmBinPath}:`$PATH`""
    
    foreach ($config in $shellConfigs) {
        $configExists = Invoke-BashCommand -Command "test -f $config && echo 'exists'" -Description "Checking if $config exists" -IgnoreError
        if ($configExists.Output -eq 'exists') {
            # Check if PATH export already exists
            $pathExists = Invoke-BashCommand -Command "grep -q '$npmBinPath' $config && echo 'found'" -Description "Checking PATH in $config" -IgnoreError
            
            if ($pathExists.Output -ne 'found') {
                Write-Status "Adding npm global bin to PATH in $config" "Warning"
                $addPathCmd = "echo '' >> $config && echo '# Added by Claude Code Fix Script' >> $config && echo '$pathExportLine' >> $config"
                Invoke-BashCommand -Command $addPathCmd -Description "Updating PATH in $config"
            } else {
                Write-Status "PATH already configured in $config" "Success"
            }
        }
    }
    
    # Update current session PATH
    Write-Status "Updating current session PATH..." "Info"
    $updatePathResult = Invoke-BashCommand -Command "export PATH=`"${npmBinPath}:`$PATH`" && which claude" -Description "Updating session PATH" -IgnoreError
}

# Step 7: Final Status Report
Write-Host "`n=== Final Status Report ===" -ForegroundColor Magenta

# Check all claude installations
Write-Status "Checking all Claude installations..." "Info"
$allClaudes = Invoke-BashCommand -Command "which -a claude 2>/dev/null" -Description "Finding all claude binaries" -IgnoreError
if ($allClaudes.Success -and $allClaudes.Output) {
    $claudePaths = $allClaudes.Output -split "`n" | Where-Object { $_ -ne "" }
    Write-Status "Found $($claudePaths.Count) Claude installation(s):" "Info"
    foreach ($path in $claudePaths) {
        $versionCheck = Invoke-BashCommand -Command "$path --version 2>/dev/null" -Description "Checking version of $path" -IgnoreError
        if ($versionCheck.Success) {
            $version = $versionCheck.Output -replace '.*?(\d+\.\d+\.\d+).*', '$1'
            Write-Status "  $path : v$version" "Info"
        }
    }
}

# Check final installation with updated PATH
$finalCheck = Invoke-BashCommand -Command "export PATH=`"${npmBinPath}:`$PATH`" && which claude && claude --version" -Description "Final installation check with updated PATH" -IgnoreError

if ($finalCheck.Success) {
    $lines = $finalCheck.Output -split "`n"
    $claudePath = $lines[0].Trim()
    $claudeVersion = $lines[1] -replace '.*?(\d+\.\d+\.\d+).*', '$1'
    
    Write-Status "Claude Code is installed and accessible" "Success"
    Write-Status "Active Path: $claudePath" "Info"
    Write-Status "Active Version: v$claudeVersion" "Info"
    
    # Check if it's the latest
    $latestVersion = Get-LatestVersion
    if ($latestVersion -and $claudeVersion -ne $latestVersion) {
        Write-Status "Note: Latest available version is v$latestVersion" "Warning"
        
        # Provide instructions if not using npm version
        if ($claudePath -notlike "*npm*") {
            Write-Host "`n⚠️  System is not using the npm-installed version!" -ForegroundColor Yellow
            Write-Host "   To use the latest version, restart your shell or run:" -ForegroundColor Yellow
            Write-Host "   export PATH=`"${npmBinPath}:`$PATH`"" -ForegroundColor Cyan
        }
    } elseif ($latestVersion -eq $claudeVersion) {
        Write-Status "You have the latest version!" "Success"
    }
    
    # Configure auto-updates for WSL2 environment
    Write-Status "Configuring Claude Code auto-updates for WSL2..." "Info"
    if ($Live -and $claudeVersion -ne "simulated") {
        try {
            # Enable auto-updates for seamless maintenance
            # Documentation: https://docs.anthropic.com/en/docs/claude-code/settings
            $autoUpdateResult = & claude settings set autoUpdate true 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Status "✅ Auto-updates enabled successfully" "Success"
                Write-Status "Claude will automatically update to new versions in WSL2" "Info"
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
        if ($claudePath -notlike "*npm*") {
            Write-Host "⚠️  Remember to restart your shell for PATH changes to take effect" -ForegroundColor Yellow
        }
        exit 0
    } else {
        Write-Host "`n⚠ Claude Code is working but some errors occurred during the process" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Status "Claude Code installation failed or is not accessible" "Error"
    Write-Status "Please try manual installation: npm install -g @anthropic-ai/claude-code@latest" "Warning"
    Write-Host "`n✗ Failed to fix Claude Code installation" -ForegroundColor Red
    exit 1
}