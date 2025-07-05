# PolyScript Directory Structure

## Proposed Structure

```
PolyScript/
├── libpolyscript/            # C++ Core Library (NEW)
│   ├── include/
│   │   └── polyscript/
│   │       ├── polyscript.hpp     # Main header
│   │       ├── operations.hpp     # CRUD operations
│   │       ├── modes.hpp          # Execution modes  
│   │       └── context.hpp        # Context management
│   ├── src/
│   │   ├── polyscript.cpp         # Core implementation
│   │   ├── operations.cpp         # Operation logic
│   │   └── modes.cpp              # Mode behaviors
│   ├── CMakeLists.txt             # Build configuration
│   └── README.md                  # C++ library documentation
├── wrappers/                 # Language Wrappers (NEW)
│   └── dotnet/
│       ├── PolyScript.NET.csproj  # .NET Standard 2.0
│       ├── PolyScript.cs          # P/Invoke wrapper
│       └── IPolyScriptTool.cs     # .NET interface
├── design/                   # Design documentation
│   ├── Vision.md             # Vision and principles  
│   ├── Context.md            # Team constraints and context
│   ├── Requirements.md       # Functional and non-functional requirements
│   ├── Specification.md      # Technical specification v2.0
│   ├── Architecture.md       # Architecture with libpolyscript
│   ├── Structure.md          # This directory design
│   ├── LanguageIntegration.md # FFI mappings for 16 languages (NEW)
│   └── LibraryDesign.md      # C++ implementation details (NEW)
├── frameworks/               # 16 Language Implementations
│   ├── nodejs/               # JavaScript/TypeScript
│   ├── ruby/                 # Ruby
│   ├── powershell/           # PowerShell
│   ├── go/                   # Go
│   ├── python/               # Python
│   ├── rust/                 # Rust
│   ├── csharp/               # C# (uses PolyScript.NET)
│   ├── fsharp/               # F# (uses PolyScript.NET)
│   ├── haskell/              # Haskell
│   ├── vbnet/                # VB.NET (uses PolyScript.NET)
│   ├── elixir/               # Elixir
│   ├── scala/                # Scala
│   ├── zig/                  # Zig
│   ├── v/                    # V
│   ├── d/                    # D
│   └── julia/                # Julia
├── schema/                   # Legacy - will be removed
│   ├── polyscript-v1.0.json # JSON schema (deprecated)
│   └── mode-contracts.md     # Mode behavior contracts (deprecated)
├── tools/                    # Development and validation tools
│   ├── polyscript_validator.py
│   ├── polyscript_generator.py
│   └── test_suite/
│       ├── integration_tests.py
│       └── compliance_tests/
├── examples/                 # Cross-language examples
│   ├── backup_tool/          # Same tool in all 16 languages
│   ├── config_manager/       # Configuration management example
│   └── system_monitor/       # System monitoring example
└── README.md                 # Main documentation entry point
```

## Directory Rationale

### `/libpolyscript` (NEW)
**Purpose**: C++ core library providing universal PolyScript behavior
**Audience**: All language implementers, library consumers
**Lifecycle**: Stable ABI, semantic versioning
**Contents**: Headers, implementation, build scripts, tests

### `/wrappers` (NEW)
**Purpose**: Language-specific wrappers for libpolyscript
**Organization**: One subdirectory per language family (.NET, JVM, etc.)
**Contents**: P/Invoke wrappers, bindings, type marshalling

### `/design`
**Purpose**: Complete design documentation for understanding and maintenance
**Audience**: Architects, future maintainers, stakeholders
**Lifecycle**: Stable, versioned with major changes
**Updated**: Now includes libpolyscript architecture and FFI mappings

### `/frameworks`  
**Purpose**: 16 language-specific framework implementations
**Organization**: One subdirectory per language for isolation
**Contents**: Idiomatic CLI wrappers + libpolyscript integration
**Updated**: Expanded from 4 to 16 languages, all use libpolyscript

### `/schema` (DEPRECATED)
**Purpose**: Legacy machine-readable specification artifacts
**Status**: Will be removed - specifications now hardcoded in C++
**Migration**: All behavior moved to libpolyscript headers

### `/tools`
**Purpose**: Development, validation, and generation utilities
**Audience**: Framework developers, tool authors
**Lifecycle**: Evolves with framework needs

### `/examples`
**Purpose**: Demonstrate equivalent implementations across 16 languages
**Organization**: One subdirectory per example tool type
**Value**: Shows consistency and comparative patterns across all languages

## File Naming Conventions

### Frameworks
- `polyscript_<library>.ext` for framework files
- `<tool>_example.ext` for example implementations

### Examples  
- Same tool name across all language implementations
- Language-specific file extensions and conventions

### Documentation
- PascalCase for design documents (Vision.md)
- lowercase for technical artifacts (schema files)

## Migration from Current Structure

### Phase 1: Reorganize existing files
- Move frameworks to `/frameworks/<language>/`
- Move design docs to `/design/`
- Create schema directory with JSON schema

### Phase 2: Add missing components
- Create comprehensive examples
- Add validation tools
- Build test suites

### Phase 3: Deprecate old structure
- Remove old files after migration
- Update all references
- Archive superseded documentation

## Maintenance Strategy

**Design docs**: Update only for major changes
**Frameworks**: Independent versioning per language  
**Schema**: Semantic versioning, backward compatibility
**Examples**: Keep current with framework changes
**Tools**: Evolve as needed for quality assurance