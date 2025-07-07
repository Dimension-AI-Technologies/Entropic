# Compiler Error Analysis and Resolution Prompt

## Purpose
Systematically analyze and resolve all compiler errors in a codebase using root cause analysis and prioritized fixing.

## Instructions

Do a deep root cause analysis of the current compiler errors (whether for code and tests) using SequentialThinking MCP; group them together; order them from greatest impact to smallest; add Todos for fixing these errors in that sorted order; then fix the errors using Sequential Thinking MCP until they are all fixed.

## Detailed Process

### Phase 1: Error Collection and Analysis

1. **Get Current Error Count**
   ```bash
   # For .NET/C# projects:
   dotnet build <solution>.sln 2>&1 | grep -E "error|Error" | wc -l
   
   # For Java/Maven projects:
   mvn compile 2>&1 | grep -E "error|ERROR" | wc -l
   
   # For JavaScript/TypeScript projects:
   npm run build 2>&1 | grep -E "error|Error" | wc -l
   
   # For Python projects:
   python -m py_compile **/*.py 2>&1 | grep -E "error|Error" | wc -l
   ```

2. **Extract Error Patterns**
   ```bash
   # Language-agnostic error pattern extraction
   # Adjust the build command and error patterns based on your language
   
   # Get error codes/types with counts
   <build-command> 2>&1 | grep -oE "error [A-Z0-9]+|Error: [A-Za-z]+" | sort | uniq -c | sort -nr
   
   # Get most common undefined/missing identifiers
   <build-command> 2>&1 | grep -i "undefined\|not defined\|cannot find\|not found" | grep -oE "'[^']+'" | sort | uniq -c | sort -nr | head -10
   ```

3. **Analyze Error Types**
   Common error categories across languages:
   - **Undefined References**: Variable/function/type not defined
   - **Type Mismatches**: Incompatible types in assignment/call
   - **Import/Module Issues**: Missing imports or module errors
   - **Syntax Errors**: Invalid syntax constructs
   - **Access Issues**: Private/protected member access
   - **Signature Mismatches**: Wrong parameters in function calls
   - **Missing Members**: Property/method doesn't exist on type

### Phase 2: Root Cause Grouping

Group errors by their root causes:

1. **Missing Methods/Properties** (Highest Impact)
   - Often caused by interface changes or removed methods
   - Fix: Add missing members or update calls

2. **Type Reference Issues** (High Impact)
   - Missing using directives or namespace changes
   - Fix: Add using directives or fully qualify types

3. **Method Signature Mismatches** (Medium Impact)
   - Parameter types or counts changed
   - Fix: Update method calls to match new signatures

4. **Access Level Issues** (Medium Impact)
   - Private/protected members accessed incorrectly
   - Fix: Change access modifiers or update access patterns

5. **Lambda/Expression Tree Issues** (Low Impact)
   - Optional parameters in expression trees
   - Fix: Remove optional parameters or rewrite expressions

### Phase 3: Prioritized Todo Creation

Create todos ordered by impact (errors fixed per change):

```markdown
[{"id": "fix-highest-impact", "content": "Fix [specific issue] ([X] errors, [Y]%)", "status": "pending", "priority": "high"},
 {"id": "fix-high-impact", "content": "Fix [specific issue] ([X] errors, [Y]%)", "status": "pending", "priority": "high"},
 {"id": "fix-medium-impact", "content": "Fix [specific issue] ([X] errors)", "status": "pending", "priority": "medium"},
 {"id": "fix-low-impact", "content": "Fix [specific issue] ([X] errors)", "status": "pending", "priority": "low"},
 {"id": "verify-build", "content": "Verify build succeeds with 0 errors", "status": "pending", "priority": "low"}]
```

### Phase 4: Systematic Resolution

For each todo item:

1. **Update Status**
   - Mark current todo as "in_progress"

2. **Implement Fix**
   - For missing methods: Use grep/read to understand the correct API
   - For type issues: Add using directives or update type references
   - For signature mismatches: Update all call sites
   - For access issues: Modify access levels or patterns

3. **Verify Progress**
   ```bash
   dotnet build <solution>.sln 2>&1 | grep -E "error|Error" | wc -l
   ```

4. **Update Todo**
   - Mark as "completed" when done
   - Move to next highest priority item

### Phase 5: Final Verification

1. **Ensure Clean Build**
   ```bash
   dotnet build <solution>.sln
   ```

2. **Run Tests** (if requested)
   ```bash
   dotnet test
   ```

3. **Document Results**
   - Initial errors: X
   - Final errors: 0
   - Time taken: Y
   - Key patterns fixed: Z

## Example Usage

```
Using SequentialThinking MCP to analyze 251 errors:

Thought 1: Collecting error patterns...
Thought 2: Grouping by root cause...
Thought 3: Found missing method/function (90 errors, 36%)
Thought 4: Found type reference issues (46 errors, 18%)
Thought 5: Creating prioritized todo list...

Todo list created:
- Fix missing method (90 errors) - HIGH
- Fix type references (46 errors) - HIGH
- Fix parameter mismatches (20 errors) - MEDIUM
...

Starting fixes:
- Fixed missing method: 251 → 161 errors
- Fixed type issues: 161 → 115 errors
- Continue until 0 errors...
```

## Key Principles

1. **Never Stop for Errors** - Fix them immediately
2. **Prioritize by Impact** - Fix issues that resolve the most errors first
3. **Verify Progress** - Check error count after each fix
4. **Track with Todos** - Maintain visibility of progress
5. **Root Cause Analysis** - Fix patterns, not individual instances

## Common Patterns and Solutions

### Pattern: Missing Method/Function
```bash
# Find where method should be defined
grep -r "MethodName" --include="*.{cs,java,js,ts,py}" .

# Common fix: Add missing method or update calls
```

### Pattern: Type/Import Issues
```
// Add missing imports/using statements
// Update type references
// Ensure proper module exports
```

### Pattern: Interface/Contract Changes
```
// Check interface/abstract class definition
// Update all implementations to match
// Verify method signatures align
```

## Success Criteria

- Build completes with 0 errors
- All todos marked as completed
- No regression in functionality
- Clean, maintainable fixes

## Post-Completion Recap (MANDATORY)
After completing the error resolution (whether successful or with remaining issues), provide a concise summary:

**Recent Work Recap:**
- Briefly summarize what was just accomplished in this error resolution session
- Highlight key error patterns fixed and build improvements achieved
- Note any systemic issues discovered and their resolutions

**Current Project Status:**
- Build health status (error count reduction, current compilation status)
- Current version status and impact on active version-numbered plans  
- Any remaining compilation errors or architectural issues

**Immediate Next Steps:**
- 2-3 highest priority items for achieving 0-error builds
- Any urgent architectural issues requiring attention
- Planned next phase of code quality improvements

Use a measured, sober and constructively critical tone throughout this recap. Avoid salesman language, advertising speak, hype, pump, or exaggerated claims. Focus on factual assessment and practical next steps.

Keep this recap concise (3-5 bullet points each section) but informative for project continuity.