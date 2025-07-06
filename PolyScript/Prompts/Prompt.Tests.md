# Test Suite Health Check and Repair Prompt

## Purpose
Systematically diagnose, repair, and report on the test suite health with a focus on achieving 100% test compilation and execution. Apply constructive criticism to identify systemic issues and prevent future test degradation.

## Template

```
Execute comprehensive test suite analysis and repair. Use TodoWrite to track all failing tests.

**Execute these steps in order:**

## Phase 1: Test Compilation Check
1. **Build all test projects**
   - Run: `dotnet build *.Tests.*.csproj --no-incremental`
   - Document ANY compilation errors
   - Fix compilation errors IMMEDIATELY (0 errors required)
   - Use TodoWrite to track each compilation error

2. **Verify test discovery**
   - Run: `dotnet test --list-tests`
   - Identify projects with 0 tests discovered
   - Document discovery issues
   - Add to TODO list for investigation

## Phase 2: Test Execution Analysis
1. **Run tests with detailed output**
   ```bash
   dotnet test --no-build --logger:"console;verbosity=detailed" > test-output.log 2>&1
   ```
   - Capture FULL error messages
   - Identify patterns in failures
   - Group failures by root cause

2. **Categorize test failures**
   - Compilation failures
   - Discovery failures (0 tests found)
   - Setup/teardown failures
   - Assertion failures
   - Infrastructure failures (timeouts, file access)
   - Mock/dependency failures

3. **Create comprehensive TODO list**
   Format each TODO as:
   ```
   {
     "content": "[Component] Fix {specific test or issue} - {brief description}",
     "status": "pending",
     "priority": "high",
     "id": "test-{component}-{number}"
   }
   ```

## Phase 3: Systematic Repair
1. **Fix in priority order**
   - Compilation errors first
   - Infrastructure/setup issues second
   - Mock/dependency issues third
   - Individual test assertions last

2. **Common fixes to apply**
   - Missing interface registrations
   - Incorrect mock setups
   - Missing test data files
   - Async/await issues
   - Null reference exceptions
   - File path issues (use TestContext.CurrentDirectory)

3. **Verify each fix**
   - Run affected test immediately
   - Update TODO status
   - Document fix pattern for similar issues

## Phase 4: Test Infrastructure Improvements
1. **Add missing test helpers**
   - Create test data builders
   - Add mock factories
   - Implement test fixtures

2. **Improve test isolation**
   - Ensure no shared state
   - Clean up resources in Dispose
   - Use unique test data

3. **Enhanced error reporting**
   - Add descriptive assertion messages
   - Include context in test names
   - Log test execution steps

## Phase 5: Constructive Criticism Report
Create `Status.Tests.{UTC_DATETIME}.md` with:

### Report Structure
```markdown
# Test Suite Status Report
**Date:** {UTC_TIMESTAMP}
**Reviewer:** Test Infrastructure Analysis

## Executive Summary
{Brief overview focusing on systemic issues, not just numbers}

## Test Statistics
### Discovery Phase
- Total test projects: {count}
- Projects with 0 tests: {count} ({percentage}%)
- Total tests discovered: {count}
- Tests per component: {breakdown}

### Compilation Phase
- Compilation errors found: {count}
- Projects failing to build: {list}
- Root causes: {categorized list}

### Execution Phase
- Tests attempted: {count}
- Tests passed: {count} ({percentage}%)
- Tests failed: {count} ({percentage}%)
- Tests skipped: {count}
- Tests not running: {count} (infrastructure failures)

## Systemic Issues Identified
### Critical Weaknesses
1. {Issue with impact assessment}
2. {Issue with root cause}
3. {Issue with prevention strategy}

### Architectural Concerns
- {Coupling issues}
- {Testability problems}
- {Missing abstractions}

### Technical Debt
- {Accumulated shortcuts}
- {Missing test coverage}
- {Fragile test dependencies}

## Failure Analysis
### By Category
| Category | Count | Percentage | Primary Cause |
|----------|-------|------------|---------------|
| Mocking | X | Y% | Missing interfaces |
| Setup | X | Y% | DI configuration |
| Assertions | X | Y% | Changed behavior |
| Infrastructure | X | Y% | File paths |

### By Component
| Component | Total | Passed | Failed | Coverage | Health |
|-----------|-------|--------|--------|----------|---------|
| {Name} | X | Y | Z | A% | 🟢/🟡/🔴 |

## Root Cause Analysis
### Why did tests break?
1. {Honest assessment}
2. {No sugar-coating}
3. {Actionable insights}

### What patterns emerge?
- {Repeated failures}
- {Common mistakes}
- {Architectural flaws}

### How to prevent recurrence?
- {Concrete steps}
- {Process improvements}
- {Tooling needs}

## Repair Summary
### Fixes Applied
- {Category}: {count} fixes
  - {Specific pattern used}
  - {Reusable solution}

### Outstanding Issues
- {Unfixed problems}
- {Blocked by architecture}
- {Need design changes}

## Recommendations
### Immediate Actions
1. {Most critical fix}
2. {Quick wins}
3. {Blocking issues}

### Long-term Improvements
1. {Architectural changes}
2. {Process improvements}
3. {Tooling investments}

### Test Quality Metrics
- Line coverage: {current}% → {target}%
- Branch coverage: {current}% → {target}%
- Mutation score: {if available}
- Cyclomatic complexity of tests: {assessment}

## Lessons Learned
### What went wrong?
- {Honest mistakes}
- {Process failures}
- {Technical oversights}

### What worked well?
- {Successful patterns}
- {Good practices observed}
- {Effective solutions}

### Future Prevention
- {Specific guidelines}
- {Automation opportunities}
- {Review checkpoints}
```

## Phase 6: Final Verification
1. **Run full test suite**
   ```bash
   dotnet test --logger:"trx;LogFileName=final-test-run.trx"
   ```

2. **Verify 100% compilation**
   - ALL test projects build
   - Zero compilation errors
   - Zero compilation warnings

3. **Document final state**
   - Update all TODOs
   - Note remaining failures
   - Plan next steps

## Rules
- **Zero tolerance for compilation errors**
- **Every test must at least run** (even if it fails)
- **Document WHY tests failed**, not just that they failed
- **Fix patterns, not just symptoms**
- **Be brutally honest** about quality issues
- **Provide actionable solutions**, not just criticism

## Success Criteria
- ✅ 100% of test projects compile
- ✅ 100% of tests are discoverable
- ✅ 100% of tests execute (pass or fail)
- ✅ Comprehensive TODO list created
- ✅ Detailed status report with actionable insights
- ✅ Clear plan for achieving 100% pass rate
```

## Post-Completion Recap (MANDATORY)
After completing the test suite repair (whether successful or with remaining issues), provide a concise summary:

**Recent Work Recap:**
- Briefly summarize what was just accomplished in this test repair session
- Highlight key fixes applied and test health improvements
- Note any systemic issues discovered and their resolutions

**Current Project Status:**
- Test suite health status (compilation, discovery, execution percentages)
- Current version status and impact on active version-numbered plans
- Any remaining test failures or infrastructure issues

**Immediate Next Steps:**
- 2-3 highest priority items for achieving 100% test health
- Any urgent test infrastructure issues requiring attention
- Planned next phase of test quality improvements

Use a measured, sober and constructively critical tone throughout this recap. Avoid salesman language, advertising speak, hype, pump, or exaggerated claims. Focus on factual assessment and practical next steps.

Keep this recap concise (3-5 bullet points each section) but informative for project continuity.

## Usage
- **When**: Test suite is broken or unhealthy
- **Needs**: Full solution access, TodoWrite tool
- **Result**: Healthy test suite with clear status

## Features
- Systematic approach to test repair
- Root cause analysis focus
- Constructive criticism mindset
- Actionable improvement plans