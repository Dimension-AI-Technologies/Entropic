# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a collection of utility scripts organized by functionality:
- **git-analysis/**: Tools for analyzing GitHub repositories, commits, and large deletions
- **mcp/**: Model Context Protocol (MCP) server installation and management
- **network/**: Network configuration scripts (e.g., IPv6 management)
- **utilities/**: General-purpose tools for file analysis and API testing
- **wsl-setup/**: PowerShell scripts for setting up WSL2 development environment

## Common Commands

### Git Analysis Scripts

Check commits for a specific date:
```bash
./git-analysis/batch_check_commits.sh --account <github-account> --date <YYYYMMDD> [--threshold <lines>]
```

Find repositories with large deletions in recent days:
```bash
./git-analysis/find_large_deletions.sh --account <github-account> [--days <N>] [--threshold <lines>]
```

### MCP Server Management

Install MCP servers (preserves existing):
```bash
./mcp/install_mcp_servers.sh
```

Clean install (removes existing servers first):
```bash
./mcp/install_mcp_servers.sh --install
```

Test existing installations:
```bash
./mcp/install_mcp_servers.sh --test-only
```

### WSL2 Setup (Windows PowerShell)

Complete WSL2 development environment setup:
```powershell
.\wsl-setup\Install-WSL2-DevEnvironment.ps1
```

This PowerShell script:
- Auto-elevates to Administrator
- Installs Windows Terminal, WSL2, and Ubuntu
- Disables IPv6 (required for Claude Code)
- Sets up Node.js via NVM
- Installs Claude Code and Gemini CLI

## Script Dependencies

- **Python scripts**: Require Python 3 with asyncio support
- **Shell scripts**: Bash-compatible shell
- **Git analysis tools**: Require `gh` (GitHub CLI) to be installed and authenticated
- **MCP scripts**: Require `npx` and Node.js environment
- **PowerShell scripts**: Require Windows PowerShell 5.1+ and Windows 10 Build 19041+

## Environment Variables

- `GITHUB_TOKEN`: Used by Python scripts for GitHub API authentication
- `LINEAR_API_KEY`: Optional for Linear MCP server authentication

## Architecture Notes

### Git Analysis Tools
The git analysis scripts come in multiple variants:
- Shell scripts (`.sh`) use `gh` CLI for simplicity
- Python scripts (`.py`) use async HTTP requests for performance
- Scripts ending in `_gh.py` specifically use `gh` CLI for private repo access

### Parallel Execution
The Python analysis scripts use asyncio for concurrent API requests, making them suitable for analyzing multiple repositories efficiently.

### Error Handling
All scripts include parameter validation and help messages. Use `--help` flag for usage details.