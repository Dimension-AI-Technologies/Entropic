# PolyScript Vision

## Core Objective

Provide a consistent behavioral contract for CLI tools across programming languages. Implementation language choice becomes practical rather than architectural.

## Technical Approach

### Transcending Language Paradigms: From Implementation-Driven to Data-Driven

PolyScript represents a fundamental shift from **implementation-driven** (or paradigm-driven) development to **data-driven** architecture. This approach draws from Domain-Driven Design principles applied at scale.

### The Meta-Language Challenge

Traditional software development is constrained by implementation languages and their paradigms:
- **Object-oriented** languages force everything into classes
- **Functional** languages push toward pure functions
- **Procedural** languages organize around functions and modules

But what if the **domain knowledge itself** could transcend these paradigms?

### Domain-Driven Design at Scale

**Experience from Financial Trading Systems**:
At Bluecrest and similar financial institutions, we discovered that trading knowledge could be captured as **pure data designs** using UML. These designs were then consumed by:
- **Data teams** - for storage and retrieval systems
- **Modeling teams** - for quantitative analysis
- **Operations teams** - for monitoring and alerting
- **Technology teams** - for system architecture

**The Documentation Problem**:
UML documents can be edited (deliberately or accidentally). This creates drift between the specification and implementations. The solution requires something **immutable** and **compiled**.

### The Universal Solution: C as the True Universal Language

**C is the only language that is truly universal**:
1. **Every language can call C** - FFI support is universal (Python ctypes, Rust extern, Go cgo, etc.)
2. **Zero dependencies** - C code can be written without any external libraries
3. **Compiled and immutable** - Cannot be accidentally modified like documents
4. **ABI stability** - Stable binary interface across platforms and compilers

**No other language achieves this universality**:
- **Python** - Requires Python runtime
- **Java** - Requires JVM  
- **JavaScript** - Requires Node.js/browser
- **C#** - Requires .NET runtime
- **Only C** - Can be called by everything, depends on nothing

### Behavioral Contracts as C Structures

**Core Insight**: Define behavioral contracts as **C structures** that encode the CRUD × Modes matrix:

```c
// Behavioral contract - universal and dependency-free
typedef struct {
    bool can_mutate;
    bool should_validate; 
    bool require_confirm_update;
    bool require_confirm_delete;
} ModeRules;

// Hardcoded behavior matrix - cannot be edited accidentally
static const ModeRules MODE_BEHAVIORS[3] = {
    {false, false, false, false},  // Simulate: show what would happen
    {false, true,  false, false},  // Sandbox: test prerequisites
    {true,  false, true,  true}    // Live: actual execution
};

// Universal functions that all languages can call
bool polyscript_can_mutate(int mode);
bool polyscript_should_validate(int mode);
bool polyscript_require_confirm(int mode, int operation);
```

### The 12-Function Contract

**Every language framework must implement exactly 12 functions**:
- **4 CRUD operations**: `create`, `read`, `update`, `delete`
- **3 execution modes**: `simulate`, `sandbox`, `live`  
- **Total**: 4 × 3 = **12 behavioral combinations**

**Framework responsibility**: Route CLI calls to appropriate CRUD+Mode combination
**Business logic responsibility**: Implement only the 4 CRUD methods
**libpolyscript responsibility**: Provide mode behavior logic

### PolyScript Implementation Philosophy

**Core Insight**: CLI scripting patterns can be captured as **pure data** (CRUD × Modes matrix) and exposed through a universal C interface.

**Three-Layer Architecture**:
1. **libpolyscript (C core)** - Behavioral contracts as compiled C structures
2. **Language frameworks** - Implement 12-function contract with idiomatic CLI libraries
3. **Business logic scripts** - Write only CRUD methods + rebadging configuration

### Script Developer Experience

**What developers write**:
```python
# Python example - only business logic required
class BackupTool(PolyScriptTool):
    def create(self, resource, options, context):
        # Business logic for backup creation
        return {"backed_up": resource, "size": "1.2GB"}
    
    def read(self, resource, options, context):
        # Business logic for backup status  
        return {"backups": ["daily-2024.tar", "weekly-2024.tar"]}
    
    # ... update and delete methods

# Rebadging - friendly names for users
@rebadge("backup", "create+live")
@rebadge("dry-backup", "create+simulate") 
@rebadge("status", "read+live")
@rebadge("restore", "update+live")
@rebadge("cleanup", "delete+live")
```

**What users see**:
```bash
# Friendly commands instead of CRUD
backup myproject.tar          # create+live
dry-backup myproject.tar      # create+simulate  
status                        # read+live
restore myproject.tar         # update+live
cleanup old-backups/          # delete+live
```

**What the framework provides automatically**:
- **12 behavioral combinations** from 4 business logic methods
- **Mode wrapping** (simulate shows plans, sandbox tests prerequisites)
- **CLI argument parsing** using language-native libraries (Click, clap, etc.)
- **JSON output** for programmatic consumption
- **Confirmation prompts** for destructive operations
- **Error handling** and logging

**Result**: Scripts in **16 languages** have identical behavior patterns while using language-specific CLI, logging, and error handling idioms.

### A Novel Approach: Compiled Behavioral Contract Libraries

**Potential Evolution**: PolyScript could be designed as **UML specifications** that generate C/C++ headers, making libpolyscript essentially **"Compiled UML"** - immutable, versioned, and universally understood.

This creates a **Behavioral Interface Definition Language** using C's universal ABI as the carrier.

### Comparison with Existing IDL/Contract Systems

**Traditional IDLs focus on data & interfaces**:
- **CORBA IDL** - Interface definitions, language-specific bindings
- **COM/DCOM IDL** - Windows-only, interface contracts
- **Apache Thrift** - Data serialization, RPC interfaces
- **gRPC/Protocol Buffers** - Service definitions, network protocols

**Behavioral/Contract Systems exist but are limited**:
- **Design by Contract (Eiffel)** - Language-specific only
- **JML (Java Modeling Language)** - Java-only behavioral contracts
- **BPEL** - XML-heavyweight, business process workflows
- **TLA+** - Specification language, not compiled to executable artifacts
- **OpenAPI/Swagger** - REST APIs only, not general-purpose behavior

### None Achieve Universal Behavioral Contracts

**The fundamental limitations**:
1. **Language-specific** - Tied to particular ecosystems
2. **Documentation-based** - Text/XML that can be edited or become stale
3. **Interface-focused** - Define method signatures, not behavioral patterns
4. **Complex specifications** - Heavy, enterprise-oriented systems

### Our Unique Approach: The Four Pillars

**PolyScript's approach appears to be entirely novel**:

1. **Behavioral Contracts** (not data or interface definitions)
   - Encodes **patterns of behavior** (CRUD × Modes matrix)
   - Defines **when** and **how** operations behave, not just signatures
   - Specifies **mode semantics** (simulate, sandbox, live)

2. **Compiled to Immutable Artifacts** (not text/XML)
   - **C/C++ headers** cannot be accidentally modified
   - **Compile-time validation** prevents specification drift
   - **Versioned binaries** ensure implementation consistency

3. **Universal C ABI** (not language-specific)
   - **Every language** can consume C interfaces
   - **Zero dependencies** - no runtime requirements
   - **Platform agnostic** - works across all operating systems

4. **Minimal CRUD × Modes** (not complex specifications)
   - **Four operations** - create, read, update, delete
   - **Three modes** - simulate, sandbox, live
   - **12 total behaviors** - simple yet comprehensive
   - **Domain rebadging** - friendly names without complexity

### The Behavioral IDL Innovation

```c
// Behavioral contract - not just interface signature
typedef struct {
    bool can_mutate;           // Behavioral property
    bool should_validate;      // Behavioral property  
    bool require_confirm;      // Behavioral property
} ModeRules;

// Compiled behavioral matrix - immutable and universal
static const ModeRules CRUD_MODE_BEHAVIORS[3][4] = {
    // Simulate mode behaviors for [Create, Read, Update, Delete]
    {{false, false, false}, {true, false, false}, {false, false, false}, {false, false, false}},
    // Sandbox mode behaviors  
    {{false, true, false}, {true, false, false}, {false, true, false}, {false, true, false}},
    // Live mode behaviors
    {{true, false, false}, {true, false, false}, {true, false, true}, {true, false, true}}
};
```

**This defines not just "what methods exist" but "how those methods behave" under different execution contexts.**

### Implications: A New Category of Software Architecture

**Compiled Behavioral Contract Libraries** represent a new approach to cross-language software architecture:

- **Specification as Code** - Behaviors defined in compilable artifacts
- **Universal Consumption** - Any language can implement the contracts
- **Behavioral Consistency** - Same patterns across all implementations  
- **Immutable Contracts** - Cannot drift from specification
- **Minimal Complexity** - Simple patterns, maximum coverage

This approach could extend beyond CLI tools to any domain where **behavioral consistency across languages** is more important than **interface flexibility**.

### Data-Code Separation

- **Behavioral Contracts are Compiled Data** - Immutable C structures encoding behavior patterns
- **Discovery is Runtime Data** - Tool capabilities exposed as JSON for introspection  
- **Business Logic is Code** - Tool implementations remain in native, idiomatic languages
- **Universal ABI is the Bridge** - C interface enables cross-language behavioral consistency

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