# Design and Architecture Audit Prompt

## Purpose
Systematically audit the technical specifications and architecture against vision, context, and requirements with special emphasis on scale-appropriateness. This prompt ensures the technical design aligns with strategic goals while maintaining proportional complexity for the operational scale described in the context.

## Tone and Approach
Use a measured, sober and constructively critical tone throughout this audit. Avoid salesman language, advertising speak, hype, pump, or exaggerated claims. Focus on factual assessment, evidence-based analysis, and practical recommendations. Be direct about issues without sugar-coating problems.

## Instructions

### Phase 1: Document Discovery and Scale Context Analysis

1. **Locate Core Documents**
   ```
   - Specifications.<project.name>.md (Primary audit target)
   - Architecture.<project.name>.md (Primary audit target)
   - Vision.<project.name>.md (Strategic reference)
   - Context.<project.name>.md (Scale/operational reference)
   - Requirements.<project.name>.md (Functional reference)
   ```

2. **Scale Context Extraction**
   - Identify operational scale indicators from Context document:
     * Team size (developers, operations, users)
     * Transaction volumes and data scales
     * Performance requirements and SLAs
     * Budget and resource constraints
     * Timeline and delivery expectations
     * Maintenance and support capabilities
   - Extract complexity tolerance indicators
   - Note explicit scale constraints and limitations

3. **Design Complexity Assessment**
   - Catalog all architectural components and their interactions
   - Identify design patterns and complexity levels
   - Count integration points and external dependencies
   - Assess operational overhead requirements

### Phase 2: Scale-Appropriateness Analysis

1. **Operational Scale Alignment**
   - **Team Scale Appropriateness**
     * Can the described team size effectively develop, deploy, and maintain this architecture?
     * Does the design require specialized skills beyond team capabilities?
     * Are operational procedures realistic for the team size?
   
   - **Performance Scale Validation**
     * Does the architecture scale match expected load requirements?
     * Are performance optimizations proportional to actual needs?
     * Is over-engineering evident in low-traffic scenarios?

   - **Resource Scale Compatibility**
     * Do infrastructure requirements align with budget constraints?
     * Are licensing and operational costs proportional to value delivered?
     * Can the organization sustain the operational overhead?

2. **Complexity-to-Value Ratio Analysis**
   ```markdown
   | Component | Complexity Score (1-10) | Business Value (1-10) | Ratio | Scale Appropriateness |
   |-----------|------------------------|----------------------|-------|---------------------|
   | [Component] | [Score] | [Score] | [C/V] | ✅/⚠️/❌ |
   ```

3. **Alternative Scale-Appropriate Solutions**
   - Identify areas where simpler solutions would be more appropriate
   - Suggest scale-appropriate alternatives for over-engineered components
   - Recommend complexity reduction strategies
   - Propose phased implementation approaches

### Phase 3: Vision-Design Alignment Audit

1. **Strategic Objective Support**
   - Map each vision objective to architectural components
   - Verify design enables achievement of vision goals
   - Identify architectural barriers to vision fulfillment
   - Assess if design complexity supports or hinders vision delivery

2. **Value Proposition Enablement**
   - Verify architecture enables delivery of promised value
   - Check for architectural overhead that reduces value delivery
   - Assess time-to-market impact of design complexity
   - Evaluate user experience implications of architectural choices

3. **Success Metrics Feasibility**
   - Confirm architecture enables measurement of vision success criteria
   - Verify monitoring and observability design supports metrics collection
   - Assess if design complexity impedes rapid iteration and improvement

### Phase 4: Requirements-Architecture Compliance Audit

1. **Functional Requirements Coverage**
   - Map all functional requirements to architectural components
   - Verify complete requirement fulfillment through design
   - Identify architectural gaps preventing requirement delivery
   - Check for over-engineered solutions to simple requirements

2. **Non-Functional Requirements Validation**
   - **Performance Requirements**
     * Verify architecture can meet stated performance criteria
     * Check if performance design exceeds actual requirements
     * Assess performance monitoring and optimization capabilities
   
   - **Scalability Requirements**
     * Confirm scaling approach matches growth expectations
     * Verify horizontal vs. vertical scaling choices are appropriate
     * Check for premature optimization for unneeded scale
   
   - **Security Requirements**
     * Validate security measures match actual threat model
     * Assess if security complexity is proportional to risk
     * Check for security over-engineering vs. actual needs

   - **Reliability Requirements**
     * Verify fault tolerance measures match availability needs
     * Check for unnecessary redundancy and complexity
     * Assess operational complexity vs. reliability gains

3. **Integration and Interface Requirements**
   - Verify all integration points are architecturally addressed
   - Check API design appropriateness for scale and usage patterns
   - Assess data flow design efficiency and complexity

### Phase 5: Context-Architecture Consistency Audit

1. **Organizational Capability Alignment**
   - **Development Team Capabilities**
     * Does architecture require skills beyond team expertise?
     * Are technology choices appropriate for team experience level?
     * Can the team effectively maintain and evolve this architecture?
   
   - **Operational Capabilities**
     * Are deployment and monitoring requirements within operational capacity?
     * Does the architecture require tooling or processes beyond organizational maturity?
     * Are incident response and maintenance procedures realistic?

2. **Resource Constraint Compliance**
   - **Budget Constraints**
     * Are infrastructure costs within stated budget limits?
     * Do licensing and tooling costs align with financial constraints?
     * Are hidden operational costs appropriately considered?
   
   - **Timeline Constraints**
     * Can the architecture be implemented within project timelines?
     * Are complex components necessary for initial delivery?
     * Is there a viable MVP path through the architecture?

3. **Technology Stack Appropriateness**
   - Are technology choices appropriate for organizational context?
   - Do dependency choices align with long-term maintenance capabilities?
   - Are emerging technologies used appropriately for organizational risk tolerance?

### Phase 6: Architecture Quality and Design Principles Audit

1. **Design Principle Adherence**
   - **Simplicity Principle**
     * Is the simplest solution that meets requirements chosen?
     * Are complex patterns used only where justified by clear benefits?
     * Can components be simplified without losing essential functionality?
   
   - **Scale-Appropriate Patterns**
     * Are enterprise patterns used appropriately for the actual scale?
     * Are microservices justified by actual organizational and scale needs?
     * Are event-driven patterns necessary for the actual data volumes?

2. **Maintainability Assessment**
   - Can the described team maintain this architecture long-term?
   - Are documentation and knowledge transfer requirements realistic?
   - Is technical debt accumulation risk appropriately managed?

3. **Evolution and Adaptability**
   - Does the architecture support iterative improvement?
   - Can the design evolve with changing requirements without major rewrites?
   - Are technology migration paths considered and feasible?

### Phase 7: Risk Assessment and Mitigation Analysis

1. **Scale-Related Risks**
   - **Over-Engineering Risks**
     * Increased development time and complexity
     * Higher operational overhead than organization can sustain
     * Delayed time-to-market due to unnecessary complexity
   
   - **Under-Engineering Risks**
     * Inability to meet performance requirements at scale
     * Technical debt accumulation requiring costly refactoring
     * Architecture limitations preventing business growth

2. **Organizational Risks**
   - Team expertise gaps for proposed architecture
   - Operational capability mismatches
   - Long-term maintenance sustainability concerns

3. **Mitigation Strategy Assessment**
   - Evaluate proposed risk mitigation strategies
   - Assess feasibility of mitigation approaches
   - Recommend additional risk mitigation measures

### Phase 8: Audit Report Generation

Create comprehensive audit report: `Audit.Design.<project.name>.<YYYYMMDD_HHMMSS>.md`

#### Report Structure:
```markdown
# Design and Architecture Audit Report - <Project Name>
**Date:** <UTC Timestamp>
**Auditor:** <Name/Role>
**Documents Audited:**
- Specifications.<project.name>.md (version/date)
- Architecture.<project.name>.md (version/date)
- Vision.<project.name>.md (version/date)
- Context.<project.name>.md (version/date)
- Requirements.<project.name>.md (version/date)

## Executive Summary
**Scale Appropriateness Score:** [X/10]
**Vision Alignment Score:** [X/10]
**Requirements Compliance Score:** [X/10]
**Overall Design Quality Score:** [X/10]

### Key Findings
- **Scale Appropriateness:** [Primary finding]
- **Over-Engineering Concerns:** [Count and examples]
- **Under-Engineering Risks:** [Count and examples]
- **Critical Alignment Issues:** [Count and examples]

### Recommendations Summary
- **Immediate Simplifications:** [Count] components to simplify
- **Missing Capabilities:** [Count] gaps to address
- **Risk Mitigations:** [Count] risks requiring mitigation

## Scale-Appropriateness Analysis

### Organizational Scale Assessment
| Scale Dimension | Context Requirement | Design Reality | Appropriateness | Gap Analysis |
|----------------|-------------------|----------------|-----------------|--------------|
| Team Size | [X] developers | [Complexity Level] | ✅/⚠️/❌ | [Details] |
| Performance Needs | [X] req/sec | [Architecture Capability] | ✅/⚠️/❌ | [Details] |
| Data Scale | [X] records/TB | [Storage Design] | ✅/⚠️/❌ | [Details] |
| Budget Constraints | $[X]/month | [Infrastructure Cost] | ✅/⚠️/❌ | [Details] |
| Maintenance Capacity | [X] hours/week | [Operational Overhead] | ✅/⚠️/❌ | [Details] |

### Complexity-to-Value Analysis
| Component | Complexity (1-10) | Business Value (1-10) | C/V Ratio | Scale Appropriateness | Recommendation |
|-----------|-------------------|----------------------|-----------|---------------------|----------------|
| [Component] | [Score] | [Score] | [Ratio] | ✅/⚠️/❌ | [Action] |

### Over-Engineering Identification
#### 🔴 Critical Over-Engineering
1. **[Component/Pattern Name]**
   - Current Complexity: [High/Description]
   - Actual Need: [Low/Description]
   - Impact: [Cost/Time/Maintenance burden]
   - Recommendation: [Simpler alternative]

#### 🟡 Moderate Over-Engineering
[Similar format for moderate cases]

### Under-Engineering Risks
#### 🔴 Critical Gaps
1. **[Missing Capability]**
   - Context Requirement: [Specific need]
   - Current Design: [Gap description]
   - Risk Impact: [Business/technical consequences]
   - Recommendation: [Addition needed]

## Vision-Architecture Alignment

### Strategic Objective Support
| Vision Objective | Architectural Support | Alignment Quality | Issues | Recommendations |
|-----------------|----------------------|-------------------|---------|-----------------|
| [Objective] | [Components/Patterns] | ✅/⚠️/❌ | [Problems] | [Actions] |

### Value Delivery Assessment
- **Time-to-Market Impact:** [Analysis of architecture complexity on delivery speed]
- **User Experience Impact:** [How architecture affects user-facing capabilities]
- **Business Value Delivery:** [Architecture's role in value proposition fulfillment]

## Requirements-Architecture Compliance

### Functional Coverage Matrix
| Requirement Category | Coverage Status | Implementation Quality | Scale Appropriateness |
|---------------------|----------------|----------------------|---------------------|
| [Category] | ✅/⚠️/❌ | [Assessment] | [Appropriate/Over/Under] |

### Non-Functional Assessment
#### Performance Requirements
- **Required:** [Specifications]
- **Designed For:** [Architecture capabilities]
- **Appropriateness:** [Over/Under/Appropriate]
- **Recommendations:** [Adjustments needed]

#### Scalability Requirements
[Similar format]

#### Security Requirements
[Similar format]

#### Reliability Requirements
[Similar format]

## Context Compliance Analysis

### Team Capability Assessment
| Capability Area | Required Level | Team Level | Gap | Risk Level | Mitigation |
|----------------|---------------|------------|-----|------------|------------|
| [Technology] | [Expert/Advanced/Basic] | [Current] | [Gap Size] | 🔴/🟡/🟢 | [Strategy] |

### Resource Alignment
#### Budget Impact Analysis
- **Infrastructure Costs:** $[X]/month (Budget: $[Y]/month)
- **Licensing Costs:** $[X]/month
- **Operational Costs:** [X] hours/week @ $[Y]/hour
- **Total vs. Budget:** [Over/Under/Appropriate by X%]

#### Timeline Feasibility
- **Estimated Development Time:** [X] months
- **Available Timeline:** [Y] months
- **Critical Path Components:** [List of complex items]
- **MVP Viability:** [Assessment]

## Architecture Quality Assessment

### Design Principle Compliance
| Principle | Compliance Score (1-10) | Issues | Recommendations |
|-----------|------------------------|---------|-----------------|
| Simplicity | [Score] | [Problems] | [Actions] |
| Scale-Appropriate Patterns | [Score] | [Problems] | [Actions] |
| Maintainability | [Score] | [Problems] | [Actions] |
| Evolvability | [Score] | [Problems] | [Actions] |

### Technical Debt Risk Analysis
- **Complexity Debt:** [Assessment of maintenance burden]
- **Technology Debt:** [Risk of technology choices]
- **Scale Debt:** [Risk of over/under-engineering]
- **Knowledge Debt:** [Team expertise gaps]

## Critical Issues and Recommendations

### Priority 1: Critical Scale Mismatches
1. **[Issue Title]**
   - **Scale Mismatch:** [Description of inappropriateness]
   - **Business Impact:** [Cost/time/risk implications]
   - **Root Cause:** [Why this occurred]
   - **Recommendation:** [Specific scale-appropriate alternative]
   - **Implementation:** [How to fix with minimal disruption]
   - **Timeline:** [Suggested resolution timeframe]

### Priority 2: Alignment Issues
[Similar format for vision/requirements alignment problems]

### Priority 3: Quality Improvements
[Similar format for general architecture quality issues]

## Scale-Appropriate Alternatives

### Recommended Simplifications
1. **[Component/Pattern to Simplify]**
   - **Current Approach:** [Over-engineered solution]
   - **Scale-Appropriate Alternative:** [Simpler solution]
   - **Benefits:** [Reduced complexity, faster delivery, lower cost]
   - **Trade-offs:** [What capabilities are reduced]
   - **Migration Path:** [How to transition]

### Phased Implementation Strategy
#### Phase 1: MVP Architecture (Months 1-X)
- [Essential components only]
- [Minimal viable complexity]
- [Core value delivery focus]

#### Phase 2: Scale-Up Architecture (Months X-Y)
- [Add components as scale demands]
- [Evidence-based complexity addition]
- [Measure before optimizing]

#### Phase 3: Optimization Architecture (Months Y+)
- [Performance optimizations]
- [Advanced patterns where proven necessary]
- [Scale-driven enhancements]

## Risk Mitigation Strategies

### Over-Engineering Mitigation
- **Complexity Gates:** [Process to prevent unnecessary complexity]
- **Scale Triggers:** [Criteria for adding complex components]
- **Regular Simplification Reviews:** [Process for reducing complexity]

### Under-Engineering Mitigation
- **Monitoring Strategy:** [How to detect scale needs early]
- **Rapid Scaling Plan:** [How to add capacity quickly]
- **Technology Migration Paths:** [How to evolve architecture]

## Implementation Roadmap

### Immediate Actions (Next 2-4 weeks)
1. [Simplify over-engineered component X]
2. [Add missing critical capability Y]
3. [Reduce dependency complexity in Z]

### Short-term Improvements (Next 1-3 months)
1. [Implement scale-appropriate pattern for A]
2. [Replace complex solution B with simpler alternative]
3. [Add monitoring for scale trigger C]

### Long-term Evolution (3+ months)
1. [Planned complexity additions based on actual scale needs]
2. [Technology evolution path]
3. [Advanced optimization implementation]

## Compliance Scorecard

| Audit Dimension | Score (1-10) | Status | Key Issues | Priority |
|-----------------|--------------|---------|------------|----------|
| Scale Appropriateness | [X] | ✅/⚠️/❌ | [Top issue] | [H/M/L] |
| Vision Alignment | [X] | ✅/⚠️/❌ | [Top issue] | [H/M/L] |
| Requirements Compliance | [X] | ✅/⚠️/❌ | [Top issue] | [H/M/L] |
| Context Compatibility | [X] | ✅/⚠️/❌ | [Top issue] | [H/M/L] |
| Design Quality | [X] | ✅/⚠️/❌ | [Top issue] | [H/M/L] |
| **Overall Score** | **[X.X]** | **Status** | **Critical Path** | **Action Required** |

## Appendices

### A. Detailed Component Analysis
[Comprehensive component-by-component assessment]

### B. Scale-Appropriateness Matrix
[Full mapping of context scale to design decisions]

### C. Alternative Architecture Options
[Detailed scale-appropriate alternatives with trade-offs]

### D. Risk Register
[Complete risk analysis with probability and impact assessments]

### E. Implementation Cost Analysis
[Detailed cost implications of recommendations]
```

## Audit Quality Guidelines

### Scale-Appropriateness Focus
- Always question whether complexity is justified by actual scale needs
- Consider the "minimum viable complexity" for each component
- Evaluate long-term sustainability of design choices
- Assess whether the team can realistically operate the proposed architecture

### Evidence-Based Assessment
- Base scale assessments on concrete numbers from Context document
- Use specific examples for over/under-engineering claims
- Provide quantitative analysis where possible
- Reference industry best practices for similar scales

### Practical Recommendations
- Suggest realistic migration paths from current state
- Consider implementation effort vs. benefit trade-offs
- Provide phased approaches for complex changes
- Include cost implications of recommendations

## Success Criteria

**Audit Quality Indicators:**
- Clear identification of scale mismatches with specific examples
- Quantitative assessment of complexity-to-value ratios
- Practical, implementable recommendations for each issue
- Phased implementation strategy respecting resource constraints
- Risk assessment with concrete mitigation strategies

**Completion Checklist:**
- [ ] All architecture components assessed for scale appropriateness
- [ ] Vision-architecture alignment thoroughly evaluated
- [ ] Requirements coverage verified with scale context
- [ ] Context constraints validated against design reality
- [ ] Over-engineering issues identified with simpler alternatives
- [ ] Under-engineering risks assessed with mitigation strategies
- [ ] Practical implementation roadmap provided
- [ ] Cost-benefit analysis of recommendations completed

## Output Artifacts

1. **Audit.Design.<project.name>.<timestamp>.md** - Complete design audit report
2. **Scale-appropriateness scorecard** - Quick reference for scale alignment
3. **Simplification roadmap** - Prioritized complexity reduction plan
4. **Alternative architecture options** - Scale-appropriate design alternatives
5. **Risk mitigation plan** - Specific actions to address identified risks

## Post-Completion Recap (MANDATORY)
After completing the design audit (whether successful or with remaining issues), provide a concise summary:

**Recent Work Recap:**
- Briefly summarize what was just accomplished in this design audit session
- Highlight key architecture/design findings and scale-appropriateness assessments
- Note any critical over/under-engineering issues discovered and their resolutions

**Current Project Status:**
- Design quality and scale alignment after the audit
- Current version status and impact on active version-numbered plans
- Any remaining architectural debt or design violations

**Immediate Next Steps:**
- 2-3 highest priority items revealed by the design audit
- Any urgent architectural issues requiring attention
- Planned next phase of design improvements

Use a measured, sober and constructively critical tone throughout this recap. Avoid salesman language, advertising speak, hype, pump, or exaggerated claims. Focus on factual assessment and practical next steps.

Keep this recap concise (3-5 bullet points each section) but informative for project continuity.

**Author**: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>