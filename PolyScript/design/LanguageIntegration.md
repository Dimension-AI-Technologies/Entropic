# PolyScript Language Integration Guide

## Overview

This document details how each of the 16 supported languages integrates with the libpolyscript C++ core library. The integration approach varies by language ecosystem and FFI capabilities.

## Integration Architecture

```
┌─────────────────────────────┐
│     libpolyscript.so/.dll   │  ← C++ Core Library
│   • Mode logic             │
│   • Context management     │  
│   • Discovery data         │
│   • Behavioral constants   │
└─────────────────────────────┘
              │
              v
┌─────────────────────────────┐
│    Language Wrappers        │  ← FFI Integration Layer
│  • Type marshalling        │
│  • Error handling          │
│  • Memory management       │
└─────────────────────────────┘
              │
              v
┌─────────────────────────────┐
│  Language-Specific CLI      │  ← Idiomatic Implementation
│  • Argument parsing        │
│  • JSON serialization      │
│  • Logging frameworks      │
└─────────────────────────────┘
```

## Language Integration Matrix

| Language | FFI Method | CLI Library | JSON Library | Build Tool | Notes |
|----------|------------|-------------|--------------|------------|-------|
| **C#** | P/Invoke via PolyScript.NET | Spectre.Console.Cli | System.Text.Json | dotnet | Shared .NET wrapper |
| **F#** | P/Invoke via PolyScript.NET | Argu | FSharp.Json | dotnet | Shared .NET wrapper |
| **VB.NET** | P/Invoke via PolyScript.NET | Spectre.Console.Cli | System.Text.Json | dotnet | Shared .NET wrapper |
| **PowerShell** | P/Invoke via PolyScript.NET | Native cmdlets | ConvertTo-Json | dotnet | Shared .NET wrapper |
| **Node.js** | N-API/node-gyp | yargs | Native JSON | npm | Native addon |
| **Python** | ctypes | Click | json module | pip | Dynamic linking |
| **Ruby** | FFI gem | Thor | json gem | gem | Dynamic linking |
| **Go** | cgo | Cobra | encoding/json | go build | Static linking |
| **Rust** | bindgen + cc | clap | serde_json | cargo | Static linking |
| **Haskell** | Foreign Function Interface | optparse-applicative | aeson | cabal/stack | Dynamic linking |
| **Java/Scala** | JNI | scopt | circe/play-json | sbt/maven | Dynamic linking |
| **Elixir** | NIFs (Erlang) | Mix tasks | Jason | mix | Dynamic linking |
| **Zig** | Built-in C interop | Built-in args | std.json | zig build | Static linking |
| **V** | Native C interop | flag module | json module | v build | Static linking |
| **D** | extern(C) | std.getopt | std.json | dmd/ldc2 | Static linking |
| **Julia** | ccall | ArgParse.jl | JSON.jl | Pkg | Dynamic linking |

## .NET Integration (4 Languages)

### PolyScript.NET Wrapper

**Languages**: C#, F#, VB.NET, PowerShell  
**Target**: .NET Standard 2.0 for maximum compatibility

```csharp
// PolyScript.NET/PolyScript.cs
using System;
using System.Runtime.InteropServices;

namespace PolyScript
{
    public static class LibPolyScript
    {
        private const string LibraryName = "libpolyscript";

        [DllImport(LibraryName, CallingConvention = CallingConvention.Cdecl)]
        public static extern bool polyscript_can_mutate(int mode);

        [DllImport(LibraryName, CallingConvention = CallingConvention.Cdecl)]
        public static extern bool polyscript_should_validate(int mode);

        [DllImport(LibraryName, CallingConvention = CallingConvention.Cdecl)]
        public static extern bool polyscript_require_confirm(int mode, int operation);

        [DllImport(LibraryName, CallingConvention = CallingConvention.Cdecl)]
        public static extern IntPtr polyscript_get_discovery_info(string toolName);

        [DllImport(LibraryName, CallingConvention = CallingConvention.Cdecl)]
        public static extern void polyscript_free_string(IntPtr ptr);
    }

    public enum Operation { Create = 0, Read = 1, Update = 2, Delete = 3 }
    public enum Mode { Simulate = 0, Sandbox = 1, Live = 2 }

    public interface IPolyScriptTool
    {
        string Description { get; }
        object Create(string resource, Dictionary<string, object> options, PolyScriptContext context);
        object Read(string resource, Dictionary<string, object> options, PolyScriptContext context);
        object Update(string resource, Dictionary<string, object> options, PolyScriptContext context);
        object Delete(string resource, Dictionary<string, object> options, PolyScriptContext context);
    }
}
```

### Deployment Strategy
- **NuGet Package**: PolyScript.NET with native binaries
- **Platform Targets**: win-x64, linux-x64, osx-x64
- **Native Libraries**: Embedded as resources, extracted at runtime

## Native FFI Integration (12 Languages)

### Python Integration
```python
# python/polyscript_framework.py
import ctypes
import json
from pathlib import Path

# Load libpolyscript
lib_path = Path(__file__).parent / "libpolyscript.so"
libpolyscript = ctypes.CDLL(str(lib_path))

# Function signatures
libpolyscript.polyscript_can_mutate.argtypes = [ctypes.c_int]
libpolyscript.polyscript_can_mutate.restype = ctypes.c_bool

libpolyscript.polyscript_should_validate.argtypes = [ctypes.c_int]
libpolyscript.polyscript_should_validate.restype = ctypes.c_bool

class PolyScriptContext:
    def __init__(self, operation, mode, resource=None):
        self.operation = operation
        self.mode = mode
        self.resource = resource
    
    def can_mutate(self):
        return libpolyscript.polyscript_can_mutate(self.mode.value)
    
    def should_validate(self):
        return libpolyscript.polyscript_should_validate(self.mode.value)
```

### Rust Integration
```rust
// rust/polyscript_framework.rs
use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int};

extern "C" {
    fn polyscript_can_mutate(mode: c_int) -> bool;
    fn polyscript_should_validate(mode: c_int) -> bool;
    fn polyscript_require_confirm(mode: c_int, operation: c_int) -> bool;
    fn polyscript_get_discovery_info(tool_name: *const c_char) -> *mut c_char;
    fn polyscript_free_string(ptr: *mut c_char);
}

#[derive(Debug, Clone, Copy)]
pub enum Operation { Create = 0, Read = 1, Update = 2, Delete = 3 }

#[derive(Debug, Clone, Copy)]
pub enum Mode { Simulate = 0, Sandbox = 1, Live = 2 }

pub struct PolyScriptContext {
    pub operation: Operation,
    pub mode: Mode,
    pub resource: Option<String>,
}

impl PolyScriptContext {
    pub fn can_mutate(&self) -> bool {
        unsafe { polyscript_can_mutate(self.mode as c_int) }
    }
    
    pub fn should_validate(&self) -> bool {
        unsafe { polyscript_should_validate(self.mode as c_int) }
    }
}
```

### Go Integration
```go
// go/polyscript_framework.go
package polyscript

/*
#cgo LDFLAGS: -lpolyscript
#include <stdbool.h>
#include <stdlib.h>

bool polyscript_can_mutate(int mode);
bool polyscript_should_validate(int mode);
bool polyscript_require_confirm(int mode, int operation);
char* polyscript_get_discovery_info(const char* tool_name);
void polyscript_free_string(char* ptr);
*/
import "C"
import (
    "unsafe"
)

type Operation int
const (
    Create Operation = 0
    Read   Operation = 1
    Update Operation = 2
    Delete Operation = 3
)

type Mode int
const (
    Simulate Mode = 0
    Sandbox  Mode = 1
    Live     Mode = 2
)

type Context struct {
    Operation Operation
    Mode      Mode
    Resource  string
}

func (c *Context) CanMutate() bool {
    return bool(C.polyscript_can_mutate(C.int(c.Mode)))
}

func (c *Context) ShouldValidate() bool {
    return bool(C.polyscript_should_validate(C.int(c.Mode)))
}
```

## Build and Deployment

### libpolyscript Build Requirements
- **C++ Standard**: C++11 minimum for ABI stability
- **Build System**: CMake 3.15+
- **Compilers**: GCC 7+, Clang 6+, MSVC 2017+
- **Target Platforms**: Linux x64, Windows x64, macOS x64

### CMake Configuration
```cmake
# libpolyscript/CMakeLists.txt
cmake_minimum_required(VERSION 3.15)
project(libpolyscript VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Build shared library
add_library(polyscript SHARED
    src/polyscript.cpp
    src/operations.cpp
    src/modes.cpp
)

target_include_directories(polyscript
    PUBLIC 
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

# Install configuration
install(TARGETS polyscript
    EXPORT polyscript-targets
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)

install(DIRECTORY include/polyscript DESTINATION include)
```

### Distribution Strategy

**Native Packages**:
- **Linux**: .deb/.rpm packages with libpolyscript.so
- **Windows**: NuGet/Chocolatey with libpolyscript.dll
- **macOS**: Homebrew with libpolyscript.dylib

**Language-Specific Packages**:
- **Python**: PyPI wheel with bundled native library
- **Node.js**: npm package with native addon
- **Ruby**: RubyGems with FFI gem dependency
- **Go**: Go module with cgo build tags
- **Rust**: Crate with sys crate for bindings
- **.NET**: NuGet package with platform-specific natives

## Error Handling and Memory Management

### C++ Interface Design
- **No exceptions**: Pure C interface for maximum compatibility
- **Return codes**: Integer error codes for failures
- **Memory management**: Caller-free pattern for string returns
- **Thread safety**: Stateless functions, no global state

### Language-Specific Adaptations
- **C#**: Convert return codes to exceptions
- **Python**: Convert return codes to Python exceptions
- **Rust**: Convert return codes to Result<T, E>
- **Go**: Convert return codes to error interface
- **Haskell**: Convert return codes to Either/Maybe

## Performance Considerations

### Library Loading
- **Dynamic linking**: Preferred for most languages
- **Static linking**: Available for Rust, Zig, V, D
- **Lazy loading**: Load library only when needed
- **Caching**: Cache function pointers after first load

### Function Call Overhead
- **Minimal FFI cost**: Simple C functions with basic types
- **Batch operations**: Group multiple calls when possible
- **Inline validation**: Use libpolyscript for complex logic only

## Testing Strategy

### Integration Tests
- **Matrix testing**: All 16 languages × all operations × all modes
- **Cross-platform**: Linux, Windows, macOS for each language
- **Performance benchmarks**: FFI overhead measurements
- **Memory leak detection**: Valgrind/AddressSanitizer testing

### Compliance Validation
- **Output format**: JSON schema validation across languages
- **Behavioral consistency**: Identical results for same inputs
- **CLI compatibility**: Standard flag handling verification

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>