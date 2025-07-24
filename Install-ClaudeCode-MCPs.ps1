#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [switch]$Live,
    [switch]$User,
    [switch]$Local
)

# Validate scope parameters
if (-not ($User -or $Local)) {
    Write-Host "ERROR: You must specify either -User or -Local flag" -ForegroundColor Red
    exit 1
}

if ($User -and $Local) {
    Write-Host "ERROR: Cannot specify both -User and -Local flags" -ForegroundColor Red
    exit 1
}

$ConfigScope = if ($User) { "user" } else { "local" }

# MCP Servers
$MCPServers = @(
    @{ Name = "Con7"; NodePath = "C:\Users\mathew.burkitt\AppData\Roaming\npm\node_modules\@upstash\context7-mcp\dist\index.js" },
    @{ Name = "ThinkDeep"; NodePath = "C:\Users\mathew.burkitt\AppData\Roaming\npm\node_modules\@modelcontextprotocol\server-sequential-thinking\dist\index.js" },
    @{ Name = "FullPsycho"; NodePath = "C:\Users\mathew.burkitt\source\DT\FullTorrential\dist\index.js" }
)

Write-Host "=== MCP Status Before Changes ===" -ForegroundColor Magenta
if ($Live) {
    claude mcp list
} else {
    Write-Host "[SIMULATION] Would execute: claude mcp list" -ForegroundColor Yellow
}

Write-Host "`n=== Installing MCP Servers ($ConfigScope scope) ===" -ForegroundColor Magenta

foreach ($server in $MCPServers) {
    $command = "claude mcp add --scope $ConfigScope $($server.Name) node `"$($server.NodePath)`""
    
    if ($Live) {
        Write-Host "Executing: $command" -ForegroundColor Green
        Invoke-Expression $command
    } else {
        Write-Host "[SIMULATION] Would execute: $command" -ForegroundColor Yellow
    }
}

Write-Host "`n=== MCP Status After Changes ===" -ForegroundColor Magenta
if ($Live) {
    claude mcp list
} else {
    Write-Host "[SIMULATION] Would execute: claude mcp list" -ForegroundColor Yellow
}

Write-Host "`nDone!" -ForegroundColor Green