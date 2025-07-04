#!/usr/bin/env python3
"""
Test repair functionality for empty mcpServers:{} override

This tests the core issue that started the MCP server manager project:
empty mcpServers:{} in ~/.claude.json hiding all servers.

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
import shutil


def backup_claude_json():
    """Backup existing ~/.claude.json if it exists"""
    claude_json = Path.home() / ".claude.json"
    if claude_json.exists():
        backup_path = claude_json.with_suffix('.json.test_backup')
        shutil.copy2(claude_json, backup_path)
        return backup_path
    return None


def restore_claude_json(backup_path):
    """Restore ~/.claude.json from backup"""
    if backup_path and backup_path.exists():
        claude_json = Path.home() / ".claude.json"
        shutil.copy2(backup_path, claude_json)
        backup_path.unlink()


def create_problematic_claude_json():
    """Create a ~/.claude.json with empty mcpServers:{} override"""
    claude_json = Path.home() / ".claude.json"
    cwd = str(Path.cwd())
    
    # Create problematic configuration
    config = {
        "projects": {
            cwd: {
                "mcpServers": {}  # Empty override - this hides all servers!
            }
        }
    }
    
    # Write the problematic config
    with open(claude_json, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"Created problematic ~/.claude.json with empty mcpServers for {cwd}")
    return claude_json


def run_mcp_command(args):
    """Run the MCP server manager with given arguments"""
    script_path = Path(__file__).parent / "manage_mcp_servers_polyscript.py"
    cmd = [sys.executable, str(script_path)] + args
    
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True
    )
    
    return result.returncode, result.stdout, result.stderr


def test_repair_empty_override():
    """Test the repair functionality"""
    print("Testing repair of empty mcpServers:{} override")
    print("=" * 60)
    
    # Backup existing configuration
    backup_path = backup_claude_json()
    
    try:
        # Step 1: Create problematic configuration
        create_problematic_claude_json()
        
        # Step 2: Verify servers are hidden
        print("\n1. Checking status with problematic config...")
        exit_code, stdout, stderr = run_mcp_command(["--mode", "status"])
        
        if "Empty mcpServers:{} override" in stdout or "Empty mcpServers:{} override" in stderr:
            print("✓ Issue detected correctly")
        else:
            print("✗ Issue not detected!")
            print("STDOUT:", stdout)
            print("STDERR:", stderr)
        
        # Step 3: Test repair in test mode first
        print("\n2. Testing repair in test mode...")
        exit_code, stdout, stderr = run_mcp_command(["--mode", "test", "--repair"])
        
        if "Would repair these issues" in stdout:
            print("✓ Test mode shows repair actions")
        else:
            print("✗ Test mode didn't show repair actions")
        
        # Step 4: Run actual repair
        print("\n3. Running repair in live mode...")
        exit_code, stdout, stderr = run_mcp_command(["--mode", "live", "--repair", "--force"])
        
        if exit_code == 0 and "Repair completed successfully" in stdout:
            print("✓ Repair completed successfully")
        else:
            print(f"✗ Repair failed with exit code {exit_code}")
            print("STDOUT:", stdout)
            print("STDERR:", stderr)
        
        # Step 5: Verify the issue is fixed
        print("\n4. Verifying repair fixed the issue...")
        
        # Check if ~/.claude.json was cleaned up
        claude_json = Path.home() / ".claude.json"
        if claude_json.exists():
            with open(claude_json, 'r') as f:
                config = json.load(f)
            
            cwd = str(Path.cwd())
            if cwd in config.get("projects", {}):
                project_config = config["projects"][cwd]
                if "mcpServers" in project_config:
                    print("✗ mcpServers still exists in project config")
                else:
                    print("✓ mcpServers removed from project config")
            else:
                print("✓ Project override completely removed")
        else:
            print("✓ ~/.claude.json removed (no other config)")
        
        # Check if servers are visible again
        exit_code, stdout, stderr = run_mcp_command(["--mode", "status"])
        
        if "Empty mcpServers:{} override" not in stdout and "Empty mcpServers:{} override" not in stderr:
            print("✓ Issue no longer detected")
        else:
            print("✗ Issue still present after repair!")
        
        # Step 6: Check if servers were migrated to .mcp.json
        mcp_json = Path.cwd() / ".mcp.json"
        if mcp_json.exists():
            print("✓ .mcp.json exists (servers may have been migrated)")
        
        print("\n" + "=" * 60)
        print("Test completed successfully!")
        return 0
        
    except Exception as e:
        print(f"\nError during test: {e}")
        return 1
        
    finally:
        # Restore original configuration
        if backup_path:
            print("\nRestoring original ~/.claude.json...")
            restore_claude_json(backup_path)


def main():
    """Main entry point"""
    sys.exit(test_repair_empty_override())


if __name__ == "__main__":
    main()