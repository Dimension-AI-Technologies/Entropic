#Requires -Version 5.1

<#
.SYNOPSIS
    Installs Claude Code and Gemini CLI tools
.DESCRIPTION
    This module installs AI command-line tools including Claude Code CLI and Gemini CLI
    in the WSL2 environment using npm.
.NOTES
    Part of WSL2 Development Environment Setup
    Version: 1.0
#>

# Import utilities module
Import-Module "$PSScriptRoot\WSL-Utilities.ps1" -Force

# Function to install Claude Code CLI
function Install-ClaudeCode {
    Write-Host "`nInstalling Claude Code CLI..." -ForegroundColor Yellow
    Write-Host "Package: @anthropic-ai/claude-code" -ForegroundColor Gray
    
    try {
        $claudeInstallScript = @'
source ~/.nvm/nvm.sh
source ~/.bashrc
npm install -g @anthropic-ai/claude-code
'@
        $claudeResult = Invoke-WSLCommand $claudeInstallScript
        
        # Verify Claude Code installation
        $claudeVersion = Invoke-WSLCommand "source ~/.nvm/nvm.sh && source ~/.bashrc && claude --version 2>/dev/null || echo 'Not found'" -Quiet
        if ($claudeVersion -ne "Not found") {
            Write-Host "Claude Code installed successfully!" -ForegroundColor Green
            Write-Host "  Version: $claudeVersion" -ForegroundColor Gray
            return $true
        } else {
            Write-Warning "Claude Code installation may have failed. Please verify manually."
            return $false
        }
    } catch {
        Write-Error "Failed to install Claude Code: $_"
        return $false
    }
}

# Function to install Gemini CLI
function Install-GeminiCLI {
    Write-Host "`nInstalling Gemini CLI..." -ForegroundColor Yellow
    Write-Host "Package: @google/gemini-cli" -ForegroundColor Gray
    
    try {
        $geminiInstallScript = @'
source ~/.nvm/nvm.sh
source ~/.bashrc
npm install -g @google/gemini-cli
'@
        $geminiResult = Invoke-WSLCommand $geminiInstallScript
        
        # Verify Gemini CLI installation
        $geminiVersion = Invoke-WSLCommand "source ~/.nvm/nvm.sh && source ~/.bashrc && gemini --version 2>/dev/null || echo 'Not found'" -Quiet
        if ($geminiVersion -ne "Not found") {
            Write-Host "Gemini CLI installed successfully!" -ForegroundColor Green
            Write-Host "  Version: $geminiVersion" -ForegroundColor Gray
            return $true
        } else {
            Write-Warning "Gemini CLI installation may have failed. Please verify manually."
            return $false
        }
    } catch {
        Write-Error "Failed to install Gemini CLI: $_"
        return $false
    }
}

# Function to check if a CLI tool is installed
function Test-CLIToolInstalled {
    param(
        [string]$ToolCommand
    )
    
    try {
        $version = Invoke-WSLCommand "source ~/.nvm/nvm.sh && source ~/.bashrc && $ToolCommand --version 2>/dev/null" -Quiet
        return $version -and $version -ne "Not found"
    } catch {
        return $false
    }
}

# Function to show installed global packages
function Show-GlobalPackages {
    Write-Host "`nInstalled global npm packages:" -ForegroundColor Yellow
    try {
        $globalPackages = Invoke-WSLCommand "source ~/.nvm/nvm.sh && source ~/.bashrc && npm list -g --depth=0" -Quiet
        Write-Host $globalPackages -ForegroundColor Gray
    } catch {
        Write-Warning "Failed to list global packages"
    }
}

# Main function for this module
function Install-CLITools {
    Write-Host "`n=== Installing Claude Code and Gemini CLI ===" -ForegroundColor Cyan
    
    $allSuccess = $true
    
    # Install Claude Code
    if (Test-CLIToolInstalled "claude") {
        Write-Host "Claude Code is already installed" -ForegroundColor Green
        $claudeVersion = Invoke-WSLCommand "source ~/.nvm/nvm.sh && source ~/.bashrc && claude --version" -Quiet
        Write-Host "  Current version: $claudeVersion" -ForegroundColor Gray
    } else {
        if (-not (Install-ClaudeCode)) {
            $allSuccess = $false
        }
    }
    
    # Install Gemini CLI
    if (Test-CLIToolInstalled "gemini") {
        Write-Host "Gemini CLI is already installed" -ForegroundColor Green
        $geminiVersion = Invoke-WSLCommand "source ~/.nvm/nvm.sh && source ~/.bashrc && gemini --version" -Quiet
        Write-Host "  Current version: $geminiVersion" -ForegroundColor Gray
    } else {
        if (-not (Install-GeminiCLI)) {
            $allSuccess = $false
        }
    }
    
    # Show installed packages
    Show-GlobalPackages
    
    if (-not $allSuccess) {
        Write-Warning "Some CLI tools may not have installed correctly."
    }
    
    return $allSuccess
}

# Export functions
Export-ModuleMember -Function Install-CLITools, Test-CLIToolInstalled