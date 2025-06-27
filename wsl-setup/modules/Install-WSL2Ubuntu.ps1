#Requires -Version 5.1

<#
.SYNOPSIS
    Installs and configures WSL2 with Ubuntu
.DESCRIPTION
    This module handles WSL2 feature enablement, Ubuntu installation, and WSL2 configuration.
    Includes status checking and partial installation recovery.
.NOTES
    Part of WSL2 Development Environment Setup
    Version: 1.0
#>

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

# Main function for this module
function Install-WSL2UbuntuEnvironment {
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
            return @{
                Success = $false
                RestartRequired = $true
            }
        }
    }
    
    # Install or repair WSL2 and Ubuntu
    if (-not $wslStatus.UbuntuInstalled -or -not $wslStatus.WSL2Default) {
        if (-not (Install-WSL2Ubuntu)) {
            return @{
                Success = $false
                RestartRequired = $false
            }
        }
        
        # Wait for WSL to be ready
        Write-Host "`nWaiting for WSL2 to initialize..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
    
    return @{
        Success = $true
        RestartRequired = $false
    }
}

# Export functions
Export-ModuleMember -Function Install-WSL2UbuntuEnvironment, Test-WSL2Status