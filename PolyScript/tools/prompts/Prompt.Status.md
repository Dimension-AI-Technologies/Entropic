# Project Status Review and PMO Update Prompt

## Purpose
Systematically review the project's design documentation and plans, assess the current codebase implementation against these specifications, update the PMO status grid, and provide a comprehensive status report.

## Tone and Approach
Use a measured, sober and constructively critical tone throughout this status review. Avoid salesman language, advertising speak, hype, pump, or exaggerated claims. Focus on factual assessment, evidence-based analysis, and practical recommendations. Be direct about issues without sugar-coating problems.

## Instructions

### Phase 1: Documentation Review
1. **Review Design Documentation**
   - Read all documents in design/architecture directories
   - Focus on:
     - Architecture documents
     - Component specifications
     - Design decisions (ADRs if present)
     - Technical requirements
   - Extract key design principles and architectural goals

2. **Review Project Plans**
   - Read all planning documents
   - Identify:
     - Active plans and their phases
     - Completed milestones
     - Pending deliverables
     - Timeline commitments

3. **Review Current PMO Status**
   - Locate the most recent PMO/status files
   - Understand the current status tracking format
   - Note any existing issues or blockers

### Phase 2: Codebase Assessment
1. **Structural Compliance**
   - Verify project structure matches design specifications
   - Check that all required components exist
   - Validate code organization and modularity

2. **Implementation Review**
   - Assess each major component against its specification
   - List all primary components/modules
   - Check interface/contract implementations match design
   - Verify architectural patterns are followed

3. **Test Coverage Assessment**
   - Review test project structure
   - Check test coverage for each component
   - Identify missing test scenarios

4. **Build and Quality Status**
   - **CRITICAL**: Code is NOT production-ready until:
     - ✅ Build completes successfully with ZERO errors
     - ✅ All unit tests pass (100% pass rate)
     - ✅ All integration tests pass
     - ⚠️  Warnings should be minimal and documented
   - Current build status (errors/warnings)
   - Code quality metrics if available
   - Technical debt indicators
   - **Note**: Unbuildable code is not runnable; test failures indicate substandard quality

### Phase 3: Gap Analysis
1. **Design vs Implementation Gaps**
   - List features specified but not implemented
   - Identify implemented features not in design
   - Note architectural deviations

2. **Plan vs Progress Gaps**
   - Compare planned milestones with actual progress
   - Identify delayed or blocked items
   - Note any scope changes

3. **Risk Assessment**
   - Technical risks
   - Timeline risks
   - Quality risks

### Phase 4: PMO Status Update
1. **Update Status Grid**
   Format example:
   ```markdown
   | Component | Design Status | Implementation | Tests | Integration | Notes |
   |-----------|--------------|----------------|-------|-------------|-------|
   | Component | ✅/🟡/❌ | % Complete | ✅/🟡/❌ | ✅/🟡/❌ | Issues |
   ```

2. **Status Legend**
   - ✅ Complete/Good
   - 🟡 In Progress/Warning
   - ❌ Not Started/Blocked
   - 🔄 Refactoring Required

3. **Include Metrics**
   - Lines of code per component
   - Test count and coverage
   - Open issues/TODOs
   - Build time metrics

### Phase 5: Status Report Generation
1. **Create Status Report**
   - Filename: `Status.[ProjectName].YYYYMMDD_HHMMSS.md`
   - Use UTC timestamp

2. **Report Structure**
   ```markdown
   # Project Status Report - [Project Name]
   **Date:** [UTC Timestamp]
   **Reviewer:** [Name/Role]

   ## Executive Summary
   [Brief overview of project health and key findings]

   ## Design Compliance Assessment
   ### Architectural Alignment
   [How well does implementation match design?]

   ### Component Status
   [PMO Status Grid]

   ### Gap Analysis
   [Key gaps between design and implementation]

   ## Plan Progress Assessment
   ### Active Plans Status
   [Progress on each active plan]

   ### Milestone Achievement
   [Completed vs pending milestones]

   ### Timeline Analysis
   [On track/delayed/blocked items]

   ## Technical Health
   ### Build Status
   [Current build health]
   - **Build Result**: ✅ Success / ❌ Failure
   - **Error Count**: X errors (MUST be 0 for production)
   - **Warning Count**: Y warnings
   - **Build Time**: Z seconds

   ### Test Coverage
   [Testing status and gaps]
   - **Unit Tests**: X/Y passing (MUST be 100% for production)
   - **Integration Tests**: X/Y passing (MUST be 100% for production)
   - **Code Coverage**: X% (target: >80%)
   - **Missing Test Areas**: [List components without adequate tests]

   ### Technical Debt
   [Identified debt and risks]
   - **Code Quality Issues**: [List any code that doesn't meet standards]
   - **Test Debt**: [Tests that need to be written/fixed]
   - **Build Issues**: [Any build configuration problems]

   ## Critical Issues
   [Blocking issues requiring immediate attention]

   ## Recommendations
   [Prioritized list of recommended actions]

   ## Next Steps
   [Concrete next actions with ownership]
   ```

### Phase 6: User Communication
1. **Prepare Summary for User**
   - Highlight critical findings
   - Focus on actionable items
   - Be concise but comprehensive

2. **Structure User Report**
   ```
   PROJECT STATUS SUMMARY
   ===================
   Overall Health: [Good/Warning/Critical]
   
   Key Findings:
   - [Finding 1]
   - [Finding 2]
   
   Critical Actions Required:
   1. [Action 1]
   2. [Action 2]
   
   Next Steps:
   - [Immediate priority]
   - [Short-term priority]
   - [Long-term consideration]
   ```

## Execution Checklist
- [ ] Read all design documents
- [ ] Read all active plans
- [ ] Review current PMO status
- [ ] Assess codebase structure
- [ ] Check component implementations
- [ ] Evaluate test coverage
- [ ] Identify gaps and risks
- [ ] Update PMO status grid
- [ ] Generate status report
- [ ] Communicate findings to user

## Key Questions to Answer
1. Is the implementation faithful to the design?
2. Are we on track with our plans?
3. What are the biggest risks to project success?
4. What should be the immediate priorities?
5. Are there any architectural concerns that need addressing?

## Output Artifacts
1. Updated PMO status grid (in status report)
2. Status report file: `Status.Dimension.Transpiler.[timestamp].md`
3. User-facing summary in chat

## Post-Completion Recap (MANDATORY)
After completing the status review (whether successful or with issues), provide a concise summary:

**Recent Work Recap:**
- Briefly summarize what was just accomplished in this status review
- Highlight key findings from the project assessment
- Note any critical issues discovered and their resolutions

**Current Project Status:**
- Overall project health based on the status review
- Current version status and active version-numbered plans
- Any outstanding blockers or risks identified

**Immediate Next Steps:**
- 2-3 highest priority items based on the status assessment
- Any urgent issues requiring immediate attention
- Planned next development phases or milestones

Use a measured, sober and constructively critical tone throughout this recap. Avoid salesman language, advertising speak, hype, pump, or exaggerated claims. Focus on factual assessment and practical next steps.

Keep this recap concise (3-5 bullet points each section) but informative for project continuity.