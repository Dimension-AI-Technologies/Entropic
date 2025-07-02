# PolyScript Framework

> One Standard, Many Languages - A behavioral standard for CLI tools

## What is PolyScript?

PolyScript is a behavioral standard that brings consistency to command-line tools across different programming languages. Instead of forcing a specific implementation, it defines what tools should do, allowing each language to implement the behavior naturally.

## Quick Example

A PolyScript-compliant tool works the same way regardless of language:

```bash
# Show current state (safe, read-only)
./tool --mode status

# Test what would happen (no changes made)
./tool --mode test --add server1

# Verify dependencies work
./tool --mode sandbox

# Actually make changes
./tool --mode live --add server1 --force
```

## Key Benefits

- **Consistent User Experience**: Same interface patterns across all tools
- **Language Freedom**: Use Python, PowerShell, F#, or any language
- **Safety Built-in**: Test and sandbox modes prevent accidents
- **Future-proof**: Ready for AI-generated implementations

## Documentation

- **[Design Document](POLYSCRIPT_DESIGN.md)**: Understanding the what and why
- **[Implementation Guide](POLYSCRIPT_IMPLEMENTATION.md)**: Practical how-to guide
- **[Original Framework Document](PolyScript_Framework.md)**: Initial complete specification

## Tools

- **[Validator](polyscript_validator.py)**: Test if your script is compliant
- **[Example Implementation](example_polyscript_compliant.py)**: Reference implementation

## The Standard (Summary)

PolyScript-compliant tools must:

1. **Support Four Modes**:
   - `status` - Show current state (default)
   - `test` - Simulate changes
   - `sandbox` - Test dependencies
   - `live` - Execute changes

2. **Use Standard Flags**:
   - `--verbose/-v` - Detailed output
   - `--force/-f` - Skip confirmations  
   - `--json` - JSON output

3. **Return Standard Exit Codes**:
   - `0` - Success
   - `1` - Failure

## Quick Start

### For Tool Users

Just remember the modes:
- Default (or `--mode status`) is always safe
- Use `--mode test` before `--mode live`
- Add `--json` for scripting
- Add `--verbose` for debugging

### For Tool Developers

1. Read the [Implementation Guide](POLYSCRIPT_IMPLEMENTATION.md)
2. Start from a template for your language
3. Run the validator to check compliance
4. Focus on your tool's unique functionality

## Example Implementations

### Python (Minimal)
```python
#!/usr/bin/env python3
import argparse
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--mode", choices=["status", "test", "sandbox", "live"], default="status")
parser.add_argument("--verbose", "-v", action="store_true")
parser.add_argument("--force", "-f", action="store_true")
parser.add_argument("--json", action="store_true")
args = parser.parse_args()

# Your mode-specific logic here
if args.mode == "status":
    print("System operational")
# ... etc

sys.exit(0)  # or 1 on failure
```

### PowerShell (Minimal)
```powershell
param(
    [ValidateSet('status','test','sandbox','live')]
    [string]$Mode = 'status',
    [switch]$Verbose,
    [switch]$Force,
    [switch]$Json
)

switch ($Mode) {
    'status' { "System operational" }
    # ... etc
}
```

## Philosophy

PolyScript embraces:
- **Behavioral contracts** over code uniformity
- **Language idioms** over forced patterns
- **Practical standards** over theoretical purity
- **User experience** over developer convenience

## Contributing

We welcome:
- Language-specific templates
- Example implementations
- Validator improvements
- Documentation enhancements

## Future Vision

As LLMs become more prevalent in code generation, PolyScript provides the behavioral specification they need:

```
User: Generate a PolyScript-compliant tool in Python that manages Docker containers
AI: *Generates complete, compliant implementation*
```

The standard ensures AI-generated tools follow consistent patterns.

## License

PolyScript is an open standard. Use it freely in your projects.

---

*PolyScript: Because users shouldn't have to learn a new interface for every tool.*