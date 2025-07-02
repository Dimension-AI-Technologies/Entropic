# Known Limitations and Issues

This document outlines the known limitations and issues with the MCP Server Manager for Claude Code.

## Configuration Hierarchy Issues

### 1. Empty mcpServers Override
- **Issue**: An empty `mcpServers: {}` in `~/.claude.json` project overrides will hide ALL MCP servers
- **Impact**: Servers configured at user or machine level become invisible
- **Workaround**: Use `--repair` option to migrate project configs to `.mcp.json`
- **Example**:
  ```json
  // In ~/.claude.json - PROBLEMATIC
  {
    "projects": {
      "/path/to/project": {
        "mcpServers": {}  // This hides ALL servers!
      }
    }
  }
  ```

### 2. Machine Scope Permissions
- **Issue**: Machine scope (`/Library/Application Support/ClaudeCode/managed-settings.json` on macOS) requires administrator privileges
- **Impact**: Non-admin users cannot modify machine-wide settings
- **Workaround**: Use `--scope user` instead or run with `sudo`
- **Detection**: Script detects and warns about permission issues

## Claude Code Integration

### 3. Configuration File Format
- **Issue**: Claude Code requires specific format: `command` (string) + `args` (array) + optional `env` (object)
- **Impact**: Other formats (like transport/uri) won't work
- **Note**: Script automatically converts SSE servers to npm proxy format

### 4. Authentication Limitations
- **Issue**: Claude Code doesn't handle authentication directly for SSE servers
- **Impact**: Must use npm proxy packages that handle auth internally
- **Example**: Use `linear-mcp` package instead of direct Linear API URL

### 5. Configuration Reload
- **Issue**: Claude Code must be restarted to pick up configuration changes
- **Impact**: Changes don't take effect immediately
- **Workaround**: Script reminds users to restart Claude Code after changes

## Server-Specific Limitations

### 6. Environment Variables
- **Issue**: Some servers require environment variables (e.g., LINEAR_API_KEY)
- **Impact**: Servers won't work without proper environment setup
- **Detection**: Sandbox mode checks for required environment variables

### 7. SSE Server Connectivity
- **Issue**: Direct SSE URLs don't work with Claude Code
- **Impact**: Must use npm proxy packages
- **Handled**: Script automatically converts known SSE servers

## Technical Limitations

### 8. Concurrent Modifications
- **Issue**: No file locking when modifying configuration files
- **Impact**: Concurrent modifications could corrupt config
- **Recommendation**: Don't run multiple instances simultaneously

### 9. JSON Parsing Errors
- **Issue**: Malformed JSON in config files causes failures
- **Impact**: Script may fail to read/write configurations
- **Detection**: Script reports JSON parsing errors

### 10. Path Handling
- **Issue**: Project paths in ~/.claude.json must match exactly
- **Impact**: Different path representations may not match
- **Example**: `/Users/name/project` vs `/Users/name/project/`

## Platform-Specific Issues

### 11. Windows Path Separators
- **Issue**: Windows uses backslashes in paths
- **Impact**: Path matching in project overrides may fail
- **Status**: Not yet tested on Windows

### 12. Linux Config Paths
- **Issue**: Linux uses different paths for machine scope
- **Location**: `/etc/claude-code/managed-settings.json`
- **Status**: Implemented but not extensively tested

## Functional Limitations

### 13. No Server Discovery
- **Issue**: Script doesn't auto-discover available MCP servers
- **Impact**: Must maintain manual registry in `mcp_servers.json`
- **Workaround**: Use `--list-available` to see known servers

### 14. Limited Validation
- **Issue**: Script doesn't validate server functionality
- **Impact**: Can add non-functional server configurations
- **Mitigation**: Use sandbox mode to test server availability

### 15. No Bulk Operations
- **Issue**: Can't add/remove all servers at once
- **Impact**: Must specify servers individually
- **Workaround**: Script in a loop for bulk operations

## PolyScript Compliance

### 16. Live Mode Confirmations
- **Issue**: Live mode asks for confirmation unless --force is used
- **Impact**: Not fully scriptable without --force
- **By Design**: Safety feature to prevent accidents

### 17. JSON Mode Limitations
- **Issue**: Some error messages still go to stderr in JSON mode
- **Impact**: May need to parse both stdout and stderr
- **Status**: Partially addressed, ongoing improvement

## Future Considerations

### 18. Version Compatibility
- **Issue**: No version checking for Claude Code compatibility
- **Impact**: May not work with future Claude Code versions
- **Recommendation**: Keep script updated

### 19. Server Version Management
- **Issue**: No way to specify server package versions
- **Impact**: Always uses latest available version
- **Workaround**: Manually edit config after installation

### 20. Backup and Restore
- **Issue**: No built-in backup/restore functionality
- **Impact**: Manual backup needed before major changes
- **Recommendation**: Consider adding backup feature

## Workarounds Summary

1. **For permission issues**: Use `--scope user` or run with `sudo`
2. **For config conflicts**: Use `--repair` to clean up
3. **For SSE servers**: Script handles conversion automatically
4. **For testing**: Always use `--mode test` before `--mode live`
5. **For debugging**: Use `--verbose` flag for detailed output

## Reporting Issues

If you encounter issues not listed here:
1. Run with `--verbose` to get detailed output
2. Check JSON validity of config files
3. Ensure Claude Code is up to date
4. Report issues with full error messages and environment details

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>