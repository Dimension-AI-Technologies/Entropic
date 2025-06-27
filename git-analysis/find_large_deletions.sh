#!/bin/bash

# Default values
ACCOUNT=""
DAYS=7
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
            echo "Find GitHub repositories with large-scale deletions in the last N days"
            echo ""
            echo "Usage: $0 --account <github-account> [--days <N>] [--threshold <lines>]"
            echo ""
            echo "Examples:"
            echo "  $0 --account dimension-zero                    # Last 7 days, 100+ lines"
            echo "  $0 --account mbhvl --days 30                  # Last 30 days, 100+ lines"
            echo "  $0 --account dimension-zero --days 14 --threshold 500"
            echo ""
            echo "Options:"
            echo "  --account    GitHub account/organization (required)"
            echo "  --days       Number of days to look back (default: 7)"
            echo "  --threshold  Minimum lines deleted (default: 100)"
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
if [ -z "$ACCOUNT" ]; then
    echo "Error: --account is required"
    echo "Use --help for usage information"
    exit 1
fi

# Calculate date range
END_DATE=$(date +%Y-%m-%d)
START_DATE=$(date -d "$DAYS days ago" +%Y-%m-%d)

echo "🔍 Scanning $ACCOUNT for large deletions"
echo "📅 Period: Last $DAYS days ($START_DATE to $END_DATE)"
echo "📏 Threshold: $DELETION_THRESHOLD+ lines deleted"
echo "================================================"

# Use GitHub search API to find recent commits
echo ""
echo "Finding repositories with recent activity..."

# Get all repos - we'll check them for recent commits
ACTIVE_REPOS=$(gh repo list "$ACCOUNT" --limit 1000 --json name --jq '.[].name' 2>/dev/null)

REPO_COUNT=$(echo "$ACTIVE_REPOS" | wc -l)
echo "Found $REPO_COUNT repositories with recent activity"
echo ""

# Track results
DELETIONS_FOUND=0
REPOS_CHECKED=0

echo "Checking for large deletions..."
echo ""

# Check each active repository
for repo in $ACTIVE_REPOS; do
    ((REPOS_CHECKED++))
    echo -ne "\rProgress: $REPOS_CHECKED/$REPO_COUNT repos checked, $DELETIONS_FOUND large deletions found...   "
    
    # Get commits with stats for the date range
    COMMITS_DATA=$(gh api "repos/$ACCOUNT/$repo/commits?since=${START_DATE}T00:00:00Z&until=${END_DATE}T23:59:59Z&per_page=100" \
        --jq '.[] | {sha: .sha, date: .commit.author.date, message: (.commit.message | split("\n")[0])}' 2>/dev/null)
    
    if [ ! -z "$COMMITS_DATA" ]; then
        # Process each commit
        while IFS= read -r commit_json; do
            if [ -z "$commit_json" ]; then continue; fi
            
            SHA=$(echo "$commit_json" | gh api --input - --jq '.sha' 2>/dev/null)
            DATE=$(echo "$commit_json" | gh api --input - --jq '.date' 2>/dev/null | cut -d'T' -f1)
            MESSAGE=$(echo "$commit_json" | gh api --input - --jq '.message' 2>/dev/null)
            
            # Get deletion stats for this commit
            STATS=$(gh api "repos/$ACCOUNT/$repo/commits/$SHA" --jq '{deletions: .stats.deletions, files: [.files[] | select(.deletions > 0) | {name: .filename, deletions: .deletions}]}' 2>/dev/null)
            
            if [ ! -z "$STATS" ]; then
                DELETIONS=$(echo "$STATS" | gh api --input - --jq '.deletions // 0' 2>/dev/null)
                
                if [[ "$DELETIONS" =~ ^[0-9]+$ ]] && [ "$DELETIONS" -ge "$DELETION_THRESHOLD" ]; then
                    ((DELETIONS_FOUND++))
                    
                    # Clear the progress line
                    echo -ne "\r\033[K"
                    
                    # Get the most deleted file
                    TOP_FILE=$(echo "$STATS" | gh api --input - --jq '.files | max_by(.deletions) | "\(.name) (-\(.deletions))"' 2>/dev/null)
                    FILE_COUNT=$(echo "$STATS" | gh api --input - --jq '.files | length' 2>/dev/null)
                    
                    # Print the deletion info
                    echo "🗑️  $DATE | $repo"
                    echo "   Commit: $SHA"
                    echo "   Deleted: $DELETIONS lines across $FILE_COUNT files"
                    echo "   Largest: $TOP_FILE"
                    echo "   Message: $MESSAGE"
                    echo ""
                fi
            fi
        done <<< "$COMMITS_DATA"
    fi
done

# Clear the progress line
echo -ne "\r\033[K"

# Final summary
echo "================================================"
echo "✅ Analysis complete!"
echo ""
echo "📊 Summary:"
echo "   - Repositories checked: $REPOS_CHECKED"
echo "   - Large deletions found: $DELETIONS_FOUND"
echo "   - Period: Last $DAYS days"
echo "   - Threshold: $DELETION_THRESHOLD+ lines"

if [ $DELETIONS_FOUND -eq 0 ]; then
    echo ""
    echo "No large-scale deletions found in the last $DAYS days."
fi