#Requires -Version 7.0

# Find-EnvironmentVariables.ps1
# Scans source files for OS environment variable usage across various programming languages
# Detects patterns like $env:VAR (PowerShell), process.env (Node.js), os.environ (Python), etc.

param(
    [string]$Path = ".",
    [string]$SortBy = "TOTAL",
    [string[]]$Languages = @(),  # Empty means all languages
    [switch]$IncludeEmpty,
    [switch]$ExportCsv,
    [string]$CsvPath = "environment-variables.csv",
    [switch]$Recurse = $true,
    [int]$Context = 0,
    [switch]$GroupByVariable,
    [switch]$Help
)

# Show help if requested
if ($Help) {
    Write-Host @"
Find-EnvironmentVariables.ps1 - Find OS environment variable usage in source code

SYNOPSIS:
    Find-EnvironmentVariables.ps1 [-Path <path>] [-Languages <languages>] [-SortBy <field>]
    Find-EnvironmentVariables.ps1 -GroupByVariable [-Path <path>]
    Find-EnvironmentVariables.ps1 -Help

DESCRIPTION:
    Recursively searches for environment variable usage patterns across multiple
    programming languages in the specified directory (or current directory).

PARAMETERS:
    -Path <directory>
        Directory to search in (default: current directory ".")
        
    -Languages <string[]>
        Filter by specific languages (default: all supported)
        Example: -Languages 'C#','PowerShell','Python'
        
    -SortBy <string>
        Sort results by: File, Language, TOTAL, or specific language name
        Default: TOTAL
        
    -GroupByVariable
        Group results by environment variable name instead of by file
        
    -Context <int>
        Show N lines of context around matches (default: 0)
        
    -ExportCsv
        Export results to CSV file
        
    -CsvPath <string>
        Path for CSV export (default: environment-variables.csv)
        
    -IncludeEmpty
        Include files with no environment variable usage
        
    -Recurse
        Search recursively in subdirectories (default: true)
        
    -Help
        Show this help message

EXAMPLES:
    # Find all environment variable usage
    Find-EnvironmentVariables.ps1
    
    # Search specific languages
    Find-EnvironmentVariables.ps1 -Languages 'C#','PowerShell'
    
    # Group by variable name to see which variables are used where
    Find-EnvironmentVariables.ps1 -GroupByVariable
    
    # Show context around matches
    Find-EnvironmentVariables.ps1 -Context 2
    
    # Export results to CSV
    Find-EnvironmentVariables.ps1 -ExportCsv

SUPPORTED LANGUAGES:
    C#, F#, PowerShell, Python, VB.NET, JavaScript, TypeScript, 
    Java, C++, C, Go, Rust, Ruby, PHP, Shell/Bash, Batch, 
    YAML, Docker, Makefile

"@ -ForegroundColor Cyan
    exit 0
}

# Color configuration
$COLOR_HEADER = "Cyan"
$COLOR_WARNING = "Yellow"
$COLOR_ERROR = "Red"
$COLOR_SUCCESS = "Green"
$COLOR_INFO = "White"
$COLOR_MUTED = "DarkGray"
$COLOR_HIGH = "Magenta"

# Language definitions with environment variable patterns
$LANGUAGE_DEFINITIONS = @{
    "C#" = @{
        Extensions = @("*.cs", "*.csx")
        Patterns = @(
            "Environment\.GetEnvironmentVariable\s*\(\s*[""']([^""']+)[""']\s*\)",  # Environment.GetEnvironmentVariable("VAR")
            "Environment\.GetEnvironmentVariable\s*\(\s*([A-Za-z_]\w*)\s*\)",       # Environment.GetEnvironmentVariable(varName)
            "Environment\.ExpandEnvironmentVariables\s*\([^)]+\)",                   # Environment.ExpandEnvironmentVariables()
            "%([A-Za-z_]\w*)%"                                                       # %VAR% in strings
        )
    }
    "F#" = @{
        Extensions = @("*.fs", "*.fsx", "*.fsi")
        Patterns = @(
            "Environment\.GetEnvironmentVariable\s*[""']([^""']+)[""']",            # Environment.GetEnvironmentVariable "VAR"
            "Environment\.GetEnvironmentVariable\s*\(\s*[""']([^""']+)[""']\s*\)",  # Environment.GetEnvironmentVariable("VAR")
            "%([A-Za-z_]\w*)%"                                                       # %VAR% in strings
        )
    }
    "PowerShell" = @{
        Extensions = @("*.ps1", "*.psm1", "*.psd1")
        Patterns = @(
            '\$env:([A-Za-z_]\w*)',                                                  # $env:VAR
            '\$\{env:([A-Za-z_][^}]*)\}',                                           # ${env:VAR}
            '\[Environment\]::GetEnvironmentVariable\s*\(\s*[""'']([^""'']+)[""'']\s*\)', # [Environment]::GetEnvironmentVariable("VAR")
            '\[System\.Environment\]::GetEnvironmentVariable\s*\(\s*[""'']([^""'']+)[""'']\s*\)', # [System.Environment]::GetEnvironmentVariable("VAR")
            '%([A-Za-z_]\w*)%'                                                       # %VAR% expansion
        )
    }
    "Python" = @{
        Extensions = @("*.py", "*.pyw")
        Patterns = @(
            "os\.environ\[[""']([^""']+)[""']\]",                                   # os.environ["VAR"]
            "os\.environ\.get\s*\(\s*[""']([^""']+)[""']",                         # os.environ.get("VAR")
            "os\.getenv\s*\(\s*[""']([^""']+)[""']",                               # os.getenv("VAR")
            "os\.environ\s*\.\s*get\s*\(\s*[""']([^""']+)[""']",                   # os.environ.get("VAR")
            "os\.path\.expandvars\s*\([^)]+\)"                                      # os.path.expandvars()
        )
    }
    "VB.NET" = @{
        Extensions = @("*.vb")
        Patterns = @(
            "Environment\.GetEnvironmentVariable\s*\(\s*""([^""]+)""\s*\)",         # Environment.GetEnvironmentVariable("VAR")
            "Environment\.ExpandEnvironmentVariables\s*\([^)]+\)",                   # Environment.ExpandEnvironmentVariables()
            "%([A-Za-z_]\w*)%"                                                       # %VAR%
        )
    }
    "JavaScript" = @{
        Extensions = @("*.js", "*.jsx", "*.mjs")
        Patterns = @(
            "process\.env\.([A-Za-z_]\w*)",                                         # process.env.VAR
            "process\.env\[[""'`]([^""'`]+)[""'`]\]",                              # process.env["VAR"]
            "import\.meta\.env\.([A-Za-z_]\w*)",                                    # import.meta.env.VAR (Vite)
            "process\.env\s*\.\s*([A-Z_][A-Z0-9_]*)"                               # process.env.CONSTANT_CASE
        )
    }
    "TypeScript" = @{
        Extensions = @("*.ts", "*.tsx")
        Patterns = @(
            "process\.env\.([A-Za-z_]\w*)",                                         # process.env.VAR
            "process\.env\[[""'`]([^""'`]+)[""'`]\]",                              # process.env["VAR"]
            "import\.meta\.env\.([A-Za-z_]\w*)",                                    # import.meta.env.VAR (Vite)
            "process\.env\s*\.\s*([A-Z_][A-Z0-9_]*)"                               # process.env.CONSTANT_CASE
        )
    }
    "Java" = @{
        Extensions = @("*.java")
        Patterns = @(
            'System\.getenv\s*\(\s*"([^"]+)"\s*\)',                                # System.getenv("VAR")
            "System\.getenv\s*\(\s*'([^']+)'\s*\)",                                # System.getenv('VAR')
            "System\.getenv\s*\(\s*\)",                                             # System.getenv() - all vars
            'ProcessBuilder.*environment\s*\(\s*\)'                                 # ProcessBuilder environment()
        )
    }
    "C++" = @{
        Extensions = @("*.cpp", "*.hpp", "*.cc", "*.cxx", "*.h", "*.hxx")
        Patterns = @(
            'getenv\s*\(\s*"([^"]+)"\s*\)',                                        # getenv("VAR")
            "std::getenv\s*\(\s*""([^""]+)""\s*\)",                                # std::getenv("VAR")
            "_environ\b",                                                           # _environ global
            "environ\b"                                                              # environ global
        )
    }
    "C" = @{
        Extensions = @("*.c", "*.h")
        Patterns = @(
            'getenv\s*\(\s*"([^"]+)"\s*\)',                                        # getenv("VAR")
            "_environ\b",                                                           # _environ global
            "environ\b"                                                              # environ global
        )
    }
    "Go" = @{
        Extensions = @("*.go")
        Patterns = @(
            'os\.Getenv\s*\(\s*"([^"]+)"\s*\)',                                    # os.Getenv("VAR")
            'os\.LookupEnv\s*\(\s*"([^"]+)"\s*\)',                                 # os.LookupEnv("VAR")
            "os\.Environ\s*\(\s*\)",                                                # os.Environ()
            'os\.Setenv\s*\(\s*"([^"]+)"',                                         # os.Setenv("VAR", ...)
            'os\.Unsetenv\s*\(\s*"([^"]+)"\s*\)'                                   # os.Unsetenv("VAR")
        )
    }
    "Rust" = @{
        Extensions = @("*.rs")
        Patterns = @(
            'env::var\s*\(\s*"([^"]+)"\s*\)',                                      # env::var("VAR")
            'std::env::var\s*\(\s*"([^"]+)"\s*\)',                                 # std::env::var("VAR")
            'env::var_os\s*\(\s*"([^"]+)"\s*\)',                                   # env::var_os("VAR")
            "env::vars\s*\(\s*\)",                                                  # env::vars()
            'env!\s*\(\s*"([^"]+)"\s*\)'                                           # env!("VAR") macro
        )
    }
    "Ruby" = @{
        Extensions = @("*.rb")
        Patterns = @(
            "ENV\[[""']([^""']+)[""']\]",                                          # ENV["VAR"]
            "ENV\.fetch\s*\(\s*[""']([^""']+)[""']",                               # ENV.fetch("VAR")
            "ENV\s*\.\s*fetch\s*\(\s*[""']([^""']+)[""']"                          # ENV.fetch("VAR")
        )
    }
    "PHP" = @{
        Extensions = @("*.php")
        Patterns = @(
            '\$_ENV\[[""'']([^""'']+)[""'']\]',                                    # $_ENV["VAR"]
            '\$_SERVER\[[""'']([^""'']+)[""'']\]',                                 # $_SERVER["VAR"]
            'getenv\s*\(\s*[""'']([^""'']+)[""'']\s*\)',                          # getenv("VAR")
            'putenv\s*\(\s*[""'']([^=]+)='                                         # putenv("VAR=value")
        )
    }
    "Shell" = @{
        Extensions = @("*.sh", "*.bash", "*.zsh", "*.fish")
        Patterns = @(
            '\$([A-Za-z_][A-Za-z0-9_]*)',                                          # $VAR
            '\$\{([A-Za-z_][A-Za-z0-9_]*)[:\}]',                                   # ${VAR} or ${VAR:default}
            'export\s+([A-Za-z_][A-Za-z0-9_]*)=',                                  # export VAR=
            '([A-Za-z_][A-Za-z0-9_]*)=',                                           # VAR= (assignment)
            '\$\(printenv\s+([A-Za-z_][A-Za-z0-9_]*)\)'                           # $(printenv VAR)
        )
    }
    "Batch" = @{
        Extensions = @("*.bat", "*.cmd")
        Patterns = @(
            '%([A-Za-z_][A-Za-z0-9_]*)%',                                          # %VAR%
            '!([A-Za-z_][A-Za-z0-9_]*)!',                                          # !VAR! (delayed expansion)
            'set\s+([A-Za-z_][A-Za-z0-9_]*)='                                      # set VAR=
        )
    }
    "YAML" = @{
        Extensions = @("*.yml", "*.yaml")
        Patterns = @(
            '\$\{([A-Za-z_][A-Za-z0-9_]*)\}',                                      # ${VAR}
            '\$\{\{([A-Za-z_][A-Za-z0-9_\.]*)\}\}',                                # ${{VAR}} (GitHub Actions)
            'env\.([A-Za-z_][A-Za-z0-9_]*)',                                       # env.VAR (GitHub Actions)
            '\$([A-Za-z_][A-Za-z0-9_]*)'                                           # $VAR
        )
    }
    "Docker" = @{
        Extensions = @("Dockerfile", "*.dockerfile")
        Patterns = @(
            'ENV\s+([A-Za-z_][A-Za-z0-9_]*)\s',                                    # ENV VAR value
            'ARG\s+([A-Za-z_][A-Za-z0-9_]*)',                                      # ARG VAR
            '\$([A-Za-z_][A-Za-z0-9_]*)',                                          # $VAR
            '\$\{([A-Za-z_][A-Za-z0-9_]*)[:\}]'                                    # ${VAR} or ${VAR:default}
        )
    }
    "Makefile" = @{
        Extensions = @("Makefile", "*.mk", "GNUmakefile")
        Patterns = @(
            '\$\(([A-Za-z_][A-Za-z0-9_]*)\)',                                      # $(VAR)
            '\$\{([A-Za-z_][A-Za-z0-9_]*)\}',                                      # ${VAR}
            'export\s+([A-Za-z_][A-Za-z0-9_]*)',                                   # export VAR
            '\$\$([A-Za-z_][A-Za-z0-9_]*)'                                         # $$VAR (shell variable)
        )
    }
}

# Build extensions list based on selected languages
function Get-ExtensionsForLanguages {
    param([string[]]$LanguageFilter)
    
    $extensions = @()
    
    if ($LanguageFilter.Count -eq 0) {
        # No filter, get all extensions
        foreach ($lang in $LANGUAGE_DEFINITIONS.Values) {
            $extensions += $lang.Extensions
        }
    } else {
        # Filter by specified languages
        foreach ($langName in $LanguageFilter) {
            if ($LANGUAGE_DEFINITIONS.ContainsKey($langName)) {
                $extensions += $LANGUAGE_DEFINITIONS[$langName].Extensions
            } else {
                Write-Host "Warning: Unknown language '$langName'" -ForegroundColor $COLOR_WARNING
            }
        }
    }
    
    return $extensions | Select-Object -Unique
}

# Get language from file name/extension
function Get-LanguageForFile {
    param([string]$FilePath)
    
    $fileName = [System.IO.Path]::GetFileName($FilePath)
    $extension = "*" + [System.IO.Path]::GetExtension($FilePath)
    
    foreach ($langName in $LANGUAGE_DEFINITIONS.Keys) {
        $lang = $LANGUAGE_DEFINITIONS[$langName]
        # Check exact filename match first (for Dockerfile, Makefile, etc.)
        if ($lang.Extensions -contains $fileName) {
            return $langName
        }
        # Then check extension match
        if ($lang.Extensions -contains $extension) {
            return $langName
        }
    }
    
    return "Unknown"
}

# Extract environment variable names from content
function Find-EnvironmentVariables {
    param(
        [string]$Content,
        [string]$Language
    )
    
    $foundVars = @{}
    
    if (-not $LANGUAGE_DEFINITIONS.ContainsKey($Language)) {
        return $foundVars
    }
    
    $patterns = $LANGUAGE_DEFINITIONS[$Language].Patterns
    
    foreach ($pattern in $patterns) {
        try {
            $matches = [regex]::Matches($Content, $pattern, [System.Text.RegularExpressions.RegexOptions]::Multiline)
            foreach ($match in $matches) {
                # Try to extract the variable name from capture groups
                if ($match.Groups.Count -gt 1) {
                    $varName = $match.Groups[1].Value
                    if ($varName -and $varName -notmatch '^\s*$') {
                        if (-not $foundVars.ContainsKey($varName)) {
                            $foundVars[$varName] = 0
                        }
                        $foundVars[$varName]++
                    }
                } else {
                    # Pattern doesn't capture variable name, just count as generic
                    if (-not $foundVars.ContainsKey("(detected)")) {
                        $foundVars["(detected)"] = 0
                    }
                    $foundVars["(detected)"]++
                }
            }
        } catch {
            # Silently ignore regex errors
        }
    }
    
    return $foundVars
}

# Display header
Write-Host "`n========================================" -ForegroundColor $COLOR_HEADER
Write-Host "  Environment Variables Scanner" -ForegroundColor $COLOR_HEADER
Write-Host "========================================" -ForegroundColor $COLOR_HEADER
Write-Host "Path: $((Resolve-Path $Path).Path)" -ForegroundColor $COLOR_INFO
if ($Languages.Count -gt 0) {
    Write-Host "Languages: $($Languages -join ', ')" -ForegroundColor $COLOR_MUTED
} else {
    Write-Host "Languages: All supported" -ForegroundColor $COLOR_MUTED
}
if ($GroupByVariable) {
    Write-Host "Mode: Group by variable name" -ForegroundColor $COLOR_WARNING
}
Write-Host "========================================" -ForegroundColor $COLOR_HEADER
Write-Host ""

# Get extensions based on language filter
$Extensions = Get-ExtensionsForLanguages -LanguageFilter $Languages

if ($Extensions.Count -eq 0) {
    Write-Host "No file extensions to search." -ForegroundColor $COLOR_WARNING
    exit 0
}

# Find all matching files
Write-Host "Scanning for source files..." -ForegroundColor $COLOR_WARNING
Write-Host "  Recursive: $Recurse" -ForegroundColor $COLOR_MUTED

# Show progress while collecting files
Write-Progress -Activity "Collecting files" -Status "Searching for source files" -PercentComplete 0

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

# Get files based on extensions
$files = @()
foreach ($ext in $Extensions) {
    if ($ext -notlike "*.*") {
        # Handle exact filename matches (Dockerfile, Makefile, etc.)
        $files += Get-ChildItem -Path $Path -Filter $ext -File -Recurse:$Recurse -ErrorAction SilentlyContinue
    } else {
        # Handle extension patterns
        $files += Get-ChildItem -Path $Path -Filter $ext -File -Recurse:$Recurse -ErrorAction SilentlyContinue
    }
}

$files = $files | Select-Object -Unique

$stopwatch.Stop()

Write-Progress -Activity "Collecting files" -Completed
Write-Host "  Found $($files.Count) source files in $([math]::Round($stopwatch.Elapsed.TotalSeconds, 1)) seconds" -ForegroundColor $COLOR_SUCCESS

if ($files.Count -eq 0) {
    Write-Host "No source files found matching extensions: $($Extensions -join ', ')" -ForegroundColor $COLOR_WARNING
    exit 0
}

Write-Host ""

# Initialize results arrays
$fileResults = @()
$variableUsage = @{}
$languageStats = @{}
$grandTotal = 0

# Process each file
Write-Host "Analyzing files for environment variables..." -ForegroundColor $COLOR_WARNING
$processed = 0
$filesWithMatches = 0

foreach ($file in $files) {
    $processed++
    
    # Show progress
    $percentComplete = [math]::Round(($processed / $files.Count) * 100, 1)
    Write-Progress -Activity "Scanning files" `
                  -Status "Processing: $($file.Name)" `
                  -CurrentOperation "Processed $processed of $($files.Count) files" `
                  -PercentComplete $percentComplete
    
    # Detect language for this file
    $language = Get-LanguageForFile -FilePath $file.FullName
    
    # Track language statistics
    if (-not $languageStats.ContainsKey($language)) {
        $languageStats[$language] = 0
    }
    $languageStats[$language]++
    
    # Read file content
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction Stop
        
        if ($content) {
            # Find environment variables
            $varsFound = Find-EnvironmentVariables -Content $content -Language $language
            
            if ($varsFound.Count -gt 0) {
                $filesWithMatches++
                
                # Calculate relative path
                $basePath = (Resolve-Path $Path).Path
                $relativePath = $file.FullName.Substring($basePath.Length).TrimStart('\', '/')
                
                # Create file result
                $totalCount = ($varsFound.Values | Measure-Object -Sum).Sum
                $grandTotal += $totalCount
                
                $result = [PSCustomObject]@{
                    File = $relativePath
                    Language = $language
                    TOTAL = $totalCount
                    Variables = $varsFound
                }
                
                $fileResults += $result
                
                # Track global variable usage
                foreach ($var in $varsFound.Keys) {
                    if (-not $variableUsage.ContainsKey($var)) {
                        $variableUsage[$var] = @()
                    }
                    $variableUsage[$var] += [PSCustomObject]@{
                        File = $relativePath
                        Count = $varsFound[$var]
                        Language = $language
                    }
                }
                
                # Show context if requested
                if ($Context -gt 0 -and $varsFound.Count -gt 0) {
                    Write-Host "`n$($file.Name) [$language]:" -ForegroundColor $COLOR_HIGH
                    $lines = $content -split "`n"
                    $lineNum = 0
                    foreach ($line in $lines) {
                        $lineNum++
                        foreach ($pattern in $LANGUAGE_DEFINITIONS[$language].Patterns) {
                            if ($line -match $pattern) {
                                $startLine = [Math]::Max(1, $lineNum - $Context)
                                $endLine = [Math]::Min($lines.Count, $lineNum + $Context)
                                
                                for ($i = $startLine - 1; $i -lt $endLine; $i++) {
                                    $prefix = if ($i + 1 -eq $lineNum) { ">>> " } else { "    " }
                                    Write-Host "$prefix$($i + 1): $($lines[$i])" -ForegroundColor $COLOR_MUTED
                                }
                                break
                            }
                        }
                    }
                }
            } elseif ($IncludeEmpty) {
                # Add empty result
                $basePath = (Resolve-Path $Path).Path
                $relativePath = $file.FullName.Substring($basePath.Length).TrimStart('\', '/')
                
                $result = [PSCustomObject]@{
                    File = $relativePath
                    Language = $language
                    TOTAL = 0
                    Variables = @{}
                }
                
                $fileResults += $result
            }
        }
    }
    catch {
        Write-Host "Error reading $($file.Name): $_" -ForegroundColor $COLOR_ERROR
        continue
    }
}

Write-Progress -Activity "Scanning files" -Completed
Write-Host "  [100%] Scan complete! Found $filesWithMatches files with environment variables." -ForegroundColor $COLOR_SUCCESS

# Display results
if ($GroupByVariable) {
    # Group by variable name
    if ($variableUsage.Count -gt 0) {
        Write-Host "`n========================================" -ForegroundColor $COLOR_HEADER
        Write-Host "     ENVIRONMENT VARIABLES FOUND" -ForegroundColor $COLOR_HEADER
        Write-Host "========================================" -ForegroundColor $COLOR_HEADER
        
        # Sort variables by total usage count
        $sortedVars = $variableUsage.GetEnumerator() | Sort-Object { 
            ($_.Value | Measure-Object -Property Count -Sum).Sum 
        } -Descending
        
        foreach ($varEntry in $sortedVars) {
            $varName = $varEntry.Key
            $usages = $varEntry.Value
            $totalUsage = ($usages | Measure-Object -Property Count -Sum).Sum
            
            Write-Host "`n$varName " -ForegroundColor $COLOR_HIGH -NoNewline
            Write-Host "($totalUsage occurrences in $($usages.Count) files)" -ForegroundColor $COLOR_INFO
            
            foreach ($usage in ($usages | Sort-Object -Property Count -Descending)) {
                Write-Host ("  {0,-50} {1,3} [{2}]" -f $usage.File, $usage.Count, $usage.Language) -ForegroundColor $COLOR_MUTED
            }
        }
        
        Write-Host "`n========================================" -ForegroundColor $COLOR_HEADER
        Write-Host "              SUMMARY" -ForegroundColor $COLOR_HEADER
        Write-Host "========================================" -ForegroundColor $COLOR_HEADER
        Write-Host "Unique variables: $($variableUsage.Count)" -ForegroundColor $COLOR_INFO
        Write-Host "Total occurrences: $grandTotal" -ForegroundColor $COLOR_INFO
        Write-Host "Files with variables: $filesWithMatches" -ForegroundColor $COLOR_INFO
        Write-Host "Files scanned: $($files.Count)" -ForegroundColor $COLOR_INFO
    } else {
        Write-Host "`nNo environment variables found in scanned files." -ForegroundColor $COLOR_SUCCESS
    }
} else {
    # Group by file (default)
    if ($fileResults.Count -gt 0) {
        Write-Host "`n========================================" -ForegroundColor $COLOR_HEADER
        Write-Host "           RESULTS BY FILE" -ForegroundColor $COLOR_HEADER
        Write-Host "========================================" -ForegroundColor $COLOR_HEADER
        
        # Sort results
        if ($SortBy -eq "File") {
            $sorted = $fileResults | Sort-Object -Property File
        } elseif ($SortBy -eq "Language") {
            $sorted = $fileResults | Sort-Object -Property Language, TOTAL -Descending
        } else {
            $sorted = $fileResults | Sort-Object -Property TOTAL -Descending
        }
        
        # Display table
        $sorted | Format-Table -Property File, Language, TOTAL -AutoSize | Out-String | Write-Host
        
        # Display summary
        Write-Host "========================================" -ForegroundColor $COLOR_HEADER
        Write-Host "              SUMMARY" -ForegroundColor $COLOR_HEADER
        Write-Host "========================================" -ForegroundColor $COLOR_HEADER
        
        Write-Host "Files with variables: $filesWithMatches" -ForegroundColor $COLOR_INFO
        Write-Host "Files scanned: $($files.Count)" -ForegroundColor $COLOR_INFO
        Write-Host "Total variable references: $grandTotal" -ForegroundColor $COLOR_INFO
        Write-Host ""
        
        # Display language breakdown
        if ($languageStats.Count -gt 1) {
            Write-Host "Files by Language:" -ForegroundColor $COLOR_WARNING
            foreach ($lang in ($languageStats.Keys | Sort-Object)) {
                Write-Host ("  {0,-15} {1,5} files" -f "${lang}:", $languageStats[$lang]) -ForegroundColor $COLOR_MUTED
            }
            Write-Host ""
        }
        
        # Show top variables
        if ($variableUsage.Count -gt 0) {
            Write-Host "Top Environment Variables:" -ForegroundColor $COLOR_WARNING
            $topVars = $variableUsage.GetEnumerator() | Sort-Object { 
                ($_.Value | Measure-Object -Property Count -Sum).Sum 
            } -Descending | Select-Object -First 10
            
            foreach ($varEntry in $topVars) {
                $totalUsage = ($varEntry.Value | Measure-Object -Property Count -Sum).Sum
                Write-Host ("  {0,-30} {1,3} occurrences" -f $varEntry.Key, $totalUsage) -ForegroundColor $COLOR_MUTED
            }
        }
        
        # Export to CSV if requested
        if ($ExportCsv) {
            $csvData = @()
            foreach ($result in $sorted) {
                foreach ($var in $result.Variables.Keys) {
                    $csvData += [PSCustomObject]@{
                        File = $result.File
                        Language = $result.Language
                        Variable = $var
                        Count = $result.Variables[$var]
                    }
                }
            }
            $csvData | Export-Csv -Path $CsvPath -NoTypeInformation
            Write-Host "`nResults exported to: $CsvPath" -ForegroundColor $COLOR_SUCCESS
        }
    } else {
        Write-Host "`nNo environment variables found in scanned files." -ForegroundColor $COLOR_SUCCESS
    }
}

Write-Host "`n========================================" -ForegroundColor $COLOR_HEADER
Write-Host "           SCAN COMPLETE" -ForegroundColor $COLOR_HEADER
Write-Host "========================================`n" -ForegroundColor $COLOR_HEADER

# Usage examples
if ($fileResults.Count -eq 0) {
    Write-Host "Usage Examples:" -ForegroundColor $COLOR_INFO
    Write-Host "  .\Find-EnvironmentVariables.ps1                         # Scan current directory" -ForegroundColor $COLOR_MUTED
    Write-Host "  .\Find-EnvironmentVariables.ps1 -Path 'C:\MyProject'    # Scan specific path" -ForegroundColor $COLOR_MUTED
    Write-Host "  .\Find-EnvironmentVariables.ps1 -Languages 'C#','Python' # Only scan specific languages" -ForegroundColor $COLOR_MUTED
    Write-Host "  .\Find-EnvironmentVariables.ps1 -GroupByVariable        # Group by variable name" -ForegroundColor $COLOR_MUTED
    Write-Host "  .\Find-EnvironmentVariables.ps1 -Context 2              # Show context around matches" -ForegroundColor $COLOR_MUTED
    Write-Host "  .\Find-EnvironmentVariables.ps1 -ExportCsv              # Export to CSV" -ForegroundColor $COLOR_MUTED
    Write-Host "`nSupported Languages:" -ForegroundColor $COLOR_INFO
    $langList = ($LANGUAGE_DEFINITIONS.Keys | Sort-Object) -join ", "
    Write-Host "  $langList" -ForegroundColor $COLOR_MUTED
}