#Requires -Version 7.0

# Find-Fakes.ps1
# Comprehensive script to find mock, fake, simulation code, magic strings, and magic numbers
# Merged from CJCHercules and TubeNotes versions for maximum coverage

param(
    [string]$Path = ".",
    [string]$RootPath,  # Alias for Path for backward compatibility
    [switch]$Detailed,
    [switch]$Verbose,
    [switch]$IncludeNodeModules = $false,
    [switch]$ExportJson = $false,
    [string]$JsonOutput = "mock-scan-results.json",
    [switch]$Count,
    [switch]$Stats,
    [switch]$Help
)

# Show help if requested
if ($Help) {
    Write-Host @"
Find-Fakes.ps1 - Comprehensive Mock/Fake/Magic Value Scanner

SYNOPSIS:
    Find-Fakes.ps1 [-Path <path>] [-Detailed] [-Verbose] [-ExportJson] [-Help]

DESCRIPTION:
    Searches for mock implementations, fake data, magic strings, and magic numbers
    across multiple file types in your project.

PARAMETERS:
    -Path <directory>
        Directory to search (default: current directory)
    
    -RootPath <directory>
        Alias for -Path (for backward compatibility)
    
    -Detailed
        Show detailed context around matches (multiple lines)
    
    -Verbose
        Show inline context for each match
    
    -Count, -Stats
        Show only file names and violation counts, sorted by count (descending)
    
    -IncludeNodeModules
        Include node_modules in search (normally excluded)
    
    -ExportJson
        Export results to JSON file
    
    -JsonOutput <filename>
        JSON output filename (default: mock-scan-results.json)
    
    -Help
        Show this help message

EXAMPLES:
    # Basic scan
    Find-Fakes.ps1
    
    # Detailed scan with JSON export
    Find-Fakes.ps1 -Detailed -ExportJson
    
    # Scan specific directory with verbose output
    Find-Fakes.ps1 -Path "./src" -Verbose
    
    # Show only counts per file
    Find-Fakes.ps1 -Count
    Find-Fakes.ps1 -Stats

"@ -ForegroundColor Cyan
    exit 0
}

# Handle path parameter aliases
if ($RootPath -and -not $Path) {
    $Path = $RootPath
} elseif (-not $Path) {
    $Path = "."
}

Write-Host "COMPREHENSIVE MOCK/FAKE/MAGIC VALUE SCANNER" -ForegroundColor Red
Write-Host "=" * 70

# Define search patterns for mock/fake code (combined from both versions)
$MockPatterns = @(
    # Basic mock/fake patterns
    "mock", "mocking", "mocked", "mocker", "MockClient",
    "fake", "faking", "faked", "faker", "FakeClient",
    "stub", "stubbed", "stubbing",
    "dummy",
    "simulate", "simulation",
    
    # .NET Mocking Libraries
    "Moq", "Mock\.Of", "Mock\.Get", "It\.IsAny", "It\.Is\(",
    "NSubstitute", "Substitute\.For", 
    "FakeItEasy", "A\.Fake", "A\.CallTo",
    "Rhino\.Mocks", "MockRepository",
    "TypeMock", "Isolator",
    "JustMock", "Mock\.Create", "Mock\.Arrange",
    "Bogus", "Faker<", "AutoBogus",
    "FluentAssertions\.Mocks",
    "Microsoft\.Fakes", "Shim", "Stub",
    "Castle\.DynamicProxy", "ProxyGenerator",
    
    # API-related patterns
    "test_mode", "TestClient",
    "mock_api", "fake_api",
    "mock_response", "fake_response",
    "mock_data", "fake_data",
    "mock_client", "fake_client",
    "_mock_", "_fake_", "_stub_",
    
    # Data patterns
    "test.*data", "sample.*data", "example.*data",
    "placeholder", "place-holder", "place_holder",
    
    # Code quality markers
    "hardcoded", "hardcode",
    "TODO.*api", "FIXME.*api",
    "temporary.*api",
    
    # F#/FSharp specific test patterns
    "Assert\.True\s*\(\s*true\s*\)",              # Always-true assertions
    "Assert\.False\s*\(\s*false\s*\)",            # Always-false assertions
    "Assert\.Equal\s*\(([^,]+),\s*\1\)",          # Comparing same value (fixed backreference)
    "should\s+equal\s+true",                      # FsUnit always-true
    "should\s+equal\s+false",                      # FsUnit always-false
    "\|>\s*ignore\s*//.*test",                     # Ignored test code
    'failwith\s+"not implemented"',               # Unimplemented tests
    "raise\s+<\|\s+NotImplementedException",      # Not implemented
    "//\s*TODO.*test",                             # TODO in tests
    "//\s*FIXME.*test",                            # FIXME in tests
    "//\s*HACK.*test"                              # HACK in tests
)

# Magic string patterns - focus on actual secrets and credentials
$MagicStringPatterns = @(
    "sk-[a-zA-Z0-9_-]{20,}",                      # OpenAI/Stripe keys
    "xoxb-[0-9]+-[0-9]+-[a-zA-Z0-9]+",           # Slack tokens
    "ghp_[a-zA-Z0-9]{36}",                        # GitHub tokens
    "ghs_[a-zA-Z0-9]{36}",                        # GitHub secret tokens
    "github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}", # GitHub PAT format
    "(password|secret|key|token|auth)\s*[:=]\s*[`"'][^`"']{8,}[`"']",  # Hardcoded credentials
    "test@(test|example)\.(com|org)",             # Test emails
    "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",    # UUIDs
    "AIza[0-9A-Za-z-_]{35}",                      # Google API keys
    "ya29\.[0-9A-Za-z\-_]+",                      # Google OAuth tokens
    "AKIA[0-9A-Z]{16}",                            # AWS Access Key IDs
    "npm_[a-zA-Z0-9]{36}"                         # NPM tokens
)

# Magic number patterns
$MagicNumberPatterns = @(
    "1234567890", "987654321",
    "12345", "54321", "123456",
    "11111", "22222", "33333", "44444", "55555", "66666", "77777", "88888", "99999",
    "999999", "000000",
    "3\.14159", "2\.71828",  # Mathematical constants
    "\b42\b",                # The answer to everything
    "\b666\b", "\b420\b"     # Other notable numbers
)

# File extensions to search (combined from both versions)
$FileExtensions = @(
    # Script languages
    "*.py", "*.ps1", "*.sh", "*.bat", "*.cmd",
    
    # .NET languages
    "*.cs", "*.csx", "*.vb", "*.fs", "*.fsx", "*.fsi",
    
    # C-family languages
    "*.c", "*.cpp", "*.h", "*.hpp", "*.cc", "*.cxx",
    
    # JavaScript/TypeScript ecosystem
    "*.js", "*.jsx", "*.ts", "*.tsx", "*.mjs", "*.cjs",
    
    # Web technologies
    "*.html", "*.htm", "*.css", "*.scss", "*.sass", "*.less",
    
    # Data/Config files
    "*.json", "*.xml", "*.yml", "*.yaml", "*.toml", "*.ini", "*.config",
    
    # Documentation
    "*.md", "*.txt", "*.rst",
    
    # Other languages
    "*.java", "*.go", "*.rs", "*.rb", "*.php", "*.scala", "*.kt"
)

# Files and directories to exclude
$ExcludePatterns = @(
    "*__pycache__*", "*.pyc",
    "*bin*", "*obj*", "*packages*",
    "Find-Fakes.ps1",
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "*.min.js", "*.min.css", "*.map"
)

$ExcludeDirs = @(
    "node_modules", ".git", "dist", "build", "coverage",
    ".vscode", ".idea", "out", "lib", ".cache", ".next",
    "target", "vendor", ".terraform"
)

if (-not $IncludeNodeModules) {
    $ExcludeDirs += "node_modules"
}

# Whitelist patterns that are legitimate
$WhitelistPatterns = @(
    # DOM selectors and element IDs
    "ytd-.*", "#channel-name", "#title", "#owner-name",
    "#info-strings", "#date", "\.ytd-.*", "aria-label",
    
    # API endpoints
    "api\.anthropic\.com", "api\.openai\.com",
    "chrome\.runtime", "chrome\.storage", "chrome\.tabs",
    
    # Test framework patterns (in test files only)
    "jest\.fn", "jest\.mock", "expect\(", "describe\(", "it\(",
    "beforeEach", "afterEach", "beforeAll", "afterAll",
    
    # F# test framework patterns
    "xUnit", "NUnit", "FsUnit", "Expecto", "FsCheck",
    "\[<Fact>\]", "\[<Theory>\]", "\[<Test>\]",
    "should\s+be", "should\s+equal", "should\s+not",
    
    # Common development patterns
    "localhost:[0-9]+", "127\.0\.0\.1", "0\.0\.0\.0",
    
    # Common legitimate patterns
    "data-[\w-]+", "[#\.][a-zA-Z_-][\w-]*",
    
    # F# language patterns
    "module\s+\w+", "namespace\s+\w+", "open\s+\w+",
    "let\s+\w+", "type\s+\w+", "member\s+\w+",
    "|>", "<|", ">>", "<<", "|||", "&&&"
)

function Is-Whitelisted {
    param(
        [string]$Match,
        [string]$Context,
        [string]$FilePath
    )
    
    # NEVER whitelist always-true/false assertions - these are always fake
    if ($Match -match "Assert\.(True|False)\s*\(\s*(true|false)\s*\)") {
        return $false
    }
    
    # Check if in test file
    $IsTestFile = $FilePath -match "\.(test|spec|tests)\.(ts|js|tsx|jsx|py|cs|fs|fsx)$" -or $FilePath -match "Tests?\.(fs|fsx)$"
    
    # Allow certain patterns in test files (like mock, fake, stub, dummy)
    if ($IsTestFile -and ($Match -match "^(mock|fake|stub|dummy)$")) {
        return $true
    }
    
    # Check whitelist patterns
    foreach ($Pattern in $WhitelistPatterns) {
        if ($Context -match $Pattern -or $Match -match $Pattern) {
            return $true
        }
    }
    
    return $false
}

Write-Host "Search Settings:" -ForegroundColor Yellow
Write-Host "  Path: $Path" -ForegroundColor Yellow
Write-Host "  File Types: $($FileExtensions.Count) extensions" -ForegroundColor Yellow
Write-Host "  Mock Patterns: $($MockPatterns.Count) patterns" -ForegroundColor Yellow
Write-Host "  Magic Strings: $($MagicStringPatterns.Count) patterns" -ForegroundColor Yellow
Write-Host "  Magic Numbers: $($MagicNumberPatterns.Count) patterns" -ForegroundColor Yellow
Write-Host "  Excluding: $($ExcludePatterns.Count) file patterns, $($ExcludeDirs.Count) directories" -ForegroundColor Yellow
Write-Host ""

$FoundFiles = @()
$TotalMatches = 0
$FileCount = 0

foreach ($extension in $FileExtensions) {
    Write-Host "Searching $extension files..." -ForegroundColor Cyan
    
    # Get all files of this type, excluding test files and other noise
    $Files = Get-ChildItem -Path $Path -Recurse -Include $extension -ErrorAction SilentlyContinue | Where-Object {
        $file = $_
        $exclude = $false
        
        # Check file name exclusions
        foreach ($pattern in $ExcludePatterns) {
            if ($file.Name -like $pattern -or $file.FullName -like "*$pattern*") {
                $exclude = $true
                break
            }
        }
        
        # Check directory exclusions
        if (-not $exclude) {
            foreach ($dir in $ExcludeDirs) {
                if ($file.FullName -like "*\$dir\*" -or $file.FullName -like "*/$dir/*") {
                    $exclude = $true
                    break
                }
            }
        }
        
        -not $exclude
    }
    
    $FileCount += $Files.Count
    
    foreach ($file in $Files) {
        $fileMatches = @()
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        
        if (-not $content) { continue }
        
        # Search for mock/fake patterns
        foreach ($pattern in $MockPatterns) {
            $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            
            foreach ($match in $matches) {
                $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Count
                $lines = $content -split "`n"
                $context = if ($lineNumber -le $lines.Count) { $lines[$lineNumber - 1].Trim() } else { "" }
                
                if (-not (Is-Whitelisted -Match $match.Value -Context $context -FilePath $file.FullName)) {
                    $fileMatches += @{
                        Type = "MOCK/FAKE"
                        Pattern = $pattern
                        Match = $match.Value
                        LineNumber = $lineNumber
                        Context = $context
                        DetailedContext = ""
                    }
                    
                    # Get detailed context if requested
                    if ($Detailed) {
                        $startLine = [Math]::Max(0, $lineNumber - 2)
                        $endLine = [Math]::Min($lines.Count - 1, $lineNumber + 1)
                        $contextLines = $lines[$startLine..$endLine]
                        $fileMatches[-1].DetailedContext = $contextLines -join "`n"
                    }
                }
            }
        }
        
        # Search for magic strings
        foreach ($pattern in $MagicStringPatterns) {
            try {
                $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                
                foreach ($match in $matches) {
                    $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Count
                    $lines = $content -split "`n"
                    $context = if ($lineNumber -le $lines.Count) { $lines[$lineNumber - 1].Trim() } else { "" }
                    
                    if (-not (Is-Whitelisted -Match $match.Value -Context $context -FilePath $file.FullName)) {
                        $fileMatches += @{
                            Type = "MAGIC STRING"
                            Pattern = $pattern
                            Match = $match.Value
                            LineNumber = $lineNumber
                            Context = $context
                            DetailedContext = ""
                        }
                    }
                }
            }
            catch {
                # Skip invalid regex patterns
            }
        }
        
        # Search for magic numbers
        foreach ($pattern in $MagicNumberPatterns) {
            $matches = [regex]::Matches($content, $pattern)
            
            foreach ($match in $matches) {
                $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Count
                $lines = $content -split "`n"
                $context = if ($lineNumber -le $lines.Count) { $lines[$lineNumber - 1].Trim() } else { "" }
                
                if (-not (Is-Whitelisted -Match $match.Value -Context $context -FilePath $file.FullName)) {
                    $fileMatches += @{
                        Type = "MAGIC NUMBER"
                        Pattern = $pattern
                        Match = $match.Value
                        LineNumber = $lineNumber
                        Context = $context
                        DetailedContext = ""
                    }
                }
            }
        }
        
        if ($fileMatches.Count -gt 0) {
            $FoundFiles += @{
                FilePath = $file.FullName
                RelativePath = $file.FullName.Replace((Get-Location).Path, "").TrimStart('\').TrimStart('/')
                Matches = $fileMatches
            }
            $TotalMatches += $fileMatches.Count
        }
    }
}

# Check if Count/Stats mode is enabled
if ($Count -or $Stats) {
    # Count mode - only show file names and counts
    Write-Host ""
    Write-Host "FILE VIOLATION COUNTS" -ForegroundColor Green
    Write-Host "=" * 70
    
    if ($FoundFiles.Count -eq 0) {
        Write-Host "No mock, fake, or magic values found!" -ForegroundColor Green
    } else {
        # Create a sorted list of files by violation count
        $fileCounts = $FoundFiles | ForEach-Object {
            [PSCustomObject]@{
                File = $_.RelativePath
                Count = $_.Matches.Count
            }
        } | Sort-Object -Property Count -Descending
        
        # Display the sorted results
        Write-Host ""
        Write-Host "Files sorted by violation count (descending):" -ForegroundColor Yellow
        Write-Host ""
        
        # Find the longest filename for formatting
        $maxFileLength = ($fileCounts | ForEach-Object { $_.File.Length } | Measure-Object -Maximum).Maximum
        $maxFileLength = [Math]::Max($maxFileLength, 20)
        
        # Header
        $fileHeader = "File".PadRight($maxFileLength)
        Write-Host "$fileHeader  Violations" -ForegroundColor Cyan
        Write-Host ("-" * ($maxFileLength + 12)) -ForegroundColor Cyan
        
        # Display each file with its count
        foreach ($item in $fileCounts) {
            $fileName = $item.File.PadRight($maxFileLength)
            $countStr = $item.Count.ToString().PadLeft(10)
            
            # Color code based on severity
            $color = "White"
            if ($item.Count -ge 10) { $color = "Red" }
            elseif ($item.Count -ge 5) { $color = "Yellow" }
            elseif ($item.Count -ge 1) { $color = "Gray" }
            
            Write-Host "$fileName  $countStr" -ForegroundColor $color
        }
        
        Write-Host ""
        Write-Host ("-" * ($maxFileLength + 12)) -ForegroundColor Cyan
        Write-Host "Total files with issues: $($FoundFiles.Count)" -ForegroundColor Yellow
        Write-Host "Total violations found:  $TotalMatches" -ForegroundColor Yellow
    }
} else {
    # Normal mode - full details
    Write-Host ""
    Write-Host "SEARCH RESULTS" -ForegroundColor Green
    Write-Host "=" * 70

    if ($FoundFiles.Count -eq 0) {
        Write-Host "No mock, fake, or magic values found!" -ForegroundColor Green
    } else {
        Write-Host "Found $TotalMatches issues in $($FoundFiles.Count) files" -ForegroundColor Red
        Write-Host ""
        
        foreach ($file in $FoundFiles) {
            Write-Host "FILE: $($file.RelativePath)" -ForegroundColor White -BackgroundColor DarkRed
            
            # Group by type
            $groupedMatches = $file.Matches | Group-Object { $_.Type }
            
            foreach ($group in $groupedMatches) {
                Write-Host "  $($group.Name): $($group.Count) issues" -ForegroundColor Yellow
                
                if ($Detailed -or $Verbose) {
                    $uniqueLineNumbers = $group.Group | ForEach-Object { $_.LineNumber } | Sort-Object -Unique
                    
                    foreach ($lineNum in $uniqueLineNumbers) {
                        $lineMatches = $group.Group | Where-Object { $_.LineNumber -eq $lineNum }
                        $patterns = ($lineMatches | ForEach-Object { $_.Match }) -join ", "
                        
                        Write-Host "    Line $lineNum`: $patterns" -ForegroundColor Gray
                        
                        if ($Verbose -and $lineMatches[0].Context) {
                            Write-Host "      Context: $($lineMatches[0].Context)" -ForegroundColor DarkGray
                        }
                        
                        if ($Detailed -and $lineMatches[0].DetailedContext) {
                            Write-Host "      Detailed Context:" -ForegroundColor DarkGray
                            $lineMatches[0].DetailedContext -split "`n" | ForEach-Object {
                                Write-Host "        $_" -ForegroundColor DarkGray
                            }
                        }
                    }
                } else {
                    # Show summary
                    $lineNumbers = ($group.Group | ForEach-Object { $_.LineNumber }) | Sort-Object -Unique
                    Write-Host "    Lines: $($lineNumbers -join ', ')" -ForegroundColor Gray
                }
            }
            
            Write-Host ""
        }
        
        # Summary section
        Write-Host "SUMMARY OF ACTIONS REQUIRED:" -ForegroundColor Red
        Write-Host "=" * 70
        
        $mockFakeFiles = $FoundFiles | Where-Object { 
            $_.Matches | Where-Object { $_.Type -eq "MOCK/FAKE" }
        }
        
        $magicStringFiles = $FoundFiles | Where-Object {
            $_.Matches | Where-Object { $_.Type -eq "MAGIC STRING" }
        }
        
        $magicNumberFiles = $FoundFiles | Where-Object {
            $_.Matches | Where-Object { $_.Type -eq "MAGIC NUMBER" }
        }
        
        if ($mockFakeFiles) {
            Write-Host "MOCK/FAKE CODE:" -ForegroundColor Yellow
            foreach ($file in $mockFakeFiles) {
                Write-Host "  $($file.RelativePath)" -ForegroundColor White
                Write-Host "    Action: Replace with authentic implementation that fails gracefully" -ForegroundColor Gray
            }
        }
        
        if ($magicStringFiles) {
            Write-Host "MAGIC STRINGS:" -ForegroundColor Yellow
            foreach ($file in $magicStringFiles) {
                Write-Host "  $($file.RelativePath)" -ForegroundColor White
                Write-Host "    Action: Move to environment variables or configuration" -ForegroundColor Gray
            }
        }
        
        if ($magicNumberFiles) {
            Write-Host "MAGIC NUMBERS:" -ForegroundColor Yellow
            foreach ($file in $magicNumberFiles) {
                Write-Host "  $($file.RelativePath)" -ForegroundColor White
                Write-Host "    Action: Replace with named constants or configuration" -ForegroundColor Gray
            }
        }
    }

    Write-Host ""
    Write-Host "SCAN COMPLETE" -ForegroundColor Green
    Write-Host "Files scanned: $FileCount"
    Write-Host "Files with issues: $($FoundFiles.Count)"
    Write-Host "Total issues found: $TotalMatches"

    # Group statistics
    $mockCount = ($FoundFiles | ForEach-Object { $_.Matches } | Where-Object { $_.Type -eq "MOCK/FAKE" }).Count
    $stringCount = ($FoundFiles | ForEach-Object { $_.Matches } | Where-Object { $_.Type -eq "MAGIC STRING" }).Count
    $numberCount = ($FoundFiles | ForEach-Object { $_.Matches } | Where-Object { $_.Type -eq "MAGIC NUMBER" }).Count

    Write-Host ""
    Write-Host "Issue Breakdown:" -ForegroundColor Cyan
    Write-Host "  Mock/Fake patterns: $mockCount" -ForegroundColor White
    Write-Host "  Magic strings: $stringCount" -ForegroundColor White
    Write-Host "  Magic numbers: $numberCount" -ForegroundColor White
}

# Export to JSON if requested
if ($ExportJson -and $FoundFiles.Count -gt 0) {
    $jsonOutput = @{
        ScanDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        ScanPath = (Resolve-Path $Path).Path
        TotalFilesScanned = $FileCount
        FilesWithIssues = $FoundFiles.Count
        TotalIssues = $TotalMatches
        IssueBreakdown = @{
            MockFake = $mockCount
            MagicStrings = $stringCount
            MagicNumbers = $numberCount
        }
        Files = $FoundFiles
    }
    
    $jsonOutput | ConvertTo-Json -Depth 5 | Out-File $JsonOutput -Encoding UTF8
    Write-Host ""
    Write-Host "Results exported to: $JsonOutput" -ForegroundColor Cyan
}

if ($TotalMatches -gt 0) {
    Write-Host ""
    Write-Host "RECOMMENDATIONS:" -ForegroundColor Yellow
    Write-Host "• Review each finding in context before taking action" -ForegroundColor White
    Write-Host "• Move hardcoded credentials to environment variables" -ForegroundColor White
    Write-Host "• Replace magic numbers with named constants" -ForegroundColor White
    Write-Host "• Consider if mock/fake code should be in test files only" -ForegroundColor White
    Write-Host "• Use configuration files for environment-specific values" -ForegroundColor White
}