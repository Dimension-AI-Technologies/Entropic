#!/usr/bin/env python3
"""
Automated test suite for manage_mcp_servers_polyscript.py

Tests all modes, operations, and edge cases to ensure PolyScript compliance
and correct MCP server management functionality.

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Dict, List, Tuple
import shutil


class TestRunner:
    """Runs tests for the MCP server manager"""
    
    def __init__(self):
        self.script_path = Path(__file__).parent / "manage_mcp_servers_polyscript.py"
        self.tests_passed = 0
        self.tests_failed = 0
        self.test_results = []
        
    def run_command(self, args: List[str], env: Dict[str, str] = None) -> Tuple[int, str, str]:
        """Run the script with given arguments"""
        cmd = [sys.executable, str(self.script_path)] + args
        
        # Merge environment variables
        test_env = os.environ.copy()
        if env:
            test_env.update(env)
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                env=test_env,
                timeout=10
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return -1, "", "Command timed out"
        except Exception as e:
            return -1, "", f"Error running command: {e}"
    
    def assert_equal(self, actual, expected, test_name: str):
        """Assert that two values are equal"""
        if actual == expected:
            self.tests_passed += 1
            self.test_results.append(f"✓ {test_name}")
            return True
        else:
            self.tests_failed += 1
            self.test_results.append(f"✗ {test_name}: expected {expected}, got {actual}")
            return False
    
    def assert_contains(self, haystack: str, needle: str, test_name: str):
        """Assert that a string contains another string"""
        if needle in haystack:
            self.tests_passed += 1
            self.test_results.append(f"✓ {test_name}")
            return True
        else:
            self.tests_failed += 1
            self.test_results.append(f"✗ {test_name}: '{needle}' not found in output")
            return False
    
    def assert_json(self, output: str, test_name: str) -> Dict:
        """Assert that output is valid JSON and return parsed data"""
        try:
            data = json.loads(output)
            self.tests_passed += 1
            self.test_results.append(f"✓ {test_name}")
            return data
        except json.JSONDecodeError as e:
            self.tests_failed += 1
            self.test_results.append(f"✗ {test_name}: invalid JSON - {e}")
            return None
    
    def test_help_flags(self):
        """Test help flags"""
        print("\n=== Testing Help Flags ===")
        
        # Test -h
        exit_code, stdout, stderr = self.run_command(["-h"])
        self.assert_equal(exit_code, 0, "Help flag -h returns 0")
        self.assert_contains(stdout, "usage:", "Help contains usage")
        self.assert_contains(stdout, "--mode", "Help mentions --mode")
        
        # Test --help
        exit_code, stdout, stderr = self.run_command(["--help"])
        self.assert_equal(exit_code, 0, "Help flag --help returns 0")
    
    def test_mode_flags(self):
        """Test execution modes"""
        print("\n=== Testing Execution Modes ===")
        
        # Test default mode (status)
        exit_code, stdout, stderr = self.run_command([])
        self.assert_equal(exit_code, 0, "Default mode returns 0")
        self.assert_contains(stdout, "MCP Server Configuration Status", "Default mode is status")
        
        # Test explicit status mode
        exit_code, stdout, stderr = self.run_command(["--mode", "status"])
        self.assert_equal(exit_code, 0, "Status mode returns 0")
        
        # Test test mode
        exit_code, stdout, stderr = self.run_command(["--mode", "test"])
        self.assert_equal(exit_code, 0, "Test mode returns 0")
        self.assert_contains(stdout, "[TEST MODE]", "Test mode output contains mode marker")
        
        # Test sandbox mode
        exit_code, stdout, stderr = self.run_command(["--mode", "sandbox"])
        self.assert_equal(exit_code, 0, "Sandbox mode returns 0")
        self.assert_contains(stdout, "[SANDBOX MODE]", "Sandbox mode output contains mode marker")
        
        # Test invalid mode
        exit_code, stdout, stderr = self.run_command(["--mode", "invalid"])
        self.assert_equal(exit_code, 2, "Invalid mode returns 2")
    
    def test_json_output(self):
        """Test JSON output format"""
        print("\n=== Testing JSON Output ===")
        
        # Test status mode JSON
        exit_code, stdout, stderr = self.run_command(["--mode", "status", "--json"])
        data = self.assert_json(stdout, "Status mode outputs valid JSON")
        if data:
            self.assert_equal(data.get("polyscript"), "1.0", "JSON has polyscript version")
            self.assert_equal(data.get("mode"), "status", "JSON has correct mode")
            self.assert_equal(data.get("tool"), "MCPServerManager", "JSON has correct tool name")
            self.assert_equal(data.get("status"), "success", "JSON shows success status")
        
        # Test test mode JSON
        exit_code, stdout, stderr = self.run_command(["--mode", "test", "--json"])
        data = self.assert_json(stdout, "Test mode outputs valid JSON")
        
        # Test sandbox mode JSON
        exit_code, stdout, stderr = self.run_command(["--mode", "sandbox", "--json"])
        data = self.assert_json(stdout, "Sandbox mode outputs valid JSON")
    
    def test_list_available(self):
        """Test --list-available functionality"""
        print("\n=== Testing List Available ===")
        
        # Test normal output
        exit_code, stdout, stderr = self.run_command(["--list-available"])
        self.assert_equal(exit_code, 0, "List available returns 0")
        self.assert_contains(stdout, "sequential-thinking", "Lists sequential-thinking server")
        self.assert_contains(stdout, "linear", "Lists linear server")
        self.assert_contains(stdout, "context7", "Lists context7 server")
        
        # Test JSON output
        exit_code, stdout, stderr = self.run_command(["--list-available", "--json"])
        data = self.assert_json(stdout, "List available outputs valid JSON")
        if data:
            servers = data.get("data", {}).get("available_servers", {})
            self.assert_equal("sequential-thinking" in servers, True, "JSON contains sequential-thinking")
    
    def test_test_mode_operations(self):
        """Test operations in test mode"""
        print("\n=== Testing Test Mode Operations ===")
        
        # Test add operation
        exit_code, stdout, stderr = self.run_command(["--mode", "test", "--add", "linear"])
        self.assert_equal(exit_code, 0, "Test add returns 0")
        self.assert_contains(stdout, "Would ADD", "Test add shows simulation")
        
        # Test add non-existent server
        exit_code, stdout, stderr = self.run_command(["--mode", "test", "--add", "nonexistent"])
        self.assert_equal(exit_code, 1, "Test add non-existent returns 1")
        
        # Test remove operation
        exit_code, stdout, stderr = self.run_command(["--mode", "test", "--remove", "linear"])
        # Note: may return 0 or 1 depending on whether server is configured
        self.assert_contains(stdout, "Would REMOVE", "Test remove shows simulation")
    
    def test_scope_handling(self):
        """Test scope parameter"""
        print("\n=== Testing Scope Handling ===")
        
        # Test user scope (default)
        exit_code, stdout, stderr = self.run_command(["--mode", "test", "--add", "linear"])
        self.assert_contains(stdout, "user scope", "Default scope is user")
        
        # Test project scope
        exit_code, stdout, stderr = self.run_command(["--mode", "test", "--scope", "project", "--add", "linear"])
        self.assert_contains(stdout, "project scope", "Project scope is recognized")
        
        # Test machine scope
        exit_code, stdout, stderr = self.run_command(["--mode", "test", "--scope", "machine", "--add", "linear"])
        # Should show permission warning if not root
        if os.geteuid() != 0:
            self.assert_contains(stdout + stderr, "permission", "Machine scope shows permission info")
    
    def test_exit_codes(self):
        """Test exit codes for various scenarios"""
        print("\n=== Testing Exit Codes ===")
        
        # Success cases
        exit_code, _, _ = self.run_command(["--mode", "status"])
        self.assert_equal(exit_code, 0, "Status mode success returns 0")
        
        exit_code, _, _ = self.run_command(["--mode", "test"])
        self.assert_equal(exit_code, 0, "Test mode with no errors returns 0")
        
        # Failure cases
        exit_code, _, _ = self.run_command(["--mode", "test", "--add", "nonexistent"])
        self.assert_equal(exit_code, 1, "Test mode with errors returns 1")
        
        # Invalid arguments
        exit_code, _, _ = self.run_command(["--invalid-flag"])
        self.assert_equal(exit_code, 2, "Invalid arguments return 2")
    
    def test_sandbox_checks(self):
        """Test sandbox mode checks"""
        print("\n=== Testing Sandbox Checks ===")
        
        exit_code, stdout, stderr = self.run_command(["--mode", "sandbox"])
        
        # Check prerequisites
        self.assert_contains(stdout, "Node.js:", "Sandbox checks Node.js")
        self.assert_contains(stdout, "npx:", "Sandbox checks npx")
        
        # Check server availability
        self.assert_contains(stdout, "Testing server availability", "Sandbox tests servers")
        
        # Test with specific server
        exit_code, stdout, stderr = self.run_command(["--mode", "sandbox", "--add", "linear"])
        self.assert_contains(stdout, "linear", "Sandbox tests specific server")
        self.assert_contains(stdout, "LINEAR_API_KEY", "Sandbox checks env vars")
    
    def test_verbose_flag(self):
        """Test verbose output"""
        print("\n=== Testing Verbose Flag ===")
        
        # Compare normal vs verbose
        _, stdout_normal, _ = self.run_command(["--mode", "status"])
        _, stdout_verbose, _ = self.run_command(["--mode", "status", "--verbose"])
        
        # Verbose should have more content
        self.assert_equal(
            len(stdout_verbose) > len(stdout_normal),
            True,
            "Verbose output is longer than normal"
        )
    
    def test_polyscript_compliance(self):
        """Test PolyScript standard compliance"""
        print("\n=== Testing PolyScript Compliance ===")
        
        # Test that all required modes exist
        modes = ["status", "test", "sandbox", "live"]
        for mode in modes:
            exit_code, _, _ = self.run_command(["--mode", mode, "--help"])
            self.assert_equal(exit_code, 0, f"Mode '{mode}' is supported")
        
        # Test standard flags
        flags = ["-v", "--verbose", "-f", "--force", "--json"]
        for flag in flags:
            exit_code, _, _ = self.run_command([flag, "--help"])
            self.assert_equal(exit_code, 0, f"Flag '{flag}' is supported")
    
    def run_all_tests(self):
        """Run all tests"""
        print("Starting MCP Server Manager Test Suite")
        print("=" * 50)
        
        # Check script exists
        if not self.script_path.exists():
            print(f"Error: Script not found at {self.script_path}")
            return 1
        
        # Run test categories
        self.test_help_flags()
        self.test_mode_flags()
        self.test_json_output()
        self.test_list_available()
        self.test_test_mode_operations()
        self.test_scope_handling()
        self.test_exit_codes()
        self.test_sandbox_checks()
        self.test_verbose_flag()
        self.test_polyscript_compliance()
        
        # Print summary
        print("\n" + "=" * 50)
        print("Test Summary")
        print("=" * 50)
        
        for result in self.test_results:
            print(result)
        
        print(f"\nTotal: {self.tests_passed + self.tests_failed} tests")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_failed}")
        
        if self.tests_failed == 0:
            print("\n✓ All tests passed!")
            return 0
        else:
            print(f"\n✗ {self.tests_failed} tests failed")
            return 1


def main():
    """Main entry point"""
    runner = TestRunner()
    sys.exit(runner.run_all_tests())


if __name__ == "__main__":
    main()