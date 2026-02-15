#Requires -Version 7.0

#Requires -Version 5.1

<#
.SYNOPSIS
    Common utilities for WSL operations
.DESCRIPTION
    This module provides shared functions for executing commands in WSL and other utilities.
.NOTES
    Part of WSL2 Development Environment Setup
    Version: 1.0
#>

# Function to test Windows version compatibility
function Test-WindowsVersion {
    $osVersion = [System.Environment]::OSVersion.Version
    if ($osVersion.Major -lt 10 -or ($osVersion.Major -eq 10 -and $osVersion.Build -lt 19041)) {
        return $false
    }
    return $true
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

# Function to check if running as administrator
function Test-Administrator {
    return ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
}

# Function to ensure administrator privileges
function Ensure-Administrator {
    if (-not (Test-Administrator)) {
        Write-Host "Elevating to Administrator privileges..." -ForegroundColor Yellow
        Start-Process PowerShell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" $args" -Verb RunAs
        exit
    }
}

# Export functions
Export-ModuleMember -Function Test-WindowsVersion, Invoke-WSLCommand, Test-Administrator, Ensure-Administrator