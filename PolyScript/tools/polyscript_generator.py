#!/usr/bin/env python3
"""
PolyScript Template Generator

Generates template files for creating new PolyScript-compliant CLI tools.
This tool helps developers quickly bootstrap new tools that follow the
PolyScript behavioral standard.

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
"""

import argparse
import os
import sys
from pathlib import Path
from typing import Dict, List


class PolyScriptGenerator:
    """Generator for PolyScript-compliant tool templates"""
    
    def __init__(self):
        self.templates = {
            'python': self._get_python_template,
            'bash': self._get_bash_template,
            'node': self._get_node_template
        }
        
    def generate_tool(self, name: str, language: str, description: str, 
                     output_dir: Path = None) -> bool:
        """
        Generate a new PolyScript-compliant tool.
        
        Args:
            name: Tool name (will be converted to appropriate filename)
            language: Programming language (python, bash, node)
            description: Tool description
            output_dir: Output directory (defaults to current directory)
            
        Returns:
            True if successful, False otherwise
        """
        if language not in self.templates:
            print(f"Error: Unsupported language '{language}'")
            print(f"Supported languages: {', '.join(self.templates.keys())}")
            return False
        
        output_dir = output_dir or Path.cwd()
        
        try:
            # Generate the template
            template_func = self.templates[language]
            files = template_func(name, description)
            
            # Write files
            for filename, content in files.items():
                file_path = output_dir / filename
                
                # Check if file already exists
                if file_path.exists():
                    response = input(f"File {filename} already exists. Overwrite? [y/N]: ")
                    if response.lower() != 'y':
                        print(f"Skipping {filename}")
                        continue
                
                # Create directory if needed
                file_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Write file
                with open(file_path, 'w') as f:
                    f.write(content)
                
                # Make executable if it's a script
                if filename.endswith(('.py', '.sh', '.js')):
                    file_path.chmod(0o755)
                
                print(f"Created: {file_path}")
            
            print(f"\n✓ PolyScript tool '{name}' generated successfully!")
            print(f"Language: {language}")
            print(f"Files created: {len(files)}")
            
            return True
            
        except Exception as e:
            print(f"Error generating tool: {e}")
            return False
    
    def _get_python_template(self, name: str, description: str) -> Dict[str, str]:
        """Generate Python template files"""
        # Convert name to appropriate formats
        script_name = name.lower().replace(' ', '_').replace('-', '_')
        class_name = ''.join(word.capitalize() for word in name.replace('-', ' ').split())
        
        # Main script file
        main_script = f'''#!/usr/bin/env python3
"""
{name} - PolyScript Compliant Tool

{description}

Author: Your Name <your.email@domain.com>
"""

import argparse
import json
import os
import sys
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

# Import PolyScript base framework
try:
    from polyscript import PolyScriptBase
except ImportError:
    print("Error: PolyScript framework not found. Please install or copy polyscript.py to this directory.")
    sys.exit(1)


class {class_name}(PolyScriptBase):
    """PolyScript-compliant implementation of {name}"""
    
    def get_description(self) -> str:
        return """{description}
        
This tool follows the PolyScript behavioral standard with support for
status, test, sandbox, and live execution modes."""
    
    def add_arguments(self, parser: argparse.ArgumentParser):
        """Add tool-specific arguments"""
        # Add your custom arguments here
        parser.add_argument(
            "--target",
            type=str,
            help="Target to operate on"
        )
        
        parser.add_argument(
            "--action",
            type=str,
            choices=["create", "update", "delete"],
            default="create",
            help="Action to perform (default: create)"
        )
    
    def execute_status(self) -> int:
        """Show current status"""
        status_data = {{
            "tool": "{name}",
            "status": "operational",
            "target": self.args.target or "none specified"
        }}
        
        if self.args.json:
            self.output(status_data)
        else:
            self.output(f"[STATUS] {name}")
            self.output(f"Target: {{status_data['target']}}")
            self.output(f"Status: {{status_data['status']}}")
        
        return 0
    
    def execute_test(self) -> int:
        """Test mode - simulate operations"""
        test_data = {{
            "mode": "test",
            "action": self.args.action,
            "target": self.args.target,
            "simulation": True,
            "results": []
        }}
        
        if self.args.json:
            test_data["results"].append({{"message": "Test simulation completed"}})
            self.output(test_data)
        else:
            self.output(f"[TEST MODE] Simulating {{self.args.action}} operation")
            if self.args.target:
                self.output(f"Target: {{self.args.target}}")
            self.output("✓ Test simulation completed")
        
        return 0
    
    def execute_sandbox(self) -> int:
        """Sandbox mode - test dependencies and environment"""
        sandbox_data = {{
            "mode": "sandbox",
            "prerequisites": {{}},
            "environment": {{}},
            "summary": {{
                "all_passed": True,
                "issues": []
            }}
        }}
        
        if self.args.json:
            self.output(sandbox_data)
        else:
            self.output(f"[SANDBOX MODE] Testing {name} environment")
            self.output("✓ All checks passed")
        
        return 0
    
    def execute_live(self) -> int:
        """Live mode - perform actual operations"""
        if not self.args.target:
            self.output("Error: --target is required for live operations", error=True)
            return 1
        
        live_data = {{
            "mode": "live",
            "action": self.args.action,
            "target": self.args.target,
            "success": True
        }}
        
        try:
            # Implement your actual functionality here
            result = self._perform_operation(self.args.action, self.args.target)
            
            if self.args.json:
                live_data.update(result)
                self.output(live_data)
            else:
                self.output(f"[LIVE MODE] {{self.args.action.title()}} operation on {{self.args.target}}")
                self.output("✓ Operation completed successfully")
            
            return 0
            
        except Exception as e:
            if self.args.json:
                live_data["success"] = False
                live_data["error"] = str(e)
                self.output(live_data)
            else:
                self.output(f"Error: {{e}}", error=True)
            return 1
    
    def _perform_operation(self, action: str, target: str) -> Dict:
        """
        Perform the actual operation.
        
        Replace this with your tool's actual functionality.
        """
        # Example implementation - replace with your logic
        if action == "create":
            return {{"message": f"Created {{target}}"}}
        elif action == "update":
            return {{"message": f"Updated {{target}}"}}
        elif action == "delete":
            return {{"message": f"Deleted {{target}}"}}
        else:
            raise ValueError(f"Unknown action: {{action}}")


def main():
    """Main entry point"""
    tool = {class_name}()
    sys.exit(tool.run())


if __name__ == "__main__":
    main()
'''
        
        # Test file
        test_script = f'''#!/usr/bin/env python3
"""
Test suite for {script_name}.py

Author: Your Name <your.email@domain.com>
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path


def run_tool(args: list) -> tuple:
    """Run the tool with given arguments"""
    script_path = Path(__file__).parent / "{script_name}.py"
    cmd = [sys.executable, str(script_path)] + args
    
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=30
    )
    
    return result.returncode, result.stdout, result.stderr


def test_basic_functionality():
    """Test basic tool functionality"""
    print("Testing {name}")
    print("=" * 60)
    
    tests_passed = 0
    tests_total = 0
    
    # Test 1: Help flag
    print("\\n1. Testing help flag...")
    tests_total += 1
    exit_code, stdout, stderr = run_tool(["--help"])
    
    if exit_code == 0 and "usage:" in stdout:
        print("✓ Help flag works")
        tests_passed += 1
    else:
        print("✗ Help flag failed")
    
    # Test 2: Status mode
    print("\\n2. Testing status mode...")
    tests_total += 1
    exit_code, stdout, stderr = run_tool(["--mode", "status"])
    
    if exit_code == 0:
        print("✓ Status mode works")
        tests_passed += 1
    else:
        print("✗ Status mode failed")
    
    # Test 3: JSON output
    print("\\n3. Testing JSON output...")
    tests_total += 1
    exit_code, stdout, stderr = run_tool(["--mode", "status", "--json"])
    
    try:
        data = json.loads(stdout)
        if data.get("polyscript") == "1.0":
            print("✓ JSON output works")
            tests_passed += 1
        else:
            print("✗ Invalid JSON structure")
    except json.JSONDecodeError:
        print("✗ Invalid JSON output")
    
    # Test 4: Test mode
    print("\\n4. Testing test mode...")
    tests_total += 1
    exit_code, stdout, stderr = run_tool(["--mode", "test", "--target", "example"])
    
    if exit_code == 0:
        print("✓ Test mode works")
        tests_passed += 1
    else:
        print("✗ Test mode failed")
    
    # Test 5: PolyScript compliance
    print("\\n5. Testing PolyScript compliance...")
    tests_total += 1
    
    modes = ["status", "test", "sandbox", "live"]
    all_modes_work = True
    
    for mode in modes:
        exit_code, stdout, stderr = run_tool(["--mode", mode, "--help"])
        if exit_code != 0:
            all_modes_work = False
            break
    
    if all_modes_work:
        print("✓ All PolyScript modes supported")
        tests_passed += 1
    else:
        print("✗ Some PolyScript modes missing")
    
    # Summary
    print("\\n" + "=" * 60)
    print(f"Test Results: {{tests_passed}}/{{tests_total}} passed")
    
    if tests_passed == tests_total:
        print("\\n✓ All tests passed!")
        return 0
    else:
        print(f"\\n✗ {{tests_total - tests_passed}} tests failed")
        return 1


def main():
    """Main entry point"""
    sys.exit(test_basic_functionality())


if __name__ == "__main__":
    main()
'''
        
        # README file
        readme = f'''# {name}

{description}

This tool is PolyScript-compliant and follows the standard behavioral contract for CLI tools.

## Installation

1. Ensure you have Python 3.7+ installed
2. Copy `polyscript.py` to this directory or install it in your Python path
3. Make the script executable: `chmod +x {script_name}.py`

## Usage

### Basic Commands

```bash
# Show help
./{script_name}.py --help

# Show current status
./{script_name}.py --mode status

# Test operations (dry run)
./{script_name}.py --mode test --target example

# Check environment and dependencies
./{script_name}.py --mode sandbox

# Perform actual operations
./{script_name}.py --mode live --target example --action create
```

### PolyScript Modes

- **Status**: Show current state and configuration
- **Test**: Simulate operations without making changes
- **Sandbox**: Test environment and dependencies  
- **Live**: Perform actual operations

### Standard Flags

- `--mode MODE`: Execution mode (status, test, sandbox, live)
- `--verbose, -v`: Enable verbose output
- `--force, -f`: Force operations without confirmation
- `--json`: Output in JSON format

## Testing

Run the test suite:

```bash
python3 test_{script_name}.py
```

## Development

This tool was generated using the PolyScript template generator. To modify:

1. Edit `{script_name}.py` to implement your specific functionality
2. Update the `_perform_operation()` method with your business logic
3. Add custom arguments in the `add_arguments()` method
4. Update tests in `test_{script_name}.py`

## PolyScript Compliance

This tool follows the PolyScript v1.0 specification:
- Supports all four execution modes
- Provides consistent JSON output format
- Implements standard flags and behaviors
- Includes comprehensive error handling

For more information about PolyScript, see the framework documentation.
'''
        
        return {
            f"{script_name}.py": main_script,
            f"test_{script_name}.py": test_script,
            "README.md": readme
        }
    
    def _get_bash_template(self, name: str, description: str) -> Dict[str, str]:
        """Generate Bash template files"""
        script_name = name.lower().replace(' ', '_').replace('-', '_')
        
        main_script = f'''#!/bin/bash
# {name} - PolyScript Compliant Tool
# {description}
#
# Author: Your Name <your.email@domain.com>

set -euo pipefail

# Script configuration
SCRIPT_NAME="{name}"
SCRIPT_VERSION="1.0.0"
POLYSCRIPT_VERSION="1.0"

# Default values
MODE="status"
VERBOSE=false
FORCE=false
JSON=false
TARGET=""
ACTION="create"

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

# Logging functions
log_info() {{
    if [[ "$JSON" == "false" ]]; then
        echo -e "${{GREEN}}[INFO]${{NC}} $1" >&2
    fi
}}

log_warn() {{
    if [[ "$JSON" == "false" ]]; then
        echo -e "${{YELLOW}}[WARN]${{NC}} $1" >&2
    fi
}}

log_error() {{
    if [[ "$JSON" == "false" ]]; then
        echo -e "${{RED}}[ERROR]${{NC}} $1" >&2
    fi
}}

# JSON output helper
output_json() {{
    local status="$1"
    local mode="$2"
    shift 2
    local data="$@"
    
    cat << EOF
{{
    "polyscript": "$POLYSCRIPT_VERSION",
    "mode": "$mode",
    "tool": "$SCRIPT_NAME",
    "status": "$status",
    "data": {{
        $data
    }}
}}
EOF
}}

# Show help
show_help() {{
    cat << EOF
Usage: $0 [OPTIONS]

{description}

This tool follows the PolyScript behavioral standard with support for
status, test, sandbox, and live execution modes.

OPTIONS:
    --mode MODE         Execution mode (status, test, sandbox, live) [default: status]
    --target TARGET     Target to operate on
    --action ACTION     Action to perform (create, update, delete) [default: create]
    --verbose, -v       Enable verbose output
    --force, -f         Force operations without confirmation
    --json              Output in JSON format
    --help, -h          Show this help message

MODES:
    status              Show current status
    test                Test mode (dry run)
    sandbox             Test dependencies and environment
    live                Perform actual operations

EXAMPLES:
    $0 --mode status
    $0 --mode test --target example
    $0 --mode live --target example --action create --json

EOF
}}

# Parse command line arguments
parse_args() {{
    while [[ $# -gt 0 ]]; do
        case $1 in
            --mode)
                MODE="$2"
                shift 2
                ;;
            --target)
                TARGET="$2"
                shift 2
                ;;
            --action)
                ACTION="$2"
                shift 2
                ;;
            --verbose|-v)
                VERBOSE=true
                shift
                ;;
            --force|-f)
                FORCE=true
                shift
                ;;
            --json)
                JSON=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1" >&2
                show_help
                exit 2
                ;;
        esac
    done
    
    # Validate mode
    case "$MODE" in
        status|test|sandbox|live)
            ;;
        *)
            log_error "Invalid mode: $MODE"
            echo "Valid modes: status, test, sandbox, live" >&2
            exit 2
            ;;
    esac
}}

# Execute status mode
execute_status() {{
    local target="${{TARGET:-none specified}}"
    
    if [[ "$JSON" == "true" ]]; then
        output_json "success" "status" \\
            "\\"target\\": \\"$target\\", \\"operational\\": true"
    else
        log_info "[STATUS] $SCRIPT_NAME"
        echo "Target: $target"
        echo "Status: operational"
    fi
    
    return 0
}}

# Execute test mode
execute_test() {{
    if [[ "$JSON" == "true" ]]; then
        output_json "success" "test" \\
            "\\"action\\": \\"$ACTION\\", \\"target\\": \\"$TARGET\\", \\"simulation\\": true"
    else
        log_info "[TEST MODE] Simulating $ACTION operation"
        if [[ -n "$TARGET" ]]; then
            echo "Target: $TARGET"
        fi
        echo "✓ Test simulation completed"
    fi
    
    return 0
}}

# Execute sandbox mode
execute_sandbox() {{
    # Check dependencies here
    local all_passed=true
    
    if [[ "$JSON" == "true" ]]; then
        output_json "success" "sandbox" \\
            "\\"all_passed\\": $all_passed, \\"issues\\": []"
    else
        log_info "[SANDBOX MODE] Testing $SCRIPT_NAME environment"
        echo "✓ All checks passed"
    fi
    
    return 0
}}

# Execute live mode
execute_live() {{
    if [[ -z "$TARGET" ]]; then
        if [[ "$JSON" == "true" ]]; then
            output_json "error" "live" \\
                "\\"error\\": \\"--target is required for live operations\\""
        else
            log_error "--target is required for live operations"
        fi
        return 1
    fi
    
    # Implement your actual functionality here
    perform_operation "$ACTION" "$TARGET"
    local result=$?
    
    if [[ $result -eq 0 ]]; then
        if [[ "$JSON" == "true" ]]; then
            output_json "success" "live" \\
                "\\"action\\": \\"$ACTION\\", \\"target\\": \\"$TARGET\\", \\"success\\": true"
        else
            log_info "[LIVE MODE] ${{ACTION^}} operation on $TARGET"
            echo "✓ Operation completed successfully"
        fi
    else
        if [[ "$JSON" == "true" ]]; then
            output_json "error" "live" \\
                "\\"action\\": \\"$ACTION\\", \\"target\\": \\"$TARGET\\", \\"success\\": false"
        else
            log_error "Operation failed"
        fi
    fi
    
    return $result
}}

# Perform the actual operation
perform_operation() {{
    local action="$1"
    local target="$2"
    
    # Replace this with your actual implementation
    case "$action" in
        create)
            log_info "Creating $target"
            # Add your create logic here
            ;;
        update)
            log_info "Updating $target"
            # Add your update logic here
            ;;
        delete)
            log_info "Deleting $target"
            # Add your delete logic here
            ;;
        *)
            log_error "Unknown action: $action"
            return 1
            ;;
    esac
    
    return 0
}}

# Main execution
main() {{
    parse_args "$@"
    
    case "$MODE" in
        status)
            execute_status
            ;;
        test)
            execute_test
            ;;
        sandbox)
            execute_sandbox
            ;;
        live)
            execute_live
            ;;
    esac
}}

# Run main function if script is executed directly
if [[ "${{BASH_SOURCE[0]}}" == "${{0}}" ]]; then
    main "$@"
fi
'''
        
        test_script = f'''#!/bin/bash
# Test suite for {script_name}.sh
# Author: Your Name <your.email@domain.com>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${{BASH_SOURCE[0]}}")" && pwd)"
SCRIPT_PATH="$SCRIPT_DIR/{script_name}.sh"

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0

# Test helper functions
run_test() {{
    local test_name="$1"
    shift
    local expected_exit_code="$1"
    shift
    
    echo "Testing: $test_name"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if output=$("$SCRIPT_PATH" "$@" 2>&1); then
        actual_exit_code=0
    else
        actual_exit_code=$?
    fi
    
    if [[ $actual_exit_code -eq $expected_exit_code ]]; then
        echo "✓ $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "✗ $test_name (exit code: $actual_exit_code, expected: $expected_exit_code)"
    fi
}}

# Run tests
echo "Testing {name}"
echo "============================================================"

echo -e "\\n1. Testing help flag..."
run_test "Help flag" 0 --help

echo -e "\\n2. Testing status mode..."
run_test "Status mode" 0 --mode status

echo -e "\\n3. Testing JSON output..."
run_test "JSON output" 0 --mode status --json

echo -e "\\n4. Testing test mode..."
run_test "Test mode" 0 --mode test --target example

echo -e "\\n5. Testing sandbox mode..."
run_test "Sandbox mode" 0 --mode sandbox

echo -e "\\n6. Testing invalid mode..."
run_test "Invalid mode" 2 --mode invalid

echo -e "\\n7. Testing live mode without target..."
run_test "Live mode without target" 1 --mode live

# Summary
echo -e "\\n============================================================"
echo "Test Results: $TESTS_PASSED/$TESTS_TOTAL passed"

if [[ $TESTS_PASSED -eq $TESTS_TOTAL ]]; then
    echo -e "\\n✓ All tests passed!"
    exit 0
else
    echo -e "\\n✗ $((TESTS_TOTAL - TESTS_PASSED)) tests failed"
    exit 1
fi
'''
        
        return {
            f"{script_name}.sh": main_script,
            f"test_{script_name}.sh": test_script
        }
    
    def _get_node_template(self, name: str, description: str) -> Dict[str, str]:
        """Generate Node.js template files"""
        script_name = name.lower().replace(' ', '_').replace('-', '_')
        
        main_script = f'''#!/usr/bin/env node
/**
 * {name} - PolyScript Compliant Tool
 * {description}
 * 
 * Author: Your Name <your.email@domain.com>
 */

const {{ ArgumentParser }} = require('argparse');
const fs = require('fs');
const path = require('path');

class {name.replace(' ', '').replace('-', '')}Tool {{
    constructor() {{
        this.scriptName = '{name}';
        this.polyscriptVersion = '1.0';
        this.setupParser();
    }}
    
    setupParser() {{
        this.parser = new ArgumentParser({{
            description: '{description}\\n\\nThis tool follows the PolyScript behavioral standard.',
            add_help: true
        }});
        
        // Standard PolyScript arguments
        this.parser.add_argument('--mode', {{
            choices: ['status', 'test', 'sandbox', 'live'],
            default: 'status',
            help: 'Execution mode (default: status)'
        }});
        
        this.parser.add_argument('--verbose', '-v', {{
            action: 'store_true',
            help: 'Enable verbose output'
        }});
        
        this.parser.add_argument('--force', '-f', {{
            action: 'store_true',
            help: 'Force operations without confirmation'
        }});
        
        this.parser.add_argument('--json', {{
            action: 'store_true',
            help: 'Output in JSON format'
        }});
        
        // Tool-specific arguments
        this.parser.add_argument('--target', {{
            help: 'Target to operate on'
        }});
        
        this.parser.add_argument('--action', {{
            choices: ['create', 'update', 'delete'],
            default: 'create',
            help: 'Action to perform (default: create)'
        }});
    }}
    
    async run() {{
        try {{
            this.args = this.parser.parse_args();
            
            // Execute based on mode
            switch (this.args.mode) {{
                case 'status':
                    return await this.executeStatus();
                case 'test':
                    return await this.executeTest();
                case 'sandbox':
                    return await this.executeSandbox();
                case 'live':
                    return await this.executeLive();
                default:
                    throw new Error(`Unknown mode: ${{this.args.mode}}`);
            }}
        }} catch (error) {{
            if (this.args && this.args.json) {{
                this.outputJson({{
                    polyscript: this.polyscriptVersion,
                    mode: this.args.mode || 'unknown',
                    tool: this.scriptName,
                    status: 'error',
                    error: error.message
                }});
            }} else {{
                console.error(`Error: ${{error.message}}`);
            }}
            return 1;
        }}
    }}
    
    async executeStatus() {{
        const statusData = {{
            tool: this.scriptName,
            status: 'operational',
            target: this.args.target || 'none specified'
        }};
        
        if (this.args.json) {{
            this.outputJson({{
                polyscript: this.polyscriptVersion,
                mode: 'status',
                tool: this.scriptName,
                status: 'success',
                data: statusData
            }});
        }} else {{
            console.log(`[STATUS] ${{this.scriptName}}`);
            console.log(`Target: ${{statusData.target}}`);
            console.log(`Status: ${{statusData.status}}`);
        }}
        
        return 0;
    }}
    
    async executeTest() {{
        const testData = {{
            mode: 'test',
            action: this.args.action,
            target: this.args.target,
            simulation: true,
            results: [{{"message": "Test simulation completed"}}]
        }};
        
        if (this.args.json) {{
            this.outputJson({{
                polyscript: this.polyscriptVersion,
                mode: 'test',
                tool: this.scriptName,
                status: 'success',
                data: testData
            }});
        }} else {{
            console.log(`[TEST MODE] Simulating ${{this.args.action}} operation`);
            if (this.args.target) {{
                console.log(`Target: ${{this.args.target}}`);
            }}
            console.log('✓ Test simulation completed');
        }}
        
        return 0;
    }}
    
    async executeSandbox() {{
        const sandboxData = {{
            mode: 'sandbox',
            prerequisites: {{}},
            environment: {{}},
            summary: {{
                all_passed: true,
                issues: []
            }}
        }};
        
        if (this.args.json) {{
            this.outputJson({{
                polyscript: this.polyscriptVersion,
                mode: 'sandbox',
                tool: this.scriptName,
                status: 'success',
                data: sandboxData
            }});
        }} else {{
            console.log(`[SANDBOX MODE] Testing ${{this.scriptName}} environment`);
            console.log('✓ All checks passed');
        }}
        
        return 0;
    }}
    
    async executeLive() {{
        if (!this.args.target) {{
            const error = '--target is required for live operations';
            if (this.args.json) {{
                this.outputJson({{
                    polyscript: this.polyscriptVersion,
                    mode: 'live',
                    tool: this.scriptName,
                    status: 'error',
                    error: error
                }});
            }} else {{
                console.error(`Error: ${{error}}`);
            }}
            return 1;
        }}
        
        try {{
            const result = await this.performOperation(this.args.action, this.args.target);
            
            if (this.args.json) {{
                this.outputJson({{
                    polyscript: this.polyscriptVersion,
                    mode: 'live',
                    tool: this.scriptName,
                    status: 'success',
                    data: {{
                        action: this.args.action,
                        target: this.args.target,
                        success: true,
                        ...result
                    }}
                }});
            }} else {{
                console.log(`[LIVE MODE] ${{this.args.action.charAt(0).toUpperCase() + this.args.action.slice(1)}} operation on ${{this.args.target}}`);
                console.log('✓ Operation completed successfully');
            }}
            
            return 0;
        }} catch (error) {{
            if (this.args.json) {{
                this.outputJson({{
                    polyscript: this.polyscriptVersion,
                    mode: 'live',
                    tool: this.scriptName,
                    status: 'error',
                    data: {{
                        action: this.args.action,
                        target: this.args.target,
                        success: false,
                        error: error.message
                    }}
                }});
            }} else {{
                console.error(`Error: ${{error.message}}`);
            }}
            return 1;
        }}
    }}
    
    async performOperation(action, target) {{
        // Replace this with your actual implementation
        switch (action) {{
            case 'create':
                return {{ message: `Created ${{target}}` }};
            case 'update':
                return {{ message: `Updated ${{target}}` }};
            case 'delete':
                return {{ message: `Deleted ${{target}}` }};
            default:
                throw new Error(`Unknown action: ${{action}}`);
        }}
    }}
    
    outputJson(data) {{
        console.log(JSON.stringify(data, null, 2));
    }}
}}

// Main execution
if (require.main === module) {{
    const tool = new {name.replace(' ', '').replace('-', '')}Tool();
    tool.run().then(exitCode => {{
        process.exit(exitCode);
    }}).catch(error => {{
        console.error(`Fatal error: ${{error.message}}`);
        process.exit(1);
    }});
}}

module.exports = {name.replace(' ', '').replace('-', '')}Tool;
'''
        
        package_json = f'''{{
  "name": "{script_name}",
  "version": "1.0.0",
  "description": "{description}",
  "main": "{script_name}.js",
  "bin": {{
    "{script_name}": "./{script_name}.js"
  }},
  "scripts": {{
    "test": "node test_{script_name}.js",
    "start": "node {script_name}.js"
  }},
  "dependencies": {{
    "argparse": "^2.0.1"
  }},
  "devDependencies": {{}},
  "keywords": ["polyscript", "cli", "tool"],
  "author": "Your Name <your.email@domain.com>",
  "license": "MIT"
}}
'''
        
        test_script = f'''#!/usr/bin/env node
/**
 * Test suite for {script_name}.js
 * Author: Your Name <your.email@domain.com>
 */

const {{ spawn }} = require('child_process');
const path = require('path');

class TestRunner {{
    constructor() {{
        this.scriptPath = path.join(__dirname, '{script_name}.js');
        this.testsTotal = 0;
        this.testsPassed = 0;
    }}
    
    async runTool(args) {{
        return new Promise((resolve) => {{
            const child = spawn('node', [this.scriptPath, ...args]);
            let stdout = '';
            let stderr = '';
            
            child.stdout.on('data', (data) => {{
                stdout += data.toString();
            }});
            
            child.stderr.on('data', (data) => {{
                stderr += data.toString();
            }});
            
            child.on('close', (code) => {{
                resolve({{ exitCode: code, stdout, stderr }});
            }});
        }});
    }}
    
    async runTest(testName, expectedExitCode, args) {{
        console.log(`\\nTesting: ${{testName}}`);
        this.testsTotal++;
        
        try {{
            const result = await this.runTool(args);
            
            if (result.exitCode === expectedExitCode) {{
                console.log(`✓ ${{testName}}`);
                this.testsPassed++;
                return true;
            }} else {{
                console.log(`✗ ${{testName}} (exit code: ${{result.exitCode}}, expected: ${{expectedExitCode}})`);
                return false;
            }}
        }} catch (error) {{
            console.log(`✗ ${{testName}} (error: ${{error.message}})`);
            return false;
        }}
    }}
    
    async runAllTests() {{
        console.log('Testing {name}');
        console.log('============================================================');
        
        // Test 1: Help flag
        await this.runTest('Help flag', 0, ['--help']);
        
        // Test 2: Status mode
        await this.runTest('Status mode', 0, ['--mode', 'status']);
        
        // Test 3: JSON output
        const jsonResult = await this.runTool(['--mode', 'status', '--json']);
        console.log(`\\nTesting: JSON output`);
        this.testsTotal++;
        
        try {{
            const data = JSON.parse(jsonResult.stdout);
            if (data.polyscript === '1.0') {{
                console.log('✓ JSON output');
                this.testsPassed++;
            }} else {{
                console.log('✗ Invalid JSON structure');
            }}
        }} catch (error) {{
            console.log('✗ Invalid JSON output');
        }}
        
        // Test 4: Test mode
        await this.runTest('Test mode', 0, ['--mode', 'test', '--target', 'example']);
        
        // Test 5: Sandbox mode
        await this.runTest('Sandbox mode', 0, ['--mode', 'sandbox']);
        
        // Test 6: Invalid mode
        await this.runTest('Invalid mode', 1, ['--mode', 'invalid']);
        
        // Test 7: Live mode without target
        await this.runTest('Live mode without target', 1, ['--mode', 'live']);
        
        // Summary
        console.log('\\n============================================================');
        console.log(`Test Results: ${{this.testsPassed}}/${{this.testsTotal}} passed`);
        
        if (this.testsPassed === this.testsTotal) {{
            console.log('\\n✓ All tests passed!');
            return 0;
        }} else {{
            console.log(`\\n✗ ${{this.testsTotal - this.testsPassed}} tests failed`);
            return 1;
        }}
    }}
}}

// Main execution
if (require.main === module) {{
    const runner = new TestRunner();
    runner.runAllTests().then(exitCode => {{
        process.exit(exitCode);
    }}).catch(error => {{
        console.error(`Fatal error: ${{error.message}}`);
        process.exit(1);
    }});
}}
'''
        
        return {
            f"{script_name}.js": main_script,
            f"test_{script_name}.js": test_script,
            "package.json": package_json
        }


def main():
    """Main entry point for the generator"""
    parser = argparse.ArgumentParser(
        description="Generate PolyScript-compliant CLI tool templates"
    )
    
    parser.add_argument(
        "name",
        help="Name of the tool to generate"
    )
    
    parser.add_argument(
        "--language", "-l",
        choices=["python", "bash", "node"],
        default="python",
        help="Programming language for the tool (default: python)"
    )
    
    parser.add_argument(
        "--description", "-d",
        default="A PolyScript-compliant CLI tool",
        help="Description of the tool"
    )
    
    parser.add_argument(
        "--output-dir", "-o",
        type=Path,
        help="Output directory (default: current directory)"
    )
    
    args = parser.parse_args()
    
    generator = PolyScriptGenerator()
    
    success = generator.generate_tool(
        name=args.name,
        language=args.language,
        description=args.description,
        output_dir=args.output_dir
    )
    
    if success:
        print(f"\\nNext steps:")
        print(f"1. Review and customize the generated files")
        print(f"2. Install dependencies if needed")
        print(f"3. Run the test suite to verify functionality")
        print(f"4. Implement your specific business logic")
        
        if args.language == "node":
            print(f"\\nFor Node.js projects:")
            print(f"  npm install")
            print(f"  npm test")
        elif args.language == "python":
            print(f"\\nFor Python projects:")
            print(f"  python3 test_{{args.name.lower().replace(' ', '_').replace('-', '_')}}.py")
        elif args.language == "bash":
            print(f"\\nFor Bash projects:")
            print(f"  ./test_{{args.name.lower().replace(' ', '_').replace('-', '_')}}.sh")
        
        return 0
    else:
        return 1


if __name__ == "__main__":
    sys.exit(main())