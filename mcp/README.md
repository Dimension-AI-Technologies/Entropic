# MCP Server Management

Model Context Protocol (MCP) server installation and management tools for Claude Code.

## Scripts

### `install_mcp_servers.sh`
Comprehensive MCP server installation, verification, and testing script.

**Install/update MCP servers (preserves existing):**
```bash
./install_mcp_servers.sh
```

**Clean install (removes existing servers first):**
```bash
./install_mcp_servers.sh --install
```

**Test existing installations only:**
```bash
./install_mcp_servers.sh --test-only
```

**Dry run mode (preview changes):**
```bash
./install_mcp_servers.sh --dry-run
```

### `context7-launcher.sh`
Launch Context7 MCP server with proper environment setup.

```bash
./context7-launcher.sh
```

## Supported MCP Servers

- **sequential-thinking** - Local NPX-based thinking server
- **linear** - Linear workspace integration via SSE
- **context7** - Context7 web search and knowledge server via SSE

## Requirements

- **Node.js** and `npx` environment
- **Claude Code CLI** for MCP server integration
- **LINEAR_API_KEY** environment variable (optional, for Linear server)

## Features

- Automatic backup and restoration of existing MCP configurations
- Comprehensive testing of server connectivity and functionality
- Color-coded output for easy status identification
- Error tracking and reporting
- Support for both local and SSE-based MCP servers