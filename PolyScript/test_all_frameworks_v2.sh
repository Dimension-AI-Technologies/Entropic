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
    
    total=$((total + 1))
    echo -n "Testing $name... "
    
    # Run the command and capture output
    if eval "$command" >/dev/null 2>&1; then
        echo "✓ PASSED"
        passed=$((passed + 1))
    else
        echo "✗ FAILED"
        failed=$((failed + 1))
        # Show the actual error for debugging
        echo -n "  Debug: "
        eval "$command" 2>&1 | head -1
    fi
}

# Change to test directory
cd frameworks/test || exit 1

echo "=== Original 9 Frameworks ==="

# Node.js
test_framework "Node.js" "node test-compiler.js discover"

# Ruby  
test_framework "Ruby" "ruby test-compiler.rb discover"

# PowerShell
test_framework "PowerShell" "pwsh -File Test-Compiler.ps1 discover"

# Go (needs to be compiled first)
if [ ! -f "test-compiler" ]; then
    echo "Building Go test compiler..."
    go build -o test-compiler test-compiler.go 2>/dev/null
fi
test_framework "Go" "./test-compiler discover"

# Python
test_framework "Python" "python3 test-compiler.py discover"

# Rust (run directly, not as executable)
test_framework "Rust" "cargo run --manifest-path=../../rust/Cargo.toml --bin test-compiler -- discover"

# C# (use dotnet run with proper args)
test_framework "C#" "dotnet run --project TestCompiler.csproj -- discover"

# F# (use dotnet run with proper args)
test_framework "F#" "dotnet run --project TestCompiler.fsproj -- discover"

# Haskell (needs to be compiled first)
if [ ! -f "TestCompiler" ]; then
    echo "Building Haskell test compiler..."
    cd ../haskell && cabal build && cd ../test 2>/dev/null
fi
test_framework "Haskell" "runhaskell TestCompiler.hs discover"

echo
echo "=== Additional 7 Frameworks ==="

# VB.NET
test_framework "VB.NET" "dotnet run --project TestCompiler.vbproj -- discover"

# Elixir
test_framework "Elixir" "elixir test_compiler_ex.exs discover"

# Scala (needs proper classpath)
test_framework "Scala" "scala -cp ../scala/target/scala-2.13/classes:. TestCompiler discover"

# Zig
test_framework "Zig" "zig run test_compiler.zig -- discover"

# V
test_framework "V" "v run test_compiler.v discover"

# D (use rdmd for direct execution)
test_framework "D" "rdmd -I.. test_compiler.d discover"

# Julia
test_framework "Julia" "julia test_compiler.jl discover"

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