#!/bin/bash

# Default values
ACCOUNT=""
DAYS=""
DELETION_THRESHOLD=100

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --account)
            ACCOUNT="$2"
            shift 2
            ;;
        --days)
            DAYS="$2"
            shift 2
            ;;
        --threshold)
            DELETION_THRESHOLD="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 --account <github-account> --days <N> [--threshold <lines>]"
            echo "Example: $0 --account mbhvl --days 7"
            echo "Example: $0 --account dimension-zero --days 30 --threshold 50"
            echo ""
            echo "Options:"
            echo "  --account    GitHub account or organization name (required)"
            echo "  --days       Number of days to look back (required)"
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
if [ -z "$ACCOUNT" ] || [ -z "$DAYS" ]; then
    echo "Error: Both --account and --days are required"
    echo "Use --help for usage information"
    exit 1
fi

# Validate days is a positive integer
if ! [[ "$DAYS" =~ ^[0-9]+$ ]] || [ "$DAYS" -eq 0 ]; then
    echo "Error: --days must be a positive integer"
    exit 1
fi

# Calculate date range
END_DATE=$(date +%Y-%m-%d)
START_DATE=$(date -d "$DAYS days ago" +%Y-%m-%d)

echo "Checking repositories for account: $ACCOUNT"
echo "Period: Last $DAYS days ($START_DATE to $END_DATE)"
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

# Track results
declare -A REPO_COMMITS_BY_DATE
declare -A REPO_DELETIONS
DELETION_REPORT=()
REPO_INDEX=0
TOTAL_REPOS_WITH_COMMITS=0
TOTAL_DELETION_COMMITS=0

# Check each repository
for repo in $REPOS; do
    REPO_INDEX=$((REPO_INDEX + 1))
    echo -ne "\rChecking repository $REPO_INDEX/$REPO_COUNT: $repo...          "
    
    # Get commits for the date range
    COMMITS=$(gh api "repos/$ACCOUNT/$repo/commits?since=${START_DATE}T00:00:00Z&until=${END_DATE}T23:59:59Z" --jq '.[].sha' 2>/dev/null)
    
    if [ ! -z "$COMMITS" ]; then
        REPO_HAS_COMMITS=true
        REPO_HAS_DELETIONS=false
        
        # Check each commit for large deletions
        for sha in $COMMITS; do
            # Get commit date and stats
            COMMIT_INFO=$(gh api "repos/$ACCOUNT/$repo/commits/$sha" --jq '{date: .commit.author.date, deletions: .stats.deletions}' 2>/dev/null)
            DELETIONS=$(echo "$COMMIT_INFO" | gh api --input - --jq '.deletions // 0' 2>/dev/null)
            COMMIT_DATE=$(echo "$COMMIT_INFO" | gh api --input - --jq '.date // ""' 2>/dev/null | cut -d'T' -f1)
            
            # Check if DELETIONS is a valid number (not an error message)
            if [[ "$DELETIONS" =~ ^[0-9]+$ ]] && [ "$DELETIONS" -ge "$DELETION_THRESHOLD" ]; then
                REPO_HAS_DELETIONS=true
                ((TOTAL_DELETION_COMMITS++))
                
                # Get the most deleted file
                MAIN_FILE=$(gh api "repos/$ACCOUNT/$repo/commits/$sha" --jq '.files | max_by(.deletions) | .filename // "unknown"' 2>/dev/null)
                
                # Count files with significant deletions
                FILE_COUNT=$(gh api "repos/$ACCOUNT/$repo/commits/$sha" --jq "[.files[] | select(.deletions >= $((DELETION_THRESHOLD / 2)))] | length" 2>/dev/null)
                
                # Get commit message
                MESSAGE=$(gh api "repos/$ACCOUNT/$repo/commits/$sha" --jq '.commit.message' 2>/dev/null | head -1)
                
                # Format the report entry
                if [ "$FILE_COUNT" -eq 1 ]; then
                    DELETION_REPORT+=("$COMMIT_DATE | $repo | $sha | $DELETIONS lines | 1 file ($MAIN_FILE) | $MESSAGE")
                else
                    DELETION_REPORT+=("$COMMIT_DATE | $repo | $sha | $DELETIONS lines | $FILE_COUNT files ($MAIN_FILE) | $MESSAGE")
                fi
                
                # Track deletions by repo
                if [ -z "${REPO_DELETIONS[$repo]}" ]; then
                    REPO_DELETIONS[$repo]=$DELETIONS
                else
                    REPO_DELETIONS[$repo]=$((${REPO_DELETIONS[$repo]} + $DELETIONS))
                fi
            fi
        done
        
        if [ "$REPO_HAS_COMMITS" = true ]; then
            ((TOTAL_REPOS_WITH_COMMITS++))
        fi
    fi
done

echo -e "\n\n================================================"
echo "SUMMARY REPORT"
echo "================================================"

# Overall summary
echo "Period analyzed: $START_DATE to $END_DATE ($DAYS days)"
echo "Total repositories checked: $REPO_COUNT"
echo "Repositories with commits: $TOTAL_REPOS_WITH_COMMITS"
echo "Commits with deletions ≥ $DELETION_THRESHOLD lines: $TOTAL_DELETION_COMMITS"
echo ""

# Report large deletions sorted by date
if [ ${#DELETION_REPORT[@]} -eq 0 ]; then
    echo "No commits with deletions ≥ $DELETION_THRESHOLD lines found in the last $DAYS days"
else
    echo "Large deletions (sorted by date):"
    echo "--------------------------------"
    # Sort by date (newest first)
    IFS=$'\n' SORTED=($(sort -r <<<"${DELETION_REPORT[*]}"))
    unset IFS
    
    INDEX=1
    for entry in "${SORTED[@]}"; do
        echo "$INDEX. $entry"
        INDEX=$((INDEX + 1))
    done
    
    echo ""
    echo "Top repositories by total lines deleted:"
    echo "---------------------------------------"
    # Sort repos by total deletions
    for repo in "${!REPO_DELETIONS[@]}"; do
        echo "$repo: ${REPO_DELETIONS[$repo]}"
    done | sort -t: -k2 -nr | head -10
fi

echo ""
echo "Analysis complete."