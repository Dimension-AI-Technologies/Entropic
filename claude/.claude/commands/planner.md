---
name: planner
description: Generate hierarchical project plans with status tracking and phase completion sequences
---

Generate a structured project plan using the Planner agent.

**Usage:**
- `/planner use last response` - Create plan from previous conversation context
- `/planner [project description]` - Create plan for specified project

**Output:** 
- Hierarchical numbered phases (1.0, 2.0, 3.0...)
- Nested actionable steps (1.1, 1.2...) and sub-steps (1.1.1, 1.1.2...)
- Red-amber-green status emojis on every line
- Phase-completion sequences with compile/test/commit cycles
- Saves as `Plan.<project.name>.<plan.name>.md` in project root

Execute the Planner agent with the provided instruction to generate a formulaic project plan.