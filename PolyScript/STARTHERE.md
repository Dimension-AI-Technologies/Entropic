# Start Here - PolyScript Framework

**Welcome to PolyScript - Zero-Boilerplate CLI Development**

If you're new to PolyScript, this is your starting point. This guide will get you up and running quickly.

## What is PolyScript?

PolyScript eliminates CLI boilerplate. Instead of writing hundreds of lines of argument parsing, error handling, and output formatting, you write **only business logic**.

**Traditional CLI Tool** (100+ lines):
```python
# Lots of argparse setup, error handling, JSON formatting...
parser = argparse.ArgumentParser()
parser.add_argument("--mode", choices=["status", "test", "live"])
# ... 50+ more lines of boilerplate
```

**PolyScript Tool** (3 lines):
```python
@polyscript_tool
class BackupTool:
    def status(self): return {"operational": True}
    def live(self): return {"backup_completed": True}
BackupTool.run()
```

Both provide identical CLI interfaces, but PolyScript handles everything automatically.

## Quick Start

### Step 1: Choose Your Language

Pick from our 9 comprehensive frameworks (7 ready, 2 coming):

**Production Ready:**
- **[Python](frameworks/python/)** - General scripting, huge ecosystem
- **[C#](frameworks/csharp/)** - Enterprise Windows/.NET development
- **[Go](frameworks/go/)** - DevOps tools, single binaries
- **[Node.js](frameworks/nodejs/)** - JavaScript ecosystem, web developers
- **[Rust](frameworks/rust/)** - Systems programming, memory safety
- **[F#](frameworks/fsharp/)** - Functional-first .NET programming
- **[Ruby](frameworks/ruby/)** - Elegant scripting, Rails culture

**Coming Soon:**
- **[PowerShell](frameworks/powershell/)** - Windows admin, cross-platform automation
- **[Haskell](frameworks/haskell/)** - Pure functional, type-safe programming

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
    def status(self):
        # Show current state - always safe, read-only
        return {"ready": True, "version": "1.0.0"}
    
    def test(self):
        # Simulate operations - no changes made
        return {"would_process": ["file1", "file2"], "items_to_process": 2}
    
    def sandbox(self):
        # Test dependencies and environment
        return {"dependencies": "ok", "permissions": "ok"}
    
    def live(self):
        # Actually do the work
        return {"processed": 100, "status": "completed"}
```

### Step 4: Run Your Tool

```bash
# Your tool now has a complete CLI interface
python my_tool.py status          # Show current state
python my_tool.py test --verbose  # Simulate operations
python my_tool.py sandbox --json  # Test environment
python my_tool.py live --force    # Execute operations
```

## The Four Modes

Every PolyScript tool has exactly four modes:

| Mode | Purpose | When to Use |
|------|---------|-------------|
| **`status`** | Show current state | Default mode, always safe |
| **`test`** | Simulate operations | Before running `live` mode |
| **`sandbox`** | Test environment | Check if tool will work |
| **`live`** | Execute operations | When you want actual changes |

## Standard Flags

All PolyScript tools support:
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
2. **[Examples](examples/)** - See the backup tool in all 7 languages

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