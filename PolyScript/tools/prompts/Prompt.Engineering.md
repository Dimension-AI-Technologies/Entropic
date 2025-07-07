# Engineering Assessment Prompt

## Objective
Review the original Vision, Context, and Requirements documentation to assess if the codebase is appropriately engineered, over-engineered, or under-engineered.

## Instructions

1. **Locate Foundation Documents**
   - Find and read `Vision.*.md` files in Docs/Design/
   - Find and read `Requirements.*.md` files in Docs/Design/
   - Find and read any Context or Architecture documents
   - If these cannot be found, STOP and report their absence

2. **Analyze Engineering Level**
   For each major project/component in the solution, assess:
   
   a) **Under-Engineered** (Missing essential capabilities)
      - Core requirements not implemented
      - Critical error handling absent
      - No tests for key functionality
      - Hardcoded values where configuration needed
   
   b) **Appropriately Engineered** (Meets requirements effectively)
      - Implements stated requirements
      - Has adequate test coverage
      - Handles errors gracefully
      - Configurable where specified
   
   c) **Over-Engineered** (Unnecessary complexity)
      - Abstractions without concrete implementations
      - Interfaces with single implementations
      - Complex patterns for simple problems
      - Features beyond stated requirements

3. **Output Format**
   Create a file named: `Engineering.{SolutionName}.{UTC-DateTime}.md`
   
   Structure:
   ```markdown
   # Engineering Assessment: {SolutionName}
   
   ## Foundation Documents
   - Vision: {Found/Not Found - brief summary if found}
   - Requirements: {Found/Not Found - brief summary if found}
   - Context: {Found/Not Found - brief summary if found}
   
   ## {ProjectName}
   
   ### Under-Engineered
   - {Specific issue with evidence}
   
   ### Appropriately Engineered  
   - {Specific aspect that meets requirements}
   
   ### Over-Engineered
   - {Specific complexity without justification}
   
   ## Classification Summary Table
   
   | Component/Class/Interface | Lines | Under | Appropriate | Over |
   |--------------------------|-------|-------|-------------|------|
   | ComponentName            |  250  |       |      ✓      |      |
   | IInterfaceName          |   45  |   ✓   |             |      |
   | ClassName               | 1,586 |       |             |  ✓   |
   
   ## Detailed Classifications
   
   ### Under-Engineered Components
   
   **ComponentName**
   - Description: One-line description of purpose
   - Classification Reason: Why it's under-engineered
   - Action: What needs to be added/implemented
   
   ### Appropriately Engineered Components
   
   **ComponentName**
   - Description: One-line description of purpose
   - Classification Reason: Why it meets requirements effectively
   - Action: Maintain current implementation
   
   ### Over-Engineered Components
   
   **ComponentName**
   - Description: One-line description of purpose
   - Classification Reason: Why it's over-engineered
   - Action: [Simplify / Delete / Save for Later]
     - Simplify: Reduce to essential functionality
     - Delete: Remove permanently if not needed
     - Save for Later: Keep but ignore until v2.0+
   
   ## Summary
   - Projects needing more work: {list}
   - Projects at right level: {list}
   - Projects needing simplification: {list}
   ```

4. **Guidelines**
   - Be succinct - bullet points, not essays
   - Provide specific examples with file references
   - Focus on alignment with stated requirements
   - Ignore aspirational features not in requirements
   - Consider actual usage patterns in tests/examples

5. **Example Assessment**
   ```
   ## Translator
   
   ### Under-Engineered
   - No retry logic for LLM failures despite requirement REQ-TRANS-004
   - Hardcoded prompt templates (see: TranslatorService.cs:45)
   
   ### Appropriately Engineered
   - Clean separation of concerns via ITranslator interface
   - Comprehensive error handling with Result<T> pattern
   
   ### Over-Engineered
   - IPromptEngineering has 15 methods but only 2 used
   - Complex visitor pattern for simple string replacements
   ```

## Execution
Run this assessment when:
- Before major refactoring efforts
- After implementing new features
- During architecture reviews
- When performance issues arise

The goal is to maintain pragmatic engineering that delivers requirements without unnecessary complexity.