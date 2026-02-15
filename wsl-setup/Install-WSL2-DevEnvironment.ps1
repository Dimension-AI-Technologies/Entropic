#Requires -Version 7.0

#Requires -Version 5.1

<#
.SYNOPSIS
    Installs WSL2 with Ubuntu, Node.js via NVM, Claude Code, and Gemini CLI
.DESCRIPTION
    This script performs a complete setup of WSL2 development environment using modular components:
    - Windows Terminal installation (if not present)
    - WSL2 and Ubuntu installation (handling partial installations)
    - IPv6 disabling in WSL2 (required for Claude Code compatibility)
    - Node.js installation via NVM
    - Claude Code CLI (@anthropic-ai/claude-code)
    - Gemini CLI (@google/gemini-cli)
.NOTES
    Author: WSL2 Automation Script
    Version: 2.0 (Modularized)
    Requires: Windows 10 Build 19041+ or Windows 11
#>

# Set module path
$ModulePath = "$PSScriptRoot\modules"

# Import utilities module
Import-Module "$ModulePath\WSL-Utilities.ps1" -Force

# Self-elevation check
Ensure-Administrator

# Import all modules
Import-Module "$ModulePath\Install-WindowsTerminal.ps1" -Force
Import-Module "$ModulePath\Install-WSL2Ubuntu.ps1" -Force
Import-Module "$ModulePath\Configure-IPv6.ps1" -Force
Import-Module "$ModulePath\Install-NodeJS.ps1" -Force
Import-Module "$ModulePath\Install-CLITools.ps1" -Force

# Main installation process
function Start-Installation {
    Write-Host "=== WSL2 Development Environment Setup ===" -ForegroundColor Magenta
    Write-Host "Version: 2.0 (Modularized)" -ForegroundColor Gray
    Write-Host "`nThis script will install:" -ForegroundColor White
    Write-Host "  - Windows Terminal (if not installed)" -ForegroundColor Gray
    Write-Host "  - WSL2 with Ubuntu" -ForegroundColor Gray
    Write-Host "  - Disable IPv6 (for Claude Code compatibility)" -ForegroundColor Gray
    Write-Host "  - Node.js (via NVM)" -ForegroundColor Gray
    Write-Host "  - Claude Code CLI" -ForegroundColor Gray
    Write-Host "  - Gemini CLI" -ForegroundColor Gray
    Write-Host ""
    
    # Check Windows version
    if (-not (Test-WindowsVersion)) {
        Write-Error "This script requires Windows 10 Build 19041 or later (or Windows 11)"
        return
    }
    
    # Step 1: Install Windows Terminal
    Install-WindowsTerminalIfNeeded
    
    # Step 2: Install WSL2 and Ubuntu
    $wslResult = Install-WSL2UbuntuEnvironment
    if ($wslResult.RestartRequired) {
        return  # Script will exit for restart
    }
    if (-not $wslResult.Success) {
        Write-Error "WSL2 installation failed. Exiting."
        return
    }
    
    # Step 3: Configure IPv6
    if (-not (Configure-IPv6ForClaudeCode)) {
        Write-Warning "Failed to disable IPv6. Claude Code may not work properly."
        Write-Host "You can manually disable IPv6 later if needed." -ForegroundColor Yellow
    }
    
    # Step 4: Install Node.js
    if (-not (Install-NodeJSEnvironment)) {
        Write-Error "Node.js installation failed. Exiting."
        return
    }
    
    # Step 5: Install CLI tools
    if (-not (Install-CLITools)) {
        Write-Warning "Some CLI tools may not have installed correctly."
    }
    
    # Final instructions
    Write-Host "`n=== Installation Complete! ===" -ForegroundColor Green
    Write-Host "`nTo use the installed tools:" -ForegroundColor Cyan
    Write-Host "1. Open Windows Terminal and start WSL: " -NoNewline
    Write-Host "wt -p Ubuntu" -ForegroundColor Yellow
    Write-Host "   Or open a new WSL terminal: " -NoNewline
    Write-Host "wsl" -ForegroundColor Yellow
    Write-Host "2. For Claude Code: " -NoNewline
    Write-Host "claude --help" -ForegroundColor Yellow
    Write-Host "3. For Gemini CLI: " -NoNewline
    Write-Host "gemini --help" -ForegroundColor Yellow
    Write-Host "`nNote: You'll need API keys for both tools:" -ForegroundColor Cyan
    Write-Host "  - Claude Code: Anthropic API key" -ForegroundColor Gray
    Write-Host "  - Gemini CLI: Google AI Studio API key" -ForegroundColor Gray
    
    Write-Host "`nPress any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Function to run individual modules (for advanced users)
function Invoke-Module {
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet("Terminal", "WSL2", "IPv6", "NodeJS", "CLITools")]
        [string]$Module
    )
    
    switch ($Module) {
        "Terminal" { Install-WindowsTerminalIfNeeded }
        "WSL2" { Install-WSL2UbuntuEnvironment }
        "IPv6" { Configure-IPv6ForClaudeCode }
        "NodeJS" { Install-NodeJSEnvironment }
        "CLITools" { Install-CLITools }
    }
}

# Check if running with parameters
if ($args.Count -gt 0) {
    switch ($args[0]) {
        "-Module" {
            if ($args.Count -ge 2) {
                Invoke-Module -Module $args[1]
            } else {
                Write-Host "Usage: .\Install-WSL2-DevEnvironment.ps1 -Module <Terminal|WSL2|IPv6|NodeJS|CLITools>" -ForegroundColor Yellow
            }
        }
        "-Help" {
            Write-Host "WSL2 Development Environment Setup" -ForegroundColor Cyan
            Write-Host "Usage:" -ForegroundColor Yellow
            Write-Host "  .\Install-WSL2-DevEnvironment.ps1              # Run full installation"
            Write-Host "  .\Install-WSL2-DevEnvironment.ps1 -Module <name> # Run specific module"
            Write-Host ""
            Write-Host "Available modules:" -ForegroundColor Yellow
            Write-Host "  Terminal  - Install Windows Terminal"
            Write-Host "  WSL2      - Install WSL2 and Ubuntu"
            Write-Host "  IPv6      - Disable IPv6 in WSL2"
            Write-Host "  NodeJS    - Install Node.js via NVM"
            Write-Host "  CLITools  - Install Claude Code and Gemini CLI"
        }
        default {
            Write-Host "Unknown parameter. Use -Help for usage information." -ForegroundColor Red
        }
    }
} else {
    # Run the full installation
    Start-Installation
}