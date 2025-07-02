# Claude Configuration Guide

## Claude Products

There are two distinct Claude products with completely different configuration systems:

1. **Claude Desktop** - The Electron-based desktop application
   - Configuration: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
   - Configuration: `C:\Users\NAME\AppData\Roaming\Claude\claude_desktop_config.json` (Windows)

2. **Claude Code** - The CLI tool (`claude` command)
   - Version check: `claude --version` returns "1.0.38 (Claude Code)"
   - Installed via npm: `/Users/username/.npm-global/bin/claude`

## Claude Code Configuration Locations

### Official Documentation Sources
- **Settings**: https://docs.anthropic.com/en/docs/claude-code/settings
- **MCP**: https://docs.anthropic.com/en/docs/claude-code/mcp

### Configuration Files and Hierarchy

Claude Code uses multiple configuration files with a specific precedence order:

#### 1. Settings Configuration (`settings.json`)
- **User settings**: `~/.claude/settings.json` - Applies to all projects
- **Project settings**: `.claude/settings.json` - Checked into source control, shared with team
- **Local project settings**: `.claude/settings.local.json` - Not checked in, for personal preferences
- **Enterprise settings**: `/Library/Application Support/ClaudeCode/managed-settings.json` (macOS)
- **Enterprise settings**: `/etc/claude-code/managed-settings.json` (Linux/Windows WSL)

**Settings Precedence** (highest to lowest):
1. Enterprise policies
2. Command line arguments
3. Local project settings (`.claude/settings.local.json`)
4. Shared project settings (`.claude/settings.json`)
5. User settings (`~/.claude/settings.json`)

#### 2. MCP Server Configuration (`.mcp.json`)
According to official docs, MCP servers are configured in:
- **Project-scoped**: `.mcp.json` in project root directory
- **Format**:
```json
{
  "mcpServers": {
    "server-name": {
      "command": "/path/to/server",
      "args": [],
      "env": {}
    }
  }
}
```

### Configuration Scopes

1. **Global/User Scope**: Available across all projects
   - Settings: `~/.claude/settings.json`
   - MCP: Use `claude mcp add -s user` (stores location unclear from docs)

2. **Project Scope**: Shared with team via source control
   - Settings: `.claude/settings.json`
   - MCP: `.mcp.json` in project root

3. **Local Scope**: Personal, not checked into source control
   - Settings: `.claude/settings.local.json`
   - MCP: Use `claude mcp add -s local` (default)

## Incorrect/Deprecated Configuration Locations

These files are NOT used by Claude Code but may exist from confusion or other tools:
- `~/.claude.json` - Not part of Claude Code's configuration system
- `~/.claude/mcp_config.json` - Not documented, should be removed
- `~/.claude/settings.local.json` with `mcpServers` - Settings files don't support MCP configuration

## SSE Servers and Local Proxies

### What are SSE Servers?
SSE (Server-Sent Events) servers are remote MCP servers that communicate over HTTP/HTTPS rather than stdio. Examples:
- Linear: `https://mcp.linear.app/sse`
- Context7: `https://mcp.context7.com/sse`

### The Problem with SSE in Claude Code
Claude Code currently has limitations with SSE servers:
- Tries to spawn them as local processes (causing "file argument must be string" errors)
- Doesn't support bearer token authentication for SSE endpoints
- Results in 401 authentication failures or "undefined" errors

### The Solution: Local NPM Packages as Proxies
Instead of connecting directly to SSE endpoints, use:

1. **NPM packages** that act as local proxies:
   ```json
   {
     "context7": {
       "command": "npx",
       "args": ["-y", "@upstash/context7-mcp@latest"],
       "env": {}
     }
   }
   ```

2. **mcp-remote adapter** for SSE servers:
   ```json
   {
     "linear": {
       "command": "npx",
       "args": ["-y", "mcp-remote", "https://mcp.linear.app/sse"],
       "env": {"LINEAR_API_KEY": "your-api-key"}
     }
   }
   ```

## Recommended Single Global Configuration

If you want ONE global configuration for Claude Code:

### For Settings:
1. **Keep**: `~/.claude/settings.json` (user settings)
2. **Delete**: 
   - `~/.claude/settings.local.json` (unless you need specific permissions)
   - Any `.claude/` directories in projects (unless needed for team sharing)

### For MCP Servers:
Since the official documentation is unclear about user-scoped MCP storage, the cleanest approach is:

1. **Use project-scoped** `.mcp.json` in your main working directory
2. **Delete all other MCP configurations**:
   - Remove `mcpServers` from any settings.json files
   - Delete `~/.claude/mcp_config.json`
   - Delete `~/.claude.json`
   - Remove any `.mcp.json` from other projects

### Example Clean Configuration

**`~/.claude/settings.json`** (for permissions and environment):
```json
{
  "permissions": {
    "allow": [
      "Bash(npm run:*)",
      "Bash(git:*)",
      "Read(~/.zshrc)"
    ],
    "deny": []
  },
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "0"
  }
}
```

**`.mcp.json`** (in your main project directory):
```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      "env": {}
    },
    "linear": {
      "command": "npx",
      "args": ["-y", "linear-mcp"],
      "env": {"LINEAR_API_KEY": "your-api-key"}
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "env": {}
    }
  }
}
```

## Common Issues and Solutions

1. **"undefined" errors**: Usually means SSE servers configured without local proxy
2. **"file argument must be string" errors**: Claude Code trying to spawn SSE URLs as processes
3. **Multiple config files**: Clean up duplicates, use only documented locations
4. **401 authentication failures**: SSE servers need mcp-remote adapter or npm packages

## Key Takeaways

1. Claude Code and Claude Desktop are different products with different configs
2. Claude Code MCP servers go in `.mcp.json`, not in settings files
3. SSE servers require local npm packages or mcp-remote adapter
4. Clean up old/incorrect config files to avoid confusion
5. When in doubt, use `claude mcp add` command to ensure correct configuration