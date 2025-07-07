# Prompt.Audit.Versions.md

## Purpose
Systematically audit the project versions plan against the vision, context, requirements, specifications, and architecture with special emphasis on scale-appropriateness and delivery feasibility.

## Tone and Approach
Use a measured, sober and constructively critical tone throughout this audit. Avoid salesman language, advertising speak, hype, pump, or exaggerated claims. Focus on factual assessment, evidence-based analysis, and practical recommendations. Be direct about issues without sugar-coating problems.

## Methodology
Execute the following 9 phases sequentially to ensure comprehensive versions plan validation:

### Phase 1: Foundation Document Analysis
**Objective**: Establish audit baseline from foundational documents

**Actions**:
1. Read Vision.<project.name>.md to understand project aspirations and success criteria
2. Read Context.<project.name>.md to understand operational scale, constraints, and environment
3. Read Requirements.<project.name>.md to understand functional and non-functional requirements
4. Read Specifications.<project.name>.md to understand technical specifications and system boundaries
5. Read Architecture.<project.name>.md to understand architectural decisions and technical constraints
6. Read Versions.<project.name>.md to understand the versioning strategy and release plan

**Outputs**:
- Foundation summary highlighting key scale indicators, constraints, and success criteria
- Critical dependencies and assumptions from each document

### Phase 2: Scale Context Extraction
**Objective**: Extract and analyze operational scale indicators

**Actions**:
1. Identify team size, timeline, and resource constraints from Context
2. Extract complexity indicators from Requirements and Specifications
3. Analyze technical debt and architectural complexity from Architecture
4. Map version scope against available capacity and capability
5. Assess external dependencies and integration complexity

**Scale Indicators Matrix**:
| Dimension | Small Scale | Medium Scale | Large Scale | Project Reality |
|-----------|-------------|--------------|-------------|-----------------|
| Team Size | 1-3 people | 4-10 people | 10+ people | [Extract] |
| Timeline | Weeks | Months | Years | [Extract] |
| Features | Core MVP | Extended features | Platform/ecosystem | [Extract] |
| Users | Dozens | Hundreds | Thousands+ | [Extract] |
| Data Volume | MB | GB | TB+ | [Extract] |
| Integration | Minimal | Moderate | Extensive | [Extract] |

### Phase 3: Version Plan Structure Analysis
**Objective**: Evaluate version plan structure and release strategy

**Actions**:
1. Analyze version numbering scheme (semantic versioning compliance)
2. Evaluate release cadence and milestone structure
3. Assess feature distribution across versions
4. Review dependency management and backward compatibility strategy
5. Validate versioning against architectural constraints

**Evaluation Criteria**:
- Version structure clarity and consistency
- Release scope appropriateness for team capacity
- Feature sequencing logic and dependency management
- Risk distribution across versions
- Stakeholder value delivery timing

### Phase 4: Feature-to-Scale Alignment Assessment
**Objective**: Validate feature scope against operational scale

**Actions**:
1. Map each version's features against scale-appropriate complexity
2. Assess feature development effort against team capacity
3. Evaluate feature interdependencies and critical path analysis
4. Review integration complexity scaling across versions
5. Validate testing and quality assurance scope scaling

**Scale-Appropriateness Scoring**:
```
For each version, score 1-5 (1=Under-scoped, 3=Appropriate, 5=Over-scoped):
- Feature Complexity vs Team Capability: [Score]
- Timeline Realism vs Scope: [Score]  
- Integration Effort vs Resources: [Score]
- Quality Assurance vs Risk Tolerance: [Score]
- Technical Debt Management: [Score]
```

### Phase 5: Vision-Versions Alignment Verification
**Objective**: Ensure version plan delivers on vision aspirations

**Actions**:
1. Map vision success criteria to version deliverables
2. Assess value delivery timeline against stakeholder expectations
3. Evaluate MVP definition and subsequent value increments
4. Review vision realization feasibility within proposed timeline
5. Identify vision-versions gaps and misalignments

**Vision Alignment Matrix**:
| Vision Element | Target Version | Delivery Confidence | Scale Risk | Mitigation |
|----------------|----------------|-------------------|------------|------------|
| [Extract] | [Map] | High/Med/Low | High/Med/Low | [Strategy] |

### Phase 6: Requirements-Versions Traceability Audit
**Objective**: Verify complete requirements coverage across versions

**Actions**:
1. Create requirements-to-version traceability matrix
2. Identify orphaned requirements not addressed in any version
3. Assess requirements prioritization and sequencing logic
4. Evaluate technical requirements distribution and dependency chains
5. Review non-functional requirements scaling across versions

**Traceability Assessment**:
- Requirements coverage completeness: [%]
- Critical requirements in appropriate versions: [Analysis]
- Technical debt creation/resolution balance: [Assessment]
- Performance/scalability requirements progression: [Evaluation]

### Phase 7: Technical Feasibility and Architecture Alignment
**Objective**: Validate technical delivery feasibility

**Actions**:
1. Assess architectural decisions impact on version delivery
2. Evaluate technical complexity scaling across versions
3. Review infrastructure and tooling requirements per version
4. Analyze technical risk distribution and mitigation strategies
5. Validate development methodology alignment with version plan

**Technical Feasibility Matrix**:
| Version | Architecture Impact | Technical Complexity | Infrastructure Needs | Risk Level |
|---------|-------------------|-------------------|-------------------|------------|
| [Each] | High/Med/Low | High/Med/Low | Describe | High/Med/Low |

### Phase 8: Resource and Timeline Realism Assessment
**Objective**: Evaluate delivery timeline and resource realism

**Actions**:
1. Calculate development effort estimates per version
2. Assess team velocity and capacity constraints
3. Evaluate learning curve and skill development time
4. Review external dependency and integration timelines
5. Analyze contingency planning and risk buffer adequacy

**Realism Scoring**:
```
Rate 1-5 (1=Unrealistic, 3=Challenging but feasible, 5=Conservative):
- Development effort estimates: [Score]
- Team capacity utilization: [Score]
- Learning curve accommodation: [Score]
- External dependency management: [Score]
- Risk and contingency planning: [Score]
```

### Phase 9: Recommendations and Scale-Appropriate Adjustments
**Objective**: Provide actionable recommendations for version plan optimization

**Actions**:
1. Synthesize findings from all previous phases
2. Identify scale-inappropriate elements requiring adjustment
3. Recommend version scope modifications for scale alignment
4. Suggest timeline adjustments for feasibility improvement
5. Propose risk mitigation strategies for high-risk versions

**Recommendation Framework**:

**Critical Issues** (Must Address):
- [List scale-inappropriate elements requiring immediate attention]

**Optimization Opportunities** (Should Consider):
- [List improvements for better scale alignment]

**Future Considerations** (Could Enhance):
- [List longer-term optimizations]

**Scale-Appropriate Version Plan Adjustments**:
```
Original Plan Issues:
- [Identify over-scoped versions]
- [Identify under-scoped versions]  
- [Identify timeline unrealism]

Recommended Adjustments:
- Version X: Reduce scope by [specific changes]
- Version Y: Extend timeline by [timeframe] for [reasons]
- Version Z: Add intermediate milestone for [risk mitigation]
```

## Output Format
Create a comprehensive audit report with:
1. Executive Summary (scale-appropriateness verdict)
2. Detailed findings by phase
3. Traceability matrices and scoring results
4. Risk assessment and mitigation recommendations
5. Actionable version plan adjustments
6. Timeline and resource optimization suggestions

## Success Criteria
- All foundational documents analyzed for alignment
- Scale-appropriateness comprehensively assessed
- Version plan feasibility thoroughly evaluated  
- Actionable recommendations provided
- Risk mitigation strategies identified
- Delivery confidence level established

## Post-Completion Recap (MANDATORY)
After completing the versions audit (whether successful or with remaining issues), provide a concise summary:

**Recent Work Recap:**
- Briefly summarize what was just accomplished in this versions audit session
- Highlight key version plan findings and scale-appropriateness assessments
- Note any critical feasibility issues discovered and their resolutions

**Current Project Status:**
- Version plan quality and foundation alignment after the audit
- Current version status and impact on active version-numbered plans
- Any remaining version plan inconsistencies or scale mismatches

**Immediate Next Steps:**
- 2-3 highest priority items revealed by the versions audit
- Any urgent version planning issues requiring attention
- Planned next phase of version plan improvements

Use a measured, sober and constructively critical tone throughout this recap. Avoid salesman language, advertising speak, hype, pump, or exaggerated claims. Focus on factual assessment and practical next steps.

Keep this recap concise (3-5 bullet points each section) but informative for project continuity.

---
*Audit methodology designed for systematic versions plan validation with emphasis on scale-appropriate delivery planning.*