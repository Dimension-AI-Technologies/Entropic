# WSL2 Development Environment Setup

Comprehensive PowerShell scripts for setting up a complete WSL2 development environment on Windows.

## Main Script

### `Install-WSL2-DevEnvironment.ps1`
Complete WSL2 development environment setup with modular architecture.

**Full installation:**
```powershell
.\Install-WSL2-DevEnvironment.ps1
```

**Module-specific installation:**
```powershell
.\Install-WSL2-DevEnvironment.ps1 -Module Terminal
.\Install-WSL2-DevEnvironment.ps1 -Module WSL2
.\Install-WSL2-DevEnvironment.ps1 -Module IPv6
.\Install-WSL2-DevEnvironment.ps1 -Module NodeJS
.\Install-WSL2-DevEnvironment.ps1 -Module CLITools
```

## Components Installed

- **Windows Terminal** - Modern terminal application (if not already installed)
- **WSL2 with Ubuntu** - Windows Subsystem for Linux 2 with Ubuntu distribution
- **IPv6 Configuration** - Disables IPv6 in WSL2 (required for Claude Code compatibility)
- **Node.js** - JavaScript runtime via Node Version Manager (NVM)
- **Claude Code CLI** - Anthropic's Claude Code command-line interface
- **Gemini CLI** - Google's Gemini command-line interface

## Modular Architecture

All functionality is organized into focused modules in the `modules/` directory:

- `Install-WindowsTerminal.ps1` - Windows Terminal installation
- `Install-WSL2Ubuntu.ps1` - WSL2 and Ubuntu setup
- `Configure-IPv6.ps1` - IPv6 configuration for WSL2
- `Install-NodeJS.ps1` - Node.js installation via NVM
- `Install-CLITools.ps1` - CLI tools (Claude Code, Gemini)
- `WSL-Utilities.ps1` - Common utilities and helper functions

## Requirements

- **Windows 10 Build 19041+** or **Windows 11**
- **PowerShell 5.1+**
- **Administrator privileges** (script auto-elevates when needed)

## Features

- **Auto-elevation** - Automatically requests Administrator privileges when needed
- **Error recovery** - Handles partial installations and system restarts
- **Status checking** - Verifies existing installations before proceeding
- **Modular design** - Install individual components or complete environment
- **Comprehensive logging** - Detailed output for troubleshooting

## Usage Notes

- The script will prompt for system restart if WSL2 installation requires it
- After restart, re-run the script to continue with remaining components
- IPv6 is disabled in WSL2 to ensure Claude Code compatibility
- Node.js is installed via NVM for better version management
- All installations are verified before proceeding to next component

## Troubleshooting

- **WSL installation fails**: Ensure Windows features are enabled and system is up to date
- **Node.js installation issues**: Check NVM installation and PATH configuration
- **CLI tool installation fails**: Verify Node.js/npm is working correctly
- **Permission errors**: Ensure running as Administrator

For detailed module documentation, see `modules/README.md`.