# PolyScript User Guide

**Complete guide for using PolyScript-compliant CLI tools with CRUD × Modes architecture**

## Table of Contents

1. [Understanding PolyScript](#understanding-polyscript)
2. [CRUD Operations](#crud-operations)
3. [Execution Modes](#execution-modes)
4. [The Operation × Mode Matrix](#the-operation-mode-matrix)
5. [Standard Flags](#standard-flags)
6. [Working with JSON Output](#working-with-json-output)
7. [Common Usage Patterns](#common-usage-patterns)
8. [Error Handling](#error-handling)
9. [Automation and Scripting](#automation-and-scripting)
10. [Troubleshooting](#troubleshooting)

## Understanding PolyScript

PolyScript is a behavioral standard that makes CLI tools consistent and predictable. When you see a PolyScript-compliant tool, you know exactly how it works regardless of what language it's written in.

### Core Principles

**CRUD × Modes Architecture**: Implement 4 operations, get 12 behaviors automatically
**Predictable Behavior**: Every PolyScript tool works the same way
**Safety First**: Simulate and sandbox modes prevent accidents  
**Automation Ready**: Consistent JSON output for scripting
**User Friendly**: Standard flags and clear error messages

### Why 9 Framework Languages?

PolyScript supports 9 carefully selected languages (7 complete, 2 planned) that provide **comprehensive coverage without redundancy**:

**✅ All Major Paradigms Covered**
- **Imperative**: Python, PowerShell, Ruby
- **Object-Oriented**: C#, Ruby, Python
- **Functional-First**: F#
- **Pure Functional**: Haskell
- **Systems**: Rust, Go

**✅ All Major Ecosystems Covered**
- **Python** (PyPI): Data science, automation, general scripting
- **Node.js** (npm): Web development, JavaScript ecosystem
- **.NET** (NuGet): Enterprise development via C#/F#
- **Rust** (Cargo): Systems programming, performance-critical tools
- **Go** (modules): Cloud native, DevOps tooling
- **Ruby** (Gems): Web applications, elegant scripting
- **PowerShell** (Gallery): Windows administration
- **Haskell** (Hackage): Academic, financial, type-safe tools

**✅ All Major Use Cases Covered**
- **General Scripting**: Python, Ruby, PowerShell
- **Enterprise Development**: C#, F#, PowerShell
- **Systems Programming**: Rust, Go
- **DevOps/Cloud**: Go, Ruby, Python
- **Web Developers**: Node.js, Ruby
- **Windows Administration**: PowerShell, C#
- **Academic/Research**: Haskell, Python

**✅ Manageable Scope**
- Each language fills a specific niche
- No duplication of capabilities
- Reasonable maintenance burden
- 95%+ of real-world needs covered

Beyond these 9 languages would be **diminishing returns** - adding languages that duplicate existing capabilities rather than filling genuine gaps.

### Recognition

PolyScript tools typically mention "PolyScript-compliant" in their help text:

```bash
$ my-tool --help
PolyScript-compliant backup tool

Usage: my-tool <operation> <resource> [--mode <mode>] [options]

Operations:
  create      Add new resources
  read        Query existing resources
  update      Modify resources
  delete      Remove resources

Modes:
  simulate    Show what would happen (dry-run)
  sandbox     Test prerequisites and validation
  live        Execute actual operations (default)
```

## CRUD Operations

Every PolyScript tool implements four CRUD operations:

### Create Operation

**Purpose**: Add new resources or entities  
**Command**: `tool create <resource> [options]`  
**Modes**: All three modes supported  

```bash
# Create a new backup
$ backup-tool create daily --source /data --dest /backup

# Create with simulation
$ backup-tool create daily --mode simulate

# Create with validation
$ backup-tool create daily --mode sandbox
```

### Read Operation

**Purpose**: Query existing resources or show status  
**Command**: `tool read <resource>` or `tool list`  
**Modes**: Safe by default, mode optional  

```bash
# Read specific backup
$ backup-tool read daily

# List all backups
$ backup-tool list

# Read with JSON output
$ backup-tool read daily --json
```

### Update Operation

**Purpose**: Modify existing resources  
**Command**: `tool update <resource> [options]`  
**Modes**: All three modes supported  

```bash
# Update backup configuration
$ backup-tool update daily --schedule "0 2 * * *"

# Simulate update
$ backup-tool update daily --schedule "0 2 * * *" --mode simulate
```

### Delete Operation

**Purpose**: Remove resources  
**Command**: `tool delete <resource> [options]`  
**Modes**: All three modes supported  

```bash
# Delete backup (with confirmation)
$ backup-tool delete daily

# Delete with force
$ backup-tool delete daily --force

# Simulate deletion
$ backup-tool delete daily --mode simulate
```

## Execution Modes

Every operation (except read) can be executed in three modes:

### Simulate Mode (--mode simulate)

**Purpose**: Show what would happen without making changes  
**Safety**: Completely safe - dry-run execution  
**Use**: Always run before live mode  

```bash
$ backup-tool create daily --mode simulate
Would create backup 'daily' with:
  Source: /data (1.2GB, 450 files)
  Destination: /backup/daily
  Schedule: Daily at 2:00 AM
Note: No changes made in simulate mode
```

### Sandbox Mode (--mode sandbox)

**Purpose**: Test prerequisites and validate environment  
**Safety**: Safe - only tests, no modifications  
**Use**: Troubleshooting and validation  

```bash
$ backup-tool create daily --mode sandbox
Testing prerequisites for create operation...
  ✓ Source directory exists: passed
  ✓ Destination writable: passed  
  ✓ Sufficient disk space: passed
  ✓ Backup tools available: passed
Ready to create backup 'daily'
```

### Live Mode (default)

**Purpose**: Execute actual operations  
**Safety**: **MODIFIES SYSTEM** - use carefully  
**Use**: Only after testing with simulate/sandbox  

```bash
$ backup-tool create daily
Creating backup 'daily'...
Backup created successfully:
  Source: /data
  Destination: /backup/daily
  Next run: Tomorrow at 2:00 AM
```

## The Operation × Mode Matrix

The power of PolyScript comes from the multiplication effect:

```
         | Simulate | Sandbox | Live
---------|----------|---------|------
Create   |    ✓     |    ✓    |  ✓
Read     |    -     |    ✓    |  ✓
Update   |    ✓     |    ✓    |  ✓  
Delete   |    ✓     |    ✓    |  ✓
```

This gives you **12 different behaviors** from just **4 method implementations**:

1. `create --mode simulate` - Show what would be created
2. `create --mode sandbox` - Test if creation is possible
3. `create` - Actually create the resource
4. `read --mode sandbox` - Test read permissions
5. `read` - Read the resource
6. `update --mode simulate` - Show what would change
7. `update --mode sandbox` - Test if update is valid
8. `update` - Actually update the resource
9. `delete --mode simulate` - Show what would be deleted
10. `delete --mode sandbox` - Test if deletion is allowed
11. `delete` - Actually delete the resource
12. `list` - List all resources (alias for read)

## Standard Flags

All PolyScript tools support these flags:

### --json Flag

**Purpose**: Machine-readable output for automation  
**Format**: PolyScript v1.0 JSON standard  
**Use**: Scripting, monitoring, automation  

```bash
$ my-tool status --json | jq '.data.backup_needed'
true

$ my-tool test --json | jq '.data.planned_operations | length'
7
```

### --verbose Flag (short: -v)

**Purpose**: Detailed output and debug information  
**Use**: Troubleshooting, understanding what's happening  

```bash
$ my-tool live --verbose
DEBUG: Checking source directory permissions
DEBUG: Calculating directory size
INFO: Starting backup operation
DEBUG: Copying file 1/450: document.pdf
DEBUG: Copying file 2/450: image.jpg
...
```

### --force Flag (short: -f)

**Purpose**: Skip confirmation prompts  
**Use**: Automation, when you're certain about the operation  
**Warning**: Use carefully - bypasses safety checks  

```bash
# Interactive (default)
$ backup-tool live
Overwrite existing backup? [y/N]: 

# Automated
$ backup-tool live --force
# No prompts - executes immediately
```

## Working with JSON Output

PolyScript's JSON output follows a strict standard for consistency:

### JSON Structure

```json
{
  "polyscript": "1.0",          // Version identifier
  "operation": "create",        // CRUD operation executed
  "mode": "simulate",           // Execution mode used
  "tool": "BackupTool",         // Tool name
  "status": "success",          // "success" or "error"
  "data": {                     // Operation-specific data
    "created": "backup-daily"
  },
  "resource": "daily",          // Resource operated on
  "errors": ["error msg"],      // Error messages (if any)
  "warnings": ["warning"],      // Warnings (if any)
  "messages": ["info msg"]      // Verbose messages (if --verbose)
}
```

### Parsing Examples

**Shell/Bash**:
```bash
# Check if operation succeeded
if [ "$(my-tool status --json | jq -r '.status')" = "success" ]; then
    echo "Tool is ready"
fi

# Get specific data
FILES=$(my-tool status --json | jq '.data.files')
echo "Files to process: $FILES"
```

**Python**:
```python
import json
import subprocess

result = subprocess.run(['my-tool', 'status', '--json'], 
                       capture_output=True, text=True)
data = json.loads(result.stdout)

if data['status'] == 'success':
    print(f"Ready to process {data['data']['files']} files")
```

**PowerShell**:
```powershell
$result = my-tool status --json | ConvertFrom-Json
if ($result.status -eq "success") {
    Write-Host "Files: $($result.data.files)"
}
```

## Common Usage Patterns

### Basic Workflow

**Safe pattern** - always test before executing:
```bash
# 1. Check current state
my-tool read resource-name

# 2. Simulate what would happen
my-tool create resource-name --mode simulate --verbose

# 3. Check environment
my-tool create resource-name --mode sandbox

# 4. Execute if everything looks good
my-tool create resource-name
```

### Automation Workflow

**Scripted pattern** - for automated systems:
```bash
#!/bin/bash

# Check if resource exists
if ! my-tool read resource-name --json | jq -e '.status == "success"' > /dev/null; then
    echo "Resource not found"
    exit 1
fi

# Simulate operation
if ! my-tool update resource-name --mode simulate --json | jq -e '.status == "success"' > /dev/null; then
    echo "Simulation failed"
    exit 1
fi

# Execute with force flag
my-tool update resource-name --force --json
```

### Monitoring Pattern

**Health check** - for monitoring systems:
```bash
# Simple health check
my-tool read system-status --json | jq '.status == "success"'

# Detailed monitoring
my-tool read system-status --mode sandbox --json | jq '.data.all_passed'
```

### Development Pattern

**During development** - understanding tool behavior:
```bash
# Understand what the tool does
my-tool --help
my-tool list --verbose

# Test operations without risk
my-tool create test-resource --mode simulate --verbose
my-tool create test-resource --mode sandbox --verbose

# Check planned operations
my-tool create test-resource --mode simulate --json | jq '.data'
```

## Error Handling

PolyScript tools provide consistent error handling:

### Exit Codes

- **0**: Success
- **1**: Error or failure

### Error Messages

**Console output**:
```bash
$ my-tool live
Error: Source directory does not exist
```

**JSON output**:
```json
{
  "polyscript": "1.0",
  "mode": "live", 
  "tool": "BackupTool",
  "status": "error",
  "data": {},
  "errors": ["Source directory does not exist"]
}
```

### Common Error Scenarios

**Permission errors**:
```bash
$ my-tool sandbox
Testing environment...
  ✗ Destination writable: failed
Error: Insufficient permissions
```

**Missing dependencies**:
```bash
$ my-tool sandbox
Testing environment...
  ✗ Database connection: failed
Error: Cannot connect to database
```

**Invalid inputs**:
```bash
$ my-tool test
Error: Source path '/invalid/path' does not exist
```

## Automation and Scripting

### Shell Scripts

```bash
#!/bin/bash
set -e  # Exit on any error

# Function to run tool operations
run_operation() {
    local operation="$1"
    local resource="$2"
    local mode="${3:-live}"
    local flags="${4:-}"
    
    local cmd="my-tool $operation"
    [ -n "$resource" ] && cmd="$cmd $resource"
    [ "$mode" != "live" ] && cmd="$cmd --mode $mode"
    cmd="$cmd --json $flags"
    
    local result=$($cmd 2>/dev/null)
    local status=$(echo "$result" | jq -r '.status')
    
    if [ "$status" != "success" ]; then
        echo "Error in $operation ($mode):"
        echo "$result" | jq -r '.errors[]'
        exit 1
    fi
    
    echo "$result"
}

# Safe automation workflow
echo "Checking system status..."
STATUS=$(run_operation "read" "system-status")

echo "Simulating operation..."
SIMULATE=$(run_operation "create" "daily-backup" "simulate")

echo "Checking environment..."
SANDBOX=$(run_operation "create" "daily-backup" "sandbox")

echo "Executing operation..."
RESULT=$(run_operation "create" "daily-backup" "live" "--force")

echo "Operation completed successfully"
echo "$RESULT" | jq '.data'
```

### Python Scripts

```python
#!/usr/bin/env python3
import json
import subprocess
import sys

def run_tool(operation, resource=None, mode='live', **kwargs):
    """Run tool with specified operation and mode"""
    cmd = ['my-tool', operation]
    if resource:
        cmd.append(resource)
    if mode != 'live':
        cmd.extend(['--mode', mode])
    cmd.append('--json')
    if kwargs.get('force'):
        cmd.append('--force')
    if kwargs.get('verbose'):
        cmd.append('--verbose')
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Tool failed with exit code {result.returncode}")
        print(result.stderr)
        sys.exit(1)
    
    data = json.loads(result.stdout)
    
    if data['status'] != 'success':
        print(f"Tool reported error in {mode} mode:")
        for error in data.get('errors', []):
            print(f"  - {error}")
        sys.exit(1)
    
    return data

def main():
    # Automated workflow
    print("Checking status...")
    status = run_tool('read', 'system-status')
    print(f"System ready: {status['data'].get('ready', False)}")
    
    print("Simulating operation...")
    simulate = run_tool('create', 'daily-backup', mode='simulate')
    print(f"Would create: {simulate['data']}")
    
    print("Checking environment...")
    sandbox = run_tool('create', 'daily-backup', mode='sandbox')
    if not sandbox['data'].get('prerequisites_met', False):
        print("Environment checks failed!")
        sys.exit(1)
    
    print("Executing operation...")
    result = run_tool('create', 'daily-backup', force=True)
    print(f"Created: {result['data']}")

if __name__ == '__main__':
    main()
```

### PowerShell Scripts

```powershell
#!/usr/bin/env pwsh

function Invoke-ToolOperation {
    param(
        [string]$Operation,
        [string]$Resource,
        [string]$Mode = 'live',
        [switch]$Force,
        [switch]$Verbose
    )
    
    $args = @('my-tool', $Operation)
    if ($Resource) { $args += $Resource }
    if ($Mode -ne 'live') { $args += '--mode', $Mode }
    $args += '--json'
    if ($Force) { $args += '--force' }
    if ($Verbose) { $args += '--verbose' }
    
    $result = & $args[0] $args[1..($args.Length-1)] | ConvertFrom-Json
    
    if ($LASTEXITCODE -ne 0) {
        throw "Tool failed with exit code $LASTEXITCODE"
    }
    
    if ($result.status -ne 'success') {
        $errors = $result.errors -join '; '
        throw "Tool error in $Mode mode: $errors"
    }
    
    return $result
}

# Main workflow
try {
    Write-Host "Checking system status..."
    $status = Invoke-ToolOperation -Operation 'read' -Resource 'system-status'
    Write-Host "Ready: $($status.data.ready)"
    
    Write-Host "Simulating operation..."
    $simulate = Invoke-ToolOperation -Operation 'create' -Resource 'daily-backup' -Mode 'simulate'
    Write-Host "Would create: $($simulate.data.description)"
    
    Write-Host "Checking environment..."
    $sandbox = Invoke-ToolOperation -Operation 'create' -Resource 'daily-backup' -Mode 'sandbox'
    if (-not $sandbox.data.prerequisites_met) {
        throw "Environment checks failed"
    }
    
    Write-Host "Executing operation..."
    $result = Invoke-ToolOperation -Operation 'create' -Resource 'daily-backup' -Force
    Write-Host "Created: $($result.data | ConvertTo-Json -Compress)"
    
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
```

## Troubleshooting

### Common Issues

**Tool doesn't respond**:
```bash
# Check if it's a PolyScript tool
my-tool --help | grep -i polyscript

# Try basic status
my-tool status
```

**JSON output is malformed**:
```bash
# Check for error output mixed with JSON
my-tool status --json 2>/dev/null | jq .

# Use verbose mode to debug
my-tool status --verbose
```

**Permissions issues**:
```bash
# Check what the tool needs
my-tool sandbox --verbose

# Run with appropriate permissions
sudo my-tool sandbox  # If needed
```

**Dependencies missing**:
```bash
# Sandbox mode shows dependency issues
my-tool sandbox

# Example output:
#   ✗ Database connection: failed
#   ✗ Required package: not found
```

### Debug Workflow

1. **Check current resources**:
   ```bash
   my-tool list --verbose
   my-tool read resource-name --verbose
   ```

2. **Simulate operations**:
   ```bash
   my-tool create resource --mode simulate --verbose
   my-tool update resource --mode simulate --verbose
   ```

3. **Check environment**:
   ```bash
   my-tool create resource --mode sandbox --verbose
   ```

4. **Check JSON output**:
   ```bash
   my-tool read resource --json | jq .
   ```

### Getting Help

**Built-in help**:
```bash
my-tool --help                    # General help
my-tool create --help             # Operation-specific help
my-tool create resource --help    # Full context help
```

**Understanding tool behavior**:
```bash
my-tool list --verbose                           # List all resources
my-tool read resource --verbose                  # Resource details
my-tool create resource --mode simulate --verbose # Operation preview
my-tool create resource --mode sandbox --verbose  # Environment check
```

**JSON debugging**:
```bash
# Pretty-print JSON
my-tool status --json | jq .

# Extract specific fields
my-tool status --json | jq '.data'
my-tool status --json | jq '.errors[]'
```

---

**Remember**: The power of PolyScript is CRUD × Modes - write 4 operations, get 12 behaviors! Always use `simulate` mode before executing operations, and `sandbox` mode when troubleshooting issues.