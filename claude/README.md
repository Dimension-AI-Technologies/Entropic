# Claude Code Fix Scripts

This directory contains PowerShell scripts to diagnose and fix Claude Code installation issues across different environments.

## Scripts Overview

| Script | Description |
|--------|-------------|
| `Fix-ClaudeCode-Universal.ps1` | Cross-platform script supporting Windows, WSL2, Linux, and macOS |
| `Fix-ClaudeCode-Universal-Spectre.ps1` | Enhanced UI version with Spectre.Console tables and formatting |
| `Fix-ClaudeCode-WSL2.ps1` | WSL2/Linux-specific version with Unix path handling |
| `Fix-ClaudeCode-Windows.ps1` | Windows-specific version with native PowerShell features |

## Quick Start

### For Most Users
```powershell
# Universal script (recommended)
.\Fix-ClaudeCode-Universal.ps1 -Live

# Enhanced UI version
.\Fix-ClaudeCode-Universal-Spectre.ps1 -Live
```

### Platform-Specific Options
```powershell
# Windows only
.\Fix-ClaudeCode-Windows.ps1 -Live

# WSL2 environment
.\Fix-ClaudeCode-WSL2.ps1 -Live
```

## Common Usage Patterns

### Dry Run (Safe - No Changes)
```powershell
# Preview what would be fixed without making changes
.\Fix-ClaudeCode-Universal.ps1
```

### Live Fix (Execute Changes)
```powershell
# Actually fix the issues
.\Fix-ClaudeCode-Universal.ps1 -Live
```

### Verbose Output
```powershell
# Get detailed diagnostic information
.\Fix-ClaudeCode-Universal.ps1 -Live -Verbose
```

## What These Scripts Fix

### Package Manager Issues
- Removes conflicting npm/pnpm/yarn installations
- Updates to latest version via npm
- Handles broken installations with clean reinstall
- Manages Windows-specific package managers (chocolatey, scoop)
- Supports macOS package managers (Homebrew, MacPorts)

### PATH and Environment
- Fixes duplicate PATH entries
- Prioritizes npm installations over other package managers
- Handles WSL2/Linux Unix path requirements
- Manages system-wide vs user installations

### Platform-Specific Issues
- Windows: PowerShell execution policy, npm global paths
- WSL2: Unix path translation, sudo installation detection
- macOS: Homebrew/MacPorts integration
- Linux: System package manager compatibility

## Troubleshooting

### Common Issues

**"Claude command not found"**
```powershell
.\Fix-ClaudeCode-Universal.ps1 -Live
```

**"Multiple Claude versions detected"**
```powershell
# The scripts automatically remove duplicates and keep the best version
.\Fix-ClaudeCode-Universal.ps1 -Live
```

**"Permission denied"**
```powershell
# Run PowerShell as Administrator
# Right-click PowerShell → "Run as Administrator"
.\Fix-ClaudeCode-Universal.ps1 -Live
```

**"Script execution disabled"**
```powershell
# Enable script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\Fix-ClaudeCode-Universal.ps1 -Live
```

### Script Selection Guide

| Situation | Recommended Script |
|-----------|-------------------|
| **General use** | `Fix-ClaudeCode-Universal.ps1` |
| **Enhanced UI experience** | `Fix-ClaudeCode-Universal-Spectre.ps1` |
| **Windows only** | `Fix-ClaudeCode-Windows.ps1` |
| **WSL2 specific issues** | `Fix-ClaudeCode-WSL2.ps1` |
| **Cross-platform dev** | `Fix-ClaudeCode-Universal.ps1` |

### Enhanced UI Version

The `Fix-ClaudeCode-Universal-Spectre.ps1` script provides improved visual output:

- Rich colored output with formatted tables
- Automatic installation of PoshSpectreConsole module if needed
- Falls back to standard output if Spectre.Console unavailable
- Same functionality as Universal script with better presentation

## Safety Features

### Dry Run Default
All scripts run in **dry-run mode** by default - they show what would be changed without actually changing anything.

### Backup and Restore
- Scripts detect existing installations before making changes
- Failed operations are logged with recovery suggestions
- Version information is preserved for rollback if needed

### Error Handling
- Graceful handling of permission issues
- Clear error messages with suggested solutions
- Non-destructive operations where possible

## Development Notes

### Script Versions
- **Universal** - Latest comprehensive version with environment detection
- **Windows** - Stable Windows-specific version with enhanced PATH cleanup
- **WSL2** - Specialized for Windows Subsystem for Linux scenarios

### Testing
```powershell
# Always test in dry-run mode first
.\Fix-ClaudeCode-Universal.ps1

# Check what would be changed, then execute
.\Fix-ClaudeCode-Universal.ps1 -Live
```

### Auto-Update Configuration
Scripts automatically configure Claude Code to enable auto-updates:

```powershell
claude settings set autoUpdate true
```

Documentation: [Claude Code Settings](https://docs.anthropic.com/en/docs/claude-code/settings)

### Contributing
When modifying these scripts:
1. Test in dry-run mode extensively
2. Verify on different environments (Windows native, WSL2, etc.)
3. Update this README with any new features or changes
4. Follow PowerShell best practices for cross-platform compatibility
5. Ensure auto-update configuration is preserved in all script variants

---

## Quick Reference

```powershell
# Most common usage - fix everything safely
.\Fix-ClaudeCode-Universal.ps1 -Live

# Detailed diagnostics
.\Fix-ClaudeCode-Universal.ps1 -Live -Verbose

# Just see what's wrong (no changes)
.\Fix-ClaudeCode-Universal.ps1
```

**Need help?** Run any script without parameters to see what issues would be fixed, then add `-Live` to execute the fixes.