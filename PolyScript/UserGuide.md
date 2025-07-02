# PolyScript User Guide

**Complete guide for using PolyScript-compliant CLI tools**

## Table of Contents

1. [Understanding PolyScript](#understanding-polyscript)
2. [The Four Modes](#the-four-modes) 
3. [Standard Flags](#standard-flags)
4. [Working with JSON Output](#working-with-json-output)
5. [Common Usage Patterns](#common-usage-patterns)
6. [Error Handling](#error-handling)
7. [Automation and Scripting](#automation-and-scripting)
8. [Troubleshooting](#troubleshooting)

## Understanding PolyScript

PolyScript is a behavioral standard that makes CLI tools consistent and predictable. When you see a PolyScript-compliant tool, you know exactly how it works regardless of what language it's written in.

### Core Principles

**Predictable Behavior**: Every PolyScript tool works the same way
**Safety First**: Test operations before executing them  
**Automation Ready**: Consistent JSON output for scripting
**User Friendly**: Standard flags and clear error messages

### Recognition

PolyScript tools typically mention "PolyScript-compliant" in their help text:

```bash
$ my-tool --help
PolyScript-compliant backup tool

Usage: my-tool {status|test|sandbox|live} [options]
```

## The Four Modes

Every PolyScript tool implements exactly four execution modes:

### Status Mode (Default)

**Purpose**: Show current state without making any changes  
**Safety**: Completely safe - never modifies anything  
**Speed**: Usually fast (< 1 second)  

```bash
# These are equivalent
$ my-tool
$ my-tool status
```

**What you see**:
```bash
$ backup-tool status
Source: /data (exists, 1.2GB, 450 files)
Destination: /backup (exists, 1.1GB, 445 files) 
Backup needed: Yes (5 new files)
```

**With JSON**:
```bash
$ backup-tool status --json
{
  "polyscript": "1.0",
  "mode": "status",
  "tool": "BackupTool", 
  "status": "success",
  "data": {
    "source": {"exists": true, "size_bytes": 1200000000, "files": 450},
    "destination": {"exists": true, "size_bytes": 1100000000, "files": 445},
    "backup_needed": true
  }
}
```

### Test Mode (Dry Run)

**Purpose**: Simulate operations without making changes  
**Safety**: Completely safe - shows what WOULD happen  
**Use**: Always run before `live` mode  

```bash
$ my-tool test
$ my-tool test --verbose
```

**What you see**:
```bash
$ backup-tool test
Would backup 5 new files (100MB)
Would update 2 existing files (50MB)
Total: 7 operations, 150MB, estimated 30 seconds
Note: No changes made in test mode
```

### Sandbox Mode (Environment Check)

**Purpose**: Test that dependencies and environment are working  
**Safety**: Safe - only tests, doesn't modify data  
**Use**: Troubleshooting and validation  

```bash
$ my-tool sandbox
$ my-tool sandbox --json
```

**What you see**:
```bash
$ backup-tool sandbox
Testing environment...
  ✓ Source readable: passed
  ✓ Destination writable: passed  
  ✓ Sufficient disk space: passed
  ✓ Filesystem access: passed
All tests passed
```

### Live Mode (Actual Execution)

**Purpose**: Execute actual operations  
**Safety**: **MODIFIES SYSTEM** - use carefully  
**Use**: Only after testing with `test` and `sandbox` modes  

```bash
$ my-tool live
$ my-tool live --force    # Skip confirmations
```

**What you see**:
```bash
$ backup-tool live
Destination /backup exists. Overwrite? [y/N]: y
Starting backup from /data to /backup
Backup completed: 450 files, 1.2GB, 28 seconds
```

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
  "mode": "status",             // Which mode was executed
  "tool": "BackupTool",         // Tool name
  "status": "success",          // "success" or "error"
  "data": {                     // Mode-specific data
    "operational": true
  },
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
my-tool status

# 2. Test what would happen
my-tool test --verbose

# 3. Check environment
my-tool sandbox

# 4. Execute if everything looks good
my-tool live
```

### Automation Workflow

**Scripted pattern** - for automated systems:
```bash
#!/bin/bash

# Check if tool is ready
if ! my-tool status --json | jq -e '.data.ready' > /dev/null; then
    echo "Tool not ready"
    exit 1
fi

# Test operation
if ! my-tool test --json | jq -e '.status == "success"' > /dev/null; then
    echo "Test failed"
    exit 1
fi

# Execute with force flag
my-tool live --force --json
```

### Monitoring Pattern

**Health check** - for monitoring systems:
```bash
# Simple health check
my-tool status --json | jq '.status == "success"'

# Detailed monitoring
my-tool sandbox --json | jq '.data.all_passed'
```

### Development Pattern

**During development** - understanding tool behavior:
```bash
# Understand what the tool does
my-tool --help
my-tool status --verbose
my-tool test --verbose
my-tool sandbox --verbose

# Test without risk
my-tool test --json | jq '.data.planned_operations'
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

# Function to check JSON status
check_status() {
    local result=$(my-tool "$1" --json 2>/dev/null)
    local status=$(echo "$result" | jq -r '.status')
    
    if [ "$status" != "success" ]; then
        echo "Error in $1 mode:"
        echo "$result" | jq -r '.errors[]'
        exit 1
    fi
    
    echo "$result"
}

# Safe automation workflow
echo "Checking tool status..."
STATUS=$(check_status "status")

echo "Testing operation..."
TEST=$(check_status "test")

echo "Checking environment..."
SANDBOX=$(check_status "sandbox")

echo "Executing operation..."
RESULT=$(check_status "live --force")

echo "Operation completed successfully"
echo "$RESULT" | jq '.data'
```

### Python Scripts

```python
#!/usr/bin/env python3
import json
import subprocess
import sys

def run_tool(mode, **kwargs):
    """Run tool in specified mode and return parsed JSON"""
    cmd = ['my-tool', mode, '--json']
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
    status = run_tool('status')
    print(f"Ready: {status['data'].get('ready', False)}")
    
    print("Testing operation...")
    test = run_tool('test')
    ops = len(test['data'].get('planned_operations', []))
    print(f"Planned operations: {ops}")
    
    print("Checking environment...")
    sandbox = run_tool('sandbox')
    if not sandbox['data'].get('all_passed', False):
        print("Environment checks failed!")
        sys.exit(1)
    
    print("Executing operation...")
    result = run_tool('live', force=True)
    print(f"Completed: {result['data']}")

if __name__ == '__main__':
    main()
```

### PowerShell Scripts

```powershell
#!/usr/bin/env pwsh

function Invoke-ToolMode {
    param(
        [string]$Mode,
        [switch]$Force,
        [switch]$Verbose
    )
    
    $args = @('my-tool', $Mode, '--json')
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
    Write-Host "Checking status..."
    $status = Invoke-ToolMode -Mode 'status'
    Write-Host "Ready: $($status.data.ready)"
    
    Write-Host "Testing operation..."
    $test = Invoke-ToolMode -Mode 'test'
    Write-Host "Operations: $($test.data.planned_operations.Count)"
    
    Write-Host "Checking environment..."
    $sandbox = Invoke-ToolMode -Mode 'sandbox'
    if (-not $sandbox.data.all_passed) {
        throw "Environment checks failed"
    }
    
    Write-Host "Executing operation..."
    $result = Invoke-ToolMode -Mode 'live' -Force
    Write-Host "Completed: $($result.data | ConvertTo-Json -Compress)"
    
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

1. **Start with status mode**:
   ```bash
   my-tool status --verbose
   ```

2. **Check environment**:
   ```bash
   my-tool sandbox --verbose
   ```

3. **Test operations**:
   ```bash
   my-tool test --verbose
   ```

4. **Check JSON output**:
   ```bash
   my-tool status --json | jq .
   ```

### Getting Help

**Built-in help**:
```bash
my-tool --help           # General help
my-tool status --help    # Mode-specific help
```

**Understanding tool behavior**:
```bash
my-tool status --verbose    # Current state details
my-tool test --verbose      # Operation preview
my-tool sandbox --verbose   # Environment details
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

**Remember**: Always use `test` mode before `live` mode, and `sandbox` mode when troubleshooting issues!