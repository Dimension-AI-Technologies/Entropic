# PolyScript Installation Guide

## Prerequisites

### Core Requirements
- **CMake 3.15+** for building libpolyscript
- **C++ compiler** supporting C++17 (GCC 7+, Clang 5+, MSVC 2019+)

### Language-Specific Tools
Install only the languages you plan to use:

**Systems Languages:**
- **Rust**: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Go**: Download from https://golang.org/dl/
- **Zig**: Download from https://ziglang.org/download/
- **D**: Download DMD from https://dlang.org/download.html

**Managed Languages:**
- **.NET**: Download from https://dotnet.microsoft.com/download
- **Java** (for Scala): OpenJDK 11+ from https://adoptopenjdk.net/

**Dynamic Languages:**
- **Python 3.7+**: Usually pre-installed on macOS/Linux
- **Node.js 16+**: Download from https://nodejs.org/
- **Ruby 3.0+**: Use rbenv or system package manager

**Functional Languages:**
- **Haskell**: Install GHC via https://www.haskell.org/ghcup/
- **Elixir**: Install via https://elixir-lang.org/install.html
- **Julia**: Download from https://julialang.org/downloads/

**Specialty Languages:**
- **V**: Download from https://vlang.io/
- **PowerShell**: Pre-installed on Windows, install on macOS/Linux

## Build Process

### 1. Build libpolyscript (Required)
```bash
cd PolyScript/libpolyscript
mkdir build && cd build
cmake ..
make
```

### 2. Build Language Frameworks (Optional)

Choose frameworks based on your needs:

**Rust:**
```bash
cd frameworks/rust
cargo build
```

**Go:**
```bash
cd frameworks/go  
go build .
```

**Python:**
```bash
cd frameworks/python
pip install click  # Only dependency
python -c "import polyscript_click"  # Verify
```

**.NET (C#/F#/VB.NET):**
```bash
cd PolyScript.NET
dotnet build
cd ../frameworks/csharp
dotnet build
```

**Node.js:**
```bash
cd frameworks/nodejs
npm install
```

**Ruby:**
```bash
cd frameworks/ruby
bundle install
```

**Haskell:**
```bash
cd frameworks/haskell
cabal build
```

**D:**
```bash
cd frameworks/d
dub build
```

**Julia:**
```bash
cd frameworks/julia
julia --project -e "using Pkg; Pkg.instantiate()"
```

**Elixir:**
```bash
cd frameworks/elixir
mix deps.get
mix compile
```

## Verification

Test core functionality:
```bash
cd frameworks/test
./test_all_frameworks.sh
```

Or test individual frameworks:
```bash
# Python
python test-compiler.py --mode simulate create test.txt

# Go  
go run test-compiler.go --mode simulate --operation create

# Rust
cargo run --bin test-compiler -- --mode simulate create
```

## Troubleshooting

**libpolyscript not found:**
- Ensure libpolyscript/build contains the library file (.so/.dylib/.dll)
- Check library paths in framework build configurations

**Compilation errors:**
- Verify language toolchain versions meet minimum requirements
- Check relative paths in build files match your directory structure

**FFI failures:**
- All frameworks include graceful fallbacks when libpolyscript unavailable
- Warning messages indicate fallback mode, not errors

**Path issues:**
- Use relative paths from framework directories
- Avoid hardcoded absolute paths in build configurations

## Language-Specific Notes

**Go**: Uses cgo, requires CGO_ENABLED=1
**Rust**: Requires polyscript-sys crate in libpolyscript-rust/
**.NET**: Shared PolyScript.NET.dll works across C#/F#/VB.NET/PowerShell
**Haskell**: Uses foreign import ccall, requires GHC
**D**: Uses extern(C), requires dub package manager
**Julia**: Uses ccall, no external dependencies
**Elixir**: Uses Erlang NIFs, requires Erlang/OTP

For a 3-person startup, focus on 2-3 core languages that match your team's expertise rather than building all 16 frameworks.