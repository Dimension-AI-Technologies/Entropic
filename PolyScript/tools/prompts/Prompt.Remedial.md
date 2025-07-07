# Prompt.Remedial.md

Read your previous response. Identify what needs fixing. Create and execute a remedial plan.

## Step 1: Review Your Previous Response
Analyze what you just wrote. Identify:
- What went wrong
- Which files are affected
- Dependencies between problems
- Priority (Critical, Important, Optional)

## Step 2: Build Your Remedial Plan

Create a plan using this format:

```markdown
# Remedial Plan: [Brief Description] - Version [YYYY.MM.DD.HHMM]

## Status Key
* 🚫 **Blocked**: Blocked/Cannot proceed
* 🔴 **Pending**: Not started
* 🟠 **Doing**: In progress  
* 🟡 **Testing**: Testing/final checks
* 🟢 **Done**: Completed
* ⚪ **Skipped**: Redundant/No longer needed

## Overall Goal
[State the main objective of this remedial plan]

## Critical Issues Identified
[List the key problems from the criticism]

---

### Phase 1: Issue Assessment & Preparation
*Understand and prepare for remediation*

1.1. 🔴 **Phase Gate**: Review all criticism and validate understanding (Est: 15min, Act: )
1.2. 🔴 Build impact assessment for each identified issue (Est: 30min, Act: )
    1.2.1. 🔴 Map affected files and components (Est: 10min, Act: )
    1.2.2. 🔴 Identify dependency chains (Est: 10min, Act: )
    1.2.3. 🔴 Categorize by severity (Critical/Important/Optional) (Est: 10min, Act: )
1.3. 🔴 Create execution priority order (Est: 15min, Act: )
1.4. 🔴 **Phase Completion Drill**
    1.4.1. 🔴 Verify all issues are categorized and prioritized (Est: 5min, Act: )
    1.4.2. 🔴 Update plan status and proceed to Phase 2 (Est: 5min, Act: )

### Phase 2: Critical Issue Resolution
*Address Critical severity issues first*

2.1. 🔴 **Phase Gate**: Ensure Phase 1 is 🟢 Done (Est: 5min, Act: )
2.2. 🔴 [Critical Issue 1 - Specific description] (Est: [time], Act: )
    2.2.1. 🔴 [Specific remediation step] (Est: [time], Act: )
    2.2.2. 🔴 [Verification step] (Est: [time], Act: )
2.3. 🔴 [Critical Issue 2 - if applicable] (Est: [time], Act: )
2.4. 🔴 **Phase Completion Drill**
    2.4.1. 🔴 Build/compile to verify critical fixes (Est: 10min, Act: )
    2.4.2. 🔴 Run tests affected by critical changes (Est: 15min, Act: )
    2.4.3. 🔴 Update plan status (Est: 5min, Act: )

### Phase 3: Important Issue Resolution  
*Address Important severity issues*

3.1. 🔴 **Phase Gate**: Ensure Phase 2 is 🟢 Done (Est: 5min, Act: )
3.2. 🔴 [Important Issue 1] (Est: [time], Act: )
3.3. 🔴 [Important Issue 2 - if applicable] (Est: [time], Act: )
3.4. 🔴 **Phase Completion Drill**
    3.4.1. 🔴 Build/compile after important fixes (Est: 10min, Act: )
    3.4.2. 🔴 Run comprehensive test suite (Est: 20min, Act: )
    3.4.3. 🔴 Update plan status (Est: 5min, Act: )

### Phase 4: Optional Improvements & Finalization
*Address Optional items and finalize*

4.1. 🔴 **Phase Gate**: Ensure Phase 3 is 🟢 Done (Est: 5min, Act: )
4.2. 🔴 [Optional Issue 1 - if time permits] (Est: [time], Act: )
4.3. 🔴 **Final Validation**
    4.3.1. 🔴 Full system build verification (Est: 15min, Act: )
    4.3.2. 🔴 Run complete test suite (Est: 30min, Act: )
    4.3.3. 🔴 Code formatting and cleanup (Est: 10min, Act: )
4.4. 🔴 **Phase Completion Drill**
    4.4.1. 🔴 Document lessons learned from this remediation (Est: 15min, Act: )
    4.4.2. 🔴 Update all status emojis to reflect completion (Est: 5min, Act: )
    4.4.3. 🔴 Prepare summary of remedial actions taken (Est: 10min, Act: )

---

## Plan Log / Change History
* [YYYY-MM-DD HH:MM]: Remedial plan created from criticism analysis
* [Add entries as plan evolves]
```

## Step 3: Execute the Plan

1. Work phases in order (1→2→3→4)
2. Complete each phase fully before moving on
3. Update emoji status as you progress (🔴→🟠→🟡→🟢)
4. Note actual time spent
5. Verify each phase gate before proceeding
6. Test and validate at each step

## Step 4: Adapt the Plan

**Few problems (1-2):** Combine phases 2-3
**Many problems (5+):** Split critical issues across phases
**Design problems:** Add Phase 0 for planning

## When You're Done

Stop when:
- All issues show 🟢 status
- System builds cleanly
- Tests pass
- Code meets standards

---

## Example Usage

Execute this prompt now. Start with Step 1.

## Post-Completion Recap (MANDATORY)
After completing the remedial work (whether successful or with remaining issues), provide a concise summary:

**Recent Work Recap:**
- Briefly summarize what was just accomplished in this remedial session
- Highlight key problems identified and fixes applied
- Note any systemic issues discovered and their resolutions

**Current Project Status:**
- System health after remedial fixes (build status, test results)
- Current version status and impact on active version-numbered plans
- Any remaining critical issues or technical debt

**Immediate Next Steps:**
- 2-3 highest priority items revealed by the remedial analysis
- Any urgent issues requiring immediate attention
- Planned next phase of quality improvements

Use a measured, sober and constructively critical tone throughout this recap. Avoid salesman language, advertising speak, hype, pump, or exaggerated claims. Focus on factual assessment and practical next steps.

Keep this recap concise (3-5 bullet points each section) but informative for project continuity.