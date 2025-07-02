# Backup Tool - Cross-Language Example

This directory contains identical backup tool implementations across all 7 PolyScript framework languages, demonstrating consistency and comparative patterns.

## Available Implementations

- **Python** (`backup_tool.py`) - Using Click framework
- **C#** (`BackupTool.cs`) - Using Spectre.Console  
- **F#** (`BackupTool.fs`) - Using Argu
- **Rust** (`backup_tool.rs`) - Using clap
- **Go** (`backup_tool.go`) - Using cobra
- **Node.js** (`backup_tool.js`) - Using yargs
- **Ruby** (`backup_tool.rb`) - Using thor

## Functionality

Each implementation provides:
- **Status mode**: Check backup system status
- **Test mode**: Simulate backup operations (dry-run)
- **Sandbox mode**: Test backup environment and dependencies
- **Live mode**: Execute actual backup operations

## Standard Features

All implementations support:
- `--json` flag for structured output
- `--verbose` flag for detailed logging
- `--force` flag to skip confirmations
- Source and destination path options
- Overwrite protection

## Usage Examples

```bash
# Status check
backup_tool status

# Dry run
backup_tool test --verbose

# Environment testing
backup_tool sandbox --json

# Execute backup
backup_tool live --source /data --dest /backup
```

## Consistency Demonstration

These examples showcase how PolyScript achieves:
- **Zero boilerplate** - Only business logic in each implementation
- **Identical behavior** - Same CLI interface across all languages
- **Language-native patterns** - Uses best practices for each language
- **Structured output** - Consistent JSON format for automation