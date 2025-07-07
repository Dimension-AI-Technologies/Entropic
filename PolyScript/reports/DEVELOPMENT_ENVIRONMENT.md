# PolyScript Development Environment Requirements

**Date:** 2025-01-06
**Author:** Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>

## Overview

Complete development environment setup required to compile, test, and verify all 16 PolyScript frameworks.

## Core Requirements

### C/C++ Toolchain (for libpolyscript)
- **Compiler**: GCC 9+ / Clang 10+ / MSVC 2019+
- **Build System**: CMake 3.10+
- **Package Config**: pkg-config (Unix-like systems)
- **Platform Libraries**:
  - Linux: build-essential, libstdc++-dev
  - macOS: Xcode Command Line Tools
  - Windows: Visual Studio 2019+ with C++ workload

### Language-Specific Requirements

#### 1. Go Framework
- **Version**: Go 1.16 or higher
- **Environment**: GOPATH and GOROOT configured
- **CGO**: Enabled (CGO_ENABLED=1)
- **Platform Tools**:
  - gcc/clang for CGO compilation
  - pkg-config for library discovery

#### 2. Python Framework
- **Version**: Python 3.8+
- **Package Manager**: pip
- **Dependencies**:
  ```bash
  pip install click>=8.0.0
  ```
- **Dev Tools**: python3-dev (Linux), Python.h headers

#### 3. .NET Frameworks (C#, F#, VB.NET)
- **SDK**: .NET SDK 8.0
- **IDE**: Visual Studio 2022 (for VB.NET) or VS Code
- **Runtime**: .NET Runtime 8.0
- **Platform**:
  - Windows: Full Visual Studio recommended
  - Linux/macOS: .NET SDK via package manager

#### 4. Rust Framework
- **Toolchain**: Rust 1.70+ via rustup
- **Build Tool**: Cargo
- **Dependencies**:
  ```bash
  cargo build
  ```
- **Platform Tools**: cc linker (gcc/clang/cl.exe)

#### 5. Ruby Framework
- **Version**: Ruby 2.7+ or 3.0+
- **Package Manager**: Bundler
- **Dependencies**:
  ```bash
  bundle install
  ```
- **Dev Tools**: ruby-dev package, build tools

#### 6. Haskell Framework
- **Compiler**: GHC 8.10+
- **Build Tool**: Cabal 3.0+ or Stack
- **Platform Tools**: 
  - haskell-platform package
  - Happy parser generator

#### 7. D Framework
- **Compiler**: DMD 2.100+ / LDC 1.30+ / GDC 11+
- **Build Tool**: DUB
- **Dependencies**:
  ```bash
  dub build
  ```

#### 8. Zig Framework
- **Version**: Zig 0.11.0+
- **Build**: Built-in build system
- **Platform**: Direct download from ziglang.org

#### 9. V Framework
- **Compiler**: V compiler (latest)
- **Installation**:
  ```bash
  git clone https://github.com/vlang/v
  cd v && make
  ```

#### 10. Scala Framework
- **JDK**: Java 11+ (OpenJDK recommended)
- **Build Tool**: sbt 1.5+
- **Dependencies**: JNA library via sbt

#### 11. Elixir Framework
- **Version**: Elixir 1.12+ with Erlang/OTP 24+
- **Build Tool**: Mix
- **NIF Requirements**:
  - Erlang headers (erlang-dev package)
  - C compiler for NIF compilation

#### 12. Julia Framework
- **Version**: Julia 1.6+
- **Package Manager**: Pkg (built-in)
- **Dependencies**:
  ```julia
  using Pkg
  Pkg.add("ArgParse")
  ```

#### 13. Node.js Framework
- **Version**: Node.js 16+ LTS
- **Package Manager**: npm or yarn
- **Note**: No native dependencies (fallback only)

#### 14. PowerShell Framework
- **Version**: PowerShell Core 7+
- **Platform**: Cross-platform pwsh
- **Execution Policy**: May need adjustment

#### 15. Visual Basic .NET Framework
- **IDE**: Visual Studio 2022 (Windows)
- **SDK**: .NET SDK 8.0
- **Language Pack**: VB.NET support

## Platform-Specific Setup

### Linux (Ubuntu/Debian)
```bash
# Base development tools
sudo apt update
sudo apt install build-essential cmake pkg-config

# Language toolchains
sudo apt install golang python3-dev python3-pip
sudo apt install dotnet-sdk-8.0
# ... etc for each language
```

### macOS
```bash
# Xcode Command Line Tools
xcode-select --install

# Homebrew packages
brew install cmake pkg-config
brew install go python@3 dotnet-sdk
# ... etc
```

### Windows
1. Install Visual Studio 2022 with:
   - Desktop development with C++
   - .NET desktop development
   - Python development

2. Use package managers:
   - Chocolatey for tools
   - vcpkg for C++ libraries

## Verification Commands

After setup, verify each toolchain:

```bash
# C++ Toolchain
gcc --version
cmake --version

# Go
go version

# Python
python3 --version
pip --version

# .NET
dotnet --version

# Rust
rustc --version
cargo --version

# Ruby
ruby --version
bundle --version

# Continue for all 16 languages...
```

## IDE/Editor Support

Recommended development environments:
- **VS Code**: Extensions for all languages
- **IntelliJ IDEA**: Scala, Java-based languages
- **Visual Studio**: .NET languages
- **Emacs/Vim**: With language servers

## Docker Alternative

For isolated testing, consider Docker containers:
```dockerfile
FROM ubuntu:22.04
# Install all language toolchains
# Build and test in container
```

## Time Estimate

Full environment setup: 4-8 hours depending on:
- Internet speed (large downloads)
- Platform (Windows typically slower)
- Experience level
- Whether using containers

## Next Steps

1. Choose primary development platform
2. Install toolchains incrementally
3. Test each framework as toolchain installed
4. Document any platform-specific issues
5. Create automation scripts for setup