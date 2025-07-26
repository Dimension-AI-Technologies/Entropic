#!/usr/bin/env pwsh
#Requires -Version 7.0

<#
.SYNOPSIS
    Fix Claude Code installation issues in WSL2/Ubuntu
.DESCRIPTION
    This script detects multiple Claude Code installations, removes surplus ones (pnpm),
    updates the npm version, and ensures a clean installation.
    
    By default runs in DRY RUN mode showing what would be done.
    Use -Live flag to actually make changes.
.PARAMETER Live
    Execute changes (default is dry run mode)
.EXAMPLE
    ./Fix-ClaudeCode-WSL2.ps1
    Runs in dry mode, showing what would be done
.EXAMPLE
    ./Fix-ClaudeCode-WSL2.ps1 -Live
    Executes actual changes to fix Claude Code
.NOTES
    Run this script from within WSL2/Ubuntu using PowerShell Core
#>

param(
    [switch]$Live
)

$ErrorActionPreference = "Stop"
$script:hasErrors = $false

function Write-Status {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    switch ($Type) {
        "Success" { Write-Host "[$timestamp] ✓ $Message" -ForegroundColor Green }
        "Error"   { Write-Host "[$timestamp] ✗ $Message" -ForegroundColor Red }
        "Warning" { Write-Host "[$timestamp] ⚠ $Message" -ForegroundColor Yellow }
        "Info"    { Write-Host "[$timestamp] ℹ $Message" -ForegroundColor Cyan }
        default   { Write-Host "[$timestamp]   $Message" }
    }
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
        
        # Simulate realistic output based on command
        $simulatedOutput = switch -Regex ($Command) {
            'claude --version' { "1.0.51 (Claude Code)" }
            'npm list -g.*claude-code.*--json' { '{"dependencies":{"@anthropic-ai/claude-code":{"version":"1.0.51"}}}' }
            'pnpm list -g.*claude-code.*--json' { '[{"name":"@anthropic-ai/claude-code","version":"1.0.51"}]' }
            'yarn global list.*claude-code' { '' }  # No yarn installation
            'which claude$' { "$HOME/.local/share/pnpm/claude" }
            'which -a claude' { "/usr/bin/claude\n/bin/claude\n$HOME/.npm-global/bin/claude" }
            'npm config get prefix' { "$HOME/.npm-global" }
            'npm view.*version' { "1.0.61" }
            'npm update -g.*claude-code' { "updated 1 package in 5s" }
            'npm install -g.*latest' { "added 12 packages in 6s" }
            'npm uninstall -g' { "removed 1 package in 3s" }
            'pnpm remove -g' { "Removed @anthropic-ai/claude-code" }
            'rm -f.*pnpm.*claude' { "" }  # Silent removal
            'hash -r' { "" }  # Silent hash refresh
            'npm cache clean' { "npm cache cleaned" }
            'test -f.*bashrc.*echo.*exists' { "exists" }
            'test -f.*zshrc.*echo.*exists' { "" }  # zsh not installed
            'test -f.*profile.*echo.*exists' { "exists" }
            'grep -q.*npm-global.*echo.*found' { "" }  # PATH not yet configured
            'echo.*Claude Code Fix Script' { "" }  # Adding to shell config
            'export PATH.*which claude' { "$HOME/.npm-global/bin/claude" }
            '/usr/bin/claude --version' { "1.0.38 (Claude Code)" }
            '/bin/claude --version' { "1.0.38 (Claude Code)" }
            "$HOME/.npm-global/bin/claude --version" { "1.0.61 (Claude Code)" }
            'which claude && claude --version' { "/home/$USER/.npm-global/bin/claude\n1.0.61 (Claude Code)" }
            default { "" }
        }
        
        return @{
            Success = $true
            Output = $simulatedOutput
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
    
    $installations = @()
    
    # Check npm global installation
    $npmCheck = Invoke-BashCommand -Command "npm list -g @anthropic-ai/claude-code --json 2>/dev/null" -Description "Checking npm global packages" -IgnoreError
    if ($npmCheck.Success -and $npmCheck.Output) {
        try {
            $npmData = $npmCheck.Output | ConvertFrom-Json
            if ($npmData.dependencies.'@anthropic-ai/claude-code') {
                $version = $npmData.dependencies.'@anthropic-ai/claude-code'.version
                $installations += @{
                    Manager = "npm"
                    Version = $version
                    Path = "$(npm config get prefix)/bin/claude"
                }
                Write-Status "Found npm installation: v$version" "Info"
            }
        } catch {}
    }
    
    # Check pnpm global installation
    $pnpmCheck = Invoke-BashCommand -Command "pnpm list -g @anthropic-ai/claude-code --json 2>/dev/null" -Description "Checking pnpm global packages" -IgnoreError
    if ($pnpmCheck.Success -and $pnpmCheck.Output) {
        try {
            $pnpmData = $pnpmCheck.Output | ConvertFrom-Json
            foreach ($pkg in $pnpmData) {
                if ($pkg.dependencies.'@anthropic-ai/claude-code' -or $pkg.name -eq '@anthropic-ai/claude-code') {
                    $version = $pkg.version -or $pkg.dependencies.'@anthropic-ai/claude-code'.version
                    $installations += @{
                        Manager = "pnpm"
                        Version = $version
                        Path = "$(pnpm config get global-dir)/node_modules/.bin/claude"
                    }
                    Write-Status "Found pnpm installation: v$version" "Info"
                }
            }
        } catch {}
    }
    
    # Check yarn global installation
    $yarnCheck = Invoke-BashCommand -Command "yarn global list --json 2>/dev/null | grep claude-code" -Description "Checking yarn global packages" -IgnoreError
    if ($yarnCheck.Success -and $yarnCheck.Output) {
        try {
            $yarnData = $yarnCheck.Output | ConvertFrom-Json
            if ($yarnData.data.trees -and ($yarnData.data.trees | Where-Object { $_.name -like "*claude-code*" })) {
                $yarnPkg = $yarnData.data.trees | Where-Object { $_.name -like "*claude-code*" } | Select-Object -First 1
                $version = $yarnPkg.name -replace '.*@', ''
                $installations += @{
                    Manager = "yarn"
                    Version = $version
                    Path = "$(yarn global bin)/claude"
                }
                Write-Status "Found yarn installation: v$version" "Info"
            }
        } catch {}
    }
    
    # Check which claude is in PATH
    $whichResult = Invoke-BashCommand -Command "which claude 2>/dev/null" -Description "Finding claude in PATH" -IgnoreError
    if ($whichResult.Success -and $whichResult.Output) {
        $activePath = $whichResult.Output.Trim()
        Write-Status "Active claude binary: $activePath" "Info"
        
        # Try to get version
        $versionResult = Invoke-BashCommand -Command "claude --version 2>/dev/null" -Description "Getting active version" -IgnoreError
        if ($versionResult.Success) {
            $activeVersion = $versionResult.Output -replace '.*?(\d+\.\d+\.\d+).*', '$1'
            Write-Status "Active version: v$activeVersion" "Info"
        }
    }
    
    return $installations
}

function Remove-SurplusInstallations {
    param(
        [array]$Installations
    )
    
    $surplusManagers = @("pnpm", "yarn")
    $removed = $false
    
    foreach ($install in $Installations) {
        if ($install.Manager -in $surplusManagers) {
            Write-Status "Removing $($install.Manager) installation (v$($install.Version))..." "Warning"
            
            switch ($install.Manager) {
                "pnpm" {
                    $result = Invoke-BashCommand -Command "pnpm remove -g @anthropic-ai/claude-code" -Description "Removing pnpm global package" -IgnoreError
                    if (-not $result.Success) {
                        # Try alternative removal methods
                        Invoke-BashCommand -Command "rm -f ~/.local/share/pnpm/*/node_modules/.bin/claude" -Description "Removing pnpm claude binary" -IgnoreError
                        Invoke-BashCommand -Command "rm -rf ~/.local/share/pnpm/*/node_modules/@anthropic-ai/claude-code" -Description "Removing pnpm claude package" -IgnoreError
                    }
                }
                "yarn" {
                    Invoke-BashCommand -Command "yarn global remove @anthropic-ai/claude-code" -Description "Removing yarn global package" -IgnoreError
                }
            }
            $removed = $true
        }
    }
    
    if ($removed) {
        # Refresh PATH
        Invoke-BashCommand -Command "hash -r" -Description "Refreshing command hash table" -IgnoreError
    }
    
    return $removed
}

function Update-ClaudeCode {
    Write-Status "Updating Claude Code via npm..." "Info"
    
    # First try to update
    $updateResult = Invoke-BashCommand -Command "npm update -g @anthropic-ai/claude-code" -Description "Updating npm package"
    
    if ($updateResult.Success) {
        # Get new version
        $versionResult = Invoke-BashCommand -Command "claude --version 2>/dev/null" -Description "Checking updated version" -IgnoreError
        if ($versionResult.Success) {
            $version = $versionResult.Output -replace '.*?(\d+\.\d+\.\d+).*', '$1'
            Write-Status "Successfully updated to v$version" "Success"
            return $true
        }
    }
    
    return $false
}

function Reinstall-ClaudeCode {
    Write-Status "Update failed. Performing clean reinstall..." "Warning"
    
    # Uninstall
    Write-Status "Uninstalling existing npm installation..." "Info"
    Invoke-BashCommand -Command "npm uninstall -g @anthropic-ai/claude-code" -Description "Removing npm package" -IgnoreError
    
    # Clean npm cache
    Write-Status "Cleaning npm cache..." "Info"
    Invoke-BashCommand -Command "npm cache clean --force" -Description "Cleaning npm cache" -IgnoreError
    
    # Install latest
    Write-Status "Installing latest Claude Code..." "Info"
    $installResult = Invoke-BashCommand -Command "npm install -g @anthropic-ai/claude-code@latest" -Description "Installing latest version"
    
    if ($installResult.Success) {
        # Refresh PATH
        Invoke-BashCommand -Command "hash -r" -Description "Refreshing command hash table" -IgnoreError
        
        # Get new version
        $versionResult = Invoke-BashCommand -Command "claude --version 2>/dev/null" -Description "Checking reinstalled version" -IgnoreError
        if ($versionResult.Success) {
            $version = $versionResult.Output -replace '.*?(\d+\.\d+\.\d+).*', '$1'
            Write-Status "Successfully reinstalled v$version" "Success"
            return $true
        }
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
Write-Host "`n=== Claude Code WSL2/Ubuntu Fix Script ===" -ForegroundColor Magenta
Write-Host "This script will fix Claude Code installation issues in WSL2`n" -ForegroundColor Gray

if (-not $Live) {
    Write-Host "`n⚠️  DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host "   To execute changes, run with -Live flag: ./Fix-ClaudeCode-WSL2.ps1 -Live`n" -ForegroundColor Gray
} else {
    Write-Host "`n🔴 LIVE MODE - Changes will be made to your system`n" -ForegroundColor Red
}

# Step 1: Detect installations
$installations = Get-ClaudeInstallations

if ($installations.Count -eq 0) {
    Write-Status "No Claude Code installations found" "Warning"
    Write-Status "Installing Claude Code fresh..." "Info"
    $installSuccess = Reinstall-ClaudeCode
} else {
    Write-Status "Found $($installations.Count) installation(s)" "Info"
    
    # Step 2: Remove surplus installations
    $removed = Remove-SurplusInstallations -Installations $installations
    
    if ($removed) {
        Write-Status "Removed surplus installations" "Success"
        Start-Sleep -Seconds 2  # Give system time to update
    }
    
    # Step 3 & 4: Update npm version
    $updateSuccess = Update-ClaudeCode
    
    # Step 5 & 6: If update fails, reinstall
    if (-not $updateSuccess) {
        $installSuccess = Reinstall-ClaudeCode
    } else {
        $installSuccess = $true
    }
}

# Step 7: Fix PATH and Final status report
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