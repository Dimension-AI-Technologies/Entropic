#Requires -Version 7.0

#Requires -Version 5.1

<#
.SYNOPSIS
    Disables IPv6 in WSL2/Ubuntu
.DESCRIPTION
    This module disables IPv6 in WSL2/Ubuntu which is required for Claude Code compatibility.
    The changes are persistent across WSL restarts.
.NOTES
    Part of WSL2 Development Environment Setup
    Version: 1.0
#>

# Import utilities module
Import-Module "$PSScriptRoot\WSL-Utilities.ps1" -Force

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

# Function to verify IPv6 status
function Test-IPv6Status {
    try {
        $status = Invoke-WSLCommand "cat /proc/sys/net/ipv6/conf/all/disable_ipv6" -Quiet
        return $status -eq "1"
    } catch {
        return $false
    }
}

# Main function for this module
function Configure-IPv6ForClaudeCode {
    # Check if IPv6 is already disabled
    if (Test-IPv6Status) {
        Write-Host "IPv6 is already disabled in WSL2" -ForegroundColor Green
        return $true
    }
    
    # Disable IPv6
    return Disable-IPv6InWSL
}

# Export functions
Export-ModuleMember -Function Configure-IPv6ForClaudeCode, Test-IPv6Status