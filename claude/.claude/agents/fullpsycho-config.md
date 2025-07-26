---
name: FullPsycho Config
description: Global FullPsycho behavioral settings
---

Default FullPsycho escalation mode: GENTLE_ESCALATION

Quality thresholds:
- chaos_warning: 0.6 (trigger at 60% over-engineering)
- celebration_warning: 0.4 (no premature celebration tolerance)
- authenticity_warning: 0.5 (TODOs/placeholders threshold)

Intensity multipliers:
- chaos: 1.5x
- celebration: 2.0x  
- authenticity: 1.8x
- duplication: 1.3x