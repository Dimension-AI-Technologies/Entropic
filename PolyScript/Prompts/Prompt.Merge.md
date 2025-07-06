# Prompt.Merge.md

This prompt provides systematic instructions for merging a feature branch into the main branch, handling any merge conflicts or issues, and cleaning up the branch afterward.

## Branch Merge Instructions

### 1. Pre-Merge Validation
Before attempting to merge, verify the current state:

```bash
# Check current branch status
git status
git log --oneline -5

# Ensure we're on the correct feature branch (not main)
git branch --show-current

# Verify main branch is up to date
git fetch origin
git status
```

### 2. Switch to Main and Attempt Merge
Switch to the main branch and attempt the merge:

```bash
# Switch to main branch
git checkout main

# Pull latest changes from remote
git pull origin main

# Attempt to merge the feature branch
git merge <feature-branch-name>
```

### 3. Handle Merge Conflicts (if any)
If merge conflicts occur:

```bash
# Check which files have conflicts
git status

# For each conflicted file:
# - Open the file and resolve conflicts manually
# - Remove conflict markers (<<<<<<, ======, >>>>>>)
# - Keep the desired changes from both branches as appropriate
# - Stage the resolved file: git add <filename>

# After resolving all conflicts, complete the merge
git commit
```

### 4. Post-Merge Verification
After successful merge, verify the system is still working:

```bash
# Run build to ensure no issues
dotnet build

# Run critical tests if available
dotnet test

# Check git log to confirm merge
git log --oneline -10
```

### 5. Branch Cleanup (if safe)
Only delete the feature branch if:
- Merge was successful
- No immediate need to reference the branch
- All changes are properly integrated

```bash
# Delete local feature branch
git branch -d <feature-branch-name>

# Delete remote feature branch (if it exists and is safe to remove)
git push origin --delete <feature-branch-name>
```

### 6. Final Status Check
Confirm the repository is in a clean state:

```bash
# Verify we're on main with no uncommitted changes
git status
git branch --show-current

# Push the merged changes to remote
git push origin main
```

## Troubleshooting Common Issues

### Merge Conflicts
- Take time to understand what each side of the conflict represents
- When in doubt, preserve functionality over style preferences
- Test the resolution before committing
- Consider using `git mergetool` for complex conflicts

### Build Failures After Merge
- Run `dotnet clean` followed by `dotnet build`
- Check for missing dependencies or version mismatches
- Verify all project references are intact
- Consider reverting the merge if issues are severe: `git reset --hard HEAD~1`

### Branch Deletion Safety
Only delete branches when:
- The merge is confirmed successful
- All CI/CD pipelines pass (if applicable)
- No immediate plans to continue development on that branch
- The branch represents completed work, not work-in-progress

## Post-Completion Recap (MANDATORY)
After completing the merge operation (whether successful or with remaining issues), provide a concise summary:

**Recent Work Recap:**
- Briefly summarize what branch was merged and what changes it contained
- Highlight any merge conflicts encountered and how they were resolved
- Note the success/failure status of the merge operation

**Current Project Status:**
- Confirm main branch status and build health after merge
- Note any system functionality verified post-merge
- Highlight any cleanup actions taken (branch deletion, etc.)

**Immediate Next Steps:**
- Any follow-up tasks revealed by the merge process
- Next development priorities on the main branch
- Any issues requiring immediate attention post-merge

Use a measured, sober and constructively critical tone throughout this recap. Avoid salesman language, advertising speak, hype, pump, or exaggerated claims. Focus on factual assessment and practical next steps.

Keep this recap concise (3-5 bullet points each section) but informative for project continuity.