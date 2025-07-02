# Claude Code Configuration Guide

## Table of Contents
1. [Configuration File Locations](#configuration-file-locations)
2. [Configuration Hierarchy & Override Behavior](#configuration-hierarchy--override-behavior)
3. [MCP Server Configuration](#mcp-server-configuration)
4. [Authentication](#authentication)
5. [Known Issues & Bugs](#known-issues--bugs)
6. [Best Practices](#best-practices)

## Configuration File Locations

### Enterprise/System-wide Settings
- **macOS**: `/Library/Application Support/ClaudeCode/managed-settings.json`
- **Linux**: `/etc/claude-code/managed-settings.json`
- **Windows (WSL)**: `/etc/claude-code/managed-settings.json`
- **Purpose**: Enterprise-managed policies that override all other settings

### User-wide Settings
- **Main Configuration**: `~/.claude.json`
  - Contains both global settings AND per-project overrides
  - Includes theme, MCP servers, user preferences
  - Also stores project-specific settings in a `projects` object
- **User Settings**: `~/.claude/settings.json`
- **User Local Settings**: `~/.claude/settings.local.json`
- **Credentials**: 
  - macOS: Stored in Keychain as "Claude Code-credentials"
  - Linux: `~/.claude/credentials.json`

### Project-specific Settings
- **Shared Settings**: `.claude/settings.json` (in project root - committed to git)
- **Local Settings**: `.claude/settings.local.json` (in project root - not committed)
- **MCP Configuration**: `.mcp.json` (in project root - committed to git)
- **Project Instructions**: `CLAUDE.md` and `CLAUDE.local.md` (in project root)

## Configuration Hierarchy & Override Behavior

### Priority Order (Highest to Lowest)
1. **Enterprise managed settings** (if present)
2. **Project-specific settings**
   - Local scope (project user settings in `~/.claude.json`)
   - Project scope (`.mcp.json` in project root)
   - Project settings files (`.claude/settings.local.json`, `.claude/settings.json`)
3. **User-wide settings**
   - User scope settings
   - Global settings in `~/.claude.json`
4. **Built-in defaults**

### Important Override Behavior
- More specific settings override broader ones
- Empty objects (e.g., `mcpServers: {}`) **do override** parent configurations
- Project-specific settings in `~/.claude.json` under the `projects` object override global settings

## MCP Server Configuration

### Scope Types

#### 1. Local Scope (Default)
- **Storage**: Project-specific section in `~/.claude.json` under `projects.<path>.mcpServers`
- **Visibility**: Private to user, only in current project
- **Use Case**: Personal/experimental servers, sensitive credentials
```bash
# Add local server (default)
claude mcp add my-private-server /path/to/server
# Or explicitly
claude mcp add my-private-server -s local /path/to/server
```

#### 2. Project Scope
- **Storage**: `.mcp.json` file in project root
- **Visibility**: Shared with team via version control
- **Use Case**: Team-shared tools, project-specific services
- **Security**: Requires user approval before first use
```bash
# Add project server
claude mcp add shared-server -s project /path/to/server
```

Example `.mcp.json`:
```json
{
  "mcpServers": {
    "shared-server": {
      "command": "/path/to/server",
      "args": [],
      "env": {}
    }
  }
}
```

#### 3. User Scope
- **Storage**: User-wide configuration
- **Visibility**: Available across all projects, private to user
- **Use Case**: Personal utilities, development tools
```bash
# Add user server
claude mcp add my-user-server -s user /path/to/server
```

### MCP Server Configuration Format

#### For Local Servers (stdio)
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@package/name"],
      "env": {
        "API_KEY": "your-key-here"
      }
    }
  }
}
```

#### For SSE/Remote Servers
SSE servers require npm packages as proxies - Claude Code cannot connect directly to SSE URLs.

### Precedence Order
When servers have the same name across scopes:
1. **Local scope** (highest priority)
2. **Project scope**
3. **User scope** (lowest priority)

## Authentication

### How Claude Code Authenticates
1. **OAuth 2.0**: Primary authentication method with Anthropic
2. **Credential Storage**:
   - macOS: Encrypted in Keychain under "Claude Code-credentials"
   - Linux: `~/.claude/credentials.json`
   - **NOT** stored in `~/.claude.json`
3. **Alternative Methods**:
   - API keys via environment variables
   - Bedrock/Vertex authentication
   - apiKeyHelper scripts

### The `oauthAccount` Field
- Located in `~/.claude.json`
- Contains account metadata (UUIDs, email, organization info)
- **NOT required** for authentication
- Missing this field won't break authentication

## Known Issues & Bugs

### 1. Empty `mcpServers: {}` Override Bug
**Problem**: Claude Code persistently adds empty `mcpServers: {}` to project configurations in `~/.claude.json`, which overrides global MCP server settings.

**Symptoms**:
- MCP servers work in one directory but show as "undefined" in others
- Global servers disappear when navigating to different projects
- Servers must be re-added for each project

**Current Status**: No official fix available

**Workarounds**:
- Manually remove the empty `mcpServers: {}` from project configs
- Use our `manage_claude_code_mcp_servers.py` script with `--repair` flag
- Add servers explicitly to each project

### 2. Configuration File Deletions (Issue #1788)
- Claude Code unexpectedly deletes entire MCP configurations during auto-updates
- Affects 6+ confirmed users
- Workaround: Backup configurations and restore after updates

### 3. Multiple Session Conflicts (Issue #1035)
- Running Claude Code from different directories causes configuration conflicts
- File buffering issues lead to data loss
- Workaround: Avoid running multiple Claude instances simultaneously

### 4. Configuration Not Persisting (Issue #1676)
- Complete configuration loss after system sleep or battery drain
- Affects authentication, themes, and MCP servers
- Suspected race condition between processes

## Best Practices

### 1. Configuration Management
- **Backup** your `~/.claude.json` regularly
- Use version control for `.mcp.json` files
- Document server configurations in project README

### 2. Scope Selection Guidelines
- **Local scope**: Personal experiments, sensitive credentials
- **Project scope**: Team collaboration, shared tools
- **User scope**: Cross-project utilities, personal tools

### 3. Troubleshooting Steps
1. Check for empty `mcpServers: {}` in project configs
2. Verify server configurations with `claude mcp list`
3. Use `--verify` flag in management scripts
4. Reset project choices if needed: `claude mcp reset-project-choices`

### 4. Security Considerations
- Never commit sensitive API keys to version control
- Use environment variables for secrets
- Review `.mcp.json` files before approving

## Management Script

We've developed `manage_claude_code_mcp_servers.py` to help manage these configuration issues:

```bash
# Verify configurations across directories
./manage_claude_code_mcp_servers.py --verify

# Repair broken configurations
./manage_claude_code_mcp_servers.py --repair

# Install MCP servers
./manage_claude_code_mcp_servers.py --install

# List current servers
./manage_claude_code_mcp_servers.py --list
```

## Conclusion

Claude Code's configuration system is powerful but has known issues, particularly with empty configuration overrides. Understanding the hierarchy and using appropriate management tools can help mitigate these problems until official fixes are available.

## References
- [Claude Code MCP Documentation](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [GitHub Issues - MCP](https://github.com/anthropics/claude-code/issues?q=is%3Aissue%20state%3Aopen%20MCP)
- [GitHub Issues - Config](https://github.com/anthropics/claude-code/issues?q=is%3Aissue%20state%3Aopen%20config)