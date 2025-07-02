# PolyScript Directory Structure

## Proposed Structure

```
PolyScript/
├── design/                    # Design documentation
│   ├── Vision.md             # Vision and principles  
│   ├── Context.md            # Team constraints and context
│   ├── Requirements.md       # Functional and non-functional requirements
│   ├── Specification.md      # Technical specification
│   ├── Architecture.md       # Architecture and patterns
│   └── Structure.md          # This directory design
├── frameworks/               # Framework implementations
│   ├── python/
│   │   ├── polyscript_click.py
│   │   └── example_tool.py
│   ├── csharp/
│   │   ├── PolyScript.Framework.cs
│   │   └── BackupTool.Example.cs
│   ├── fsharp/
│   │   ├── PolyScript.Framework.fs
│   │   └── BackupTool.Example.fs
│   └── rust/
│       ├── polyscript_framework.rs
│       └── backup_tool_example.rs
├── schema/                   # Specification artifacts
│   ├── polyscript-v1.0.json # JSON schema
│   └── mode-contracts.md     # Mode behavior contracts
├── tools/                    # Development and validation tools
│   ├── polyscript_validator.py
│   ├── polyscript_generator.py
│   └── test_suite/
│       ├── integration_tests.py
│       └── compliance_tests/
├── examples/                 # Cross-language examples
│   ├── backup_tool/          # Same tool in all languages
│   ├── config_manager/       # Configuration management example
│   └── system_monitor/       # System monitoring example
└── README.md                 # Main documentation entry point
```

## Directory Rationale

### `/design`
**Purpose**: Complete design documentation for understanding and maintenance
**Audience**: Architects, future maintainers, stakeholders
**Lifecycle**: Stable, versioned with major changes

### `/frameworks`  
**Purpose**: Language-specific framework implementations
**Organization**: One subdirectory per language for isolation
**Contents**: Framework code + minimal example per language

### `/schema`
**Purpose**: Machine-readable specification artifacts
**Audience**: Framework implementers, validation tools
**Lifecycle**: Versioned, backward compatibility required

### `/tools`
**Purpose**: Development, validation, and generation utilities
**Audience**: Framework developers, tool authors
**Lifecycle**: Evolves with framework needs

### `/examples`
**Purpose**: Demonstrate equivalent implementations across languages
**Organization**: One subdirectory per example tool type
**Value**: Shows consistency and comparative patterns

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