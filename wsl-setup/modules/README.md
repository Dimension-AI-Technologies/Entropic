# WSL2 Setup Modules

This directory contains modular PowerShell scripts for setting up a complete WSL2 development environment. Each module handles a specific aspect of the installation process.

## Modules Overview

### Core Modules

- **WSL-Utilities.ps1** - Common utilities and helper functions
- **Install-WindowsTerminal.ps1** - Windows Terminal installation
- **Install-WSL2Ubuntu.ps1** - WSL2 feature enablement and Ubuntu installation
- **Configure-IPv6.ps1** - IPv6 disabling for Claude Code compatibility
- **Install-NodeJS.ps1** - Node.js installation via NVM
- **Install-CLITools.ps1** - Claude Code and Gemini CLI installation

## Usage

### Full Installation (Recommended)
```powershell
.\Install-WSL2-DevEnvironment.ps1
```

### Individual Module Installation
```powershell
# Install specific components
.\Install-WSL2-DevEnvironment.ps1 -Module Terminal
.\Install-WSL2-DevEnvironment.ps1 -Module WSL2
.\Install-WSL2-DevEnvironment.ps1 -Module IPv6
.\Install-WSL2-DevEnvironment.ps1 -Module NodeJS
.\Install-WSL2-DevEnvironment.ps1 -Module CLITools
```

### Help
```powershell
.\Install-WSL2-DevEnvironment.ps1 -Help
```

## Module Dependencies

```
WSL-Utilities.ps1 (base utilities)
├── Install-WindowsTerminal.ps1 (standalone)
├── Install-WSL2Ubuntu.ps1 (standalone)
├── Configure-IPv6.ps1 (requires WSL-Utilities)
├── Install-NodeJS.ps1 (requires WSL-Utilities)
└── Install-CLITools.ps1 (requires WSL-Utilities)
```

## Module Details

### WSL-Utilities.ps1
**Purpose**: Provides common functions used by other modules
**Functions**:
- `Test-WindowsVersion` - Check Windows compatibility
- `Invoke-WSLCommand` - Execute commands in WSL
- `Test-Administrator` - Check admin privileges
- `Ensure-Administrator` - Auto-elevate if needed

### Install-WindowsTerminal.ps1
**Purpose**: Install Windows Terminal via winget
**Functions**:
- `Test-WindowsTerminal` - Check if already installed
- `Install-WindowsTerminal` - Install via winget
- `Install-WindowsTerminalIfNeeded` - Main function

### Install-WSL2Ubuntu.ps1
**Purpose**: Set up WSL2 with Ubuntu distribution
**Functions**:
- `Test-WSL2Status` - Check current WSL installation state
- `Enable-WSLFeatures` - Enable required Windows features
- `Install-WSL2Ubuntu` - Install/configure WSL2 and Ubuntu
- `Install-WSL2UbuntuEnvironment` - Main function

### Configure-IPv6.ps1
**Purpose**: Disable IPv6 in WSL2 for Claude Code compatibility
**Functions**:
- `Disable-IPv6InWSL` - Apply IPv6 configuration
- `Test-IPv6Status` - Check current IPv6 status
- `Configure-IPv6ForClaudeCode` - Main function

### Install-NodeJS.ps1
**Purpose**: Install Node.js via NVM in WSL2
**Functions**:
- `Install-NodeJS` - Install NVM and Node.js
- `Test-NodeJSInstallation` - Check if Node.js is installed
- `Configure-NpmGlobal` - Set up npm global directory
- `Install-NodeJSEnvironment` - Main function

### Install-CLITools.ps1
**Purpose**: Install AI CLI tools (Claude Code, Gemini CLI)
**Functions**:
- `Install-ClaudeCode` - Install Claude Code CLI
- `Install-GeminiCLI` - Install Gemini CLI
- `Test-CLIToolInstalled` - Check tool installation
- `Show-GlobalPackages` - Display installed packages
- `Install-CLITools` - Main function

## Error Handling

Each module includes:
- Parameter validation
- Error recovery mechanisms
- Status checking before operations
- Detailed error messages
- Graceful failure handling

## Return Values

Most functions return boolean values indicating success/failure. The WSL2 module returns a hashtable with additional information:

```powershell
@{
    Success = $true/$false
    RestartRequired = $true/$false
}
```

## Troubleshooting

1. **Module Import Errors**: Ensure all modules are in the `modules/` subdirectory
2. **Permission Errors**: Scripts auto-elevate to Administrator when needed
3. **WSL2 Issues**: Check Windows version compatibility (Build 19041+)
4. **Network Issues**: Some components require internet connectivity
5. **IPv6 Problems**: Manual verification: `cat /proc/sys/net/ipv6/conf/all/disable_ipv6` should return `1`