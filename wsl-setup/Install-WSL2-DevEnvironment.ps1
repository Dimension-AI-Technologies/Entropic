#Requires -Version 5.1

<#
.SYNOPSIS
    Installs WSL2 with Ubuntu, Node.js via NVM, Claude Code, and Gemini CLI
.DESCRIPTION
    This script performs a complete setup of WSL2 development environment with:
    - Windows Terminal installation (if not present)
    - WSL2 and Ubuntu installation (handling partial installations)
    - IPv6 disabling in WSL2 (required for Claude Code compatibility)
    - Node.js installation via NVM
    - Claude Code CLI (@anthropic-ai/claude-code)
    - Gemini CLI (@google/gemini-cli)
.NOTES
    Author: WSL2 Automation Script
    Version: 1.0
    Requires: Windows 10 Build 19041+ or Windows 11
#>

# Self-elevation check and implementation
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Elevating to Administrator privileges..." -ForegroundColor Yellow
    Start-Process PowerShell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" $args" -Verb RunAs
    exit
}

# Function to test Windows version compatibility
function Test-WindowsVersion {
    $osVersion = [System.Environment]::OSVersion.Version
    if ($osVersion.Major -lt 10 -or ($osVersion.Major -eq 10 -and $osVersion.Build -lt 19041)) {
        return $false
    }
    return $true
}

# Function to check if Windows Terminal is installed
function Test-WindowsTerminal {
    try {
        # Check via winget
        $wingetList = winget list --id Microsoft.WindowsTerminal --exact 2>$null
        if ($wingetList -match "Microsoft.WindowsTerminal") {
            return $true
        }
        
        # Check if Windows Terminal executable exists
        $terminalPath = Get-Command wt -ErrorAction SilentlyContinue
        if ($terminalPath) {
            return $true
        }
        
        # Check in common installation paths
        $appxPath = Get-AppxPackage -Name Microsoft.WindowsTerminal -ErrorAction SilentlyContinue
        if ($appxPath) {
            return $true
        }
        
        return $false
    } catch {
        return $false
    }
}

# Function to install Windows Terminal
function Install-WindowsTerminal {
    Write-Host "`n=== Installing Windows Terminal ===" -ForegroundColor Cyan
    Write-Host "Windows Terminal provides the best experience for WSL2..." -ForegroundColor Yellow
    
    try {
        # Check if winget is available
        $wingetPath = Get-Command winget -ErrorAction SilentlyContinue
        if (-not $wingetPath) {
            Write-Warning "Windows Package Manager (winget) is not available."
            Write-Host "Please install Windows Terminal manually from the Microsoft Store." -ForegroundColor Yellow
            Write-Host "URL: " -NoNewline
            Write-Host "https://aka.ms/terminal" -ForegroundColor Cyan
            Write-Host "`nPress any key to continue without Windows Terminal..." -ForegroundColor Gray
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            return $false
        }
        
        Write-Host "Installing Windows Terminal via winget..." -ForegroundColor Yellow
        Write-Host "This may take a few minutes..." -ForegroundColor Gray
        
        # Accept source agreements silently
        $installResult = Start-Process -FilePath "winget" -ArgumentList "install", "--id", "Microsoft.WindowsTerminal", "--exact", "--silent", "--accept-source-agreements", "--accept-package-agreements" -Wait -PassThru -NoNewWindow
        
        if ($installResult.ExitCode -eq 0) {
            Write-Host "Windows Terminal installed successfully!" -ForegroundColor Green
            
            # Refresh PATH environment variable
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            
            return $true
        } else {
            Write-Warning "Windows Terminal installation failed with exit code: $($installResult.ExitCode)"
            Write-Host "You can install it manually from: " -NoNewline
            Write-Host "https://aka.ms/terminal" -ForegroundColor Cyan
            Write-Host "`nPress any key to continue..." -ForegroundColor Gray
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            return $false
        }
        
    } catch {
        Write-Error "Failed to install Windows Terminal: $_"
        return $false
    }
}

# Function to check WSL2 installation status
function Test-WSL2Status {
    $status = @{
        WSLInstalled = $false
        WSL2Default = $false
        UbuntuInstalled = $false
        FeaturesEnabled = $false
    }
    
    try {
        # Check if WSL command exists
        $null = Get-Command wsl -ErrorAction Stop
        $status.WSLInstalled = $true
        
        # Check default version
        $defaultVersion = wsl --status 2>&1 | Select-String "Default Version: 2"
        if ($defaultVersion) {
            $status.WSL2Default = $true
        }
        
        # Check for Ubuntu installation
        $distros = wsl --list --quiet 2>$null
        if ($distros -match "Ubuntu") {
            $status.UbuntuInstalled = $true
        }
        
        # Check Windows features
        $wslFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -ErrorAction SilentlyContinue
        $vmFeature = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -ErrorAction SilentlyContinue
        
        if ($wslFeature.State -eq "Enabled" -and $vmFeature.State -eq "Enabled") {
            $status.FeaturesEnabled = $true
        }
    } catch {
        # WSL not installed
    }
    
    return $status
}

# Function to enable required Windows features
function Enable-WSLFeatures {
    Write-Host "`n=== Enabling Required Windows Features ===" -ForegroundColor Cyan
    
    $restartRequired = $false
    
    # Check and enable WSL feature
    $wslFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
    if ($wslFeature.State -ne "Enabled") {
        Write-Host "Enabling Windows Subsystem for Linux..." -ForegroundColor Yellow
        Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -All -NoRestart | Out-Null
        $restartRequired = $true
    }
    
    # Check and enable Virtual Machine Platform
    $vmFeature = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform
    if ($vmFeature.State -ne "Enabled") {
        Write-Host "Enabling Virtual Machine Platform..." -ForegroundColor Yellow
        Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All -NoRestart | Out-Null
        $restartRequired = $true
    }
    
    return $restartRequired
}

# Function to install or repair WSL2
function Install-WSL2Ubuntu {
    Write-Host "`n=== Installing WSL2 and Ubuntu ===" -ForegroundColor Cyan
    
    try {
        # Set WSL2 as default version
        Write-Host "Setting WSL2 as default version..." -ForegroundColor Yellow
        wsl --set-default-version 2 2>&1 | Out-Null
        
        # Check if Ubuntu already exists
        $existingUbuntu = wsl --list --quiet 2>$null | Where-Object { $_ -match "Ubuntu" }
        
        if ($existingUbuntu) {
            Write-Host "Ubuntu is already installed. Checking version..." -ForegroundColor Green
            $ubuntuVersion = wsl --list --verbose 2>$null | Where-Object { $_ -match "Ubuntu.*2" }
            if (-not $ubuntuVersion) {
                Write-Host "Converting Ubuntu to WSL2..." -ForegroundColor Yellow
                wsl --set-version Ubuntu 2
            }
        } else {
            # Install Ubuntu
            Write-Host "Installing Ubuntu 24.04 LTS..." -ForegroundColor Yellow
            Write-Host "This may take several minutes..." -ForegroundColor Gray
            
            # Try modern installation method first
            $installResult = Start-Process -FilePath "wsl.exe" -ArgumentList "--install", "-d", "Ubuntu-24.04", "--no-launch" -Wait -PassThru
            
            if ($installResult.ExitCode -ne 0) {
                # Fallback to Ubuntu without version
                Write-Host "Trying alternative Ubuntu installation..." -ForegroundColor Yellow
                $installResult = Start-Process -FilePath "wsl.exe" -ArgumentList "--install", "-d", "Ubuntu", "--no-launch" -Wait -PassThru
            }
            
            if ($installResult.ExitCode -ne 0) {
                throw "Ubuntu installation failed with exit code: $($installResult.ExitCode)"
            }
        }
        
        # Update WSL kernel
        Write-Host "Updating WSL kernel..." -ForegroundColor Yellow
        wsl --update 2>&1 | Out-Null
        
        Write-Host "WSL2 and Ubuntu installation completed!" -ForegroundColor Green
        return $true
        
    } catch {
        Write-Error "Failed to install WSL2/Ubuntu: $_"
        return $false
    }
}

# Function to execute commands in WSL
function Invoke-WSLCommand {
    param(
        [string]$Command,
        [switch]$Quiet
    )
    
    if (-not $Quiet) {
        Write-Host "WSL: $Command" -ForegroundColor DarkGray
    }
    
    # Set UTF-8 for proper output handling
    $env:WSL_UTF8 = 1
    
    $output = wsl -e bash -c $Command 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -ne 0) {
        Write-Warning "Command failed with exit code $exitCode"
        if ($output) {
            Write-Host $output -ForegroundColor Red
        }
        return $null
    }
    
    return $output
}

# Function to disable IPv6 in WSL2/Ubuntu
function Disable-IPv6InWSL {
    Write-Host "`n=== Disabling IPv6 in WSL2/Ubuntu ===" -ForegroundColor Cyan
    Write-Host "This is required for Claude Code compatibility..." -ForegroundColor Yellow
    
    try {
        # Create sysctl configuration to disable IPv6
        $disableIPv6Script = @'
# Disable IPv6 for Claude Code compatibility
echo "Disabling IPv6..." >&2
echo "net.ipv6.conf.all.disable_ipv6 = 1" | sudo tee -a /etc/sysctl.conf >/dev/null
echo "net.ipv6.conf.default.disable_ipv6 = 1" | sudo tee -a /etc/sysctl.conf >/dev/null
echo "net.ipv6.conf.lo.disable_ipv6 = 1" | sudo tee -a /etc/sysctl.conf >/dev/null

# Apply the changes immediately
sudo sysctl -p >/dev/null 2>&1

# Also disable IPv6 in the current session
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1 >/dev/null 2>&1
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1 >/dev/null 2>&1
sudo sysctl -w net.ipv6.conf.lo.disable_ipv6=1 >/dev/null 2>&1

# Verify IPv6 is disabled
if [ $(cat /proc/sys/net/ipv6/conf/all/disable_ipv6) -eq 1 ]; then
    echo "IPv6 successfully disabled" >&2
else
    echo "Failed to disable IPv6" >&2
    exit 1
fi
'@
        
        $result = Invoke-WSLCommand $disableIPv6Script
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "IPv6 has been disabled successfully" -ForegroundColor Green
            Write-Host "This change is persistent across WSL restarts" -ForegroundColor Gray
            return $true
        } else {
            Write-Warning "Failed to disable IPv6. Claude Code may not function properly."
            return $false
        }
        
    } catch {
        Write-Error "Error disabling IPv6: $_"
        return $false
    }
}

# Function to install Node.js via NVM
function Install-NodeJS {
    Write-Host "`n=== Installing Node.js via NVM ===" -ForegroundColor Cyan
    
    try {
        # Install prerequisites
        Write-Host "Installing prerequisites..." -ForegroundColor Yellow
        Invoke-WSLCommand "sudo apt-get update && sudo apt-get install -y curl build-essential" | Out-Null
        
        # Check if NVM is already installed
        $nvmCheck = Invoke-WSLCommand "command -v nvm" -Quiet
        if ($nvmCheck) {
            Write-Host "NVM is already installed" -ForegroundColor Green
        } else {
            # Install NVM
            Write-Host "Installing NVM (Node Version Manager)..." -ForegroundColor Yellow
            $nvmInstallScript = @'
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc
'@
            Invoke-WSLCommand $nvmInstallScript | Out-Null
        }
        
        # Install latest LTS Node.js
        Write-Host "Installing latest LTS Node.js..." -ForegroundColor Yellow
        $nodeInstallScript = @'
source ~/.nvm/nvm.sh
nvm install --lts
nvm alias default node
nvm use default
'@
        Invoke-WSLCommand $nodeInstallScript | Out-Null
        
        # Verify installation
        $nodeVersion = Invoke-WSLCommand "source ~/.nvm/nvm.sh && node --version" -Quiet
        $npmVersion = Invoke-WSLCommand "source ~/.nvm/nvm.sh && npm --version" -Quiet
        
        Write-Host "Node.js installed successfully!" -ForegroundColor Green
        Write-Host "  Node.js version: $nodeVersion" -ForegroundColor Gray
        Write-Host "  npm version: $npmVersion" -ForegroundColor Gray
        
        return $true
        
    } catch {
        Write-Error "Failed to install Node.js: $_"
        return $false
    }
}

# Function to configure npm and install CLI tools
function Install-CLITools {
    Write-Host "`n=== Installing Claude Code and Gemini CLI ===" -ForegroundColor Cyan
    
    try {
        # Configure npm to avoid permission issues
        Write-Host "Configuring npm global directory..." -ForegroundColor Yellow
        $npmConfigScript = @'
source ~/.nvm/nvm.sh
mkdir -p ~/.npm-global
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
'@
        Invoke-WSLCommand $npmConfigScript | Out-Null
        
        # Install Claude Code
        Write-Host "`nInstalling Claude Code CLI..." -ForegroundColor Yellow
        Write-Host "Package: @anthropic-ai/claude-code" -ForegroundColor Gray
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
        } else {
            Write-Warning "Claude Code installation may have failed. Please verify manually."
        }
        
        # Install Gemini CLI
        Write-Host "`nInstalling Gemini CLI..." -ForegroundColor Yellow
        Write-Host "Package: @google/gemini-cli" -ForegroundColor Gray
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
        } else {
            Write-Warning "Gemini CLI installation may have failed. Please verify manually."
        }
        
        # Show installed global packages
        Write-Host "`nInstalled global npm packages:" -ForegroundColor Yellow
        $globalPackages = Invoke-WSLCommand "source ~/.nvm/nvm.sh && source ~/.bashrc && npm list -g --depth=0" -Quiet
        Write-Host $globalPackages -ForegroundColor Gray
        
        return $true
        
    } catch {
        Write-Error "Failed to install CLI tools: $_"
        return $false
    }
}

# Main installation process
function Start-Installation {
    Write-Host "=== WSL2 Development Environment Setup ===" -ForegroundColor Magenta
    Write-Host "This script will install:" -ForegroundColor White
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
    
    # Check and install Windows Terminal if needed
    Write-Host "Checking for Windows Terminal..." -ForegroundColor Yellow
    if (-not (Test-WindowsTerminal)) {
        Write-Host "Windows Terminal is not installed." -ForegroundColor Yellow
        if (-not (Install-WindowsTerminal)) {
            Write-Warning "Continuing without Windows Terminal. Consider installing it for the best WSL2 experience."
        }
    } else {
        Write-Host "Windows Terminal is already installed." -ForegroundColor Green
    }
    
    # Check current WSL status
    Write-Host "`nChecking current WSL status..." -ForegroundColor Yellow
    $wslStatus = Test-WSL2Status
    
    Write-Host "`nCurrent Status:" -ForegroundColor Cyan
    Write-Host "  WSL Installed: $($wslStatus.WSLInstalled)" -ForegroundColor Gray
    Write-Host "  WSL2 Default: $($wslStatus.WSL2Default)" -ForegroundColor Gray
    Write-Host "  Ubuntu Installed: $($wslStatus.UbuntuInstalled)" -ForegroundColor Gray
    Write-Host "  Features Enabled: $($wslStatus.FeaturesEnabled)" -ForegroundColor Gray
    
    # Enable Windows features if needed
    if (-not $wslStatus.FeaturesEnabled) {
        $restartRequired = Enable-WSLFeatures
        
        if ($restartRequired) {
            Write-Host "`n*** RESTART REQUIRED ***" -ForegroundColor Red
            Write-Host "Windows features have been enabled." -ForegroundColor Yellow
            Write-Host "Please restart your computer and run this script again." -ForegroundColor Yellow
            Write-Host "Press any key to exit..." -ForegroundColor Gray
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            return
        }
    }
    
    # Install or repair WSL2 and Ubuntu
    if (-not $wslStatus.UbuntuInstalled -or -not $wslStatus.WSL2Default) {
        if (-not (Install-WSL2Ubuntu)) {
            Write-Error "WSL2 installation failed. Exiting."
            return
        }
        
        # Wait for WSL to be ready
        Write-Host "`nWaiting for WSL2 to initialize..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
    
    # Disable IPv6 (required for Claude Code)
    if (-not (Disable-IPv6InWSL)) {
        Write-Warning "Failed to disable IPv6. Claude Code may not work properly."
        Write-Host "You can manually disable IPv6 later if needed." -ForegroundColor Yellow
    }
    
    # Install Node.js
    if (-not (Install-NodeJS)) {
        Write-Error "Node.js installation failed. Exiting."
        return
    }
    
    # Install CLI tools
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

# Run the installation
Start-Installation