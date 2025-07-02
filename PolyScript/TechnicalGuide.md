# PolyScript Technical Guide

**Complete technical reference for PolyScript framework internals and specifications**

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Framework Implementation](#framework-implementation)
3. [JSON Specification](#json-specification)
4. [Mode Behavioral Contracts](#mode-behavioral-contracts)
5. [Language-Specific Implementations](#language-specific-implementations)
6. [CLI Argument Processing](#cli-argument-processing)
7. [Error Handling Standards](#error-handling-standards)
8. [Performance Considerations](#performance-considerations)
9. [Security Guidelines](#security-guidelines)
10. [Testing and Validation](#testing-and-validation)

## Architecture Overview

### Core Concepts

PolyScript implements a **data-driven behavioral standard** with **language-native instantiations**:

```
User Input → Framework → Business Logic → Structured Output
     ↓           ↓            ↓              ↓
   CLI Args → Mode Router → Tool Methods → JSON/Console
```

### Design Principles

**Behavioral Consistency**: Same interface patterns across all languages  
**Language Optimization**: Each framework uses the best CLI library for its language  
**Zero Boilerplate**: Developers write only business logic  
**Data-Driven Output**: Structured, machine-readable results  

### Component Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CLI Parser    │───▶│   Mode Router    │───▶│ Business Logic  │
│  (Click/Cobra)  │    │  (Framework)     │    │ (User Code)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Standard Flags  │    │ Context Object   │    │ Return Data     │
│ --json --force  │    │ (Mode, Flags)    │    │ (Dict/Object)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                     ┌──────────────────┐    ┌─────────────────┐
                     │ Output Formatter │    │  Exit Handler   │
                     │ (JSON/Console)   │    │ (Exit Codes)    │
                     └──────────────────┘    └─────────────────┘
```

## Framework Implementation

### Base Framework Requirements

Every language framework must implement:

1. **Mode Router**: Route commands to appropriate methods
2. **Context Object**: Provide execution context to business logic
3. **Output Formatter**: Handle JSON and console output
4. **Standard Flags**: Support --json, --verbose, --force
5. **Error Handler**: Consistent error reporting and exit codes

### Interface Contract

```python
# Conceptual interface (syntax varies by language)
class PolyScriptTool:
    def description() -> str: pass           # Tool description
    def add_arguments(parser): pass          # Custom arguments
    def status(context) -> dict: pass        # Status mode implementation
    def test(context) -> dict: pass          # Test mode implementation  
    def sandbox(context) -> dict: pass       # Sandbox mode implementation
    def live(context) -> dict: pass          # Live mode implementation
```

### Context Object Structure

```python
class PolyScriptContext:
    mode: str              # Current execution mode
    verbose: bool          # Verbose flag state
    force: bool            # Force flag state  
    json_output: bool      # JSON output flag state
    tool_name: str         # Name of the current tool
    
    # Methods
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
  "mode": "status|test|sandbox|live",
  "tool": "ToolName", 
  "status": "success|error",
  "data": { /* mode-specific data */ },
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
| `mode` | string | ✅ | Execution mode |
| `tool` | string | ✅ | Tool name/class name |
| `status` | string | ✅ | "success" or "error" |
| `data` | object | ✅ | Mode-specific output data |
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
  "required": ["polyscript", "mode", "tool", "status", "data"],
  "properties": {
    "polyscript": { "enum": ["1.0"] },
    "mode": { "enum": ["status", "test", "sandbox", "live"] },
    "tool": { "type": "string" },
    "status": { "enum": ["success", "error"] },
    "data": { "type": "object" },
    "errors": { "type": "array", "items": { "type": "string" } },
    "warnings": { "type": "array", "items": { "type": "string" } },
    "messages": { "type": "array", "items": { "type": "string" } }
  },
  "additionalProperties": false
}
```

## Mode Behavioral Contracts

### Status Mode Contract

**Purpose**: Display current state  
**Safety**: Read-only, no side effects  
**Performance**: < 1 second typical execution  
**Dependencies**: Minimal  

```python
def status(context) -> dict:
    """
    MUST:
    - Be read-only (no side effects)
    - Return current operational state
    - Execute quickly (< 1 second typical)
    - Not require user interaction
    
    SHOULD:
    - Include version/configuration info
    - Report health/readiness status
    - Show resource availability
    
    RETURNS:
    - operational: bool (is tool ready)
    - version: str (tool version)
    - configuration: dict (current config)
    - resources: dict (resource status)
    """
    return {
        "operational": True,
        "version": "1.0.0", 
        "last_check": "2024-01-01T12:00:00Z",
        "resources": {"disk_space": "available", "network": "connected"}
    }
```

### Test Mode Contract

**Purpose**: Simulate operations  
**Safety**: No side effects  
**Performance**: May take time to analyze  
**Dependencies**: Same as live mode  

```python
def test(context) -> dict:
    """
    MUST:
    - Be safe (no side effects)
    - Show what would happen in live mode
    - Validate inputs and prerequisites
    - Not require user interaction
    
    SHOULD:
    - Estimate impact/duration
    - Show detailed operation plan
    - Validate external dependencies
    
    RETURNS:
    - planned_operations: list (what would be done)
    - estimated_duration: str (time estimate)
    - resources_required: dict (resource needs)
    - note: str ("No changes made in test mode")
    """
    return {
        "planned_operations": [
            {"operation": "backup", "files": 100, "size_mb": 250}
        ],
        "estimated_duration": "30s",
        "resources_required": {"disk_space_mb": 250},
        "note": "No changes made in test mode"
    }
```

### Sandbox Mode Contract

**Purpose**: Test environment and dependencies  
**Safety**: Safe testing only  
**Performance**: May be slow (network/disk tests)  
**Dependencies**: All tool dependencies  

```python
def sandbox(context) -> dict:
    """
    MUST:
    - Test all dependencies
    - Test environment prerequisites  
    - Report all test results
    - Return success/failure status
    
    SHOULD:
    - Test permissions and access
    - Verify external services
    - Check available resources
    - Test network connectivity
    
    RETURNS:
    - dependency_tests: dict (test name -> result)
    - all_passed: bool (overall status)
    - details: dict (additional test info)
    """
    return {
        "dependency_tests": {
            "filesystem": "passed",
            "network": "passed", 
            "database": "failed",
            "permissions": "passed"
        },
        "all_passed": False,
        "failed_tests": ["database"],
        "details": {
            "database": "Connection refused on port 5432"
        }
    }
```

### Live Mode Contract

**Purpose**: Execute actual operations  
**Safety**: **MODIFIES SYSTEM STATE**  
**Performance**: Variable  
**Dependencies**: All tool dependencies  

```python
def live(context) -> dict:
    """
    MUST:
    - Perform real operations
    - Respect --force flag for confirmations
    - Handle errors gracefully
    - Return operation results
    
    SHOULD:
    - Provide progress feedback
    - Be atomic where possible
    - Validate before executing
    - Log important actions
    
    RETURNS:
    - operation: str (what was done)
    - results: dict (operation results)
    - summary: dict (summary statistics)
    """
    return {
        "operation": "backup_completed",
        "source": "/data",
        "destination": "/backup",
        "files_copied": 450,
        "bytes_copied": 1200000000,
        "duration_ms": 28000,
        "status": "completed"
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
    """Decorator that transforms a class into a PolyScript CLI tool"""
    
    @click.group(invoke_without_command=True)
    @click.option('--verbose', '-v', is_flag=True, help='Verbose output')
    @click.option('--force', '-f', is_flag=True, help='Skip confirmations')
    @click.option('--json', 'json_output', is_flag=True, help='JSON output')
    @click.pass_context
    def cli(ctx, verbose, force, json_output):
        if ctx.invoked_subcommand is None:
            # Default to status mode
            ctx.invoke(status, verbose=verbose, force=force, json_output=json_output)
    
    @cli.command()
    @click.option('--verbose', '-v', is_flag=True)
    @click.option('--force', '-f', is_flag=True) 
    @click.option('--json', 'json_output', is_flag=True)
    def status(verbose, force, json_output):
        execute_mode('status', verbose, force, json_output)
    
    # Similar for test, sandbox, live...
    
    def execute_mode(mode, verbose, force, json_output):
        context = PolyScriptContext(mode, verbose, force, json_output)
        tool = cls()
        
        try:
            result = getattr(tool, mode)(context)
            if result:
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
    Status(*PolyScriptContext) (interface{}, error)
    Test(*PolyScriptContext) (interface{}, error)
    Sandbox(*PolyScriptContext) (interface{}, error)
    Live(*PolyScriptContext) (interface{}, error)
}

type PolyScriptContext struct {
    Mode       string
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
tool-name {status|test|sandbox|live} [tool-options] [--json] [--verbose] [--force]
```

### Argument Parsing Order

1. **Mode Selection**: First positional argument or subcommand
2. **Tool-Specific Arguments**: Defined by `add_arguments()` method
3. **Standard Flags**: Processed by framework
4. **Validation**: Check required arguments and combinations

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

### Mode Performance Targets

| Mode | Target Time | Acceptable Maximum |
|------|-------------|-------------------|
| Status | < 1 second | < 5 seconds |
| Test | < 10 seconds | < 60 seconds |
| Sandbox | < 30 seconds | < 120 seconds |
| Live | Variable | User dependent |

### Optimization Strategies

**Status Mode Optimization**:
```python
def status(self, context):
    # Cache expensive operations
    if hasattr(self, '_status_cache'):
        cache_time = time.time() - self._status_cache['timestamp']
        if cache_time < 60:  # Cache for 1 minute
            return self._status_cache['data']
    
    # Perform lightweight checks only
    status_data = {
        "operational": self._quick_health_check(),
        "version": self.get_version(),
        "last_check": datetime.now().isoformat()
    }
    
    # Cache result
    self._status_cache = {
        'data': status_data,
        'timestamp': time.time()
    }
    
    return status_data
```

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
        self.context.mode = 'test'
        self.context.verbose = False
        self.context.force = False
        self.context.json_output = True
    
    def test_status_mode(self):
        """Test status mode returns expected structure"""
        result = self.tool.status(self.context)
        
        self.assertIsInstance(result, dict)
        self.assertIn('operational', result)
        self.assertIn('version', result)
        self.assertIsInstance(result['operational'], bool)
    
    def test_test_mode_no_side_effects(self):
        """Test that test mode makes no changes"""
        original_state = self._capture_system_state()
        
        self.tool.test(self.context)
        
        final_state = self._capture_system_state()
        self.assertEqual(original_state, final_state)
    
    def test_sandbox_mode_dependency_checking(self):
        """Test sandbox mode checks all dependencies"""
        result = self.tool.sandbox(self.context)
        
        self.assertIn('dependency_tests', result)
        self.assertIn('all_passed', result)
        self.assertIsInstance(result['all_passed'], bool)
        
        # Verify all expected dependencies are tested
        expected_deps = ['filesystem', 'network', 'permissions']
        for dep in expected_deps:
            self.assertIn(dep, result['dependency_tests'])
    
    @patch('subprocess.run')
    def test_live_mode_execution(self, mock_subprocess):
        """Test live mode executes operations"""
        mock_subprocess.return_value.returncode = 0
        
        result = self.tool.live(self.context)
        
        self.assertIn('operation', result)
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
    
    def test_all_modes_json_output(self):
        """Test that all modes produce valid JSON"""
        for mode in ['status', 'test', 'sandbox']:
            with self.subTest(mode=mode):
                output = self.run_tool(mode)
                self.assertEqual(output['mode'], mode)
                self.assertEqual(output['status'], 'success')
    
    def test_workflow_sequence(self):
        """Test complete workflow: status -> test -> sandbox -> live"""
        # Status check
        status = self.run_tool('status')
        self.assertTrue(status['data'].get('operational', False))
        
        # Test operations
        test = self.run_tool('test')
        operations = test['data'].get('planned_operations', [])
        self.assertGreater(len(operations), 0)
        
        # Environment check
        sandbox = self.run_tool('sandbox')
        self.assertTrue(sandbox['data'].get('all_passed', False))
        
        # Execute (with force to avoid prompts)
        live = self.run_tool('live', force=True)
        self.assertIn('operation', live['data'])
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

This technical guide provides the complete specification for implementing and maintaining PolyScript-compliant tools. For implementation examples and development guidance, see the [Developer Guide](DeveloperGuide.md).