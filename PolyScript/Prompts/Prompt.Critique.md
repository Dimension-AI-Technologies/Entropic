# Constructive Criticism and Plan Remediation Prompt

## Purpose
Force the coding agent to analyze its work against actual code, find gaps between claims and reality, then update project plans with specific fixes.

## Template

```
You declared work complete. Now audit your claims against the actual codebase. Find every gap between what you claimed and what exists.

**AUDIT REQUIREMENTS:**

## 1. Verify Your Claims
Check the codebase systematically:

- **Find claimed implementations** - do they exist and work?
- **Test integration points** - are components connected and functional?
- **Match against requirements** - what percentage actually works?
- **Run the features** - do they perform as claimed?
- **Check configuration** - can users deploy and use this?

## 2. Criticize Your Work
Compare claims to reality:

- **Claimed vs actual** - list specific discrepancies
- **Critical gaps** - what major pieces are missing?
- **False success signals** - where did "compiles" become "works"?
- **Broken connections** - which integrations fail?
- **Skipped validation** - what testing was omitted?
- **User impact** - what happens when someone tries to use this?

## 3. Find Missing Pieces
Categorize gaps:

- **Exists but broken** - implemented incorrectly
- **Isolated components** - built but not connected
- **No testing** - functionality unverified
- **Wrong configuration** - not production-ready
- **Poor documentation** - users cannot operate

## 4. Fix the Plan
Update the project plan with specific remediation:

- **Add phases** for major missing components
- **Break down tasks** into concrete, measurable steps
- **Estimate time** for each fix
- **Set priorities** - critical vs optional
- **Define success** - clear completion criteria
- **Include testing** for every component

## 5. Update Status
Correct project documentation:

- **Fix completion percentages** based on actual functionality
- **Update version status** in all relevant files
- **Revise success criteria** to match requirements
- **Document limitations** and known issues

## 6. Request Human Approval
After completing analysis and updates:

```
My audit found [X] gaps between claims and reality. The project requires [Y] additional phases with [Z] hours of work to deliver the claimed functionality.

Updated plan includes:
- [List new phases]
- [Critical fixes needed]
- [Updated timeline]

Should I execute Prompt.Continue.md to complete this work?

Options:
- YES: Run the updated plan immediately
- NO: Review my analysis before proceeding  
- MODIFY: Change the plan before execution
```

**STANDARDS:**

- **Verify everything** - check every claim against code
- **Be specific** - name files, functions, missing connections
- **Think like a user** - what breaks when they try this?
- **Focus on impact** - how do gaps affect the project?
- **Make plans actionable** - every task must be concrete and measurable

Never defend previous claims. Find problems and fix them.
```

## Usage
- **When**: After claiming completion or significant progress
- **Trigger**: Before marking milestones complete
- **Scope**: Any substantial implementation work
- **Output**: Updated plans with specific remediation tasks

## Expected Results
1. **Honest assessment** of actual vs claimed completion
2. **Specific gap identification** with evidence
3. **Updated project plans** with remedial phases
4. **Corrected status** reflecting true progress
5. **Human approval gate** before additional work