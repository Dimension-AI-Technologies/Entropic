#!/usr/bin/env python3

# Simple test to check validator works
import subprocess
import sys
from pathlib import Path

# Test the validator
script_dir = Path(__file__).parent
validator_path = script_dir / "polyscript_validator.py"
target_path = script_dir.parent / "mcp" / "manage_mcp_servers_polyscript.py"

try:
    result = subprocess.run([
        sys.executable, str(validator_path), 
        "--mode", "status"
    ], capture_output=True, text=True, timeout=10)
    
    print(f"Return code: {result.returncode}")
    print(f"Stdout: {result.stdout}")
    print(f"Stderr: {result.stderr}")
    
except Exception as e:
    print(f"Error: {e}")