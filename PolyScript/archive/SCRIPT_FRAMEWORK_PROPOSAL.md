# Script Framework Proposal

## Analysis of Common Patterns

### From setup_dev_environment.py:
- **Modes**: status, test, sandbox, live
- **Operations**: check, install (implicit uninstall)
- **Features**: 
  - OS detection
  - Admin privilege handling
  - Logging with verbosity
  - Dry-run simulation
  - Download testing
  - Version checking

### From manage_claude_code_mcp_servers.py:
- **Modes**: dry-run (similar to test), live (default)
- **Operations**: list, add, remove, verify, repair, migrate
- **Features**:
  - Scope management (machine/user/project)
  - Configuration file handling
  - Interactive menus
  - Issue tracking
  - Color-coded output

## Proposed Framework Architecture

### 1. Python Library Approach (Recommended)

```python
# script_framework.py - Base framework library

from abc import ABC, abstractmethod
from enum import Enum
import argparse
import logging
from typing import List, Dict, Any, Optional

class ExecutionMode(Enum):
    STATUS = "status"      # Read-only, show current state
    TEST = "test"          # Simulate operations, no changes
    SANDBOX = "sandbox"    # Test resources/connectivity
    LIVE = "live"          # Actually execute changes

class OperationType(Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LIST = "list"
    VERIFY = "verify"
    MIGRATE = "migrate"

class BaseScript(ABC):
    """Base class for all standardized scripts"""
    
    def __init__(self):
        self.mode = ExecutionMode.STATUS
        self.verbose = False
        self.force = False
        self.logger = None
        self.issues = []
        
    def setup_cli(self) -> argparse.ArgumentParser:
        """Standard CLI setup"""
        parser = argparse.ArgumentParser(
            description=self.get_description(),
            formatter_class=argparse.RawDescriptionHelpFormatter
        )
        
        # Standard mode argument
        parser.add_argument(
            "--mode", 
            choices=[m.value for m in ExecutionMode],
            default="status",
            help="Execution mode"
        )
        
        # Standard flags
        parser.add_argument("--verbose", "-v", action="store_true", 
                          help="Verbose output")
        parser.add_argument("--force", "-f", action="store_true",
                          help="Force operations without prompts")
        
        # Let subclasses add their own arguments
        self.add_custom_arguments(parser)
        
        return parser
    
    def run(self):
        """Main execution flow"""
        # Parse arguments
        parser = self.setup_cli()
        args = parser.parse_args()
        
        # Initialize from arguments
        self.mode = ExecutionMode(args.mode)
        self.verbose = args.verbose
        self.force = args.force
        
        # Setup logging
        self.setup_logging()
        
        # Process custom arguments
        self.process_arguments(args)
        
        # Execute based on mode
        try:
            if self.mode == ExecutionMode.STATUS:
                self.execute_status()
            elif self.mode == ExecutionMode.TEST:
                self.execute_test()
            elif self.mode == ExecutionMode.SANDBOX:
                self.execute_sandbox()
            elif self.mode == ExecutionMode.LIVE:
                self.execute_live()
                
            # Show final report
            self.show_report()
            
        except KeyboardInterrupt:
            self.log("Operation cancelled by user", "warning")
            return 1
        except Exception as e:
            self.log(f"Error: {e}", "error")
            return 1
            
        return 0 if not self.issues else 1
    
    # Abstract methods that subclasses must implement
    @abstractmethod
    def get_description(self) -> str:
        """Return script description for help"""
        pass
    
    @abstractmethod
    def add_custom_arguments(self, parser: argparse.ArgumentParser):
        """Add script-specific arguments"""
        pass
        
    @abstractmethod
    def process_arguments(self, args):
        """Process script-specific arguments"""
        pass
    
    @abstractmethod
    def execute_status(self):
        """Execute status mode"""
        pass
        
    @abstractmethod
    def execute_test(self):
        """Execute test mode"""
        pass
        
    @abstractmethod
    def execute_sandbox(self):
        """Execute sandbox mode"""
        pass
        
    @abstractmethod
    def execute_live(self):
        """Execute live mode"""
        pass
    
    # Common utility methods
    def setup_logging(self):
        """Setup standard logging"""
        level = logging.DEBUG if self.verbose else logging.INFO
        logging.basicConfig(
            level=level,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def log(self, message: str, level: str = "info"):
        """Unified logging with color support"""
        # Implementation here
        pass
    
    def add_issue(self, issue: str):
        """Track issues for final report"""
        self.issues.append(issue)
    
    def show_report(self):
        """Show final execution report"""
        if self.issues:
            print("\nIssues encountered:")
            for issue in self.issues:
                print(f"  - {issue}")
        else:
            print("\nOperation completed successfully!")
```

### 2. Example Implementation - MCP Servers Script

```python
# manage_mcp_servers_v2.py

from script_framework import BaseScript, OperationType
import argparse

class MCPServerManager(BaseScript):
    """MCP Server management using the framework"""
    
    def __init__(self):
        super().__init__()
        self.operation = None
        self.scope = None
        self.servers = []
        
    def get_description(self) -> str:
        return "Manage MCP servers for Claude Code"
    
    def add_custom_arguments(self, parser: argparse.ArgumentParser):
        # Operations
        ops = parser.add_mutually_exclusive_group(required=True)
        ops.add_argument("--list", action="store_true", 
                        help="List configured servers")
        ops.add_argument("--add", nargs="+", metavar="SERVER",
                        help="Add servers")
        ops.add_argument("--remove", nargs="+", metavar="SERVER",
                        help="Remove servers")
        ops.add_argument("--verify", action="store_true",
                        help="Verify configuration")
        
        # Scope
        parser.add_argument("--scope", 
                          choices=["machine", "user", "project"],
                          help="Configuration scope")
    
    def process_arguments(self, args):
        # Determine operation
        if args.list:
            self.operation = OperationType.LIST
        elif args.add:
            self.operation = OperationType.CREATE
            self.servers = args.add
        elif args.remove:
            self.operation = OperationType.DELETE
            self.servers = args.remove
        elif args.verify:
            self.operation = OperationType.VERIFY
            
        self.scope = args.scope
    
    def execute_status(self):
        """Show current MCP server configuration"""
        self.log("Checking MCP server configuration...")
        # Implementation
        
    def execute_test(self):
        """Simulate operations"""
        self.log(f"[TEST] Would perform {self.operation.value}")
        # Show what would happen
        
    def execute_sandbox(self):
        """Test server availability"""
        self.log("[SANDBOX] Testing server resources")
        # Test npm packages, connectivity, etc.
        
    def execute_live(self):
        """Actually modify configuration"""
        self.log(f"[LIVE] Executing {self.operation.value}")
        # Perform actual operations
```

## Benefits of This Approach

### 1. Consistency
- All scripts have the same CLI structure
- Users learn one pattern, use everywhere
- Predictable behavior across tools

### 2. Rapid Development
- Inherit base functionality
- Focus on script-specific logic
- Built-in error handling, logging, reporting

### 3. Maintainability
- Central place to fix bugs
- Easy to add new features to all scripts
- Standardized testing approach

### 4. Extensibility
- Easy to add new modes
- Can extend base class for specialized needs
- Plugin architecture possible

## Alternative Approaches

### 1. Code Generation
- Template files that generate script boilerplate
- Pro: No runtime dependency
- Con: Updates require regenerating all scripts

### 2. Decorator Pattern
```python
@script_tool(description="MCP Manager")
@operation("list", help="List servers")
@operation("add", help="Add servers")
class MCPManager:
    def list_servers(self):
        pass
```
- Pro: Very clean syntax
- Con: More complex implementation

### 3. Configuration-Driven
- YAML/JSON files define operations
- Framework interprets configuration
- Pro: No coding for simple scripts
- Con: Less flexible for complex logic

## Recommendation

**Use the Python Library Approach** because:
1. Balance of flexibility and structure
2. Easy to understand and extend
3. Supports complex scenarios
4. Can start simple, grow as needed
5. Type hints provide IDE support

## Next Steps

1. Create `script_framework.py` library
2. Refactor `manage_claude_code_mcp_servers.py` to use it
3. Refactor `setup_dev_environment.py` to use it
4. Document patterns and best practices
5. Create project template for new scripts