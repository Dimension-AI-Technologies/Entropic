# Cross-Language CLI Framework Exploration

## The Challenge

Creating a unified CLI pattern across:
- Python
- PowerShell
- F# Interactive (FSI)
- C# Interactive (CSI)
- Bash/Shell
- JavaScript/Node.js

## Possible Approaches

### 1. Meta-Language/DSL Approach (Code Generation)

Define your script in a meta-language that generates code for each target:

```yaml
# script_definition.yaml
name: manage_servers
description: Manage MCP servers
modes: [status, test, sandbox, live]
operations:
  - name: add
    type: create
    arguments:
      - name: servers
        type: list
        required: true
  - name: remove
    type: delete
    arguments:
      - name: servers
        type: list
        required: true
  - name: list
    type: read

targets:
  - python
  - powershell
  - fsharp
```

Then generate:
```bash
cli-gen generate script_definition.yaml --target python > manage_servers.py
cli-gen generate script_definition.yaml --target powershell > Manage-Servers.ps1
```

**Pros:**
- True write-once, deploy everywhere
- Consistent behavior guaranteed
- Central definition

**Cons:**
- Complex generator needed
- Limited flexibility
- Debugging generated code is harder

### 2. Polyglot Library Approach

Create minimal, language-specific libraries that implement the same interface:

```python
# Python: cli_framework.py
from cli_framework import BaseScript, Mode

class ServerManager(BaseScript):
    def execute_status(self): pass
    def execute_test(self): pass
```

```powershell
# PowerShell: CliFramework.psm1
Import-Module CliFramework

class ServerManager : BaseScript {
    [void] ExecuteStatus() { }
    [void] ExecuteTest() { }
}
```

```fsharp
// F#: CliFramework.fsx
#load "CliFramework.fsx"
open CliFramework

type ServerManager() =
    inherit BaseScript()
    override _.ExecuteStatus() = ()
    override _.ExecuteTest() = ()
```

### 3. Protocol-Based Approach

Define a protocol/contract that each language implements:

```json
{
  "cli_protocol": "1.0",
  "script": {
    "name": "manage_servers",
    "modes": ["status", "test", "sandbox", "live"],
    "operations": ["add", "remove", "list"]
  },
  "execution": {
    "mode": "test",
    "operation": "add",
    "args": {"servers": ["linear", "context7"]}
  }
}
```

Each language reads this and executes accordingly.

### 4. Container/Wrapper Approach

Use a universal runner that wraps language-specific scripts:

```bash
# Universal CLI runner
cli-runner --mode test --lang python manage_servers.py add linear
cli-runner --mode test --lang powershell Manage-Servers.ps1 add linear
cli-runner --mode test --lang fsharp manage_servers.fsx add linear
```

The runner handles:
- Common argument parsing
- Mode management
- Logging/output formatting
- Calling the underlying script

### 5. Existing Tools That Come Close

#### **Make/Just/Task Runners**
```makefile
# Justfile or Makefile
MODE := "status"

python-add:
    python manage_servers.py --mode {{MODE}} --add {{SERVERS}}

powershell-add:
    pwsh -File Manage-Servers.ps1 -Mode {{MODE}} -Add {{SERVERS}}

fsharp-add:
    dotnet fsi manage_servers.fsx -- --mode {{MODE}} --add {{SERVERS}}
```

#### **Nix/Guix** (Functional Package Managers)
Can define consistent environments and interfaces across languages.

#### **WASM Component Model**
Emerging standard for language-agnostic components:
```rust
// Any language compiles to WASM component
export function execute(mode: Mode, operation: Operation) -> Result
```

## Practical Recommendation: Hybrid Approach

### 1. Shared Specification
```yaml
# cli_spec.yaml
version: 1.0
modes:
  - name: status
    description: Show current state
  - name: test
    description: Simulate changes
  - name: sandbox
    description: Test resources
  - name: live
    description: Execute changes

standard_flags:
  - name: verbose
    short: v
    type: bool
  - name: force
    short: f
    type: bool
```

### 2. Language-Specific Templates
```python
# template.py
SPEC = load_yaml('cli_spec.yaml')

def create_parser():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mode', choices=[m['name'] for m in SPEC['modes']])
    # Auto-generate from spec
```

### 3. Shared Testing Framework
```bash
# Test any implementation
cli-test ./manage_servers.py --lang python
cli-test ./Manage-Servers.ps1 --lang powershell
```

## Is This Over-Extending?

**Not really!** Several major projects use exactly this approach:

1. **GitHub Actions** - YAML defines workflows, runs in any language
2. **Terraform/HCP** - HCL (HashiCorp Configuration Language) defines desired state, providers implement in any language
3. **NixOS** - Nix expressions define system configuration, builders can be any language
4. **gRPC** - Protocol definitions generate code for any language
5. **OpenAPI** - API specs generate clients/servers in any language
6. **Kubernetes** - YAML/JSON manifests, controllers in any language
7. **Ansible** - YAML playbooks, modules in any language

## How HCP/Terraform and NixOS Actually Work

### HashiCorp's Approach (Terraform/HCP)

**Declarative Configuration + Plugins**:
```hcl
# Terraform HCL - declares WHAT you want
resource "aws_instance" "web" {
  instance_type = "t2.micro"
}
```

**Provider Plugin** (can be written in any language, uses gRPC):
```go
// AWS provider implements HOW to create it
func resourceAwsInstanceCreate(d *schema.ResourceData, meta interface{}) error {
    // Actually creates the EC2 instance
}
```

Key insight: **Separation of declaration from implementation**

### NixOS's Approach

**Functional Declarations + Derivations**:
```nix
# Nix expression - pure functional declaration
{ pkgs, ... }:
{
  environment.systemPackages = with pkgs; [
    python3
    nodejs
  ];
}
```

**Builders** (can be bash, python, any executable):
```bash
# Builder script that actually installs
source $stdenv/setup
python setup.py install
```

Key insight: **Reproducible builds through pure functions**

### The Common Pattern

All these systems use the same architecture:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Declaration   │────▶│    Protocol/     │────▶│ Implementation  │
│  (Lang Neutral) │     │    Interface     │     │ (Any Language)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
     YAML/HCL/Nix          gRPC/JSON/CLI          Python/Go/Rust/C
```

## Simple Starting Point

Create a convention and simple tooling:

### 1. Convention Document
```markdown
# CLI Convention v1.0

All scripts MUST:
1. Support --mode [status|test|sandbox|live]
2. Default to 'status' mode
3. Support --verbose and --force
4. Return 0 on success, 1 on failure
5. Output JSON with --json flag

Examples provided for each language...
```

### 2. Validation Tool
```python
# validate_cli.py
def validate_script(script_path, language):
    """Test if script follows convention"""
    
    # Test mode support
    for mode in ['status', 'test', 'sandbox', 'live']:
        result = run_script(script_path, ['--mode', mode, '--json'])
        assert result.returncode in [0, 1]
        assert is_valid_json(result.stdout)
```

### 3. Documentation Generator
```python
# generate_docs.py
def extract_cli_info(script_path, language):
    """Extract CLI info in standard format"""
    
    # Run with --help
    help_output = run_script(script_path, ['--help'])
    
    # Parse and generate markdown
    return generate_markdown(help_output)
```

## Conclusion

A full meta-language approach is possible but might be overkill. Instead:

1. **Start with conventions** - Document expected behavior
2. **Create minimal tooling** - Validators, test suites
3. **Build language-specific libraries** - That follow the convention
4. **Consider code generation** - Only if manually maintaining becomes painful

The key insight: **Standardize behavior, not implementation**. Let each language use its idioms while conforming to a common interface.