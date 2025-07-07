#!/bin/bash

# Test all PolyScript frameworks
# Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>

echo "=== PolyScript Framework Test Suite ==="
echo "Testing 16 language implementations"
echo "======================================"
echo

# Initialize counters
total=0
passed=0
failed=0

# Function to test a framework
test_framework() {
    local name=$1
    local command=$2
    local test_file=$3
    
    total=$((total + 1))
    echo -n "Testing $name... "
    
    # Test discovery mode
    if $command --discover >/dev/null 2>&1; then
        echo "✓ PASSED"
        passed=$((passed + 1))
    else
        echo "✗ FAILED"
        failed=$((failed + 1))
        echo "  Error: $command --discover failed"
    fi
}

# Original 9 frameworks
cd frameworks/test

echo "=== Original 9 Frameworks ==="
test_framework "Node.js" "node test-compiler.js" "test-compiler.js"
test_framework "Ruby" "ruby test-compiler.rb" "test-compiler.rb"
test_framework "PowerShell" "pwsh Test-Compiler.ps1" "Test-Compiler.ps1"
test_framework "Go" "./test-compiler" "test-compiler.go"
test_framework "Python" "python3 test-compiler.py" "test-compiler.py"
test_framework "Rust" "./test-compiler.rs" "test-compiler.rs"
test_framework "C#" "dotnet run --project TestCompiler.csproj" "TestCompiler.cs"
test_framework "F#" "dotnet run --project TestCompiler.fsproj" "TestCompiler.fs"
test_framework "Haskell" "./TestCompiler.hs" "TestCompiler.hs"

echo
echo "=== Additional 7 Frameworks ==="
test_framework "VB.NET" "dotnet run --project TestCompiler.vbproj" "TestCompiler.vb"
test_framework "Elixir" "elixir test_compiler_ex.exs" "test_compiler_ex.exs"
test_framework "Scala" "scala TestCompiler.scala" "TestCompiler.scala"
test_framework "Zig" "zig run test_compiler.zig" "test_compiler.zig"
test_framework "V" "v run test_compiler.v" "test_compiler.v"
test_framework "D" "rdmd test_compiler.d" "test_compiler.d"
test_framework "Julia" "julia test_compiler.jl" "test_compiler.jl"

# Summary
echo
echo "======================================"
echo "Test Results Summary:"
echo "Total: $total"
echo "Passed: $passed"
echo "Failed: $failed"
echo "Success Rate: $(( passed * 100 / total ))%"
echo "======================================"

# Return non-zero exit code if any tests failed
if [ $failed -gt 0 ]; then
    exit 1
else
    echo
    echo "🎉 All PolyScript frameworks passed!"
    exit 0
fi