#!/bin/bash
#
# Systematic Framework Testing Script for PolyScript
# Tests all 16 language frameworks for compilation and basic functionality
#
# Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_FRAMEWORKS=16
PASSING_FRAMEWORKS=0
FAILING_FRAMEWORKS=0

# Results array
declare -a RESULTS

echo "========================================"
echo "PolyScript Framework Testing Suite"
echo "Testing all 16 language implementations"
echo "========================================"
echo

# Function to test a framework
test_framework() {
    local name="$1"
    local test_command="$2"
    local directory="$3"
    
    echo -n "Testing $name framework... "
    
    if [ ! -d "$directory" ]; then
        echo -e "${RED}FAIL${NC} (directory not found)"
        RESULTS+=("$name: FAIL - Directory not found")
        ((FAILING_FRAMEWORKS++))
        return 1
    fi
    
    cd "$directory"
    
    if eval "$test_command" &>/dev/null; then
        echo -e "${GREEN}PASS${NC}"
        RESULTS+=("$name: PASS")
        ((PASSING_FRAMEWORKS++))
    else
        echo -e "${RED}FAIL${NC}"
        RESULTS+=("$name: FAIL - $test_command failed")
        ((FAILING_FRAMEWORKS++))
    fi
    
    cd - &>/dev/null
}

# Function to test framework with dependency check
test_framework_with_deps() {
    local name="$1"
    local test_command="$2"
    local directory="$3"
    local dependency_check="$4"
    
    echo -n "Testing $name framework... "
    
    if [ ! -d "$directory" ]; then
        echo -e "${RED}FAIL${NC} (directory not found)"
        RESULTS+=("$name: FAIL - Directory not found")
        ((FAILING_FRAMEWORKS++))
        return 1
    fi
    
    # Check dependencies first
    if ! eval "$dependency_check" &>/dev/null; then
        echo -e "${YELLOW}SKIP${NC} (missing dependencies)"
        RESULTS+=("$name: SKIP - Missing dependencies")
        ((FAILING_FRAMEWORKS++))
        return 1
    fi
    
    cd "$directory"
    
    if eval "$test_command" &>/dev/null; then
        echo -e "${GREEN}PASS${NC}"
        RESULTS+=("$name: PASS")
        ((PASSING_FRAMEWORKS++))
    else
        echo -e "${RED}FAIL${NC}"
        RESULTS+=("$name: FAIL - $test_command failed")
        ((FAILING_FRAMEWORKS++))
    fi
    
    cd - &>/dev/null
}

# Ensure libpolyscript is built
echo "Building libpolyscript..."
cd /Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/libpolyscript
if [ ! -d "build" ]; then
    mkdir build
fi
cd build
cmake .. -DBUILD_TESTING=ON &>/dev/null
make -j$(nproc) &>/dev/null
if ! ctest --output-on-failure &>/dev/null; then
    echo -e "${RED}CRITICAL ERROR: libpolyscript tests failing${NC}"
    exit 1
fi
echo -e "${GREEN}libpolyscript build: PASS${NC}"
echo

# Test frameworks
echo "Testing individual frameworks..."
echo

# 1. C++ (libpolyscript itself)
test_framework "C++" "make && ctest" "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/libpolyscript/build"

# 2. Rust
test_framework "Rust" "cargo check" "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/frameworks/rust"

# 3. C# (.NET)
test_framework "C#" "dotnet build" "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/frameworks/csharp"

# 4. F# (.NET)
test_framework "F#" "dotnet build" "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/frameworks/fsharp"

# 5. Go
test_framework "Go" "go build" "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/frameworks/go"

# 6. Python (with virtual environment)
test_framework_with_deps "Python" "if [ -d venv ]; then source venv/bin/activate; fi && python -c 'import polyscript_click'" "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/frameworks/python" "command -v python3"

# 7. Node.js
test_framework_with_deps "Node.js" "node -e 'require(\"./polyscript-framework.js\")'" "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/frameworks/nodejs" "command -v node"

# 8. Ruby
test_framework_with_deps "Ruby" "ruby -c polyscript_framework.rb" "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/frameworks/ruby" "command -v ruby"

# 9. Julia
test_framework_with_deps "Julia" "julia --project=. -e 'using PolyScriptFramework'" "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/frameworks/julia" "command -v julia"

# 10. Haskell
test_framework_with_deps "Haskell" "cabal build --dry-run" "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/frameworks/haskell" "command -v cabal"

# 11. Elixir
test_framework_with_deps "Elixir" "mix compile" "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/frameworks/elixir" "command -v mix"

# 12. D
test_framework_with_deps "D" "dmd -c polyscript_framework.d" "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/frameworks/d" "command -v dmd"

# 13. PowerShell
test_framework_with_deps "PowerShell" "pwsh -Command 'try { . ./polyscript.ps1; exit 0 } catch { exit 1 }'" "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/frameworks/powershell" "command -v pwsh"

# 14. Scala
test_framework_with_deps "Scala" "scala -cp . Framework.scala" "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/frameworks/scala" "command -v scala"

# 15. Java
test_framework_with_deps "Java" "javac Framework.java" "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/frameworks/java" "command -v javac"

# 16. Zig (if implemented)
if [ -d "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/frameworks/zig" ]; then
    test_framework_with_deps "Zig" "zig build-exe polyscript_framework.zig" "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/frameworks/zig" "command -v zig"
else
    echo -n "Testing Zig framework... "
    echo -e "${YELLOW}SKIP${NC} (not implemented)"
    RESULTS+=("Zig: SKIP - Not implemented")
    ((FAILING_FRAMEWORKS++))
fi

echo
echo "========================================"
echo "Framework Testing Results"
echo "========================================"
echo

# Print detailed results
for result in "${RESULTS[@]}"; do
    if [[ $result == *"PASS"* ]]; then
        echo -e "${GREEN}✓${NC} $result"
    elif [[ $result == *"SKIP"* ]]; then
        echo -e "${YELLOW}⚠${NC} $result"
    else
        echo -e "${RED}✗${NC} $result"
    fi
done

echo
echo "========================================"
echo "Summary"
echo "========================================"
echo -e "Total frameworks: ${BLUE}$TOTAL_FRAMEWORKS${NC}"
echo -e "Passing: ${GREEN}$PASSING_FRAMEWORKS${NC}"
echo -e "Failing/Skipped: ${RED}$FAILING_FRAMEWORKS${NC}"

if [ $PASSING_FRAMEWORKS -eq $TOTAL_FRAMEWORKS ]; then
    echo -e "${GREEN}All frameworks are working!${NC}"
    exit 0
elif [ $PASSING_FRAMEWORKS -ge 4 ]; then
    echo -e "${YELLOW}Some frameworks working, need dependency fixes${NC}"
    exit 1
else
    echo -e "${RED}Critical issues found, most frameworks failing${NC}"
    exit 2
fi