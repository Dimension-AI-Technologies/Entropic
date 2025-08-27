# Simplified script that uses PowerShell's ConvertFrom-Json
# instead of Newtonsoft.Json to avoid complexity

$currentDir = Get-Location
$flattenedName = $currentDir.Path -replace '[\\/:.]', '-'
$claudeProjectsPath = Join-Path $HOME ".claude\projects\$flattenedName"

Write-Host "Claude project directory: $claudeProjectsPath" -ForegroundColor Cyan

if (-not (Test-Path $claudeProjectsPath)) {
    Write-Warning "Directory not found"
    exit 1
}

$jsonlFiles = Get-ChildItem -Path $claudeProjectsPath -Filter "*.jsonl" | Sort-Object Name
Write-Host "Found $($jsonlFiles.Count) JSONL file(s)" -ForegroundColor Green

$allConversations = @()

foreach ($file in $jsonlFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Yellow
    $lines = Get-Content -Path $file.FullName -Encoding UTF8
    
    foreach ($line in $lines) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        
        try {
            $obj = ConvertFrom-Json $line
            
            # Extract message content
            $content = $null
            $role = $null
            $timestamp = $null
            
            if ($obj.message) {
                $role = $obj.message.role
                
                if ($obj.message.content -is [array]) {
                    $textParts = @()
                    foreach ($item in $obj.message.content) {
                        if ($item.type -eq "text" -and $item.text) {
                            $textParts += $item.text
                        }
                        elseif ($item.type -eq "tool_result" -and $item.content) {
                            $textParts += "[Tool Result] " + $item.content
                        }
                        elseif ($item.type -eq "tool_use" -and $item.name) {
                            $textParts += "[Tool Use: $($item.name)]"
                        }
                    }
                    if ($textParts.Count -gt 0) {
                        $content = $textParts -join "`n"
                    }
                } else {
                    $content = $obj.message.content
                }
            }
            
            if ($obj.timestamp) {
                $timestamp = [DateTime]::Parse($obj.timestamp)
            }
            
            if ($content -or $role) {
                $allConversations += [PSCustomObject]@{
                    Timestamp = $timestamp
                    Type = $obj.type
                    Role = $role
                    Content = $content
                    FileName = $file.Name
                }
                Write-Host "  Added: Type=$($obj.type), Role=$role, Content Length=$($content.Length)" -ForegroundColor Green
            } else {
                Write-Verbose "  Skipped: Type=$($obj.type), Role=$role, No content"
            }
        }
        catch {
            Write-Warning "Failed to parse line: $_"
        }
    }
}

Write-Host "`nTotal parsed entries: $($allConversations.Count)" -ForegroundColor Cyan

# Create markdown output
$markdown = @"
# Claude Project History

**Project Path:** ``$currentDir``  
**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  
**Total Entries:** $($allConversations.Count)

---

## Summary Statistics

- **First Entry:** $(if ($allConversations.Count -gt 0) { $allConversations[0].Timestamp } else { 'Unknown' })
- **Last Entry:** $(if ($allConversations.Count -gt 0) { $allConversations[-1].Timestamp } else { 'Unknown' })
- **User Messages:** $($allConversations | Where-Object { $_.Role -eq 'user' } | Measure-Object).Count
- **Assistant Messages:** $($allConversations | Where-Object { $_.Role -eq 'assistant' } | Measure-Object).Count

---

## Conversation History

"@

# Sort by timestamp
$sortedConversations = $allConversations | Sort-Object Timestamp

foreach ($entry in $sortedConversations) {
    $timestamp = if ($entry.Timestamp) { $entry.Timestamp.ToString('yyyy-MM-dd HH:mm:ss') } else { 'No timestamp' }
    $roleDisplay = if ($entry.Role) { "**$($entry.Role.ToUpper())**" } else { "**$($entry.Type.ToUpper())**" }
    
    $markdown += "`n### [$timestamp] $roleDisplay`n`n"
    
    if ($entry.Content) {
        # Escape backticks in content for markdown
        $escapedContent = $entry.Content -replace '``', '````'
        # Wrap in code block if it contains code-like content
        if ($entry.Content -match '\[Tool') {
            $markdown += "````````n$escapedContent`n````````n"
        } else {
            $markdown += "$escapedContent`n"
        }
    } else {
        $markdown += "*[No content]*`n"
    }
    
    $markdown += "`n---`n"
}

# Save to file
$outputFile = Join-Path $currentDir "CLAUDEHISTORY.md"
$markdown | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "`nSuccessfully created $outputFile" -ForegroundColor Green
Write-Host "File size: $([Math]::Round((Get-Item $outputFile).Length / 1KB, 2)) KB" -ForegroundColor Green