# MCP Server Installation Scripts - Mode Comparison

## Original Shell Script (install_mcp_servers.sh)

The original shell script had four operation modes:

### 1. DEFAULT MODE (no flags)
- **Purpose**: Safe installation preserving existing servers
- **Behavior**: Installs only missing MCP servers
- **Command**: `./install_mcp_servers.sh`

### 2. INSTALL MODE (--install)
- **Purpose**: Clean installation with fresh setup
- **Behavior**: Removes ALL existing MCP servers before installing
- **Command**: `./install_mcp_servers.sh --install`

### 3. TEST ONLY MODE (--test-only)
- **Purpose**: Test existing installations
- **Behavior**: Verifies network connectivity and functionality without changes
- **Command**: `./install_mcp_servers.sh --test-only`

### 4. DRY RUN MODE (--dry-run)
- **Purpose**: Simulation mode for planning
- **Behavior**: Shows what commands would be executed
- **Can combine**: Works with other modes (e.g., `--install --dry-run`)
- **Command**: `./install_mcp_servers.sh --dry-run`

## New Python Script (manage_claude_code_mcp_servers.py)

The new Python script has evolved to focus on configuration management:

### Core Operations

1. **ADD (--add)**
   - **Purpose**: Add MCP servers to specified scope
   - **Command**: `--add sequential-thinking --scope user`
   - **Supports**: --dry-run mode

2. **REMOVE (--remove)**
   - **Purpose**: Remove MCP servers from specified scope
   - **Command**: `--remove linear --scope user`
   - **Supports**: --dry-run mode

3. **LIST (--list)**
   - **Purpose**: List configured servers at all scopes
   - **Command**: `--list [--scope user]`

4. **MIGRATE (--migrate)**
   - **Purpose**: Migrate servers from ~/.claude.json
   - **Command**: `--migrate`

### Legacy Operations (for compatibility)

- **--install**: Maps to ADD operation
- **--uninstall**: Maps to REMOVE operation
- **--test**: Tests existing installations
- **--verify**: Diagnoses configuration issues
- **--repair**: Fixes broken configurations

### Key Differences

1. **Scope-based**: New script works with configuration scopes (machine/user/project)
2. **No clean install mode**: Doesn't remove all servers before installing
3. **Configuration focus**: Manages config files rather than running `claude mcp` commands
4. **Hierarchy awareness**: Understands and warns about configuration override issues

## Mode Mapping

| Shell Script Mode | Python Script Equivalent |
|------------------|-------------------------|
| Default (safe install) | `--add` with specific servers |
| --install (clean) | `--migrate` then `--add` |
| --test-only | `--test` |
| --dry-run | `--dry-run` (works with all modes) |

## Recommendations

For users migrating from the shell script:

1. Use `--migrate` first to clean up ~/.claude.json
2. Use `--add` instead of default installation
3. Use `--list` to verify configuration
4. Always specify `--scope` for add/remove operations
5. Use `--dry-run` to preview changes