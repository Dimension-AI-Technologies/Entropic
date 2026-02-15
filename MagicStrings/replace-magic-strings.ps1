#Requires -Version 7.0

# PowerShell script to replace magic strings with centralized configuration

param(
    [string]$RootPath = "..",
    [switch]$WhatIf = $false,  # Default to actual replacement mode
    [switch]$Force = $false    # Force replacement without confirmation
)

if (-not $WhatIf -and -not $Force) {
    Write-Host "WARNING: This will modify multiple files!" -ForegroundColor Red
    $confirm = Read-Host "Are you sure you want to proceed? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "Operation cancelled."
        exit
    }
}

# Define replacements
$replacements = @(
    # IP Addresses -> Use configuration
    @{
        Pattern = '"192\.168\.1\.5"'
        Replacement = 'DatabaseConstants.NetworkConfig.ServerIpAddresses[DatabaseConstants.SqlServerHost.CJCServer01]'
        FileFilter = '*.cs'
        AddUsing = 'using CJC.RMS.Core.Configuration;'
    },
    @{
        Pattern = '"192\.168\.1\.125"'
        Replacement = 'DatabaseConstants.NetworkConfig.ServerIpAddresses[DatabaseConstants.SqlServerHost.CJC2015MGMT3]'
        FileFilter = '*.cs'
        AddUsing = 'using CJC.RMS.Core.Configuration;'
    },
    
    # Server Names
    @{
        Pattern = '"CJC-Server01"'
        Replacement = 'DatabaseConstants.EnumStrings.GetHostname(DatabaseConstants.SqlServerHost.CJCServer01)'
        FileFilter = '*.cs'
        AddUsing = 'using CJC.RMS.Core.Configuration;'
    },
    @{
        Pattern = '"CJC-2015-MGMT-3"'
        Replacement = 'DatabaseConstants.EnumStrings.GetHostname(DatabaseConstants.SqlServerHost.CJC2015MGMT3)'
        FileFilter = '*.cs'
        AddUsing = 'using CJC.RMS.Core.Configuration;'
    },
    
    # Database Names
    @{
        Pattern = '"RMSLive"'
        Replacement = 'nameof(DatabaseConstants.DatabaseName.RMSLive)'
        FileFilter = '*.cs'
        ExcludePatterns = @('EFC8', 'Models', 'GenerateEnums')  # Don't change EF generated code
        AddUsing = 'using CJC.RMS.Core.Configuration;'
    },
    @{
        Pattern = '"RMSDevTest"'
        Replacement = 'nameof(DatabaseConstants.DatabaseName.RMSDevTest)'
        FileFilter = '*.cs'
        AddUsing = 'using CJC.RMS.Core.Configuration;'
    },
    
    # Instance Names
    @{
        Pattern = '"CJCDEV2022"'
        Replacement = 'nameof(DatabaseConstants.SqlInstance.CJCDEV2022)'
        FileFilter = '*.cs'
        AddUsing = 'using CJC.RMS.Core.Configuration;'
    },
    
    # Ports
    @{
        Pattern = '\b1433\b'
        Replacement = 'DatabaseConstants.NetworkConfig.DefaultSqlPort'
        FileFilter = '*.cs'
        Context = 'Port\s*=\s*'  # Only replace in port assignments
        AddUsing = 'using CJC.RMS.Core.Configuration;'
    },
    @{
        Pattern = '\b1435\b'
        Replacement = 'DatabaseConstants.NetworkConfig.Sql2022DevPort'
        FileFilter = '*.cs'
        Context = 'Port\s*=\s*'  # Only replace in port assignments
        AddUsing = 'using CJC.RMS.Core.Configuration;'
    },
    
    # SQL Username
    @{
        Pattern = '"sa"'
        Replacement = 'DatabaseConstants.DefaultSqlUsername'
        FileFilter = '*.cs'
        Context = '(Username|User\s*Id|UID)\s*=\s*'  # Only in username contexts
        AddUsing = 'using CJC.RMS.Core.Configuration;'
    },
    
    # Passwords - Replace with centralized constants
    @{
        Pattern = '"abc!123!DEF"'
        Replacement = 'PasswordConstants.DefaultTestPassword'
        FileFilter = '*.cs'
        Context = '(Password|PWD)\s*=\s*'  # Only in password contexts
        AddUsing = 'using CJC.RMS.Core.Configuration;'
    },
    @{
        Pattern = '"r55ukltd"'
        Replacement = 'PasswordConstants.AlternatePassword'
        FileFilter = '*.cs'
        Context = '(Password|PWD)\s*=\s*'  # Only in password contexts
        AddUsing = 'using CJC.RMS.Core.Configuration;'
    }
)

# Files to exclude from replacement
$excludePatterns = @(
    '\\bin\\',
    '\\obj\\',
    '\\.git\\',
    '\\packages\\',
    '\\Scripts\\',
    'DatabaseConstants\.cs$',
    'ServerConfiguration\.cs$',
    'PasswordConstants\.cs$',
    'RmsliveContext\.cs$',  # Don't modify EF generated context
    '\\EFC8\\.*Models\\',  # Don't modify EF generated models
    '\\Config\\',  # Don't modify config files (they should have literal values)
    '\.json$',  # Don't modify JSON files
    '\.yaml$'   # Don't modify YAML files
)

$filesModified = 0
$totalReplacements = 0

foreach ($replacement in $replacements) {
    Write-Host "`nProcessing pattern: $($replacement.Pattern)" -ForegroundColor Yellow
    
    $files = Get-ChildItem -Path $RootPath -Filter $replacement.FileFilter -Recurse -ErrorAction SilentlyContinue |
             Where-Object { 
                $path = $_.FullName
                $exclude = $false
                foreach ($pattern in $excludePatterns) {
                    if ($path -match $pattern) {
                        $exclude = $true
                        break
                    }
                }
                if ($replacement.ExcludePatterns) {
                    foreach ($pattern in $replacement.ExcludePatterns) {
                        if ($path -match $pattern) {
                            $exclude = $true
                            break
                        }
                    }
                }
                -not $exclude
             }
    
    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw
        $originalContent = $content
        
        # Build regex pattern with optional context
        $searchPattern = if ($replacement.Context) {
            "($($replacement.Context))$($replacement.Pattern)"
        } else {
            $replacement.Pattern
        }
        
        # Count matches
        $matches = [regex]::Matches($content, $searchPattern)
        if ($matches.Count -gt 0) {
            Write-Host "  File: $($file.Name) - $($matches.Count) occurrences" -ForegroundColor Cyan
            
            if (-not $WhatIf) {
                # Add using statement if needed and not already present
                if ($replacement.AddUsing -and $content -notmatch [regex]::Escape($replacement.AddUsing)) {
                    # Find the last using statement
                    $usingMatch = [regex]::Matches($content, 'using\s+[^;]+;')
                    if ($usingMatch.Count -gt 0) {
                        $lastUsing = $usingMatch[$usingMatch.Count - 1]
                        $insertPos = $lastUsing.Index + $lastUsing.Length
                        $content = $content.Insert($insertPos, "`r`n$($replacement.AddUsing)")
                    } else {
                        # No using statements, add at beginning
                        $content = "$($replacement.AddUsing)`r`n`r`n$content"
                    }
                }
                
                # Perform replacement
                if ($replacement.Context) {
                    $content = [regex]::Replace($content, $searchPattern, "`$1$($replacement.Replacement)")
                } else {
                    $content = $content -replace $replacement.Pattern, $replacement.Replacement
                }
                
                # Save file
                Set-Content -Path $file.FullName -Value $content -NoNewline
                $filesModified++
                $totalReplacements += $matches.Count
            }
        }
    }
}

Write-Host "`n=== SUMMARY ===" -ForegroundColor Green
if ($WhatIf) {
    Write-Host "Preview mode - no files were modified" -ForegroundColor Yellow
    Write-Host "Run with -WhatIf:`$false to perform actual replacements" -ForegroundColor Yellow
} else {
    Write-Host "Files modified: $filesModified" -ForegroundColor Green
    Write-Host "Total replacements: $totalReplacements" -ForegroundColor Green
}

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Review and test the changes"
Write-Host "2. Update configuration files (YAML/JSON) to use the new constants"
Write-Host "3. Consider moving passwords to secure configuration"
Write-Host "4. Run all tests to ensure nothing broke"