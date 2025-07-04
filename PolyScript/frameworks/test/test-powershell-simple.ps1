#!/usr/bin/env pwsh
# Simple test of PowerShell framework

. ../powershell/polyscript.ps1

# Test basic enum availability
Write-Host "Testing enums..."
Write-Host "Operations: $([Operation]::GetNames([Operation]) -join ', ')"
Write-Host "Modes: $([ExecutionMode]::GetNames([ExecutionMode]) -join ', ')"

# Test creating instance
Write-Host "`nTesting PolyScriptExample..."
$example = [PolyScriptExample]::new()

# Test with minimal arguments
$args = @{
    Operation = 'Read'
    Mode = 'Live'
    Json = $false
}

Write-Host "Running Read operation..."
$result = $example.Run($args)
Write-Host "Exit code: $result"

# Test with JSON output
Write-Host "`nTesting JSON output..."
$args.Json = $true
$result = $example.Run($args)
Write-Host "Exit code: $result"