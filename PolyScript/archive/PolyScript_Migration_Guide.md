# PolyScript Migration Guide

A comprehensive guide for converting existing CLI tools to PolyScript-compliant implementations.

**Author:** Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>

## Table of Contents

1. [Introduction](#introduction)
2. [Assessment Phase](#assessment-phase)
3. [Before and After Example](#before-and-after-example)
4. [Step-by-Step Migration Process](#step-by-step-migration-process)
5. [Common Patterns](#common-patterns)
6. [Pitfalls and Solutions](#pitfalls-and-solutions)
7. [Testing Strategy](#testing-strategy)
8. [Migration Checklist](#migration-checklist)

## Introduction

PolyScript is a behavioral standard for CLI tools that provides:

- **Four standardized execution modes**: status, test, sandbox, live
- **Consistent argument structure**: --mode, --verbose, --force, --json
- **Standardized JSON output format**: Compatible across all tools
- **Predictable behavior**: Users know what to expect from any PolyScript tool
- **Better automation support**: Consistent interfaces for scripting

### When to Migrate

Consider migrating your CLI tool to PolyScript if:

- Users need to test operations before execution
- The tool modifies system state or external resources
- You want consistent behavior across a suite of tools
- Integration with automation systems is important
- Users benefit from dry-run capabilities

## Assessment Phase

### 1. Analyze Current Tool Behavior

Before migration, understand your tool's current functionality:

```bash
# Document current behavior
./your-tool --help
./your-tool [typical usage]
./your-tool [edge cases]
```

### 2. Map Functionality to PolyScript Modes

| Mode | Purpose | Your Tool's Equivalent |
|------|---------|----------------------|
| **status** | Show current state | Status checks, configuration display |
| **test** | Simulate operations | Dry-run, preview, validation |
| **sandbox** | Test dependencies | Environment checks, prerequisite validation |
| **live** | Execute operations | Actual tool operation |

### 3. Identify Required Changes

- Current argument structure vs. PolyScript standard
- Output format standardization needs
- Error handling improvements
- Confirmation prompt locations

## Before and After Example

Let's migrate a simple backup tool from traditional CLI to PolyScript.

### BEFORE: Traditional CLI Tool

```python
#!/usr/bin/env python3
"""
Traditional backup tool - single mode operation
"""
import argparse
import os
import shutil
import sys

def main():
    parser = argparse.ArgumentParser(description="Backup files")
    parser.add_argument("source", help="Source directory")
    parser.add_argument("dest", help="Destination directory")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be copied")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.source):
        print(f"Error: Source {args.source} does not exist", file=sys.stderr)
        return 1
    
    if args.dry_run:
        print(f"Would copy {args.source} to {args.dest}")
        return 0
    
    try:
        shutil.copytree(args.source, args.dest)
        print(f"Backed up {args.source} to {args.dest}")
        return 0
    except Exception as e:
        print(f"Backup failed: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
```

**Issues with traditional approach:**
- Single mode of operation
- Inconsistent output format
- No JSON support
- Limited error handling
- No dependency checking
- Mixed success/error reporting

### AFTER: PolyScript-Compliant Tool

```python
#!/usr/bin/env python3
"""
PolyScript-compliant backup tool
"""
import os
import shutil
import sys
from pathlib import Path

from polyscript import PolyScriptBase

class BackupTool(PolyScriptBase):
    """PolyScript-compliant file backup tool"""
    
    def get_description(self) -> str:
        return """PolyScript File Backup Tool
        
Backs up directories with full PolyScript mode support.
Provides status checking, dry-run testing, dependency validation,
and live backup operations."""
    
    def add_arguments(self, parser):
        parser.add_argument("source", help="Source directory to backup")
        parser.add_argument("dest", help="Destination directory")
        parser.add_argument("--overwrite", action="store_true", 
                          help="Overwrite existing destination")
    
    def execute_status(self) -> int:
        """Show backup status and source/destination info"""
        source = Path(self.args.source)
        dest = Path(self.args.dest)
        
        status_data = {
            "source": {
                "path": str(source),
                "exists": source.exists(),
                "size_bytes": self._get_dir_size(source) if source.exists() else 0,
                "file_count": self._get_file_count(source) if source.exists() else 0
            },
            "destination": {
                "path": str(dest),
                "exists": dest.exists(),
                "size_bytes": self._get_dir_size(dest) if dest.exists() else 0,
                "would_overwrite": dest.exists() and not self.args.overwrite
            },
            "backup_needed": source.exists() and (not dest.exists() or self.args.overwrite)
        }
        
        self.output(status_data)
        
        if not source.exists():
            self.output("Source directory does not exist", error=True)
            return 1
        
        return 0
    
    def execute_test(self) -> int:
        """Test mode - show what would be backed up"""
        source = Path(self.args.source)
        dest = Path(self.args.dest)
        
        if not source.exists():
            self.output("Source directory does not exist", error=True)
            return 1
        
        operations = []
        
        # Plan the backup operation
        if dest.exists() and not self.args.overwrite:
            operations.append({
                "operation": "skip",
                "reason": "destination exists and --overwrite not specified",
                "source": str(source),
                "destination": str(dest)
            })
        else:
            operations.append({
                "operation": "backup",
                "source": str(source),
                "destination": str(dest),
                "file_count": self._get_file_count(source),
                "size_bytes": self._get_dir_size(source),
                "would_overwrite": dest.exists()
            })
        
        test_data = {
            "planned_operations": operations,
            "total_files": sum(op.get("file_count", 0) for op in operations),
            "total_size": sum(op.get("size_bytes", 0) for op in operations)
        }
        
        self.output(test_data)
        self.output("No changes made in test mode")
        return 0
    
    def execute_sandbox(self) -> int:
        """Sandbox mode - test environment and dependencies"""
        tests = {
            "filesystem_access": "unknown",
            "source_readable": "unknown", 
            "destination_writable": "unknown",
            "sufficient_space": "unknown"
        }
        
        all_passed = True
        
        # Test source readability
        try:
            source = Path(self.args.source)
            if source.exists() and os.access(source, os.R_OK):
                tests["source_readable"] = "passed"
            else:
                tests["source_readable"] = "failed"
                all_passed = False
        except Exception:
            tests["source_readable"] = "error"
            all_passed = False
        
        # Test destination writability
        try:
            dest = Path(self.args.dest)
            dest_parent = dest.parent
            if dest_parent.exists() and os.access(dest_parent, os.W_OK):
                tests["destination_writable"] = "passed"
            else:
                tests["destination_writable"] = "failed"
                all_passed = False
        except Exception:
            tests["destination_writable"] = "error"
            all_passed = False
        
        # Test filesystem access
        try:
            import tempfile
            with tempfile.NamedTemporaryFile():
                tests["filesystem_access"] = "passed"
        except Exception:
            tests["filesystem_access"] = "failed"
            all_passed = False
        
        # Test disk space (simplified)
        try:
            source = Path(self.args.source)
            if source.exists():
                source_size = self._get_dir_size(source)
                dest_parent = Path(self.args.dest).parent
                if dest_parent.exists():
                    free_space = shutil.disk_usage(dest_parent).free
                    if free_space > source_size * 1.1:  # 10% buffer
                        tests["sufficient_space"] = "passed"
                    else:
                        tests["sufficient_space"] = "failed"
                        all_passed = False
                else:
                    tests["sufficient_space"] = "unknown"
        except Exception:
            tests["sufficient_space"] = "error"
            all_passed = False
        
        sandbox_data = {
            "dependency_tests": tests,
            "all_passed": all_passed
        }
        
        self.output(sandbox_data)
        
        if not all_passed:
            self.output("Some dependency tests failed", error=True)
            return 1
        
        self.output("All dependency tests passed")
        return 0
    
    def execute_live(self) -> int:
        """Live mode - perform actual backup"""
        source = Path(self.args.source)
        dest = Path(self.args.dest)
        
        if not source.exists():
            self.output("Source directory does not exist", error=True)
            return 1
        
        # Check for overwrite
        if dest.exists() and not self.args.overwrite:
            if not self.confirm(f"Destination {dest} exists. Overwrite?"):
                self.output("Backup cancelled")
                return 1
        
        try:
            # Remove destination if it exists and we're overwriting
            if dest.exists():
                shutil.rmtree(dest)
            
            # Perform backup
            self.log(f"Starting backup from {source} to {dest}")
            shutil.copytree(source, dest)
            
            # Report results
            result_data = {
                "operation": "backup",
                "source": str(source),
                "destination": str(dest),
                "files_copied": self._get_file_count(dest),
                "bytes_copied": self._get_dir_size(dest)
            }
            
            self.output(result_data)
            self.output(f"Successfully backed up {source} to {dest}")
            return 0
            
        except Exception as e:
            self.output(f"Backup failed: {e}", error=True)
            return 1
    
    def _get_dir_size(self, path: Path) -> int:
        """Calculate directory size in bytes"""
        if not path.exists():
            return 0
        
        total = 0
        try:
            for item in path.rglob("*"):
                if item.is_file():
                    total += item.stat().st_size
        except (OSError, PermissionError):
            pass
        return total
    
    def _get_file_count(self, path: Path) -> int:
        """Count files in directory"""
        if not path.exists():
            return 0
        
        count = 0
        try:
            for item in path.rglob("*"):
                if item.is_file():
                    count += 1
        except (OSError, PermissionError):
            pass
        return count

def main():
    tool = BackupTool()
    sys.exit(tool.run())

if __name__ == "__main__":
    main()
```

**Improvements with PolyScript:**
- Four distinct operational modes
- Consistent JSON output structure
- Proper error handling and exit codes
- Dependency checking in sandbox mode
- Confirmation prompts with --force bypass
- Standardized argument structure

## Step-by-Step Migration Process

### Phase 1: Assessment and Planning

1. **Document Current Behavior**
   ```bash
   # Test all current functionality
   ./your-tool --help
   ./your-tool [various arguments]
   # Document output formats, exit codes, error handling
   ```

2. **Map to PolyScript Modes**
   - **Status**: What state information can you show?
   - **Test**: What can be simulated or previewed?
   - **Sandbox**: What dependencies/prerequisites exist?
   - **Live**: What is the actual operation?

3. **Plan Mode Behaviors**
   ```python
   # Example planning notes
   """
   STATUS MODE:
   - Show configuration status
   - Display resource availability
   - Report current state
   
   TEST MODE:
   - Dry-run operations
   - Show planned changes
   - Validate inputs
   
   SANDBOX MODE:
   - Check dependencies
   - Verify permissions
   - Test connectivity
   
   LIVE MODE:
   - Execute actual operations
   - Apply changes
   - Report results
   """
   ```

### Phase 2: Framework Integration

1. **Install PolyScript Base**
   ```bash
   # Ensure polyscript.py is available
   cp /path/to/polyscript.py ./
   ```

2. **Update Tool Structure**
   ```python
   from polyscript import PolyScriptBase
   
   class YourTool(PolyScriptBase):
       def get_description(self) -> str:
           return """Your Tool Description
           
   Multi-line description explaining what your tool does
   and how it works in PolyScript mode."""
   ```

3. **Implement Required Methods**
   ```python
   def add_arguments(self, parser):
       # Add tool-specific arguments
       parser.add_argument("--your-option", help="Your option")
   
   def execute_status(self) -> int:
       # Implement status mode
       pass
   
   def execute_test(self) -> int:
       # Implement test mode  
       pass
   
   def execute_sandbox(self) -> int:
       # Implement sandbox mode
       pass
   
   def execute_live(self) -> int:
       # Implement live mode
       pass
   ```

### Phase 3: Mode Implementation

1. **Status Mode Implementation**
   ```python
   def execute_status(self) -> int:
       """Show current state without making changes"""
       
       status_data = {
           "configuration": self._get_config_status(),
           "resources": self._get_resource_status(),
           "last_operation": self._get_last_operation_status()
       }
       
       self.output(status_data)
       
       # Return 0 for success, 1 for issues found
       return 0 if self._is_healthy() else 1
   ```

2. **Test Mode Implementation**
   ```python
   def execute_test(self) -> int:
       """Simulate operations without making changes"""
       
       # Validate inputs
       if not self._validate_inputs():
           self.output("Invalid inputs detected", error=True)
           return 1
       
       # Plan operations
       planned_ops = self._plan_operations()
       
       test_data = {
           "planned_operations": planned_ops,
           "estimated_duration": self._estimate_duration(planned_ops),
           "resources_required": self._calculate_resources(planned_ops)
       }
       
       self.output(test_data)
       self.output("No changes made in test mode")
       return 0
   ```

3. **Sandbox Mode Implementation**
   ```python
   def execute_sandbox(self) -> int:
       """Test dependencies and environment"""
       
       tests = {
           "dependency_1": self._test_dependency_1(),
           "dependency_2": self._test_dependency_2(),
           "permissions": self._test_permissions(),
           "connectivity": self._test_connectivity()
       }
       
       all_passed = all(tests.values())
       
       sandbox_data = {
           "dependency_tests": tests,
           "all_passed": all_passed
       }
       
       self.output(sandbox_data)
       return 0 if all_passed else 1
   ```

4. **Live Mode Implementation**
   ```python
   def execute_live(self) -> int:
       """Execute actual operations"""
       
       # Confirmation for destructive operations
       if self._is_destructive():
           if not self.confirm("Execute operations?"):
               self.output("Operation cancelled")
               return 1
       
       try:
           results = self._execute_operations()
           
           live_data = {
               "operation": "completed",
               "results": results,
               "summary": self._generate_summary(results)
           }
           
           self.output(live_data)
           return 0
           
       except Exception as e:
           self.output(f"Operation failed: {e}", error=True)
           return 1
   ```

### Phase 4: Output Standardization

1. **Replace Print Statements**
   ```python
   # BEFORE
   print(f"Processing {filename}")
   print(f"Error: {error_msg}", file=sys.stderr)
   
   # AFTER
   self.output(f"Processing {filename}")
   self.output(f"Error: {error_msg}", error=True)
   ```

2. **Structure Data Output**
   ```python
   # BEFORE
   print(f"Files: {count}")
   print(f"Size: {size}")
   
   # AFTER
   data = {
       "files": count,
       "size_bytes": size,
       "size_human": self._format_size(size)
   }
   self.output(data)
   ```

3. **Handle JSON Mode**
   ```python
   # The framework handles JSON automatically
   # Just use self.output() consistently
   
   if self.args.json:
       # Data goes to JSON structure automatically
       self.output({"result": "success"})
   else:
       # Pretty-printed output for human consumption
       self.output("Operation completed successfully")
   ```

### Phase 5: Testing and Validation

1. **Use PolyScript Validator**
   ```bash
   # Validate your migrated tool
   python polyscript_validator.py --mode live your-migrated-tool.py
   ```

2. **Test All Modes**
   ```bash
   # Test each mode
   ./your-tool --mode status
   ./your-tool --mode test
   ./your-tool --mode sandbox  
   ./your-tool --mode live
   
   # Test JSON output
   ./your-tool --mode status --json
   ```

3. **Test Standard Flags**
   ```bash
   # Test standard PolyScript flags
   ./your-tool --verbose
   ./your-tool --force
   ./your-tool --json
   ./your-tool --help
   ```

## Common Patterns

### Configuration Management Tools

```python
def execute_status(self) -> int:
    """Show configuration status"""
    return self._show_config_status()

def execute_test(self) -> int:
    """Validate configuration without applying"""
    return self._validate_config()

def execute_sandbox(self) -> int:
    """Test configuration system access"""
    return self._test_config_access()

def execute_live(self) -> int:
    """Apply configuration changes"""
    return self._apply_config()
```

### System Administration Tools

```python
def execute_status(self) -> int:
    """Show system state"""
    return self._show_system_status()

def execute_test(self) -> int:
    """Plan system changes"""
    return self._plan_system_changes()

def execute_sandbox(self) -> int:
    """Test system access and permissions"""
    return self._test_system_access()

def execute_live(self) -> int:
    """Execute system changes"""
    return self._execute_system_changes()
```

### Data Processing Tools

```python
def execute_status(self) -> int:
    """Show data source status"""
    return self._show_data_status()

def execute_test(self) -> int:
    """Validate data and show processing plan"""
    return self._validate_and_plan()

def execute_sandbox(self) -> int:
    """Test data access and processing capabilities"""
    return self._test_data_access()

def execute_live(self) -> int:
    """Process data"""
    return self._process_data()
```

## Pitfalls and Solutions

### Common Pitfall 1: Mode Confusion

**Problem**: Implementing modes that don't follow PolyScript semantics

```python
# WRONG - Status mode should not modify anything
def execute_status(self) -> int:
    self._update_cache()  # Don't modify state!
    return self._show_status()

# WRONG - Test mode should not require confirmation  
def execute_test(self) -> int:
    if not self.confirm("Run test?"):  # Don't ask in test mode!
        return 1
```

**Solution**: Follow PolyScript mode semantics strictly

```python
# CORRECT - Status mode is read-only
def execute_status(self) -> int:
    return self._show_status()

# CORRECT - Test mode runs without confirmation
def execute_test(self) -> int:
    return self._simulate_operations()
```

### Common Pitfall 2: Inconsistent Output

**Problem**: Mixing output methods

```python
# WRONG - Inconsistent output methods
def execute_status(self) -> int:
    print("Status check...")  # Don't use print!
    self.output({"status": "ok"})
    logging.info("Done")  # Don't mix logging styles!
```

**Solution**: Use framework methods consistently

```python
# CORRECT - Consistent output
def execute_status(self) -> int:
    self.log("Checking status...")
    status_data = {"status": "ok"}
    self.output(status_data)
    return 0
```

### Common Pitfall 3: Poor Error Handling

**Problem**: Inconsistent error reporting

```python
# WRONG - Inconsistent error handling
def execute_live(self) -> int:
    try:
        result = self._do_operation()
        print(f"Success: {result}")  # Wrong output method
        return 0
    except Exception as e:
        print(f"ERROR: {e}")  # Wrong error reporting
        return 1
```

**Solution**: Use framework error handling

```python
# CORRECT - Consistent error handling
def execute_live(self) -> int:
    try:
        result = self._do_operation()
        self.output({"operation": "success", "result": result})
        return 0
    except Exception as e:
        self.output(f"Operation failed: {e}", error=True)
        return 1
```

### Common Pitfall 4: Ignoring JSON Mode

**Problem**: Hard-coding human-readable output

```python
# WRONG - Hard-coded human output
def execute_status(self) -> int:
    print("System Status:")  # Doesn't work with --json
    print(f"  CPU: {cpu}%")
    print(f"  Memory: {mem}%")
```

**Solution**: Let framework handle output formatting

```python
# CORRECT - Framework handles formatting
def execute_status(self) -> int:
    status_data = {
        "cpu_percent": cpu,
        "memory_percent": mem
    }
    self.output(status_data)
```

## Testing Strategy

### Unit Testing Your Modes

```python
import unittest
from unittest.mock import patch, Mock

class TestYourTool(unittest.TestCase):
    
    def setUp(self):
        self.tool = YourTool()
        self.tool.args = Mock()
        self.tool.logger = Mock()
    
    def test_status_mode(self):
        """Test status mode returns appropriate data"""
        self.tool.args.json = True
        result = self.tool.execute_status()
        self.assertEqual(result, 0)
    
    def test_test_mode(self):
        """Test mode should not make changes"""
        result = self.tool.execute_test()
        self.assertEqual(result, 0)
        # Assert no side effects occurred
    
    def test_sandbox_mode(self):
        """Test dependency checking"""
        result = self.tool.execute_sandbox()
        self.assertIn(result, [0, 1])  # Should return success or failure
    
    def test_live_mode_with_force(self):
        """Test live mode with --force flag"""
        self.tool.args.force = True
        result = self.tool.execute_live()
        # Test appropriate behavior
```

### Integration Testing

```bash
#!/bin/bash
# integration_test.sh

# Test all modes work
echo "Testing status mode..."
./your-tool --mode status || exit 1

echo "Testing test mode..."
./your-tool --mode test || exit 1

echo "Testing sandbox mode..."
./your-tool --mode sandbox || exit 1

echo "Testing JSON output..."
./your-tool --mode status --json | jq . || exit 1

echo "Testing verbose mode..."
./your-tool --mode status --verbose || exit 1

echo "All tests passed!"
```

### PolyScript Compliance Testing

```bash
# Use the PolyScript validator
python polyscript_validator.py --mode live your-tool.py

# Test specific categories
python polyscript_validator.py --category behavioral your-tool.py
python polyscript_validator.py --category output your-tool.py
```

## Migration Checklist

### Pre-Migration Assessment

- [ ] Document current tool behavior and arguments
- [ ] Identify destructive vs. non-destructive operations
- [ ] Map existing functionality to PolyScript modes
- [ ] Plan confirmation points and dependency checks
- [ ] Review error handling and exit codes

### Framework Integration

- [ ] Import PolyScriptBase class
- [ ] Implement get_description() method
- [ ] Implement add_arguments() method
- [ ] Create tool class structure
- [ ] Update main() function to use framework

### Mode Implementation

- [ ] Implement execute_status() - read-only state display
- [ ] Implement execute_test() - simulation/dry-run
- [ ] Implement execute_sandbox() - dependency checking
- [ ] Implement execute_live() - actual operations
- [ ] Ensure modes follow PolyScript semantics

### Output Standardization

- [ ] Replace print() calls with self.output()
- [ ] Replace logging calls with self.log()
- [ ] Structure data output as dictionaries
- [ ] Use self.output(message, error=True) for errors
- [ ] Remove direct sys.stderr usage

### Error Handling

- [ ] Use consistent exception handling patterns
- [ ] Return appropriate exit codes (0 success, 1 failure)
- [ ] Route all errors through self.output(error=True)
- [ ] Handle KeyboardInterrupt appropriately

### Standard Features

- [ ] Support --verbose flag appropriately
- [ ] Support --force flag for confirmations
- [ ] Support --json flag (handled by framework)
- [ ] Support --help flag (handled by framework)
- [ ] Implement confirmation prompts with self.confirm()

### Testing and Validation

- [ ] Test all four modes manually
- [ ] Test with --json flag
- [ ] Test with --verbose flag
- [ ] Test with --force flag
- [ ] Run PolyScript validator
- [ ] Create unit tests for each mode
- [ ] Create integration test script
- [ ] Test error conditions and edge cases

### Documentation

- [ ] Update tool help text and description
- [ ] Document new mode behaviors
- [ ] Update README or documentation
- [ ] Add usage examples for each mode
- [ ] Document any breaking changes

### Final Verification

- [ ] PolyScript validator passes all tests
- [ ] JSON output validates against PolyScript v1.0 spec
- [ ] All modes work as expected
- [ ] Error handling is consistent
- [ ] Standard flags work correctly
- [ ] Tool maintains original functionality
- [ ] No regression in core features

## Conclusion

Migrating to PolyScript provides significant benefits:

- **Consistency**: Standardized behavior across tools
- **Automation**: Better scripting and integration support
- **Safety**: Built-in dry-run and dependency checking
- **Usability**: Predictable interface for users

The migration process requires careful planning but results in more robust, user-friendly tools that integrate well with modern automation workflows.

For additional support or questions about PolyScript migration, refer to the PolyScript specification and validation tools in this repository.