#Requires -Version 7.0

Add-Type -Path ".\Newtonsoft.Json.dll"

$jsonFile = "C:\Users\mathew.burkitt\.claude\projects\C--Users-mathew-burkitt-source-repos-scripts-dev-claude\e0933133-769e-45ba-abbb-a318871320b1.jsonl"
$lines = Get-Content $jsonFile | Select-Object -First 5

foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    
    $obj = [Newtonsoft.Json.Linq.JObject]::Parse($line)
    
    $entryType = if ($null -ne $obj["type"]) { $obj["type"].ToString() } else { "null" }
    Write-Host "Entry type: '$entryType'"
    
    if ($null -ne $obj["message"]) {
        $msg = $obj["message"]
        Write-Host "  Has message: Yes"
        $msgRole = if ($null -ne $msg["role"]) { $msg["role"].ToString() } else { "null" }
        Write-Host "  Message role: '$msgRole'"
        
        if ($null -ne $msg["content"]) {
            $content = $msg["content"]
            Write-Host "  Content type: $($content.GetType().Name)"
            
            if ($content -is [Newtonsoft.Json.Linq.JArray]) {
                Write-Host "  Content array length: $($content.Count)"
                foreach ($item in $content) {
                    if ($null -ne $item["type"] -and $item["type"].ToString() -eq "text" -and $null -ne $item["text"]) {
                        $textPreview = $item["text"].ToString()
                        if ($textPreview.Length -gt 50) {
                            $textPreview = $textPreview.Substring(0, 50) + "..."
                        }
                        Write-Host "    Found text content: $textPreview"
                    } elseif ($null -ne $item["type"]) {
                        Write-Host "    Item type: $($item["type"]), has text: $($null -ne $item["text"])"
                    }
                }
            } elseif ($content -is [string] -or $content -is [Newtonsoft.Json.Linq.JValue]) {
                Write-Host "  Content string: $($content.ToString().Substring(0, [Math]::Min(50, $content.ToString().Length)))..."
            }
        }
    } else {
        Write-Host "  Has message: No"
    }
    
    Write-Host ""
}