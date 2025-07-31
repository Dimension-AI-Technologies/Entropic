# Claude Code Fix Scripts

This directory contains PowerShell scripts to diagnose and fix Claude Code installation issues across different environments.

## Current Script

| Script | Description | Status |
|--------|-------------|---------|
| `Fix-ClaudeCode.ps1` | Universal cross-platform script with optional Spectre.Console UI | ✅ **ACTIVE** |

## Deprecated Scripts

| Script | Description | Status |
|--------|-------------|---------|
| `Fix-ClaudeCode-Windows.ps1` | Windows-specific version | ⚠️ **DEPRECATED** - Use Fix-ClaudeCode.ps1 |
| `Fix-ClaudeCode-WSL2.ps1` | WSL2/Linux-specific version | ⚠️ **DEPRECATED** - Use Fix-ClaudeCode.ps1 |
| `Fix-ClaudeCode-Universal-Spectre.ps1` | Separate Spectre UI version | ⚠️ **MERGED** - Use Fix-ClaudeCode.ps1 with -UseSpectre |

## Quick Start

### Standard Mode
```powershell
# Preview what will be fixed (dry run)
.\Fix-ClaudeCode.ps1

# Actually fix the issues
.\Fix-ClaudeCode.ps1 -Live
```

### Enhanced UI Mode (Spectre.Console)
```powershell
# Preview with beautiful formatted output
.\Fix-ClaudeCode.ps1 -UseSpectre

# Fix with enhanced UI
.\Fix-ClaudeCode.ps1 -Live -UseSpectre
```

## Common Usage Patterns

### Dry Run (Safe - No Changes)
```powershell
# Preview what would be fixed without making changes
.\Fix-ClaudeCode.ps1
```

### Live Fix (Execute Changes)
```powershell
# Actually fix the issues
.\Fix-ClaudeCode.ps1 -Live
```

### Verbose Output
```powershell
# Get detailed diagnostic information
.\Fix-ClaudeCode.ps1 -Live -Verbose
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
.\Fix-ClaudeCode.ps1 -Live
```

**"Multiple Claude versions detected"**
```powershell
# The scripts automatically remove duplicates and keep the best version
.\Fix-ClaudeCode.ps1 -Live
```

**"Permission denied"**
```powershell
# Run PowerShell as Administrator
# Right-click PowerShell → "Run as Administrator"
.\Fix-ClaudeCode.ps1 -Live
```

**"Script execution disabled"**
```powershell
# Enable script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\Fix-ClaudeCode.ps1 -Live
```

### Script Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `-Live` | Execute changes (default is dry run) | `.\Fix-ClaudeCode.ps1 -Live` |
| `-UseSpectre` | Enable Spectre.Console rich UI | `.\Fix-ClaudeCode.ps1 -UseSpectre` |
| `-Verbose` | Show detailed diagnostic output | `.\Fix-ClaudeCode.ps1 -Live -Verbose` |
| `-NonInteractive` | Don't prompt for elevation (with -UseSpectre) | `.\Fix-ClaudeCode.ps1 -Live -UseSpectre -NonInteractive` |
| `-Help` or `-?` | Show detailed help | `.\Fix-ClaudeCode.ps1 -?` |

### Spectre.Console UI Mode

The `-UseSpectre` parameter enables enhanced visual output:

- **Rich formatting**: Colored tables, rules, and structured output
- **Auto-installation**: Installs PwshSpectreConsole module if needed
- **Graceful fallback**: Reverts to standard output if unavailable
- **Elevation handling**: Prompts for Administrator when needed (Windows)
- **UTF-8 support**: Best viewed in Windows Terminal or modern terminals

#### Spectre-Specific Features
- Formatted tables for configuration display
- Colored status messages with markup support
- Section headers with visual rules
- Progress indicators (when available)

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
- **Universal v5.0** - Unified script with optional Spectre.Console UI
  - Standard mode for clean, simple output
  - Spectre mode for enhanced visual presentation
  - Full cross-platform support (Windows, WSL2, Linux, macOS)
  - Consolidated all functionality from previous versions

### Testing
```powershell
# Always test in dry-run mode first
.\Fix-ClaudeCode.ps1

# Check what would be changed, then execute
.\Fix-ClaudeCode.ps1 -Live
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
.\Fix-ClaudeCode.ps1 -Live

# Enhanced UI mode
.\Fix-ClaudeCode.ps1 -Live -UseSpectre

# Detailed diagnostics
.\Fix-ClaudeCode.ps1 -Live -Verbose

# Just see what's wrong (no changes)
.\Fix-ClaudeCode.ps1

# Get help
.\Fix-ClaudeCode.ps1 -?
```

**Need help?** Run any script without parameters to see what issues would be fixed, then add `-Live` to execute the fixes.