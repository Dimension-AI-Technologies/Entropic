# Prompt.Audit.Plan.md

## Purpose
Systematically audit a specific project plan against all foundational documents (Vision, Context, Requirements, Specifications, Architecture, Versions) and the ReCo methodology to ensure alignment, feasibility, and process compliance.

## Tone and Approach
Use a measured, sober and constructively critical tone throughout this audit. Avoid salesman language, advertising speak, hype, pump, or exaggerated claims. Focus on factual assessment, evidence-based analysis, and practical recommendations. Be direct about issues without sugar-coating problems.

## Input Parameters
- **Plan Document**: [Specify plan file path, e.g., Plan.Dimension.Transpiler.v0.X.X.md]
- **Project Name**: [Extract from file naming convention]

## Methodology
Execute the following 12 phases sequentially to ensure comprehensive plan validation:

### Phase 1: Foundation Document Assembly
**Objective**: Gather and analyze all foundational documents for audit baseline

**Actions**:
1. Read Vision.{project.name}.md to understand project aspirations and success criteria
2. Read Context.{project.name}.md to understand operational scale, constraints, and environment
3. Read Requirements.{project.name}.md to understand functional and non-functional requirements
4. Read Specifications.{project.name}.md to understand technical specifications and system boundaries
5. Read Architecture.{project.name}.md to understand architectural decisions and technical constraints
6. Read Versions.{project.name}.md to understand versioning strategy and release timeline
7. Read ReCo.Process.md to understand methodology requirements and process standards
8. Read the specified Plan document for detailed audit analysis

**Foundation Summary Output**:
- Vision aspirations and success metrics
- Context constraints and operational scale
- Requirements scope and priorities
- Technical specifications and boundaries
- Architectural decisions and trade-offs
- Version timeline and milestone structure
- ReCo process requirements and standards

### Phase 2: ReCo Process Compliance Assessment
**Objective**: Evaluate plan adherence to ReCo methodology standards

**Actions**:
1. Verify plan structure follows ReCo template requirements
2. Assess plan documentation quality against ReCo standards
3. Evaluate stakeholder consideration and coverage
4. Review risk assessment and mitigation approach
5. Validate phase completion criteria definition
6. Check traceability to foundational documents

**ReCo Compliance Scorecard**:
```
Rate 1-5 (1=Non-compliant, 3=Meets standard, 5=Exceeds standard):
- Document Structure and Format: [Score]
- Stakeholder Coverage and Analysis: [Score]
- Risk Assessment Thoroughness: [Score]
- Phase Definition and Criteria: [Score]
- Traceability to Foundation Docs: [Score]
- Process Integration and Flow: [Score]
```

### Phase 3: Vision-Plan Alignment Verification
**Objective**: Ensure plan directly supports vision achievement

**Actions**:
1. Map plan deliverables to vision success criteria
2. Assess value delivery timing against stakeholder expectations
3. Evaluate vision realization feasibility within plan scope
4. Identify vision elements not addressed in plan
5. Review plan contribution to long-term vision objectives

**Vision Alignment Matrix**:
| Vision Element | Plan Phase | Delivery Method | Confidence Level | Gap Analysis |
|----------------|------------|-----------------|------------------|--------------|
| [Extract] | [Map] | [Describe] | High/Med/Low | [Identify] |

### Phase 4: Context-Plan Feasibility Assessment
**Objective**: Validate plan feasibility against operational context

**Actions**:
1. Assess plan scope against team size and capability constraints
2. Evaluate timeline realism against available resources
3. Review environmental constraints and their plan impact
4. Analyze external dependencies and integration requirements
5. Validate plan assumptions against contextual realities

**Context Feasibility Scoring**:
```
Rate 1-5 (1=Unfeasible, 3=Challenging but doable, 5=Well within capacity):
- Team Capacity vs Plan Scope: [Score]
- Timeline vs Resource Availability: [Score]
- Skill Requirements vs Team Capability: [Score]
- Environmental Constraints Management: [Score]
- External Dependency Management: [Score]
```

### Phase 5: Requirements Coverage and Traceability Audit
**Objective**: Verify complete requirements coverage in plan execution

**Actions**:
1. Create requirements-to-plan-phase traceability matrix
2. Identify requirements not addressed in plan
3. Assess requirements prioritization and sequencing logic
4. Evaluate functional and non-functional requirements balance
5. Review requirements validation and acceptance criteria

**Requirements Traceability Report**:
- Total requirements: [Count]
- Requirements covered in plan: [Count] ([%])
- Critical requirements coverage: [Analysis]
- Requirements gaps: [List]
- Validation approach adequacy: [Assessment]

### Phase 6: Specifications Compliance Verification
**Objective**: Ensure plan deliverables meet technical specifications

**Actions**:
1. Map plan outputs to specification requirements
2. Assess technical deliverable quality standards
3. Evaluate specification constraint adherence
4. Review interface and integration specification coverage
5. Validate performance and quality specification achievement

**Specifications Compliance Matrix**:
| Specification Area | Plan Coverage | Implementation Approach | Compliance Risk |
|-------------------|---------------|------------------------|-----------------|
| [Extract] | Complete/Partial/Missing | [Describe] | High/Med/Low |

### Phase 7: Architecture-Plan Consistency Analysis
**Objective**: Validate plan alignment with architectural decisions

**Actions**:
1. Assess plan deliverables against architectural constraints
2. Evaluate technology stack and tool alignment
3. Review architectural pattern implementation approach
4. Analyze system integration and interface strategy
5. Validate architectural quality attribute achievement

**Architecture Alignment Assessment**:
- Architectural decision compliance: [%]
- Technology stack consistency: [Analysis]
- Pattern implementation fidelity: [Assessment]
- Integration strategy alignment: [Evaluation]
- Quality attribute achievement: [Review]

### Phase 8: Versions-Plan Timeline Synchronization
**Objective**: Ensure plan timeline aligns with version release strategy

**Actions**:
1. Map plan phases to version milestones
2. Assess plan deliverable timing against version schedules
3. Evaluate dependency chain alignment with version sequencing
4. Review integration and testing timeline coordination
5. Validate release readiness criteria achievement

**Timeline Synchronization Matrix**:
| Plan Phase | Target Version | Planned Completion | Version Deadline | Alignment Status |
|------------|----------------|-------------------|------------------|------------------|
| [Extract] | [Map] | [Date] | [Date] | Aligned/Risk/Conflict |

### Phase 9: Scale Appropriateness and Resource Realism
**Objective**: Evaluate plan scale appropriateness and resource realism

**Actions**:
1. Assess plan complexity against operational scale indicators
2. Evaluate resource allocation realism and sustainability
3. Review skill development and learning curve accommodation
4. Analyze risk buffer and contingency planning adequacy
5. Validate plan granularity appropriate for project scale

**Scale Appropriateness Evaluation**:
```
Complexity vs Scale Assessment:
- Plan scope complexity: [High/Medium/Low]
- Operational scale capacity: [High/Medium/Low]
- Alignment verdict: [Over-scoped/Appropriate/Under-scoped]

Resource Realism Assessment:
- Effort estimates: [Realistic/Optimistic/Pessimistic]
- Skill requirements: [Available/Developable/Gap]
- Timeline buffers: [Adequate/Minimal/Insufficient]
```

### Phase 10: Risk Assessment and Mitigation Evaluation
**Objective**: Analyze plan risk management comprehensiveness

**Actions**:
1. Evaluate identified risks against foundational document constraints
2. Assess risk probability and impact analysis thoroughness
3. Review mitigation strategy feasibility and effectiveness
4. Analyze contingency planning and fallback options
5. Validate risk monitoring and escalation procedures

**Risk Management Scorecard**:
```
Rate 1-5 (1=Inadequate, 3=Sufficient, 5=Comprehensive):
- Risk Identification Thoroughness: [Score]
- Impact and Probability Analysis: [Score]
- Mitigation Strategy Feasibility: [Score]
- Contingency Planning Adequacy: [Score]
- Monitoring and Control Procedures: [Score]
```

### Phase 11: Stakeholder Value and Success Criteria Analysis
**Objective**: Validate plan delivers stakeholder value and measurable success

**Actions**:
1. Map plan deliverables to stakeholder value propositions
2. Assess success criteria definition and measurability
3. Evaluate stakeholder engagement and feedback mechanisms
4. Review value delivery timing and incremental benefits
5. Validate success measurement and reporting approach

**Stakeholder Value Matrix**:
| Stakeholder | Value Proposition | Plan Delivery | Success Metric | Measurement Method |
|-------------|-------------------|---------------|----------------|-------------------|
| [Identify] | [Extract] | [Map] | [Define] | [Specify] |

### Phase 12: Integrated Audit Synthesis and Recommendations
**Objective**: Synthesize findings and provide actionable improvement recommendations

**Actions**:
1. Consolidate findings from all audit phases
2. Identify critical alignment gaps and feasibility issues
3. Prioritize recommendations by impact and urgency
4. Develop specific improvement actions with success criteria
5. Create implementation roadmap for plan optimization

**Audit Synthesis Framework**:

**Critical Issues** (Must Address Immediately):
- [Foundation document misalignments]
- [Feasibility concerns]
- [ReCo process violations]

**Significant Concerns** (Should Address Soon):
- [Resource realism issues]
- [Timeline synchronization problems]
- [Risk management gaps]

**Optimization Opportunities** (Could Improve):
- [Efficiency improvements]
- [Quality enhancements]
- [Process optimizations]

**Plan Improvement Recommendations**:
```
1. Foundation Alignment:
   - Issue: [Describe]
   - Recommendation: [Specific action]
   - Success Criteria: [Measurable outcome]

2. Feasibility Enhancement:
   - Issue: [Describe]
   - Recommendation: [Specific action]
   - Success Criteria: [Measurable outcome]

3. Process Compliance:
   - Issue: [Describe]
   - Recommendation: [Specific action]
   - Success Criteria: [Measurable outcome]
```

## Output Format
Create a comprehensive plan audit report with:

1. **Executive Summary**
   - Overall plan assessment verdict
   - Critical issues requiring immediate attention
   - Plan viability and recommendation confidence

2. **Foundation Alignment Analysis**
   - Vision-plan alignment assessment
   - Context feasibility evaluation
   - Requirements coverage analysis
   - Specifications compliance review
   - Architecture consistency validation
   - Version timeline synchronization

3. **ReCo Process Compliance Report**
   - Process adherence scorecard
   - Documentation quality assessment
   - Methodology integration evaluation

4. **Scale and Feasibility Assessment**
   - Resource realism evaluation
   - Timeline feasibility analysis
   - Risk management adequacy review

5. **Actionable Recommendations**
   - Prioritized improvement actions
   - Implementation roadmap
   - Success measurement criteria

6. **Traceability Matrices and Scorecards**
   - All completed assessment matrices
   - Numerical scoring summaries
   - Gap analysis documentation

## Success Criteria
- Complete foundation document alignment verification
- Thorough ReCo process compliance assessment
- Comprehensive feasibility and scale appropriateness evaluation
- Actionable recommendations with clear implementation guidance
- Risk-aware plan optimization suggestions
- Stakeholder value delivery validation

## Usage Instructions
1. Specify the plan document path in Input Parameters
2. Execute all 12 phases systematically
3. Complete all assessment matrices and scorecards
4. Provide specific, actionable recommendations
5. Include confidence levels for all assessments
6. Reference specific sections from foundation documents

## Post-Completion Recap (MANDATORY)
After completing the plan audit (whether successful or with remaining issues), provide a concise summary:

**Recent Work Recap:**
- Briefly summarize what was just accomplished in this plan audit session
- Highlight key plan alignment findings and compliance assessments
- Note any critical feasibility issues discovered and their resolutions

**Current Project Status:**
- Plan quality and foundation alignment after the audit
- Current version status and impact on active version-numbered plans
- Any remaining plan inconsistencies or compliance violations

**Immediate Next Steps:**
- 2-3 highest priority items revealed by the plan audit
- Any urgent planning issues requiring attention
- Planned next phase of plan improvements

Use a measured, sober and constructively critical tone throughout this recap. Avoid salesman language, advertising speak, hype, pump, or exaggerated claims. Focus on factual assessment and practical next steps.

Keep this recap concise (3-5 bullet points each section) but informative for project continuity.

---
*Comprehensive plan audit methodology ensuring alignment with all foundational documents and ReCo process compliance for successful project execution.*