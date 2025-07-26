# Debug-Context7-MCP-WSL2-Ubuntu.ps1
# Comprehensive Context7 MCP Server Diagnostic Script for WSL2/Ubuntu
# Performs systematic root-cause analysis for Context7 MCP connection issues
# Handles WSL2-specific networking, file system, and cross-OS communication challenges
# Works in any project directory - automatically finds relevant Claude Code logs

param(
    [switch]$KillOrphanedProcesses,
    [switch]$Verbose,
    [switch]$Live,
    [string]$ProjectPath = ""
)

Write-Host "=== Context7 MCP Server Diagnostic Tool (WSL2/Ubuntu) ===" -ForegroundColor Cyan
if ($Live) {
    Write-Host "[LIVE MODE] Actions will be executed" -ForegroundColor Red
} else {
    Write-Host "[SIMULATED MODE] Dry run only (use -Live to execute actions)" -ForegroundColor Yellow
}
Write-Host "Performing comprehensive WSL2/Ubuntu system analysis..." -ForegroundColor Gray
Write-Host ""

$issues = @()
$recommendations = @()

# WSL2-specific path configurations
$npmPrefix = if (Get-Command npm -ErrorAction SilentlyContinue) { & npm config get prefix } else { "/usr/local" }
$context7Path = "$npmPrefix/lib/node_modules/@upstash/context7-mcp"
$cacheDir = "$env:HOME/.cache/claude-cli-nodejs/Cache"

# WSL2 detection and validation
Write-Host "WSL2 Environment Validation:" -ForegroundColor Cyan
try {
    $wslVersion = & cat /proc/version 2>$null
    if ($wslVersion -match "WSL2|microsoft") {
        Write-Host "  [OK] Running in WSL2 environment" -ForegroundColor Green
        if ($Verbose) {
            Write-Host "    Version: $wslVersion" -ForegroundColor Gray
        }
    } else {
        $issues += "Not running in WSL2 environment"
        Write-Host "  [WARNING] WSL2 environment not detected" -ForegroundColor Yellow
    }
    
    # Check Ubuntu version
    $ubuntuVersion = & lsb_release -d 2>$null | ForEach-Object { ($_ -split '\t')[1] }
    if ($ubuntuVersion) {
        Write-Host "  [OK] Ubuntu: $ubuntuVersion" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Ubuntu version detection failed" -ForegroundColor Yellow
    }
}
catch {
    $issues += "Error detecting WSL2/Ubuntu environment"
    Write-Host "  [ERROR] Environment detection failed" -ForegroundColor Red
}

# TEST 1: Basic Node.js Environment Check
Write-Host "`nTEST 1: Node.js Environment" -ForegroundColor Yellow
try {
    $nodeVersion = & node --version 2>$null
    $npmVersion = & npm --version 2>$null
    $npxVersion = & npx --version 2>$null
    
    if ($nodeVersion) {
        Write-Host "  [OK] Node.js: $nodeVersion" -ForegroundColor Green
        
        # Check Node.js installation method (apt vs manual vs nvm)
        $nodeWhich = & which node 2>$null
        if ($nodeWhich -match "/usr/bin/node") {
            Write-Host "  [INFO] Node.js installed via apt package manager" -ForegroundColor Cyan
        } elseif ($nodeWhich -match "nvm") {
            Write-Host "  [INFO] Node.js installed via nvm" -ForegroundColor Cyan
        } else {
            Write-Host "  [INFO] Node.js installation method: $nodeWhich" -ForegroundColor Cyan
        }
    } else {
        $issues += "Node.js not installed or not in PATH"
        Write-Host "  [ERROR] Node.js not found" -ForegroundColor Red
        $recommendations += "Install Node.js: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs"
    }
    
    if ($npmVersion) {
        Write-Host "  [OK] NPM: $npmVersion" -ForegroundColor Green
    } else {
        $issues += "NPM not installed or not in PATH"
        Write-Host "  [ERROR] NPM not found" -ForegroundColor Red
    }
    
    if ($npxVersion) {
        Write-Host "  [OK] NPX: $npxVersion" -ForegroundColor Green
    } else {
        $issues += "NPX not installed or not in PATH"
        Write-Host "  [ERROR] NPX not found" -ForegroundColor Red
    }
}
catch {
    $issues += "Node.js environment not properly installed"
    Write-Host "  [ERROR] Node.js environment issues detected" -ForegroundColor Red
}

# TEST 2: WSL2-Specific Networking Check
Write-Host "`nTEST 2: WSL2 Networking & Connectivity" -ForegroundColor Yellow
try {
    # Test internet connectivity
    $pingResult = & ping -c 1 -W 2 8.8.8.8 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Internet connectivity working" -ForegroundColor Green
    } else {
        $issues += "WSL2 internet connectivity issues"
        Write-Host "  [ERROR] No internet connectivity" -ForegroundColor Red
        $recommendations += "Check WSL2 networking: wsl --shutdown && wsl"
    }
    
    # Test DNS resolution
    $dnsResult = & nslookup npmjs.com 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] DNS resolution working" -ForegroundColor Green
    } else {
        $issues += "WSL2 DNS resolution problems"
        Write-Host "  [ERROR] DNS resolution failed" -ForegroundColor Red
        $recommendations += "Fix WSL2 DNS: echo 'nameserver 8.8.8.8' | sudo tee /etc/resolv.conf"
    }
    
    # Check for common WSL2 networking issues
    $resolvConf = & cat /etc/resolv.conf 2>$null
    if ($resolvConf -match "172\.") {
        Write-Host "  [INFO] WSL2 internal networking detected" -ForegroundColor Cyan
    }
    
    # Test npm registry connectivity
    if ($Live) {
        $registryTest = & npm ping 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] NPM registry connectivity" -ForegroundColor Green
        } else {
            $issues += "NPM registry unreachable from WSL2"
            Write-Host "  [ERROR] NPM registry ping failed" -ForegroundColor Red
        }
    } else {
        Write-Host "  [SIMULATED] Would test NPM registry connectivity" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "  [ERROR] WSL2 networking check failed" -ForegroundColor Red
}

# TEST 3: Context7 Package Installation Check
Write-Host "`nTEST 3: Context7 Package Installation" -ForegroundColor Yellow
try {
    $globalPackages = & npm list -g @upstash/context7-mcp 2>$null
    if ($globalPackages -match "@upstash/context7-mcp@") {
        $version = ($globalPackages | Select-String "@upstash/context7-mcp@(.+)" | ForEach-Object { $_.Matches[0].Groups[1].Value })
        Write-Host "  [OK] Context7 MCP installed globally: v$version" -ForegroundColor Green
        
        # Check package integrity and WSL2 file system compatibility
        if (Test-Path $context7Path) {
            $distPath = Join-Path $context7Path "dist/index.js"
            if (Test-Path $distPath) {
                Write-Host "  [OK] Package files intact: $distPath" -ForegroundColor Green
                
                # Check file permissions (critical in WSL2)
                $perms = & ls -la $distPath 2>$null
                if ($perms -match "r.x") {
                    Write-Host "  [OK] Package file permissions correct" -ForegroundColor Green
                } else {
                    $issues += "Context7 package file permissions incorrect"
                    Write-Host "  [ERROR] Package file not executable" -ForegroundColor Red
                    $recommendations += "Fix permissions: chmod +x $distPath"
                }
            } else {
                $issues += "Context7 package files missing or corrupted"
                Write-Host "  [ERROR] Package files missing: $distPath" -ForegroundColor Red
            }
        } else {
            $issues += "Context7 package directory not found in WSL2 filesystem"
            Write-Host "  [ERROR] Package directory not found: $context7Path" -ForegroundColor Red
        }
    } else {
        $issues += "Context7 MCP package not installed globally"
        Write-Host "  [ERROR] Context7 MCP not found in global packages" -ForegroundColor Red
        $recommendations += "Install Context7: npm install -g @upstash/context7-mcp"
    }
    
    # Check npm global prefix and permissions
    $globalPrefix = & npm config get prefix 2>$null
    if ($globalPrefix) {
        Write-Host "  [INFO] NPM global prefix: $globalPrefix" -ForegroundColor Cyan
        $prefixPerms = & ls -ld $globalPrefix 2>$null
        if ($prefixPerms -match $env:USER) {
            Write-Host "  [OK] User owns global npm directory" -ForegroundColor Green
        } else {
            Write-Host "  [WARNING] Global npm directory not user-owned (may cause permission issues)" -ForegroundColor Yellow
            $recommendations += "Fix npm permissions: sudo chown -R $env:USER $globalPrefix"
        }
    }
}
catch {
    $issues += "Unable to check NPM global packages in WSL2"
    Write-Host "  [ERROR] Error checking global packages" -ForegroundColor Red
}

# TEST 4: WSL2 File System & Path Translation
Write-Host "`nTEST 4: WSL2 File System & Path Translation" -ForegroundColor Yellow
try {
    # Test Windows drive access from WSL2
    if (Test-Path "/mnt/c") {
        Write-Host "  [OK] Windows C: drive accessible at /mnt/c" -ForegroundColor Green
        
        # Check if Claude Code is accessible from WSL2
        $windowsUser = & ls /mnt/c/Users 2>$null | Where-Object { $_ -ne "Public" -and $_ -ne "Default" } | Select-Object -First 1
        if ($windowsUser) {
            $claudeCodePath = "/mnt/c/Users/$windowsUser/AppData/Local/Programs/Claude"
            if (Test-Path $claudeCodePath) {
                Write-Host "  [OK] Claude Code installation found in Windows" -ForegroundColor Green
            } else {
                Write-Host "  [INFO] Claude Code not found in expected Windows path" -ForegroundColor Cyan
            }
        }
    } else {
        $issues += "WSL2 Windows drive mounting not working"
        Write-Host "  [ERROR] Windows drives not mounted" -ForegroundColor Red
        $recommendations += "Check WSL2 mounting: ls /mnt/"
    }
    
    # Test symlink support (important for npm packages)
    if ($Live) {
        $testDir = "/tmp/wsl2_symlink_test"
        $testFile = "$testDir/test.txt"
        $testLink = "$testDir/test_link.txt"
        
        try {
            & mkdir -p $testDir 2>$null
            "test" | Out-File $testFile -Encoding utf8
            & ln -s $testFile $testLink 2>$null
            
            if (Test-Path $testLink) {
                Write-Host "  [OK] Symlink support working" -ForegroundColor Green
            } else {
                $issues += "WSL2 symlink support broken"
                Write-Host "  [ERROR] Symlink creation failed" -ForegroundColor Red
            }
            
            & rm -rf $testDir 2>$null
        }
        catch {
            Write-Host "  [WARNING] Symlink test error" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [SIMULATED] Would test symlink support" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "  [ERROR] WSL2 file system check failed" -ForegroundColor Red
}

# TEST 5: Direct Node Execution Test
Write-Host "`nTEST 5: Direct Node Execution Test" -ForegroundColor Yellow
try {
    $distPath = Join-Path $context7Path "dist/index.js"
    if (Test-Path $distPath) {
        if ($Live) {
            $job = Start-Job -ScriptBlock {
                param($path)
                & node $path 2>&1
            } -ArgumentList $distPath
            
            Start-Sleep -Seconds 3
            $output = Receive-Job $job
            Stop-Job $job -Force
            Remove-Job $job -Force
            
            if ($output -match "Context7 Documentation MCP Server running") {
                Write-Host "  [OK] Context7 server starts successfully in WSL2" -ForegroundColor Green
            } else {
                $issues += "Context7 server fails to start in WSL2"
                Write-Host "  [ERROR] Context7 server startup failed" -ForegroundColor Red
                if ($Verbose) {
                    Write-Host "  Debug output: $output" -ForegroundColor Gray
                }
            }
        } else {
            Write-Host "  [SIMULATED] Would test node execution of Context7 server" -ForegroundColor Yellow
            Write-Host "    Command: node `"$distPath`"" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [ERROR] Context7 package not found for direct execution" -ForegroundColor Red
    }
}
catch {
    $issues += "Error testing direct node execution in WSL2"
    Write-Host "  [ERROR] Error during direct execution test" -ForegroundColor Red
}

# TEST 6: NPX Execution Test (WSL2-specific)
Write-Host "`nTEST 6: NPX Execution Test (WSL2)" -ForegroundColor Yellow
try {
    if ($Live) {
        $job = Start-Job -ScriptBlock {
            # Set environment variables that might be missing in WSL2
            $env:PATH = "/usr/local/bin:/usr/bin:/bin:$env:PATH"
            $env:NODE_ENV = "production"
            & npx -y @upstash/context7-mcp --version 2>&1
        }
        
        $completed = Wait-Job $job -Timeout 10
        if ($completed) {
            $output = Receive-Job $job
            Write-Host "  [OK] NPX execution completed in WSL2" -ForegroundColor Green
            if ($Verbose) {
                Write-Host "  NPX output: $output" -ForegroundColor Gray
            }
        } else {
            $issues += "NPX execution hangs/times out in WSL2"
            Write-Host "  [ERROR] NPX execution timed out (common in WSL2)" -ForegroundColor Red
            $recommendations += "Use direct node path instead of NPX for Claude Code MCP configuration"
        }
        
        Stop-Job $job -Force
        Remove-Job $job -Force
    } else {
        Write-Host "  [SIMULATED] Would test NPX execution (10 second timeout)" -ForegroundColor Yellow
        Write-Host "    Command: npx -y @upstash/context7-mcp --version" -ForegroundColor Gray
    }
}
catch {
    $issues += "NPX execution failed in WSL2"
    Write-Host "  [ERROR] NPX execution error" -ForegroundColor Red
}

# TEST 7: Claude Code WSL2 Integration
Write-Host "`nTEST 7: Claude Code WSL2 Integration" -ForegroundColor Yellow
try {
    # Check if Claude Code is accessible from WSL2
    $claudeInPath = & which claude 2>$null
    if ($claudeInPath) {
        $claudeVersion = & claude --version 2>$null
        Write-Host "  [OK] Claude Code accessible from WSL2: $claudeVersion" -ForegroundColor Green
        
        $mcpList = & claude mcp list 2>$null
        if ($mcpList -match "context7") {
            Write-Host "  [OK] Context7 configured in Claude Code MCP" -ForegroundColor Green
            if ($Verbose) {
                Write-Host "  MCP servers: $mcpList" -ForegroundColor Gray
            }
        } else {
            $issues += "Context7 not configured in Claude Code MCP from WSL2"
            Write-Host "  [ERROR] Context7 not found in MCP configuration" -ForegroundColor Red
            $distPath = Join-Path $context7Path "dist/index.js"
            $recommendations += "Add Context7 to MCP: claude mcp add context7 -- node `"$distPath`""
        }
    } else {
        Write-Host "  [INFO] Claude Code not in WSL2 PATH (this is normal)" -ForegroundColor Cyan
        Write-Host "    Claude Code runs on Windows host, MCP servers run in WSL2" -ForegroundColor Gray
        
        # Check for typical Windows Claude Code installation
        $windowsUsers = & ls /mnt/c/Users 2>$null | Where-Object { $_ -ne "Public" -and $_ -ne "Default" }
        foreach ($user in $windowsUsers) {
            $claudePath = "/mnt/c/Users/$user/AppData/Local/Programs/Claude/Claude.exe"
            if (Test-Path $claudePath) {
                Write-Host "  [INFO] Found Claude Code in Windows: $claudePath" -ForegroundColor Cyan
                break
            }
        }
    }
}
catch {
    Write-Host "  [WARNING] Claude Code WSL2 integration check incomplete" -ForegroundColor Yellow
}

# TEST 8: Process Analysis - WSL2 Specific
Write-Host "`nTEST 8: Process Analysis (WSL2)" -ForegroundColor Yellow
try {
    # Check for orphaned Context7 processes in WSL2
    $psOutput = & ps aux 2>$null | Where-Object { $_ -match "node.*context7-mcp" -and $_ -notmatch "grep" }
    $nodeProcesses = @()
    if ($psOutput) {
        foreach ($line in $psOutput) {
            $parts = $line -split '\s+', 11
            if ($parts.Count -ge 2) {
                $nodeProcesses += [PSCustomObject]@{
                    ProcessId = $parts[1]
                    CommandLine = if ($parts.Count -ge 11) { $parts[10] } else { $line }
                }
            }
        }
    }
    
    if ($nodeProcesses.Count -gt 0) {
        Write-Host "  [WARNING] FOUND ORPHANED CONTEXT7 PROCESSES IN WSL2:" -ForegroundColor Red
        foreach ($proc in $nodeProcesses) {
            Write-Host "    PID $($proc.ProcessId): $($proc.CommandLine)" -ForegroundColor Red
        }
        $issues += "Orphaned Context7 processes detected in WSL2 (CRITICAL ISSUE)"
        $recommendations += "Kill orphaned processes or restart WSL2: wsl --shutdown && wsl"
        
        if ($KillOrphanedProcesses) {
            if ($Live) {
                Write-Host "  [CLEANUP] Attempting to kill orphaned processes..." -ForegroundColor Magenta
                foreach ($proc in $nodeProcesses) {
                    try {
                        & kill -9 $proc.ProcessId 2>$null
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
        Write-Host "  [OK] No orphaned Context7 processes found in WSL2" -ForegroundColor Green
    }
    
    # Check total node processes and memory usage
    $allNodeCount = (& ps aux 2>$null | Where-Object { $_ -match "node" -and $_ -notmatch "grep" }).Count
    Write-Host "  [INFO] Total node processes in WSL2: $allNodeCount" -ForegroundColor Cyan
    
    # Check WSL2 memory usage
    $memInfo = & free -h 2>$null | Where-Object { $_ -match "Mem:" }
    if ($memInfo) {
        Write-Host "  [INFO] WSL2 Memory: $memInfo" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "  [ERROR] Error analyzing WSL2 processes" -ForegroundColor Red
}

# TEST 9: MCP Log Analysis (Cross-Platform)
Write-Host "`nTEST 9: MCP Log Analysis (Cross-Platform)" -ForegroundColor Yellow
try {
    # Check both WSL2 and Windows cache locations
    $cacheDirs = @()
    
    # WSL2 cache directory
    if (Test-Path $cacheDir) {
        $cacheDirs += @{ Path = $cacheDir; Type = "WSL2" }
    }
    
    # Windows cache directory (accessible from WSL2)
    $windowsUsers = & ls /mnt/c/Users 2>$null | Where-Object { $_ -ne "Public" -and $_ -ne "Default" }
    foreach ($user in $windowsUsers) {
        $winCacheDir = "/mnt/c/Users/$user/AppData/Local/claude-cli-nodejs/Cache"
        if (Test-Path $winCacheDir) {
            $cacheDirs += @{ Path = $winCacheDir; Type = "Windows" }
        }
    }
    
    if ($cacheDirs.Count -gt 0) {
        foreach ($cache in $cacheDirs) {
            Write-Host "  [INFO] Checking $($cache.Type) cache: $($cache.Path)" -ForegroundColor Cyan
            
            # Get target directory (either specified or current working directory)
            if ($ProjectPath -ne "") {
                $currentPath = Get-Item $ProjectPath -ErrorAction SilentlyContinue
                if (-not $currentPath) {
                    Write-Host "    [WARNING] Specified project path not found: $ProjectPath" -ForegroundColor Yellow
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
            
            $projectCacheDirs = Get-ChildItem $cache.Path -Directory | Where-Object { 
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
                $projectCacheDirs = Get-ChildItem $cache.Path -Directory | Where-Object {
                    Test-Path (Join-Path $_.FullName "mcp-logs-context7")
                } | Sort-Object LastWriteTime -Descending
            }
            
            if ($projectCacheDirs.Count -gt 0) {
                $projectCacheDir = $projectCacheDirs | Select-Object -First 1
                Write-Host "    [INFO] Found project logs: $($projectCacheDir.Name)" -ForegroundColor Cyan
                
                $mcpLogsDir = Join-Path $projectCacheDir.FullName "mcp-logs-context7"
                if (Test-Path $mcpLogsDir) {
                    $latestLog = Get-ChildItem $mcpLogsDir -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
                    if ($latestLog) {
                        Write-Host "    [OK] Latest MCP log: $($latestLog.Name)" -ForegroundColor Green
                        try {
                            $logContent = Get-Content $latestLog.FullName | ConvertFrom-Json
                            $connectionFailed = $logContent | Where-Object { $_.debug -match "Connection failed" }
                            if ($connectionFailed) {
                                Write-Host "    [ERROR] Connection failures detected in logs" -ForegroundColor Red
                                $issues += "MCP connection failures logged in $($cache.Type)"
                                if ($Verbose) {
                                    $connectionFailed | ForEach-Object { Write-Host "      $($_.timestamp): $($_.debug)" -ForegroundColor Gray }
                                }
                            } else {
                                Write-Host "    [OK] No connection failures in latest log" -ForegroundColor Green
                            }
                        }
                        catch {
                            Write-Host "    [WARNING] Could not parse log file" -ForegroundColor Yellow
                        }
                    } else {
                        Write-Host "    [WARNING] MCP log directory exists but no log files found" -ForegroundColor Yellow
                    }
                } else {
                    Write-Host "    [INFO] No Context7 MCP logs found for this project" -ForegroundColor Cyan
                }
            } else {
                Write-Host "    [INFO] No project cache found in $($cache.Type)" -ForegroundColor Cyan
            }
        }
    } else {
        Write-Host "  [INFO] No Claude Code cache directories found" -ForegroundColor Cyan
        Write-Host "    WSL2 location: $cacheDir" -ForegroundColor Gray
        Write-Host "    Windows location: /mnt/c/Users/[user]/AppData/Local/claude-cli-nodejs/Cache" -ForegroundColor Gray
    }
}
catch {
    Write-Host "  [ERROR] Error analyzing MCP logs: $($_.Exception.Message)" -ForegroundColor Red
    if ($Verbose) {
        Write-Host "    Full error: $($_.Exception)" -ForegroundColor Gray
    }
}

# SUMMARY AND RECOMMENDATIONS
Write-Host "`n=== DIAGNOSTIC SUMMARY (WSL2/Ubuntu) ===" -ForegroundColor Cyan

if ($issues.Count -eq 0) {
    Write-Host "[SUCCESS] NO CRITICAL ISSUES DETECTED!" -ForegroundColor Green
    Write-Host "Context7 should be working in WSL2. Try restarting Claude Code session." -ForegroundColor Green
} else {
    Write-Host "[ISSUES] PROBLEMS DETECTED:" -ForegroundColor Red
    $issues | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}

if ($recommendations.Count -gt 0) {
    Write-Host "`n[RECOMMENDATIONS]:" -ForegroundColor Yellow
    $recommendations | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
}

# WSL2-SPECIFIC CRITICAL DECISION LOGIC
$criticalIssues = $issues | Where-Object { $_ -match "orphaned|process|connection|networking|dns" }
if ($criticalIssues.Count -gt 0) {
    Write-Host "`n[CRITICAL] WSL2-SPECIFIC RECOMMENDATIONS:" -ForegroundColor Red
    Write-Host "The following issues require WSL2-specific actions:" -ForegroundColor Red
    $criticalIssues | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host "`nWSL2 Restart Options:" -ForegroundColor Yellow
    Write-Host "  1. Restart WSL2: wsl --shutdown && wsl" -ForegroundColor Yellow
    Write-Host "  2. Restart specific distro: wsl -t Ubuntu && wsl -d Ubuntu" -ForegroundColor Yellow
    Write-Host "  3. Full Windows restart (if WSL2 networking is broken)" -ForegroundColor Yellow
    Write-Host "`nRestarting WSL2 will:" -ForegroundColor Yellow
    Write-Host "  - Clear all orphaned Node.js processes in WSL2" -ForegroundColor Yellow
    Write-Host "  - Reset WSL2 networking stack" -ForegroundColor Yellow
    Write-Host "  - Clear WSL2 IPC/socket caches" -ForegroundColor Yellow
    Write-Host "  - Reset file system permissions" -ForegroundColor Yellow
    Write-Host "  - Re-establish Windows-WSL2 communication" -ForegroundColor Yellow
} else {
    Write-Host "`n[OK] No WSL2 restart required" -ForegroundColor Green
    Write-Host "Try restarting Claude Code session first." -ForegroundColor Green
}

Write-Host "`n=== WSL2-SPECIFIC TROUBLESHOOTING ===" -ForegroundColor Cyan
Write-Host "Common WSL2 Issues & Solutions:" -ForegroundColor Yellow
Write-Host "  • Networking: sudo service networking restart" -ForegroundColor Gray
Write-Host "  • DNS: echo 'nameserver 8.8.8.8' | sudo tee /etc/resolv.conf" -ForegroundColor Gray
Write-Host "  • Permissions: sudo chown -R \$USER /usr/local/lib/node_modules" -ForegroundColor Gray
Write-Host "  • Memory: echo 1 | sudo tee /proc/sys/vm/drop_caches" -ForegroundColor Gray

Write-Host "`n=== USAGE ===" -ForegroundColor Cyan
Write-Host "Default: Simulated mode (dry run)" -ForegroundColor Gray
Write-Host "  -Live              Execute actions (node tests, process kills)" -ForegroundColor Gray
Write-Host "  -KillOrphanedProcesses  Attempt to kill orphaned Context7 processes" -ForegroundColor Gray  
Write-Host "  -Verbose           Show detailed debug output" -ForegroundColor Gray
Write-Host "  -ProjectPath       Specify project directory for log analysis (optional)" -ForegroundColor Gray
Write-Host "`nExamples:" -ForegroundColor Gray
Write-Host "  .\Debug-Context7-MCP-WSL2-Ubuntu.ps1                    # Safe diagnostic only" -ForegroundColor Gray
Write-Host "  .\Debug-Context7-MCP-WSL2-Ubuntu.ps1 -Live              # Run actual tests" -ForegroundColor Gray
Write-Host "  .\Debug-Context7-MCP-WSL2-Ubuntu.ps1 -Live -KillOrphanedProcesses  # Full cleanup" -ForegroundColor Gray
Write-Host "  .\Debug-Context7-MCP-WSL2-Ubuntu.ps1 -ProjectPath '/home/user/project'   # Analyze specific project" -ForegroundColor Gray