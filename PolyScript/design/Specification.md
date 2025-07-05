# PolyScript Specification v2.0

## Hardcoded Specification Principles

PolyScript achieves universal consistency through compile-time hardcoded specifications:

1. **Behavioral Contracts**: Operations (CRUD) and modes (Simulate/Sandbox/Live) hardcoded in C++
2. **Compile-Time Validation**: All specifications validated at compile time with `constexpr`
3. **Zero Dependencies**: No external configuration files, JSON parsers, or YAML dependencies
4. **Single Source of Truth**: libpolyscript.hpp contains the complete PolyScript specification
5. **ABI Stability**: C++11+ ensures stable binary interface across all 16 supported languages

Each language wrapper calls libpolyscript functions while maintaining idiomatic CLI patterns.

## Operation Rebadging

Tools expose CRUD operations with domain-specific names through compile-time code configuration:

```cpp
// C++ Example - libpolyscript integration
namespace MyTool {
    constexpr RebadgeMapping REBADGES[] = {
        {"compile", Operation::Create, Mode::Live},
        {"dry-compile", Operation::Create, Mode::Simulate},
        {"status", Operation::Read, Mode::Live},
        {"optimize", Operation::Update, Mode::Live},
        {"clean", Operation::Delete, Mode::Live}
    };
}
```

```csharp
// C# Example - PolyScript.NET integration
[PolyScriptTool]
[Rebadge("compile", "create+live")]
[Rebadge("dry-compile", "create+simulate")]
[Rebadge("status", "read+live")]
public class CompilerTool : IPolyScriptTool
```

This allows natural domain language while maintaining CRUD substrate with compile-time validation.

## CRUD Operations

### Create Operation
- **Purpose**: Add new resources/entities
- **CLI**: `tool create <resource> [options]`
- **Modes**: All three modes supported

### Read Operation  
- **Purpose**: Query existing resources/state
- **CLI**: `tool read <resource> [options]` or `tool list`
- **Modes**: Mode optional (always safe), defaults to live

### Update Operation
- **Purpose**: Modify existing resources
- **CLI**: `tool update <resource> [options]`
- **Modes**: All three modes supported

### Delete Operation
- **Purpose**: Remove resources
- **CLI**: `tool delete <resource> [options]`
- **Modes**: All three modes supported

## Execution Modes

### Simulate Mode (--mode simulate)
- **Purpose**: Show what would happen without making changes
- **Behavior**: Dry-run execution, displays planned actions
- **Applied to**: Create, Update, Delete operations
- **Exit Code**: 0 for valid simulation, 1 for validation failures

### Sandbox Mode (--mode sandbox)
- **Purpose**: Validate prerequisites and test connectivity
- **Behavior**: Test permissions, dependencies, resource availability
- **Applied to**: All operations
- **Exit Code**: 0 for ready environment, 1 for missing prerequisites

### Live Mode (--mode live or default)
- **Purpose**: Execute actual operations
- **Behavior**: Makes real changes, requires confirmation for destructive operations unless --force
- **Applied to**: All operations
- **Exit Code**: 0 for success, 1 for execution failures

## Operation × Mode Matrix

| Operation | Simulate | Sandbox | Live |
|-----------|----------|---------|------|
| **Create** | Show what would be created | Test if creation is possible | Actually create |
| **Read** | Same as live (safe) | Test read permissions | Perform read |
| **Update** | Show what would change | Test if update is valid | Actually update |
| **Delete** | Show what would be deleted | Test if deletion is allowed | Actually delete |

## Standard Flags

### --json
- **Behavior**: Output structured JSON instead of human-readable text
- **Format**: PolyScript v1.0 JSON schema (see JSON Output)
- **Requirement**: All errors and messages routed to JSON structure

### --verbose (-v)
- **Behavior**: Enable debug logging and detailed output
- **JSON Mode**: Add debug messages to "messages" array
- **Text Mode**: Print additional diagnostic information

### --force (-f)
- **Behavior**: Skip confirmation prompts in live mode
- **JSON Mode**: Suppress "confirmation_required" errors
- **Safety**: No effect on status, test, or sandbox modes

## JSON Output Format

### Required Structure
```json
{
  "polyscript": "1.0",
  "operation": "create|read|update|delete",
  "mode": "simulate|sandbox|live", 
  "tool": "ToolClassName",
  "status": "success|failure|error|cancelled",
  "data": {}
}
```

### Optional Fields
```json
{
  "errors": ["error message 1", "error message 2"],
  "warnings": ["warning message 1"],
  "messages": ["info message 1", "debug message 2"],
  "resource": "the resource being operated on",
  "rebadged_as": "compile"  // If operation was called via rebadged name
}
```

### Agent Discovery Format
```json
{
  "polyscript": "1.0",
  "discovery": true,
  "tool": "ToolClassName",
  "operations": {
    "create": ["compile", "build"],
    "read": ["status", "list"],
    "update": ["optimize", "refactor"],
    "delete": ["clean", "purge"]
  },
  "modes": ["simulate", "sandbox", "live"],
  "description": "Tool purpose and capabilities"
}
```

## Command Structure

### Base Command Pattern
```
tool <operation> <resource> [--mode <mode>] [--json] [--verbose] [--force] [options]
```

### Rebadged Command Pattern
```
# If 'compile' is rebadged from 'create+live':
tool compile <resource> [options]

# If 'dry-compile' is rebadged from 'create+simulate':
tool dry-compile <resource> [options]
```

### Discovery Command
```
tool --discover --json    # Returns discovery format for agents
```

### Operation Commands
```
# Create operations
tool create user john --email john@example.com
tool create user john --mode simulate    # Dry-run
tool create user john --mode sandbox     # Test prerequisites

# Read operations (mode optional, always safe)
tool read users
tool list users
tool show user john

# Update operations  
tool update user john --email new@example.com
tool update user john --email new@example.com --mode simulate

# Delete operations
tool delete user john
tool delete user john --mode simulate    # Show what would be deleted
tool delete user john --mode sandbox     # Test if deletion allowed
```

### Default Mode Behavior
- **Read operations**: Default to live (always safe)
- **Create/Update/Delete**: Default to live with confirmation prompt
- **With --force**: Skip confirmation in live mode

## Method Contracts

### Framework Responsibilities
- Parse operation and mode from CLI arguments
- Route to appropriate method implementation
- Handle mode-specific behavior wrapping
- Manage JSON output formatting
- Process standard flags (--json, --verbose, --force)

### Developer Responsibilities
Implement four methods:
```
create(resource, options, context)
read(resource, options, context)
update(resource, options, context)
delete(resource, options, context)
```

### Mode Behavior (Handled by Framework)

#### Simulate Mode
- Framework intercepts operation before execution
- Calls operation with simulation flag
- Ensures no side effects occur
- Formats output as "would do X"

#### Sandbox Mode  
- Framework wraps operation in validation context
- Calls operation with validation flag
- Allows only read operations and tests
- Reports on prerequisites and permissions

#### Live Mode
- Framework allows direct execution
- Handles confirmation prompts (unless --force)
- Executes actual operation
- Returns real results

### Context Object
```
{
  operation: "create|read|update|delete",
  mode: "simulate|sandbox|live",
  resource: "target resource",
  rebadged_as: "compile",  // If called via rebadged name
  options: {/* operation-specific options */},
  flags: {
    json: boolean,
    verbose: boolean,
    force: boolean
  },
  // Helper methods
  log(message, level),
  confirm(prompt),
  output(data),
  // Agent-friendly methods
  can_mutate(): boolean,      // false in simulate/sandbox
  is_safe_mode(): boolean,    // true in simulate/sandbox
  get_capabilities(): object  // returns tool capabilities
}
```

## Error Handling

### Exit Codes
- **0**: Success
- **1**: Operational failure
- **2**: Invalid arguments (handled by CLI library)

### Error Messages
- JSON mode: Route to "errors" array
- Text mode: Print to stderr with "Error:" prefix
- Include actionable information when possible