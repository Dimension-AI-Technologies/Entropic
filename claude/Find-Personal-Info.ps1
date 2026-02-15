#!/usr/bin/env pwsh
#Requires -Version 7.0


<#
.SYNOPSIS
    Finds and replaces personal information in project files
.DESCRIPTION
    Searches for personal information (names, emails, usernames) in all project files
    and optionally replaces them with a generic identifier
#>

param(
    [switch]$Replace,
    [string]$ReplacementText = "dimension-zero"
)

# Define search patterns (case-insensitive)
$searchPatterns = @(
    "Mathew Burkitt",
    "mathew.burkitt@ditech.ai",
    "mbdt",
    "mbhvl"
)

# Get project root
$projectRoot = Get-Location

# Define files/folders to exclude
$excludePatterns = @(
    "*.git*",
    "*.png",
    "*.jpg",
    "*.jpeg",
    "*.gif",
    "*.exe",
    "*.dll",
    "Find-Personal-Info.ps1"
)

Write-Host "Searching for personal information in project files..." -ForegroundColor Cyan
Write-Host "Project root: $projectRoot" -ForegroundColor Gray
Write-Host "Search patterns:" -ForegroundColor Gray
$searchPatterns | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
Write-Host ""

# Get all text files
$files = Get-ChildItem -Path $projectRoot -Recurse -File | 
    Where-Object { 
        $file = $_
        $excluded = $false
        foreach ($pattern in $excludePatterns) {
            if ($file.Name -like $pattern) {
                $excluded = $true
                break
            }
        }
        -not $excluded
    }

$affectedFiles = @()

foreach ($file in $files) {
    $relativePath = [System.IO.Path]::GetRelativePath($projectRoot, $file.FullName)
    
    try {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
        $found = $false
        $matches = @()
        
        foreach ($pattern in $searchPatterns) {
            if ($content -match [regex]::Escape($pattern)) {
                $found = $true
                $matchCount = ([regex]::Matches($content, [regex]::Escape($pattern), [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
                $matches += "$pattern ($matchCount occurrences)"
            }
        }
        
        if ($found) {
            $affectedFiles += @{
                Path = $relativePath
                FullPath = $file.FullName
                Matches = $matches
            }
        }
    }
    catch {
        # Skip binary or unreadable files
        continue
    }
}

if ($affectedFiles.Count -eq 0) {
    Write-Host "✓ No personal information found in any files" -ForegroundColor Green
    exit 0
}

Write-Host "Found personal information in $($affectedFiles.Count) file(s):" -ForegroundColor Yellow
Write-Host ""

foreach ($fileInfo in $affectedFiles) {
    Write-Host "  $($fileInfo.Path)" -ForegroundColor Cyan
    foreach ($match in $fileInfo.Matches) {
        Write-Host "    - $match" -ForegroundColor Gray
    }
}

if ($Replace) {
    Write-Host ""
    Write-Host "Replacing all occurrences with: '$ReplacementText'" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($fileInfo in $affectedFiles) {
        Write-Host "  Processing: $($fileInfo.Path)" -ForegroundColor Gray
        
        try {
            $content = Get-Content -Path $fileInfo.FullPath -Raw
            $originalContent = $content
            
            foreach ($pattern in $searchPatterns) {
                # Case-insensitive replacement
                $content = $content -replace [regex]::Escape($pattern), $ReplacementText
            }
            
            if ($content -ne $originalContent) {
                $content | Set-Content -Path $fileInfo.FullPath -NoNewline
                Write-Host "    ✓ Replaced" -ForegroundColor Green
            }
        }
        catch {
            Write-Host "    ✗ Error: $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "✓ Replacement complete!" -ForegroundColor Green
}
else {
    Write-Host ""
    Write-Host "To replace these occurrences, run:" -ForegroundColor Yellow
    Write-Host "  .\Find-Personal-Info.ps1 -Replace" -ForegroundColor White
    Write-Host ""
    Write-Host "Or specify custom replacement text:" -ForegroundColor Yellow
    Write-Host "  .\Find-Personal-Info.ps1 -Replace -ReplacementText 'custom-text'" -ForegroundColor White
}