#!/bin/bash

# Simple test for PolyScript frameworks
# Tests basic read operation in simulate mode
# Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>

echo "=== PolyScript Framework Simple Test ==="
echo "Testing read operation in simulate mode"
echo "========================================"
echo

# Initialize counters
total=0
passed=0
failed=0

# Function to test a framework
test_framework() {
    local name=$1
    local command=$2
    
    total=$((total + 1))
    echo -n "Testing $name... "
    
    # Run read command in simulate mode
    if eval "$command" 2>&1 | grep -q -E "(simulation|Would read|Simulating|polyscript|compiled|source_files)" ; then
        echo "✓ PASSED"
        passed=$((passed + 1))
    else
        echo "✗ FAILED"
        failed=$((failed + 1))
    fi
}

# Change to test directory
cd frameworks/test || exit 1

echo "=== Testing Frameworks ==="

# Test each framework with appropriate command
test_framework "Node.js" "node test-compiler.js read --mode simulate"
test_framework "Ruby" "ruby test-compiler.rb read --mode simulate"
test_framework "PowerShell" "pwsh -File Test-Compiler.ps1 read -Mode simulate"
test_framework "Python" "python3 test-compiler.py read --mode simulate"

# Compiled languages - test if binary exists
if [ -f "test-compiler" ]; then
    test_framework "Go" "./test-compiler read --mode simulate"
fi

if [ -f "../rust/target/debug/test-compiler" ]; then
    test_framework "Rust" "../rust/target/debug/test-compiler read --mode simulate"
elif [ -f "../rust/target/release/test-compiler" ]; then
    test_framework "Rust" "../rust/target/release/test-compiler read --mode simulate"
fi

# .NET languages using dotnet run
test_framework "C#" "dotnet run --project TestCompiler.csproj -- read --mode simulate"
test_framework "F#" "dotnet run --project TestCompiler.fsproj -- read --mode simulate"
test_framework "VB.NET" "dotnet run --project TestCompiler.vbproj -- read --mode simulate"

# Interpreted languages
test_framework "Elixir" "elixir test_compiler_ex.exs read --mode simulate"

# Languages that might need special handling
echo
echo "Testing languages with potential setup requirements:"

# Haskell - try runhaskell first
if command -v runhaskell >/dev/null 2>&1; then
    test_framework "Haskell" "runhaskell TestCompiler.hs read --mode simulate"
fi

# Scala - check if scala is available
if command -v scala >/dev/null 2>&1; then
    test_framework "Scala" "scala TestCompiler.scala read --mode simulate"
fi

# Zig - check if zig is available
if command -v zig >/dev/null 2>&1; then
    test_framework "Zig" "zig run test_compiler.zig -- read --mode simulate"
fi

# V - check if v is available
if command -v v >/dev/null 2>&1; then
    test_framework "V" "v run test_compiler.v read --mode simulate"
fi

# D - check if rdmd is available
if command -v rdmd >/dev/null 2>&1; then
    test_framework "D" "rdmd -I.. test_compiler.d read --mode simulate"
fi

# Julia - check if julia is available
if command -v julia >/dev/null 2>&1; then
    test_framework "Julia" "julia test_compiler.jl read --mode simulate"
fi

# Summary
echo
echo "========================================"
echo "Test Results Summary:"
echo "Total: $total"
echo "Passed: $passed"
echo "Failed: $failed"
if [ $total -gt 0 ]; then
    echo "Success Rate: $(( passed * 100 / total ))%"
fi
echo "========================================"

# Show which compilers are missing
echo
echo "Checking for missing language tools:"
command -v zig >/dev/null 2>&1 || echo "- Zig compiler not found"
command -v v >/dev/null 2>&1 || echo "- V compiler not found"
command -v rdmd >/dev/null 2>&1 || echo "- D compiler (rdmd) not found"
command -v scala >/dev/null 2>&1 || echo "- Scala not found"

exit 0