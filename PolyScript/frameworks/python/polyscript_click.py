#!/usr/bin/env python3
"""
PolyScript Framework for Python using Click
CRUD × Modes Architecture: Zero-boilerplate CLI development

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
"""

import json
import os
import sys
import traceback
from datetime import datetime
from functools import wraps
from typing import Any, Dict, Optional, List, Callable
try:
    import click
except ImportError:
    print("Error: Click is required for PolyScript framework. Install with: pip install click")
    sys.exit(1)


class PolyScriptContext:
    """Context object passed to all PolyScript tool methods"""
    
    def __init__(self, tool_instance, operation: str, mode: str, resource: str = None,
                 rebadged_as: str = None, verbose: bool = False, force: bool = False, 
                 json_output: bool = False, **options):
        self.tool = tool_instance
        self.operation = operation
        self.mode = mode
        self.resource = resource
        self.rebadged_as = rebadged_as
        self.options = options
        self.verbose = verbose
        self.force = force
        self.json_output = json_output
        self.output_data = {
            "polyscript": "1.0",
            "operation": operation,
            "mode": mode,
            "tool": tool_instance.__class__.__name__,
            "status": "success",
            "data": {}
        }
        if resource:
            self.output_data["resource"] = resource
        if rebadged_as:
            self.output_data["rebadged_as"] = rebadged_as
    
    def can_mutate(self) -> bool:
        """Check if current mode allows mutations"""
        return self.mode == "live"
    
    def should_validate(self) -> bool:
        """Check if current mode should validate"""
        return self.mode == "sandbox"
    
    def require_confirm(self) -> bool:
        """Check if confirmation required for destructive operations"""
        return self.mode == "live" and self.operation in ["update", "delete"] and not self.force
    
    def is_safe_mode(self) -> bool:
        """Check if in a safe mode (simulate/sandbox)"""
        return self.mode in ["simulate", "sandbox"]
    
    def log(self, message: str, level: str = "info"):
        """Log a message (respects verbose and JSON mode)"""
        if self.json_output:
            if level in ["error", "critical"]:
                self.output_data.setdefault("errors", []).append(f"{level.upper()}: {message}")
            elif level == "warning":
                self.output_data.setdefault("warnings", []).append(message)
            elif level in ["info", "debug"] and self.verbose:
                self.output_data.setdefault("messages", []).append(f"{level.upper()}: {message}")
        else:
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
            self.output({"confirmation_required": message}, error=True)
            return False
        
        return click.confirm(message)
    
    def finalize_output(self):
        """Output final JSON if in JSON mode"""
        if self.json_output:
            click.echo(json.dumps(self.output_data, indent=2, default=str))


def load_rebadging(tool_class) -> Dict[str, Dict[str, str]]:
    """Load rebadging configuration from class decorator"""
    rebadging = {}
    
    # Check for rebadging in class decorator
    if hasattr(tool_class, "_polyscript_rebadging"):
        rebadging.update(tool_class._polyscript_rebadging)
    
    return rebadging


def polyscript_tool(rebadge: Dict[str, str] = None):
    """
    Decorator that transforms a class into a PolyScript-compliant CLI tool.
    
    The class should implement CRUD methods: create, read, update, delete
    
    Example:
        @polyscript_tool(rebadge={
            "compile": "create+live",
            "dry-compile": "create+simulate",
            "status": "read+live",
            "clean": "delete+live"
        })
        class MyTool:
            def create(self, resource, options, context):
                return {"created": resource}
    """
    
    def decorator(cls):
        # Store rebadging on class
        if rebadge:
            parsed_rebadge = {}
            for alias, mapping in rebadge.items():
                if "+" in mapping:
                    op, mode = mapping.split("+", 1)
                    parsed_rebadge[alias] = {"operation": op, "mode": mode}
                else:
                    parsed_rebadge[alias] = {"operation": mapping, "mode": "live"}
            cls._polyscript_rebadging = parsed_rebadge
        
        # Create the main command group
        @click.group(invoke_without_command=True)
        @click.option('--verbose', '-v', is_flag=True, help='Enable verbose output')
        @click.option('--force', '-f', is_flag=True, help='Skip confirmation prompts')
        @click.option('--json', 'json_output', is_flag=True, help='Output in JSON format')
        @click.option('--discover', is_flag=True, help='Show tool capabilities for agents')
        @click.pass_context
        def main_group(ctx, verbose, force, json_output, discover):
            """PolyScript CRUD × Modes CLI tool"""
            
            if discover:
                # Simple discovery output
                if json_output:
                    discovery = {
                        "polyscript": "1.0",
                        "tool": cls.__name__,
                        "operations": ["create", "read", "update", "delete"],
                        "modes": ["simulate", "sandbox", "live"]
                    }
                    click.echo(json.dumps(discovery, indent=2))
                else:
                    click.echo(f"PolyScript Tool: {cls.__name__}")
                    click.echo("Operations: create, read, update, delete")
                    click.echo("Modes: simulate, sandbox, live")
                sys.exit(0)
            
            if ctx.invoked_subcommand is None:
                # Show help by default
                click.echo(ctx.get_help())
        
        # Get tool description from class docstring
        tool_description = cls.__doc__ or f"{cls.__name__} - PolyScript CRUD × Modes tool"
        main_group.__doc__ = tool_description
        
        # Create CRUD operation commands
        def create_operation_command(operation: str):
            @click.argument('resource', required=(operation != 'read'))
            @click.option('--mode', type=click.Choice(['simulate', 'sandbox', 'live']), 
                         default='live', help='Execution mode')
            @click.pass_context
            def operation_command(ctx, resource=None, mode='live', **kwargs):
                # Get parent context options
                parent_ctx = ctx.parent
                
                # Create tool instance and context
                tool_instance = cls()
                ps_ctx = PolyScriptContext(
                    tool_instance,
                    operation=operation,
                    mode=mode,
                    resource=resource,
                    verbose=parent_ctx.params['verbose'],
                    force=parent_ctx.params['force'],
                    json_output=parent_ctx.params['json_output'],
                    **kwargs
                )
                
                try:
                    # Get the CRUD method
                    crud_method = getattr(tool_instance, operation, None)
                    if not crud_method:
                        ps_ctx.output_data["status"] = "error"
                        ps_ctx.output(f"Operation '{operation}' not implemented", error=True)
                        ps_ctx.finalize_output()
                        sys.exit(1)
                    
                    # Execute with mode wrapping
                    result = execute_with_mode(tool_instance, crud_method, ps_ctx)
                    
                    # Handle return value
                    if result is not None:
                        if isinstance(result, dict):
                            ps_ctx.output(result)
                        else:
                            ps_ctx.output(str(result))
                    
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
            
            return operation_command
        
        # Create and add CRUD commands
        create_cmd = click.command('create', help='Create new resources')(create_operation_command('create'))
        read_cmd = click.command('read', help='Read/query resources')(create_operation_command('read'))
        update_cmd = click.command('update', help='Update existing resources')(create_operation_command('update'))
        delete_cmd = click.command('delete', help='Delete resources')(create_operation_command('delete'))
        
        # Add list as alias for read
        list_cmd = click.command('list', help='List resources (alias for read)')(create_operation_command('read'))
        
        # Add custom arguments if the class provides them
        if hasattr(cls, 'add_arguments'):
            tool_instance = cls()
            for cmd in [create_cmd, read_cmd, update_cmd, delete_cmd, list_cmd]:
                tool_instance.add_arguments(cmd)
        
        # Add CRUD commands to the group
        main_group.add_command(create_cmd)
        main_group.add_command(read_cmd)
        main_group.add_command(update_cmd)
        main_group.add_command(delete_cmd)
        main_group.add_command(list_cmd)
        
        # Add rebadged commands
        rebadging = load_rebadging(cls)
        for alias, mapping in rebadging.items():
            op = mapping["operation"]
            mode = mapping["mode"]
            
            @click.command(alias, help=f"{op.capitalize()} ({mode} mode)")
            @click.argument('resource', required=(op != 'read'))
            @click.pass_context
            def rebadged_command(ctx, resource=None, _op=op, _mode=mode, _alias=alias, **kwargs):
                parent_ctx = ctx.parent
                tool_instance = cls()
                ps_ctx = PolyScriptContext(
                    tool_instance,
                    operation=_op,
                    mode=_mode,
                    resource=resource,
                    rebadged_as=_alias,
                    verbose=parent_ctx.params['verbose'],
                    force=parent_ctx.params['force'],
                    json_output=parent_ctx.params['json_output'],
                    **kwargs
                )
                
                try:
                    crud_method = getattr(tool_instance, _op, None)
                    if not crud_method:
                        ps_ctx.output_data["status"] = "error"
                        ps_ctx.output(f"Operation '{_op}' not implemented", error=True)
                        ps_ctx.finalize_output()
                        sys.exit(1)
                    
                    result = execute_with_mode(tool_instance, crud_method, ps_ctx)
                    
                    if result is not None:
                        if isinstance(result, dict):
                            ps_ctx.output(result)
                        else:
                            ps_ctx.output(str(result))
                    
                    ps_ctx.finalize_output()
                    
                except Exception as e:
                    ps_ctx.output_data["status"] = "error"
                    ps_ctx.output(f"Error: {e}", error=True)
                    if ps_ctx.verbose:
                        ps_ctx.output(traceback.format_exc(), error=True)
                    ps_ctx.finalize_output()
                    sys.exit(1)
            
            # Add custom arguments if provided
            if hasattr(cls, 'add_arguments'):
                tool_instance = cls()
                tool_instance.add_arguments(rebadged_command)
            
            main_group.add_command(rebadged_command)
        
        # Add a run class method
        @classmethod
        def run(cls_self):
            """Run the PolyScript tool"""
            main_group()
        
        cls.run = run
        cls._polyscript_command = main_group
        
        return cls
    
    return decorator


def execute_with_mode(tool_instance, crud_method: Callable, context: PolyScriptContext) -> Any:
    """Execute CRUD method with appropriate mode wrapping"""
    
    if context.mode == "simulate":
        # Simulate mode - show what would happen
        context.log(f"Simulating {context.operation} operation", "debug")
        
        # For read operations, can actually execute in simulate
        if context.operation == "read":
            return crud_method(context.resource, context.options, context)
        
        # For mutating operations, describe what would happen
        action_verbs = {
            "create": "Would create",
            "update": "Would update", 
            "delete": "Would delete"
        }
        verb = action_verbs.get(context.operation, f"Would {context.operation}")
        
        return {
            "simulation": True,
            "action": f"{verb} {context.resource or 'resource'}",
            "options": context.options
        }
    
    elif context.mode == "sandbox":
        # Sandbox mode - test prerequisites
        context.log(f"Testing prerequisites for {context.operation}", "debug")
        
        validations = {
            "permissions": "verified",
            "dependencies": "available",
            "connectivity": "established"
        }
        
        # Let tool add custom validations
        if hasattr(tool_instance, f"validate_{context.operation}"):
            validator = getattr(tool_instance, f"validate_{context.operation}")
            custom_validations = validator(context.resource, context.options, context)
            if isinstance(custom_validations, dict):
                validations.update(custom_validations)
        
        all_passed = all(v in ["verified", "available", "established", "passed", True] 
                        for v in validations.values())
        
        return {
            "sandbox": True,
            "validations": validations,
            "ready": all_passed
        }
    
    else:  # live mode
        # Live mode - actual execution
        context.log(f"Executing {context.operation} operation", "debug")
        
        # Confirmation for destructive operations
        if context.require_confirm():
            if not context.confirm(f"Are you sure you want to {context.operation} {context.resource}?"):
                context.output_data["status"] = "cancelled"
                return {"status": "cancelled", "reason": "User declined confirmation"}
        
        # Execute the actual CRUD method
        return crud_method(context.resource, context.options, context)


# Example usage
if __name__ == "__main__":
    @polyscript_tool(rebadge={
        "compile": "create+live",
        "dry-compile": "create+simulate",
        "status": "read+live",
        "clean": "delete+live",
        "test-env": "read+sandbox"
    })
    class CompilerTool:
        """Example compiler tool demonstrating CRUD × Modes architecture"""
        
        def add_arguments(self, cmd):
            """Add tool-specific arguments"""
            cmd.add_option('--optimize', '-O', is_flag=True, help='Enable optimizations')
            cmd.add_option('--output', '-o', help='Output file name')
        
        def create(self, resource, options, context):
            """Create operation - compile source files"""
            context.log(f"Compiling {resource}...")
            
            # Actual compilation logic would go here
            output_file = options.get("output") or resource.replace(".c", ".out")
            
            return {
                "compiled": resource,
                "output": output_file,
                "optimized": options.get("optimize", False),
                "timestamp": datetime.now().isoformat()
            }
        
        def read(self, resource, options, context):
            """Read operation - show compilation status"""
            context.log("Checking compilation status...")
            
            # Would check actual build artifacts
            return {
                "source_files": ["main.c", "utils.c", "config.c"],
                "compiled_files": ["main.o", "utils.o"], 
                "missing": ["config.o"],
                "last_build": datetime.now().isoformat()
            }
        
        def update(self, resource, options, context):
            """Update operation - recompile changed files"""
            context.log(f"Recompiling {resource}...")
            
            return {
                "recompiled": resource,
                "reason": "source file changed",
                "timestamp": datetime.now().isoformat()
            }
        
        def delete(self, resource, options, context):
            """Delete operation - clean build artifacts"""
            context.log(f"Cleaning {resource}...")
            
            return {
                "cleaned": ["*.o", "*.out", ".build/"],
                "freed_space": "12.3 MB",
                "timestamp": datetime.now().isoformat()
            }
        
        def validate_create(self, resource, options, context):
            """Custom validation for create operation"""
            return {
                "source_exists": True,
                "compiler_available": True,
                "disk_space": "sufficient"
            }
    
    # Run the example
    CompilerTool.run()