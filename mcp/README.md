# MCP Server Management

Model Context Protocol (MCP) server installation and management tools for Claude Code.

## Documentation

- **[Configuration Guide](Claude_Code_MCP_Configuration_Guide.md)** - Complete guide to MCP server configuration
- **[Known Issues](MCP_Known_Issues.md)** - Current bugs and workarounds
- **[MCP Ecosystem](MCP_Ecosystem.md)** - MCP server registries and discovery tools

## Management Scripts

### `manage_claude_code_mcp_servers.py` (Recommended)
Python-based MCP server management with PolyScript compliance (in progress).

**List all configured servers:**
```bash
./manage_claude_code_mcp_servers.py --list
```

**Add servers to specific scope:**
```bash
./manage_claude_code_mcp_servers.py --add sequential-thinking --scope user
./manage_claude_code_mcp_servers.py --add linear --scope project
```

**Remove servers:**
```bash
./manage_claude_code_mcp_servers.py --remove old-server --scope project
```

**Repair configuration issues:**
```bash
./manage_claude_code_mcp_servers.py --repair
```

**Test server connectivity:**
```bash
./manage_claude_code_mcp_servers.py --mode sandbox
```

### `install_mcp_servers.sh` (Legacy)
Bash script for MCP server installation and testing.

**Install/update MCP servers:**
```bash
./install_mcp_servers.sh
```

**Clean install:**
```bash
./install_mcp_servers.sh --install
```

**Test only:**
```bash
./install_mcp_servers.sh --test-only
```

## Supported MCP Servers

- **sequential-thinking** - Local NPX-based thinking server
- **linear** - Linear workspace integration via SSE (requires LINEAR_API_KEY)
- **context7** - Context7 web search and knowledge server via SSE

## Quick Start

1. **Check current configuration:**
   ```bash
   claude mcp list
   ```

2. **Add a server:**
   ```bash
   ./manage_claude_code_mcp_servers.py --add sequential-thinking --scope user
   ```

3. **Verify it works:**
   ```bash
   claude mcp list
   ```

4. **If servers show as "undefined":**
   ```bash
   ./manage_claude_code_mcp_servers.py --repair
   ```

## Common Issues

- **Servers showing as "undefined"**: Empty `mcpServers: {}` in project config overrides all servers. See [Configuration Guide](Claude_Code_MCP_Configuration_Guide.md#known-issues--solutions).
- **SSE servers failing**: Use npm proxy packages (`linear-mcp`, `@upstash/context7-mcp`) instead of direct URLs.
- **Configuration disappearing**: Use `.mcp.json` or `~/.claude/settings.json`, avoid `~/.claude.json`.

## Requirements

- **Node.js** and `npx` environment
- **Claude Code CLI** (`claude`)
- **Python 3.6+** (for management script)
- **Environment variables** (optional):
  - `LINEAR_API_KEY` for Linear integration

## File Structure

```
mcp/
├── README.md                                    # This file
├── Claude_Code_MCP_Configuration_Guide.md       # Main configuration guide
├── MCP_Known_Issues.md                         # Bug tracker
├── MCP_Ecosystem.md                            # MCP server discovery
├── manage_claude_code_mcp_servers.py           # Main management script
├── install_mcp_servers.sh                      # Legacy bash installer
├── mcp_servers.json                            # Server definitions
└── archive/                                    # Old documentation versions
```

## See Also

- [PolyScript Framework](../PolyScript/) - CLI tool standardization framework
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [MCP Specification](https://modelcontextprotocol.com)