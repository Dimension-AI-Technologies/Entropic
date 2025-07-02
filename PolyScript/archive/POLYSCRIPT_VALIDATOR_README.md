# PolyScript Validator - Proof of Concept

A minimal validator that checks if scripts comply with the PolyScript v1.0 standard.

## What is PolyScript?

PolyScript is a behavioral standard for CLI tools that ensures consistency across different programming languages while allowing each language to use its natural idioms. See `PolyScript_Framework.md` for full details.

## Usage

```bash
# Validate a Python script
./polyscript_validator.py manage_servers.py

# Validate a PowerShell script
./polyscript_validator.py Manage-Servers.ps1 --language powershell

# Validate any supported language
./polyscript_validator.py script.fsx --language fsharp
```

## What It Tests

The validator checks that scripts implement the PolyScript v1.0 standard:

1. **Standard Modes**
   - `--mode status` (default) - Show current state
   - `--mode test` - Simulate changes
   - `--mode sandbox` - Test resources
   - `--mode live` - Execute changes

2. **Standard Flags**
   - `--verbose` / `-v` - Detailed output
   - `--force` / `-f` - Skip confirmations
   - `--json` - JSON output for automation

3. **Standard Behavior**
   - Exit codes: 0 (success) or 1 (failure)
   - JSON output when requested
   - Default mode is 'status'
   - Help text mentions standard modes

## Example Output

### Compliant Script
```
🔍 Validating example_polyscript_compliant.py (python)
============================================================

Test Results:
------------------------------------------------------------
✅ Help output                    Help text includes standard modes
✅ Mode: status                   Accepts --mode status
✅ Mode: test                     Accepts --mode test
✅ Mode: sandbox                  Accepts --mode sandbox
✅ Mode: live                     Accepts --mode live
✅ Flag: --verbose                Accepts --verbose
✅ Alias: -v                      Accepts -v for --verbose
✅ Flag: --force                  Accepts --force
✅ Alias: -f                      Accepts -f for --force
✅ Flag: --json                   Accepts --json
✅ Exit codes                     Returns standard exit code (0)
✅ JSON output                    Produces valid JSON with --json
✅ Default mode                   Default mode appears to be 'status'
------------------------------------------------------------
Summary: 13 passed, 0 failed, 0 warnings

✅ Script is PolyScript v1.0 compliant!
```

### Non-Compliant Script
```
🔍 Validating manage_claude_code_mcp_servers.py (python)
============================================================

Test Results:
------------------------------------------------------------
⚠️ Help output                    Help text missing some modes (found 1/4)
❌ Mode: status                   Failed with exit code 2
❌ Mode: test                     Failed with exit code 2
❌ Mode: sandbox                  Failed with exit code 2
❌ Mode: live                     Failed with exit code 2
⚠️ Flag: --verbose                May not support --verbose
⚠️ Flag: --force                  May not support --force
⚠️ Flag: --json                   May not support --json
❌ Exit codes                     Non-standard exit code: 2
⏭️ JSON output                    Could not test JSON output
⚠️ Default mode                   Default mode may not be 'status'
------------------------------------------------------------
Summary: 0 passed, 5 failed, 5 warnings

❌ Script is not fully compliant with PolyScript v1.0
```

## Supported Languages

The validator auto-detects language from file extension:
- `.py` → Python
- `.ps1` → PowerShell
- `.sh` → Bash
- `.js` → JavaScript
- `.fsx` → F#
- `.csx` → C#

Override with `--language` if needed.

## Next Steps

This is a proof of concept. Future enhancements could include:
- Reading PolyScript specifications from YAML files
- More sophisticated behavioral testing
- Performance benchmarks
- Integration with CI/CD pipelines
- Language-specific templates generation
- Compliance certification

## See Also

- `PolyScript_Framework.md` - Complete framework documentation
- `example_polyscript_compliant.py` - Example compliant script
- `CROSS_LANGUAGE_CLI_FRAMEWORK.md` - Technical exploration