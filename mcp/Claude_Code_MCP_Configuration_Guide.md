# Claude Code MCP Configuration Guide

> Comprehensive guide to configuring MCP servers in Claude Code

## Table of Contents
1. [Product Overview](#product-overview)
2. [Configuration File Locations](#configuration-file-locations)
3. [Configuration Hierarchy](#configuration-hierarchy)
4. [MCP Server Configuration Format](#mcp-server-configuration-format)
5. [Known Issues & Solutions](#known-issues--solutions)
6. [Best Practices](#best-practices)
7. [Management Tools](#management-tools)
8. [Troubleshooting](#troubleshooting)
9. [Quick Reference](#quick-reference)

## Product Overview

### Claude Desktop vs Claude Code

It's important to understand there are two different Claude products:

| Feature | Claude Desktop | Claude Code |
|---------|----------------|-------------|
| **Type** | Electron desktop app | CLI/terminal tool |
| **Purpose** | General AI chat interface | Software development assistant |
| **MCP Support** | Yes | Yes |
| **Config Location** | Platform-specific desktop paths | `~/.claude/` and project directories |
| **Target Users** | General users | Developers |

**This guide focuses on Claude Code**, the CLI tool for developers.

## Configuration File Locations

### Claude Code Configuration Files

Claude Code uses multiple configuration file locations with a specific hierarchy:

#### 1. **Machine/Enterprise Level** (Highest Priority)
- **macOS**: `/Library/Application Support/ClaudeCode/managed-settings.json`
- **Linux**: `/etc/claude-code/managed-settings.json`
- **Purpose**: Organization-wide settings managed by IT

#### 2. **Project Level**
- `.mcp.json` - In project root directory
- **Purpose**: Project-specific MCP servers (can be committed to version control)

#### 3. **User Level**
- `~/.claude/settings.json` - User-specific settings
- `~/.claude.json` - ⚠️ **PROBLEMATIC** - See [Known Issues](#known-issues--solutions)
- **Purpose**: Personal preferences and user-wide MCP servers

#### 4. **Built-in Defaults** (Lowest Priority)
- Internal defaults within Claude Code

### Configuration Search Order

Claude Code searches for configuration in this order (first found wins):
1. Machine/Enterprise settings
2. Project settings (`.mcp.json`)
3. User settings (`~/.claude/settings.json`)
4. Legacy user config (`~/.claude.json`)
5. Built-in defaults

## Configuration Hierarchy

### Override Behavior

**Critical Issue**: Empty configuration sections override all lower-priority settings!

```json
// In ~/.claude.json (project level)
{
  "projects": {
    "/path/to/project": {
      "mcpServers": {}  // This COMPLETELY OVERRIDES all MCP servers!
    }
  }
}
```

Even an empty `mcpServers: {}` will hide ALL MCP servers configured at lower priority levels.

### Scope Precedence

1. **Machine** → Overrides everything
2. **Project** → Overrides user and defaults
3. **User** → Overrides defaults only
4. **Defaults** → Used when nothing else is configured

## MCP Server Configuration Format

### Basic Structure

MCP servers are configured in the `mcpServers` object:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "command-to-run",
      "args": ["array", "of", "arguments"],
      "env": {
        "OPTIONAL_ENV_VAR": "value"
      }
    }
  }
}
```

### Server Types

#### 1. Local NPX Servers
```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

#### 2. SSE (Server-Sent Events) Servers
SSE servers require npm proxy packages:

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "linear-mcp"],
      "env": {
        "LINEAR_API_KEY": "your-key-here"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

**Note**: Direct SSE URLs do not work. Use the npm packages instead.

#### 3. Local Script Servers
```json
{
  "mcpServers": {
    "custom-server": {
      "command": "/path/to/script.py",
      "args": ["--arg1", "value1"]
    }
  }
}
```

### Configuration by Scope

#### Local Scope (Project)
File: `.mcp.json` in project root
```json
{
  "mcpServers": {
    "project-specific-server": {
      "command": "npx",
      "args": ["-y", "some-mcp-server"]
    }
  }
}
```

#### User Scope
File: `~/.claude/settings.json`
```json
{
  "mcpServers": {
    "user-server": {
      "command": "npx",
      "args": ["-y", "user-mcp-server"]
    }
  }
}
```

## Known Issues & Solutions

### 1. Empty mcpServers Override Bug

**Issue**: Claude Code adds empty `mcpServers: {}` to project configurations, hiding all servers.

**GitHub Issues**: [#1788](https://github.com/anthropics/claude-code/issues/1788), [#1035](https://github.com/anthropics/claude-code/issues/1035)

**Solution**:
1. Remove the empty override from `~/.claude.json`
2. Use `.mcp.json` files instead
3. Use the management script with `--repair` option

### 2. Configuration Deleted on Restart

**Issue**: Claude Code may delete MCP server configurations on restart.

**GitHub Issue**: [#515](https://github.com/anthropics/claude-code/issues/515)

**Solution**:
- Configure servers in `.mcp.json` or `~/.claude/settings.json`
- Avoid using `~/.claude.json` for MCP servers

### 3. Multiple Sessions Conflict

**Issue**: Multiple Claude Code sessions can corrupt configuration.

**GitHub Issue**: [#1656](https://github.com/anthropics/claude-code/issues/1656)

**Solution**:
- Run only one Claude Code session at a time
- Use file locking in management scripts

### 4. Phantom Servers

**Issue**: Servers appear in `claude mcp list` but aren't in any config file.

**Solution**:
1. Check ALL configuration locations
2. Look for override issues
3. Restart Claude Code completely

### 5. SSE Connection Failures

**Issue**: Direct SSE URLs fail with "file argument must be string" error.

**Solution**: Use npm proxy packages:
- `linear-mcp` instead of direct Linear API URL
- `@upstash/context7-mcp` instead of direct Context7 URL

## Best Practices

### 1. Configuration Strategy

- **Prefer `.mcp.json`** for project-specific servers
- **Use `~/.claude/settings.json`** for user-wide servers
- **Avoid `~/.claude.json`** due to bugs
- **Never manually edit** while Claude Code is running

### 2. Server Management

- Use the `manage_claude_code_mcp_servers.py` script
- Always verify configuration with `--list`
- Test servers with `--mode sandbox` before live deployment
- Keep authentication tokens in environment variables

### 3. Troubleshooting Order

1. Run `claude mcp list` to see active servers
2. Check for empty overrides in `~/.claude.json`
3. Verify `.mcp.json` exists in project
4. Check `~/.claude/settings.json` for user config
5. Restart Claude Code if needed

### 4. Security Considerations

- Never commit API keys to version control
- Use environment variables for secrets
- Be cautious with project-level `.mcp.json` files
- Validate server sources before installation

## Management Tools

### Official Claude CLI

```bash
# List all configured MCP servers
claude mcp list

# Get detailed server information
claude mcp list --json

# No official add/remove commands yet
```

### Community Management Script

```bash
# List servers at all scopes
./manage_claude_code_mcp_servers.py --list

# Add server to user scope
./manage_claude_code_mcp_servers.py --add sequential-thinking --scope user

# Remove server from project scope
./manage_claude_code_mcp_servers.py --remove old-server --scope project

# Repair configuration issues
./manage_claude_code_mcp_servers.py --repair

# Test server connectivity
./manage_claude_code_mcp_servers.py --mode sandbox
```

## Troubleshooting

### Server Shows as "undefined"

1. Check for empty `mcpServers: {}` override
2. Verify server configuration has all required fields
3. Ensure Claude Code has been restarted
4. Check file permissions on configuration files

### Servers Not Loading

1. Run `claude mcp list --json` for detailed error messages
2. Check Claude Code logs: `~/.claude/logs/`
3. Verify npm/npx is available in PATH
4. Test server command manually in terminal

### Configuration Changes Not Taking Effect

1. Fully quit Claude Code (not just close window)
2. Check for multiple Claude Code processes
3. Verify no syntax errors in JSON files
4. Look for override issues in hierarchy

### Authentication Failures

1. Verify environment variables are set
2. Check if running in correct shell environment
3. Test API keys independently
4. Ensure tokens haven't expired

## Quick Reference

### File Locations Summary

```
macOS:
├── /Library/Application Support/ClaudeCode/managed-settings.json  # Machine
├── ./.mcp.json                                                     # Project
├── ~/.claude/settings.json                                         # User
└── ~/.claude.json                                                  # Legacy (avoid)

Linux:
├── /etc/claude-code/managed-settings.json                          # Machine
├── ./.mcp.json                                                     # Project
├── ~/.claude/settings.json                                         # User
└── ~/.claude.json                                                  # Legacy (avoid)
```

### Common Commands

```bash
# Check current configuration
claude mcp list

# Verify with management script
./manage_claude_code_mcp_servers.py --list --verbose

# Add a server safely
./manage_claude_code_mcp_servers.py --add server-name --scope project

# Test before deployment
./manage_claude_code_mcp_servers.py --mode sandbox

# Fix configuration issues
./manage_claude_code_mcp_servers.py --repair
```

### Emergency Recovery

If MCP servers completely stop working:

1. **Backup current config**: `cp ~/.claude.json ~/.claude.json.backup`
2. **Remove problematic sections**: Delete `mcpServers` from `~/.claude.json`
3. **Create fresh user config**: 
   ```bash
   echo '{"mcpServers": {}}' > ~/.claude/settings.json
   ```
4. **Restart Claude Code completely**
5. **Re-add servers** using management script

---

*Consolidated from: Claude_Code_Configuration_Guide.md, Note.Claude.Configuration.md, and claude_code_mcp_issues_summary.md on 2025-01-02*