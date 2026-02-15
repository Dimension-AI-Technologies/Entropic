#Requires -Version 7.0

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$Grep,
    
    [Parameter(Mandatory = $false)]
    [string]$Glob,
    
    [Parameter(Mandatory = $false)]
    [string]$Path = ".",
    
    [Parameter(Mandatory = $false)]
    [string]$CopyTo,
    
    [Parameter(Mandatory = $false)]
    [ValidateSet("safe", "ask", "force")]
    [string]$CopyMode = "safe",
    
    [Parameter(Mandatory = $false)]
    [switch]$Help
)

# Show help if requested
if ($Help) {
    Write-Host @"
Find-Files.ps1 - Recursively search for files using glob patterns or regex

SYNOPSIS:
    Find-Files.ps1 -Grep <regex> [-Path <path>] [-CopyTo <directory>] [-CopyMode <mode>]
    Find-Files.ps1 -Glob <pattern> [-Path <path>] [-CopyTo <directory>] [-CopyMode <mode>]
    Find-Files.ps1 -Help

DESCRIPTION:
    Recursively searches for files under the specified directory (or current directory)
    and filters them using either glob patterns or regular expressions.
    
    Similar to Unix: find . -type f | grep \$REGEX

PARAMETERS:
    -Grep <regex>
        Use regular expression pattern to match filenames
        Example: -Grep "^Find.*SQL.*\.ps1$"
        
    -Glob <pattern>
        Use glob pattern to match filenames  
        Example: -Glob "Find*SQL*.ps1"
        
    -Path <directory>
        Directory to search in (default: current directory ".")
        
    -CopyTo <directory>
        Optional: Copy found files to specified directory
        Directory will be created if it doesn't exist
        
    -CopyMode <safe|ask|force>
        Controls behavior when destination files exist (default: safe)
        safe  - Fail with error if file exists
        ask   - Prompt for each file: (R)eplace, (A)ll, (S)kip, (C)ancel
        force - Overwrite existing files without prompting
        
    -Help
        Show this help message

EXAMPLES:
    # Find files starting with "Find", containing "SQL", ending with ".ps1"
    Find-Files.ps1 -Grep "^Find.*SQL.*\.ps1$"
    Find-Files.ps1 -Glob "Find*SQL*.ps1"
    
    # Find and copy files with safe mode (default)
    Find-Files.ps1 -Glob "*.txt" -CopyTo "./backup"
    
    # Find and copy with force overwrite
    Find-Files.ps1 -Grep "\.log$" -CopyTo "./logs" -CopyMode force
    
    # Search in specific directory
    Find-Files.ps1 -Glob "*.cs" -Path "./src"

"@ -ForegroundColor Cyan
    exit 0
}

# Validate parameters
if (-not $Grep -and -not $Glob) {
    Write-Error "Either -Grep or -Glob parameter must be specified"
    exit 1
}

if ($Grep -and $Glob) {
    Write-Error "Cannot specify both -Grep and -Glob parameters"
    exit 1
}

# Validate CopyTo parameter if specified
if ($CopyTo) {
    if (Test-Path $CopyTo -PathType Leaf) {
        Write-Error "CopyTo parameter must be a directory path, not a file path"
        exit 1
    }
    
    # Create destination directory if it doesn't exist
    if (-not (Test-Path $CopyTo)) {
        try {
            New-Item -Path $CopyTo -ItemType Directory -Force | Out-Null
            Write-Host "Created destination directory: $CopyTo" -ForegroundColor Green
        } catch {
            Write-Error "Failed to create destination directory: $CopyTo"
            exit 1
        }
    }
}

# Get all files recursively
$allFiles = Get-ChildItem -Path $Path -File -Recurse -ErrorAction SilentlyContinue

if ($Glob) {
    # Use glob pattern matching
    $filteredFiles = $allFiles | Where-Object { $_.Name -like $Glob }
} elseif ($Grep) {
    # Use regex pattern matching
    $filteredFiles = $allFiles | Where-Object { $_.Name -match $Grep }
}

# Function to handle file copying with different modes
function Copy-FileWithMode {
    param(
        [System.IO.FileInfo]$SourceFile,
        [string]$DestinationPath,
        [string]$Mode
    )
    
    $destFile = Join-Path $DestinationPath $SourceFile.Name
    $fileExists = Test-Path $destFile
    
    switch ($Mode) {
        "safe" {
            if ($fileExists) {
                Write-Error "File already exists at destination: $destFile. Use -CopyMode ask or force to handle existing files."
                return $false
            }
        }
        "ask" {
            if ($fileExists) {
                $choice = Read-Host "File '$($SourceFile.Name)' already exists at destination. (R)eplace, (A)ll, (S)kip, (C)ancel? [R/A/S/C]"
                switch ($choice.ToUpper()) {
                    "R" { }  # Continue with copy
                    "A" { 
                        $script:replaceAll = $true
                    }
                    "S" { 
                        Write-Host "Skipped: $($SourceFile.Name)" -ForegroundColor Yellow
                        return $true
                    }
                    "C" { 
                        Write-Host "Operation cancelled by user" -ForegroundColor Red
                        exit 0
                    }
                    default { 
                        Write-Host "Skipped: $($SourceFile.Name) (invalid choice)" -ForegroundColor Yellow
                        return $true
                    }
                }
            }
        }
        "force" {
            # Always copy, overwrite if exists
        }
    }
    
    try {
        Copy-Item -Path $SourceFile.FullName -Destination $destFile -Force
        Write-Host "Copied: $($SourceFile.Name) -> $destFile" -ForegroundColor Green
        return $true
    } catch {
        Write-Error "Failed to copy $($SourceFile.Name): $_"
        return $false
    }
}

# Output results and optionally copy files
if ($filteredFiles) {
    $script:replaceAll = $false
    
    foreach ($file in $filteredFiles) {
        $file.FullName
        
        # Copy file if CopyTo is specified
        if ($CopyTo) {
            $currentMode = $CopyMode
            if ($script:replaceAll -and $CopyMode -eq "ask") {
                $currentMode = "force"
            }
            
            $copyResult = Copy-FileWithMode -SourceFile $file -DestinationPath $CopyTo -Mode $currentMode
            if (-not $copyResult -and $CopyMode -eq "safe") {
                break  # Stop on first error in safe mode
            }
        }
    }
    
    if ($CopyTo) {
        $copiedCount = (Get-ChildItem -Path $CopyTo -File).Count
        Write-Host "`nCopy operation completed. Files in destination: $copiedCount" -ForegroundColor Cyan
    }
} else {
    Write-Host "No files found matching the specified pattern." -ForegroundColor Yellow
}