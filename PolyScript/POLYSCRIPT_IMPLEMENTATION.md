# PolyScript Implementation Guide

> Practical guide to implementing PolyScript-compliant tools

## Table of Contents
1. [Quick Start](#quick-start)
2. [Mode Implementation Details](#mode-implementation-details)
3. [Python Implementation](#python-implementation)
4. [PowerShell Implementation](#powershell-implementation)
5. [Other Languages](#other-languages)
6. [Testing Compliance](#testing-compliance)
7. [Migration Guide](#migration-guide)
8. [Best Practices](#best-practices)

## Quick Start

### Minimal Compliant Script (Python)

```python
#!/usr/bin/env python3
import argparse
import json
import sys

def main():
    parser = argparse.ArgumentParser(description="Your tool description")
    
    # Required by PolyScript
    parser.add_argument("--mode", choices=["status", "test", "sandbox", "live"], 
                       default="status", help="Execution mode")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--force", "-f", action="store_true", help="Skip confirmations")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    # Your tool-specific arguments here
    
    args = parser.parse_args()
    
    # Implement mode behavior
    if args.mode == "status":
        # Show current state
        pass
    elif args.mode == "test":
        # Simulate operations
        pass
    elif args.mode == "sandbox":
        # Test dependencies
        pass
    elif args.mode == "live":
        # Execute changes
        pass
    
    return 0  # or 1 on failure

if __name__ == "__main__":
    sys.exit(main())
```

## Mode Implementation Details

### Status Mode (Default)
**Purpose**: Show current state without making changes

```python
def execute_status(self):
    """Show current configuration/state"""
    current_state = self.get_current_state()
    
    if self.args.json:
        print(json.dumps(current_state))
    else:
        print(f"Current state: {current_state['summary']}")
        if self.args.verbose:
            for detail in current_state['details']:
                print(f"  - {detail}")
```

**Key Behaviors**:
- Read-only operations
- Quick execution
- Safe to run repeatedly
- Shows summary by default, details with --verbose

### Test Mode
**Purpose**: Simulate what would happen without making changes

```python
def execute_test(self):
    """Simulate operations and show what would change"""
    changes = self.calculate_changes()
    
    print("[TEST MODE] No changes will be made")
    print(f"Would perform {len(changes)} operations:")
    
    for change in changes:
        print(f"  - {change['action']}: {change['target']}")
        if self.args.verbose:
            print(f"    Details: {change['details']}")
```

**Key Behaviors**:
- Calculate all changes
- Display clearly marked as TEST
- Show enough detail to understand impact
- Validate configuration

### Sandbox Mode
**Purpose**: Test external dependencies and resources

```python
def execute_sandbox(self):
    """Test connectivity and dependencies"""
    print("[SANDBOX MODE] Testing dependencies...")
    
    tests = [
        ("Network connectivity", self.test_network),
        ("Required tools", self.test_tools),
        ("Permissions", self.test_permissions),
        ("External services", self.test_services)
    ]
    
    all_passed = True
    for test_name, test_func in tests:
        passed = test_func()
        status = "✓" if passed else "✗"
        print(f"  {status} {test_name}")
        if not passed:
            all_passed = False
    
    return 0 if all_passed else 1
```

**Key Behaviors**:
- Test without side effects
- Download to temp directories
- Verify credentials work
- Check all dependencies

### Live Mode
**Purpose**: Actually execute changes

```python
def execute_live(self):
    """Execute real changes"""
    if not self.args.force:
        response = input("Execute changes? [y/N]: ")
        if response.lower() != 'y':
            print("Aborted")
            return 1
    
    print("[LIVE MODE] Executing changes...")
    
    for operation in self.get_operations():
        try:
            result = operation.execute()
            print(f"✓ {operation.name}: {result}")
        except Exception as e:
            print(f"✗ {operation.name}: {e}")
            if not self.args.force:
                return 1
    
    return 0
```

**Key Behaviors**:
- Confirm before changes (unless --force)
- Clear success/failure indicators
- Stop on error (unless --force)
- Log what was changed

## Python Implementation

### Base Framework Approach

```python
from abc import ABC, abstractmethod
from enum import Enum
import argparse
import logging
import json
import sys

class ExecutionMode(Enum):
    STATUS = "status"
    TEST = "test"
    SANDBOX = "sandbox"
    LIVE = "live"

class PolyScriptBase(ABC):
    """Base class for PolyScript-compliant tools"""
    
    def __init__(self):
        self.args = None
        self.logger = None
    
    def setup_parser(self) -> argparse.ArgumentParser:
        """Create standard PolyScript argument parser"""
        parser = argparse.ArgumentParser(
            description=self.get_description(),
            formatter_class=argparse.RawDescriptionHelpFormatter
        )
        
        # Standard PolyScript arguments
        parser.add_argument(
            "--mode", 
            choices=[m.value for m in ExecutionMode],
            default=ExecutionMode.STATUS.value,
            help="Execution mode (default: status)"
        )
        parser.add_argument(
            "--verbose", "-v",
            action="store_true",
            help="Enable verbose output"
        )
        parser.add_argument(
            "--force", "-f",
            action="store_true",
            help="Skip confirmation prompts"
        )
        parser.add_argument(
            "--json",
            action="store_true",
            help="Output in JSON format"
        )
        
        # Let subclass add custom arguments
        self.add_arguments(parser)
        
        return parser
    
    def run(self) -> int:
        """Main execution flow"""
        parser = self.setup_parser()
        self.args = parser.parse_args()
        
        # Setup logging
        self.setup_logging()
        
        # Execute based on mode
        mode = ExecutionMode(self.args.mode)
        
        try:
            if mode == ExecutionMode.STATUS:
                return self.execute_status()
            elif mode == ExecutionMode.TEST:
                return self.execute_test()
            elif mode == ExecutionMode.SANDBOX:
                return self.execute_sandbox()
            elif mode == ExecutionMode.LIVE:
                return self.execute_live()
        except KeyboardInterrupt:
            self.output({"error": "Interrupted by user"}, error=True)
            return 1
        except Exception as e:
            self.output({"error": str(e)}, error=True)
            if self.args.verbose:
                self.logger.exception("Detailed error:")
            return 1
    
    def setup_logging(self):
        """Configure logging based on verbosity"""
        level = logging.DEBUG if self.args.verbose else logging.INFO
        logging.basicConfig(
            level=level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def output(self, data, error=False):
        """Output data in appropriate format"""
        if self.args.json:
            json.dump(data, sys.stderr if error else sys.stdout, indent=2)
            print()  # newline
        else:
            if error:
                print(f"Error: {data.get('error', data)}", file=sys.stderr)
            else:
                # Subclass should override for pretty printing
                print(data)
    
    # Abstract methods subclasses must implement
    @abstractmethod
    def get_description(self) -> str:
        """Return tool description"""
        pass
    
    @abstractmethod
    def add_arguments(self, parser: argparse.ArgumentParser):
        """Add tool-specific arguments"""
        pass
    
    @abstractmethod
    def execute_status(self) -> int:
        """Execute status mode"""
        pass
    
    @abstractmethod
    def execute_test(self) -> int:
        """Execute test mode"""
        pass
    
    @abstractmethod
    def execute_sandbox(self) -> int:
        """Execute sandbox mode"""
        pass
    
    @abstractmethod
    def execute_live(self) -> int:
        """Execute live mode"""
        pass


# Example implementation
class MyTool(PolyScriptBase):
    def get_description(self):
        return "My PolyScript-compliant tool"
    
    def add_arguments(self, parser):
        parser.add_argument("--target", help="Target to operate on")
    
    def execute_status(self):
        self.output({"status": "operational", "targets": 3})
        return 0
    
    def execute_test(self):
        self.output({"mode": "test", "would_change": ["item1", "item2"]})
        return 0
    
    def execute_sandbox(self):
        self.output({"tests": {"network": "pass", "auth": "pass"}})
        return 0
    
    def execute_live(self):
        if not self.args.force:
            # In real implementation, prompt user
            pass
        self.output({"executed": True, "changes": 2})
        return 0

if __name__ == "__main__":
    tool = MyTool()
    sys.exit(tool.run())
```

## PowerShell Implementation

### PowerShell Template

```powershell
#Requires -Version 5.1

<#
.SYNOPSIS
    PolyScript-compliant PowerShell tool

.DESCRIPTION
    Detailed description of what this tool does

.PARAMETER Mode
    Execution mode: status, test, sandbox, or live

.PARAMETER Verbose
    Enable verbose output

.PARAMETER Force
    Skip confirmation prompts

.PARAMETER Json
    Output in JSON format

.EXAMPLE
    .\Tool.ps1 -Mode status
    .\Tool.ps1 -Mode test -Verbose
    .\Tool.ps1 -Mode live -Force
#>

[CmdletBinding()]
param(
    [Parameter()]
    [ValidateSet('status', 'test', 'sandbox', 'live')]
    [string]$Mode = 'status',
    
    [Parameter()]
    [switch]$Force,
    
    [Parameter()]
    [switch]$Json,
    
    # Tool-specific parameters here
    [Parameter()]
    [string]$Target
)

# Utility functions
function Write-Output-Json {
    param($Data)
    if ($Json) {
        $Data | ConvertTo-Json -Depth 10
    } else {
        $Data
    }
}

function Invoke-StatusMode {
    Write-Verbose "Executing status mode..."
    
    $status = @{
        Status = "Operational"
        Targets = 3
        LastRun = (Get-Date).ToString()
    }
    
    Write-Output-Json $status
}

function Invoke-TestMode {
    Write-Host "[TEST MODE] No changes will be made" -ForegroundColor Yellow
    
    $changes = @{
        Mode = "test"
        WouldChange = @("item1", "item2")
    }
    
    Write-Output-Json $changes
}

function Invoke-SandboxMode {
    Write-Host "[SANDBOX MODE] Testing dependencies..." -ForegroundColor Cyan
    
    $tests = @{
        Network = "Pass"
        Auth = "Pass"
        Tools = "Pass"
    }
    
    Write-Output-Json $tests
}

function Invoke-LiveMode {
    if (-not $Force) {
        $confirm = Read-Host "Execute changes? [y/N]"
        if ($confirm -ne 'y') {
            Write-Host "Aborted" -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Host "[LIVE MODE] Executing changes..." -ForegroundColor Green
    
    $result = @{
        Executed = $true
        Changes = 2
    }
    
    Write-Output-Json $result
}

# Main execution
try {
    switch ($Mode) {
        'status'  { Invoke-StatusMode }
        'test'    { Invoke-TestMode }
        'sandbox' { Invoke-SandboxMode }
        'live'    { Invoke-LiveMode }
    }
    exit 0
}
catch {
    Write-Error $_.Exception.Message
    if ($VerbosePreference -eq 'Continue') {
        Write-Error $_.Exception.StackTrace
    }
    exit 1
}
```

## Other Languages

### F# Template Structure

```fsharp
#!/usr/bin/env -S dotnet fsi

#r "nuget: Argu"
open Argu

type Arguments =
    | [<AltCommandLine("-m")>] Mode of mode:string
    | [<AltCommandLine("-v")>] Verbose
    | [<AltCommandLine("-f")>] Force
    | Json
    
    interface IArgParserTemplate with
        member s.Usage =
            match s with
            | Mode _ -> "Execution mode: status, test, sandbox, or live"
            | Verbose -> "Enable verbose output"
            | Force -> "Skip confirmation prompts"
            | Json -> "Output in JSON format"
```

### JavaScript/Node Template Structure

```javascript
#!/usr/bin/env node

const { program } = require('commander');

program
  .option('-m, --mode <mode>', 'execution mode', 'status')
  .option('-v, --verbose', 'verbose output')
  .option('-f, --force', 'skip confirmations')
  .option('--json', 'output as JSON')
  .parse();

const options = program.opts();

// Validate mode
const validModes = ['status', 'test', 'sandbox', 'live'];
if (!validModes.includes(options.mode)) {
    console.error(`Invalid mode: ${options.mode}`);
    process.exit(1);
}

// Execute based on mode...
```

## Testing Compliance

### Using the PolyScript Validator

```bash
# Test your implementation
./polyscript_validator.py my_script.py

# Test specific language
./polyscript_validator.py My-Script.ps1 --language powershell
```

### Manual Testing Checklist

- [ ] Default mode is 'status'
- [ ] All four modes work correctly
- [ ] --verbose provides additional detail
- [ ] --force skips confirmations
- [ ] --json outputs valid JSON
- [ ] Exit codes are 0 (success) or 1 (failure)
- [ ] --help documents all modes
- [ ] Errors go to stderr

## Migration Guide

### From Existing Scripts

#### Step 1: Analyze Current Modes

Map your existing functionality to PolyScript modes:

| Your Current Option | PolyScript Mode |
|-------------------|-----------------|
| --dry-run | --mode test |
| --check | --mode status |
| --validate | --mode sandbox |
| (default action) | --mode live |

#### Step 2: Add Missing Modes

Most scripts are missing sandbox mode. Add it:
```python
def execute_sandbox(self):
    """Test external dependencies"""
    # Test network connectivity
    # Verify credentials
    # Check tool availability
    # Test API endpoints
```

#### Step 3: Standardize Output

- Add --json support for automation
- Ensure consistent error handling
- Use exit codes properly

#### Step 4: Update Documentation

- Rewrite --help to mention all modes
- Add examples for each mode
- Document the PolyScript compliance

### Example Migration

**Before** (custom patterns):
```bash
script.py --list                    # Show current state
script.py --dry-run --add server1   # Test adding
script.py --add server1             # Actually add
```

**After** (PolyScript-compliant):
```bash
script.py --mode status             # Show current state
script.py --mode test --add server1 # Test adding
script.py --mode live --add server1 # Actually add
```

## Best Practices

### 1. Mode Clarity

Always clearly indicate which mode is running:
```python
print(f"[{mode.upper()} MODE] Starting operations...")
```

### 2. Fail Fast in Live Mode

Unless --force is specified, stop on first error:
```python
if error and not self.args.force:
    return 1  # Exit immediately
```

### 3. Useful Status Output

Status mode should give actionable information:
```
Current configuration:
  ✓ 3 servers configured
  ✓ All servers responding
  ⚠ 1 server has outdated version
  
Run with --verbose for details
```

### 4. Test Mode Completeness

Test mode should exercise all code paths:
```python
def execute_test(self):
    # Test all operations that would run in live mode
    # Validate all inputs
    # Check all preconditions
    # Calculate all changes
```

### 5. JSON Output Structure

Keep JSON output consistent and versioned:
```json
{
  "polyscript": "1.0",
  "mode": "status",
  "timestamp": "2024-01-02T10:00:00Z",
  "data": {
    // Mode-specific data here
  }
}
```

### 6. Error Handling

Provide helpful error messages:
```python
try:
    operation()
except SpecificError as e:
    if self.args.json:
        self.output({"error": str(e), "type": "SpecificError"})
    else:
        print(f"Error: {e}")
        print("Hint: Try running with --mode sandbox to test dependencies")
```

## Conclusion

Implementing PolyScript-compliant tools is straightforward:
1. Support the four standard modes
2. Use consistent command-line flags
3. Return standard exit codes
4. Provide clear, actionable output

The framework approach (inheritance in Python, modules in PowerShell) makes implementation even easier while ensuring consistency across all your tools.

---

*Consolidated from: SCRIPT_FRAMEWORK_PROPOSAL.md, SCRIPT_MODES_SUMMARY.md, MODE_COMPARISON.md, and POLYSCRIPT_VALIDATOR_README.md on 2025-01-02*