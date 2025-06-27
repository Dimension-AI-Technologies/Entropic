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

# Create temporary directory for results
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Function to check a single repository
check_repo() {
    local repo=$1
    local output_file="$TEMP_DIR/${repo//\//_}.txt"
    
    # Get commits for the date range
    COMMITS=$(gh api "repos/$ACCOUNT/$repo/commits?since=${START_DATE}T00:00:00Z&until=${END_DATE}T23:59:59Z" --jq '.[].sha' 2>/dev/null)
    
    if [ ! -z "$COMMITS" ]; then
        echo "HAS_COMMITS" > "$output_file"
        
        # Check each commit for large deletions
        for sha in $COMMITS; do
            # Get commit info in one API call
            COMMIT_DATA=$(gh api "repos/$ACCOUNT/$repo/commits/$sha" 2>/dev/null)
            
            if [ ! -z "$COMMIT_DATA" ]; then
                DELETIONS=$(echo "$COMMIT_DATA" | gh api --input - --jq '.stats.deletions // 0' 2>/dev/null)
                
                # Check if DELETIONS is a valid number
                if [[ "$DELETIONS" =~ ^[0-9]+$ ]] && [ "$DELETIONS" -ge "$DELETION_THRESHOLD" ]; then
                    COMMIT_DATE=$(echo "$COMMIT_DATA" | gh api --input - --jq '.commit.author.date // ""' 2>/dev/null | cut -d'T' -f1)
                    MAIN_FILE=$(echo "$COMMIT_DATA" | gh api --input - --jq '.files | max_by(.deletions) | .filename // "unknown"' 2>/dev/null)
                    FILE_COUNT=$(echo "$COMMIT_DATA" | gh api --input - --jq "[.files[] | select(.deletions >= $((DELETION_THRESHOLD / 2)))] | length" 2>/dev/null)
                    MESSAGE=$(echo "$COMMIT_DATA" | gh api --input - --jq '.commit.message' 2>/dev/null | head -1 | tr '|' '-')
                    
                    if [ "$FILE_COUNT" -eq 1 ]; then
                        echo "DELETION|$COMMIT_DATE|$repo|$sha|$DELETIONS|1 file ($MAIN_FILE)|$MESSAGE" >> "$output_file"
                    else
                        echo "DELETION|$COMMIT_DATE|$repo|$sha|$DELETIONS|$FILE_COUNT files ($MAIN_FILE)|$MESSAGE" >> "$output_file"
                    fi
                fi
            fi
        done
    fi
}

# Process repositories in parallel
echo "Checking repositories for large deletions..."
export -f check_repo
export ACCOUNT START_DATE END_DATE DELETION_THRESHOLD TEMP_DIR

# Use xargs for parallel processing (adjust -P for number of parallel jobs)
echo "$REPOS" | xargs -P 10 -I {} bash -c 'check_repo "$@"' _ {}

# Collect results
echo -e "\n================================================"
echo "SUMMARY REPORT"
echo "================================================"

TOTAL_REPOS_WITH_COMMITS=0
DELETION_REPORT=()

# Read results from temporary files
for repo in $REPOS; do
    output_file="$TEMP_DIR/${repo//\//_}.txt"
    if [ -f "$output_file" ]; then
        if grep -q "HAS_COMMITS" "$output_file"; then
            ((TOTAL_REPOS_WITH_COMMITS++))
        fi
        
        # Extract deletion records
        while IFS='|' read -r type date repo_name sha deletions files message; do
            if [ "$type" = "DELETION" ]; then
                DELETION_REPORT+=("$date | $repo_name | $sha | $deletions lines | $files | $message")
            fi
        done < <(grep "^DELETION|" "$output_file" 2>/dev/null)
    fi
done

# Overall summary
echo "Period analyzed: $START_DATE to $END_DATE ($DAYS days)"
echo "Total repositories checked: $REPO_COUNT"
echo "Repositories with commits: $TOTAL_REPOS_WITH_COMMITS"
echo "Commits with deletions ≥ $DELETION_THRESHOLD lines: ${#DELETION_REPORT[@]}"
echo ""

# Report large deletions sorted by date
if [ ${#DELETION_REPORT[@]} -eq 0 ]; then
    echo "No commits with deletions ≥ $DELETION_THRESHOLD lines found in the last $DAYS days"
else
    echo "Large deletions (sorted by date, newest first):"
    echo "---------------------------------------------"
    # Sort by date (newest first)
    IFS=$'\n' SORTED=($(sort -r <<<"${DELETION_REPORT[*]}"))
    unset IFS
    
    INDEX=1
    for entry in "${SORTED[@]}"; do
        echo "$INDEX. $entry"
        INDEX=$((INDEX + 1))
    done
fi

echo ""
echo "Analysis complete."