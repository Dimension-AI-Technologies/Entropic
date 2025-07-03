# Start Here - PolyScript Framework

**Welcome to PolyScript - Zero-Boilerplate CLI Development**

If you're new to PolyScript, this is your starting point. This guide will get you up and running quickly.

## What is PolyScript?

PolyScript eliminates CLI boilerplate through **CRUD Operations × Modal Execution**. Write four methods (Create, Read, Update, Delete), and the framework automatically provides 12 different behaviors through three execution modes (simulate, sandbox, live).

**Traditional CLI Tool** (100+ lines):
```python
# Lots of argparse setup, error handling, JSON formatting...
parser = argparse.ArgumentParser()
subparsers = parser.add_subparsers()
create_parser = subparsers.add_parser('create')
create_parser.add_argument('--mode', choices=['simulate', 'sandbox', 'live'])
# ... 50+ more lines of boilerplate for each CRUD operation
```

**PolyScript Tool** (10 lines):
```python
@polyscript_tool
class BackupTool:
    def create(self, resource, options, context):
        return {"created": f"backup-{resource}"}
    def read(self, resource, options, context):
        return {"status": "ready", "size": "1.2GB"}
    def update(self, resource, options, context):
        return {"updated": resource}
    def delete(self, resource, options, context):
        return {"deleted": resource}

BackupTool.run()
```

Both provide identical CLI interfaces with 12 behaviors, but PolyScript handles everything automatically.

## Quick Start

### Step 1: Choose Your Language

Pick from our 9 comprehensive frameworks:

**Production Ready:**
- **[Python](frameworks/python/)** - General scripting, huge ecosystem
- **[C#](frameworks/csharp/)** - Enterprise Windows/.NET development
- **[F#](frameworks/fsharp/)** - Functional-first .NET programming
- **[Rust](frameworks/rust/)** - Systems programming, memory safety
- **[Go](frameworks/go/)** - DevOps tools, single binaries
- **[Node.js](frameworks/nodejs/)** - JavaScript ecosystem, web developers
- **[Ruby](frameworks/ruby/)** - Elegant scripting, Rails culture
- **[Haskell](frameworks/haskell/)** - Pure functional, type-safe programming

**Experimental:**
- **[PowerShell](frameworks/experimental/)** - Windows admin, cross-platform automation

**Why these 9?** Complete coverage of all paradigms, ecosystems, and use cases without redundancy.

### Step 2: Copy the Framework

```bash
# Example for Python - adjust for your language
cd my-project/
cp /path/to/PolyScript/frameworks/python/polyscript_click.py ./
cp /path/to/PolyScript/frameworks/python/backup_tool_example.py ./my_tool.py
```

### Step 3: Customize Your Tool

Edit `my_tool.py` and replace the backup logic with your tool's logic:

```python
@polyscript_tool
class MyTool:
    def create(self, resource, options, context):
        # Create new resources
        context.log(f"Creating {resource}...")
        return {"created": resource, "id": "12345"}
    
    def read(self, resource, options, context):
        # Query existing resources
        return {"resource": resource, "status": "active"}
    
    def update(self, resource, options, context):
        # Modify resources
        context.log(f"Updating {resource}...")
        return {"updated": resource, "changes": options}
    
    def delete(self, resource, options, context):
        # Remove resources
        context.log(f"Deleting {resource}...")
        return {"deleted": resource}
```

### Step 4: Run Your Tool

```bash
# Your tool now has 12 different behaviors from 4 methods
python my_tool.py create item --mode simulate  # Would create
python my_tool.py create item --mode sandbox   # Test creation
python my_tool.py create item                  # Actually create

python my_tool.py read item                    # Query item
python my_tool.py list                         # List all items

python my_tool.py update item --key value      # Modify item
python my_tool.py delete item --force          # Remove item
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

## Standard Flags

All PolyScript tools support:
- **`--mode`** - Execution mode (simulate, sandbox, live)
- **`--json`** - Machine-readable output for automation
- **`--verbose`** - Detailed logging and debug info
- **`--force`** - Skip confirmation prompts

## What Happens Automatically

PolyScript frameworks handle:
- ✅ Command-line argument parsing
- ✅ Help text generation
- ✅ JSON output formatting
- ✅ Error handling and exit codes
- ✅ Confirmation prompts
- ✅ Verbose logging
- ✅ Input validation

You focus on **your tool's unique functionality**.

## Next Steps

### New Users
1. **[User Guide](UserGuide.md)** - Complete user documentation
2. **[Examples](examples/)** - See the backup tool in all 9 languages

### Developers  
1. **[Technical Guide](TechnicalGuide.md)** - Framework internals and specifications
2. **[Developer Guide](DeveloperGuide.md)** - Contributing and extending frameworks

### Specific Use Cases
- **Automation scripts** → Use `--json` flag for structured output
- **DevOps tools** → Go or Rust for single binaries
- **System administration** → Python for extensive libraries
- **Enterprise tools** → C# for Windows/corporate environments

## Key Benefits Recap

🚀 **Zero Boilerplate** - Write only business logic  
🔄 **Language Freedom** - Same standard, any language  
📊 **Structured Output** - Consistent JSON for automation  
🛡️ **Safety Built-in** - Test modes prevent accidents  
🎯 **Small Team Focused** - Maximum productivity  
🤖 **AI-Ready** - Clear specification for code generation  

## Getting Help

- **Questions?** Check the [User Guide](UserGuide.md)
- **Technical details?** See [Technical Guide](TechnicalGuide.md)  
- **Want to contribute?** Read [Developer Guide](DeveloperGuide.md)
- **Examples needed?** Browse [examples/](examples/)

---

**Ready to eliminate CLI boilerplate forever?** Pick your language and start building! 🚀