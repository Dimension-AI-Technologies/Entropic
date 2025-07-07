# Continue Implementation Prompt

## Purpose
Resume and complete project implementation systematically. Use when continuing work from a previous session.

## Template

```
Continue project development. Use SequentialThinking MCP to manage execution to completion.

**MCP TOOLS REQUIRED:**
- **SequentialThinking MCP**: Manage plan execution with subtasks for orthogonal work
- **Context7 MCP**: Get latest documentation and best practices

**Execute these steps in order:**

## 1. Load Current Plan
- Find active plan file (Plan.*.md or similar)
- Check phase status (🔴 Not Started, 🟡 In Progress, 🟢 Complete)
- Use TodoRead to see existing tasks
- Use TodoWrite to add incomplete plan items

## 2. Review and Constructively Criticize
**Critically examine recent work:**
- Modified files and git status - What could be better?
- Plan completion status - Where did we fall short?
- Previous progress reports - What patterns of issues emerge?

**Identify improvement opportunities:**
- Incomplete features - Why weren't they finished?
- Technical debt - What shortcuts were taken?
- Code quality issues - Where did standards slip?
- Missing error handling - What edge cases were ignored?
- Inadequate tests - What scenarios lack coverage?
- Architecture flaws - What design decisions need revisiting?

**Challenge assumptions:**
- Is this the right approach?
- Are we solving the real problem?
- Could this be simpler?
- What will break at scale?

**Update todos with critical eye:**
- Add missing tasks that were overlooked
- Fix priorities based on real impact
- Break down complex work that was underestimated
- Add quality improvements to prevent future issues

## 3. Execute with SequentialThinking MCP
**Use SequentialThinking MCP to manage the entire plan execution:**
- Launch the plan as main task with all phases
- Create subtasks ONLY for orthogonal work (different files, separate components)
- Never create subtasks for work that edits the same code or documents
- Process todos by dependency order
- Update status based on actual progress:
  - 🔴 → 🟡 when starting work
  - 🟡 → 🟢 only when actually complete and tested
- Finish each phase completely before starting the next

**Use Context7 MCP for documentation:**
- Query latest best practices for your technology stack
- Get current documentation for libraries and frameworks
- Reference latest coding standards and patterns

## 4. Ensure Quality
**After each phase:**
- Build/compile the project
- Fix ALL errors immediately (0 errors required)
- Run ALL tests (unit and integration)
- Fix ALL test failures (100% pass rate required)
- Verify completeness

**PRODUCTION READINESS REQUIREMENTS:**
- ✅ Build MUST succeed with ZERO errors
- ✅ ALL tests MUST pass (100% pass rate)
- ⚠️  Warnings should be minimal and justified
- ❌ Unbuildable code is NOT runnable
- ❌ Test failures indicate SUBSTANDARD quality
- 🚫 DO NOT proceed to next phase with build errors or test failures

## 5. Document Progress with Critical Honesty
**Only when phase is actually complete:**
- Build succeeds with ZERO errors ✅
- ALL tests pass (100% pass rate) ✅
- Test all phase functionality works
- Verify all phase requirements met
- THEN update plan status to 🟢
- Record actual vs estimated time (be honest about overruns)
- Note lessons learned (especially failures)

**Apply constructive criticism to progress:**
- What took longer than expected? Why?
- Where did quality suffer under time pressure?
- What technical debt was introduced?
- Which assumptions proved wrong?
- What should be refactored immediately?

**Only when entire plan is actually complete:**
- Build succeeds with ZERO errors ✅
- ALL tests pass (100% pass rate) ✅
- Test all functionality works end-to-end
- Verify all requirements fully implemented
- Critically assess the implementation quality
- Document areas needing improvement
- THEN run commit prompt if available
- Generate progress report with honest assessment

**NEVER mark as complete if:**
- Build has ANY errors ❌
- ANY tests are failing ❌
- Code doesn't compile/run ❌
- Features don't work as designed ❌
- Quality is below acceptable standards ❌

**Rules:**

**Never stop for:**
- Build errors (fix them)
- Missing code (write it)
- Test failures (fix them)
- Config issues (solve them)
- Documentation gaps (fill them)

**Only stop for:**
- Architectural decisions needing human input
- Incomplete/contradictory plans
- Missing business requirements
- Unavailable dependencies

**Work standards:**
- Finish each task completely
- Update status continuously
- Keep plan synchronized
- Maintain code quality
- Preserve backward compatibility
- ALWAYS ensure:
  - Build succeeds with 0 errors
  - All tests pass (100%)
  - Code is production-ready
  - No technical debt accumulation

Complete the plan systematically. Fix problems and continue.

**REMEMBER**: Production-ready means buildable and testable!
```

## Post-Completion Recap (MANDATORY)
After completing the implementation work (whether successful or with issues), provide a concise summary:

**Recent Work Recap:**
- Briefly summarize what was just accomplished in this development session
- Highlight key technical achievements or implementations completed
- Note any issues encountered and their resolutions

**Current Project Status:**
- Overall build/test health status after the work
- Current version status and progress on active version-numbered plans
- Any outstanding blockers or technical debt introduced

**Immediate Next Steps:**
- 2-3 highest priority items for next development session
- Any urgent technical issues requiring attention
- Planned next phase of work based on active plans

Use a measured, sober and constructively critical tone throughout this recap. Avoid salesman language, advertising speak, hype, pump, or exaggerated claims. Focus on factual assessment and practical next steps.

Keep this recap concise (3-5 bullet points each section) but informative for project continuity.

## Usage
- **When**: Resuming incomplete work
- **Needs**: Active plan file
- **Result**: Complete implementation with clean build

## Features
- Step-by-step approach
- Critical self-review
- Quality focus
- Autonomous operation