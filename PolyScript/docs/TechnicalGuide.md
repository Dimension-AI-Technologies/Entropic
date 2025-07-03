# PolyScript Technical Guide

**Complete technical reference for PolyScript CRUD × Modes framework architecture**

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [CRUD × Modes Matrix](#crud-modes-matrix)
3. [Framework Implementation](#framework-implementation)
4. [JSON Specification](#json-specification)
5. [Operation Contracts](#operation-contracts)
6. [Mode Behavioral Contracts](#mode-behavioral-contracts)
7. [Language-Specific Implementations](#language-specific-implementations)
8. [CLI Argument Processing](#cli-argument-processing)
9. [Error Handling Standards](#error-handling-standards)
10. [Performance Considerations](#performance-considerations)
11. [Security Guidelines](#security-guidelines)
12. [Testing and Validation](#testing-and-validation)

## Architecture Overview

### Core Concepts

PolyScript implements **CRUD Operations × Modal Execution** architecture:

```
User Input → Operation Parser → Mode Wrapper → CRUD Method → Structured Output
     ↓              ↓                ↓              ↓              ↓
   CLI Args → create/read/update/delete → simulate/sandbox/live → Business Logic → JSON/Console
```

### Design Principles

**CRUD × Modes**: Implement 4 operations, get 12 behaviors automatically
**Behavioral Consistency**: Same interface patterns across all languages  
**Language Optimization**: Each framework uses the best CLI library for its language  
**Zero Boilerplate**: Developers write only CRUD business logic  
**Data-Driven Output**: Structured, machine-readable results  

### Component Architecture

```
┌──────────────────┐   ┌──────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  CLI Parser     │──▶│ Operation Parser │──▶│  Mode Wrapper   │──▶│ CRUD Methods    │
│ (Click/Cobra)   │   │ (create/read/...) │   │ (sim/sand/live) │   │ (User Code)     │
└──────────────────┘   └──────────────────┘   └─────────────────┘   └─────────────────┘
         │                       │                       │                      │
         ▼                       ▼                       ▼                      ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Standard Flags  │    │ Context Object   │    │ Mode Behavior   │    │ Return Data     │
│ --mode --json   │    │ (Op, Mode, Res)  │    │ (Wrapping Logic)│    │ (Dict/Object)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └─────────────────┘
                                │                                                  │
                                ▼                                                  ▼
                     ┌──────────────────┐                                ┌─────────────────┐
                     │ Output Formatter │                                │  Exit Handler   │
                     │ (JSON/Console)   │                                │ (Exit Codes)    │
                     └──────────────────┘                                └─────────────────┘
```

## CRUD × Modes Matrix

### The Power of Multiplication

```
         | Simulate | Sandbox | Live
---------|----------|---------|------
Create   |    ✓     |    ✓    |  ✓
Read     |    -     |    ✓    |  ✓
Update   |    ✓     |    ✓    |  ✓  
Delete   |    ✓     |    ✓    |  ✓
```

**Total behaviors from 4 method implementations: 12**

### Matrix Behavior Definitions

| Operation × Mode | Behavior |
|------------------|----------|
| create × simulate | Show what resource would be created |
| create × sandbox | Test if creation is possible |
| create × live | Actually create the resource |
| read × sandbox | Test read permissions/access |
| read × live | Actually read the resource |
| update × simulate | Show what would change |
| update × sandbox | Test if update is valid |
| update × live | Actually update the resource |
| delete × simulate | Show what would be deleted |
| delete × sandbox | Test if deletion is allowed |
| delete × live | Actually delete the resource |

## Framework Implementation

### Base Framework Requirements

Every language framework must implement:

1. **Operation Parser**: Parse CRUD operation from CLI
2. **Mode Parser**: Parse execution mode from --mode flag
3. **Operation Router**: Route to appropriate CRUD method
4. **Mode Wrapper**: Apply mode-specific behavior
5. **Context Object**: Provide operation context to business logic
6. **Output Formatter**: Handle JSON and console output
7. **Standard Flags**: Support --mode, --json, --verbose, --force
8. **Error Handler**: Consistent error reporting and exit codes

### Interface Contract

```python
# Conceptual interface (syntax varies by language)
class PolyScriptTool:
    def description() -> str: pass              # Tool description
    def add_arguments(parser): pass             # Custom arguments
    def create(resource, options, context): pass # Create implementation
    def read(resource, options, context): pass   # Read implementation  
    def update(resource, options, context): pass # Update implementation
    def delete(resource, options, context): pass # Delete implementation
```

### Context Object Structure

```python
class PolyScriptContext:
    operation: str         # CRUD operation (create/read/update/delete)
    mode: str              # Execution mode (simulate/sandbox/live)
    resource: str          # Resource being operated on
    resource_id: str       # Specific resource identifier (optional)
    options: dict          # Operation-specific options
    verbose: bool          # Verbose flag state
    force: bool            # Force flag state  
    json_output: bool      # JSON output flag state
    tool_name: str         # Name of the current tool
    
    # Mode-aware methods
    def can_mutate() -> bool                 # False in simulate/sandbox
    def should_validate() -> bool            # True in sandbox
    def require_confirm() -> bool            # True for destructive ops in live
    
    # Utility methods
    def log(message, level='info')           # Logging
    def output(data, is_error=False)         # Data output
    def confirm(message) -> bool             # User confirmation
    def finalize_output()                    # Complete JSON output
```

## JSON Specification

### PolyScript v1.0 JSON Format

```json
{
  "$schema": "https://polyscript.org/schema/v1.0.json",
  "polyscript": "1.0",
  "operation": "create|read|update|delete",
  "mode": "simulate|sandbox|live",
  "tool": "ToolName", 
  "status": "success|error",
  "data": { /* operation-specific data */ },
  "resource": "resource-name",
  "errors": [ /* array of error strings */ ],
  "warnings": [ /* array of warning strings */ ],
  "messages": [ /* array of info/debug messages */ ],
  "timestamp": "2024-01-01T12:00:00Z",
  "duration_ms": 1234
}
```

### Field Specifications

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `polyscript` | string | ✅ | Version identifier ("1.0") |
| `operation` | string | ✅ | CRUD operation executed |
| `mode` | string | ✅ | Execution mode used |
| `tool` | string | ✅ | Tool name/class name |
| `status` | string | ✅ | "success" or "error" |
| `data` | object | ✅ | Operation-specific output data |
| `resource` | string | ❌ | Resource operated on |
| `errors` | array | ❌ | Error messages (if any) |
| `warnings` | array | ❌ | Warning messages (if any) |
| `messages` | array | ❌ | Verbose/debug messages |
| `timestamp` | string | ❌ | ISO 8601 timestamp |
| `duration_ms` | number | ❌ | Execution time in milliseconds |

### JSON Schema Validation

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["polyscript", "operation", "mode", "tool", "status", "data"],
  "properties": {
    "polyscript": { "enum": ["1.0"] },
    "operation": { "enum": ["create", "read", "update", "delete"] },
    "mode": { "enum": ["simulate", "sandbox", "live"] },
    "tool": { "type": "string" },
    "status": { "enum": ["success", "error"] },
    "data": { "type": "object" },
    "resource": { "type": "string" },
    "errors": { "type": "array", "items": { "type": "string" } },
    "warnings": { "type": "array", "items": { "type": "string" } },
    "messages": { "type": "array", "items": { "type": "string" } }
  },
  "additionalProperties": false
}
```

## Operation Contracts

### Create Operation Contract

**Purpose**: Add new resources or entities  
**Parameters**: resource (what to create), options (creation parameters)  
**Return**: Details about what was created  

```python
def create(self, resource: str, options: dict, context: PolyScriptContext) -> dict:
    """
    MUST:
    - Create the specified resource
    - Return details about what was created
    - Be idempotent where possible
    - Validate inputs before creation
    
    PARAMETERS:
    - resource: The type/name of resource to create
    - options: Creation parameters (varies by tool)
    - context: Execution context with mode info
    
    RETURNS:
    - created: str/dict (what was created)
    - location: str (where it was created)
    - id: str (unique identifier if applicable)
    - metadata: dict (additional creation info)
    """
    # Example: Create a backup
    backup_id = f"backup-{resource}-{timestamp}"
    self.storage.create_backup(backup_id, options)
    
    return {
        "created": backup_id,
        "location": f"/backups/{backup_id}",
        "size": options.get("size", "auto"),
        "timestamp": timestamp
    }
```

### Read Operation Contract

**Purpose**: Query existing resources  
**Parameters**: resource (what to read), options (query parameters)  
**Return**: Resource data or list of resources  

```python
def read(self, resource: str, options: dict, context: PolyScriptContext) -> dict:
    """
    MUST:
    - Be read-only (no side effects)
    - Return requested resource data
    - Handle 'list' as special resource
    - Support filtering via options
    
    PARAMETERS:
    - resource: Resource to read or "list" for all
    - options: Query/filter parameters
    - context: Execution context
    
    RETURNS:
    - data: dict/list (resource data)
    - count: int (for list operations)
    - metadata: dict (query metadata)
    """
    if resource == "list" or not resource:
        # List all resources
        items = self.storage.list_all(options.get("filter"))
        return {
            "items": items,
            "count": len(items),
            "filter": options.get("filter", "none")
        }
    else:
        # Read specific resource
        data = self.storage.get(resource)
        return {
            "resource": resource,
            "data": data,
            "exists": data is not None
        }
```

### Update Operation Contract

**Purpose**: Modify existing resources  
**Parameters**: resource (what to update), options (changes to apply)  
**Return**: Details about what changed  

```python
def update(self, resource: str, options: dict, context: PolyScriptContext) -> dict:
    """
    MUST:
    - Update only specified fields
    - Return what changed
    - Validate resource exists
    - Support partial updates
    
    PARAMETERS:
    - resource: Resource to update
    - options: Fields/values to change
    - context: Execution context
    
    RETURNS:
    - updated: str (resource identifier)
    - changes: dict (what changed)
    - previous: dict (previous values)
    """
    # Get current state
    current = self.storage.get(resource)
    if not current:
        raise ResourceNotFound(f"Resource '{resource}' not found")
    
    # Apply updates
    changes = {}
    previous = {}
    for key, value in options.items():
        if current.get(key) != value:
            previous[key] = current.get(key)
            changes[key] = value
            current[key] = value
    
    self.storage.save(resource, current)
    
    return {
        "updated": resource,
        "changes": changes,
        "previous": previous
    }
```

### Delete Operation Contract

**Purpose**: Remove resources  
**Parameters**: resource (what to delete), options (deletion parameters)  
**Return**: Details about what was deleted  

```python
def delete(self, resource: str, options: dict, context: PolyScriptContext) -> dict:
    """
    MUST:
    - Delete the specified resource
    - Return confirmation of deletion
    - Handle force flag appropriately
    - Support soft delete if applicable
    
    PARAMETERS:
    - resource: Resource to delete
    - options: Deletion options (force, soft, etc)
    - context: Execution context
    
    RETURNS:
    - deleted: str (what was deleted)
    - permanent: bool (hard vs soft delete)
    - backed_up: bool (if backup was made)
    """
    # Verify resource exists
    if not self.storage.exists(resource):
        raise ResourceNotFound(f"Resource '{resource}' not found")
    
    # Backup if not forced
    backed_up = False
    if not options.get("force"):
        self.storage.backup(resource)
        backed_up = True
    
    # Delete
    permanent = not options.get("soft_delete", False)
    if permanent:
        self.storage.delete(resource)
    else:
        self.storage.mark_deleted(resource)
    
    return {
        "deleted": resource,
        "permanent": permanent,
        "backed_up": backed_up
    }
```

## Mode Behavioral Contracts

### Simulate Mode Contract

**Purpose**: Show what would happen without making changes  
**Applied to**: Create, Update, Delete operations  
**Safety**: No side effects allowed  

```python
# Framework handles simulate mode by:
# 1. Intercepting operation before execution
# 2. Running validation and planning logic
# 3. Returning "would" statements
# 4. Ensuring no actual changes occur

# Example framework wrapper:
def simulate_wrapper(operation_func, resource, options, context):
    # Set simulation flag
    context._simulating = True
    
    # Run operation in planning mode
    result = operation_func(resource, options, context)
    
    # Transform result to simulation format
    return {
        "would_execute": context.operation,
        "resource": resource,
        "planned_changes": result,
        "message": f"Would {context.operation} {resource}"
    }
```

### Sandbox Mode Contract

**Purpose**: Test prerequisites and validate environment  
**Applied to**: All operations  
**Safety**: Read-only tests, no modifications  

```python
# Framework handles sandbox mode by:
# 1. Testing operation prerequisites
# 2. Validating permissions and access
# 3. Checking resource availability
# 4. Returning readiness status

# Example framework wrapper:
def sandbox_wrapper(operation_func, resource, options, context):
    tests = {
        "permissions": test_permissions(context.operation, resource),
        "resource_exists": test_resource_exists(resource),
        "dependencies": test_dependencies(context.tool_name),
        "connectivity": test_connectivity()
    }
    
    return {
        "operation": context.operation,
        "resource": resource,
        "tests": tests,
        "ready": all(tests.values()),
        "prerequisites_met": all(tests.values())
    }
```

### Live Mode Contract

**Purpose**: Execute actual operations  
**Applied to**: All operations  
**Safety**: Full system modifications allowed  

```python
# Framework handles live mode by:
# 1. Checking for confirmation (unless --force)
# 2. Executing the actual operation
# 3. Handling errors gracefully
# 4. Returning real results

# Example framework wrapper:
def live_wrapper(operation_func, resource, options, context):
    # Confirm destructive operations
    if context.operation in ["delete", "update"] and not context.force:
        if not context.confirm(f"Really {context.operation} {resource}?"):
            return {"cancelled": True, "reason": "User cancelled"}
    
    # Execute operation
    try:
        result = operation_func(resource, options, context)
        result["executed"] = True
        return result
    except Exception as e:
        return {
            "executed": False,
            "error": str(e),
            "operation": context.operation,
            "resource": resource
        }
```

## Language-Specific Implementations

### Python (Click Framework)

**CLI Library**: Click 8.x  
**Pattern**: Decorator-based  
**Dependencies**: `click`  

```python
import click
from typing import Dict, Any

class PolyScriptContext:
    def __init__(self, mode: str, verbose: bool, force: bool, json_output: bool):
        self.mode = mode
        self.verbose = verbose  
        self.force = force
        self.json_output = json_output
        self.output_data = {
            "polyscript": "1.0",
            "mode": mode,
            "status": "success",
            "data": {}
        }

def polyscript_tool(cls):
    """Decorator that transforms a class into a PolyScript CRUD CLI tool"""
    
    @click.command()
    @click.argument('operation', type=click.Choice(['create', 'read', 'update', 'delete', 'list']))
    @click.argument('resource', required=False, default='')
    @click.option('--mode', type=click.Choice(['simulate', 'sandbox', 'live']), default='live')
    @click.option('--verbose', '-v', is_flag=True, help='Verbose output')
    @click.option('--force', '-f', is_flag=True, help='Skip confirmations')
    @click.option('--json', 'json_output', is_flag=True, help='JSON output')
    @click.pass_context
    def cli(ctx, operation, resource, mode, verbose, force, json_output):
        # Handle 'list' as special case of read
        if operation == 'list':
            operation = 'read'
            resource = 'list'
        
        context = PolyScriptContext(
            operation=operation,
            mode=mode,
            resource=resource,
            verbose=verbose,
            force=force,
            json_output=json_output
        )
        
        tool = cls()
        
        try:
            # Get the CRUD method
            crud_method = getattr(tool, operation)
            
            # Parse additional options from remaining args
            options = parse_options(ctx.args)
            
            # Apply mode wrapper
            if mode == 'simulate' and operation != 'read':
                result = simulate_wrapper(crud_method, resource, options, context)
            elif mode == 'sandbox':
                result = sandbox_wrapper(crud_method, resource, options, context)
            else:
                result = live_wrapper(crud_method, resource, options, context)
            
            context.output_data['data'] = result
            context.finalize_output()
            
        except Exception as e:
            context.output_data['status'] = 'error'
            context.output_data['errors'] = [str(e)]
            context.finalize_output()
            sys.exit(1)
    
    cls.run = cli
    return cls
```

### Go (Cobra Framework)

**CLI Library**: Cobra  
**Pattern**: Interface-based  
**Dependencies**: `github.com/spf13/cobra`  

```go
package polyscript

import (
    "encoding/json"
    "fmt"
    "github.com/spf13/cobra"
)

type PolyScriptTool interface {
    Description() string
    AddArguments(*cobra.Command) *cobra.Command
    Create(resource string, options map[string]interface{}, ctx *PolyScriptContext) (interface{}, error)
    Read(resource string, options map[string]interface{}, ctx *PolyScriptContext) (interface{}, error)
    Update(resource string, options map[string]interface{}, ctx *PolyScriptContext) (interface{}, error)
    Delete(resource string, options map[string]interface{}, ctx *PolyScriptContext) (interface{}, error)
}

type PolyScriptContext struct {
    Operation  string
    Mode       string
    Resource   string
    Verbose    bool
    Force      bool
    JSONOutput bool
    ToolName   string
    OutputData map[string]interface{}
}

func RunTool(tool PolyScriptTool) {
    rootCmd := &cobra.Command{
        Use:   "tool",
        Short: tool.Description(),
        Run: func(cmd *cobra.Command, args []string) {
            executeMode(tool, "status", cmd)
        },
    }
    
    // Add global flags
    rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "Verbose output")
    rootCmd.PersistentFlags().BoolVarP(&force, "force", "f", false, "Skip confirmations")
    rootCmd.PersistentFlags().Bool("json", false, "JSON output")
    
    // Add mode commands
    statusCmd := &cobra.Command{
        Use:   "status",
        Short: "Show current state",
        Run:   func(cmd *cobra.Command, args []string) { executeMode(tool, "status", cmd) },
    }
    
    // Add commands to root
    rootCmd.AddCommand(statusCmd, testCmd, sandboxCmd, liveCmd)
    
    // Let tool add custom arguments
    tool.AddArguments(rootCmd)
    
    rootCmd.Execute()
}

func executeMode(tool PolyScriptTool, mode string, cmd *cobra.Command) {
    verbose, _ := cmd.Flags().GetBool("verbose")
    force, _ := cmd.Flags().GetBool("force")
    jsonOutput, _ := cmd.Flags().GetBool("json")
    
    context := &PolyScriptContext{
        Mode:       mode,
        Verbose:    verbose,
        Force:      force,
        JSONOutput: jsonOutput,
        ToolName:   reflect.TypeOf(tool).Elem().Name(),
        OutputData: map[string]interface{}{
            "polyscript": "1.0",
            "mode":       mode,
            "status":     "success",
            "data":       map[string]interface{}{},
        },
    }
    
    var result interface{}
    var err error
    
    switch mode {
    case "status":
        result, err = tool.Status(context)
    case "test":
        result, err = tool.Test(context)
    case "sandbox":
        result, err = tool.Sandbox(context)
    case "live":
        result, err = tool.Live(context)
    }
    
    if err != nil {
        context.OutputData["status"] = "error"
        context.OutputData["errors"] = []string{err.Error()}
        os.Exit(1)
    }
    
    if result != nil {
        context.OutputData["data"] = result
    }
    
    context.FinalizeOutput()
}
```

### Rust (Clap Framework)

**CLI Library**: Clap 4.x with derive  
**Pattern**: Trait-based with derive macros  
**Dependencies**: `clap`  

```rust
use clap::{Parser, Subcommand};
use serde_json::{json, Value};
use std::collections::HashMap;

#[derive(Parser)]
#[command(name = "polyscript-tool")]
struct CliArgs {
    #[command(subcommand)]
    mode: Option<Mode>,
    
    #[arg(short, long, global = true)]
    verbose: bool,
    
    #[arg(short, long, global = true)]
    force: bool,
    
    #[arg(long, global = true)]
    json: bool,
}

#[derive(Subcommand)]
enum Mode {
    Status,
    Test, 
    Sandbox,
    Live,
}

pub struct PolyScriptContext {
    pub mode: String,
    pub verbose: bool,
    pub force: bool,
    pub json_output: bool,
    pub tool_name: String,
    pub output_data: Value,
}

pub trait PolyScriptTool {
    fn description(&self) -> &str;
    fn status(&self, context: &PolyScriptContext) -> Result<Value, Box<dyn std::error::Error>>;
    fn test(&self, context: &PolyScriptContext) -> Result<Value, Box<dyn std::error::Error>>;
    fn sandbox(&self, context: &PolyScriptContext) -> Result<Value, Box<dyn std::error::Error>>;
    fn live(&self, context: &PolyScriptContext) -> Result<Value, Box<dyn std::error::Error>>;
}

pub fn run_tool<T: PolyScriptTool>(tool: T) -> Result<(), Box<dyn std::error::Error>> {
    let args = CliArgs::parse();
    
    let mode = args.mode.unwrap_or(Mode::Status);
    let mode_str = match mode {
        Mode::Status => "status",
        Mode::Test => "test", 
        Mode::Sandbox => "sandbox",
        Mode::Live => "live",
    };
    
    let context = PolyScriptContext {
        mode: mode_str.to_string(),
        verbose: args.verbose,
        force: args.force,
        json_output: args.json,
        tool_name: std::any::type_name::<T>().to_string(),
        output_data: json!({
            "polyscript": "1.0",
            "mode": mode_str,
            "status": "success",
            "data": {}
        }),
    };
    
    let result = match mode {
        Mode::Status => tool.status(&context),
        Mode::Test => tool.test(&context),
        Mode::Sandbox => tool.sandbox(&context), 
        Mode::Live => tool.live(&context),
    };
    
    match result {
        Ok(data) => {
            if context.json_output {
                let mut output = context.output_data.clone();
                output["data"] = data;
                println!("{}", serde_json::to_string_pretty(&output)?);
            } else {
                // Format for console output
                println!("{}", format_console_output(&data));
            }
            Ok(())
        }
        Err(e) => {
            if context.json_output {
                let error_output = json!({
                    "polyscript": "1.0",
                    "mode": mode_str,
                    "status": "error",
                    "data": {},
                    "errors": [e.to_string()]
                });
                println!("{}", serde_json::to_string_pretty(&error_output)?);
            } else {
                eprintln!("Error: {}", e);
            }
            std::process::exit(1);
        }
    }
}
```

## CLI Argument Processing

### Standard Argument Structure

```
tool-name <operation> <resource> [--mode <mode>] [options] [--json] [--verbose] [--force]
```

Examples:
```bash
tool create user john --email john@example.com
tool read user john --json
tool update user john --email new@example.com --mode simulate
tool delete user john --force
tool list users
```

### Argument Parsing Order

1. **Operation**: First positional argument (create/read/update/delete/list)
2. **Resource**: Second positional argument (what to operate on)
3. **Mode Flag**: --mode flag (simulate/sandbox/live, default: live)
4. **Tool-Specific Options**: Additional flags and parameters
5. **Standard Flags**: --json, --verbose, --force
6. **Validation**: Check required arguments and combinations

### Global Flags Implementation

```python
# Python example using Click
@click.option('--verbose', '-v', is_flag=True, global=True, 
              help='Enable verbose output')
@click.option('--force', '-f', is_flag=True, global=True,
              help='Skip confirmation prompts') 
@click.option('--json', is_flag=True, global=True,
              help='Output in JSON format')
```

### Custom Arguments Integration

```python
def add_arguments(self, parser):
    """Tool-specific argument definition"""
    # Required arguments
    parser.add_argument('source', help='Source directory')
    parser.add_argument('dest', help='Destination directory')
    
    # Optional arguments
    parser.add_argument('--overwrite', action='store_true',
                       help='Overwrite existing files')
    parser.add_argument('--exclude', action='append',
                       help='Exclude patterns (can be used multiple times)')
    
    # Validation
    parser.add_argument('--max-size', type=int, default=1000,
                       help='Maximum file size in MB')
```

## Error Handling Standards

### Error Categories

1. **User Errors**: Invalid arguments, missing files, permissions
2. **System Errors**: Network failures, disk full, service unavailable  
3. **Logic Errors**: Invalid state, assertion failures, unexpected conditions

### Error Response Format

**Console Output**:
```
Error: Source directory '/invalid/path' does not exist
```

**JSON Output**:
```json
{
  "polyscript": "1.0",
  "mode": "live",
  "tool": "BackupTool",
  "status": "error", 
  "data": {},
  "errors": [
    "Source directory '/invalid/path' does not exist"
  ]
}
```

### Exception Handling Pattern

```python
def execute_mode(tool, mode, context):
    try:
        # Execute tool method
        result = getattr(tool, mode)(context)
        
        # Handle successful result
        context.output_data['data'] = result or {}
        context.finalize_output()
        return 0
        
    except PolyScriptError as e:
        # Known PolyScript errors
        context.output_data['status'] = 'error'
        context.output_data['errors'] = [str(e)]
        context.finalize_output()
        return 1
        
    except KeyboardInterrupt:
        # User cancellation
        context.output("Operation cancelled by user", error=True)
        return 1
        
    except Exception as e:
        # Unexpected errors
        context.output_data['status'] = 'error'
        context.output_data['errors'] = [f"Unexpected error: {str(e)}"]
        
        if context.verbose:
            import traceback
            context.output_data['traceback'] = traceback.format_exc()
            
        context.finalize_output()
        return 1
```

### Exit Code Standards

- **0**: Success
- **1**: General error (default for all failures)
- **2**: Misuse of shell builtins (reserved)
- **126**: Command invoked cannot execute (reserved)
- **127**: Command not found (reserved)
- **128+n**: Fatal error signal "n" (reserved)

*Note: PolyScript tools should only use exit codes 0 and 1*

## Performance Considerations

### Framework Overhead

The framework should add minimal overhead to the actual business logic execution. Performance depends entirely on what the CRUD operations actually do - the framework's job is to stay out of the way.

### Optimization Strategies

**Keep Framework Overhead Low**:
- Parse arguments efficiently
- Route to methods directly
- Minimize wrapper logic
- Don't add unnecessary abstractions

**Parallel Execution**:
```python
import asyncio
import concurrent.futures

def sandbox(self, context):
    # Run tests in parallel where possible
    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = {
            'network': executor.submit(self._test_network),
            'filesystem': executor.submit(self._test_filesystem),
            'permissions': executor.submit(self._test_permissions),
        }
        
        results = {}
        for name, future in futures.items():
            try:
                results[name] = future.result(timeout=30)
            except Exception as e:
                results[name] = f"error: {e}"
    
    return {"dependency_tests": results}
```

### Memory Management

**Large Data Handling**:
```python
def live(self, context):
    # Process data in chunks to avoid memory issues
    total_processed = 0
    
    for chunk in self._process_in_chunks(source_data, chunk_size=1000):
        result = self._process_chunk(chunk)
        total_processed += len(chunk)
        
        # Report progress for long operations
        if context.verbose:
            context.log(f"Processed {total_processed} items")
    
    return {"total_processed": total_processed}
```

## Security Guidelines

### Input Validation

```python
def validate_path(self, path):
    """Validate file paths to prevent directory traversal"""
    import os.path
    
    # Resolve path and check if it's within allowed directories
    resolved = os.path.realpath(path)
    
    # Check for directory traversal attempts
    if '..' in path or path.startswith('/'):
        raise PolyScriptError(f"Invalid path: {path}")
    
    return resolved

def validate_filename(self, filename):
    """Validate filenames to prevent injection"""
    import re
    
    # Allow only safe characters
    if not re.match(r'^[a-zA-Z0-9._-]+$', filename):
        raise PolyScriptError(f"Invalid filename: {filename}")
    
    return filename
```

### Command Injection Prevention

```python
def execute_command(self, command, args):
    """Execute external commands safely"""
    import subprocess
    import shlex
    
    # Use subprocess with list arguments (not shell=True)
    cmd = [command] + [shlex.quote(arg) for arg in args]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        raise PolyScriptError(f"Command failed: {e}")
```

### Secrets Handling

```python
def load_config(self):
    """Load configuration without exposing secrets"""
    config = self._load_config_file()
    
    # Redact sensitive fields for status output
    safe_config = config.copy()
    for key in ['password', 'api_key', 'token', 'secret']:
        if key in safe_config:
            safe_config[key] = '***REDACTED***'
    
    return safe_config

def status(self, context):
    return {
        "configuration": self.load_config(),  # Automatically redacted
        "version": self.get_version()
    }
```

## Testing and Validation

### Unit Testing Framework

```python
import unittest
from unittest.mock import Mock, patch

class TestPolyScriptTool(unittest.TestCase):
    def setUp(self):
        self.tool = MyTool()
        self.context = Mock()
        self.context.operation = 'create'
        self.context.mode = 'simulate'
        self.context.resource = 'test-resource'
        self.context.verbose = False
        self.context.force = False
        self.context.json_output = True
    
    def test_create_operation(self):
        """Test create operation returns expected structure"""
        result = self.tool.create('test-item', {}, self.context)
        
        self.assertIsInstance(result, dict)
        self.assertIn('created', result)
        self.assertEqual(result['created'], 'test-item')
    
    def test_read_operation(self):
        """Test read operation is side-effect free"""
        result = self.tool.read('test-item', {}, self.context)
        
        self.assertIsInstance(result, dict)
        self.assertIn('data', result)
    
    def test_update_operation(self):
        """Test update operation returns changes"""
        options = {'field': 'new-value'}
        result = self.tool.update('test-item', options, self.context)
        
        self.assertIn('updated', result)
        self.assertIn('changes', result)
        self.assertEqual(result['changes']['field'], 'new-value')
    
    def test_delete_operation(self):
        """Test delete operation returns confirmation"""
        result = self.tool.delete('test-item', {}, self.context)
        
        self.assertIn('deleted', result)
        self.assertEqual(result['deleted'], 'test-item')
    
    def test_simulate_mode_no_side_effects(self):
        """Test that simulate mode makes no changes"""
        self.context.mode = 'simulate'
        original_state = self._capture_system_state()
        
        # Should work for create, update, delete
        for operation in ['create', 'update', 'delete']:
            self.context.operation = operation
            getattr(self.tool, operation)('resource', {}, self.context)
        
        final_state = self._capture_system_state()
        self.assertEqual(original_state, final_state)
    
    def test_sandbox_mode_validation(self):
        """Test sandbox mode validates prerequisites"""
        self.context.mode = 'sandbox'
        
        # Should return validation results
        result = self.tool.create('test-item', {}, self.context)
        self.assertIn('prerequisites_met', result)
    
    @patch('subprocess.run')
    def test_live_mode_execution(self, mock_subprocess):
        """Test live mode executes operations"""
        self.context.mode = 'live'
        mock_subprocess.return_value.returncode = 0
        
        result = self.tool.create('test-item', {}, self.context)
        
        self.assertIn('created', result)
        self.assertTrue(mock_subprocess.called)
```

### Integration Testing

```python
import subprocess
import json
import tempfile
import os

class TestPolyScriptIntegration(unittest.TestCase):
    def setUp(self):
        self.tool_path = 'path/to/my-tool'
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def run_tool(self, mode, **kwargs):
        """Helper to run tool and return parsed JSON output"""
        cmd = [self.tool_path, mode, '--json']
        
        if kwargs.get('verbose'):
            cmd.append('--verbose')
        if kwargs.get('force'):
            cmd.append('--force')
        
        # Add any additional arguments
        for key, value in kwargs.items():
            if key not in ['verbose', 'force']:
                cmd.extend([f'--{key}', str(value)])
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        self.assertEqual(result.returncode, 0, 
                        f"Tool failed: {result.stderr}")
        
        output = json.loads(result.stdout)
        self.validate_json_structure(output)
        
        return output
    
    def validate_json_structure(self, output):
        """Validate JSON output follows PolyScript v1.0 spec"""
        required_fields = ['polyscript', 'mode', 'tool', 'status', 'data']
        
        for field in required_fields:
            self.assertIn(field, output, f"Missing required field: {field}")
        
        self.assertEqual(output['polyscript'], '1.0')
        self.assertIn(output['mode'], ['status', 'test', 'sandbox', 'live'])
        self.assertIn(output['status'], ['success', 'error'])
    
    def test_crud_operations_json_output(self):
        """Test that all CRUD operations produce valid JSON"""
        for operation in ['create', 'read', 'update', 'delete']:
            with self.subTest(operation=operation):
                output = self.run_tool(operation, 'test-resource')
                self.assertEqual(output['operation'], operation)
                self.assertEqual(output['status'], 'success')
    
    def test_mode_variations(self):
        """Test all operation × mode combinations"""
        operations = ['create', 'read', 'update', 'delete']
        modes = ['simulate', 'sandbox', 'live']
        
        for operation in operations:
            for mode in modes:
                # Skip read × simulate (not supported)
                if operation == 'read' and mode == 'simulate':
                    continue
                    
                with self.subTest(operation=operation, mode=mode):
                    output = self.run_tool(operation, 'test-resource', mode=mode)
                    self.assertEqual(output['operation'], operation)
                    self.assertEqual(output['mode'], mode)
                    self.assertEqual(output['status'], 'success')
    
    def test_workflow_sequence(self):
        """Test complete workflow: read -> create -> update -> delete"""
        # Check if resource exists
        read = self.run_tool('read', 'test-resource')
        exists = read['data'].get('exists', False)
        
        # Simulate creation
        create_sim = self.run_tool('create', 'test-resource', mode='simulate')
        self.assertIn('would_execute', create_sim['data'])
        
        # Test prerequisites
        create_sandbox = self.run_tool('create', 'test-resource', mode='sandbox')
        self.assertTrue(create_sandbox['data'].get('prerequisites_met', False))
        
        # Actually create
        create_live = self.run_tool('create', 'test-resource', force=True)
        self.assertIn('created', create_live['data'])
        
        # Update the resource
        update = self.run_tool('update', 'test-resource', force=True)
        self.assertIn('updated', update['data'])
        
        # Delete the resource
        delete = self.run_tool('delete', 'test-resource', force=True)
        self.assertIn('deleted', delete['data'])
```

### PolyScript Validator Integration

```bash
#!/bin/bash
# Automated validation script

TOOL_PATH="./my-tool"

echo "Running PolyScript validation..."

# Use the official PolyScript validator
python3 polyscript_validator.py "$TOOL_PATH"

if [ $? -eq 0 ]; then
    echo "✅ PolyScript validation passed"
else
    echo "❌ PolyScript validation failed"
    exit 1
fi

# Run comprehensive tests
echo "Running integration tests..."
python3 -m pytest test_integration.py -v

echo "All tests completed"
```

---

## Summary: The Power of CRUD × Modes

The key innovation of PolyScript is the **multiplication effect**:

- **4 Methods** (Create, Read, Update, Delete)
- **3 Modes** (Simulate, Sandbox, Live)
- **= 12 Behaviors** automatically

Developers write only the CRUD business logic. The framework handles:
- Mode-specific behavior wrapping
- CLI argument parsing and routing
- JSON output formatting
- Error handling and exit codes
- Confirmation prompts and safety checks

This technical guide provides the complete specification for implementing and maintaining PolyScript-compliant tools with CRUD × Modes architecture. For implementation examples and development guidance, see the [Developer Guide](DeveloperGuide.md).