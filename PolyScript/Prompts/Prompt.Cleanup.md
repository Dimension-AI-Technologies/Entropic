# Prompt.Cleanup.md

## Purpose
This prompt provides systematic instructions for auditing a codebase against its documented structure and organizing files into their proper locations, with special emphasis on keeping the root directory clean.

## Context
Well-organized projects follow a defined directory structure that should be documented in the project's architecture or design documentation. Files should be organized according to this structure to maintain project clarity and developer experience.

## Instructions

### Phase 1: Audit Current State
1. Read the project's structure documentation (commonly found in docs/architecture or similar)
2. List all files in the root directory that don't belong according to the structure document
3. Identify any directories that are not documented in the structure
4. Create a list of files that need to be moved or organized

### Phase 2: Categorize Files for Cleanup
Categorize root directory files into these groups:

#### A. Core Project Files (Should remain in root)
- README.md
- License/Legal files (LICENSE, LEGAL.md, etc.)
- CHANGELOG.md or similar release notes
- Build configuration files (based on language/framework)
- Package manager configs (package.json, pom.xml, NuGet.config, etc.)
- .gitignore
- .gitattributes
- Editor configs (.editorconfig, .prettierrc, etc.)
- CI/CD configs (.github/, .gitlab-ci.yml, etc.)
- Primary project/solution files

#### B. Temporary/Generated Files (Should be removed or gitignored)
- Build output files (*.log, *_output*.txt)
- Analysis output files (all_types.txt, duplicate_*.txt, type_*.txt)
- Backup files (*.backup)
- Any other generated files

#### C. Progress/Status Files (Should move to /Docs/Plans/ or appropriate location)
- Progress.*.md files
- Prompt.*.md files (except core prompts)

#### D. Documentation Files (Should move to /Docs/)
- SOLUTION-*.md files
- Any other documentation that belongs in /Docs/

### Phase 3: Execute Cleanup
1. Create any missing directories as needed
2. Move files to their appropriate locations based on categorization
3. Update .gitignore to exclude temporary/generated files
4. Ensure all moved files maintain their git history

### Phase 4: Verify Structure
1. Compare the cleaned structure against Structure.Dimension.Transpiler.md
2. Ensure no essential files were accidentally moved
3. Verify the project still builds and tests pass
4. Document any deviations from the structure document with justification

## Common File Movement Patterns

### Temporary/Generated Files → Delete or .gitignore
- Build output logs
- Analysis output files
- Temporary data files
- Backup files (*.backup, *.bak)
- Generated reports (unless needed for tracking)

### Progress/Status Files → Documentation directories
- Progress tracking files
- Status reports
- Sprint/iteration documents

### Development Prompts → Documentation or tools directories
- LLM prompts
- Development guides
- Quick reference documents

### Documentation Files → Appropriate docs subdirectory
- Architecture documents
- Design guides
- Development notes

### Build Artifacts → Appropriate build/output directories
- Compiled outputs
- Package files
- Distribution files

## Execution Steps

1. **Create Required Directories**:
   Create any missing directories based on your project structure

2. **Move Files to Correct Locations**:
   Execute the file movements based on categorization

3. **Update .gitignore**:
   Add patterns for temporary/generated files

4. **Clean Working Directory**:
   Remove all temporary/generated files

5. **Verify Project Integrity**:
   - Run project build commands
   - Run basic tests to ensure nothing is broken
   - Check version control status to ensure moves are tracked

## Success Criteria
- Root directory contains only essential project files as defined in Phase 2, Section A
- All temporary/generated files are removed or ignored
- All documentation is properly organized
- Project builds and tests pass after cleanup
- Version control history is preserved for moved files
- Structure matches documented specifications

## Notes
- Use version control move commands (e.g., `git mv`) to preserve history
- Create a backup before major reorganization
- Document any files that don't fit the defined categories for manual review
- If structure documentation needs updates based on current project needs, document required changes

## Post-Completion Recap (MANDATORY)
After completing the codebase cleanup (whether successful or with remaining issues), provide a concise summary:

**Recent Work Recap:**
- Briefly summarize what was just accomplished in this cleanup session
- Highlight key organizational improvements and files restructured
- Note any structure compliance issues resolved

**Current Project Status:**
- Project organization health (root directory cleanliness, structure compliance)
- Current version status and impact on active version-numbered plans
- Any remaining organizational debt or structure violations

**Immediate Next Steps:**
- 2-3 highest priority remaining cleanup tasks
- Any urgent structure violations requiring attention
- Planned next phase of project organization improvements

Use a measured, sober and constructively critical tone throughout this recap. Avoid salesman language, advertising speak, hype, pump, or exaggerated claims. Focus on factual assessment and practical next steps.

Keep this recap concise (3-5 bullet points each section) but informative for project continuity.