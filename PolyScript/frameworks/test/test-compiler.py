#!/usr/bin/env python3

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python'))

from polyscript_click import polyscript_tool

@polyscript_tool()
class TestCompilerTool:
    """Test compiler tool for validating CRUD × Modes framework"""
    
    def create(self, resource, options, context):
        """Create operation - compile source files"""
        context.log(f"Creating compilation target: {resource}")
        
        output_file = options.get("output") or resource.replace(".py", ".pyc")
        
        return {
            "operation": "create",
            "compiled": resource,
            "output": output_file,
            "optimized": options.get("optimize", False),
            "timestamp": context.output_data["data"].get("timestamp", "now"),
            "mode": context.mode
        }
    
    def read(self, resource, options, context):
        """Read operation - show compilation status"""
        context.log("Checking compilation status...")
        
        files = [resource] if resource else ["main.py", "utils.py", "config.py"]
        
        return {
            "operation": "read",
            "source_files": files,
            "compiled_files": [f.replace(".py", ".pyc") for f in files[:-1]],
            "missing": [files[-1].replace(".py", ".pyc")],
            "last_build": "2025-01-04T12:00:00Z",
            "mode": context.mode
        }
    
    def update(self, resource, options, context):
        """Update operation - recompile changed files"""
        if not resource:
            raise ValueError("Resource is required for update operation")
            
        context.log(f"Recompiling {resource}...")
        
        return {
            "operation": "update",
            "recompiled": resource,
            "reason": "source file changed",
            "timestamp": "2025-01-04T12:00:00Z",
            "incremental": options.get("incremental", False),
            "mode": context.mode
        }
    
    def delete(self, resource, options, context):
        """Delete operation - clean build artifacts"""
        context.log(f"Cleaning build artifacts{' for ' + resource if resource else ''}...")
        
        targets = [f"{resource}.pyc"] if resource else ["*.pyc", "__pycache__/", "dist/"]
        
        return {
            "operation": "delete", 
            "cleaned": targets,
            "freed_space": "15.3 MB",
            "timestamp": "2025-01-04T12:00:00Z",
            "mode": context.mode
        }
    
    def add_arguments(self, cmd):
        """Add tool-specific arguments"""
        # For Click, we need to add options using decorators or params
        # This is handled by the framework

if __name__ == "__main__":
    TestCompilerTool.run()