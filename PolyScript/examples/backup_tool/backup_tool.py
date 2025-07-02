#!/usr/bin/env python3
"""
Example: Backup Tool using PolyScript Click Framework

This demonstrates how the PolyScript framework eliminates boilerplate.
Compare this to the 400+ line manual implementation in the migration guide.

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
"""

import os
import shutil
from pathlib import Path

# This would import from the framework
# from polyscript_click import polyscript_tool

# For demonstration purposes, we'll show what the code would look like
# when the framework is available:

"""
@polyscript_tool
class BackupTool:
    '''PolyScript-compliant file backup tool with zero boilerplate'''
    
    def add_arguments(self, cmd):
        '''Define tool-specific arguments - applied to all modes automatically'''
        cmd.argument('source', help='Source directory to backup')
        cmd.argument('dest', help='Destination directory')
        cmd.option('--overwrite', is_flag=True, help='Overwrite existing destination')
    
    def status(self):
        '''Show backup status - ONLY business logic, no boilerplate'''
        source = Path(self.ctx.current_args['source'])
        dest = Path(self.ctx.current_args['dest'])
        
        return {
            "source": {
                "path": str(source),
                "exists": source.exists(),
                "size_bytes": self._get_dir_size(source) if source.exists() else 0,
                "file_count": self._get_file_count(source) if source.exists() else 0
            },
            "destination": {
                "path": str(dest),
                "exists": dest.exists(),
                "would_overwrite": dest.exists() and not self.ctx.current_args.get('overwrite', False)
            },
            "backup_needed": source.exists() and (not dest.exists() or self.ctx.current_args.get('overwrite', False))
        }
    
    def test(self):
        '''Dry-run mode - show what would be backed up'''
        source = Path(self.ctx.current_args['source'])
        dest = Path(self.ctx.current_args['dest'])
        
        if not source.exists():
            self.ctx.output("Source directory does not exist", error=True)
            return None  # Framework converts this to exit code 1
        
        return {
            "planned_operations": [{
                "operation": "backup",
                "source": str(source),
                "destination": str(dest),
                "file_count": self._get_file_count(source),
                "size_bytes": self._get_dir_size(source),
                "would_overwrite": dest.exists()
            }],
            "note": "No changes made in test mode"
        }
    
    def sandbox(self):
        '''Test environment and dependencies'''
        source = Path(self.ctx.current_args['source'])
        dest = Path(self.ctx.current_args['dest'])
        
        tests = {
            "source_readable": self._test_readable(source),
            "destination_writable": self._test_writable(dest.parent),
            "sufficient_space": self._test_disk_space(source, dest.parent)
        }
        
        return {
            "dependency_tests": tests,
            "all_passed": all(test == "passed" for test in tests.values())
        }
    
    def live(self):
        '''Perform actual backup'''
        source = Path(self.ctx.current_args['source'])
        dest = Path(self.ctx.current_args['dest'])
        
        if not source.exists():
            self.ctx.output("Source directory does not exist", error=True)
            return None
        
        # Framework handles confirmation prompts automatically based on --force flag
        if dest.exists() and not self.ctx.current_args.get('overwrite', False):
            if not self.ctx.confirm(f"Destination {dest} exists. Overwrite?"):
                return {"status": "cancelled"}
        
        # Actual backup operation - just business logic
        if dest.exists():
            shutil.rmtree(dest)
        
        shutil.copytree(source, dest)
        
        return {
            "operation": "backup_completed",
            "source": str(source),
            "destination": str(dest),
            "files_copied": self._get_file_count(dest),
            "bytes_copied": self._get_dir_size(dest)
        }
    
    # Helper methods - pure business logic
    def _get_dir_size(self, path: Path) -> int:
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
    
    def _test_readable(self, path: Path) -> str:
        try:
            return "passed" if path.exists() and os.access(path, os.R_OK) else "failed"
        except Exception:
            return "error"
    
    def _test_writable(self, path: Path) -> str:
        try:
            return "passed" if path.exists() and os.access(path, os.W_OK) else "failed"
        except Exception:
            return "error"
    
    def _test_disk_space(self, source: Path, dest_parent: Path) -> str:
        try:
            if not source.exists() or not dest_parent.exists():
                return "unknown"
            source_size = self._get_dir_size(source)
            free_space = shutil.disk_usage(dest_parent).free
            return "passed" if free_space > source_size * 1.1 else "failed"
        except Exception:
            return "error"


# Usage would be simply:
if __name__ == "__main__":
    BackupTool.run()

# The framework automatically provides:
# - All CLI argument parsing and validation
# - --mode status|test|sandbox|live routing  
# - --json, --verbose, --force standard flags
# - PolyScript v1.0 JSON output formatting
# - Error handling and exit codes
# - Help text generation
# - Confirmation prompts

# Command examples that would work:
# python backup_tool.py status /source /dest
# python backup_tool.py test /source /dest --overwrite
# python backup_tool.py sandbox /source /dest --json
# python backup_tool.py live /source /dest --force --verbose
"""

print("""
POLYSCRIPT CLICK FRAMEWORK EXAMPLE
==================================

This file shows what a backup tool would look like using the PolyScript Click framework.

Key Benefits:
- ZERO boilerplate code
- Developer writes ONLY business logic
- Framework handles all PolyScript compliance automatically
- Automatic CLI generation with Click
- Standard --json, --verbose, --force flags
- PolyScript v1.0 JSON output format
- Error handling and exit codes

Compare this ~100 lines of pure business logic to the 400+ lines of 
boilerplate required in the manual PolyScript implementation.

The framework eliminates:
- Manual argument parsing (Click handles this)
- Mode routing logic (automatic)
- JSON output formatting (automatic)
- Standard flag handling (automatic)
- Error handling boilerplate (automatic)
- Help text generation (automatic)

To use this framework:
1. pip install click
2. Import: from polyscript_click import polyscript_tool
3. Decorate your class: @polyscript_tool
4. Implement: status(), test(), sandbox(), live() methods
5. Run: YourTool.run()

That's it! The framework does everything else.
""")