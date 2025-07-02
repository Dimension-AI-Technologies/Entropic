# MCP Known Issues & Bug Tracker

Based on a review of open issues in the Claude Code GitHub repository, here are the key MCP and configuration problems affecting users:

## 1. Empty mcpServers: {} Configuration Override Issues

### Issue #1788: MCP Configuration Unexpectedly Deleted During Auto-Update
- **Affected Users**: 6+ confirmed cases with 6 👍 and 3 😕 reactions
- **Problem**: Claude Code deletes entire MCP configuration in ~/.claude.json during auto-updates
- **Impact**: Users must rebuild configuration from scratch
- **Anthropic Response**: Assigned to @ashwin-ant, labeled as bug
- **Workaround**: 
  ```bash
  claude mcp remove mcp-name
  claude mcp add-from-claude-desktop -s user
  ```

### Issue #1035: Multiple Claude Sessions Conflict and Overwrite ~/.claude.json
- **Problem**: Concurrent Claude sessions overwrite each other's configuration
- **Impact**: History truncated, configuration lost
- **Root Cause**: File output buffering issues with ~/.claude.json
- **Anthropic Response**: No official response noted

## 2. Configuration Hierarchy Problems

### Issue #515: Global MCP Servers Not Applied to Projects
- **Problem**: Global servers in ~/.claude-code/mcp/global.json not detected
- **Anthropic Response**: @ashwin-ant explained this path is not supported
- **Workaround**: Manual addition using:
  ```bash
  claude mcp add-json server-name "$(cat ~/.claude-code/mcp/global.json | jq '.mcpServers."server-name"')"
  ```

### Issue #374: Project Configuration Scope Issues
- **Problem**: MCP config scoped to directory where `claude` was run, not repository
- **Impact**: Configuration lost when changing directories within same repo
- **Feature Request**: Repository-level scope for MCP servers

## 3. MCP Servers Showing as Undefined/Not Working

### Issue #1611: MCP Servers Fail to Connect Despite Correct Configuration
- **Affected Users**: 10+ comments
- **Problem**: Servers work independently but fail within Claude Code
- **Platforms**: Primarily macOS
- **Potential Causes**: Keychain access issues, PATH problems
- **Workarounds**: Restart Claude multiple times, verify npm configuration

### Issue #768: Protocol Version Validation Error
- **Problem**: protocolVersion field not properly included in request parameters
- **Impact**: Internal validation fails before server communication
- **Configuration**: Affects stdio-based MCP servers

### Issue #1469: Phantom Servers Persisting After Removal
- **Problem**: 8 failed servers persist in `/mcp` command output
- **Impact**: Makes MCP status unreliable, prevents troubleshooting
- **Not Fixed By**: Removing servers, clearing cache, resetting choices

## 4. Configuration Persistence and Loss

### Issue #1676: Persistent Logout & Configuration Loss
- **Problem**: Complete configuration loss after system events (sleep, battery drain)
- **Impact**: Authentication tokens, theme preferences, MCP servers all disappear
- **Frequency**: User experienced 3 times
- **Suspected Causes**: Race conditions, aggressive cleanup routines

### Issue #1247: Claude Code Modifies ~/.claude.json
- **Problem**: Claude Code actively deletes user's ~/.claude.json file
- **Security Issue**: File contains sensitive data, partial keystrokes, OAuth metadata
- **User Request**: Prohibit Claude Code from modifying this file

## 5. Configuration Format and Standards

### Issue #359: Standardize MCP Server Configuration Format
- **Problem**: Different formats between Claude Code and Claude Desktop
- **Impact**: Cannot share configurations between applications
- **Request**: Unified configuration format

### Issue #1455: XDG Base Directory Specification
- **Problem**: Claude Code uses ~/.claude.json instead of XDG standards
- **Impact**: Non-standard file locations on Linux

## Summary of Key Issues

1. **Configuration Deletion**: Most critical issue - configurations regularly deleted during updates
2. **Hierarchy Confusion**: Global settings don't apply to projects as expected
3. **Persistence Problems**: Multiple sessions conflict, configurations lost on system events
4. **Undefined Servers**: Servers appear but don't function properly
5. **Format Inconsistency**: Different configuration formats across Claude products

## Common Workarounds

1. Manually re-add servers after updates
2. Use `claude mcp add-from-claude-desktop` to import configurations
3. Avoid running multiple Claude sessions simultaneously
4. Keep backup of ~/.claude.json configuration
5. Use absolute paths and verify Node.js version compatibility

## Anthropic Engagement

- Several issues assigned to @ashwin-ant
- Limited official responses on most issues
- Some clarifications provided (e.g., unsupported file paths)
- Many issues remain open without resolution

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>