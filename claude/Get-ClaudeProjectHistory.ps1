<#
.SYNOPSIS
    Extracts Claude project history from JSONL files and creates a chronological markdown document.
.DESCRIPTION
    This script looks for Claude project conversation history in ~/.claude/projects,
    parses JSONL files using Newtonsoft.Json, and creates a formatted markdown file
    with the complete conversation history.
.EXAMPLE
    .\Get-ClaudeProjectHistory.ps1
    Extracts history for the current directory's project and saves to CLAUDEHISTORY.md
.NOTES
    Requires Newtonsoft.Json.dll (will attempt to download if not present)
#>

[CmdletBinding()]
param()

# Function to ensure Newtonsoft.Json is available
function Ensure-NewtonsoftJson {
    $scriptDir = Split-Path -Parent $PSCommandPath
    $dllPath = Join-Path $scriptDir "Newtonsoft.Json.dll"
    
    if (Test-Path $dllPath) {
        Write-Verbose "Found Newtonsoft.Json.dll at: $dllPath"
        return $dllPath
    }
    
    Write-Host "Newtonsoft.Json.dll not found. Downloading from NuGet..." -ForegroundColor Yellow
    
    $tempDir = Join-Path $env:TEMP "NewtonsoftJson_$(Get-Random)"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    
    try {
        $nugetUrl = "https://www.nuget.org/api/v2/package/Newtonsoft.Json/13.0.3"
        $zipPath = Join-Path $tempDir "newtonsoft.json.zip"
        
        # Download the NuGet package
        Invoke-WebRequest -Uri $nugetUrl -OutFile $zipPath -UseBasicParsing
        
        # Extract the package
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $tempDir)
        
        # Find the appropriate DLL
        $extractedDll = Get-ChildItem -Path $tempDir -Include "Newtonsoft.Json.dll" -Recurse | 
            Where-Object { $_.FullName -like "*\lib\net4*" -or $_.FullName -like "*\lib\netstandard2*" } | 
            Select-Object -First 1
        
        if ($extractedDll) {
            Copy-Item $extractedDll.FullName -Destination $dllPath
            Write-Host "Successfully downloaded Newtonsoft.Json.dll" -ForegroundColor Green
            return $dllPath
        } else {
            throw "Could not find appropriate Newtonsoft.Json.dll in NuGet package"
        }
    }
    catch {
        Write-Error "Failed to download Newtonsoft.Json: $_"
        throw
    }
    finally {
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

# Load Newtonsoft.Json
try {
    $jsonDllPath = Ensure-NewtonsoftJson
    Add-Type -Path $jsonDllPath
    Write-Verbose "Successfully loaded Newtonsoft.Json"
}
catch {
    Write-Error "Failed to load Newtonsoft.Json: $_"
    exit 1
}

# Get the flattened project name for the current directory
$currentDir = Get-Location
# Claude replaces dots, slashes, backslashes, and colons with dashes
$flattenedName = $currentDir.Path -replace '[\\/:.]', '-'
Write-Host "Current directory: $currentDir" -ForegroundColor Cyan
Write-Host "Flattened name: $flattenedName" -ForegroundColor Cyan

# Construct the Claude projects path
$claudeProjectsPath = Join-Path $HOME ".claude\projects\$flattenedName"

if (-not (Test-Path $claudeProjectsPath)) {
    Write-Warning "Claude project directory not found at: $claudeProjectsPath"
    Write-Warning "Claude Code hasn't saved any conversation history for this directory yet."
    Write-Warning "Conversations are typically saved when Claude Code is closed or periodically during use."
    exit 1
}

Write-Host "Found Claude project directory: $claudeProjectsPath" -ForegroundColor Green

# Get all JSONL files
$jsonlFiles = Get-ChildItem -Path $claudeProjectsPath -Filter "*.jsonl" | Sort-Object Name

if ($jsonlFiles.Count -eq 0) {
    Write-Warning "No JSONL files found in $claudeProjectsPath"
    exit 1
}

Write-Host "Found $($jsonlFiles.Count) JSONL file(s)" -ForegroundColor Green

# Parse all conversations
$allConversations = @()

foreach ($file in $jsonlFiles) {
    Write-Verbose "Processing file: $($file.Name)"
    
    # Read and parse JSONL file line by line
    $lines = Get-Content -Path $file.FullName -Encoding UTF8
    
    foreach ($line in $lines) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        
        try {
            # Parse JSON line to JObject
            $conversation = [Newtonsoft.Json.Linq.JObject]::Parse($line)
            
            # Check if this entry has a message field (Claude format)
            $message = if ($null -ne $conversation["message"]) { $conversation["message"] } else { $conversation }
            
            # Debug what we're seeing
            Write-Verbose "Entry has message field: $($null -ne $conversation["message"]), Message role field: $($message["role"])"
            
            # Extract relevant fields  
            $conversationData = @{
                Timestamp = $null
                Type = if ($null -ne $conversation["type"]) { $conversation["type"].ToString() } else { "unknown" }
                Role = if ($null -ne $message["role"]) { $message["role"].ToString() } else { $null }
                Content = $null
                ToolCalls = @()
                FileName = $file.Name
            }
            
            # Parse timestamp safely
            if ($null -ne $conversation["timestamp"]) {
                try {
                    $conversationData.Timestamp = [DateTime]::Parse($conversation["timestamp"].ToString())
                }
                catch {
                    Write-Verbose "Could not parse timestamp: $($conversation['timestamp'])"
                }
            }
            
            # Extract content based on type - check both message and root level
            $contentSource = if ($null -ne $message["content"]) { $message["content"] } else { $conversation["content"] }
            if ($null -ne $contentSource) {
                $content = $contentSource
                if ($content -is [Newtonsoft.Json.Linq.JArray]) {
                    $textContent = @()
                    foreach ($item in $content) {
                        # Check the item type - use .ToString() to get the actual string value
                        $itemType = if ($null -ne $item["type"]) { $item["type"].ToString() } else { $null }
                        
                        # Handle different content types
                        if ($itemType -eq "text" -and $null -ne $item["text"]) {
                            # Regular text content
                            $textContent += $item["text"].ToString()
                        }
                        elseif ($itemType -eq "tool_result" -and $null -ne $item["content"]) {
                            # Tool result content
                            $textContent += "[Tool Result] " + $item["content"].ToString()
                        }
                        elseif ($itemType -eq "tool_use") {
                            # Tool use (function calls)
                            $toolName = if ($null -ne $item["name"]) { $item["name"].ToString() } else { "unknown" }
                            $textContent += "[Tool Use: $toolName]"
                        }
                    }
                    if ($textContent.Count -gt 0) {
                        $conversationData.Content = $textContent -join "`n"
                    }
                } else {
                    $conversationData.Content = $content.ToString()
                }
            }
            
            # Extract tool calls if present  
            if ($null -ne $conversation["tool_calls"]) {
                $toolCalls = $conversation["tool_calls"]
                if ($toolCalls -is [Newtonsoft.Json.Linq.JArray]) {
                    foreach ($toolCall in $toolCalls) {
                        $toolData = @{
                            Name = if ($null -ne $toolCall["name"]) { $toolCall["name"].ToString() } else { "unknown" }
                            Parameters = @{}
                        }
                        
                        if ($null -ne $toolCall["parameters"]) {
                            $params = $toolCall["parameters"]
                            if ($params -is [Newtonsoft.Json.Linq.JObject]) {
                                foreach ($prop in $params.Properties()) {
                                    $toolData.Parameters[$prop.Name] = $prop.Value.ToString()
                                }
                            }
                        }
                        
                        $conversationData.ToolCalls += $toolData
                    }
                }
            }
            
            # Extract tool results
            if ($null -ne $conversation["tool_results"]) {
                $toolResults = $conversation["tool_results"]
                if ($toolResults -is [Newtonsoft.Json.Linq.JArray]) {
                    foreach ($result in $toolResults) {
                        if ($null -ne $result["content"]) {
                            $conversationData.Content = $result["content"].ToString()
                        }
                    }
                }
            }
            
            if ($conversationData.Content -or $conversationData.ToolCalls.Count -gt 0) {
                $allConversations += [PSCustomObject]$conversationData
                Write-Verbose "Added entry: Type=$($conversationData.Type), Role=$($conversationData.Role), Content Length=$($conversationData.Content.Length)"
            } else {
                Write-Verbose "Skipped entry: Type=$($conversationData.Type), Role=$($conversationData.Role), Has Content=$($null -ne $conversationData.Content)"
            }
        }
        catch {
            Write-Warning "Failed to parse line in $($file.Name): $_"
            Write-Verbose "Line content: $line"
            Write-Verbose "Full error: $($_.Exception.ToString())"
        }
    }
}

# Sort conversations chronologically
$sortedConversations = $allConversations | Where-Object { $_.Timestamp } | Sort-Object Timestamp

Write-Host "Parsed $($sortedConversations.Count) conversation entries" -ForegroundColor Green

# Generate markdown output
$markdown = @"
# Claude Project History

**Project Path:** ``$currentDir``  
**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Total Entries:** $($sortedConversations.Count)

---

"@

$currentDate = $null
$conversationNumber = 0

foreach ($entry in $sortedConversations) {
    # Add date header if it's a new day
    if ($entry.Timestamp) {
        $entryDate = $entry.Timestamp.Date
        if ($entryDate -ne $currentDate) {
            $currentDate = $entryDate
            $markdown += "`n## $(Get-Date $currentDate -Format 'dddd, MMMM dd, yyyy')`n`n"
            $conversationNumber = 0
        }
    }
    
    # Format timestamp
    $timeStr = if ($entry.Timestamp) { 
        Get-Date $entry.Timestamp -Format "HH:mm:ss"
    } else { 
        "No timestamp" 
    }
    
    # Add conversation entry
    if ($entry.Role) {
        $conversationNumber++
        $roleDisplay = switch ($entry.Role) {
            "user" { "User" }
            "assistant" { "Assistant" }
            default { $entry.Role }
        }
        
        $markdown += "### $conversationNumber. [$timeStr] $roleDisplay`n`n"
    }
    
    # Add content
    if ($entry.Content) {
        # Clean up content for better readability
        $cleanContent = $entry.Content -replace '```', '``````' # Escape code blocks
        $cleanContent = $cleanContent -split "`n" | ForEach-Object {
            if ($_.StartsWith("#")) { "\\$_" } else { $_ }
        } | Out-String
        
        $markdown += "$cleanContent`n`n"
    }
    
    # Add tool calls if present
    if ($entry.ToolCalls.Count -gt 0) {
        $markdown += "**Tool Calls:**`n"
        foreach ($tool in $entry.ToolCalls) {
            $markdown += "- **$($tool.Name)**"
            if ($tool.Parameters.Count -gt 0) {
                $paramStr = @()
                foreach ($param in $tool.Parameters.GetEnumerator()) {
                    $value = $param.Value
                    if ($value.Length -gt 100) {
                        $value = $value.Substring(0, 97) + "..."
                    }
                    $paramStr += "$($param.Key): ``$value``"
                }
                $markdown += " ($($paramStr -join ', '))"
            }
            $markdown += "`n"
        }
        $markdown += "`n"
    }
    
    $markdown += "---`n`n"
}

# Add footer
$firstEntry = if ($sortedConversations.Count -gt 0 -and $sortedConversations[0].Timestamp) { 
    Get-Date $sortedConversations[0].Timestamp -Format "yyyy-MM-dd HH:mm:ss" 
} else { 
    "Unknown" 
}

$lastEntry = if ($sortedConversations.Count -gt 0 -and $sortedConversations[-1].Timestamp) { 
    Get-Date $sortedConversations[-1].Timestamp -Format "yyyy-MM-dd HH:mm:ss" 
} else { 
    "Unknown" 
}

$markdown += @"

## Summary Statistics

- **First Entry:** $firstEntry
- **Last Entry:** $lastEntry
- **Total Days:** $(@($sortedConversations | Where-Object Timestamp | ForEach-Object { $_.Timestamp.Date } | Select-Object -Unique).Count)
- **User Messages:** $(@($sortedConversations | Where-Object { $_.Role -eq "user" }).Count)
- **Assistant Messages:** $(@($sortedConversations | Where-Object { $_.Role -eq "assistant" }).Count)
- **Tool Calls:** $(@($sortedConversations | Where-Object { $_.ToolCalls.Count -gt 0 }).Count)

---

*Generated by Get-ClaudeProjectHistory.ps1*
"@

# Save to file
$outputPath = Join-Path $currentDir "CLAUDEHISTORY.md"
$markdown | Out-File -FilePath $outputPath -Encoding UTF8

Write-Host "`nSuccessfully created CLAUDEHISTORY.md" -ForegroundColor Green
Write-Host "Output file: $outputPath" -ForegroundColor Cyan
Write-Host "File size: $([Math]::Round((Get-Item $outputPath).Length / 1KB, 2)) KB" -ForegroundColor Cyan

# Display summary
$stats = @{
    "Total Entries" = $sortedConversations.Count
    "User Messages" = @($sortedConversations | Where-Object { $_.Role -eq "user" }).Count
    "Assistant Messages" = @($sortedConversations | Where-Object { $_.Role -eq "assistant" }).Count
    "Days Covered" = @($sortedConversations | Where-Object Timestamp | ForEach-Object { $_.Timestamp.Date } | Select-Object -Unique).Count
}

Write-Host "`nConversation Summary:" -ForegroundColor Yellow
foreach ($stat in $stats.GetEnumerator()) {
    Write-Host "  $($stat.Key): $($stat.Value)" -ForegroundColor Gray
}