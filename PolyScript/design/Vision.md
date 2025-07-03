# PolyScript Vision

## Core Objective

Provide a consistent behavioral contract for CLI tools across programming languages. Implementation language choice becomes practical rather than architectural.

## Technical Approach

### Data-Code Separation

- **Discovery is Data** - Tool capabilities exposed as JSON for introspection
- **Configuration is Data** - Mode selection and tool metadata in structured formats  
- **Behavior is Code** - Business logic remains in native, idiomatic implementations
- **Interfaces are the bridge** - Clean contracts between data-driven routing and code execution

### PolyScript Implementation

- **Behavioral Contracts** - Universal CRUD × Modes matrix implemented across languages
- **Language Agnostic Patterns** - Identical behavioral contracts with language-specific implementations

Language frameworks implement these contracts idiomatically while maintaining consistency.

## Current Limitations

### Traditional Scripting Languages

**Unix Shells (bash, sh, zsh, fish)**:
- No interface contracts or formal method signatures
- No templating beyond basic variable substitution  
- No design pattern support
- Functions without formal contracts or type safety

**MS-DOS Batch**:
- No interfaces, contracts, or patterns
- Limited templating capabilities

**PowerShell**:
- Object-oriented programming with .NET integration
- Formal interfaces (IDisposable, custom interfaces) 
- Advanced language constructs
- Design pattern support through OOP

### CLI Development Issues

- Inconsistent interface patterns across tools
- No standardized exploration methods
- Pattern reimplementation across languages
- Poor tool composition capabilities

## PolyScript Specification

### Core Operations
Four CRUD operations with domain rebadging:
- `create` → `compile`, `commit`, `deploy`, `backup`
- `read` → `status`, `analyze`, `list`, `verify`
- `update` → `refactor`, `optimize`, `patch`, `sync`
- `delete` → `clean`, `purge`, `uninstall`, `revert`

### Execution Modes
Three modes per operation:
1. **Simulate** - Show planned actions without execution
2. **Sandbox** - Validate prerequisites and permissions
3. **Live** - Execute operations with optional confirmation

### Operation Matrix
4 Operations × 3 Modes = 12 behaviors from single implementation:
- Create operations can be simulated, validated, or executed
- Read operations support all modes (safe by default)
- Update operations can be tested before application
- Delete operations can be previewed before execution

### Rebadging Implementation
Code-based configuration through decorators maintains single-file tools.

### Agent Integration
Basic agent support through:
- Consistent CRUD × Modes patterns
- Simulate and sandbox modes for safe exploration
- Standard JSON responses

## Target Outcomes

- Rapid CLI tool development (minutes vs hours)
- Consistent behavioral patterns across teams and languages
- Implementation language choice based on practical considerations
- Inherent testability through consistent modes

## Excluded Features

- Language bridges or compatibility layers
- Frameworks that conflict with language idioms
- Complex YAML configuration
- Complex agent discovery systems
- Features beyond CRUD × Modes