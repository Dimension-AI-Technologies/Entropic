#!/usr/bin/env python3
"""
PolyScript Framework for Python using Click

A true zero-boilerplate framework for creating PolyScript-compliant CLI tools.
Developers write ONLY business logic - the framework handles everything else.

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
"""

import json
import sys
import traceback
from datetime import datetime
from functools import wraps
from typing import Any, Dict, Optional

try:
    import click
except ImportError:
    print("Error: Click is required for PolyScript framework. Install with: pip install click")
    sys.exit(1)


class PolyScriptContext:
    """Context object passed to all PolyScript tool methods"""
    
    def __init__(self, tool_instance, verbose: bool = False, force: bool = False, json_output: bool = False):
        self.tool = tool_instance
        self.verbose = verbose
        self.force = force
        self.json_output = json_output
        self.output_data = {
            "polyscript": "1.0",
            "mode": None,
            "tool": tool_instance.__class__.__name__,
            "status": "success",
            "data": {}
        }
    
    def log(self, message: str, level: str = "info"):
        """Log a message (respects verbose and JSON mode)"""
        if self.json_output:
            # In JSON mode, add to appropriate output section
            if level in ["error", "critical"]:
                self.output_data.setdefault("errors", []).append(f"{level.upper()}: {message}")
            elif level == "warning":
                self.output_data.setdefault("warnings", []).append(message)
            elif level in ["info", "debug"] and self.verbose:
                self.output_data.setdefault("messages", []).append(f"{level.upper()}: {message}")
        else:
            # Direct output for non-JSON mode
            if level in ["error", "critical"]:
                click.echo(f"Error: {message}", err=True)
            elif level == "warning":
                click.echo(f"Warning: {message}", err=True)
            elif level in ["info", "debug"]:
                if self.verbose or level == "info":
                    click.echo(message)
    
    def output(self, data: Any, error: bool = False):
        """Output data (automatically handles JSON vs human-readable)"""
        if self.json_output:
            if isinstance(data, dict):
                self.output_data["data"].update(data)
            elif error:
                self.output_data.setdefault("errors", []).append(str(data))
            else:
                self.output_data.setdefault("messages", []).append(str(data))
        else:
            if error:
                click.echo(f"Error: {data}", err=True)
            elif isinstance(data, dict):
                # Pretty print dictionaries
                self._pretty_print(data)
            else:
                click.echo(data)
    
    def _pretty_print(self, data: Dict[str, Any], indent: int = 0):
        """Pretty print a dictionary"""
        prefix = "  " * indent
        for key, value in data.items():
            if isinstance(value, dict):
                click.echo(f"{prefix}{key}:")
                self._pretty_print(value, indent + 1)
            elif isinstance(value, list):
                click.echo(f"{prefix}{key}:")
                for item in value:
                    if isinstance(item, dict):
                        self._pretty_print(item, indent + 1)
                    else:
                        click.echo(f"{prefix}  - {item}")
            else:
                click.echo(f"{prefix}{key}: {value}")
    
    def confirm(self, message: str) -> bool:
        """Ask for user confirmation (respects --force flag)"""
        if self.force:
            return True
        
        if self.json_output:
            # In JSON mode, lack of --force means no confirmation
            self.output({"confirmation_required": message}, error=True)
            return False
        
        return click.confirm(message)
    
    def finalize_output(self):
        """Output final JSON if in JSON mode"""
        if self.json_output:
            click.echo(json.dumps(self.output_data, indent=2, default=str))


def polyscript_tool(cls):
    """
    Decorator that transforms a class into a PolyScript-compliant CLI tool.
    
    The class should implement methods named: status, test, sandbox, live
    Optionally implement: add_arguments(cmd) for custom arguments
    """
    
    # Create the main command group
    @click.group(invoke_without_command=True)
    @click.option('--verbose', '-v', is_flag=True, help='Enable verbose output')
    @click.option('--force', '-f', is_flag=True, help='Skip confirmation prompts')
    @click.option('--json', 'json_output', is_flag=True, help='Output in JSON format')
    @click.pass_context
    def main_group(ctx, verbose, force, json_output):
        """PolyScript-compliant CLI tool"""
        if ctx.invoked_subcommand is None:
            # Default to status mode when no subcommand specified
            ctx.invoke(status_cmd)
    
    # Get tool description from class docstring or default
    tool_description = cls.__doc__ or f"{cls.__name__} - PolyScript-compliant tool"
    main_group.__doc__ = tool_description
    
    # Create mode commands
    def create_mode_command(mode_name: str):
        def mode_command():
            ctx = click.get_current_context()
            
            # Create tool instance and context
            tool_instance = cls()
            ps_ctx = PolyScriptContext(
                tool_instance, 
                ctx.parent.params['verbose'],
                ctx.parent.params['force'],
                ctx.parent.params['json_output']
            )
            ps_ctx.output_data["mode"] = mode_name
            
            try:
                # Get the method for this mode
                mode_method = getattr(tool_instance, mode_name, None)
                if not mode_method:
                    ps_ctx.output_data["status"] = "error"
                    ps_ctx.output(f"Mode '{mode_name}' not implemented", error=True)
                    ps_ctx.finalize_output()
                    sys.exit(1)
                
                # Set context on tool instance
                tool_instance.ctx = ps_ctx
                
                # Execute the mode method
                ps_ctx.log(f"Executing {mode_name} mode", "debug")
                result = mode_method()
                
                # Handle return value
                if result is not None:
                    if isinstance(result, dict):
                        ps_ctx.output(result)
                    else:
                        ps_ctx.output(str(result))
                
                # Finalize and output
                ps_ctx.finalize_output()
                
            except KeyboardInterrupt:
                ps_ctx.output_data["status"] = "cancelled"
                ps_ctx.output("Operation cancelled by user", error=True)
                ps_ctx.finalize_output()
                sys.exit(1)
            except Exception as e:
                ps_ctx.output_data["status"] = "error"
                ps_ctx.output(f"Unhandled error: {e}", error=True)
                if ps_ctx.verbose:
                    ps_ctx.output(traceback.format_exc(), error=True)
                ps_ctx.finalize_output()
                sys.exit(1)
        
        return mode_command
    
    # Create and add the four PolyScript mode commands
    status_cmd = click.command('status', help='Show current state')(create_mode_command('status'))
    test_cmd = click.command('test', help='Simulate operations (dry-run)')(create_mode_command('test'))
    sandbox_cmd = click.command('sandbox', help='Test dependencies and environment')(create_mode_command('sandbox'))
    live_cmd = click.command('live', help='Execute actual operations')(create_mode_command('live'))
    
    # Add custom arguments if the class provides them
    if hasattr(cls, 'add_arguments'):
        # Create a temporary command to get the arguments
        @click.command()
        def temp_cmd():
            pass
        
        # Let the class add its arguments
        tool_instance = cls()
        tool_instance.add_arguments(temp_cmd)
        
        # Apply the same arguments to all mode commands
        for cmd in [status_cmd, test_cmd, sandbox_cmd, live_cmd]:
            for param in temp_cmd.params:
                cmd.params.append(param)
    
    # Add commands to the group
    main_group.add_command(status_cmd)
    main_group.add_command(test_cmd)  
    main_group.add_command(sandbox_cmd)
    main_group.add_command(live_cmd)
    
    # Add a run class method to make it easy to execute
    @classmethod
    def run(cls_self):
        """Run the PolyScript tool"""
        main_group()
    
    cls.run = run
    cls._polyscript_command = main_group
    
    return cls


# Example usage and testing
if __name__ == "__main__":
    # Simple example tool to demonstrate the framework
    
    @polyscript_tool
    class ExampleTool:
        """Example PolyScript tool demonstrating the framework"""
        
        def add_arguments(self, cmd):
            """Add tool-specific arguments"""
            cmd.option('--target', help='Target to operate on', default='default')
            cmd.option('--count', type=int, help='Number of operations', default=1)
        
        def status(self):
            """Show current status"""
            self.ctx.log("Checking status...")
            return {
                "operational": True,
                "target": self.ctx.tool._get_current_target(),
                "last_check": datetime.now().isoformat()
            }
        
        def test(self):
            """Test mode - dry run"""
            self.ctx.log("Running test mode...")
            target = self._get_current_target()
            count = self._get_current_count()
            
            operations = []
            for i in range(count):
                operations.append({
                    "operation": f"Operation {i+1}",
                    "target": target,
                    "status": "would execute"
                })
            
            return {
                "planned_operations": operations,
                "total_operations": len(operations)
            }
        
        def sandbox(self):
            """Sandbox mode - test dependencies"""
            self.ctx.log("Testing environment...")
            
            tests = {
                "python": "available",
                "filesystem": "writable",
                "network": "accessible"
            }
            
            all_passed = all(status == "available" or status == "writable" or status == "accessible" 
                           for status in tests.values())
            
            return {
                "dependency_tests": tests,
                "all_passed": all_passed
            }
        
        def live(self):
            """Live mode - actual execution"""
            self.ctx.log("Executing live mode...")
            
            if not self.ctx.confirm("Execute operations?"):
                return {"status": "cancelled"}
            
            target = self._get_current_target()
            count = self._get_current_count()
            
            results = []
            for i in range(count):
                self.ctx.log(f"Executing operation {i+1}...")
                results.append({
                    "operation": f"Operation {i+1}",
                    "target": target,
                    "status": "completed"
                })
            
            return {
                "executed_operations": results,
                "total_completed": len(results)
            }
        
        def _get_current_target(self):
            """Get the current target from Click context"""
            ctx = click.get_current_context()
            return ctx.params.get('target', 'default')
        
        def _get_current_count(self):
            """Get the current count from Click context"""
            ctx = click.get_current_context()
            return ctx.params.get('count', 1)
    
    # Run the example
    ExampleTool.run()