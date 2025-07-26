# Debug-Context7-MCP.ps1
# Comprehensive Context7 MCP Server Diagnostic Script
# Performs systematic root-cause analysis for Context7 MCP connection issues
# Works in any project directory - automatically finds relevant Claude Code logs

param(
    [switch]$KillOrphanedProcesses,
    [switch]$Verbose,
    [switch]$Live,
    [string]$ProjectPath = ""
)

Write-Host "=== Context7 MCP Server Diagnostic Tool ===" -ForegroundColor Cyan
if ($Live) {
    Write-Host "[LIVE MODE] Actions will be executed" -ForegroundColor Red
} else {
    Write-Host "[SIMULATED MODE] Dry run only (use -Live to execute actions)" -ForegroundColor Yellow
}
Write-Host "Performing comprehensive system analysis..." -ForegroundColor Gray
Write-Host ""

$issues = @()
$recommendations = @()

# TEST 1: Basic Node.js Environment Check
Write-Host "TEST 1: Node.js Environment" -ForegroundColor Yellow
try {
    $nodeVersion = & node --version 2>$null
    $npmVersion = & npm --version 2>$null
    $npxVersion = & npx --version 2>$null
    
    Write-Host "  [OK] Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "  [OK] NPM: $npmVersion" -ForegroundColor Green
    Write-Host "  [OK] NPX: $npxVersion" -ForegroundColor Green
}
catch {
    $issues += "Node.js environment not properly installed"
    Write-Host "  [ERROR] Node.js environment issues detected" -ForegroundColor Red
}

# TEST 2: Context7 Package Installation Check
Write-Host "`nTEST 2: Context7 Package Installation" -ForegroundColor Yellow
try {
    $globalPackages = & npm list -g @upstash/context7-mcp 2>$null
    if ($globalPackages -match "@upstash/context7-mcp@") {
        $version = ($globalPackages | Select-String "@upstash/context7-mcp@(.+)" | ForEach-Object { $_.Matches[0].Groups[1].Value })
        Write-Host "  [OK] Context7 MCP installed globally: v$version" -ForegroundColor Green
        
        # Check package integrity
        $packagePath = "$env:APPDATA\npm\node_modules\@upstash\context7-mcp"
        if (Test-Path $packagePath) {
            $distPath = Join-Path $packagePath "dist\index.js"
            if (Test-Path $distPath) {
                Write-Host "  [OK] Package files intact: $distPath" -ForegroundColor Green
            } else {
                $issues += "Context7 package files missing or corrupted"
                Write-Host "  [ERROR] Package files missing: $distPath" -ForegroundColor Red
            }
        }
    } else {
        $issues += "Context7 MCP package not installed globally"
        Write-Host "  [ERROR] Context7 MCP not found in global packages" -ForegroundColor Red
        $recommendations += "Install Context7: npm install -g @upstash/context7-mcp"
    }
}
catch {
    $issues += "Unable to check NPM global packages"
    Write-Host "  [ERROR] Error checking global packages" -ForegroundColor Red
}

# TEST 3: Direct Node Execution Test
Write-Host "`nTEST 3: Direct Node Execution Test" -ForegroundColor Yellow
try {
    $contextPath = "$env:APPDATA\npm\node_modules\@upstash\context7-mcp\dist\index.js"
    if (Test-Path $contextPath) {
        if ($Live) {
            $job = Start-Job -ScriptBlock {
                param($path)
                & node $path 2>&1
            } -ArgumentList $contextPath
            
            Start-Sleep -Seconds 3
            $output = Receive-Job $job
            Stop-Job $job -Force
            Remove-Job $job -Force
            
            if ($output -match "Context7 Documentation MCP Server running") {
                Write-Host "  [OK] Context7 server starts successfully" -ForegroundColor Green
            } else {
                $issues += "Context7 server fails to start with direct node execution"
                Write-Host "  [ERROR] Context7 server startup failed" -ForegroundColor Red
                if ($Verbose) {
                    Write-Host "  Debug output: $output" -ForegroundColor Gray
                }
            }
        } else {
            Write-Host "  [SIMULATED] Would test node execution of Context7 server" -ForegroundColor Yellow
            Write-Host "    Command: node `"$contextPath`"" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [ERROR] Context7 package not found for direct execution" -ForegroundColor Red
    }
}
catch {
    $issues += "Error testing direct node execution"
    Write-Host "  [ERROR] Error during direct execution test" -ForegroundColor Red
}

# TEST 4: NPX Execution Test
Write-Host "`nTEST 4: NPX Execution Test" -ForegroundColor Yellow
try {
    if ($Live) {
        $job = Start-Job -ScriptBlock {
            & npx -y @upstash/context7-mcp --version 2>&1
        }
        
        $completed = Wait-Job $job -Timeout 8
        if ($completed) {
            $output = Receive-Job $job
            Write-Host "  [OK] NPX execution completed" -ForegroundColor Green
            if ($Verbose) {
                Write-Host "  NPX output: $output" -ForegroundColor Gray
            }
        } else {
            $issues += "NPX execution hangs/times out"
            Write-Host "  [ERROR] NPX execution timed out (common Windows issue)" -ForegroundColor Red
            $recommendations += "Use direct node path instead of NPX for Claude Code MCP configuration"
        }
        
        Stop-Job $job -Force
        Remove-Job $job -Force
    } else {
        Write-Host "  [SIMULATED] Would test NPX execution (8 second timeout)" -ForegroundColor Yellow
        Write-Host "    Command: npx -y @upstash/context7-mcp --version" -ForegroundColor Gray
    }
}
catch {
    $issues += "NPX execution failed"
    Write-Host "  [ERROR] NPX execution error" -ForegroundColor Red
}

# TEST 5: Claude Code Version and Configuration
Write-Host "`nTEST 5: Claude Code Configuration" -ForegroundColor Yellow
try {
    $claudeVersion = & claude --version 2>$null
    Write-Host "  [OK] Claude Code version: $claudeVersion" -ForegroundColor Green
    
    $mcpList = & claude mcp list 2>$null
    if ($mcpList -match "context7") {
        Write-Host "  [OK] Context7 configured in Claude Code MCP" -ForegroundColor Green
        if ($Verbose) {
            Write-Host "  MCP servers: $mcpList" -ForegroundColor Gray
        }
    } else {
        $issues += "Context7 not configured in Claude Code MCP"
        Write-Host "  [ERROR] Context7 not found in MCP configuration" -ForegroundColor Red
        $recommendations += "Add Context7 to MCP: claude mcp add context7 -- node `"$env:APPDATA\npm\node_modules\@upstash\context7-mcp\dist\index.js`""
    }
}
catch {
    $issues += "Claude Code not found or not working"
    Write-Host "  [ERROR] Claude Code issues detected" -ForegroundColor Red
}

# TEST 6: Process Analysis - CRITICAL CHECK
Write-Host "`nTEST 6: Process Analysis (CRITICAL)" -ForegroundColor Yellow
try {
    $nodeProcesses = Get-WmiObject -Class Win32_Process -Filter "Name='node.exe'" | Where-Object {
        $_.CommandLine -match "context7-mcp"
    }
    
    if ($nodeProcesses.Count -gt 0) {
        Write-Host "  [WARNING] FOUND ORPHANED CONTEXT7 PROCESSES:" -ForegroundColor Red
        foreach ($proc in $nodeProcesses) {
            Write-Host "    PID $($proc.ProcessId): $($proc.CommandLine)" -ForegroundColor Red
        }
        $issues += "Orphaned Context7 processes detected (CRITICAL ISSUE)"
        $recommendations += "Kill orphaned processes or restart Windows"
        
        if ($KillOrphanedProcesses) {
            if ($Live) {
                Write-Host "  [CLEANUP] Attempting to kill orphaned processes..." -ForegroundColor Magenta
                foreach ($proc in $nodeProcesses) {
                    try {
                        Stop-Process -Id $proc.ProcessId -Force
                        Write-Host "    [OK] Killed PID $($proc.ProcessId)" -ForegroundColor Green
                    }
                    catch {
                        Write-Host "    [ERROR] Failed to kill PID $($proc.ProcessId)" -ForegroundColor Red
                    }
                }
            } else {
                Write-Host "  [SIMULATED] Would kill orphaned processes..." -ForegroundColor Yellow
                foreach ($proc in $nodeProcesses) {
                    Write-Host "    [SIMULATED] Would kill PID $($proc.ProcessId): $($proc.CommandLine)" -ForegroundColor Yellow
                }
            }
        }
    } else {
        Write-Host "  [OK] No orphaned Context7 processes found" -ForegroundColor Green
    }
    
    # Check for other potentially conflicting node processes
    $allNodeProcesses = Get-WmiObject -Class Win32_Process -Filter "Name='node.exe'" 
    Write-Host "  [INFO] Total node.exe processes running: $($allNodeProcesses.Count)" -ForegroundColor Cyan
    
    if ($Verbose) {
        foreach ($proc in $allNodeProcesses) {
            Write-Host "    PID $($proc.ProcessId): $($proc.CommandLine)" -ForegroundColor Gray
        }
    }
}
catch {
    Write-Host "  [ERROR] Error analyzing processes" -ForegroundColor Red
}

# TEST 7: System Level Checks
Write-Host "`nTEST 7: System Level Checks" -ForegroundColor Yellow
try {
    $userContext = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    Write-Host "  [OK] User context: $userContext" -ForegroundColor Green
    
    # Check Windows version
    $osInfo = Get-WmiObject -Class Win32_OperatingSystem
    Write-Host "  [OK] OS: $($osInfo.Caption) $($osInfo.Version)" -ForegroundColor Green
    
    # Check for potential file locks or permission issues
    $contextPath = "$env:APPDATA\npm\node_modules\@upstash\context7-mcp"
    if (Test-Path $contextPath) {
        if ($Live) {
            try {
                $testFile = Join-Path $contextPath "test.tmp"
                "test" | Out-File $testFile -ErrorAction Stop
                Remove-Item $testFile -ErrorAction SilentlyContinue
                Write-Host "  [OK] File system permissions OK" -ForegroundColor Green
            }
            catch {
                $issues += "File system permission issues detected"
                Write-Host "  [ERROR] File system permission issues" -ForegroundColor Red
            }
        } else {
            Write-Host "  [SIMULATED] Would test file system permissions" -ForegroundColor Yellow
            Write-Host "    Would create/delete test file in: $contextPath" -ForegroundColor Gray
        }
    }
}
catch {
    Write-Host "  [ERROR] System level check errors" -ForegroundColor Red
}

# TEST 8: MCP Log Analysis
Write-Host "`nTEST 8: MCP Log Analysis" -ForegroundColor Yellow
try {
    $cacheDir = "$env:LOCALAPPDATA\claude-cli-nodejs\Cache"
    if (Test-Path $cacheDir) {
        # Get target directory (either specified or current working directory)
        if ($ProjectPath -ne "") {
            $currentPath = Get-Item $ProjectPath -ErrorAction SilentlyContinue
            if (-not $currentPath) {
                Write-Host "  [WARNING] Specified project path not found: $ProjectPath" -ForegroundColor Yellow
                $currentPath = Get-Location
            }
        } else {
            $currentPath = Get-Location
        }
        
        $currentDirName = Split-Path $currentPath -Leaf
        $parentPath = Split-Path $currentPath -Parent
        $parentDirName = if ($parentPath) { Split-Path $parentPath -Leaf } else { "" }
        
        # Look for cache directories that might match current project
        $searchTerms = @($currentDirName)
        if ($parentDirName -ne "") { $searchTerms += $parentDirName }
        
        $projectCacheDirs = Get-ChildItem $cacheDir -Directory | Where-Object { 
            $cacheName = $_.Name
            $match = $false
            foreach ($term in $searchTerms) {
                if ($cacheName -match [regex]::Escape($term)) {
                    $match = $true
                    break
                }
            }
            $match
        } | Sort-Object LastWriteTime -Descending
        
        if ($projectCacheDirs.Count -eq 0) {
            # If no specific match, try to find any project with Context7 logs
            $projectCacheDirs = Get-ChildItem $cacheDir -Directory | Where-Object {
                Test-Path (Join-Path $_.FullName "mcp-logs-context7")
            } | Sort-Object LastWriteTime -Descending
        }
        
        if ($projectCacheDirs.Count -gt 0) {
            $projectCacheDir = $projectCacheDirs | Select-Object -First 1
            Write-Host "  [INFO] Checking logs for: $($projectCacheDir.Name)" -ForegroundColor Cyan
            
            $mcpLogsDir = Join-Path $projectCacheDir.FullName "mcp-logs-context7"
            if (Test-Path $mcpLogsDir) {
                $latestLog = Get-ChildItem $mcpLogsDir -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
                if ($latestLog) {
                    Write-Host "  [OK] Latest MCP log: $($latestLog.Name)" -ForegroundColor Green
                    $logContent = Get-Content $latestLog.FullName | ConvertFrom-Json
                    $connectionFailed = $logContent | Where-Object { $_.debug -match "Connection failed" }
                    if ($connectionFailed) {
                        Write-Host "  [ERROR] Connection failures detected in logs" -ForegroundColor Red
                        $issues += "MCP connection failures logged"
                        if ($Verbose) {
                            $connectionFailed | ForEach-Object { Write-Host "    $($_.timestamp): $($_.debug)" -ForegroundColor Gray }
                        }
                    } else {
                        Write-Host "  [OK] No connection failures in latest log" -ForegroundColor Green
                    }
                } else {
                    Write-Host "  [WARNING] MCP log directory exists but no log files found" -ForegroundColor Yellow
                }
            } else {
                Write-Host "  [INFO] No Context7 MCP logs found for this project" -ForegroundColor Cyan
            }
        } else {
            Write-Host "  [INFO] No Claude Code project cache found - no MCP logs to analyze" -ForegroundColor Cyan
            Write-Host "    This is normal if Context7 hasn't been used in any Claude Code sessions yet" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [INFO] No Claude Code cache directory found" -ForegroundColor Cyan
        Write-Host "    Cache location: $cacheDir" -ForegroundColor Gray
    }
}
catch {
    Write-Host "  [ERROR] Error analyzing MCP logs: $($_.Exception.Message)" -ForegroundColor Red
    if ($Verbose) {
        Write-Host "    Full error: $($_.Exception)" -ForegroundColor Gray
    }
}

# SUMMARY AND RECOMMENDATIONS
Write-Host "`n=== DIAGNOSTIC SUMMARY ===" -ForegroundColor Cyan

if ($issues.Count -eq 0) {
    Write-Host "[SUCCESS] NO CRITICAL ISSUES DETECTED!" -ForegroundColor Green
    Write-Host "Context7 should be working. Try restarting Claude Code session." -ForegroundColor Green
} else {
    Write-Host "[ISSUES] PROBLEMS DETECTED:" -ForegroundColor Red
    $issues | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}

if ($recommendations.Count -gt 0) {
    Write-Host "`n[RECOMMENDATIONS]:" -ForegroundColor Yellow
    $recommendations | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
}

# CRITICAL DECISION LOGIC
$criticalIssues = $issues | Where-Object { $_ -match "orphaned|process|connection" }
if ($criticalIssues.Count -gt 0) {
    Write-Host "`n[CRITICAL] RECOMMENDATION: RESTART WINDOWS" -ForegroundColor Red
    Write-Host "The following issues require a Windows restart to resolve:" -ForegroundColor Red
    $criticalIssues | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host "`nRestarting Windows will:" -ForegroundColor Yellow
    Write-Host "  - Clear all orphaned Node.js processes" -ForegroundColor Yellow
    Write-Host "  - Reset Claude Code session state" -ForegroundColor Yellow
    Write-Host "  - Clear system-level IPC/pipe caches" -ForegroundColor Yellow
    Write-Host "  - Force fresh MCP server connections" -ForegroundColor Yellow
    Write-Host "  - Reset Windows process spawning state" -ForegroundColor Yellow
} else {
    Write-Host "`n[OK] No Windows restart required" -ForegroundColor Green
    Write-Host "Try restarting Claude Code session first." -ForegroundColor Green
}

Write-Host "`n=== USAGE ===" -ForegroundColor Cyan
Write-Host "Default: Simulated mode (dry run)" -ForegroundColor Gray
Write-Host "  -Live              Execute actions (node tests, process kills)" -ForegroundColor Gray
Write-Host "  -KillOrphanedProcesses  Attempt to kill orphaned Context7 processes" -ForegroundColor Gray  
Write-Host "  -Verbose           Show detailed debug output" -ForegroundColor Gray
Write-Host "  -ProjectPath       Specify project directory for log analysis (optional)" -ForegroundColor Gray
Write-Host "`nExamples:" -ForegroundColor Gray
Write-Host "  .\Debug-Context7-MCP.ps1                    # Safe diagnostic only" -ForegroundColor Gray
Write-Host "  .\Debug-Context7-MCP.ps1 -Live              # Run actual tests" -ForegroundColor Gray
Write-Host "  .\Debug-Context7-MCP.ps1 -Live -KillOrphanedProcesses  # Full cleanup" -ForegroundColor Gray
Write-Host "  .\Debug-Context7-MCP.ps1 -ProjectPath 'C:\MyProject'   # Analyze specific project" -ForegroundColor Gray