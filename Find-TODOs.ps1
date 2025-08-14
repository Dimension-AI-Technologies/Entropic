# Find-TODOs.ps1
# Scans source files for TODO, FIXME, HACK and other markers
# Outputs a formatted table with counts per file

param(
    [string]$Path = ".",
    [string]$SortBy = "TOTAL",
    [string[]]$Keywords = @("TODO", "FIXME", "HACK", "NOTE", "XXX", "REVIEW", "OPTIMIZE", "REFACTOR", "BUG", "WARNING"),
    [string[]]$Languages = @(),  # Empty means all languages
    [switch]$IncludeEmpty,
    [switch]$ExportCsv,
    [string]$CsvPath = "todos.csv",
    [switch]$Recurse = $true,
    [int]$Context = 0
)

# Color configuration
$COLOR_HEADER = "Cyan"
$COLOR_WARNING = "Yellow"
$COLOR_ERROR = "Red"
$COLOR_SUCCESS = "Green"
$COLOR_INFO = "White"
$COLOR_MUTED = "DarkGray"
$COLOR_HIGH = "Magenta"

# Language definitions with comment patterns
$LANGUAGE_DEFINITIONS = @{
    "C#" = @{
        Extensions = @("*.cs", "*.csx")
        CommentPatterns = @(
            "//.*\b{0}\b",           # Single-line //
            "/\*[\s\S]*?\b{0}\b[\s\S]*?\*/"  # Multi-line /* */
        )
    }
    "F#" = @{
        Extensions = @("*.fs", "*.fsx", "*.fsi")
        CommentPatterns = @(
            "//.*\b{0}\b",           # Single-line //
            "\(\*[\s\S]*?\b{0}\b[\s\S]*?\*\)"  # Multi-line (* *)
        )
    }
    "PowerShell" = @{
        Extensions = @("*.ps1", "*.psm1", "*.psd1")
        CommentPatterns = @(
            "#.*\b{0}\b",            # Single-line #
            "<#[\s\S]*?\b{0}\b[\s\S]*?#>"  # Multi-line <# #>
        )
    }
    "Python" = @{
        Extensions = @("*.py", "*.pyw")
        CommentPatterns = @(
            "#.*\b{0}\b",            # Single-line #
            '"""[\s\S]*?\b{0}\b[\s\S]*?"""',  # Triple quotes double
            "'''[\s\S]*?\b{0}\b[\s\S]*?'''"   # Triple quotes single
        )
    }
    "VB.NET" = @{
        Extensions = @("*.vb")
        CommentPatterns = @(
            "'.*\b{0}\b"             # Single-line '
        )
    }
    "JavaScript" = @{
        Extensions = @("*.js", "*.jsx", "*.mjs")
        CommentPatterns = @(
            "//.*\b{0}\b",           # Single-line //
            "/\*[\s\S]*?\b{0}\b[\s\S]*?\*/"  # Multi-line /* */
        )
    }
    "TypeScript" = @{
        Extensions = @("*.ts", "*.tsx")
        CommentPatterns = @(
            "//.*\b{0}\b",           # Single-line //
            "/\*[\s\S]*?\b{0}\b[\s\S]*?\*/"  # Multi-line /* */
        )
    }
    "Java" = @{
        Extensions = @("*.java")
        CommentPatterns = @(
            "//.*\b{0}\b",           # Single-line //
            "/\*[\s\S]*?\b{0}\b[\s\S]*?\*/"  # Multi-line /* */
        )
    }
    "C++" = @{
        Extensions = @("*.cpp", "*.hpp", "*.cc", "*.cxx", "*.h", "*.hxx")
        CommentPatterns = @(
            "//.*\b{0}\b",           # Single-line //
            "/\*[\s\S]*?\b{0}\b[\s\S]*?\*/"  # Multi-line /* */
        )
    }
    "C" = @{
        Extensions = @("*.c", "*.h")
        CommentPatterns = @(
            "//.*\b{0}\b",           # Single-line // (C99)
            "/\*[\s\S]*?\b{0}\b[\s\S]*?\*/"  # Multi-line /* */
        )
    }
    "Go" = @{
        Extensions = @("*.go")
        CommentPatterns = @(
            "//.*\b{0}\b",           # Single-line //
            "/\*[\s\S]*?\b{0}\b[\s\S]*?\*/"  # Multi-line /* */
        )
    }
    "Rust" = @{
        Extensions = @("*.rs")
        CommentPatterns = @(
            "//.*\b{0}\b",           # Single-line //
            "/\*[\s\S]*?\b{0}\b[\s\S]*?\*/"  # Multi-line /* */
        )
    }
    "Ruby" = @{
        Extensions = @("*.rb")
        CommentPatterns = @(
            "#.*\b{0}\b",            # Single-line #
            "=begin[\s\S]*?\b{0}\b[\s\S]*?=end"  # Multi-line =begin =end
        )
    }
    "SQL" = @{
        Extensions = @("*.sql")
        CommentPatterns = @(
            "--.*\b{0}\b",           # Single-line --
            "/\*[\s\S]*?\b{0}\b[\s\S]*?\*/"  # Multi-line /* */
        )
    }
    "Bash" = @{
        Extensions = @("*.sh", "*.bash")
        CommentPatterns = @(
            "#.*\b{0}\b"             # Single-line #
        )
    }
    "YAML" = @{
        Extensions = @("*.yml", "*.yaml")
        CommentPatterns = @(
            "#.*\b{0}\b"             # Single-line #
        )
    }
    "XML" = @{
        Extensions = @("*.xml", "*.xaml", "*.xsd", "*.xsl", "*.csproj", "*.vbproj", "*.fsproj")
        CommentPatterns = @(
            "<!--[\s\S]*?\b{0}\b[\s\S]*?-->"  # XML comments
        )
    }
    "HTML" = @{
        Extensions = @("*.html", "*.htm")
        CommentPatterns = @(
            "<!--[\s\S]*?\b{0}\b[\s\S]*?-->"  # HTML comments
        )
    }
    "CSS" = @{
        Extensions = @("*.css", "*.scss", "*.sass", "*.less")
        CommentPatterns = @(
            "/\*[\s\S]*?\b{0}\b[\s\S]*?\*/"  # Multi-line /* */
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

# Get language from file extension
function Get-LanguageForFile {
    param([string]$FilePath)
    
    $extension = "*" + [System.IO.Path]::GetExtension($FilePath)
    
    foreach ($langName in $LANGUAGE_DEFINITIONS.Keys) {
        $lang = $LANGUAGE_DEFINITIONS[$langName]
        if ($lang.Extensions -contains $extension) {
            return $langName
        }
    }
    
    return "Unknown"
}

# Get comment patterns for a language
function Get-CommentPatterns {
    param([string]$Language, [string]$Keyword)
    
    if (-not $LANGUAGE_DEFINITIONS.ContainsKey($Language)) {
        # Fallback to generic patterns
        return @(
            "(?://|#|'|--|/\*|\*|<!--).*\b$Keyword\b"
        )
    }
    
    $patterns = @()
    foreach ($pattern in $LANGUAGE_DEFINITIONS[$Language].CommentPatterns) {
        $patterns += $pattern -f $Keyword
    }
    
    return $patterns
}

# Display header
Write-Host "`n========================================" -ForegroundColor $COLOR_HEADER
Write-Host "       TODO/FIXME/HACK Scanner" -ForegroundColor $COLOR_HEADER
Write-Host "========================================" -ForegroundColor $COLOR_HEADER
Write-Host "Path: $((Resolve-Path $Path).Path)" -ForegroundColor $COLOR_INFO
Write-Host "Keywords: $($Keywords -join ', ')" -ForegroundColor $COLOR_MUTED
if ($Languages.Count -gt 0) {
    Write-Host "Languages: $($Languages -join ', ')" -ForegroundColor $COLOR_MUTED
} else {
    Write-Host "Languages: All supported" -ForegroundColor $COLOR_MUTED
}
Write-Host "========================================" -ForegroundColor $COLOR_HEADER
Write-Host "" # Add blank line for better readability

# Get extensions based on language filter
$Extensions = Get-ExtensionsForLanguages -LanguageFilter $Languages

if ($Extensions.Count -eq 0) {
    Write-Host "No file extensions to search." -ForegroundColor $COLOR_WARNING
    exit 0
}

# Build language display with extensions
$languageDisplay = @()
if ($Languages.Count -eq 0) {
    # All languages - show them grouped
    foreach ($langName in ($LANGUAGE_DEFINITIONS.Keys | Sort-Object)) {
        $exts = ($LANGUAGE_DEFINITIONS[$langName].Extensions | ForEach-Object { $_.Replace("*", "") }) -join ", "
        $languageDisplay += "$langName [$exts]"
    }
} else {
    # Selected languages only
    foreach ($langName in $Languages) {
        if ($LANGUAGE_DEFINITIONS.ContainsKey($langName)) {
            $exts = ($LANGUAGE_DEFINITIONS[$langName].Extensions | ForEach-Object { $_.Replace("*", "") }) -join ", "
            $languageDisplay += "$langName [$exts]"
        }
    }
}

# Find all matching files
Write-Host "Scanning for source files..." -ForegroundColor $COLOR_WARNING
Write-Host "  Recursive: $Recurse" -ForegroundColor $COLOR_MUTED
Write-Host "  Languages:" -ForegroundColor $COLOR_MUTED
foreach ($lang in $languageDisplay) {
    Write-Host "    - $lang" -ForegroundColor $COLOR_MUTED
}

# Show progress while collecting files
Write-Host "  Collecting files..." -ForegroundColor $COLOR_MUTED
Write-Progress -Activity "Collecting files" -Status "Searching for source files" -PercentComplete 0

# Get-ChildItem with -Include requires -Recurse to work
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$files = @(Get-ChildItem -Path $Path -Include $Extensions -File -Recurse -ErrorAction SilentlyContinue)
$stopwatch.Stop()

Write-Progress -Activity "Collecting files" -Completed
Write-Host "  Found $($files.Count) source files in $([math]::Round($stopwatch.Elapsed.TotalSeconds, 1)) seconds" -ForegroundColor $COLOR_SUCCESS

if ($files.Count -eq 0) {
    Write-Host "No source files found matching extensions: $($Extensions -join ', ')" -ForegroundColor $COLOR_WARNING
    exit 0
}

Write-Host "" # Add blank line before processing

# Initialize results array
$results = @()
$grandTotal = @{}
foreach ($keyword in $Keywords) {
    $grandTotal[$keyword] = 0
}
$grandTotal["TOTAL"] = 0
$languageStats = @{}

# Process each file
Write-Host "Analyzing files for markers..." -ForegroundColor $COLOR_WARNING
$processed = 0
$filesWithMatches = 0
$lastProgressTime = Get-Date
$progressInterval = [TimeSpan]::FromMilliseconds(500)

foreach ($file in $files) {
    $processed++
    
    # Show progress more frequently
    $currentTime = Get-Date
    $timeSinceLastProgress = $currentTime - $lastProgressTime
    
    if ($timeSinceLastProgress -ge $progressInterval -or $processed -eq 1 -or $processed -eq $files.Count) {
        $percentComplete = [math]::Round(($processed / $files.Count) * 100, 1)
        Write-Progress -Activity "Scanning files" `
                      -Status "Processing: $($file.Name)" `
                      -CurrentOperation "Processed $processed of $($files.Count) files ($filesWithMatches with matches)" `
                      -PercentComplete $percentComplete
        
        # Also write to host every 50 files or at milestones
        if ($processed % 50 -eq 0 -or $processed -eq 1 -or $processed -eq [math]::Round($files.Count * 0.25) -or `
            $processed -eq [math]::Round($files.Count * 0.5) -or $processed -eq [math]::Round($files.Count * 0.75)) {
            Write-Host "  [$percentComplete%] Processed $processed/$($files.Count) files..." -ForegroundColor $COLOR_MUTED
        }
        
        $lastProgressTime = $currentTime
    }
    
    # Detect language for this file
    $language = Get-LanguageForFile -FilePath $file.FullName
    
    # Track language statistics
    if (-not $languageStats.ContainsKey($language)) {
        $languageStats[$language] = 0
    }
    $languageStats[$language]++
    
    # Initialize counts for this file
    $counts = @{}
    foreach ($keyword in $Keywords) {
        $counts[$keyword] = 0
    }
    
    # Read file content
    try {
        # Try -Raw first (PowerShell 3.0+), fall back to join if not available
        try {
            $content = Get-Content $file.FullName -Raw -ErrorAction Stop
        } catch {
            # Fallback for older PowerShell versions
            $lines = Get-Content $file.FullName -ErrorAction Stop
            $content = $lines -join "`n"
        }
        
        if ($content) {
            # Check each keyword with language-specific patterns
            foreach ($keyword in $Keywords) {
                $patterns = Get-CommentPatterns -Language $language -Keyword $keyword
                
                foreach ($pattern in $patterns) {
                    $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                    $counts[$keyword] += $matches.Count
                    
                    # If context requested, show the matches
                    if ($Context -gt 0 -and $matches.Count -gt 0) {
                        if ($counts[$keyword] -eq $matches.Count) {
                            Write-Host "`n$($file.Name) [$language]:" -ForegroundColor $COLOR_HIGH
                        }
                        
                        $lines = $content -split "`n"
                        $lineNum = 0
                        foreach ($line in $lines) {
                            $lineNum++
                            if ($line -match "\b$keyword\b") {
                                foreach ($pattern in $patterns) {
                                    if ($line -match $pattern) {
                                        Write-Host "  Line $lineNum [$keyword]: $($line.Trim())" -ForegroundColor $COLOR_MUTED
                                        break
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    catch {
        Write-Host "Error reading $($file.Name): $_" -ForegroundColor $COLOR_ERROR
        continue
    }
    
    # Calculate total for this file
    $total = 0
    foreach ($keyword in $Keywords) {
        $total += $counts[$keyword]
        $grandTotal[$keyword] += $counts[$keyword]
    }
    $counts["TOTAL"] = $total
    $grandTotal["TOTAL"] += $total
    
    # Add to results if has keywords or IncludeEmpty is set
    if ($total -gt 0 -or $IncludeEmpty) {
        $filesWithMatches++
        
        # Calculate relative path
        $basePath = (Resolve-Path $Path).Path
        $relativePath = $file.FullName.Substring($basePath.Length).TrimStart('\', '/')
        
        $result = [PSCustomObject]@{
            File = $relativePath
            Language = $language
            TOTAL = $total
        }
        
        # Add keyword counts as properties
        foreach ($keyword in $Keywords) {
            $result | Add-Member -NotePropertyName $keyword -NotePropertyValue $counts[$keyword]
        }
        
        $results += $result
        
        # Report finding immediately for files with many matches
        if ($total -ge 10) {
            Write-Host "  Found $total keywords in: $relativePath" -ForegroundColor $COLOR_SUCCESS
        }
    }
}

Write-Progress -Activity "Scanning files" -Completed
Write-Host "  [100%] Scan complete! Found $filesWithMatches files with keywords." -ForegroundColor $COLOR_SUCCESS

# Sort results
Write-Host "`nPreparing results..." -ForegroundColor $COLOR_WARNING
Write-Host "  Sorting by: $SortBy" -ForegroundColor $COLOR_INFO

if ($SortBy -eq "File") {
    $sorted = $results | Sort-Object -Property File
} elseif ($SortBy -eq "Language") {
    $sorted = $results | Sort-Object -Property Language, TOTAL -Descending
} elseif ($SortBy -in $Keywords -or $SortBy -eq "TOTAL") {
    $sorted = $results | Sort-Object -Property $SortBy -Descending
} else {
    Write-Host "Invalid sort column: $SortBy. Using TOTAL." -ForegroundColor $COLOR_WARNING
    $sorted = $results | Sort-Object -Property TOTAL -Descending
}

# Display results
if ($results.Count -gt 0) {
    Write-Host "`n========================================" -ForegroundColor $COLOR_HEADER
    Write-Host "           RESULTS BY FILE" -ForegroundColor $COLOR_HEADER
    Write-Host "========================================" -ForegroundColor $COLOR_HEADER
    
    # Create display columns (only show keywords that have at least one occurrence)
    $displayKeywords = $Keywords | Where-Object { $grandTotal[$_] -gt 0 }
    
    if ($displayKeywords.Count -gt 0) {
        # Build format for table
        $properties = @("File", "Language")
        $properties += $displayKeywords
        $properties += "TOTAL"
        
        # Display table
        $sorted | Format-Table -Property $properties -AutoSize | Out-String | Write-Host
        
        # Display summary
        Write-Host "========================================" -ForegroundColor $COLOR_HEADER
        Write-Host "              SUMMARY" -ForegroundColor $COLOR_HEADER
        Write-Host "========================================" -ForegroundColor $COLOR_HEADER
        
        Write-Host "Files with keywords: $($results.Count)" -ForegroundColor $COLOR_INFO
        Write-Host "Files scanned: $($files.Count)" -ForegroundColor $COLOR_INFO
        Write-Host ""
        
        # Display language breakdown
        if ($languageStats.Count -gt 1) {
            Write-Host "Files by Language:" -ForegroundColor $COLOR_WARNING
            foreach ($lang in ($languageStats.Keys | Sort-Object)) {
                Write-Host ("  {0,-15} {1,5} files" -f "${lang}:", $languageStats[$lang]) -ForegroundColor $COLOR_MUTED
            }
            Write-Host ""
        }
        
        Write-Host "Keyword Totals:" -ForegroundColor $COLOR_WARNING
        foreach ($keyword in $displayKeywords) {
            $count = $grandTotal[$keyword]
            $color = switch ($keyword) {
                "FIXME" { $COLOR_ERROR }
                "BUG" { $COLOR_ERROR }
                "HACK" { $COLOR_WARNING }
                "TODO" { $COLOR_HIGH }
                "WARNING" { $COLOR_WARNING }
                default { $COLOR_INFO }
            }
            Write-Host ("  {0,-10} {1,5}" -f "${keyword}:", $count) -ForegroundColor $color
        }
        Write-Host ("  {0,-10} {1,5}" -f "TOTAL:", $grandTotal["TOTAL"]) -ForegroundColor $COLOR_SUCCESS
        
        # Export to CSV if requested
        if ($ExportCsv) {
            $sorted | Export-Csv -Path $CsvPath -NoTypeInformation
            Write-Host "`nResults exported to: $CsvPath" -ForegroundColor $COLOR_SUCCESS
        }
        
        # Show top offenders
        $top = $sorted | Select-Object -First 5
        if ($top.Count -gt 0) {
            Write-Host "`nTop $(if($top.Count -lt 5){$top.Count}else{5}) files by $SortBy count:" -ForegroundColor $COLOR_WARNING
            foreach ($item in $top) {
                $displayCount = if ($SortBy -eq "TOTAL") { $item.TOTAL } else { $item.$SortBy }
                Write-Host ("  {0,-50} {1,3} {2}" -f $item.File, $displayCount, $SortBy) -ForegroundColor $COLOR_MUTED
            }
        }
    } else {
        Write-Host "No keywords found in any files!" -ForegroundColor $COLOR_SUCCESS
    }
} else {
    Write-Host "`nNo keywords found in scanned files." -ForegroundColor $COLOR_SUCCESS
}

Write-Host "`n========================================" -ForegroundColor $COLOR_HEADER
Write-Host "           SCAN COMPLETE" -ForegroundColor $COLOR_HEADER
Write-Host "========================================`n" -ForegroundColor $COLOR_HEADER

# Usage examples
if ($results.Count -eq 0) {
    Write-Host "Usage Examples:" -ForegroundColor $COLOR_INFO
    Write-Host "  .\Find-TODOs.ps1                                        # Scan current directory" -ForegroundColor $COLOR_MUTED
    Write-Host "  .\Find-TODOs.ps1 -Path 'C:\MyProject'                   # Scan specific path" -ForegroundColor $COLOR_MUTED
    Write-Host "  .\Find-TODOs.ps1 -Languages 'C#','F#','PowerShell'     # Only scan specific languages" -ForegroundColor $COLOR_MUTED
    Write-Host "  .\Find-TODOs.ps1 -Keywords 'TODO','HACK'               # Only search for specific keywords" -ForegroundColor $COLOR_MUTED
    Write-Host "  .\Find-TODOs.ps1 -SortBy FIXME                         # Sort by FIXME count" -ForegroundColor $COLOR_MUTED
    Write-Host "  .\Find-TODOs.ps1 -SortBy Language                      # Sort by language" -ForegroundColor $COLOR_MUTED
    Write-Host "  .\Find-TODOs.ps1 -Context 1                            # Show line content" -ForegroundColor $COLOR_MUTED
    Write-Host "  .\Find-TODOs.ps1 -ExportCsv                            # Export to CSV" -ForegroundColor $COLOR_MUTED
    Write-Host "  .\Find-TODOs.ps1 -IncludeEmpty                         # Include files with no keywords" -ForegroundColor $COLOR_MUTED
    Write-Host "`nSupported Languages:" -ForegroundColor $COLOR_INFO
    $langList = ($LANGUAGE_DEFINITIONS.Keys | Sort-Object) -join ", "
    Write-Host "  $langList" -ForegroundColor $COLOR_MUTED
}