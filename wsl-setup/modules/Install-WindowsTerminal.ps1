#Requires -Version 7.0

#Requires -Version 5.1

<#
.SYNOPSIS
    Installs Windows Terminal if not already present
.DESCRIPTION
    This module checks for Windows Terminal installation and installs it via winget if needed.
    Provides fallback instructions for manual installation if winget is not available.
.NOTES
    Part of WSL2 Development Environment Setup
    Version: 1.0
#>

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

# Main function for this module
function Install-WindowsTerminalIfNeeded {
    Write-Host "Checking for Windows Terminal..." -ForegroundColor Yellow
    if (-not (Test-WindowsTerminal)) {
        Write-Host "Windows Terminal is not installed." -ForegroundColor Yellow
        return Install-WindowsTerminal
    } else {
        Write-Host "Windows Terminal is already installed." -ForegroundColor Green
        return $true
    }
}

# Export functions
Export-ModuleMember -Function Install-WindowsTerminalIfNeeded, Test-WindowsTerminal