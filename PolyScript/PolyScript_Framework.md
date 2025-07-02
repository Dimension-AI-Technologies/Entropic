# PolyScript Framework: One Standard, Many Languages

## Background

### The Problem We Discovered

While working on MCP server management scripts, we encountered a recurring challenge:
- Different scripts in different languages (Python, PowerShell, F#, etc.)
- Each with different CLI interfaces and behaviors
- No consistency across tools
- Duplicated effort implementing common patterns

We noticed our scripts needed similar functionality:
- **Operations**: Create, Read, Update, Delete (CRUD)
- **Execution Modes**: 
  - `status` - Show current state
  - `test` - Simulate changes
  - `sandbox` - Test resources/connectivity
  - `live` - Actually execute changes

### Initial Investigation

We examined two existing scripts:
1. `setup_dev_environment.py` - Cross-platform tool installer with status/test/sandbox/live modes
2. `manage_claude_code_mcp_servers.py` - MCP server manager with various operations

Both implemented similar patterns differently, leading to the question: **Can we standardize this?**

## Solutions Explored

### 1. Python-Only Library
**Approach**: Create a base class that Python scripts inherit from
```python
class MyScript(BaseScript):
    def execute_status(self): ...
    def execute_test(self): ...
```
**Verdict**: Good for Python, but doesn't help PowerShell/F# scripts

### 2. Code Generation
**Approach**: Define scripts in YAML, generate code for each language
```yaml
name: manage_servers
operations: [add, remove, list]
targets: [python, powershell, fsharp]
```
**Verdict**: Complex to maintain, loses language-specific benefits

### 3. Protocol-Based Approach (Chosen)
**Approach**: Define behavioral contract, let each language implement it naturally
**Verdict**: ✅ This is how Terraform, Kubernetes, and NixOS work!

## The PolyScript Solution

### Core Concept

PolyScript is a **behavioral standard** for CLI tools that ensures consistency across languages while allowing each language to use its natural idioms.

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Declaration   │────▶│  PolyScript      │────▶│ Implementation  │
│  (YAML Spec)    │     │  Standard        │     │ (Any Language)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘

polyscript.yaml         CLI Convention         script.py/.ps1/.fsx
```

### The Standard

All PolyScript-compliant scripts MUST:

1. **Support Standard Modes**
   ```bash
   script --mode status    # Show current state (default)
   script --mode test      # Simulate changes
   script --mode sandbox   # Test resources
   script --mode live      # Execute changes
   ```

2. **Use Consistent Flags**
   - `--verbose/-v` - Detailed output
   - `--force/-f` - Skip confirmations
   - `--json` - JSON output for automation

3. **Return Standard Codes**
   - `0` - Success
   - `1` - Failure
   - JSON output on stdout when requested

4. **Implement Standard Operations** (as applicable)
   - Create/Add
   - Read/List
   - Update/Modify
   - Delete/Remove
   - Verify
   - Migrate

### Example Specification

```yaml
# polyscript.yaml
version: "1.0"
name: manage-servers
description: Manage MCP servers across scopes

modes:
  - status: Show current configuration
  - test: Simulate changes without applying
  - sandbox: Test server availability
  - live: Apply changes

operations:
  - name: add
    type: create
    args:
      servers: { type: list, required: true }
      scope: { type: string, choices: [machine, user, project] }
  
  - name: remove
    type: delete
    args:
      servers: { type: list, required: true }
      scope: { type: string, choices: [machine, user, project] }
  
  - name: list
    type: read
    args:
      scope: { type: string, required: false }

compliance:
  validate: polyscript validate {script}
  test: polyscript test {script} --spec {spec}
```

### Language Implementations

Each language implements the standard naturally:

**Python** (using Click):
```python
@click.command()
@click.option('--mode', type=click.Choice(['status', 'test', 'sandbox', 'live']), default='status')
@click.option('--verbose', '-v', is_flag=True)
def main(mode, verbose):
    # Implementation
```

**PowerShell**:
```powershell
param(
    [ValidateSet('status','test','sandbox','live')]
    [string]$Mode = 'status',
    [switch]$Verbose,
    [switch]$Force
)
```

**F#** (using Argu):
```fsharp
type Arguments =
    | [<AltCommandLine("-m")>] Mode of mode:ExecutionMode
    | [<AltCommandLine("-v")>] Verbose
    | [<AltCommandLine("-f")>] Force
```

### Validation Tools

```bash
# Validate any implementation
polyscript validate ./manage-servers.py
polyscript validate ./Manage-Servers.ps1
polyscript validate ./manage_servers.fsx
✓ All scripts comply with PolyScript v1.0

# Test behavior
polyscript test ./manage-servers.py --spec polyscript.yaml
✓ 12/12 behavioral tests passed

# Generate starter template
polyscript init --lang python --template crud > new_script.py
```

## Why This Works

### Industry Precedent

This approach is proven by major tools:
- **Terraform**: HCL → Provider Protocol → Providers (any language)
- **Kubernetes**: YAML → K8s API → Controllers (any language)
- **NixOS**: Nix → Derivations → Builders (any language)
- **GitHub Actions**: YAML → Runner Protocol → Actions (any language)

### Key Benefits

1. **Consistency Without Conformity**
   - Users get predictable behavior
   - Developers use language strengths

2. **Rapid Development**
   - Start from templates
   - Focus on business logic
   - Standard patterns built-in

3. **Quality Assurance**
   - Automated compliance testing
   - Behavioral validation
   - Cross-language test suites

4. **Future-Proof**
   - Add new languages anytime
   - Extend the standard as needed
   - Community can contribute

## Implementation Roadmap

### Phase 1: Foundation
- [x] Define PolyScript v1.0 standard
- [ ] Create validation tool
- [ ] Build test suite

### Phase 2: Templates
- [ ] Python template with Click
- [ ] PowerShell template
- [ ] F# template with Argu

### Phase 3: Migration
- [ ] Convert `manage_claude_code_mcp_servers.py`
- [ ] Convert `setup_dev_environment.py`
- [ ] Document patterns

### Phase 4: Ecosystem
- [ ] Package registry
- [ ] CI/CD integration
- [ ] IDE support

## Conclusion

PolyScript provides a practical solution to multi-language script standardization by:
- Following proven architectural patterns
- Respecting language idioms
- Ensuring consistent user experience
- Enabling rapid development

It's not about generating code or forcing conformity - it's about defining clear behavioral contracts that any language can implement naturally.

**PolyScript: One Standard, Many Languages**