#Requires -Version 7.0

#Requires -Version 5.1

<#
.SYNOPSIS
    Installs Node.js via NVM in WSL2
.DESCRIPTION
    This module installs Node Version Manager (NVM) and the latest LTS version of Node.js
    in the WSL2 Ubuntu environment.
.NOTES
    Part of WSL2 Development Environment Setup
    Version: 1.0
#>

# Import utilities module
Import-Module "$PSScriptRoot\WSL-Utilities.ps1" -Force

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

# Function to check if Node.js is installed
function Test-NodeJSInstallation {
    try {
        $nodeVersion = Invoke-WSLCommand "source ~/.nvm/nvm.sh && node --version 2>/dev/null" -Quiet
        return $nodeVersion -match "^v\d+"
    } catch {
        return $false
    }
}

# Function to configure npm global directory
function Configure-NpmGlobal {
    Write-Host "Configuring npm global directory..." -ForegroundColor Yellow
    
    try {
        $npmConfigScript = @'
source ~/.nvm/nvm.sh
mkdir -p ~/.npm-global
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
'@
        Invoke-WSLCommand $npmConfigScript | Out-Null
        Write-Host "npm global directory configured" -ForegroundColor Green
        return $true
    } catch {
        Write-Warning "Failed to configure npm global directory"
        return $false
    }
}

# Main function for this module
function Install-NodeJSEnvironment {
    # Check if Node.js is already installed
    if (Test-NodeJSInstallation) {
        Write-Host "Node.js is already installed" -ForegroundColor Green
        $nodeVersion = Invoke-WSLCommand "source ~/.nvm/nvm.sh && node --version" -Quiet
        Write-Host "  Current version: $nodeVersion" -ForegroundColor Gray
    } else {
        if (-not (Install-NodeJS)) {
            return $false
        }
    }
    
    # Configure npm global directory
    Configure-NpmGlobal
    
    return $true
}

# Export functions
Export-ModuleMember -Function Install-NodeJSEnvironment, Test-NodeJSInstallation