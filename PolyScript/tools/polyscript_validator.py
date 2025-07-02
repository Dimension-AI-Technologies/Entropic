#!/usr/bin/env python3
"""
PolyScript Validator - Comprehensive Compliance Testing Tool

Validates that CLI tools follow the PolyScript behavioral standard v1.0.
This tool itself is PolyScript-compliant and serves as both a validator
and an example of proper PolyScript implementation.

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

# Import PolyScript base framework
try:
    from polyscript import PolyScriptBase
except ImportError:
    print("Error: PolyScript framework not found. Please ensure polyscript.py is available.")
    sys.exit(1)


class ValidationResult:
    """Represents the result of a validation test"""
    
    def __init__(self, test_name: str, passed: bool, message: str = "", details: Dict = None):
        self.test_name = test_name
        self.passed = passed
        self.message = message
        self.details = details or {}
        self.category = ""


class PolyScriptValidator(PolyScriptBase):
    """PolyScript-compliant tool for validating other PolyScript tools"""
    
    def get_description(self) -> str:
        return """PolyScript Validator - Comprehensive Compliance Testing
        
Validates that CLI tools follow the PolyScript behavioral standard v1.0.
Tests include mode support, argument handling, JSON output format,
error handling, and exit code compliance."""
    
    def add_arguments(self, parser: argparse.ArgumentParser):
        """Add validator-specific arguments"""
        parser.add_argument(
            "tool_path",
            nargs="?",
            help="Path to the tool to validate"
        )
        
        parser.add_argument(
            "--category", "-c",
            choices=["all", "structural", "behavioral", "output", "standards", "errors"],
            default="all",
            help="Validation category to test (default: all)"
        )
        
        parser.add_argument(
            "--timeout",
            type=int,
            default=10,
            help="Timeout for tool execution in seconds (default: 10)"
        )
        
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Enable strict validation (fail on warnings)"
        )
    
    def execute_status(self) -> int:
        """Show validator status and available tests"""
        status_data = {
            "validator_version": "1.0.0",
            "polyscript_version": "1.0",
            "available_categories": [
                "structural", "behavioral", "output", "standards", "errors"
            ],
            "test_count": self._get_total_test_count(),
            "target_tool": self.args.tool_path or "none specified"
        }
        
        if self.args.json:
            self.output(status_data)
        else:
            self.output("[STATUS] PolyScript Validator")
            self.output(f"Validator Version: {status_data['validator_version']}")
            self.output(f"PolyScript Version: {status_data['polyscript_version']}")
            self.output(f"Available Categories: {', '.join(status_data['available_categories'])}")
            self.output(f"Total Tests: {status_data['test_count']}")
            self.output(f"Target Tool: {status_data['target_tool']}")
        
        return 0
    
    def execute_test(self) -> int:
        """Test mode - validate tool compliance without real execution"""
        if not self.args.tool_path:
            self.output("Error: tool_path is required for validation", error=True)
            return 1
        
        tool_path = Path(self.args.tool_path)
        
        test_data = {
            "mode": "test",
            "target_tool": str(tool_path),
            "category": self.args.category,
            "validation_plan": self._get_validation_plan(),
            "estimated_duration": "30-60 seconds",
            "test_count": self._get_test_count_for_category(self.args.category)
        }
        
        if self.args.json:
            self.output(test_data)
        else:
            self.output("[TEST MODE] PolyScript Validation Plan")
            self.output(f"Target Tool: {test_data['target_tool']}")
            self.output(f"Category: {test_data['category']}")
            self.output(f"Estimated Duration: {test_data['estimated_duration']}")
            self.output(f"Tests to Run: {test_data['test_count']}")
            self.output("\nValidation Plan:")
            for category, tests in test_data['validation_plan'].items():
                self.output(f"  {category}: {len(tests)} tests")
                if self.args.verbose:
                    for test in tests:
                        self.output(f"    - {test}")
        
        return 0
    
    def execute_sandbox(self) -> int:
        """Sandbox mode - test validation environment"""
        sandbox_data = {
            "mode": "sandbox",
            "prerequisites": {},
            "environment": {},
            "summary": {
                "all_passed": True,
                "issues": []
            }
        }
        
        if not self.args.json:
            self.output("[SANDBOX MODE] Testing PolyScript Validator Environment")
            self.output("\nChecking prerequisites:")
        
        # Check Python environment
        try:
            python_version = sys.version.split()[0]
            sandbox_data["prerequisites"]["python"] = {
                "status": "available",
                "version": python_version,
                "required": "3.7+"
            }
            if not self.args.json:
                self.output(f"  ✓ Python: {python_version}")
        except Exception as e:
            sandbox_data["prerequisites"]["python"] = {
                "status": "error",
                "error": str(e)
            }
            sandbox_data["summary"]["all_passed"] = False
            sandbox_data["summary"]["issues"].append(f"Python check failed: {e}")
            if not self.args.json:
                self.output(f"  ✗ Python: {e}", error=True)
        
        # Check subprocess availability
        try:
            subprocess.run(["echo", "test"], capture_output=True, check=True, timeout=1)
            sandbox_data["prerequisites"]["subprocess"] = {
                "status": "available"
            }
            if not self.args.json:
                self.output("  ✓ Subprocess execution: available")
        except Exception as e:
            sandbox_data["prerequisites"]["subprocess"] = {
                "status": "error",
                "error": str(e)
            }
            sandbox_data["summary"]["all_passed"] = False
            sandbox_data["summary"]["issues"].append(f"Subprocess execution failed: {e}")
            if not self.args.json:
                self.output(f"  ✗ Subprocess execution: {e}", error=True)
        
        # Check JSON parsing
        try:
            test_json = '{"test": "value"}'
            json.loads(test_json)
            sandbox_data["prerequisites"]["json"] = {
                "status": "available"
            }
            if not self.args.json:
                self.output("  ✓ JSON parsing: available")
        except Exception as e:
            sandbox_data["prerequisites"]["json"] = {
                "status": "error",
                "error": str(e)
            }
            sandbox_data["summary"]["all_passed"] = False
            sandbox_data["summary"]["issues"].append(f"JSON parsing failed: {e}")
            if not self.args.json:
                self.output(f"  ✗ JSON parsing: {e}", error=True)
        
        # Test target tool accessibility if provided
        if self.args.tool_path:
            if not self.args.json:
                self.output("\nChecking target tool:")
            
            tool_path = Path(self.args.tool_path)
            if tool_path.exists():
                sandbox_data["environment"]["target_tool"] = {
                    "status": "accessible",
                    "path": str(tool_path),
                    "executable": os.access(tool_path, os.X_OK)
                }
                if not self.args.json:
                    exec_status = "executable" if os.access(tool_path, os.X_OK) else "not executable"
                    self.output(f"  ✓ Target tool: accessible ({exec_status})")
            else:
                sandbox_data["environment"]["target_tool"] = {
                    "status": "not_found",
                    "path": str(tool_path)
                }
                sandbox_data["summary"]["all_passed"] = False
                sandbox_data["summary"]["issues"].append(f"Target tool not found: {tool_path}")
                if not self.args.json:
                    self.output(f"  ✗ Target tool: not found at {tool_path}", error=True)
        
        if self.args.json:
            self.output(sandbox_data)
        else:
            if sandbox_data["summary"]["all_passed"]:
                self.output("\n✓ All environment checks passed")
            else:
                self.output(f"\n✗ {len(sandbox_data['summary']['issues'])} issues found")
        
        return 0 if sandbox_data["summary"]["all_passed"] else 1
    
    def execute_live(self) -> int:
        """Live mode - perform actual validation"""
        if not self.args.tool_path:
            self.output("Error: tool_path is required for validation", error=True)
            return 1
        
        tool_path = Path(self.args.tool_path)
        if not tool_path.exists():
            self.output(f"Error: Tool not found at {tool_path}", error=True)
            return 1
        
        try:
            # Run comprehensive validation
            results = self._run_validation(tool_path)
            
            # Analyze results
            total_tests = len(results)
            passed_tests = sum(1 for r in results if r.passed)
            failed_tests = total_tests - passed_tests
            
            # Calculate compliance score
            compliance_score = (passed_tests / total_tests * 100) if total_tests > 0 else 0
            
            # Determine overall result
            if self.args.strict:
                # In strict mode, any failure means non-compliance
                overall_passed = failed_tests == 0
            else:
                # In normal mode, allow some warnings but require core compliance
                critical_failures = sum(1 for r in results 
                                      if not r.passed and r.category in ["structural", "behavioral"])
                overall_passed = critical_failures == 0
            
            live_data = {
                "mode": "live",
                "target_tool": str(tool_path),
                "category": self.args.category,
                "validation_results": {
                    "total_tests": total_tests,
                    "passed": passed_tests,
                    "failed": failed_tests,
                    "compliance_score": round(compliance_score, 1),
                    "overall_passed": overall_passed
                },
                "test_results": []
            }
            
            # Add detailed results
            for result in results:
                live_data["test_results"].append({
                    "test_name": result.test_name,
                    "category": result.category,
                    "passed": result.passed,
                    "message": result.message,
                    "details": result.details
                })
            
            if self.args.json:
                self.output(live_data)
            else:
                self.output(f"[LIVE MODE] PolyScript Validation Results")
                self.output(f"Target Tool: {tool_path}")
                self.output(f"Category: {self.args.category}")
                self.output(f"Tests Run: {total_tests}")
                self.output(f"Passed: {passed_tests}")
                self.output(f"Failed: {failed_tests}")
                self.output(f"Compliance Score: {compliance_score:.1f}%")
                
                # Show detailed results
                self.output("\nDetailed Results:")
                by_category = {}
                for result in results:
                    by_category.setdefault(result.category, []).append(result)
                
                for category, cat_results in by_category.items():
                    self.output(f"\n{category.upper()}:")
                    for result in cat_results:
                        status = "✓" if result.passed else "✗"
                        self.output(f"  {status} {result.test_name}")
                        if not result.passed or self.args.verbose:
                            if result.message:
                                self.output(f"      {result.message}")
                
                # Overall result
                if overall_passed:
                    self.output(f"\n✓ PolyScript compliance: PASSED")
                else:
                    self.output(f"\n✗ PolyScript compliance: FAILED")
            
            return 0 if overall_passed else 1
            
        except Exception as e:
            if self.args.json:
                error_data = {
                    "mode": "live",
                    "target_tool": str(tool_path),
                    "success": False,
                    "error": str(e)
                }
                self.output(error_data)
            else:
                self.output(f"Error during validation: {e}", error=True)
            return 1
    
    def _run_validation(self, tool_path: Path) -> List[ValidationResult]:
        """Run comprehensive validation tests"""
        results = []
        
        if self.args.category in ["all", "structural"]:
            results.extend(self._test_structural_compliance(tool_path))
        
        if self.args.category in ["all", "behavioral"]:
            results.extend(self._test_behavioral_compliance(tool_path))
        
        if self.args.category in ["all", "output"]:
            results.extend(self._test_output_compliance(tool_path))
        
        if self.args.category in ["all", "standards"]:
            results.extend(self._test_standards_compliance(tool_path))
        
        if self.args.category in ["all", "errors"]:
            results.extend(self._test_error_handling(tool_path))
        
        return results
    
    def _test_structural_compliance(self, tool_path: Path) -> List[ValidationResult]:
        """Test structural compliance (file format, basic execution)"""
        results = []
        
        # Test 1: Tool is executable
        result = ValidationResult(
            "Tool executable",
            os.access(tool_path, os.X_OK),
            "Tool must have execute permissions" if not os.access(tool_path, os.X_OK) else "Tool is executable"
        )
        result.category = "structural"
        results.append(result)
        
        # Test 2: Tool responds to basic execution
        try:
            process = subprocess.run(
                [str(tool_path), "--help"],
                capture_output=True,
                text=True,
                timeout=self.args.timeout
            )
            
            result = ValidationResult(
                "Basic execution",
                process.returncode == 0,
                f"Exit code: {process.returncode}" if process.returncode != 0 else "Tool executes successfully"
            )
            result.category = "structural"
            results.append(result)
            
        except subprocess.TimeoutExpired:
            result = ValidationResult(
                "Basic execution",
                False,
                f"Tool timed out after {self.args.timeout} seconds"
            )
            result.category = "structural"
            results.append(result)
        except Exception as e:
            result = ValidationResult(
                "Basic execution",
                False,
                f"Execution failed: {e}"
            )
            result.category = "structural"
            results.append(result)
        
        return results
    
    def _test_behavioral_compliance(self, tool_path: Path) -> List[ValidationResult]:
        """Test behavioral compliance (modes, arguments)"""
        results = []
        
        # Test all four PolyScript modes
        modes = ["status", "test", "sandbox", "live"]
        for mode in modes:
            try:
                process = subprocess.run(
                    [str(tool_path), "--mode", mode, "--help"],
                    capture_output=True,
                    text=True,
                    timeout=self.args.timeout
                )
                
                result = ValidationResult(
                    f"Mode '{mode}' support",
                    process.returncode == 0,
                    f"Exit code: {process.returncode}" if process.returncode != 0 else f"Mode '{mode}' is supported"
                )
                result.category = "behavioral"
                results.append(result)
                
            except Exception as e:
                result = ValidationResult(
                    f"Mode '{mode}' support",
                    False,
                    f"Error testing mode: {e}"
                )
                result.category = "behavioral"
                results.append(result)
        
        return results
    
    def _test_output_compliance(self, tool_path: Path) -> List[ValidationResult]:
        """Test output format compliance (JSON structure)"""
        results = []
        
        # Test JSON output format
        try:
            process = subprocess.run(
                [str(tool_path), "--mode", "status", "--json"],
                capture_output=True,
                text=True,
                timeout=self.args.timeout
            )
            
            if process.returncode == 0:
                try:
                    data = json.loads(process.stdout)
                    
                    # Check PolyScript v1.0 structure
                    required_fields = ["polyscript", "mode", "tool", "status", "data"]
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if not missing_fields:
                        # Check polyscript version
                        if data.get("polyscript") == "1.0":
                            result = ValidationResult(
                                "JSON structure compliance",
                                True,
                                "JSON output follows PolyScript v1.0 specification"
                            )
                        else:
                            result = ValidationResult(
                                "JSON structure compliance",
                                False,
                                f"Invalid polyscript version: {data.get('polyscript')} (expected: 1.0)"
                            )
                    else:
                        result = ValidationResult(
                            "JSON structure compliance",
                            False,
                            f"Missing required fields: {', '.join(missing_fields)}"
                        )
                    
                    result.details = {"json_data": data}
                    
                except json.JSONDecodeError as e:
                    result = ValidationResult(
                        "JSON structure compliance",
                        False,
                        f"Invalid JSON output: {e}"
                    )
            else:
                result = ValidationResult(
                    "JSON structure compliance",
                    False,
                    f"JSON mode failed with exit code: {process.returncode}"
                )
            
            result.category = "output"
            results.append(result)
            
        except Exception as e:
            result = ValidationResult(
                "JSON structure compliance",
                False,
                f"Error testing JSON output: {e}"
            )
            result.category = "output"
            results.append(result)
        
        return results
    
    def _test_standards_compliance(self, tool_path: Path) -> List[ValidationResult]:
        """Test standards compliance (standard flags)"""
        results = []
        
        # Test standard flags
        standard_flags = [
            ("--verbose", "-v"),
            ("--force", "-f"),
            ("--json", None),
            ("--help", "-h")
        ]
        
        for long_flag, short_flag in standard_flags:
            for flag in [long_flag] + ([short_flag] if short_flag else []):
                try:
                    process = subprocess.run(
                        [str(tool_path), flag],
                        capture_output=True,
                        text=True,
                        timeout=self.args.timeout
                    )
                    
                    # Help flags should return 0, others may vary
                    expected_success = flag in ["--help", "-h"]
                    actual_success = process.returncode == 0
                    
                    if expected_success:
                        passed = actual_success
                        message = f"Flag '{flag}' works correctly" if passed else f"Flag '{flag}' failed (exit code: {process.returncode})"
                    else:
                        # For other flags, just check they're recognized (not unknown option error)
                        passed = "unknown" not in process.stderr.lower() and "unrecognized" not in process.stderr.lower()
                        message = f"Flag '{flag}' is recognized" if passed else f"Flag '{flag}' not recognized"
                    
                    result = ValidationResult(
                        f"Standard flag '{flag}'",
                        passed,
                        message
                    )
                    result.category = "standards"
                    results.append(result)
                    
                except Exception as e:
                    result = ValidationResult(
                        f"Standard flag '{flag}'",
                        False,
                        f"Error testing flag: {e}"
                    )
                    result.category = "standards"
                    results.append(result)
        
        return results
    
    def _test_error_handling(self, tool_path: Path) -> List[ValidationResult]:
        """Test error handling compliance"""
        results = []
        
        # Test invalid mode
        try:
            process = subprocess.run(
                [str(tool_path), "--mode", "invalid"],
                capture_output=True,
                text=True,
                timeout=self.args.timeout
            )
            
            # Should return non-zero exit code for invalid mode
            result = ValidationResult(
                "Invalid mode handling",
                process.returncode != 0,
                f"Exit code: {process.returncode} (should be non-zero for invalid mode)"
            )
            result.category = "errors"
            results.append(result)
            
        except Exception as e:
            result = ValidationResult(
                "Invalid mode handling",
                False,
                f"Error testing invalid mode: {e}"
            )
            result.category = "errors"
            results.append(result)
        
        # Test invalid arguments
        try:
            process = subprocess.run(
                [str(tool_path), "--invalid-flag"],
                capture_output=True,
                text=True,
                timeout=self.args.timeout
            )
            
            # Should return non-zero exit code for invalid arguments
            result = ValidationResult(
                "Invalid argument handling",
                process.returncode != 0,
                f"Exit code: {process.returncode} (should be non-zero for invalid arguments)"
            )
            result.category = "errors"
            results.append(result)
            
        except Exception as e:
            result = ValidationResult(
                "Invalid argument handling",
                False,
                f"Error testing invalid arguments: {e}"
            )
            result.category = "errors"
            results.append(result)
        
        return results
    
    def _get_validation_plan(self) -> Dict[str, List[str]]:
        """Get the validation plan for display"""
        plan = {}
        
        if self.args.category in ["all", "structural"]:
            plan["structural"] = [
                "Tool executable",
                "Basic execution"
            ]
        
        if self.args.category in ["all", "behavioral"]:
            plan["behavioral"] = [
                "Mode 'status' support",
                "Mode 'test' support", 
                "Mode 'sandbox' support",
                "Mode 'live' support"
            ]
        
        if self.args.category in ["all", "output"]:
            plan["output"] = [
                "JSON structure compliance"
            ]
        
        if self.args.category in ["all", "standards"]:
            plan["standards"] = [
                "Standard flag '--verbose'",
                "Standard flag '-v'",
                "Standard flag '--force'",
                "Standard flag '-f'", 
                "Standard flag '--json'",
                "Standard flag '--help'",
                "Standard flag '-h'"
            ]
        
        if self.args.category in ["all", "errors"]:
            plan["errors"] = [
                "Invalid mode handling",
                "Invalid argument handling"
            ]
        
        return plan
    
    def _get_total_test_count(self) -> int:
        """Get total number of tests"""
        plan = self._get_validation_plan()
        return sum(len(tests) for tests in plan.values())
    
    def _get_test_count_for_category(self, category: str) -> int:
        """Get test count for specific category"""
        old_category = self.args.category
        self.args.category = category
        count = self._get_total_test_count()
        self.args.category = old_category
        return count


def main():
    """Main entry point"""
    validator = PolyScriptValidator()
    sys.exit(validator.run())


if __name__ == "__main__":
    main()