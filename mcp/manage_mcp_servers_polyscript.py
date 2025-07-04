#!/usr/bin/env python3
"""
MCP Server Manager - PolyScript Compliant Version

Manages Model Context Protocol (MCP) servers for Claude Code CLI.
This is a PolyScript-compliant implementation that follows the standard
behavioral contract for CLI tools.

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
"""

import json
import os
import subprocess
import sys
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Set
from datetime import datetime
import time
import tempfile
import atexit

# Import PolyScript base framework
from polyscript import PolyScriptBase

# Import Configuration Manager
from claude_config_manager import ClaudeConfigManager


# Claude Code version compatibility
CLAUDE_CODE_MIN_VERSION = "0.8.0"  # Minimum version supporting MCP
CLAUDE_CODE_RECOMMENDED_VERSION = "1.0.0"  # Recommended version for full MCP support


def parse_version(version_string: str) -> tuple:
    """Parse a version string into a tuple of integers for comparison"""
    try:
        # Handle common version formats like "claude-cli 1.2.3" or "1.2.3"
        version_part = version_string.split()[-1]  # Get last part (version number)
        
        # Remove 'v' prefix if present
        if version_part.startswith('v'):
            version_part = version_part[1:]
        
        # Split on dots and convert to integers
        parts = version_part.split('.')
        return tuple(int(part) for part in parts[:3])  # Take first 3 parts (major.minor.patch)
    except (ValueError, IndexError):
        # If parsing fails, return 0.0.0 to indicate unknown/invalid version
        return (0, 0, 0)


def compare_versions(version1: tuple, version2: tuple) -> int:
    """Compare two version tuples. Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2"""
    # Pad versions to same length
    max_len = max(len(version1), len(version2))
    v1 = version1 + (0,) * (max_len - len(version1))
    v2 = version2 + (0,) * (max_len - len(version2))
    
    if v1 < v2:
        return -1
    elif v1 > v2:
        return 1
    else:
        return 0


def check_claude_version_compatibility(version_string: str) -> dict:
    """Check if Claude Code version is compatible with MCP functionality"""
    parsed_version = parse_version(version_string)
    min_version = parse_version(CLAUDE_CODE_MIN_VERSION)
    recommended_version = parse_version(CLAUDE_CODE_RECOMMENDED_VERSION)
    
    result = {
        "version": version_string,
        "parsed_version": parsed_version,
        "compatible": True,
        "recommended": True,
        "status": "excellent",
        "message": "Claude Code version is fully compatible with MCP",
        "action": None
    }
    
    # Check if version is too old
    if compare_versions(parsed_version, min_version) < 0:
        result.update({
            "compatible": False,
            "recommended": False,
            "status": "incompatible",
            "message": f"Claude Code version {version_string} is too old for MCP support (minimum: {CLAUDE_CODE_MIN_VERSION})",
            "action": f"Please upgrade Claude Code to version {CLAUDE_CODE_RECOMMENDED_VERSION} or newer"
        })
    # Check if version meets minimum but not recommended
    elif compare_versions(parsed_version, recommended_version) < 0:
        result.update({
            "compatible": True,
            "recommended": False,
            "status": "warning",
            "message": f"Claude Code version {version_string} has basic MCP support (recommended: {CLAUDE_CODE_RECOMMENDED_VERSION}+)",
            "action": f"Consider upgrading to Claude Code {CLAUDE_CODE_RECOMMENDED_VERSION} for full MCP features"
        })
    
    return result


class Scope(Enum):
    """Configuration scopes for MCP servers"""
    MACHINE = "machine"  # System-wide configuration
    USER = "user"       # User-wide configuration
    PROJECT = "project" # Project-specific configuration


class FileLock:
    """Simple file locking mechanism using lock files"""
    
    def __init__(self, filepath: Path, timeout: int = 10):
        self.filepath = filepath
        self.lockfile = Path(str(filepath) + ".lock")
        self.timeout = timeout
        self.acquired = False
        self.pid = os.getpid()
        
    def __enter__(self):
        start_time = time.time()
        
        while True:
            try:
                # Try to create lock file exclusively
                with open(self.lockfile, 'x') as f:
                    f.write(str(self.pid))
                self.acquired = True
                
                # Register cleanup on exit
                atexit.register(self._cleanup)
                return self
                
            except FileExistsError:
                # Check if lock is stale
                if self._is_stale_lock():
                    self._cleanup()
                    continue
                
                # Check timeout
                if time.time() - start_time > self.timeout:
                    raise TimeoutError(f"Could not acquire lock for {self.filepath} after {self.timeout}s")
                
                # Wait a bit before retrying
                time.sleep(0.1)
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self._cleanup()
    
    def _cleanup(self):
        """Remove lock file if we own it"""
        if self.acquired and self.lockfile.exists():
            try:
                # Verify we own the lock
                with open(self.lockfile, 'r') as f:
                    lock_pid = int(f.read().strip())
                if lock_pid == self.pid:
                    self.lockfile.unlink()
            except (ValueError, OSError):
                # Lock file corrupted or already removed
                pass
            finally:
                self.acquired = False
    
    def _is_stale_lock(self) -> bool:
        """Check if lock file is stale (process no longer exists)"""
        try:
            with open(self.lockfile, 'r') as f:
                lock_pid = int(f.read().strip())
            
            # Check if process exists
            try:
                os.kill(lock_pid, 0)
                return False  # Process exists
            except ProcessLookupError:
                return True  # Process doesn't exist, lock is stale
            except PermissionError:
                return False  # Process exists but we can't signal it
                
        except (ValueError, OSError):
            # Lock file corrupted
            return True


@dataclass
class MCPServer:
    """Represents an MCP server configuration"""
    name: str
    command: str
    args: List[str]
    env: Optional[Dict[str, str]] = None
    description: Optional[str] = None
    
    def to_config(self) -> Dict:
        """Convert to Claude Code configuration format"""
        config = {
            "command": self.command,
            "args": self.args
        }
        if self.env:
            config["env"] = self.env
        return config


class MCPServerManager(PolyScriptBase):
    """PolyScript-compliant MCP server manager"""
    
    def __init__(self):
        super().__init__()
        self.home = Path.home()
        self.servers_json_path = Path(__file__).parent / "mcp_servers.json"
        self.available_servers: Dict[str, MCPServer] = {}
        self.backup_dir = self.home / ".mcp-backups"
        
        # Initialize configuration manager
        self.config_manager = ClaudeConfigManager()
        
        self._load_server_definitions()
    
    def get_description(self) -> str:
        return """MCP Server Manager for Claude Code
        
Manages Model Context Protocol (MCP) servers across different configuration scopes.
Supports adding, removing, and testing MCP server configurations with proper
hierarchy management and conflict resolution."""
    
    def add_arguments(self, parser):
        """Add MCP-specific arguments"""
        # Scope selection
        parser.add_argument(
            "--scope",
            type=str,
            choices=["machine", "user", "project"],
            default="user",
            help="Configuration scope (default: user)"
        )
        
        # Server operations
        ops = parser.add_mutually_exclusive_group()
        ops.add_argument(
            "--add",
            nargs="+",
            metavar="SERVER",
            help="Servers to add"
        )
        ops.add_argument(
            "--remove",
            nargs="+",
            metavar="SERVER",
            help="Servers to remove"
        )
        ops.add_argument(
            "--add-all",
            action="store_true",
            help="Add all available servers"
        )
        ops.add_argument(
            "--remove-all",
            action="store_true",
            help="Remove all configured servers"
        )
        ops.add_argument(
            "--list-available",
            action="store_true",
            help="List all available servers from registry"
        )
        
        # Additional options
        parser.add_argument(
            "--repair",
            action="store_true",
            help="Repair configuration issues"
        )
        
        # Backup/restore operations
        backup_group = parser.add_mutually_exclusive_group()
        backup_group.add_argument(
            "--backup",
            action="store_true",
            help="Create backup of current configuration"
        )
        backup_group.add_argument(
            "--restore",
            metavar="BACKUP_NAME",
            help="Restore configuration from backup"
        )
        backup_group.add_argument(
            "--list-backups",
            action="store_true",
            help="List available backups"
        )
    
    def _load_server_definitions(self):
        """Load server definitions from mcp_servers.json"""
        if not self.servers_json_path.exists():
            self.log(f"Server definitions not found: {self.servers_json_path}", "warning")
            # Fallback to built-in definitions
            self._use_builtin_definitions()
            return
        
        try:
            with open(self.servers_json_path, 'r') as f:
                data = json.load(f)
            
            # Handle nested structure
            servers_data = data.get('servers', data)
            
            for name, config in servers_data.items():
                # Handle different server types
                transport = config.get('transport', 'local')
                
                if transport == 'sse':
                    # SSE servers need npm proxy packages
                    if name == 'linear':
                        command = 'npx'
                        args = ['-y', 'linear-mcp']
                        env = {'LINEAR_API_KEY': ''}
                    elif name == 'context7':
                        command = 'npx'
                        args = ['-y', '@upstash/context7-mcp']
                        env = None
                    else:
                        # Generic SSE handling
                        command = 'npx'
                        args = ['-y', f'{name}-mcp']
                        env = config.get('env')
                else:
                    # Local servers - parse command
                    cmd_str = config.get('command', '')
                    parts = cmd_str.split()
                    command = parts[0] if parts else 'npx'
                    args = parts[1:] if len(parts) > 1 else []
                    env = config.get('env')
                
                self.available_servers[name] = MCPServer(
                    name=name,
                    command=command,
                    args=args,
                    env=env,
                    description=config.get('description')
                )
                
        except Exception as e:
            self.log(f"Error loading server definitions: {e}", "error")
            self._use_builtin_definitions()
    
    def _use_builtin_definitions(self):
        """Use built-in server definitions as fallback"""
        self.available_servers = {
            "sequential-thinking": MCPServer(
                name="sequential-thinking",
                command="npx",
                args=["-y", "@modelcontextprotocol/server-sequential-thinking"],
                description="Local thinking server for sequential problem solving"
            ),
            "linear": MCPServer(
                name="linear",
                command="npx",
                args=["-y", "linear-mcp"],
                env={"LINEAR_API_KEY": ""},
                description="Linear workspace integration"
            ),
            "context7": MCPServer(
                name="context7",
                command="npx",
                args=["-y", "@upstash/context7-mcp"],
                description="Context7 web search and knowledge server"
            )
        }
    
    def _get_config_path(self, scope: Scope) -> Path:
        """Get configuration file path for the given scope"""
        if scope == Scope.MACHINE:
            if sys.platform == "darwin":
                return Path("/Library/Application Support/ClaudeCode/managed-settings.json")
            else:
                return Path("/etc/claude-code/managed-settings.json")
        elif scope == Scope.USER:
            return self.home / ".claude" / "settings.json"
        else:  # PROJECT
            return Path.cwd() / ".mcp.json"
    
    def _read_config(self, path: Path) -> Dict:
        """Read configuration from file with file locking"""
        if not path.exists():
            return {}
        
        try:
            # Use file locking for consistent reads
            with FileLock(path, timeout=5):
                with open(path, 'r') as f:
                    return json.load(f)
        except TimeoutError:
            # For reads, we can be more lenient and just log a warning
            self.log(f"Warning: Could not acquire lock for reading {path}, reading anyway", "warning")
            try:
                with open(path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                self.log(f"Error reading {path}: {e}", "error")
                return {}
        except Exception as e:
            self.log(f"Error reading {path}: {e}", "error")
            return {}
    
    def _write_config(self, path: Path, config: Dict):
        """Write configuration to file with file locking"""
        # Ensure directory exists
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
        except PermissionError:
            self.log(f"Permission denied creating directory: {path.parent}", "error")
            self.log("Tip: Use --scope user or run with elevated privileges", "info")
            raise
        
        # Use file locking to prevent concurrent modifications
        try:
            with FileLock(path, timeout=10):
                # Write to temp file first for atomicity
                temp_fd, temp_path = tempfile.mkstemp(
                    dir=path.parent,
                    prefix=f".{path.name}.",
                    suffix=".tmp"
                )
                
                try:
                    # Write config to temp file
                    with os.fdopen(temp_fd, 'w') as f:
                        json.dump(config, f, indent=2)
                    
                    # Atomic rename
                    Path(temp_path).replace(path)
                    self.log(f"Updated configuration: {path}", "debug")
                    
                except Exception:
                    # Clean up temp file on error
                    try:
                        Path(temp_path).unlink()
                    except OSError:
                        pass
                    raise
                    
        except TimeoutError:
            self.log(f"Timeout waiting for lock on {path}", "error")
            self.log("Another process may be modifying the configuration", "error")
            self.log("Try again in a few seconds", "info")
            raise
        except PermissionError:
            self.log(f"Permission denied writing to: {path}", "error")
            if "Library/Application Support" in str(path) or "/etc/" in str(path):
                self.log("Machine scope requires administrator privileges", "error")
                self.log("Try one of these options:", "info")
                self.log("  1. Use --scope user instead", "info")
                self.log("  2. Run with sudo (if you have admin rights)", "info")
            raise
        except Exception as e:
            self.log(f"Error writing {path}: {e}", "error")
            raise
    
    def _get_configured_servers(self, scope: Optional[Scope] = None) -> Dict[str, Dict[Scope, Dict]]:
        """Get all configured servers, optionally filtered by scope"""
        servers = {}
        
        scopes_to_check = [scope] if scope else list(Scope)
        
        for check_scope in scopes_to_check:
            config_path = self._get_config_path(check_scope)
            config = self._read_config(config_path)
            
            for name, server_config in config.get("mcpServers", {}).items():
                if name not in servers:
                    servers[name] = {}
                servers[name][check_scope] = server_config
        
        return servers
    
    def _check_claude_json_issues(self) -> List[str]:
        """Check for problematic configurations using Config Manager"""
        # Use the Config Manager's comprehensive issue detection
        return self.config_manager.detect_issues()
    
    def _check_write_permission(self, path: Path) -> bool:
        """Check if we have write permission to a path"""
        # If file exists, check if we can write to it
        if path.exists():
            return os.access(path, os.W_OK)
        
        # If file doesn't exist, check parent directory
        parent = path.parent
        while not parent.exists() and parent != parent.parent:
            parent = parent.parent
        
        return os.access(parent, os.W_OK)
    
    def execute_status(self) -> int:
        """Show current MCP server configuration status"""
        # Handle list-backups option
        if self.args.list_backups:
            return self._list_backups()
        
        # Handle list-available option
        if self.args.list_available:
            # Prepare data for JSON output
            available_data = {}
            for name, server in sorted(self.available_servers.items()):
                server_info = {
                    "description": server.description or "",
                }
                if self.args.verbose:
                    server_info.update({
                        "command": server.command,
                        "args": server.args,
                        "env": list(server.env.keys()) if server.env else []
                    })
                available_data[name] = server_info
            
            # Output in appropriate format
            if self.args.json:
                self.output({
                    "available_servers": available_data,
                    "total": len(self.available_servers)
                })
            else:
                self.output("Available MCP Servers in Registry")
                self.output("=" * 50)
                
                for name, server in sorted(self.available_servers.items()):
                    self.output(f"\n{name}")
                    if server.description:
                        self.output(f"  Description: {server.description}")
                    if self.args.verbose:
                        self.output(f"  Command: {server.command}")
                        self.output(f"  Args: {' '.join(server.args)}")
                        if server.env:
                            self.output(f"  Environment: {', '.join(server.env.keys())}")
                
                self.output(f"\nTotal available: {len(self.available_servers)} servers")
            
            return 0
        
        # Regular status mode
        # Prepare data structure
        status_data = {
            "scopes": {},
            "servers": {},
            "issues": [],
            "conflicts": [],
            "summary": {
                "total_servers": 0
            }
        }
        
        if not self.args.json:
            self.output("MCP Server Configuration Status")
            self.output("=" * 50)
        
        # Check each scope
        all_servers = {}
        for scope in Scope:
            config_path = self._get_config_path(scope)
            scope_info = {
                "config_path": str(config_path),
                "exists": config_path.exists(),
                "servers": {}
            }
            
            if not self.args.json:
                self.output(f"\n{scope.value.title()} Scope:")
            
            if not config_path.exists():
                if not self.args.json:
                    self.output(f"  Config file: {config_path} (not found)")
                status_data["scopes"][scope.value] = scope_info
                continue
            
            if not self.args.json:
                self.output(f"  Config file: {config_path}")
            
            config = self._read_config(config_path)
            servers = config.get("mcpServers", {})
            
            if servers:
                for name, server_config in servers.items():
                    scope_info["servers"][name] = {
                        "command": server_config.get("command", "N/A"),
                        "args": server_config.get("args", [])
                    }
                    
                    if not self.args.json:
                        self.output(f"    - {name}")
                        if self.args.verbose:
                            self.output(f"      Command: {server_config.get('command', 'N/A')}")
                            if 'args' in server_config:
                                self.output(f"      Args: {' '.join(server_config['args'])}")
                    
                    if name not in all_servers:
                        all_servers[name] = []
                    all_servers[name].append(scope)
            else:
                if not self.args.json:
                    self.output("    (no servers configured)")
            
            status_data["scopes"][scope.value] = scope_info
        
        # Populate servers data
        for name, scopes in all_servers.items():
            status_data["servers"][name] = [s.value for s in scopes]
        
        # Check for issues
        issues = self._check_claude_json_issues()
        status_data["issues"] = issues
        
        if issues and not self.args.json:
            self.output("\n⚠️  Configuration Issues:")
            for issue in issues:
                self.output(f"  - {issue}")
        
        # Summary
        status_data["summary"]["total_servers"] = len(all_servers)
        if not self.args.json:
            self.output(f"\nTotal unique servers: {len(all_servers)}")
        
        # Check for conflicts
        conflicts = [name for name, scopes in all_servers.items() if len(scopes) > 1]
        status_data["conflicts"] = conflicts
        
        if conflicts and not self.args.json:
            self.output("\n⚠️  Servers configured in multiple scopes:")
            for name in conflicts:
                scopes_str = ", ".join(s.value for s in all_servers[name])
                self.output(f"  - {name}: {scopes_str}")
        
        # Output JSON if requested
        if self.args.json:
            self.output(status_data)
        
        return 0
    
    def execute_test(self) -> int:
        """Test mode - simulate add/remove operations"""
        scope = Scope(self.args.scope)
        config_path = self._get_config_path(scope)
        current_config = self._read_config(config_path)
        current_servers = current_config.get("mcpServers", {})
        
        # Check write permissions
        has_write_permission = self._check_write_permission(config_path)
        
        # Prepare result data for JSON output
        test_data = {
            "mode": "test",
            "scope": scope.value,
            "config_path": str(config_path),
            "writable": has_write_permission,
            "operation": None,
            "results": [],
            "errors": []
        }
        
        # Warn about permission issues
        if not has_write_permission and scope == Scope.MACHINE:
            permission_warning = "No write permission to machine scope - would require administrator privileges"
            test_data["errors"].append({
                "type": "permission",
                "message": permission_warning
            })
            if not self.args.json:
                self.output(f"⚠️  {permission_warning}", error=True)
        
        # ADD operation
        if self.args.add or self.args.add_all:
            test_data["operation"] = "add"
            if not self.args.json:
                self.output("[TEST MODE] Simulating MCP server operations")
                self.output(f"\nWould ADD to {scope.value} scope ({config_path}):")
            
            # Determine which servers to add
            servers_to_add = list(self.available_servers.keys()) if self.args.add_all else self.args.add
            
            for server_name in servers_to_add:
                if server_name in self.available_servers:
                    if server_name in current_servers:
                        action = "update"
                        message = f"{server_name} (already exists - would update)"
                    else:
                        action = "add"
                        message = server_name
                    
                    test_data["results"].append({
                        "server": server_name,
                        "action": action
                    })
                    
                    if not self.args.json:
                        symbol = "-" if action == "update" else "+"
                        self.output(f"  {symbol} {message}")
                else:
                    test_data["errors"].append({
                        "server": server_name,
                        "error": "not in registry"
                    })
                    
                    if not self.args.json:
                        self.output(f"  ✗ {server_name} (not in registry)", error=True)
        
        # REMOVE operation
        elif self.args.remove or self.args.remove_all:
            test_data["operation"] = "remove"
            if not self.args.json:
                self.output("[TEST MODE] Simulating MCP server operations")
                self.output(f"\nWould REMOVE from {scope.value} scope ({config_path}):")
            
            # Determine which servers to remove
            servers_to_remove = list(current_servers.keys()) if self.args.remove_all else self.args.remove
            
            if self.args.remove_all and not servers_to_remove:
                test_data["results"].append({
                    "message": "No servers configured to remove"
                })
                if not self.args.json:
                    self.output("  (no servers configured)")
            else:
                for server_name in servers_to_remove:
                    if server_name in current_servers:
                        test_data["results"].append({
                            "server": server_name,
                            "action": "remove"
                        })
                        
                        if not self.args.json:
                            self.output(f"  - {server_name}")
                    else:
                        test_data["errors"].append({
                            "server": server_name,
                            "error": "not configured in this scope"
                        })
                        
                        if not self.args.json:
                            self.output(f"  ✗ {server_name} (not configured in this scope)", error=True)
        
        # REPAIR operation
        elif self.args.repair:
            test_data["operation"] = "repair"
            issues = self._check_claude_json_issues()
            
            if issues:
                test_data["results"] = {
                    "issues_found": issues,
                    "actions": [
                        "Remove empty mcpServers:{} from ~/.claude.json",
                        "Migrate project servers to .mcp.json"
                    ]
                }
                
                if not self.args.json:
                    self.output("[TEST MODE] Simulating MCP server operations")
                    self.output("\nWould repair these issues:")
                    for issue in issues:
                        self.output(f"  - {issue}")
                    self.output("\nActions:")
                    for action in test_data["results"]["actions"]:
                        self.output(f"  - {action}")
            else:
                test_data["results"] = {"issues_found": [], "message": "No issues to repair"}
                
                if not self.args.json:
                    self.output("[TEST MODE] Simulating MCP server operations")
                    self.output("\nNo issues found to repair")
        
        # LIST operation (default)
        else:
            test_data["operation"] = "list"
            available_list = []
            
            for name, server in self.available_servers.items():
                server_info = {
                    "name": name,
                    "configured": name in current_servers,
                    "description": server.description
                }
                available_list.append(server_info)
            
            test_data["results"] = available_list
            
            if not self.args.json:
                self.output("[TEST MODE] Simulating MCP server operations")
                self.output("\nAvailable servers in registry:")
                for name, server in self.available_servers.items():
                    status = "✓ configured" if name in current_servers else "○ available"
                    self.output(f"  {status} {name}")
                    if self.args.verbose and server.description:
                        self.output(f"      {server.description}")
        
        # Final output
        if self.args.json:
            self.output(test_data)
        else:
            self.output("\nNo changes made in test mode")
        
        # Return appropriate exit code
        return 1 if test_data["errors"] else 0
    
    def _validate_server_config(self, server_name: str, server) -> Dict:
        """
        Validate a server configuration thoroughly.
        
        Args:
            server_name: Name of the server
            server: MCPServer object
            
        Returns:
            Dictionary with validation results
        """
        validation = {
            "status": "valid",
            "command": server.command,
            "checks": []
        }
        
        issues = []
        warnings = []
        
        # Check 1: Command executable accessibility
        try:
            import shutil
            if not shutil.which(server.command):
                issues.append(f"Command '{server.command}' not found in PATH")
            else:
                validation["checks"].append("command_accessible")
        except Exception as e:
            warnings.append(f"Could not check command accessibility: {e}")
        
        # Check 2: Arguments validation
        if server.args:
            if not isinstance(server.args, list):
                issues.append("Arguments must be a list")
            elif not all(isinstance(arg, str) for arg in server.args):
                issues.append("All arguments must be strings")
            else:
                validation["checks"].append("args_valid")
                validation["args"] = server.args
        
        # Check 3: Environment variables validation
        if server.env:
            if not isinstance(server.env, dict):
                issues.append("Environment must be a dictionary")
            elif not all(isinstance(k, str) and isinstance(v, str) for k, v in server.env.items()):
                issues.append("Environment keys and values must be strings")
            else:
                validation["checks"].append("env_valid")
                validation["env"] = list(server.env.keys())
        
        # Check 4: Special validation for known command types
        if server.command == "npx":
            if not server.args or len(server.args) < 2:
                issues.append("npx command requires package name in arguments")
            elif server.args[0] != "-y":
                warnings.append("Consider using '-y' flag with npx for non-interactive installation")
            else:
                validation["checks"].append("npx_format_valid")
        
        # Check 5: Description validation
        if server.description:
            validation["description"] = server.description
            validation["checks"].append("has_description")
        else:
            warnings.append("No description provided")
        
        # Determine overall status
        if issues:
            validation["status"] = "invalid"
            validation["error"] = "; ".join(issues)
        elif warnings:
            validation["status"] = "warning"
            validation["message"] = "; ".join(warnings)
            validation["warnings"] = warnings
        
        return validation

    def execute_sandbox(self) -> int:
        """Sandbox mode - test server connectivity and dependencies"""
        # Prepare data structure for JSON output
        sandbox_data = {
            "mode": "sandbox",
            "prerequisites": {},
            "servers": {},
            "environment": {},
            "summary": {
                "all_passed": True,
                "errors": []
            }
        }
        
        if not self.args.json:
            self.output("[SANDBOX MODE] Testing MCP server dependencies")
            self.output("\nChecking prerequisites:")
        
        # Test Node.js availability
        try:
            result = subprocess.run(
                ["node", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                version = result.stdout.strip()
                sandbox_data["prerequisites"]["node"] = {
                    "status": "found",
                    "version": version
                }
                if not self.args.json:
                    self.output(f"  ✓ Node.js: {version}")
            else:
                sandbox_data["prerequisites"]["node"] = {
                    "status": "not_found",
                    "error": "command failed"
                }
                sandbox_data["summary"]["all_passed"] = False
                sandbox_data["summary"]["errors"].append("Node.js not found")
                if not self.args.json:
                    self.output("  ✗ Node.js: not found", error=True)
                return 1
        except Exception as e:
            sandbox_data["prerequisites"]["node"] = {
                "status": "error",
                "error": str(e)
            }
            sandbox_data["summary"]["all_passed"] = False
            sandbox_data["summary"]["errors"].append(f"Node.js: {e}")
            if not self.args.json:
                self.output(f"  ✗ Node.js: {e}", error=True)
            return 1
        
        # Test npx availability
        try:
            result = subprocess.run(
                ["npx", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                version = result.stdout.strip()
                sandbox_data["prerequisites"]["npx"] = {
                    "status": "found",
                    "version": version
                }
                if not self.args.json:
                    self.output(f"  ✓ npx: {version}")
            else:
                sandbox_data["prerequisites"]["npx"] = {
                    "status": "not_found",
                    "error": "command failed"
                }
                sandbox_data["summary"]["all_passed"] = False
                sandbox_data["summary"]["errors"].append("npx not found")
                if not self.args.json:
                    self.output("  ✗ npx: not found", error=True)
                return 1
        except Exception as e:
            sandbox_data["prerequisites"]["npx"] = {
                "status": "error",
                "error": str(e)
            }
            sandbox_data["summary"]["all_passed"] = False
            sandbox_data["summary"]["errors"].append(f"npx: {e}")
            if not self.args.json:
                self.output(f"  ✗ npx: {e}", error=True)
            return 1
        
        # Test Claude CLI (optional) with version compatibility checking
        try:
            result = subprocess.run(
                ["claude", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                version = result.stdout.strip()
                
                # Check version compatibility
                compatibility = check_claude_version_compatibility(version)
                
                sandbox_data["prerequisites"]["claude_cli"] = {
                    "status": "found",
                    "version": version,
                    "required": False,
                    "compatibility": compatibility
                }
                
                if not self.args.json:
                    # Display based on compatibility status
                    if compatibility["status"] == "excellent":
                        self.output(f"  ✓ Claude CLI: {version} (excellent)")
                    elif compatibility["status"] == "warning":
                        self.output(f"  ⚠ Claude CLI: {version} (basic MCP support)", error=False)
                        self.output(f"    {compatibility['action']}", error=False)
                    elif compatibility["status"] == "incompatible":
                        self.output(f"  ✗ Claude CLI: {version} (incompatible)", error=True)
                        self.output(f"    {compatibility['action']}", error=True)
                        sandbox_data["summary"]["warnings"].append(f"Claude CLI version incompatible: {compatibility['message']}")
                    
                # Add warnings for non-excellent versions
                if compatibility["status"] != "excellent":
                    sandbox_data["summary"]["warnings"].append(compatibility["message"])
                    
            else:
                sandbox_data["prerequisites"]["claude_cli"] = {
                    "status": "not_found",
                    "required": False,
                    "compatibility": None
                }
                if not self.args.json:
                    self.output("  ⚠ Claude CLI: not found (optional)", error=False)
        except Exception as e:
            sandbox_data["prerequisites"]["claude_cli"] = {
                "status": "error",
                "required": False,
                "error": str(e),
                "compatibility": None
            }
            if not self.args.json:
                self.output("  ⚠ Claude CLI: not found (optional)", error=False)
        
        # Test server packages
        if not self.args.json:
            self.output("\nTesting server availability:")
        
        # Determine which servers to test
        if self.args.add:
            servers_to_test = self.args.add
        elif self.args.add_all:
            servers_to_test = list(self.available_servers.keys())
        else:
            servers_to_test = list(self.available_servers.keys())
        
        all_passed = True
        
        for server_name in servers_to_test:
            if server_name not in self.available_servers:
                sandbox_data["servers"][server_name] = {
                    "status": "not_in_registry",
                    "error": "Server not found in registry"
                }
                sandbox_data["summary"]["errors"].append(f"{server_name}: not in registry")
                all_passed = False
                if not self.args.json:
                    self.output(f"  ✗ {server_name}: not in registry", error=True)
                continue
            
            server = self.available_servers[server_name]
            
            # Check if it's an npm package
            if server.command == "npx" and server.args and server.args[0] == "-y":
                package_name = server.args[1] if len(server.args) > 1 else "unknown"
                
                # Test if package exists (dry run)
                try:
                    result = subprocess.run(
                        ["npm", "view", package_name, "version"],
                        capture_output=True,
                        text=True,
                        timeout=10
                    )
                    if result.returncode == 0:
                        version = result.stdout.strip()
                        sandbox_data["servers"][server_name] = {
                            "status": "available",
                            "package": package_name,
                            "version": version
                        }
                        if not self.args.json:
                            self.output(f"  ✓ {server_name}: npm package available (v{version})")
                    else:
                        sandbox_data["servers"][server_name] = {
                            "status": "not_found",
                            "package": package_name,
                            "error": "npm package not found"
                        }
                        sandbox_data["summary"]["errors"].append(f"{server_name}: npm package not found")
                        all_passed = False
                        if not self.args.json:
                            self.output(f"  ✗ {server_name}: npm package not found", error=True)
                except Exception as e:
                    sandbox_data["servers"][server_name] = {
                        "status": "error",
                        "package": package_name,
                        "error": str(e)
                    }
                    sandbox_data["summary"]["errors"].append(f"{server_name}: {e}")
                    all_passed = False
                    if not self.args.json:
                        self.output(f"  ✗ {server_name}: error checking package: {e}", error=True)
            else:
                # Enhanced validation for custom commands
                validation_result = self._validate_server_config(server_name, server)
                sandbox_data["servers"][server_name] = validation_result
                
                if validation_result["status"] == "valid":
                    if not self.args.json:
                        self.output(f"  ✓ {server_name}: configuration valid")
                elif validation_result["status"] == "warning":
                    if not self.args.json:
                        self.output(f"  ⚠ {server_name}: {validation_result.get('message', 'warnings detected')}")
                else:
                    all_passed = False
                    sandbox_data["summary"]["errors"].append(f"{server_name}: {validation_result.get('error', 'validation failed')}")
                    if not self.args.json:
                        self.output(f"  ✗ {server_name}: {validation_result.get('error', 'validation failed')}", error=True)
        
        # Check environment variables for servers that need them
        if not self.args.json:
            self.output("\nChecking required environment variables:")
        
        env_required = {
            "linear": "LINEAR_API_KEY"
        }
        
        for server_name, env_var in env_required.items():
            if server_name in servers_to_test:
                if os.getenv(env_var):
                    sandbox_data["environment"][env_var] = {
                        "status": "set",
                        "required_for": server_name
                    }
                    if not self.args.json:
                        self.output(f"  ✓ {env_var}: set")
                else:
                    sandbox_data["environment"][env_var] = {
                        "status": "not_set",
                        "required_for": server_name
                    }
                    if not self.args.json:
                        self.output(f"  ⚠ {env_var}: not set (required for {server_name})")
        
        # Update final status
        sandbox_data["summary"]["all_passed"] = all_passed
        
        # Output JSON if requested
        if self.args.json:
            self.output(sandbox_data)
        
        return 0 if all_passed else 1
    
    def execute_live(self) -> int:
        """Live mode - actually modify MCP server configurations"""
        self.output("[LIVE MODE] Modifying MCP server configuration")
        
        scope = Scope(self.args.scope)
        config_path = self._get_config_path(scope)
        
        if self.args.add or self.args.add_all:
            return self._add_servers(scope, config_path)
        elif self.args.remove or self.args.remove_all:
            return self._remove_servers(scope, config_path)
        elif self.args.repair:
            return self._repair_configuration()
        elif self.args.backup:
            return self._create_backup(scope, config_path)
        elif self.args.restore:
            return self._restore_backup(self.args.restore)
        else:
            self.output("No operation specified. Use --add, --remove, --add-all, --remove-all, --backup, --restore, or --repair")
            return 1
    
    def _add_servers(self, scope: Scope, config_path: Path) -> int:
        """Add servers to configuration"""
        self.output(f"\nAdding servers to {scope.value} scope")
        
        # Load current configuration
        config = self._read_config(config_path)
        if "mcpServers" not in config:
            config["mcpServers"] = {}
        
        added = []
        failed = []
        
        # Determine which servers to add
        servers_to_add = list(self.available_servers.keys()) if self.args.add_all else self.args.add
        
        for server_name in servers_to_add:
            if server_name not in self.available_servers:
                self.output(f"  ✗ {server_name}: not in registry", error=True)
                failed.append(server_name)
                continue
            
            server = self.available_servers[server_name]
            
            # Check if already exists
            if server_name in config["mcpServers"]:
                if not self.confirm(f"{server_name} already exists in {scope.value} scope. Update?"):
                    self.output(f"  - Skipped {server_name}")
                    continue
            
            # Add server configuration
            config["mcpServers"][server_name] = server.to_config()
            added.append(server_name)
            self.output(f"  ✓ Added {server_name}")
        
        if added:
            # Write configuration
            try:
                self._write_config(config_path, config)
                self.output(f"\nSuccessfully added {len(added)} server(s) to {config_path}")
                
                # Remind about environment variables
                for server_name in added:
                    if server_name == "linear":
                        self.output("\n⚠️  Remember to set LINEAR_API_KEY environment variable")
                
            except Exception as e:
                self.output(f"Failed to write configuration: {e}", error=True)
                return 1
        
        return 0 if not failed else 1
    
    def _remove_servers(self, scope: Scope, config_path: Path) -> int:
        """Remove servers from configuration"""
        self.output(f"\nRemoving servers from {scope.value} scope")
        
        # Load current configuration
        config = self._read_config(config_path)
        if "mcpServers" not in config:
            self.output("No servers configured in this scope")
            return 0
        
        removed = []
        not_found = []
        
        # Determine which servers to remove
        if self.args.remove_all:
            servers_to_remove = list(config["mcpServers"].keys())
            if not servers_to_remove:
                self.output("No servers configured to remove")
                return 0
        else:
            servers_to_remove = self.args.remove
        
        for server_name in servers_to_remove:
            if server_name in config["mcpServers"]:
                del config["mcpServers"][server_name]
                removed.append(server_name)
                self.output(f"  ✓ Removed {server_name}")
            else:
                not_found.append(server_name)
                self.output(f"  ✗ {server_name}: not found in {scope.value} scope", error=True)
        
        if removed:
            # Write configuration
            try:
                self._write_config(config_path, config)
                self.output(f"\nSuccessfully removed {len(removed)} server(s) from {config_path}")
            except Exception as e:
                self.output(f"Failed to write configuration: {e}", error=True)
                return 1
        
        return 0 if not not_found else 1
    
    def _repair_configuration(self) -> int:
        """Repair configuration issues"""
        self.output("\nRepairing MCP configuration issues")
        
        issues = self._check_claude_json_issues()
        if not issues:
            self.output("No issues found to repair")
            return 0
        
        claude_json_path = self.home / ".claude.json"
        
        try:
            with open(claude_json_path, 'r') as f:
                config = json.load(f)
            
            # Remove problematic project overrides
            projects = config.get("projects", {})
            cwd = str(Path.cwd())
            
            if cwd in projects and "mcpServers" in projects[cwd]:
                if not self.confirm("Remove mcpServers override from ~/.claude.json?"):
                    self.output("Repair cancelled")
                    return 1
                
                # Save servers before removing
                project_servers = projects[cwd]["mcpServers"]
                del projects[cwd]["mcpServers"]
                
                # Clean up empty project entry
                if not projects[cwd]:
                    del projects[cwd]
                
                # Write back
                with open(claude_json_path, 'w') as f:
                    json.dump(config, f, indent=2)
                
                self.output("  ✓ Removed mcpServers override from ~/.claude.json")
                
                # Migrate servers if any
                if project_servers:
                    project_config_path = Path.cwd() / ".mcp.json"
                    project_config = self._read_config(project_config_path)
                    
                    if "mcpServers" not in project_config:
                        project_config["mcpServers"] = {}
                    
                    project_config["mcpServers"].update(project_servers)
                    self._write_config(project_config_path, project_config)
                    
                    self.output(f"  ✓ Migrated {len(project_servers)} server(s) to .mcp.json")
            
            self.output("\nRepair completed successfully")
            self.output("Restart Claude Code for changes to take effect")
            return 0
            
        except Exception as e:
            self.output(f"Failed to repair configuration: {e}", error=True)
            return 1
    
    def _list_backups(self) -> int:
        """List available backups"""
        if not self.backup_dir.exists():
            self.output("No backups found")
            return 0
        
        backups = []
        for backup_file in sorted(self.backup_dir.glob("*.json"), reverse=True):
            # Parse backup filename: scope_YYYYMMDD_HHMMSS.json
            parts = backup_file.stem.split('_')
            if len(parts) >= 3:
                scope = parts[0]
                date_str = parts[1]
                time_str = parts[2]
                
                # Format for display
                date_formatted = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
                time_formatted = f"{time_str[:2]}:{time_str[2:4]}:{time_str[4:6]}"
                
                backups.append({
                    "name": backup_file.name,
                    "scope": scope,
                    "date": date_formatted,
                    "time": time_formatted,
                    "size": backup_file.stat().st_size
                })
        
        if self.args.json:
            self.output({"backups": backups})
        else:
            self.output("Available backups:")
            self.output("=" * 60)
            
            if not backups:
                self.output("  (no backups found)")
            else:
                for backup in backups:
                    self.output(f"\n{backup['name']}")
                    self.output(f"  Scope: {backup['scope']}")
                    self.output(f"  Date: {backup['date']} {backup['time']}")
                    self.output(f"  Size: {backup['size']} bytes")
        
        return 0
    
    def _create_backup(self, scope: Scope, config_path: Path) -> int:
        """Create backup of current configuration"""
        # Read current config
        config = self._read_config(config_path)
        if not config or "mcpServers" not in config:
            self.output(f"No configuration to backup in {scope.value} scope")
            return 0
        
        # Create backup directory
        self.backup_dir.mkdir(exist_ok=True)
        
        # Generate backup filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"{scope.value}_{timestamp}.json"
        backup_path = self.backup_dir / backup_name
        
        # Write backup
        try:
            with open(backup_path, 'w') as f:
                json.dump(config, f, indent=2)
            
            self.output(f"Created backup: {backup_name}")
            self.output(f"Location: {backup_path}")
            
            # Show what was backed up
            server_count = len(config.get("mcpServers", {}))
            self.output(f"Backed up {server_count} server(s) from {scope.value} scope")
            
            return 0
            
        except Exception as e:
            self.output(f"Failed to create backup: {e}", error=True)
            return 1
    
    def _restore_backup(self, backup_name: str) -> int:
        """Restore configuration from backup"""
        backup_path = self.backup_dir / backup_name
        
        if not backup_path.exists():
            self.output(f"Backup not found: {backup_name}", error=True)
            self.output("Use --list-backups to see available backups")
            return 1
        
        # Parse scope from backup name
        parts = backup_name.split('_')
        if not parts:
            self.output("Invalid backup filename", error=True)
            return 1
        
        try:
            scope = Scope(parts[0])
        except ValueError:
            self.output(f"Invalid scope in backup: {parts[0]}", error=True)
            return 1
        
        config_path = self._get_config_path(scope)
        
        # Read backup
        try:
            with open(backup_path, 'r') as f:
                backup_config = json.load(f)
        except Exception as e:
            self.output(f"Failed to read backup: {e}", error=True)
            return 1
        
        # Confirm restore
        server_count = len(backup_config.get("mcpServers", {}))
        if not self.confirm(f"Restore {server_count} server(s) to {scope.value} scope?"):
            self.output("Restore cancelled")
            return 1
        
        # Create backup of current config before restoring
        current_config = self._read_config(config_path)
        if current_config and "mcpServers" in current_config:
            self.output("Creating backup of current configuration...")
            self._create_backup(scope, config_path)
        
        # Restore configuration
        try:
            self._write_config(config_path, backup_config)
            self.output(f"\nRestored configuration from {backup_name}")
            self.output(f"Restored {server_count} server(s) to {scope.value} scope")
            self.output("Restart Claude Code for changes to take effect")
            return 0
            
        except Exception as e:
            self.output(f"Failed to restore configuration: {e}", error=True)
            return 1


def main():
    manager = MCPServerManager()
    sys.exit(manager.run())


if __name__ == "__main__":
    main()