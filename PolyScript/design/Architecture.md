# PolyScript Architecture

## Core Architecture

**Behavioral Contract Framework** using **Template Method and Strategy Patterns**

```
Behavioral Contracts → Language Frameworks → Consistent Behavior
```

### Data-Code Separation

- **Discovery is Data** - Tool capabilities exposed as JSON for introspection
- **Configuration is Data** - Mode selection and tool metadata in structured formats  
- **Behavior is Code** - Business logic remains in native, idiomatic implementations
- **Interfaces are the bridge** - Clean contracts between data-driven routing and code execution

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

### Framework Requirements
Each language framework must:
1. Parse CLI arguments into operation + mode + resource
2. Route to appropriate CRUD method
3. Wrap execution with mode-specific behavior
4. Handle standard flags (--json, --verbose, --force)
5. Support rebadging through code-based configuration

### Developer Requirements
Tool developers implement:
```
create(resource, options, context)
read(resource, options, context)
update(resource, options, context)
delete(resource, options, context)
```

Framework handles routing, modes, confirmation, JSON output.

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