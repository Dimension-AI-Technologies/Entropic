#!/usr/bin/env pwsh
# Test PowerShell framework using built-in example

. ../powershell/polyscript.ps1

Write-Host "=== PowerShell CRUD × Modes Test ==="

# Test all operations in different modes
$operations = @('Create', 'Read', 'Update', 'Delete')
$modes = @('Simulate', 'Sandbox', 'Live')

foreach ($op in $operations) {
    Write-Host "`n--- $op Operation ---"
    foreach ($mode in $modes) {
        Write-Host "`n$mode mode:"
        $tool = [PolyScriptExample]::new()
        $args = @{
            Operation = $op
            Mode = $mode
            Resource = if ($op -eq 'Read') { $null } else { 'test-resource' }
            Json = $false
            Force = $true  # Skip confirmations
        }
        $result = $tool.Run($args)
        Write-Host "Exit code: $result"
    }
}

# Test JSON output
Write-Host "`n--- JSON Output Test ---"
$tool = [PolyScriptExample]::new()
$args = @{
    Operation = 'Read'
    Mode = 'Live'
    Json = $true
}
$result = $tool.Run($args)

# Test verbose mode
Write-Host "`n--- Verbose Mode Test ---"
$tool = [PolyScriptExample]::new()
$args = @{
    Operation = 'Read'
    Mode = 'Live'
    Verbose = $true
    Json = $false
}
$result = $tool.Run($args)