#!/usr/bin/env python3
"""
Test ~/.claude.json issue detection

Tests various problematic configurations in ~/.claude.json and ensures
the tool correctly detects and reports them.

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
    else:
        # Remove ~/.claude.json if no backup
        claude_json = Path.home() / ".claude.json"
        if claude_json.exists():
            claude_json.unlink()


def create_test_claude_json(config):
    """Create a test ~/.claude.json with given config"""
    claude_json = Path.home() / ".claude.json"
    with open(claude_json, 'w') as f:
        json.dump(config, f, indent=2)


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


def test_claude_json_issues():
    """Test various ~/.claude.json issue detection scenarios"""
    print("Testing ~/.claude.json issue detection")
    print("=" * 60)
    
    # Backup existing configuration
    backup_path = backup_claude_json()
    cwd = str(Path.cwd())
    
    try:
        # Test 1: Empty mcpServers override
        print("\n1. Testing empty mcpServers:{} override detection...")
        
        config = {
            "projects": {
                cwd: {
                    "mcpServers": {}
                }
            }
        }
        create_test_claude_json(config)
        
        exit_code, stdout, stderr = run_mcp_command(["--mode", "status"])
        
        if "Empty mcpServers:{} override" in stdout:
            print("✓ Empty override detected")
        else:
            print("✗ Empty override not detected")
        
        # Test 2: Project-specific servers (should be in .mcp.json)
        print("\n2. Testing project-specific mcpServers detection...")
        
        config = {
            "projects": {
                cwd: {
                    "mcpServers": {
                        "test-server": {
                            "command": "echo",
                            "args": ["test"]
                        }
                    }
                }
            }
        }
        create_test_claude_json(config)
        
        exit_code, stdout, stderr = run_mcp_command(["--mode", "status"])
        
        if "Project-specific mcpServers" in stdout:
            print("✓ Project-specific servers detected")
        else:
            print("✗ Project-specific servers not detected")
        
        # Test 3: JSON validation issues
        print("\n3. Testing JSON validation...")
        
        # Create malformed JSON
        claude_json = Path.home() / ".claude.json"
        with open(claude_json, 'w') as f:
            f.write('{ "invalid": json, }')  # Malformed JSON
        
        exit_code, stdout, stderr = run_mcp_command(["--mode", "status"])
        
        if "Error reading ~/.claude.json" in stdout:
            print("✓ JSON parsing error detected")
        else:
            print("✗ JSON parsing error not detected")
        
        # Test 4: No issues present
        print("\n4. Testing with clean configuration...")
        
        config = {
            "someOtherSetting": "value"
        }
        create_test_claude_json(config)
        
        exit_code, stdout, stderr = run_mcp_command(["--mode", "status"])
        
        if "Configuration Issues" not in stdout:
            print("✓ No false positives for clean config")
        else:
            print("✗ False positive issue detected")
        
        # Test 5: JSON output includes issues
        print("\n5. Testing JSON output includes issues...")
        
        # Create a config with issues
        config = {
            "projects": {
                cwd: {
                    "mcpServers": {}
                }
            }
        }
        create_test_claude_json(config)
        
        exit_code, stdout, stderr = run_mcp_command(["--mode", "status", "--json"])
        
        try:
            data = json.loads(stdout)
            if "data" in data and "issues" in data["data"]:
                issues = data["data"]["issues"]
                if any("Empty mcpServers:{}" in issue for issue in issues):
                    print("✓ Issues properly included in JSON output")
                else:
                    print("✗ Issues not in JSON output")
                    print("Issues:", issues)
            else:
                print("✗ No issues field in JSON output")
        except json.JSONDecodeError:
            print("✗ Invalid JSON output")
        
        # Test 6: Multiple issues
        print("\n6. Testing multiple issues detection...")
        
        config = {
            "projects": {
                cwd: {
                    "mcpServers": {}  # Empty override
                },
                "/some/other/path": {
                    "mcpServers": {
                        "another-server": {"command": "test"}
                    }
                }
            }
        }
        create_test_claude_json(config)
        
        exit_code, stdout, stderr = run_mcp_command(["--mode", "status"])
        
        issue_count = stdout.count("mcpServers")
        if issue_count >= 2:  # Should detect at least the current directory issue
            print("✓ Multiple issues can be detected")
        else:
            print("✗ Not all issues detected")
        
        print("\n" + "=" * 60)
        print("~/.claude.json issue detection test completed!")
        return 0
        
    except Exception as e:
        print(f"\nError during test: {e}")
        return 1
        
    finally:
        # Restore original configuration
        print("\nRestoring original ~/.claude.json...")
        restore_claude_json(backup_path)


def main():
    """Main entry point"""
    sys.exit(test_claude_json_issues())


if __name__ == "__main__":
    main()