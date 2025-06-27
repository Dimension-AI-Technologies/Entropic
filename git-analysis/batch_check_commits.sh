#!/bin/bash

# Default values
ACCOUNT=""
DATE=""
DELETION_THRESHOLD=100

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --account)
            ACCOUNT="$2"
            shift 2
            ;;
        --date)
            DATE="$2"
            shift 2
            ;;
        --threshold)
            DELETION_THRESHOLD="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 --account <github-account> --date <YYYYMMDD> [--threshold <lines>]"
            echo "Example: $0 --account mbhvl --date 20250619"
            echo "Example: $0 --account dimension-zero --date 20250618 --threshold 50"
            echo ""
            echo "Options:"
            echo "  --account    GitHub account or organization name (required)"
            echo "  --date       Date in YYYYMMDD format (required)"
            echo "  --threshold  Minimum lines deleted to report (default: 100)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ -z "$ACCOUNT" ] || [ -z "$DATE" ]; then
    echo "Error: Both --account and --date are required"
    echo "Use --help for usage information"
    exit 1
fi

# Convert date format from YYYYMMDD to YYYY-MM-DD
FORMATTED_DATE="${DATE:0:4}-${DATE:4:2}-${DATE:6:2}"

# Validate date format
if ! date -d "$FORMATTED_DATE" >/dev/null 2>&1; then
    echo "Error: Invalid date format. Please use YYYYMMDD"
    exit 1
fi

echo "Checking repositories for account: $ACCOUNT"
echo "Date: $FORMATTED_DATE"
echo "Deletion threshold: $DELETION_THRESHOLD lines"
echo "================================================"

# Get all repositories for the account
echo "Fetching repository list..."
REPOS=$(gh repo list "$ACCOUNT" --limit 1000 --json name --jq '.[].name' 2>/dev/null)

if [ -z "$REPOS" ]; then
    echo "Error: Could not fetch repositories for account '$ACCOUNT'"
    echo "Please check that the account exists and you have access"
    exit 1
fi

REPO_COUNT=$(echo "$REPOS" | wc -l)
echo "Found $REPO_COUNT repositories"
echo ""

# Track repositories with commits
REPOS_WITH_COMMITS=()
DELETION_REPORT=()
REPO_INDEX=0

# Check each repository
for repo in $REPOS; do
    REPO_INDEX=$((REPO_INDEX + 1))
    echo -ne "\rChecking repository $REPO_INDEX/$REPO_COUNT: $repo...          "
    
    # Get commits for the specified date
    COMMITS=$(gh api "repos/$ACCOUNT/$repo/commits?since=${FORMATTED_DATE}T00:00:00Z&until=${FORMATTED_DATE}T23:59:59Z" --jq '.[].sha' 2>/dev/null)
    
    if [ ! -z "$COMMITS" ]; then
        REPOS_WITH_COMMITS+=("$repo")
        
        # Check each commit for large deletions
        for sha in $COMMITS; do
            # Get commit stats
            DELETIONS=$(gh api "repos/$ACCOUNT/$repo/commits/$sha" --jq '.stats.deletions // 0' 2>/dev/null)
            
            # Check if DELETIONS is a valid number (not an error message)
            if [[ "$DELETIONS" =~ ^[0-9]+$ ]] && [ "$DELETIONS" -ge "$DELETION_THRESHOLD" ]; then
                # Get the most deleted file
                MAIN_FILE=$(gh api "repos/$ACCOUNT/$repo/commits/$sha" --jq '.files | max_by(.deletions) | .filename // "unknown"' 2>/dev/null)
                
                # Count files with significant deletions
                FILE_COUNT=$(gh api "repos/$ACCOUNT/$repo/commits/$sha" --jq "[.files[] | select(.deletions >= $((DELETION_THRESHOLD / 2)))] | length" 2>/dev/null)
                
                # Format the report entry
                if [ "$FILE_COUNT" -eq 1 ]; then
                    DELETION_REPORT+=("$repo $sha $DELETIONS lines 1 file ($MAIN_FILE)")
                else
                    DELETION_REPORT+=("$repo $sha $DELETIONS lines $FILE_COUNT files ($MAIN_FILE)")
                fi
            fi
        done
    fi
done

echo -e "\n\n================================================"
echo "SUMMARY REPORT"
echo "================================================"

# Report repositories with commits
if [ ${#REPOS_WITH_COMMITS[@]} -eq 0 ]; then
    echo "No repositories had commits on $FORMATTED_DATE"
else
    echo "Repositories with commits on $FORMATTED_DATE:"
    for repo in "${REPOS_WITH_COMMITS[@]}"; do
        echo "  - $repo"
    done
    echo ""
    
    # Report large deletions
    if [ ${#DELETION_REPORT[@]} -eq 0 ]; then
        echo "No commits with deletions ≥ $DELETION_THRESHOLD lines found"
    else
        echo "Commits with deletions ≥ $DELETION_THRESHOLD lines:"
        INDEX=1
        for entry in "${DELETION_REPORT[@]}"; do
            echo "$INDEX. $entry"
            INDEX=$((INDEX + 1))
        done
    fi
fi

echo ""
echo "Analysis complete."