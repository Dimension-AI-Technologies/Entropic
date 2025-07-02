#!/usr/bin/env python3
"""
PolyScript Base Framework for Python
Version: 1.0.0

A base class for creating PolyScript-compliant CLI tools.
"""

import argparse
import json
import logging
import sys
from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Dict, List, Optional, Union


class ExecutionMode(Enum):
    """Standard PolyScript execution modes"""
    STATUS = "status"
    TEST = "test"
    SANDBOX = "sandbox"
    LIVE = "live"


class PolyScriptBase(ABC):
    """
    Base class for PolyScript-compliant CLI tools.
    
    Subclasses must implement:
    - get_description(): Tool description
    - add_arguments(): Add tool-specific arguments
    - execute_status(): Status mode implementation
    - execute_test(): Test mode implementation
    - execute_sandbox(): Sandbox mode implementation
    - execute_live(): Live mode implementation
    """
    
    def __init__(self):
        self.args: Optional[argparse.Namespace] = None
        self.logger: Optional[logging.Logger] = None
        self.mode: Optional[ExecutionMode] = None
        self._output_data: Dict[str, Any] = {}
        
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
    
    def setup_logging(self):
        """Configure logging based on verbosity"""
        level = logging.DEBUG if self.args.verbose else logging.INFO
        
        # Configure format
        if self.args.json:
            # Minimal logging for JSON output
            logging.basicConfig(
                level=level,
                format='%(message)s',
                stream=sys.stderr  # Log to stderr when using JSON
            )
        else:
            # Standard logging format
            logging.basicConfig(
                level=level,
                format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
        
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def run(self) -> int:
        """Main execution flow"""
        # Parse arguments
        parser = self.setup_parser()
        self.args = parser.parse_args()
        
        # Setup
        self.mode = ExecutionMode(self.args.mode)
        self.setup_logging()
        
        # Initialize output structure
        self._output_data = {
            "polyscript": "1.0",
            "mode": self.mode.value,
            "tool": self.__class__.__name__,
            "status": "success",
            "data": {}
        }
        
        try:
            # Execute based on mode
            self.logger.debug(f"Executing in {self.mode.value} mode")
            
            if self.mode == ExecutionMode.STATUS:
                exit_code = self.execute_status()
            elif self.mode == ExecutionMode.TEST:
                exit_code = self.execute_test()
            elif self.mode == ExecutionMode.SANDBOX:
                exit_code = self.execute_sandbox()
            elif self.mode == ExecutionMode.LIVE:
                exit_code = self.execute_live()
            
            # Set final status
            if exit_code != 0:
                self._output_data["status"] = "failure"
            
            # Output final data if JSON mode
            if self.args.json and self._output_data["data"]:
                self._output_json(self._output_data)
            
            return exit_code
            
        except KeyboardInterrupt:
            self.logger.info("Operation cancelled by user")
            self._output_data["status"] = "cancelled"
            self._output_data["error"] = "User cancelled operation"
            if self.args.json:
                self._output_json(self._output_data)
            return 1
            
        except Exception as e:
            self.logger.error(f"Unhandled error: {e}")
            if self.args.verbose:
                self.logger.exception("Detailed traceback:")
            
            self._output_data["status"] = "error"
            self._output_data["error"] = str(e)
            if self.args.json:
                self._output_json(self._output_data)
            return 1
    
    def output(self, data: Union[str, Dict[str, Any]], error: bool = False):
        """
        Output data in appropriate format.
        
        Args:
            data: String message or dictionary of data
            error: Whether this is an error message
        """
        if self.args.json:
            # Store data for JSON output
            if isinstance(data, str):
                if error:
                    self._output_data.setdefault("errors", []).append(data)
                else:
                    self._output_data.setdefault("messages", []).append(data)
            else:
                # Merge dictionaries
                self._output_data["data"].update(data)
        else:
            # Direct output for non-JSON mode
            if error:
                print(f"Error: {data}", file=sys.stderr)
            else:
                if isinstance(data, dict):
                    # Pretty print dictionaries
                    self._pretty_print(data)
                else:
                    print(data)
    
    def _output_json(self, data: Dict[str, Any]):
        """Output data as JSON"""
        json.dump(data, sys.stdout, indent=2, default=str)
        print()  # Newline after JSON
    
    def _pretty_print(self, data: Dict[str, Any], indent: int = 0):
        """Pretty print a dictionary"""
        prefix = "  " * indent
        for key, value in data.items():
            if isinstance(value, dict):
                print(f"{prefix}{key}:")
                self._pretty_print(value, indent + 1)
            elif isinstance(value, list):
                print(f"{prefix}{key}:")
                for item in value:
                    if isinstance(item, dict):
                        self._pretty_print(item, indent + 1)
                    else:
                        print(f"{prefix}  - {item}")
            else:
                print(f"{prefix}{key}: {value}")
    
    def confirm(self, message: str) -> bool:
        """
        Ask for user confirmation.
        
        Args:
            message: Confirmation message
            
        Returns:
            True if user confirms or --force is set
        """
        if self.args.force:
            return True
        
        if self.args.json:
            # In JSON mode, lack of --force means no confirmation
            self.output({"confirmation_required": message}, error=True)
            return False
        
        response = input(f"{message} [y/N]: ").strip().lower()
        return response == 'y'
    
    def log(self, message: str, level: str = "info"):
        """
        Log a message at the specified level.
        
        Args:
            message: Message to log
            level: Log level (debug, info, warning, error)
        """
        log_func = getattr(self.logger, level, self.logger.info)
        log_func(message)
    
    # Abstract methods that subclasses must implement
    
    @abstractmethod
    def get_description(self) -> str:
        """Return tool description for help text"""
        pass
    
    @abstractmethod
    def add_arguments(self, parser: argparse.ArgumentParser):
        """Add tool-specific arguments to parser"""
        pass
    
    @abstractmethod
    def execute_status(self) -> int:
        """
        Execute status mode (show current state).
        
        Returns:
            Exit code (0 for success, 1 for failure)
        """
        pass
    
    @abstractmethod
    def execute_test(self) -> int:
        """
        Execute test mode (simulate changes).
        
        Returns:
            Exit code (0 for success, 1 for failure)
        """
        pass
    
    @abstractmethod
    def execute_sandbox(self) -> int:
        """
        Execute sandbox mode (test dependencies).
        
        Returns:
            Exit code (0 for success, 1 for failure)
        """
        pass
    
    @abstractmethod
    def execute_live(self) -> int:
        """
        Execute live mode (make actual changes).
        
        Returns:
            Exit code (0 for success, 1 for failure)
        """
        pass


class PolyScriptExample(PolyScriptBase):
    """Example implementation of a PolyScript-compliant tool"""
    
    def get_description(self) -> str:
        return """Example PolyScript Tool
        
This demonstrates how to create a PolyScript-compliant CLI tool.
It shows all four modes and standard flag handling."""
    
    def add_arguments(self, parser: argparse.ArgumentParser):
        parser.add_argument(
            "--target",
            help="Target to operate on"
        )
        parser.add_argument(
            "--count",
            type=int,
            default=1,
            help="Number of operations"
        )
    
    def execute_status(self) -> int:
        self.output("Checking system status...")
        
        status_data = {
            "operational": True,
            "targets": 3,
            "last_check": "2024-01-02T10:00:00Z"
        }
        
        if self.args.verbose:
            status_data["details"] = [
                "Target 1: Active",
                "Target 2: Active", 
                "Target 3: Idle"
            ]
        
        self.output(status_data)
        return 0
    
    def execute_test(self) -> int:
        self.output("[TEST MODE] Simulating operations...")
        
        operations = []
        for i in range(self.args.count):
            operations.append({
                "operation": f"Operation {i+1}",
                "target": self.args.target or f"default-{i+1}",
                "status": "would execute"
            })
        
        self.output({"planned_operations": operations})
        self.output("No changes made in test mode")
        return 0
    
    def execute_sandbox(self) -> int:
        self.output("[SANDBOX MODE] Testing dependencies...")
        
        tests = {
            "network": "passed",
            "authentication": "passed",
            "permissions": "passed",
            "resources": "available"
        }
        
        all_passed = all(v == "passed" or v == "available" for v in tests.values())
        
        self.output({"dependency_tests": tests})
        
        if not all_passed:
            self.output("Some tests failed", error=True)
            return 1
        
        self.output("All dependency tests passed")
        return 0
    
    def execute_live(self) -> int:
        self.output("[LIVE MODE] Preparing to execute operations...")
        
        if not self.confirm("Execute operations?"):
            self.output("Operation cancelled")
            return 1
        
        results = []
        for i in range(self.args.count):
            self.log(f"Executing operation {i+1}...")
            results.append({
                "operation": f"Operation {i+1}",
                "target": self.args.target or f"default-{i+1}",
                "status": "completed"
            })
        
        self.output({"executed_operations": results})
        self.output(f"Successfully completed {len(results)} operations")
        return 0


if __name__ == "__main__":
    # Run example if executed directly
    tool = PolyScriptExample()
    sys.exit(tool.run())