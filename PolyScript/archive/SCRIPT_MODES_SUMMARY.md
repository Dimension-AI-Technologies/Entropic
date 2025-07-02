# Script Modes Summary

## setup_dev_environment.py - The Three Modes Implementation

This is the script with the actual test/sandbox/live modes that you were thinking of.

### 1. STATUS Mode (default)
- **Purpose**: Check what's currently installed
- **Behavior**: Read-only, shows installed versions vs latest available
- **Command**: `python setup_dev_environment.py` or `--mode status`
- **Output**: Shows checkmarks/X marks for each tool with version info

### 2. TEST Mode
- **Purpose**: Simulate the installation process
- **Behavior**: Shows what WOULD be installed without making changes
- **Command**: `python setup_dev_environment.py --mode test`
- **Output**: "[TEST] Would install X" messages

### 3. SANDBOX Mode
- **Purpose**: Test downloads and connectivity
- **Behavior**: 
  - Tests download URLs to ensure they're accessible
  - Downloads to temporary location to verify resources
  - Does NOT install anything
- **Command**: `python setup_dev_environment.py --mode sandbox`
- **Implementation**: Uses `_test_download()` method to verify URLs

### 4. LIVE Mode
- **Purpose**: Actually install the tools
- **Behavior**: 
  - Downloads and installs software
  - Modifies system (requires admin for some tools)
  - Makes permanent changes
- **Command**: `python setup_dev_environment.py --mode live`

## Key Features of setup_dev_environment.py

1. **Cross-platform**: Works on Windows, Linux, macOS, and WSL
2. **Data-driven**: Tools defined in a TOOLS list with configurations
3. **Dependency handling**: Won't install tools if prerequisites fail
4. **Version checking**: Compares installed vs latest versions
5. **Admin handling**: Automatically elevates when needed
6. **Special cases**: Handles WSL2 IPv6 issues, npm configurations, etc.

## How the Modes Work Together

```
STATUS → TEST → SANDBOX → LIVE
  ↓        ↓        ↓        ↓
Check   Simulate  Verify  Install
```

- **STATUS**: See what you have
- **TEST**: See what would happen
- **SANDBOX**: Verify resources are available
- **LIVE**: Actually do the installation

## Comparison with MCP Scripts

### manage_claude_code_mcp_servers.py (what we built today)
- Has only `--dry-run` (similar to TEST mode) and live mode
- No SANDBOX mode for testing downloads
- Focuses on configuration file management

### install_mcp_servers.sh (original shell script)
- Had different modes:
  - Default: Safe install (preserve existing)
  - `--install`: Clean install (remove all first)
  - `--test-only`: Test existing installations
  - `--dry-run`: Simulation mode

## Borrowing Ideas for MCP Script

From `setup_dev_environment.py`, we could add to `manage_claude_code_mcp_servers.py`:

1. **SANDBOX mode**: Test npm package availability
   ```python
   def _test_npm_package(self, package_name):
       """Test if npm package is available"""
       url = f"https://registry.npmjs.org/{package_name}"
       return self._test_url(url)
   ```

2. **Better status checking**: Show installed vs available versions
3. **Dependency checking**: Ensure Node.js/npm before installing MCP servers
4. **Cross-platform improvements**: Better Windows/macOS/Linux handling