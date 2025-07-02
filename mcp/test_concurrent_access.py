#!/usr/bin/env python3
"""
Test concurrent access protection for MCP server manager

This script tests that file locking prevents corruption when multiple
instances try to modify configuration simultaneously.

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
"""

import subprocess
import sys
import time
import threading
from pathlib import Path
import json


def run_add_command(server_name: str, result_list: list, index: int):
    """Run the add command and store result"""
    script_path = Path(__file__).parent / "manage_mcp_servers_polyscript.py"
    cmd = [
        sys.executable, 
        str(script_path), 
        "--mode", "live", 
        "--add", server_name,
        "--force"  # Skip confirmation
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        result_list[index] = {
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "server": server_name
        }
    except Exception as e:
        result_list[index] = {
            "returncode": -1,
            "error": str(e),
            "server": server_name
        }


def main():
    """Test concurrent modifications"""
    print("Testing concurrent access protection...")
    
    # Create threads to add servers simultaneously
    servers = ["sequential-thinking", "linear", "context7"]
    threads = []
    results = [None] * len(servers)
    
    print(f"Starting {len(servers)} concurrent add operations...")
    
    # Start all threads at once
    for i, server in enumerate(servers):
        thread = threading.Thread(
            target=run_add_command,
            args=(server, results, i)
        )
        threads.append(thread)
        thread.start()
    
    # Wait for all threads to complete
    for thread in threads:
        thread.join(timeout=35)
    
    # Check results
    print("\nResults:")
    success_count = 0
    lock_timeout_count = 0
    
    for result in results:
        if result is None:
            print(f"- TIMEOUT: Thread did not complete")
        elif "returncode" in result:
            if result["returncode"] == 0:
                print(f"- SUCCESS: {result['server']} added")
                success_count += 1
            else:
                if "Timeout waiting for lock" in result.get("stderr", ""):
                    print(f"- LOCK TIMEOUT: {result['server']} (expected behavior)")
                    lock_timeout_count += 1
                else:
                    print(f"- ERROR: {result['server']} failed with code {result['returncode']}")
                    if result.get("stderr"):
                        print(f"  Error: {result['stderr'].strip()}")
        else:
            print(f"- ERROR: {result}")
    
    # Verify configuration integrity
    print("\nVerifying configuration integrity...")
    settings_path = Path.home() / ".claude" / "settings.json"
    
    try:
        with open(settings_path, 'r') as f:
            config = json.load(f)
        print("✓ Configuration file is valid JSON")
        
        servers_configured = list(config.get("mcpServers", {}).keys())
        print(f"✓ Configured servers: {', '.join(servers_configured)}")
        
    except json.JSONDecodeError:
        print("✗ Configuration file is corrupted!")
        return 1
    except Exception as e:
        print(f"✗ Error reading configuration: {e}")
        return 1
    
    print("\nSummary:")
    print(f"- Successful additions: {success_count}")
    print(f"- Lock timeouts: {lock_timeout_count}")
    print(f"- Total operations: {len(servers)}")
    
    if success_count + lock_timeout_count == len(servers):
        print("\n✓ File locking is working correctly!")
        print("  Some operations timed out waiting for locks, which is expected behavior.")
        return 0
    else:
        print("\n✗ Unexpected results")
        return 1


if __name__ == "__main__":
    sys.exit(main())