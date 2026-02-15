#!/usr/bin/env pwsh
#Requires -Version 7.0

<#
.SYNOPSIS
    Converts Markdown files to PDF using pandoc with optimized formatting

.DESCRIPTION
    This script converts any Markdown file to PDF format using pandoc with:
    - Narrow margins (0.75 inches) for better content density
    - XeLaTeX engine for better Unicode support
    - Automatic title extraction from filename
    - Cross-platform PowerShell compatibility

.PARAMETER FilePath
    Path to the Markdown file to convert. Can be relative or absolute path.

.PARAMETER OutputPath
    Optional output path for the PDF. If not specified, creates PDF in same directory as input file.

.PARAMETER Margins
    Margin size in inches. Default is 0.75in for narrow margins.

.PARAMETER Title
    Custom title for the PDF document. If not specified, uses filename without extension.

.PARAMETER ExportPNG
    Also export each PDF page as PNG files for review

.EXAMPLE
    .\Convert-MD-to-PDF.ps1 "README.md"
    Converts README.md to README.pdf in the same directory

.EXAMPLE
    .\Convert-MD-to-PDF.ps1 "docs/guide.md" -OutputPath "output/guide.pdf"
    Converts with custom output path

.EXAMPLE
    .\Convert-MD-to-PDF.ps1 "report.md" -Margins "1in" -Title "Project Report"
    Converts with custom margins and title

.NOTES
    Requirements:
    - pandoc must be installed and available in PATH
    - XeLaTeX must be installed (part of TeX Live or MiKTeX)
    
    Author: Mathew Burkitt <mathew.burkitt@ditech.ai>
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateScript({
        if (-not (Test-Path $_)) {
            throw "File '$_' not found"
        }
        if (-not $_.EndsWith('.md', [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "File must have .md extension"
        }
        return $true
    })]
    [string]$FilePath,
    
    [Parameter(Mandatory = $false)]
    [string]$OutputPath,
    
    [Parameter(Mandatory = $false)]
    [string]$Margins = "0.75in",
    
    [Parameter(Mandatory = $false)]
    [string]$Title,
    
    [Parameter(Mandatory = $false)]
    [switch]$ExportPNG
)

# Resolve absolute path for input file
$inputFile = Resolve-Path $FilePath
$inputDir = Split-Path $inputFile -Parent
$inputName = Split-Path $inputFile -LeafBase

# Determine output path
if (-not $OutputPath) {
    $OutputPath = Join-Path $inputDir "$inputName.pdf"
}

# Determine title
if (-not $Title) {
    $Title = $inputName
}

# Check if pandoc is available
try {
    $pandocVersion = & pandoc --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "pandoc command failed"
    }
    Write-Host "✓ Found pandoc" -ForegroundColor Green
} catch {
    Write-Error "pandoc is not installed or not available in PATH"
    Write-Host "Install pandoc from: https://pandoc.org/installing.html" -ForegroundColor Yellow
    exit 1
}

# Check if XeLaTeX is available
try {
    $xelatexVersion = & xelatex --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "xelatex command failed"
    }
    Write-Host "✓ Found XeLaTeX" -ForegroundColor Green
} catch {
    Write-Error "XeLaTeX is not installed or not available in PATH"
    Write-Host "Install TeX Live from: https://www.tug.org/texlive/" -ForegroundColor Yellow
    Write-Host "Or MiKTeX from: https://miktex.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "Converting '$FilePath' to PDF..." -ForegroundColor Cyan
Write-Host "  Input:  $inputFile"
Write-Host "  Output: $OutputPath"
Write-Host "  Title:  $Title"
Write-Host "  Margins: $Margins"

# Build pandoc command
$pandocArgs = @(
    "`"$inputFile`""
    "-o"
    "`"$OutputPath`""
    "--pdf-engine=xelatex"
    "--metadata"
    "title=`"$Title`""
    "-V"
    "geometry:margin=$Margins"
)

# Execute pandoc conversion
try {
    $pandocCmd = "pandoc " + ($pandocArgs -join " ")
    Write-Host "Executing: $pandocCmd" -ForegroundColor DarkGray
    
    Invoke-Expression $pandocCmd
    
    if ($LASTEXITCODE -eq 0) {
        # Check if output file was created
        if (Test-Path $OutputPath) {
            $outputSize = (Get-Item $OutputPath).Length
            Write-Host "✓ PDF created successfully" -ForegroundColor Green
            Write-Host "  Size: $([math]::Round($outputSize / 1KB, 1)) KB"
            Write-Host "  Location: $OutputPath"
        } else {
            Write-Error "PDF conversion appeared to succeed but output file not found"
            exit 1
        }
    } else {
        Write-Error "pandoc conversion failed with exit code $LASTEXITCODE"
        exit 1
    }
} catch {
    Write-Error "Failed to execute pandoc: $($_.Exception.Message)"
    exit 1
}

# Export PNG pages if requested
if ($ExportPNG) {
    Write-Host "Exporting PDF pages as PNG files..." -ForegroundColor Cyan
    
    # Check if pdftoppm is available (from poppler-utils)
    try {
        $pdftoppmVersion = & pdftoppm -h 2>$null
        Write-Host "✓ Found pdftoppm" -ForegroundColor Green
        
        $pngBaseName = Join-Path $inputDir "$inputName.page"
        $pdftoppmArgs = @(
            "-png"
            "-r"
            "150"  # 150 DPI for good quality
            "`"$OutputPath`""
            "`"$pngBaseName`""
        )
        
        $pdftoppmCmd = "pdftoppm " + ($pdftoppmArgs -join " ")
        Write-Host "Executing: $pdftoppmCmd" -ForegroundColor DarkGray
        
        Invoke-Expression $pdftoppmCmd
        
        if ($LASTEXITCODE -eq 0) {
            # List generated PNG files
            $pngFiles = Get-ChildItem "$inputDir" -Filter "$inputName.page-*.png"
            Write-Host "✓ Exported $($pngFiles.Count) PNG page(s)" -ForegroundColor Green
            foreach ($png in $pngFiles) {
                Write-Host "  Created: $($png.Name)"
            }
        } else {
            Write-Warning "PNG export failed with exit code $LASTEXITCODE"
        }
        
    } catch {
        Write-Warning "pdftoppm not found. Install poppler-utils for PNG export functionality."
        Write-Host "Ubuntu/Debian: sudo apt install poppler-utils" -ForegroundColor Yellow
        Write-Host "Windows: Install from https://blog.alivate.com.au/poppler-windows/" -ForegroundColor Yellow
        Write-Host "macOS: brew install poppler" -ForegroundColor Yellow
    }
}

# Optional: Open the PDF if on Windows and user wants to view it
if ($IsWindows -or $PSVersionTable.PSVersion.Major -le 5) {
    $openChoice = Read-Host "Open PDF now? [y/N]"
    if ($openChoice -eq 'y' -or $openChoice -eq 'Y') {
        try {
            Start-Process $OutputPath
        } catch {
            Write-Warning "Could not open PDF automatically: $($_.Exception.Message)"
        }
    }
}

Write-Host "Conversion completed successfully!" -ForegroundColor Green