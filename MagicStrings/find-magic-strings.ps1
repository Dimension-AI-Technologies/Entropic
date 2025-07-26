# PowerShell script to find and count magic strings in the codebase

param(
    [string]$RootPath = "..",
    [switch]$ShowDetails = $false
)

# Define patterns to search for
$patterns = @(
    '192\.168\.1\.\d+',      # IP addresses
    'CJC-Server01',           # Server names
    'CJC-2015-MGMT-3',
    'CJCDEV2022',            # Instance names
    'RMSLive',               # Database names
    'RMSDevTest',
    'abc!123!DEF',           # Passwords (should definitely be centralized!)
    'r55ukltd',
    '1433',                  # Port numbers
    '1435',
    'sa'                     # SQL usernames
)

# File extensions to search
$extensions = @('*.cs', '*.json', '*.yaml', '*.config', '*.xml')

# Initialize results
$results = @{}
$fileOccurrences = @{}

Write-Host "Searching for magic strings in $RootPath..." -ForegroundColor Yellow
Write-Host ""

foreach ($pattern in $patterns) {
    Write-Host "Searching for pattern: $pattern" -ForegroundColor Cyan
    $results[$pattern] = @()
    
    foreach ($ext in $extensions) {
        $files = Get-ChildItem -Path $RootPath -Filter $ext -Recurse -ErrorAction SilentlyContinue | 
                 Where-Object { $_.FullName -notmatch '\\(bin|obj|\.git|node_modules|packages)\\' }
        
        foreach ($file in $files) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            if ($content) {
                $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                if ($matches.Count -gt 0) {
                    $fileInfo = @{
                        File = $file.FullName.Replace($RootPath, '').TrimStart('\')
                        Count = $matches.Count
                        Matches = $matches | ForEach-Object { $_.Value } | Select-Object -Unique
                    }
                    $results[$pattern] += $fileInfo
                    
                    # Track which files contain which strings
                    if (-not $fileOccurrences.ContainsKey($file.FullName)) {
                        $fileOccurrences[$file.FullName] = @()
                    }
                    $fileOccurrences[$file.FullName] += $pattern
                }
            }
        }
    }
}

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Green
Write-Host ""

# Sort by total occurrences
$summary = @()
foreach ($pattern in $patterns) {
    $totalCount = ($results[$pattern] | Measure-Object -Property Count -Sum).Sum
    $fileCount = $results[$pattern].Count
    
    if ($totalCount -gt 0) {
        $summary += [PSCustomObject]@{
            Pattern = $pattern
            TotalOccurrences = $totalCount
            FilesAffected = $fileCount
            Details = $results[$pattern]
        }
    }
}

$summary | Sort-Object -Property TotalOccurrences -Descending | Format-Table Pattern, TotalOccurrences, FilesAffected -AutoSize

Write-Host ""
Write-Host "=== CANDIDATES FOR CENTRALIZATION ===" -ForegroundColor Yellow
Write-Host "(Patterns appearing more than once)" -ForegroundColor Gray
Write-Host ""

$candidates = $summary | Where-Object { $_.TotalOccurrences -gt 1 }
foreach ($candidate in $candidates) {
    Write-Host "Pattern: '$($candidate.Pattern)'" -ForegroundColor Cyan
    Write-Host "  Total occurrences: $($candidate.TotalOccurrences)"
    Write-Host "  Files affected: $($candidate.FilesAffected)"
    
    if ($ShowDetails) {
        Write-Host "  Locations:" -ForegroundColor Gray
        foreach ($detail in $candidate.Details) {
            Write-Host "    - $($detail.File) ($($detail.Count) times)" -ForegroundColor Gray
        }
    }
    Write-Host ""
}

# Suggest refactoring approach
Write-Host "=== SUGGESTED REFACTORING ===" -ForegroundColor Green
Write-Host ""
Write-Host "1. Create enums for:" -ForegroundColor Yellow
Write-Host "   - Server names (SqlServerHost enum)"
Write-Host "   - Database names (DatabaseName enum)"
Write-Host "   - SQL instances (SqlInstance enum)"
Write-Host ""
Write-Host "2. Create static configuration classes for:" -ForegroundColor Yellow
Write-Host "   - Connection details (ServerConfiguration static class)"
Write-Host "   - Credentials (store in secure config, never in code!)"
Write-Host "   - Network settings (ports, IPs)"
Write-Host ""
Write-Host "3. Configuration structure suggestion:" -ForegroundColor Yellow
Write-Host @"
   CJC.RMS.Core.Configuration/
   ├── DatabaseConstants.cs (enums and constants)
   ├── ServerConfiguration.cs (centralized server config)
   └── TestConfiguration.cs (test-specific overrides)
"@

# Export detailed results
$outputFile = "magic-strings-report.json"
$candidates | ConvertTo-Json -Depth 5 | Out-File $outputFile
Write-Host ""
Write-Host "Detailed report saved to: $outputFile" -ForegroundColor Green