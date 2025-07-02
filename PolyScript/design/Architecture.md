# PolyScript Architecture

## Core Architecture Pattern

**Data-Driven Design** with **Language-Native Instantiation**

```
Specification (Data) → Framework (Code) → Tools (Business Logic)
```

## Component Layers

### 1. Specification Layer
- **Role**: Define behavioral contracts and data formats
- **Artifacts**: JSON schema, mode semantics, flag behavior
- **Stability**: High - changes require major version bump

### 2. Framework Layer  
- **Role**: Language-specific implementation of specification
- **Artifacts**: Framework code using native CLI libraries
- **Pattern**: Transform specification into runnable code

### 3. Tool Layer
- **Role**: Business logic implementation by developers
- **Artifacts**: Method implementations for four modes
- **Constraint**: Zero framework knowledge required

## Framework Architecture

### Common Pattern
```
CLI Library → Framework Adapter → Mode Router → Business Method
```

### Language-Specific Implementations

**Python (Click)**
```
@polyscript_tool decorator → Click command group → Method dispatcher
```

**C# (Spectre.Console)**  
```
[PolyScriptTool] attribute → Command app → Interface methods
```

**F# (Argu)**
```
Interface implementation → Argument parser → Function calls
```

**Rust (clap)**
```
Trait implementation → Command parser → Method routing
```

## Data Flow

### Command Line → Framework
1. Parse mode and flags using CLI library
2. Create context object with parsed data
3. Route to appropriate business method
4. Handle return value and exceptions

### Business Method → Output
1. Method returns data structure or void
2. Framework formats based on --json flag
3. Framework handles errors and exit codes
4. Output routed to stdout/stderr appropriately

## Isolation Boundaries

### Framework ↔ Business Logic
- **Interface**: Context object and return values only
- **Isolation**: Business code has zero framework dependencies
- **Contract**: Method signatures defined by specification

### Language ↔ Language  
- **Interface**: None - completely independent implementations
- **Isolation**: No shared code or dependencies
- **Contract**: Identical JSON output format

## Extensibility Points

### Framework Level
- Add new CLI library support per language
- Extend context object with new capabilities
- Add validation and middleware layers

### Specification Level
- Add new execution modes (requires all frameworks)
- Add new standard flags (requires all frameworks)  
- Extend JSON schema (backward compatible only)

## Anti-Patterns Avoided

- **Universal Framework**: No cross-language compatibility layer
- **Configuration Complexity**: No external config files required
- **Feature Creep**: Limited to core CLI patterns only
- **Tight Coupling**: Business logic independent of framework