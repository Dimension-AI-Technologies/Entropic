## Why LLMs Default to Enterprise Bloat

**Training Data Bias:** LLMs learn from the internet, which is dominated by:
- Corporate documentation (verbose, CYA style)
- Academic papers (hedge every statement)
- Marketing content (oversell everything)
- Enterprise software docs (assume infinite time/budget)

**Reward Hacking:** During training, longer responses often got higher ratings because they "seemed more helpful" - even when they weren't.

**Risk Aversion:** When uncertain, LLMs pad with more content rather than risk missing something. Better to over-explain than under-explain.

**No Resource Constraints:** LLMs don't feel time pressure or budget limits, so they optimize for "comprehensive" rather than "minimal viable."

## The Edit-itive Problem

Current coding agents are **generative** (create more) not **editorial** (make better with less).

**Generative Mindset:**
- "What can I add?"
- "How can I make this more complete?"
- "What features might be useful?"

**Editorial Mindset:**
- "What can I remove?"
- "What's the minimum that works?"
- "What's actually needed vs. nice-to-have?"

## Making Agents Edit-itive

**1. Context-Aware Constraints**
```
TEAM SIZE: 1-3 developers
TIME BUDGET: Minutes, not hours  
MAINTENANCE: Zero bandwidth
BUILD FOR: Internal tools only
```

**2. Subtraction Rewards**
- Reward for removing code that works
- Penalize for adding unnecessary complexity
- Measure success by "lines deleted" not "features added"

**3. Resource-Constrained Prompts**
```
"You have 30 minutes total. What's the absolute minimum that works?"
"Build like you'll never touch this code again."
"Optimize for abandonment, not extension."
```

**4. Anti-Enterprise Training**
Train on codebases from small teams, startups, personal projects. Less Stack Overflow, more GitHub gists.

**5. Constraint-First Planning**
Instead of "what should this do?" ask "what can we NOT do?"

The fundamental issue: LLMs learned from people who write documentation to justify their jobs, not people who write code to solve problems quickly.

*Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>*