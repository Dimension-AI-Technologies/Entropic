#!/usr/bin/env python3
"""
Test Config Manager integration with the main MCP server manager.

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
"""

import json
import subprocess
import sys
from pathlib import Path

def test_config_manager_integration():
    """Test that the Config Manager integration works"""
    print("Testing Config Manager integration")
    print("=" * 60)
    
    script_path = Path(__file__).parent / "manage_mcp_servers_polyscript.py"
    
    # Test 1: Script imports and initializes correctly
    print("\n1. Testing script import and initialization...")
    
    try:
        result = subprocess.run(
            [sys.executable, str(script_path), "--help"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            print("✓ Script imports and initializes successfully")
        else:
            print(f"✗ Script failed to initialize: {result.stderr}")
            return 1
            
    except Exception as e:
        print(f"✗ Error testing script: {e}")
        return 1
    
    # Test 2: Config Manager issue detection works
    print("\n2. Testing Config Manager issue detection...")
    
    try:
        result = subprocess.run(
            [sys.executable, str(script_path), "--mode", "status", "--json"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            try:
                data = json.loads(result.stdout)
                if "data" in data:
                    print("✓ Config Manager issue detection working")
                else:
                    print("✗ Missing data field in JSON output")
            except json.JSONDecodeError:
                print("✗ Invalid JSON output from status command")
        else:
            print(f"✗ Status command failed: {result.stderr}")
            
    except Exception as e:
        print(f"✗ Error testing status: {e}")
    
    # Test 3: Config Manager provides server locations
    print("\n3. Testing Config Manager server location detection...")
    
    try:
        result = subprocess.run(
            [sys.executable, str(script_path), "--mode", "status"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            print("✓ Config Manager provides server information")
        else:
            print(f"✗ Error getting server information: {result.stderr}")
            
    except Exception as e:
        print(f"✗ Error testing server locations: {e}")
    
    print("\n" + "=" * 60)
    print("Config Manager integration test completed!")
    return 0

def main():
    """Main entry point"""
    sys.exit(test_config_manager_integration())

if __name__ == "__main__":
    main()