# PolyScript Frameworks Collection

A collection of true zero-boilerplate frameworks for creating PolyScript-compliant CLI tools across multiple programming languages.

**Author:** Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>

## Overview

PolyScript was originally conceived as just a documentation standard, but this collection provides **actual working frameworks** that eliminate boilerplate and let developers write only business logic.

Each framework provides:
- **Zero boilerplate** - developers write ONLY business logic
- **Automatic CLI generation** using the best CLI library for each language
- **Four standardized modes**: status, test, sandbox, live
- **Standard flags**: --json, --verbose, --force
- **PolyScript v1.0 JSON output** format compliance
- **Error handling and exit codes**
- **Help text generation**
- **Confirmation prompts**

## Available Frameworks

### 1. Python Framework (Click-based)
**File:** `polyscript_click.py`
**CLI Library:** Click
**Example:** `backup_tool_example.py`

```python
@polyscript_tool
class BackupTool:
    def add_arguments(self, cmd):
        cmd.argument('source', help='Source directory')
        cmd.argument('dest', help='Destination directory')
    
    def status(self): return {"operational": True}
    def test(self): return {"would_backup": ["file1", "file2"]}
    def sandbox(self): return {"environment": "ok"}
    def live(self): return {"backup_completed": True}

BackupTool.run()
```

**Installation:**
```bash
pip install click
python backup_tool.py status --json
```

### 2. C# Framework (Spectre.Console-based)
**File:** `PolyScript.Framework.cs`
**CLI Library:** Spectre.Console
**Example:** `BackupTool.Example.cs`

```csharp
[PolyScriptTool]
public class BackupTool : IPolyScriptTool
{
    public string Description => "Backup tool with zero boilerplate";
    
    public object Status(PolyScriptContext context) => new { operational = true };
    public object Test(PolyScriptContext context) => new { would_backup = new[] {"file1", "file2"} };
    public object Sandbox(PolyScriptContext context) => new { environment = "ok" };
    public object Live(PolyScriptContext context) => new { backup_completed = true };
}

// Program.cs
PolyScriptFramework.Run<BackupTool>(args);
```

**Installation:**
```bash
dotnet add package Spectre.Console
dotnet run status --json
```

### 3. F# Framework (Argu-based)
**File:** `PolyScript.Framework.fs`
**CLI Library:** Argu
**Example:** `BackupTool.Example.fs`

**Object-Oriented Approach:**
```fsharp
type BackupTool() =
    interface IPolyScriptTool with
        member _.Description = "F# backup tool with zero boilerplate"
        member _.Status(context) = {| operational = true |}
        member _.Test(context) = {| would_backup = [| "file1"; "file2" |] |}
        member _.Sandbox(context) = {| environment = "ok" |}
        member _.Live(context) = {| backup_completed = true |}

[<EntryPoint>]
let main args = runPolyScriptTool<BackupTool> args
```

**Functional Approach:**
```fsharp
let backupTool = PolyScriptTool.create
    "Simple backup tool"
    (fun ctx -> {| operational = true |})     // Status
    (fun ctx -> {| would_backup = ["file1"] |}) // Test
    (fun ctx -> {| environment = "ok" |})     // Sandbox
    (fun ctx -> {| completed = true |})       // Live

[<EntryPoint>]
let main args = PolyScriptTool.run backupTool args
```

**Installation:**
```bash
dotnet add package Argu
dotnet run status --json
```

### 4. Rust Framework (clap-based)
**File:** `polyscript_framework.rs`
**CLI Library:** clap
**Example:** `backup_tool_example.rs`

**Trait Implementation:**
```rust
impl PolyScriptTool for BackupTool {
    fn description(&self) -> &str { "Rust backup tool with zero boilerplate" }
    fn status(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
        Ok(Some(json!({"operational": true})))
    }
    fn test(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
        Ok(Some(json!({"would_backup": ["file1", "file2"]})))
    }
    fn sandbox(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
        Ok(Some(json!({"environment": "ok"})))
    }
    fn live(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
        Ok(Some(json!({"backup_completed": true})))
    }
}

fn main() {
    let exit_code = run_polyscript_tool(BackupTool::new());
    std::process::exit(exit_code);
}
```

**Macro Approach:**
```rust
polyscript_tool! {
    name: SimpleBackupTool,
    description: "Simple backup with macro",
    status: |context| Ok(Some(json!({"operational": true}))),
    test: |context| Ok(Some(json!({"would_backup": ["file1"]}))),
    sandbox: |context| Ok(Some(json!({"environment": "ok"}))),
    live: |context| Ok(Some(json!({"completed": true})))
}

fn main() {
    let exit_code = run_polyscript_tool(SimpleBackupTool);
    std::process::exit(exit_code);
}
```

**Installation:**
```toml
# Cargo.toml
[dependencies]
clap = { version = "4.4", features = ["derive"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

```bash
cargo run status --json
```

## Framework Comparison

| Language | CLI Library | Strengths | Use Cases |
|----------|-------------|-----------|-----------|
| **Python** | Click | Fastest development, rich ecosystem | Scripting, automation, data processing |
| **C#** | Spectre.Console | Rich console output, .NET ecosystem | Enterprise tools, Windows environments |
| **F#** | Argu | Functional programming, type safety | Mathematical tools, data analysis |
| **Rust** | clap | Performance, memory safety | System tools, performance-critical apps |

## Standard PolyScript Commands

All frameworks support the same command structure:

```bash
# Status mode (default)
tool status
tool status --json
tool status --verbose

# Test mode (dry-run)
tool test
tool test --json --verbose

# Sandbox mode (dependency checking)
tool sandbox
tool sandbox --json

# Live mode (actual execution)
tool live
tool live --force --verbose
```

## JSON Output Format

All frameworks produce PolyScript v1.0 compliant JSON:

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

## Why These Frameworks Matter

### Before: Manual PolyScript Implementation
- 400+ lines of boilerplate per tool
- Manual argument parsing
- Manual mode routing
- Manual JSON output formatting
- Manual error handling
- Inconsistent implementations

### After: Framework-Based Implementation
- 20-50 lines of pure business logic
- Automatic CLI generation
- Automatic mode routing  
- Automatic JSON formatting
- Automatic error handling
- Consistent behavior across all tools

## Example: Complete Backup Tool Comparison

### Manual Implementation (400+ lines)
```python
#!/usr/bin/env python3
import argparse
import json
import sys
# ... 350+ more lines of boilerplate ...

class BackupTool:
    def __init__(self):
        self.args = None
        self.logger = None
        # ... manual setup ...
    
    def setup_parser(self):
        # ... 50+ lines of argparse setup ...
    
    def run(self):
        # ... 100+ lines of mode routing ...
    
    def output(self, data):
        # ... 50+ lines of output handling ...
    
    # Finally, the actual business logic:
    def execute_status(self):
        return {"operational": True}  # 1 line of actual work!
```

### Framework Implementation (5 lines)
```python
@polyscript_tool
class BackupTool:
    def status(self): return {"operational": True}
    def test(self): return {"would_backup": ["file1"]}
    def sandbox(self): return {"environment": "ok"}
    def live(self): return {"backup_completed": True}

BackupTool.run()
```

## Getting Started

1. **Choose your language** based on your requirements
2. **Install dependencies** for the CLI library
3. **Copy the framework file** to your project
4. **Implement the four methods** with your business logic
5. **Run your tool** - everything else is automatic!

## Framework Architecture

Each framework follows the same pattern:

1. **Decorator/Attribute** marks the tool class
2. **CLI Library Integration** generates commands automatically  
3. **Mode Routing** calls appropriate methods based on subcommand
4. **Context Object** provides logging, output, and confirmation methods
5. **JSON Formatting** automatically structures output for PolyScript v1.0
6. **Error Handling** catches exceptions and formats them appropriately

## Future Enhancements

Potential additions to the frameworks:
- Configuration file support
- Plugin systems
- Async/await support where applicable
- Interactive prompts and wizards
- Progress bars and status indicators
- Shell completion generation
- Man page generation

## Contributing

These frameworks demonstrate that PolyScript can be more than just a specification - it can be a practical development tool that actually reduces developer effort.

Each framework is designed to be:
- **Self-contained** - no external dependencies beyond the CLI library
- **Extensible** - easy to add new features
- **Consistent** - same patterns across all languages
- **Production-ready** - proper error handling and edge cases

---

**The key insight:** PolyScript should be a development framework, not a documentation standard. These implementations prove that zero-boilerplate CLI development is achievable across multiple languages while maintaining consistent behavior and output formats.