# Scripts Collection

A collection of utility scripts for GitHub analysis, MCP server management, and system configuration.

## Directory Structure

```
scripts/
├── git-analysis/     # GitHub repository and commit analysis tools
├── mcp/             # Model Context Protocol server management
├── network/         # Network configuration scripts
├── utilities/       # General-purpose utilities
└── wsl-setup/       # WSL2 environment setup scripts
```

## Quick Start

### Prerequisites

- **Bash** shell (for shell scripts)
- **Python 3** with asyncio support (for Python scripts)
- **GitHub CLI** (`gh`) - installed and authenticated
- **Node.js** and `npx` (for MCP scripts)

### GitHub Analysis

Find repositories with large deletions:
```bash
./git-analysis/find_large_deletions.sh --account <github-account> --days 7
```

Check commits on a specific date:
```bash
./git-analysis/batch_check_commits.sh --account <github-account> --date 20250620
```

### WSL2 Development Environment Setup

Complete setup for WSL2 with AI CLI tools (Windows PowerShell):
```powershell
.\wsl-setup\Install-WSL2-DevEnvironment.ps1
```

### MCP Server Setup

Install MCP servers for Claude Code:
```bash
./mcp/install_mcp_servers.sh
```

## Script Categories


### WSL Setup (`wsl-setup/`)

- **Install-WSL2-DevEnvironment.ps1** - Modular PowerShell script for complete WSL2 development environment
  - Main orchestration script that uses individual modules
  - Supports both full installation and individual component installation
  - Includes parameter support: `-Module <name>` and `-Help`
- **modules/** - Modular components for WSL2 setup
  - **WSL-Utilities.ps1** - Common utilities and helper functions
  - **Install-WindowsTerminal.ps1** - Windows Terminal installation
  - **Install-WSL2Ubuntu.ps1** - WSL2 and Ubuntu setup
  - **Configure-IPv6.ps1** - IPv6 disabling for Claude Code compatibility
  - **Install-NodeJS.ps1** - Node.js installation via NVM
  - **Install-CLITools.ps1** - Claude Code and Gemini CLI installation

### Git Analysis (`git-analysis/`)

- **batch_check_commits.sh** - Analyze commits for a specific date
- **batch_check_commits_days.sh** - Check commits over multiple days
- **find_large_deletions.sh** - Find repos with significant deletions
- **find_large_deletions.py** - Async Python version for better performance
- **find_large_deletions_gh.py** - Uses GitHub CLI for private repo access

### MCP Management (`mcp/`)

- **install_mcp_servers.sh** - Install/test MCP servers (sequential-thinking, linear, context7)
  - bash 3.2 compatible with cross-platform timeout handling
  - Multiple operation modes: install, test-only, dry-run
  - Comprehensive connectivity and functionality testing
- **context7-launcher.sh** - Launch Context7 MCP server with proper environment

### Network Configuration (`network/`)

- **disable_ipv6.sh** - Disable IPv6 in WSL2/Ubuntu persistently

### Utilities (`utilities/`)

- **find_size.py** - Analyze file sizes and statistics in a directory
- **test_api.py** - Test GitHub API connectivity and endpoints

## Environment Variables

- `GITHUB_TOKEN` - GitHub personal access token for API authentication
- `LINEAR_API_KEY` - Linear API key (optional, for MCP Linear server)

## License

Private repository - all rights reserved.