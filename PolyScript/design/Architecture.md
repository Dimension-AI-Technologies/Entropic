# PolyScript Architecture

## Core Architecture

**Three-Layer Architecture** with **C++ Core Library** and **Language-Specific Wrappers**

```
libpolyscript.so/.dll (C++ Core) → Language Wrappers → Consistent Behavior
```

### Architectural Decision: C++ Core Library

**Decision**: Implement core PolyScript behavior in a C++ library with language-specific wrappers.

**Rationale**:
- **Single Source of Truth**: Core logic (mode behaviors, JSON formatting, context management) implemented once
- **ABI Stability**: C++11+ provides stable ABI across compilers since 2011
- **Universal Compatibility**: All 16 languages can consume C++ libraries via FFI or direct linkage
- **Zero Dependencies**: No external libraries (JSON parsing, YAML, etc.) - everything hardcoded
- **Compile-Time Safety**: Specification hardcoded in C++ headers with constexpr validation

**Three-Layer Design**:
1. **libpolyscript** (C++ core) - Pure logic, no I/O dependencies
2. **Language wrappers** - Idiomatic CLI parsing and logging
3. **Tool implementations** - Business logic using language-specific frameworks

### libpolyscript Core Responsibilities

**C++ Core Library provides**:
- **Mode Logic**: `can_mutate()`, `should_validate()`, `require_confirm()` functions
- **Context Management**: Operation, mode, resource, and flag validation
- **Discovery Data**: Hardcoded tool capability structures
- **JSON Schema**: PolyScript v1.0 output format compliance
- **Behavioral Constants**: All CRUD × Modes behavior matrix hardcoded with `constexpr`

**Language Wrappers provide**:
- **CLI Parsing**: Using idiomatic libraries (Click, Cobra, clap, thor, etc.)
- **JSON Serialization**: Using native JSON libraries
- **Logging**: Using language-specific logging frameworks
- **Error Handling**: Using language-specific exception patterns
- **Type Integration**: Converting between native types and libpolyscript structures

### Data-Code Separation

- **Specification is Code** - All PolyScript behavior hardcoded in C++ with compile-time validation
- **Discovery is Data** - Tool capabilities exposed as JSON for introspection  
- **Business Logic is Code** - Tool implementations remain in native, idiomatic code
- **No External Configuration** - Zero dependencies on JSON, YAML, or configuration files

## Design Patterns

### Traditional Scripting Limitations

Traditional shell scripting languages (bash, batch, etc.) lack:
- Interface contracts
- Formal templating systems  
- Design pattern support
- Language-agnostic abstractions

PowerShell provides OOP and .NET integration. PolyScript extends similar concepts across languages.

### Applied Patterns

1. **Command Pattern**: CRUD operations encapsulate actions as commands
2. **Strategy Pattern**: Execution modes modify behavior without changing commands
3. **Template Method**: Framework provides algorithm skeleton, tools provide steps
4. **Code-Based Configuration**: Rebadging maps commands to domain terminology

## Operation Matrix

```
         | Simulate | Sandbox | Live
---------|----------|---------|------
Create   |    ✓     |    ✓    |  ✓
Read     |    ✓     |    ✓    |  ✓
Update   |    ✓     |    ✓    |  ✓  
Delete   |    ✓     |    ✓    |  ✓
```

Each operation supports all three modes. Developers implement four methods, framework provides twelve behaviors.

## Rebadging

```
CRUD Operation → Domain Names → User Commands
   create     →  compile/build/deploy/commit
   read       →  status/list/analyze/verify
   update     →  optimize/refactor/sync/patch
   delete     →  clean/purge/revert/uninstall
```

## Component Architecture

### 1. Specification Layer
- **Function**: Define CRUD operations and modal execution semantics
- **Artifacts**: Operation contracts, mode behaviors, JSON schema
- **Stability**: High - changes require major version bump

### 2. Framework Layer  
- **Function**: Implement operation routing, mode wrapping, and rebadging
- **Artifacts**: Language-specific routers using native CLI libraries
- **Result**: 4 operations × 3 modes × N rebadged names

### 3. Tool Layer
- **Function**: Implement CRUD business logic only
- **Artifacts**: Four method implementations + rebadging configuration
- **Result**: Single implementation, multiple execution contexts

## Command Flow

```
CLI Input → Parse Rebadging → Parse Operation → Parse Mode → Route → Wrap → Execute → Output
```

### Rebadging Resolution
```
User: "compile foo.c"
Framework: compile → create + live
Routes to: tool.create("foo.c", options, context)
```

### Mode Execution

**Simulate Mode**:
- Shows planned actions
- No side effects
- Returns action descriptions

**Sandbox Mode**:
- Tests prerequisites
- Validates permissions
- Returns readiness status

**Live Mode**:
- Executes operations
- Requests confirmation for destructive actions
- Returns operation results

## Language Implementation

### Supported Languages (16 Total)

**Original 9 Languages**:
1. **Node.js** - npm ecosystem, native JSON handling
2. **Ruby** - Gem ecosystem, thor CLI framework
3. **PowerShell** - .NET integration, cmdlet patterns
4. **Go** - Cobra CLI framework, cgo for C++ FFI
5. **Python** - Click CLI framework, ctypes for C++ FFI
6. **Rust** - clap CLI framework, excellent C++ FFI
7. **C#** - .NET ecosystem, P/Invoke for C++ FFI
8. **F#** - .NET ecosystem, functional programming
9. **Haskell** - optparse-applicative, Foreign Function Interface

**Additional 7 Languages**:
10. **VB.NET** - .NET ecosystem, Spectre.Console.Cli
11. **Elixir** - Mix tasks, Erlang NIFs for C++ integration
12. **Scala** - scopt CLI framework, JNI for C++ FFI
13. **Zig** - Built-in arg parsing, designed for C++ interop
14. **V** - flag module, native C++ interop
15. **D** - std.getopt, excellent C++ interoperability
16. **Julia** - ArgParse.jl, ccall for C++ FFI

### Framework Requirements
Each language wrapper must:
1. **Link to libpolyscript** via FFI or direct linkage
2. **Parse CLI arguments** using idiomatic libraries (Click, Cobra, clap, etc.)
3. **Call libpolyscript functions** for mode logic and validation
4. **Handle JSON formatting** using native JSON libraries
5. **Implement logging** using language-specific logging frameworks

### Special .NET Integration
**C#, F#, VB.NET, PowerShell** share a common **PolyScript.NET** wrapper:
- Direct P/Invoke to libpolyscript.dll
- Shared .NET Standard 2.0 assembly
- Native .NET types and exception handling
- Integrated with existing .NET CLI frameworks

### Developer Requirements
Tool developers implement:
```
create(resource, options, context)
read(resource, options, context)
update(resource, options, context)
delete(resource, options, context)
```

**libpolyscript** handles mode logic, **language wrappers** handle routing and I/O.

## Context Object

```
{
  operation: "create|read|update|delete",
  mode: "simulate|sandbox|live",
  resource: "target resource",
  rebadged_as: "compile",  // If called via rebadged name
  options: {/* operation-specific options */},
  flags: {
    json: boolean,
    verbose: boolean,
    force: boolean
  },
  // Helper methods
  log(message, level),
  confirm(prompt),
  output(data),
  // Mode queries
  can_mutate(): boolean,
  is_safe_mode(): boolean
}
```

## Error Handling

### Exit Codes
- **0**: Success
- **1**: Operational failure  
- **2**: Invalid arguments

### JSON Error Format
```json
{
  "polyscript": "1.0",
  "operation": "create",
  "mode": "live",
  "status": "error",
  "errors": ["error message"],
  "data": {}
}
```

## Agent Integration

Basic agent support through:
- Consistent CRUD × Modes patterns across tools
- Simulate/sandbox modes for safe exploration
- Standard JSON responses for programmatic consumption