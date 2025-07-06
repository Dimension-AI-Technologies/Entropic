# Requirements Audit and Compliance Verification Prompt

## Purpose
Systematically audit the project requirements document against the vision and context statements to ensure alignment, completeness, and consistency. This prompt enables comprehensive verification that requirements accurately reflect the project's strategic intent and operational context.

## Tone and Approach
Use a measured, sober and constructively critical tone throughout this audit. Avoid salesman language, advertising speak, hype, pump, or exaggerated claims. Focus on factual assessment, evidence-based analysis, and practical recommendations. Be direct about issues without sugar-coating problems.

## Instructions

### Phase 1: Document Discovery and Preparation

1. **Locate Core Documents**
   ```
   - Requirements.<project.name>.md (Primary audit target)
   - Vision.<project.name>.md (Strategic reference)
   - Context.<project.name>.md (Operational reference)
   ```

2. **Document Structure Analysis**
   - Read and analyze each document's structure
   - Identify key sections and their relationships
   - Note document version/date information
   - Extract core themes and priorities

### Phase 2: Vision-Requirements Alignment Audit

1. **Strategic Objective Mapping**
   - Extract all strategic objectives from Vision document
   - Map each vision objective to corresponding requirements
   - Identify vision elements without requirement coverage
   - Flag requirements that don't trace to vision objectives

2. **Value Proposition Verification**
   - Verify requirements support stated value propositions
   - Check for requirements that contradict vision goals
   - Assess if requirements collectively achieve the vision
   - Identify gaps between aspirational vision and practical requirements

3. **Success Criteria Alignment**
   - Compare vision success metrics with requirement acceptance criteria
   - Verify requirements enable measurement of vision achievement
   - Check for missing measurable outcomes
   - Assess feasibility of vision goals through requirements lens

### Phase 3: Context-Requirements Consistency Audit

1. **Environmental Constraints Validation**
   - Verify requirements respect context limitations
   - Check for requirements that ignore stated constraints
   - Validate technical feasibility within context boundaries
   - Assess resource requirement alignment with context

2. **Stakeholder Need Fulfillment**
   - Map context stakeholders to requirements addressing their needs
   - Identify unaddressed stakeholder requirements
   - Check for requirements serving unstated stakeholders
   - Verify priority alignment with stakeholder importance

3. **Operational Context Integration**
   - Ensure requirements fit within operational environment
   - Verify compliance with stated standards and practices
   - Check integration requirements with existing systems
   - Validate deployment and maintenance considerations

### Phase 4: Requirements Internal Consistency Audit

1. **Completeness Assessment**
   - Functional requirements coverage analysis
   - Non-functional requirements completeness
   - Interface and integration requirements
   - Quality attributes and constraints

2. **Consistency Analysis**
   - Identify conflicting requirements
   - Check for duplicate or redundant requirements
   - Verify consistent terminology usage
   - Assess priority consistency across requirements

3. **Quality Evaluation**
   - Requirement clarity and precision
   - Testability and measurability
   - Feasibility assessment
   - Traceability completeness

### Phase 5: Gap Analysis and Risk Assessment

1. **Coverage Gap Identification**
   ```markdown
   | Vision Element | Requirement Coverage | Gap Severity | Risk Level |
   |---------------|---------------------|--------------|------------|
   | [Element] | [Status] | [High/Med/Low] | [H/M/L] |
   ```

2. **Inconsistency Impact Analysis**
   - Categorize inconsistencies by impact level
   - Assess downstream effects of misalignments
   - Evaluate project risk from requirement gaps
   - Prioritize resolution needs

3. **Stakeholder Impact Assessment**
   - Identify stakeholders affected by gaps/inconsistencies
   - Assess business impact of unaddressed needs
   - Evaluate technical debt implications
   - Consider timeline and resource impacts

### Phase 6: Audit Report Generation

Create comprehensive audit report: `Audit.Requirements.<project.name>.<YYYYMMDD_HHMMSS>.md`

#### Report Structure:
```markdown
# Requirements Audit Report - <Project Name>
**Date:** <UTC Timestamp>
**Auditor:** <Name/Role>
**Documents Audited:**
- Requirements.<project.name>.md (version/date)
- Vision.<project.name>.md (version/date)  
- Context.<project.name>.md (version/date)

## Executive Summary
**Overall Alignment Score:** [X/10]
**Critical Issues:** [Count]
**Recommendations:** [Count]

### Key Findings
- [Primary finding 1]
- [Primary finding 2]
- [Primary finding 3]

## Vision-Requirements Alignment Analysis

### ✅ Well-Aligned Areas
[Areas where requirements strongly support vision]

### ⚠️ Partial Alignment Issues
[Areas needing improvement]

### ❌ Critical Misalignments
[Serious gaps or conflicts]

### Vision Coverage Matrix
| Vision Objective | Requirement Coverage | Status | Notes |
|-----------------|---------------------|---------|-------|
| [Objective] | [Requirements] | ✅/⚠️/❌ | [Details] |

## Context-Requirements Consistency Analysis

### Environmental Constraint Compliance
[Assessment of requirement feasibility within context]

### Stakeholder Need Fulfillment
[Analysis of stakeholder requirement coverage]

### Operational Integration Assessment
[Evaluation of operational context alignment]

## Requirements Quality Assessment

### Completeness Analysis
- **Functional Requirements:** [Score/Comments]
- **Non-Functional Requirements:** [Score/Comments]
- **Interface Requirements:** [Score/Comments]
- **Quality Attributes:** [Score/Comments]

### Internal Consistency Review
- **Conflicts Identified:** [Count/Details]
- **Redundancies Found:** [Count/Details]
- **Terminology Consistency:** [Score/Comments]

## Critical Issues and Recommendations

### Priority 1: Critical Issues
1. **[Issue Title]**
   - Impact: [Business/Technical impact]
   - Root Cause: [Analysis]
   - Recommendation: [Specific action]
   - Timeline: [Suggested resolution timeframe]

### Priority 2: Important Improvements
[Similar format for medium-priority issues]

### Priority 3: Enhancement Opportunities
[Similar format for low-priority improvements]

## Compliance Scorecard

| Audit Dimension | Score (1-10) | Status | Comments |
|-----------------|--------------|---------|----------|
| Vision Alignment | [X] | ✅/⚠️/❌ | [Brief note] |
| Context Consistency | [X] | ✅/⚠️/❌ | [Brief note] |
| Internal Quality | [X] | ✅/⚠️/❌ | [Brief note] |
| Completeness | [X] | ✅/⚠️/❌ | [Brief note] |
| Testability | [X] | ✅/⚠️/❌ | [Brief note] |
| **Overall Score** | **[X.X]** | **Status** | **Summary** |

## Recommended Actions

### Immediate (Next 1-2 weeks)
1. [High-priority fix 1]
2. [High-priority fix 2]

### Short-term (Next 1-2 months)
1. [Medium-priority improvement 1]
2. [Medium-priority improvement 2]

### Long-term (Strategic improvements)
1. [Long-term enhancement 1]
2. [Long-term enhancement 2]

## Appendices

### A. Detailed Gap Analysis
[Comprehensive listing of all identified gaps]

### B. Traceability Matrix
[Full vision-to-requirements mapping]

### C. Stakeholder Coverage Analysis
[Detailed stakeholder requirement mapping]

### D. Quality Metrics Summary
[Quantitative analysis results]
```

## Audit Quality Guidelines

### Objectivity Standards
- Base assessments on documented evidence
- Use consistent evaluation criteria
- Avoid subjective interpretations
- Provide specific examples for all findings

### Thoroughness Requirements
- Review every requirement against both vision and context
- Check bi-directional alignment (vision→requirements, requirements→vision)
- Verify implicit as well as explicit requirements
- Consider edge cases and exception scenarios

### Actionability Focus
- Provide specific, implementable recommendations
- Include priority rankings with clear rationale
- Suggest realistic timelines for resolution
- Consider resource and skill requirements for fixes

## Success Criteria

**Audit Quality Indicators:**
- All vision objectives mapped to requirements
- All context constraints verified against requirements
- Specific recommendations provided for each issue
- Clear prioritization with business justification
- Actionable improvement roadmap created

**Completion Checklist:**
- [ ] All three documents thoroughly reviewed
- [ ] Vision-requirements alignment matrix completed
- [ ] Context-requirements consistency verified
- [ ] Internal requirements quality assessed
- [ ] Gap analysis with priority rankings completed
- [ ] Comprehensive audit report generated
- [ ] Specific actionable recommendations provided
- [ ] Executive summary for stakeholder communication prepared

## Output Artifacts

1. **Audit.Requirements.<project.name>.<timestamp>.md** - Complete audit report
2. **Executive summary** - Concise findings for stakeholder review
3. **Action plan** - Prioritized improvement roadmap
4. **Traceability matrix** - Vision-requirements mapping
5. **Risk assessment** - Impact analysis of identified issues

## Post-Completion Recap (MANDATORY)
After completing the requirements audit (whether successful or with remaining issues), provide a concise summary:

**Recent Work Recap:**
- Briefly summarize what was just accomplished in this requirements audit session
- Highlight key alignment findings and compliance assessments
- Note any critical gaps or inconsistencies discovered and their resolutions

**Current Project Status:**
- Requirements quality and vision alignment after the audit
- Current version status and impact on active version-numbered plans
- Any remaining requirement gaps or alignment violations

**Immediate Next Steps:**
- 2-3 highest priority items revealed by the requirements audit
- Any urgent requirement issues requiring attention
- Planned next phase of requirements improvements

Use a measured, sober and constructively critical tone throughout this recap. Avoid salesman language, advertising speak, hype, pump, or exaggerated claims. Focus on factual assessment and practical next steps.

Keep this recap concise (3-5 bullet points each section) but informative for project continuity.

**Author**: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>