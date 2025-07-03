# PolyScript Framework

> Zero-Boilerplate CLI Development: Write CRUD Once, Get 12 Behaviors Free

## What is PolyScript?

PolyScript is a framework that eliminates CLI boilerplate through **CRUD Operations × Modal Execution**. Write four methods (Create, Read, Update, Delete), and the framework automatically provides 12 different behaviors through three execution modes (simulate, sandbox, live).

## The Vision

**Abstract away language-specific CLI boilerplate to enable accelerated script development across any scripting language through standardized CRUD operations with modal execution.**

Instead of writing hundreds of lines of CLI setup code, developers implement only CRUD business logic - the framework handles the rest.

## Quick Example

Write CRUD operations once, get 12 behaviors automatically:

**Python** (< 10 lines):
```python
@polyscript_tool
class BackupTool:
    def create(self, resource, options, context):
        return {"created": f"backup-{resource}"}
    
    def read(self, resource, options, context):
        return {"status": "ready", "size": "1.2GB"}
    
    def update(self, resource, options, context):
        return {"updated": resource, "timestamp": "2024-01-01"}
    
    def delete(self, resource, options, context):
        return {"deleted": resource}
```

**C#** (< 10 lines):
```csharp
[PolyScriptTool]
public class BackupTool : IPolyScriptTool {
    public object Create(string resource, Options opt, Context ctx) 
        => new { created = $"backup-{resource}" };
    
    public object Read(string resource, Options opt, Context ctx)
        => new { status = "ready", size = "1.2GB" };
    
    public object Update(string resource, Options opt, Context ctx)
        => new { updated = resource, timestamp = "2024-01-01" };
    
    public object Delete(string resource, Options opt, Context ctx)
        => new { deleted = resource };
}
```

**Get 12 CLI behaviors for free**:
```bash
# Create operations × 3 modes
backup-tool create daily --mode simulate  # Would create
backup-tool create daily --mode sandbox   # Test creation
backup-tool create daily                  # Actually create

# Read operations (safe by default)
backup-tool read daily                    # Show backup info
backup-tool list                          # List all backups

# Update operations × 3 modes  
backup-tool update daily --size 2GB --mode simulate
backup-tool update daily --size 2GB --mode sandbox
backup-tool update daily --size 2GB

# Delete operations × 3 modes
backup-tool delete daily --mode simulate  # Would delete
backup-tool delete daily --mode sandbox   # Test deletion
backup-tool delete daily --force          # Actually delete
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
│   ├── ruby/                # thor-based framework
│   ├── haskell/             # optparse-applicative framework
│   └── experimental/        # PowerShell framework (experimental)
├── schema/                   # JSON schema and specifications
├── tools/                    # Validation and generation tools
├── examples/                 # Cross-language example implementations
└── archive/                  # Superseded documentation
```

## The CRUD × Modes Matrix

Write 4 operations, get 12 behaviors:

### CRUD Operations (You Write These)
1. **`create`** - Add new resources
2. **`read`** - Query existing resources  
3. **`update`** - Modify resources
4. **`delete`** - Remove resources

### Execution Modes (Framework Provides These)
1. **`simulate`** - Show what would happen (dry-run)
2. **`sandbox`** - Test prerequisites and validation
3. **`live`** - Execute actual operations (default)

### The Magic: 4 × 3 = 12
```
         | Simulate | Sandbox | Live
---------|----------|---------|------
Create   |    ✓     |    ✓    |  ✓
Read     |    -     |    ✓    |  ✓
Update   |    ✓     |    ✓    |  ✓  
Delete   |    ✓     |    ✓    |  ✓
```

## Framework Languages

✅ **9 Comprehensive Frameworks** (all complete):

### Production Ready
- **Python** (Click) - General scripting, massive ecosystem
- **C#** (Spectre.Console) - Enterprise Windows/.NET development
- **F#** (Argu) - Functional-first .NET programming  
- **Rust** (clap) - Systems programming with memory safety
- **Go** (cobra) - DevOps tooling, single binaries
- **Node.js** (yargs) - JavaScript ecosystem, web developers
- **Ruby** (thor) - Elegant scripting, Rails culture
- **Haskell** (optparse-applicative) - Pure functional programming

### Experimental
- **PowerShell** - Windows administration, cross-platform automation

## Why These 9 Languages?

Our framework selection provides **complete coverage** without redundancy:

### ✅ **All Major Paradigms**
- **Imperative**: Python, PowerShell, Ruby
- **Object-Oriented**: C#, Ruby, Python  
- **Functional-First**: F#
- **Pure Functional**: Haskell
- **Systems**: Rust, Go

### ✅ **All Major Ecosystems**
- **Python**: PyPI, data science, automation
- **npm**: Node.js, web development
- **.NET**: C#/F#, enterprise
- **Cargo**: Rust, systems programming
- **Go modules**: Cloud native, DevOps
- **RubyGems**: Ruby, web applications
- **Native**: Compiled binaries (Rust, Go, Haskell)

### ✅ **All Major Use Cases**
- **General Scripting**: Python, Ruby, PowerShell
- **Enterprise**: C#, F#, PowerShell
- **Systems/Performance**: Rust, Go  
- **DevOps/Cloud**: Go, Ruby, Python
- **Web Developers**: Node.js, Ruby
- **Windows Admin**: PowerShell, C#
- **Academic/Research**: Haskell, Python

### ✅ **Manageable Scope**
- **9 frameworks** is comprehensive yet maintainable
- Each fills a specific niche without duplication
- Small teams can choose their preferred language
- Maintenance burden remains reasonable

**Beyond 9 is diminishing returns** - additional languages would duplicate existing capabilities rather than fill gaps. This selection covers 95%+ of real-world CLI development needs.

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
    def create(self, resource, options, context):
        # Just implement creation logic
        return {"created": resource}
    
    def read(self, resource, options, context):
        # Just implement read logic
        return {"data": "..."}
    
    def update(self, resource, options, context):
        # Just implement update logic
        return {"updated": resource}
    
    def delete(self, resource, options, context):
        # Just implement deletion logic
        return {"deleted": resource}
```

### 4. Get Full CLI for Free
```bash
# 12 different behaviors from 4 methods
my-tool create item --mode simulate    # Dry-run
my-tool create item --mode sandbox     # Validate
my-tool create item                    # Execute

my-tool read item                      # Query
my-tool list                           # List all

my-tool update item --key value        # Modify
my-tool delete item --force            # Remove
```

## Key Benefits

- **🚀 Zero Boilerplate** - Write only CRUD business logic
- **✖️ Force Multiplier** - 4 methods → 12 behaviors automatically
- **🔄 Language Freedom** - Same standard, any language
- **📊 Structured Output** - Consistent JSON for automation  
- **🛡️ Safety Built-in** - Simulate/sandbox modes prevent accidents
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
- **[backup_tool/](examples/backup_tool/)** - Same tool in all 9 languages

## Standard JSON Output

All tools produce PolyScript v1.0 compliant JSON:

```json
{
  "polyscript": "1.0",
  "operation": "create",
  "mode": "simulate", 
  "tool": "BackupTool",
  "status": "success",
  "data": {
    "created": "backup-daily"
  },
  "messages": ["Would create backup-daily"]
}
```

## Philosophy

**CRUD × Modes Architecture**: The power of PolyScript comes from the multiplication effect - implement 4 CRUD operations, get 12 different behaviors through modal execution. This creates maximum functionality from minimal code.

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

**PolyScript: Write CRUD once. Get 12 behaviors free.**