#Requires -Version 7.0

$jsonFile = "C:\Users\mathew.burkitt\.claude\projects\C--Users-mathew-burkitt-source-repos-scripts-dev-claude\e0933133-769e-45ba-abbb-a318871320b1.jsonl"
$lines = Get-Content $jsonFile
Write-Host "Total lines: $($lines.Count)"
Write-Host ""

$messageCount = 0
$types = @{}

foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    
    $obj = ConvertFrom-Json $line
    
    # Track type
    $entryType = if ($obj.type) { $obj.type } else { "no-type" }
    if ($types.ContainsKey($entryType)) {
        $types[$entryType]++
    } else {
        $types[$entryType] = 1
    }
    
    # Check for actual message content
    if ($obj.message) {
        if ($obj.message.content -is [string] -and -not [string]::IsNullOrWhiteSpace($obj.message.content)) {
            $messageCount++
            Write-Host "Found string message: Role=$($obj.message.role), Type=$entryType, Length=$($obj.message.content.Length)"
        }
        elseif ($obj.message.content -is [array]) {
            foreach ($item in $obj.message.content) {
                if ($item.type -eq "text" -and $item.text) {
                    $messageCount++
                    Write-Host "Found text message: Role=$($obj.message.role), Type=$entryType, Length=$($item.text.Length)"
                    break
                }
            }
        }
    }
}

Write-Host ""
Write-Host "Summary:"
Write-Host "Total lines: $($lines.Count)"
Write-Host "Messages with content: $messageCount"
Write-Host ""
Write-Host "Entry types:"
$types.GetEnumerator() | Sort-Object Key | ForEach-Object {
    Write-Host "  $($_.Key): $($_.Value)"
}