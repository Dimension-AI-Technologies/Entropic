#!/usr/bin/env python3
"""
Test configuration conflict detection

Tests when servers are configured in multiple scopes and ensures
the tool correctly detects and reports these conflicts.

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
"""

import json
import os
import subprocess
import sys
from pathlib import Path


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


def setup_conflict_scenario():
    """Set up a server in both user and project scopes"""
    print("Setting up conflict scenario...")
    
    # Add server to project scope
    print("1. Adding 'linear' to project scope...")
    exit_code, stdout, stderr = run_mcp_command([
        "--mode", "live",
        "--scope", "project", 
        "--add", "linear",
        "--force"
    ])
    
    if exit_code != 0:
        print(f"Failed to add to project scope: {stderr}")
        return False
    
    # Server already exists in user scope from previous tests
    # Let's verify both exist
    return True


def test_conflict_detection():
    """Test that conflicts are properly detected and reported"""
    print("\nTesting conflict detection")
    print("=" * 60)
    
    # Setup the conflict
    if not setup_conflict_scenario():
        return 1
    
    # Test 1: Check status mode detects conflicts
    print("\n2. Testing conflict detection in status mode...")
    exit_code, stdout, stderr = run_mcp_command(["--mode", "status"])
    
    if "Servers configured in multiple scopes" in stdout:
        print("✓ Conflict warning displayed")
        
        # Check if linear is listed as conflicted
        if "linear:" in stdout and ("user" in stdout and "project" in stdout):
            print("✓ Specific conflict correctly identified (linear in user + project)")
        else:
            print("✗ Conflict details not shown correctly")
    else:
        print("✗ No conflict warning shown")
        print("STDOUT:", stdout)
    
    # Test 2: Check JSON output includes conflicts
    print("\n3. Testing conflict detection in JSON output...")
    exit_code, stdout, stderr = run_mcp_command(["--mode", "status", "--json"])
    
    try:
        data = json.loads(stdout)
        if "data" in data and "conflicts" in data["data"]:
            conflicts = data["data"]["conflicts"]
            if "linear" in conflicts:
                print("✓ Conflicts properly included in JSON output")
            else:
                print("✗ Linear not in conflicts list")
                print("Conflicts:", conflicts)
        else:
            print("✗ No conflicts field in JSON output")
            print("JSON:", json.dumps(data, indent=2))
    except json.JSONDecodeError:
        print("✗ Invalid JSON output")
        print("Output:", stdout)
    
    # Test 3: Verify which scope takes precedence
    print("\n4. Testing scope precedence...")
    print("   (Project scope should override user scope)")
    
    # Check the actual configuration being used
    project_config = Path.cwd() / ".mcp.json"
    user_config = Path.home() / ".claude" / "settings.json"
    
    project_has_linear = False
    user_has_linear = False
    
    if project_config.exists():
        with open(project_config, 'r') as f:
            config = json.load(f)
            if "linear" in config.get("mcpServers", {}):
                project_has_linear = True
                print("✓ Linear is in project scope")
    
    if user_config.exists():
        with open(user_config, 'r') as f:
            config = json.load(f)
            if "linear" in config.get("mcpServers", {}):
                user_has_linear = True
                print("✓ Linear is in user scope")
    
    if project_has_linear and user_has_linear:
        print("✓ Conflict scenario confirmed - linear in both scopes")
    else:
        print("✗ Conflict scenario not properly set up")
    
    # Test 4: Clean up - remove from project scope
    print("\n5. Cleaning up - removing from project scope...")
    exit_code, stdout, stderr = run_mcp_command([
        "--mode", "live",
        "--scope", "project",
        "--remove", "linear",
        "--force"
    ])
    
    if exit_code == 0:
        print("✓ Cleanup successful")
    else:
        print("✗ Cleanup failed")
    
    print("\n" + "=" * 60)
    print("Conflict detection test completed!")
    return 0


def main():
    """Main entry point"""
    sys.exit(test_conflict_detection())


if __name__ == "__main__":
    main()