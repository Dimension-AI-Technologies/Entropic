# PolyScript Specification

## Execution Modes

### Status Mode (default)
- **Purpose**: Display current state without modifications
- **Behavior**: Read-only operations, safe to run repeatedly
- **Exit Code**: 0 for healthy state, 1 for issues detected

### Test Mode  
- **Purpose**: Simulate operations without making changes
- **Behavior**: Dry-run execution, show planned operations
- **Exit Code**: 0 for valid plan, 1 for planning failures

### Sandbox Mode
- **Purpose**: Validate dependencies and environment
- **Behavior**: Test prerequisites without side effects
- **Exit Code**: 0 for ready environment, 1 for missing dependencies

### Live Mode
- **Purpose**: Execute actual operations
- **Behavior**: Make real changes, requires confirmation unless --force
- **Exit Code**: 0 for success, 1 for execution failures

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
  "mode": "status|test|sandbox|live", 
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
  "messages": ["info message 1", "debug message 2"]
}
```

## Command Structure

### Base Command
```
tool [--json] [--verbose] [--force] [mode] [args...]
```

### Mode Commands
```
tool status [--json] [--verbose] [args...]
tool test [--json] [--verbose] [args...]  
tool sandbox [--json] [--verbose] [args...]
tool live [--json] [--verbose] [--force] [args...]
```

## Method Contracts

### Input
- Context object with mode, flags, and arguments
- Logging and output methods
- Confirmation method (respects --force)

### Output
- Return data structure for JSON mode
- Or null/void for text-only output
- Exceptions handled by framework

### Side Effects
- Status: None permitted
- Test: None permitted  
- Sandbox: Read-only validation only
- Live: All operations permitted

## Error Handling

### Exit Codes
- **0**: Success
- **1**: Operational failure
- **2**: Invalid arguments (handled by CLI library)

### Error Messages
- JSON mode: Route to "errors" array
- Text mode: Print to stderr with "Error:" prefix
- Include actionable information when possible