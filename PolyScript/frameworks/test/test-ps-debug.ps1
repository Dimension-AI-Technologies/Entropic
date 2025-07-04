#!/usr/bin/env pwsh
# Debug PowerShell framework issue

. ../powershell/polyscript.ps1

# Create instance
$example = [PolyScriptExample]::new()

# Call Read directly
try {
    Write-Host "Calling Read method directly..."
    $result = $example.Read($null, @{})
    Write-Host "Read returned: $result"
} catch {
    Write-Host "Error in Read: $_"
    Write-Host "Stack trace: $($_.ScriptStackTrace)"
}

# Test Output method directly
try {
    Write-Host "`nTesting Output method directly..."
    $example.Output("Test string", $false)
    Write-Host "String output succeeded"
    
    $example.Output(@{test = "data"}, $false)
    Write-Host "Hashtable output succeeded"
} catch {
    Write-Host "Error in Output: $_"
}