# PolyScript Framework

> Zero-Boilerplate CLI Development Across Any Language

## What is PolyScript?

PolyScript is a data-driven framework that eliminates CLI boilerplate by abstracting language-specific implementation details. Developers write **only business logic** while the framework handles argument parsing, JSON output, error handling, and standardization.

## The Vision

**Abstract away language-specific CLI boilerplate to enable accelerated script development across any scripting language.**

Instead of writing hundreds of lines of CLI setup code, developers focus solely on the problem they're solving.

## Quick Example

The same backup tool in any language:

**Python** (3 lines):
```python
@polyscript_tool
class BackupTool:
    def status(self): return {"operational": True}
    def live(self): return {"backup_completed": True}
BackupTool.run()
```

**C#** (3 lines):
```csharp
[PolyScriptTool]
public class BackupTool : IPolyScriptTool {
    public object Status(PolyScriptContext ctx) => new { operational = true };
    public object Live(PolyScriptContext ctx) => new { backup_completed = true };
}
```

**All languages provide identical CLI**:
```bash
backup-tool status --json
backup-tool test --verbose  
backup-tool sandbox
backup-tool live --force
```

## Directory Structure

```
PolyScript/
├── design/                    # Complete design documentation
├── frameworks/               # Language-specific implementations
│   ├── python/              # Click-based framework
│   ├── csharp/              # Spectre.Console framework  
│   ├── fsharp/              # Argu-based framework
│   ├── rust/                # clap-based framework
│   ├── go/                  # cobra-based framework
│   ├── nodejs/              # yargs-based framework
│   └── ruby/                # thor-based framework
├── schema/                   # JSON schema and specifications
├── tools/                    # Validation and generation tools
├── examples/                 # Cross-language example implementations
└── archive/                  # Superseded documentation
```

## The Four Modes

Every PolyScript tool implements:

1. **`status`** - Show current state (read-only, default)
2. **`test`** - Simulate operations (dry-run)  
3. **`sandbox`** - Test dependencies and environment
4. **`live`** - Execute actual operations

## Framework Languages

✅ **7 Complete Frameworks**:
- **Python** (Click) - Decorator pattern, zero boilerplate
- **C#** (Spectre.Console) - Interface-based with attributes
- **F#** (Argu) - Functional with computation expressions  
- **Rust** (clap) - Trait implementation with derive macros
- **Go** (cobra) - Interface implementation with structs
- **Node.js** (yargs) - Class and functional approaches
- **Ruby** (thor) - Class inheritance with metaprogramming

## Getting Started

### 1. Choose Your Language
Browse `frameworks/<language>/` for your preferred language.

### 2. Copy the Framework
Each framework directory contains:
- Framework implementation
- Complete working example
- Usage documentation

### 3. Write Business Logic Only
```python
# frameworks/python/polyscript_click.py handles everything
@polyscript_tool  
class MyTool:
    def status(self): return {"ready": True}
    def test(self): return {"would_process": 100}
    def sandbox(self): return {"dependencies": "ok"}  
    def live(self): return {"processed": 100}
```

### 4. Get Full CLI for Free
```bash
my-tool status --json
my-tool test --verbose
my-tool sandbox
my-tool live --force
```

## Key Benefits

- **🚀 Zero Boilerplate** - Write only business logic
- **🔄 Language Freedom** - Same standard, any language
- **📊 Structured Output** - Consistent JSON for automation  
- **🛡️ Safety Built-in** - Test/sandbox modes prevent accidents
- **🎯 Small Team Focused** - Optimized for team productivity
- **🤖 AI-Ready** - Clear specification for code generation

## Documentation

### Design Documentation (`design/`)
- **[Vision.md](design/Vision.md)** - Core vision and principles
- **[Context.md](design/Context.md)** - Small team constraints and context
- **[Requirements.md](design/Requirements.md)** - Functional requirements
- **[Specification.md](design/Specification.md)** - Technical specification  
- **[Architecture.md](design/Architecture.md)** - Framework architecture
- **[Structure.md](design/Structure.md)** - Directory organization

### Validation Tools (`tools/`)
- **[polyscript_validator.py](tools/polyscript_validator.py)** - Compliance testing
- **[polyscript_generator.py](tools/polyscript_generator.py)** - Code generation

### Examples (`examples/`)
- **[backup_tool/](examples/backup_tool/)** - Same tool in all 7 languages

## Standard JSON Output

All tools produce PolyScript v1.0 compliant JSON:

```json
{
  "polyscript": "1.0",
  "mode": "status", 
  "tool": "BackupTool",
  "status": "success",
  "data": {
    "operational": true,
    "files_ready": 1234
  }
}
```

## Philosophy

**Data-Driven Design**: PolyScript is a behavioral standard with language-native instantiations. Each framework uses the best CLI library for that language while maintaining consistency.

**Zero Compromise**: Frameworks don't sacrifice language idioms for uniformity. Python uses decorators, C# uses interfaces, Rust uses traits - each optimally.

**Small Team Productivity**: Designed for teams that need to ship working tools quickly without wrestling with CLI boilerplate.

## Contributing

We welcome:
- Framework improvements
- New language implementations  
- Example tool implementations
- Documentation enhancements
- Validation tool improvements

## License

PolyScript is an open standard for accelerated CLI development.

---

**PolyScript: Write the logic. We'll handle the rest.**