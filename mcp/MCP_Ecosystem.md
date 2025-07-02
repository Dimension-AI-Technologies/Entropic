# MCP Servers for Installing MCP Servers

There are several MCP servers specifically designed for installing and managing other MCP servers, functioning as "package managers" for the MCP ecosystem. These tools can discover servers from online registries, handle npm installations, and automatically configure Claude's JSON files.

## Online MCP Server Registries

### Official Resources:
- **GitHub Registry** (in development): https://github.com/modelcontextprotocol/registry
- **Official Servers**: https://github.com/modelcontextprotocol/servers

### Community Directories:
- **mcp.so** - Community platform for MCP servers
- **mcpserverfinder.com** - Comprehensive MCP server directory
- **mcpservers.org** - Collection of MCP servers
- **pulsemcp.com** - Daily-updated directory with 4870+ servers
- **Awesome List**: https://github.com/wong2/awesome-mcp-servers

## MCP Installer Tools

### 1. @anaisbetts/mcp-installer (Most Popular)
The most widely-used MCP installer server that allows you to install MCP servers hosted in npm or PyPi using natural language commands.

**Installation:**
```json
"mcpServers": {
  "mcp-installer": {
    "command": "npx",
    "args": ["@anaisbetts/mcp-installer"]
  }
}
```

**Usage Examples:**
- "Hey Claude, install the MCP server named mcp-server-fetch"
- "Hey Claude, install the @modelcontextprotocol/server-filesystem package as an MCP server. Use ['/Users/username/Desktop'] for the arguments"
- "Install the server @modelcontextprotocol/server-github. Set the environment variable GITHUB_PERSONAL_ACCESS_TOKEN to '1234567890'"

**Requirements:** npx and uv (for Python servers)

### 2. mcp-auto-install by MyPrototypeWhat
Provides automatic detection and installation of MCP servers with support for npm packages and GitHub repositories.

**Features:**
- Automatic retrieval and caching of server README content
- Natural language interaction for installing and managing MCP servers
- Custom source management

**Installation:**
```bash
npm install -g mcp-auto-install
```

**Usage:**
```bash
# List available servers
mcp-auto-install list

# Install a specific server
mcp-auto-install install <server-name>

# Add custom sources
mcp-auto-install add-source my-server -r https://github.com/username/repo
```

### 3. @mcpmarket/mcp-auto-install (Community Enhanced)
A community-enhanced version with additional features:
- JSON configuration support
- Multiple package scopes
- Machine-readable JSON output

### 4. mcp-easy-installer by onigetoc
A comprehensive tool to search, install, configure, repair and uninstall MCP servers.

**Features:**
- Automatically installs and updates JSON configuration files for Claude Desktop, Windsurf, Cursor, Roo Code, Cline, and more
- Manually installs all MCP servers (doesn't use npx)
- Includes search, repair, and uninstall capabilities

## How It Works with Claude Code

When you install an MCP installer (like @anaisbetts/mcp-installer), you can use natural language prompts such as:
- "Use MCP-installer to install SequentialThinking MCP Server"

The installer will then:
1. Look up the server in the connected registries
2. Run the necessary npm install commands
3. Configure the JSON configuration files automatically
4. Handle both user-level and project-level installations

## Integration with Registries

These installer tools integrate with the registries mentioned above to:
- Automatically discover MCP servers from the @modelcontextprotocol scope
- Support installation from npm packages and GitHub repositories
- Connect with community platforms like mcp.so and mcpserverfinder.com

The MCP ecosystem has evolved to support exactly this workflow - using natural language with Claude to discover, install, and configure MCP servers automatically through these meta-MCP servers.