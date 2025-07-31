#Requires -Version 5.0
<#
.SYNOPSIS
    Checks Claude API usage limits and current usage
.DESCRIPTION
    Makes a minimal API call to Anthropic Claude API and extracts usage information 
    from response headers to show current usage against limits.
.PARAMETER ApiKey
    Your Anthropic API key (if not set as environment variable)
.PARAMETER ShowHeaders
    Display all response headers for debugging
.PARAMETER Model
    Claude model to use for the test call (default: claude-3-5-sonnet-20241022)
.PARAMETER Help
    Show detailed help information
#>

param(
    [string]$ApiKey,
    [switch]$ShowHeaders,
    [string]$Model = "claude-3-5-sonnet-20241022",
    [switch]$Help
)

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

# Show help if requested
if ($Help) {
    Write-Host @"
=== CLAUDE API USAGE CHECKER - HELP ===

OVERVIEW:
This script checks your Claude API usage limits and current usage by making a minimal 
API call to Anthropic and extracting usage information from the response headers.

WHAT IT SHOWS:
- Current usage vs. limits for requests, tokens, input tokens, and output tokens
- Percentage usage with color coding (green/yellow/red)
- Reset times for rate limits (every 5 hours for Pro/Max plans)
- Warnings when usage is high (>80%)

SETUP:
1. Get your API key from: https://console.anthropic.com/account/keys
2. Set environment variable: `$env:ANTHROPIC_API_KEY = "your-key-here"`
   OR use the -ApiKey parameter

USAGE EXAMPLES:
.\Check-Claude-Usage.ps1                           # Basic usage check
.\Check-Claude-Usage.ps1 -ShowHeaders              # Show all response headers
.\Check-Claude-Usage.ps1 -ApiKey "your-key"        # Use specific API key
.\Check-Claude-Usage.ps1 -Model "claude-3-opus-20240229"  # Test with different model

API RESPONSE HEADERS:
The script extracts these headers from every API response:
- anthropic-ratelimit-requests-remaining    - Requests left in current window
- anthropic-ratelimit-tokens-remaining      - Total tokens remaining
- anthropic-ratelimit-input-tokens-remaining - Input tokens left
- anthropic-ratelimit-output-tokens-remaining - Output tokens left
- anthropic-ratelimit-*-limit               - Maximum limits for each type
- anthropic-ratelimit-*-reset               - When limits reset (Unix timestamp)
- retry-after                               - Seconds to wait before retrying

RATE LIMIT STRUCTURE:
- Pro Plan (Claude Code): ~50-200 prompts per 5-hour session
- Max 5x Plan: ~50-200 prompts per 5-hour session (switches Opus→Sonnet at 20%)
- Max 20x Plan: ~200-800 prompts per 5-hour session (switches Opus→Sonnet at 50%)
- Monthly limit: 50 sessions per month (250 hours total)

COST:
This script makes a minimal API call (10 tokens max) which costs almost nothing
but provides the same usage information that Claude Code uses internally.

NOTES:
- This is the same data Claude Code uses to show "approaching limits" warnings
- Rate limits reset every 5 hours (rolling window)
- Usage is shared between claude.ai and Claude Code
- Color coding: Green (<60%), Yellow (60-80%), Red (>80%)

"@ -ForegroundColor Cyan
    exit 0
}

Write-Info "=== CLAUDE API USAGE CHECKER ==="
Write-Host ""

# Get API key from parameter or environment
if (-not $ApiKey) {
    $ApiKey = $env:ANTHROPIC_API_KEY
}

if (-not $ApiKey) {
    Write-Error "API key not found!"
    Write-Host "Set your API key using:"
    Write-Host "  `$env:ANTHROPIC_API_KEY = 'your-api-key-here'"
    Write-Host "Or use the -ApiKey parameter"
    Write-Host ""
    Write-Host "Get your API key from: https://console.anthropic.com/account/keys"
    exit 1
}

# Prepare headers
$headers = @{
    "x-api-key" = $ApiKey
    "anthropic-version" = "2023-06-01"
    "content-type" = "application/json"
}

# Minimal request body to check usage
$body = @{
    model = $Model
    max_tokens = 10
    messages = @(
        @{
            role = "user"
            content = "Hi"
        }
    )
} | ConvertTo-Json -Depth 10

Write-Info "Making API call to check usage limits..."
Write-Host "Model: $Model" -ForegroundColor Gray
Write-Host ""

try {
    # Make API request and capture response with headers
    $response = Invoke-RestMethod -Uri "https://api.anthropic.com/v1/messages" `
                                 -Method Post `
                                 -Headers $headers `
                                 -Body $body `
                                 -ResponseHeadersVariable responseHeaders

    Write-Success "✓ API call successful"
    Write-Host ""

    # Extract usage information from headers
    $usageInfo = @{}
    $limitInfo = @{}
    $resetInfo = @{}

    foreach ($header in $responseHeaders.GetEnumerator()) {
        $headerName = $header.Name.ToLower()
        $headerValue = $header.Value -join ", "

        if ($headerName -like "*ratelimit*") {
            if ($headerName -like "*limit") {
                $limitInfo[$headerName] = $headerValue
            } elseif ($headerName -like "*remaining") {
                $usageInfo[$headerName] = $headerValue
            } elseif ($headerName -like "*reset") {
                $resetInfo[$headerName] = $headerValue
            }
        }
        
        if ($headerName -eq "retry-after") {
            $resetInfo[$headerName] = $headerValue
        }
    }

    # Display usage information
    Write-Info "CURRENT USAGE & LIMITS:"
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Requests
    $requestsLimit = $limitInfo["anthropic-ratelimit-requests-limit"]
    $requestsRemaining = $usageInfo["anthropic-ratelimit-requests-remaining"]
    if ($requestsLimit -and $requestsRemaining) {
        $requestsUsed = [int]$requestsLimit - [int]$requestsRemaining
        $requestsPercent = [math]::Round(($requestsUsed / [int]$requestsLimit) * 100, 1)
        Write-Host "Requests:      " -NoNewline
        Write-Host "$requestsUsed/$requestsLimit" -ForegroundColor $(if ($requestsPercent -gt 80) { "Red" } elseif ($requestsPercent -gt 60) { "Yellow" } else { "Green" }) -NoNewline
        Write-Host " ($requestsPercent% used, $requestsRemaining remaining)"
    }

    # Total Tokens
    $tokensLimit = $limitInfo["anthropic-ratelimit-tokens-limit"]
    $tokensRemaining = $usageInfo["anthropic-ratelimit-tokens-remaining"]
    if ($tokensLimit -and $tokensRemaining) {
        $tokensUsed = [int]$tokensLimit - [int]$tokensRemaining
        $tokensPercent = [math]::Round(($tokensUsed / [int]$tokensLimit) * 100, 1)
        Write-Host "Total Tokens:  " -NoNewline
        Write-Host "$tokensUsed/$tokensLimit" -ForegroundColor $(if ($tokensPercent -gt 80) { "Red" } elseif ($tokensPercent -gt 60) { "Yellow" } else { "Green" }) -NoNewline
        Write-Host " ($tokensPercent% used, $tokensRemaining remaining)"
    }

    # Input Tokens
    $inputTokensLimit = $limitInfo["anthropic-ratelimit-input-tokens-limit"]
    $inputTokensRemaining = $usageInfo["anthropic-ratelimit-input-tokens-remaining"]
    if ($inputTokensLimit -and $inputTokensRemaining) {
        $inputTokensUsed = [int]$inputTokensLimit - [int]$inputTokensRemaining
        $inputTokensPercent = [math]::Round(($inputTokensUsed / [int]$inputTokensLimit) * 100, 1)
        Write-Host "Input Tokens:  " -NoNewline
        Write-Host "$inputTokensUsed/$inputTokensLimit" -ForegroundColor $(if ($inputTokensPercent -gt 80) { "Red" } elseif ($inputTokensPercent -gt 60) { "Yellow" } else { "Green" }) -NoNewline
        Write-Host " ($inputTokensPercent% used, $inputTokensRemaining remaining)"
    }

    # Output Tokens
    $outputTokensLimit = $limitInfo["anthropic-ratelimit-output-tokens-limit"]
    $outputTokensRemaining = $usageInfo["anthropic-ratelimit-output-tokens-remaining"]
    if ($outputTokensLimit -and $outputTokensRemaining) {
        $outputTokensUsed = [int]$outputTokensLimit - [int]$outputTokensRemaining
        $outputTokensPercent = [math]::Round(($outputTokensUsed / [int]$outputTokensLimit) * 100, 1)
        Write-Host "Output Tokens: " -NoNewline
        Write-Host "$outputTokensUsed/$outputTokensLimit" -ForegroundColor $(if ($outputTokensPercent -gt 80) { "Red" } elseif ($outputTokensPercent -gt 60) { "Yellow" } else { "Green" }) -NoNewline
        Write-Host " ($outputTokensPercent% used, $outputTokensRemaining remaining)"
    }

    # Reset information
    if ($resetInfo.Count -gt 0) {
        Write-Host ""
        Write-Info "RESET INFORMATION:"
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        foreach ($reset in $resetInfo.GetEnumerator()) {
            $resetName = $reset.Name -replace "anthropic-ratelimit-", "" -replace "-reset", ""
            if ($reset.Name -eq "retry-after") {
                Write-Host "Retry After:   $($reset.Value) seconds"
            } else {
                # Convert Unix timestamp to readable time
                try {
                    $timestamp = [int]$reset.Value
                    $resetTime = (Get-Date "1970-01-01 00:00:00").AddSeconds($timestamp)
                    $timeUntilReset = $resetTime - (Get-Date)
                    if ($timeUntilReset.TotalMinutes -gt 0) {
                        Write-Host "$($resetName.PadRight(14)): $($resetTime.ToString('HH:mm:ss')) (in $([math]::Round($timeUntilReset.TotalMinutes, 1)) minutes)"
                    } else {
                        Write-Host "$($resetName.PadRight(14)): $($resetTime.ToString('HH:mm:ss')) (expired)"
                    }
                } catch {
                    Write-Host "$($resetName.PadRight(14)): $($reset.Value)"
                }
            }
        }
    }

    # Usage warnings
    Write-Host ""
    $anyHighUsage = $false
    if ($requestsPercent -gt 80) {
        Write-Warning "⚠ Request usage is high ($requestsPercent%)"
        $anyHighUsage = $true
    }
    if ($tokensPercent -gt 80) {
        Write-Warning "⚠ Token usage is high ($tokensPercent%)"
        $anyHighUsage = $true
    }
    if ($inputTokensPercent -gt 80) {
        Write-Warning "⚠ Input token usage is high ($inputTokensPercent%)"
        $anyHighUsage = $true
    }
    if ($outputTokensPercent -gt 80) {
        Write-Warning "⚠ Output token usage is high ($outputTokensPercent%)"
        $anyHighUsage = $true
    }

    if (-not $anyHighUsage) {
        Write-Success "✓ Usage levels are normal"
    }

    # Show all headers if requested
    if ($ShowHeaders) {
        Write-Host ""
        Write-Info "ALL RESPONSE HEADERS:"
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        foreach ($header in $responseHeaders.GetEnumerator()) {
            $headerValue = $header.Value -join ", "
            Write-Host "$($header.Name.PadRight(40)): $headerValue" -ForegroundColor Gray
        }
    }

} catch {
    Write-Error "Failed to check usage: $($_.Exception.Message)"
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 401) {
            Write-Host "Authentication failed. Check your API key."
        } elseif ($statusCode -eq 429) {
            Write-Host "Rate limit exceeded. Wait before retrying."
        }
    }
    exit 1
}

Write-Host ""
Write-Info "Usage checked at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "Note: Limits reset every 5 hours for Pro/Max plans"