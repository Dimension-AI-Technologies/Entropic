#Requires -Version 7.0

#Requires -Version 5.1
<#
.SYNOPSIS
    Finds magic strings in C# source files and identifies candidates for centralization
.DESCRIPTION
    Scans all .cs files to find string literals used multiple times.
    Helps identify magic strings that should be replaced with constants or enums.
#>

param(
    [string]$Path = "..\src",
    [int]$MinOccurrences = 2,
    [switch]$IncludeInterpolated,
    [switch]$ExportCsv
)

$ErrorActionPreference = "Stop"

# Patterns to find strings
$patterns = @{
    Regular = '"([^"\\]|\\.)*"'
    Verbatim = '@"([^"]|"")*"'
    Interpolated = '\$"([^"\\]|\\.)*"'
    VerbatimInterpolated = '\$@"([^"]|"")*"'
}

# Strings to exclude (common language constructs, punctuation, etc.)
$excludePatterns = @(
    '^"$',                          # Empty string
    '^".$"$',                       # Single character
    '^"[0-9]+$"$',                  # Pure numbers
    '^"\s+$"$',                     # Only whitespace
    '^"\\[nrt]"$',                  # Escape sequences
    '^"[:/\\.-]+$"$',               # Path separators
    '^"\{[0-9]+(:[^}]+)?\}"$',      # Format placeholders like {0} or {0:F2}
    '^"<[^>]+>$"$',                 # XML/HTML tags
    '^"https?://"$'                 # URL prefixes
)

# Common strings to ignore
$commonIgnores = @(
    '""', '" "', '", "', '": "', '" - "', '" | "', '"\n"', '"\r\n"', '"\t"',
    '"."', '".."', '"/"', '"\\"', '";"', '":"', '"="', '"?"', '"!"',
    '"("', '")"', '"["', '"]"', '"{"', '"}"', '"<"', '">"',
    '"true"', '"false"', '"null"', '"undefined"',
    '"get"', '"set"', '"value"', '"key"', '"name"', '"id"',
    '"error"', '"warning"', '"info"', '"debug"', '"trace"'
)

Write-Host "Scanning for magic strings in: $Path" -ForegroundColor Cyan
Write-Host "Minimum occurrences: $MinOccurrences" -ForegroundColor Cyan
Write-Host ""

# Get all C# files
$files = Get-ChildItem -Path $Path -Filter "*.cs" -Recurse -File
Write-Host "Found $($files.Count) C# files to analyze" -ForegroundColor Green

# Dictionary to store string occurrences
$stringOccurrences = @{}
$stringLocations = @{}

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")
    
    # Find all string literals
    foreach ($patternName in $patterns.Keys) {
        if ($patternName -like "*Interpolated*" -and -not $IncludeInterpolated) {
            continue
        }
        
        $matches = [regex]::Matches($content, $patterns[$patternName])
        
        foreach ($match in $matches) {
            $stringValue = $match.Value
            
            # Skip if matches exclusion patterns
            $skip = $false
            foreach ($exclude in $excludePatterns) {
                if ($stringValue -match $exclude) {
                    $skip = $true
                    break
                }
            }
            
            # Skip common ignores
            if ($commonIgnores -contains $stringValue) {
                $skip = $true
            }
            
            # Skip if too short (less than 3 chars inside quotes)
            if ($stringValue.Length -le 4) {
                $skip = $true
            }
            
            if (-not $skip) {
                # Track occurrences
                if (-not $stringOccurrences.ContainsKey($stringValue)) {
                    $stringOccurrences[$stringValue] = 0
                    $stringLocations[$stringValue] = @()
                }
                $stringOccurrences[$stringValue]++
                
                # Get line number
                $lines = $content.Substring(0, $match.Index).Split("`n").Count
                $stringLocations[$stringValue] += "${relativePath}:${lines}"
            }
        }
    }
}

# Function to categorize strings
function CategorizeString($str) {
    $inner = $str.Trim('"', '@', '$')
    
    if ($inner -match '^\\\\.*\\\\') { return "Path" }
    if ($inner -match '^\w+\.(exe|dll|ps1|cmd|bat)$') { return "Filename" }
    if ($inner -match '^\w+\.\w+$') { return "Property/Method" }
    if ($inner -match '^(HKLM|HKCU):|^SOFTWARE\\') { return "Registry" }
    if ($inner -match '^\w+Config$|Settings$') { return "Configuration" }
    if ($inner -match '^(Error|Warning|Info|Debug|Critical):') { return "LogLevel" }
    if ($inner -match '^--\w+$|^/\w+$') { return "CommandArg" }
    if ($inner -match '^\[.*\]$') { return "Format/Markup" }
    if ($inner -match '^(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)') { return "SQL" }
    if ($inner -match '^\w+://' -or $inner -match '^\d+\.\d+\.\d+\.\d+') { return "Network" }
    if ($inner -match '^C:\\|^\\\\') { return "Path" }
    
    return "General"
}

# Filter and sort results
$results = $stringOccurrences.GetEnumerator() | 
    Where-Object { $_.Value -ge $MinOccurrences } |
    Sort-Object Value -Descending |
    ForEach-Object {
        [PSCustomObject]@{
            String = $_.Key
            Count = $_.Value
            Locations = $stringLocations[$_.Key] | Select-Object -First 3
            Category = CategorizeString $_.Key
        }
    }

# Display results
Write-Host "`nMagic String Analysis Results:" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

$groupedResults = $results | Group-Object Category

foreach ($group in $groupedResults | Sort-Object Name) {
    Write-Host "`n$($group.Name) Strings:" -ForegroundColor Cyan
    Write-Host "------------------------" -ForegroundColor Cyan
    
    foreach ($item in $group.Group | Sort-Object Count -Descending) {
        Write-Host "$($item.String)" -ForegroundColor White -NoNewline
        Write-Host " (used $($item.Count) times)" -ForegroundColor Gray
        
        foreach ($location in $item.Locations) {
            Write-Host "  - $location" -ForegroundColor DarkGray
        }
    }
}

# Summary
Write-Host "`nSummary:" -ForegroundColor Green
Write-Host "--------" -ForegroundColor Green
Write-Host "Total unique strings found: $($stringOccurrences.Count)"
Write-Host "Strings used $MinOccurrences+ times: $($results.Count)"

# Recommendations
Write-Host "`nRecommendations:" -ForegroundColor Magenta
Write-Host "----------------" -ForegroundColor Magenta

$recommendations = @()

# Path strings
$pathStrings = $results | Where-Object { $_.Category -eq "Path" -and $_.Count -ge 3 }
if ($pathStrings) {
    $recommendations += "Create PathConstants class for $($pathStrings.Count) path strings"
}

# Network strings
$networkStrings = $results | Where-Object { $_.Category -eq "Network" -and $_.Count -ge 2 }
if ($networkStrings) {
    $recommendations += "Create NetworkConstants class for $($networkStrings.Count) network-related strings"
}

# Configuration strings
$configStrings = $results | Where-Object { $_.Category -eq "Configuration" -and $_.Count -ge 2 }
if ($configStrings) {
    $recommendations += "Create ConfigurationKeys class for $($configStrings.Count) config strings"
}

# Log level strings
$logStrings = $results | Where-Object { $_.Category -eq "LogLevel" }
if ($logStrings) {
    $recommendations += "Use LogLevel enum instead of $($logStrings.Count) log level strings"
}

# Command arguments
$cmdArgs = $results | Where-Object { $_.Category -eq "CommandArg" -and $_.Count -ge 2 }
if ($cmdArgs) {
    $recommendations += "Create CommandLineArgs constants for $($cmdArgs.Count) argument strings"
}

foreach ($rec in $recommendations) {
    Write-Host "• $rec" -ForegroundColor Yellow
}

# Export to CSV if requested
if ($ExportCsv) {
    $csvPath = "magic-strings-report.csv"
    $results | Export-Csv -Path $csvPath -NoTypeInformation
    Write-Host "`nReport exported to: $csvPath" -ForegroundColor Green
}

# Generate sample constant classes
Write-Host "`nGenerating sample constant classes..." -ForegroundColor Cyan

# Group strings by category for class generation
$classesToGenerate = @{}
foreach ($result in $results | Where-Object { $_.Count -ge 3 }) {
    $category = $result.Category
    if (-not $classesToGenerate.ContainsKey($category)) {
        $classesToGenerate[$category] = @()
    }
    $classesToGenerate[$category] += $result
}

# Generate sample classes
foreach ($category in $classesToGenerate.Keys) {
    $className = switch ($category) {
        "Path" { "PathConstants" }
        "Network" { "NetworkConstants" }
        "Configuration" { "ConfigurationKeys" }
        "CommandArg" { "CommandLineArgs" }
        "Registry" { "RegistryPaths" }
        default { "${category}Constants" }
    }
    
    $filePath = "Generated_$className.cs"
    $content = @"
using System;

namespace Hippocrates.Shared.Constants
{
    /// <summary>
    /// Centralized $category string constants
    /// </summary>
    public static class $className
    {
"@

    foreach ($item in $classesToGenerate[$category] | Sort-Object Count -Descending) {
        $constantName = ($item.String.Trim('"', '@', '$') -replace '[^\w]', '_').ToUpper()
        if ($constantName.Length -gt 50) {
            $constantName = $constantName.Substring(0, 47) + "..."
        }
        $content += "`n        public const string $constantName = $($item.String); // Used $($item.Count) times"
    }
    
    $content += "`n    }`n}"
    
    Set-Content -Path $filePath -Value $content
    Write-Host "Generated: $filePath" -ForegroundColor Green
}

Write-Host "`nAnalysis complete!" -ForegroundColor Green