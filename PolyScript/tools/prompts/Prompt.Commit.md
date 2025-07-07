# LLM Prompt for Progress Report and Git Commit

## Task
Create a comprehensive progress report detailing all work completed since the last progress report, then commit and push all changes to the repository.

## Instructions

1. **Find the most recent progress report**
   - Look for files matching pattern `Progress.*.md` or similar progress tracking files
   - Identify the most recent one by timestamp or version number

2. **Create new progress report**
   - File name: `Progress.{PROJECT_NAME}.{UTC_DATETIME}.md` where UTC_DATETIME is in format YYYYMMDD_HHMMSS
   - Include:
     - Executive summary of work completed
     - Detailed list of changes/fixes/features
     - Current build/test status
     - Any outstanding issues or blockers
     - Files modified/created/deleted
     - Next steps
   
   **IMPORTANT**: Before creating progress report and committing:
   - ✅ Ensure build completes with ZERO errors
   - ✅ Ensure all tests pass (100% pass rate)
   - ⚠️  Fix all issues before proceeding with commit
   
   **EXCEPTION**: You MAY commit non-building or non-testing code IF:
   - 🚨 You explicitly state in the progress report that code has build errors or test failures
   - 🚨 You include "WIP:" or "BROKEN:" prefix in commit message
   - 🚨 You list specific errors/failures in the commit body
   - 📝 Example: "WIP: partial implementation - 5 build errors, 12 test failures"
   - 🤝 This is ONLY for sharing code with other developers or machines

3. **Git operations**
   - Stage all changes: `git add -A`
   - Create descriptive commit message summarizing the work
   - Push to remote repository (if applicable)
   
   **IMPORTANT - GitHub File Size Limits:**
   If `git push` fails, check for GitHub file size limit violations:
   - Single files over 100MB are rejected by GitHub
   - Repository size over 1GB triggers warnings
   - If push fails with file size errors, DO NOT report this as a "timeout"
   - Alert the user specifically: "Git push failed due to GitHub file size limits. Files over 100MB detected: [list files]. These files must be removed or added to .gitignore before pushing."
   - Use `git ls-files --others --ignored --exclude-standard` to check ignored files
   - Use `find . -size +100M -not -path './.git/*'` to identify large files

4. **Post-Commit Recap** (MANDATORY)
   After completing git operations (whether successful or failed), provide a concise summary:
   
   **Recent Work Recap:**
   - Briefly summarize what was just accomplished in this session
   - Highlight key technical achievements or fixes
   - Note any issues encountered and their resolutions
   
   **Current Project Status:**
   - Overall build/test health status
   - Any outstanding issues or blockers
   - Current system state and capabilities
   
   **Immediate Next Steps:**
   - 2-3 highest priority items for next development session
   - Any urgent issues that need attention
   - Planned next phase of work based on active plans
   
   Use a measured, sober and constructively critical tone throughout this recap. Avoid salesman language, advertising speak, hype, pump, or exaggerated claims. Focus on factual assessment and practical next steps.
   
   Keep this recap concise (3-5 bullet points each section) but informative for project continuity.

## Progress Report Template

```markdown
# Progress Update - {PROJECT_NAME}
**Date:** {UTC_DATE_TIME}
**Previous Update:** {PREVIOUS_UPDATE_DATE}

## Executive Summary
{Brief overview of what was accomplished}

## Detailed Progress

### Completed Tasks
- {Task 1 with details}
- {Task 2 with details}
- etc.

### Build/Test Status
**PRODUCTION READINESS CRITERIA:**
- Build Status: ✅ Success with 0 errors (REQUIRED)
- Unit Tests: {X}/{Y} passing (MUST be 100%)
- Integration Tests: {X}/{Y} passing (MUST be 100%)
- Warnings: {Count} (should be minimal and justified)

**Component Status:**
- Component 1: ✅/❌ Status
- Component 2: ✅/❌ Status
- etc.

**Note**: Code is ONLY production-ready when build succeeds AND all tests pass

### Issues Encountered
- {Issue 1 and resolution/status}
- {Issue 2 and resolution/status}

### Files Changed
#### Added
- {New files}

#### Modified
- {Changed files}

#### Deleted
- {Removed files}

## Outstanding Issues
- {Unresolved issue 1}
- {Unresolved issue 2}

## Current Plans and Todos Status

### Active Plans
- {Plan 1 name and current phase/status}
- {Plan 2 name and current phase/status}
- etc.

### Todo List Summary
- **Completed:** {X} of {Y} tasks
- **In Progress:** {List of current in-progress tasks}
- **Pending High Priority:** {List of pending high priority tasks}
- **Pending Medium Priority:** {Count of medium priority tasks}
- **Pending Low Priority:** {Count of low priority tasks}

### Key In-Progress Items
- {Current task 1 with brief status}
- {Current task 2 with brief status}

## Next Steps
- {Priority 1 - should align with current todos}
- {Priority 2 - should align with current todos}
- {Additional priorities based on active plans}
```

## Commit Message Format
```
feat/fix/chore: {brief description}

- {Detail 1}
- {Detail 2}
- {Detail 3}

{Any additional context}
```