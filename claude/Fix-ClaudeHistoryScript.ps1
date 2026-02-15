#Requires -Version 7.0

# Script to identify the correct parsing approach for Claude JSONL files

$jsonFile = "C:\Users\mathew.burkitt\.claude\projects\C--Users-mathew-burkitt-source-repos-scripts-dev-claude\e0933133-769e-45ba-abbb-a318871320b1.jsonl"

# Read using ConvertFrom-Json (native PowerShell)
Write-Host "=== Using ConvertFrom-Json ===" -ForegroundColor Cyan
$lines = Get-Content $jsonFile | Select -First 5

$index = 0
foreach ($line in $lines) {
    $index++
    Write-Host "`nEntry ${index}:" -ForegroundColor Yellow
    $obj = ConvertFrom-Json $line
    
    Write-Host "  Type: $($obj.type)"
    Write-Host "  Has message: $($null -ne $obj.message)"
    
    if ($obj.message) {
        Write-Host "  Message.role: '$($obj.message.role)'"
        Write-Host "  Message.content type: $($obj.message.content.GetType().Name)"
        
        if ($obj.message.content -is [array]) {
            Write-Host "  Content items: $($obj.message.content.Count)"
            $firstItem = $obj.message.content[0]
            if ($firstItem) {
                Write-Host "    Item type field: '$($firstItem.type)'"
                if ($firstItem.type -eq "text" -and $firstItem.text) {
                    $preview = if ($firstItem.text.Length -gt 50) { 
                        $firstItem.text.Substring(0, 50) + "..." 
                    } else { 
                        $firstItem.text 
                    }
                    Write-Host "    Text content: $preview"
                }
                elseif ($firstItem.type -eq "tool_result") {
                    Write-Host "    Tool result content: $(if ($firstItem.content) { $firstItem.content.Substring(0, [Math]::Min(50, $firstItem.content.Length)) + '...' } else { 'empty' })"
                }
            }
        }
    }
}

# Now check with Newtonsoft.Json
Write-Host "`n`n=== Using Newtonsoft.Json ===" -ForegroundColor Cyan
Add-Type -Path ".\Newtonsoft.Json.dll"

$index = 0
foreach ($line in $lines) {
    $index++
    Write-Host "`nEntry ${index}:" -ForegroundColor Yellow
    $obj = [Newtonsoft.Json.Linq.JObject]::Parse($line)
    
    $typeValue = if ($null -ne $obj["type"]) { $obj["type"].ToString() } else { "null" }
    Write-Host "  Type: $typeValue"
    Write-Host "  Has message: $($null -ne $obj["message"])"
    
    if ($null -ne $obj["message"]) {
        $msg = $obj["message"]
        $roleValue = if ($null -ne $msg["role"]) { $msg["role"].ToString() } else { "null" }
        Write-Host "  Message.role: '$roleValue'"
        
        if ($null -ne $msg["content"]) {
            $content = $msg["content"]
            Write-Host "  Message.content type: $($content.GetType().Name)"
            
            if ($content -is [Newtonsoft.Json.Linq.JArray]) {
                Write-Host "  Content items: $($content.Count)"
                if ($content.Count -gt 0) {
                    $firstItem = $content[0]
                    $itemType = if ($null -ne $firstItem["type"]) { $firstItem["type"].ToString() } else { "null" }
                    Write-Host "    Item type field: '$itemType'"
                    
                    if ($itemType -eq "text" -and $null -ne $firstItem["text"]) {
                        $text = $firstItem["text"].ToString()
                        $preview = if ($text.Length -gt 50) { 
                            $text.Substring(0, 50) + "..." 
                        } else { 
                            $text 
                        }
                        Write-Host "    Text content: $preview"
                    }
                    elseif ($itemType -eq "tool_result" -and $null -ne $firstItem["content"]) {
                        $toolContent = $firstItem["content"].ToString()
                        $preview = if ($toolContent.Length -gt 50) {
                            $toolContent.Substring(0, 50) + "..."
                        } else {
                            $toolContent
                        }
                        Write-Host "    Tool result content: $preview"
                    }
                }
            }
        }
    }
}

Write-Host "`n`n=== Conclusion ===" -ForegroundColor Green
Write-Host "Both methods should work. The key issue is likely with how JToken values are being accessed."
Write-Host "Ensure all JToken access uses .ToString() to get the actual string value."