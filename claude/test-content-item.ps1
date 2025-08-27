Add-Type -Path ".\Newtonsoft.Json.dll"

$jsonFile = "C:\Users\mathew.burkitt\.claude\projects\C--Users-mathew-burkitt-source-repos-scripts-dev-claude\e0933133-769e-45ba-abbb-a318871320b1.jsonl"
$lines = Get-Content $jsonFile | Select-Object -Skip 3 -First 1  # Get the assistant message with text

foreach ($line in $lines) {
    $obj = [Newtonsoft.Json.Linq.JObject]::Parse($line)
    $content = $obj["message"]["content"]
    
    Write-Host "Content is JArray: $($content -is [Newtonsoft.Json.Linq.JArray])"
    Write-Host "Content count: $($content.Count)"
    
    $firstItem = $content[0]
    Write-Host "`nFirst item type: $($firstItem.GetType().Name)"
    Write-Host "First item as JSON: $($firstItem.ToString())"
    
    # Try different ways to access 'type'
    Write-Host "`nAccessing 'type' field:"
    Write-Host "  Using indexer: '$($firstItem["type"])'"
    Write-Host "  Using Value: '$($firstItem["type"].Value)'"
    Write-Host "  Using ToString: '$($firstItem["type"].ToString())'"
    
    # Check if it equals "text"
    $typeValue = $firstItem["type"].ToString()
    Write-Host "`nType equals 'text': $($typeValue -eq 'text')"
    
    # Get the text content
    if ($typeValue -eq "text") {
        Write-Host "Text content preview: $($firstItem["text"].ToString().Substring(0, 50))..."
    }
}