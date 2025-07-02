#!/usr/bin/env python3
"""
PolyScript Validator - Proof of Concept
Validates that scripts comply with the PolyScript v1.0 standard
"""

import argparse
import subprocess
import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from enum import Enum
from dataclasses import dataclass


class ValidationResult(Enum):
    PASS = "✅"
    FAIL = "❌"
    WARN = "⚠️"
    SKIP = "⏭️"


@dataclass
class TestResult:
    name: str
    result: ValidationResult
    message: str
    details: Optional[str] = None


class PolyScriptValidator:
    """Validates scripts against PolyScript v1.0 standard"""
    
    STANDARD_MODES = ["status", "test", "sandbox", "live"]
    STANDARD_FLAGS = {
        "--verbose": ["-v"],
        "--force": ["-f"],
        "--json": []
    }
    STANDARD_EXIT_CODES = [0, 1]
    
    def __init__(self, script_path: str, language: Optional[str] = None):
        self.script_path = Path(script_path)
        self.language = language or self._detect_language()
        self.results: List[TestResult] = []
        
    def _detect_language(self) -> str:
        """Detect script language from extension"""
        ext_map = {
            ".py": "python",
            ".ps1": "powershell",
            ".sh": "bash",
            ".js": "javascript",
            ".fsx": "fsharp",
            ".csx": "csharp"
        }
        return ext_map.get(self.script_path.suffix.lower(), "unknown")
    
    def _run_command(self, args: List[str], timeout: int = 5) -> Tuple[int, str, str]:
        """Run script with arguments and capture output"""
        cmd = self._build_command(args)
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return -1, "", "Command timed out"
        except Exception as e:
            return -1, "", str(e)
    
    def _build_command(self, args: List[str]) -> List[str]:
        """Build command based on language"""
        script = str(self.script_path)
        
        if self.language == "python":
            return ["python3", script] + args
        elif self.language == "powershell":
            return ["pwsh", "-File", script] + args
        elif self.language == "bash":
            return ["bash", script] + args
        elif self.language == "javascript":
            return ["node", script] + args
        elif self.language == "fsharp":
            return ["dotnet", "fsi", script, "--"] + args
        elif self.language == "csharp":
            return ["dotnet", "script", script, "--"] + args
        else:
            return [script] + args
    
    def validate(self) -> bool:
        """Run all validation tests"""
        print(f"\n🔍 Validating {self.script_path.name} ({self.language})")
        print("=" * 60)
        
        # Check if script exists
        if not self.script_path.exists():
            self.results.append(TestResult(
                "Script exists",
                ValidationResult.FAIL,
                f"Script not found: {self.script_path}"
            ))
            return False
        
        # Run validation tests
        self.test_help_output()
        self.test_standard_modes()
        self.test_standard_flags()
        self.test_exit_codes()
        self.test_json_output()
        self.test_default_mode()
        
        # Print results
        self._print_results()
        
        # Return overall pass/fail
        return all(r.result != ValidationResult.FAIL for r in self.results)
    
    def test_help_output(self):
        """Test that --help works and mentions standard modes"""
        code, stdout, stderr = self._run_command(["--help"])
        
        if code == 0 and stdout:
            # Check for mode mentions
            modes_found = sum(1 for mode in self.STANDARD_MODES if mode in stdout.lower())
            if modes_found >= 3:  # At least 3 of 4 modes mentioned
                self.results.append(TestResult(
                    "Help output",
                    ValidationResult.PASS,
                    "Help text includes standard modes"
                ))
            else:
                self.results.append(TestResult(
                    "Help output",
                    ValidationResult.WARN,
                    f"Help text missing some modes (found {modes_found}/4)"
                ))
        else:
            self.results.append(TestResult(
                "Help output",
                ValidationResult.FAIL,
                "Failed to get help output",
                stderr
            ))
    
    def test_standard_modes(self):
        """Test that all standard modes are supported"""
        for mode in self.STANDARD_MODES:
            code, stdout, stderr = self._run_command(["--mode", mode])
            
            if code in self.STANDARD_EXIT_CODES:
                self.results.append(TestResult(
                    f"Mode: {mode}",
                    ValidationResult.PASS,
                    f"Accepts --mode {mode}"
                ))
            else:
                self.results.append(TestResult(
                    f"Mode: {mode}",
                    ValidationResult.FAIL,
                    f"Failed with exit code {code}",
                    stderr
                ))
    
    def test_standard_flags(self):
        """Test standard flags are supported"""
        for flag, aliases in self.STANDARD_FLAGS.items():
            # Test main flag
            code, _, stderr = self._run_command([flag, "--mode", "status"])
            
            if code in self.STANDARD_EXIT_CODES:
                self.results.append(TestResult(
                    f"Flag: {flag}",
                    ValidationResult.PASS,
                    f"Accepts {flag}"
                ))
            else:
                self.results.append(TestResult(
                    f"Flag: {flag}",
                    ValidationResult.WARN,
                    f"May not support {flag}",
                    stderr[:100]
                ))
            
            # Test aliases
            for alias in aliases:
                code, _, _ = self._run_command([alias, "--mode", "status"])
                if code in self.STANDARD_EXIT_CODES:
                    self.results.append(TestResult(
                        f"Alias: {alias}",
                        ValidationResult.PASS,
                        f"Accepts {alias} for {flag}"
                    ))
    
    def test_exit_codes(self):
        """Test that script returns standard exit codes"""
        # Test successful operation
        code, _, _ = self._run_command(["--mode", "status"])
        
        if code in self.STANDARD_EXIT_CODES:
            self.results.append(TestResult(
                "Exit codes",
                ValidationResult.PASS,
                f"Returns standard exit code ({code})"
            ))
        else:
            self.results.append(TestResult(
                "Exit codes",
                ValidationResult.FAIL,
                f"Non-standard exit code: {code}"
            ))
    
    def test_json_output(self):
        """Test JSON output when requested"""
        code, stdout, _ = self._run_command(["--mode", "status", "--json"])
        
        if code in self.STANDARD_EXIT_CODES and stdout:
            try:
                json.loads(stdout)
                self.results.append(TestResult(
                    "JSON output",
                    ValidationResult.PASS,
                    "Produces valid JSON with --json"
                ))
            except json.JSONDecodeError:
                self.results.append(TestResult(
                    "JSON output",
                    ValidationResult.WARN,
                    "Output with --json is not valid JSON"
                ))
        else:
            self.results.append(TestResult(
                "JSON output",
                ValidationResult.SKIP,
                "Could not test JSON output"
            ))
    
    def test_default_mode(self):
        """Test that default mode is 'status'"""
        # Run without --mode
        code1, stdout1, _ = self._run_command([])
        # Run with --mode status
        code2, stdout2, _ = self._run_command(["--mode", "status"])
        
        if code1 == code2 and len(stdout1) > 0 and len(stdout2) > 0:
            # Simple check - both should produce output
            self.results.append(TestResult(
                "Default mode",
                ValidationResult.PASS,
                "Default mode appears to be 'status'"
            ))
        else:
            self.results.append(TestResult(
                "Default mode",
                ValidationResult.WARN,
                "Default mode may not be 'status'"
            ))
    
    def _print_results(self):
        """Print test results in a formatted table"""
        print("\nTest Results:")
        print("-" * 60)
        
        for result in self.results:
            print(f"{result.result.value} {result.name:<30} {result.message}")
            if result.details and result.result == ValidationResult.FAIL:
                print(f"   Details: {result.details[:80]}")
        
        # Summary
        print("-" * 60)
        passed = sum(1 for r in self.results if r.result == ValidationResult.PASS)
        failed = sum(1 for r in self.results if r.result == ValidationResult.FAIL)
        warned = sum(1 for r in self.results if r.result == ValidationResult.WARN)
        
        print(f"Summary: {passed} passed, {failed} failed, {warned} warnings")
        
        if failed == 0:
            print("\n✅ Script is PolyScript v1.0 compliant!")
        else:
            print("\n❌ Script is not fully compliant with PolyScript v1.0")


def main():
    parser = argparse.ArgumentParser(
        description="Validate scripts against PolyScript v1.0 standard"
    )
    parser.add_argument(
        "script",
        help="Path to script to validate"
    )
    parser.add_argument(
        "--language",
        choices=["python", "powershell", "bash", "javascript", "fsharp", "csharp"],
        help="Override language detection"
    )
    parser.add_argument(
        "--spec",
        help="Path to PolyScript specification (future use)"
    )
    
    args = parser.parse_args()
    
    # Create validator
    validator = PolyScriptValidator(args.script, args.language)
    
    # Run validation
    success = validator.validate()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()