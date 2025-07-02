#!/usr/bin/env python3
"""
MCP Server Installation and Testing Script

This script manages MCP (Model Context Protocol) servers for Claude Code CLI with:
- Dynamic server configuration from mcp_servers.json
- Selective installation/uninstallation of servers
- Interactive server selection menu
- Configuration hierarchy awareness and conflict resolution
- Installation scope selection (user or local)
- Safe synchronous processing to avoid config file corruption
- Comprehensive testing and verification
- Automatic Node.js installation attempt

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
"""

import json
import os
import subprocess
import sys
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set
import argparse
from datetime import datetime
import urllib.request
import urllib.error
import re


class Scope(Enum):
    MACHINE = "machine"  # System-wide configuration
    USER = "user"  # Available to user across all projects
    PROJECT = "project"  # Project-specific configuration
    LOCAL = "local"  # Alias for project (deprecated)


class Mode(Enum):
    INSTALL = "install"
    UNINSTALL = "uninstall"
    TEST = "test"
    LIST = "list"
    VERIFY = "verify"
    REPAIR = "repair"
    ADD = "add"
    REMOVE = "remove"
    MIGRATE = "migrate"


@dataclass
class MCPServer:
    name: str
    description: str
    transport: str
    command: str
    test_prompt: str
    validation_pattern: str
    requires_auth: bool = False
    auth_instructions: Optional[str] = None
    category: str = "general"
    homepage: Optional[str] = None
    
    @classmethod
    def from_dict(cls, name: str, data: Dict):
        """Create MCPServer from dictionary."""
        return cls(
            name=name,
            description=data.get('description', ''),
            transport=data.get('transport', 'local'),
            command=data.get('command', ''),
            test_prompt=data.get('test_prompt', ''),
            validation_pattern=data.get('validation_pattern', ''),
            requires_auth=data.get('requires_auth', False),
            auth_instructions=data.get('auth_instructions'),
            category=data.get('category', 'general'),
            homepage=data.get('homepage')
        )


@dataclass
class ConfigurationState:
    """Represents the current state of MCP configurations."""
    user_servers: Dict[str, Dict] = field(default_factory=dict)
    project_servers: Dict[str, Dict] = field(default_factory=dict)
    project_path: str = ""
    has_project_override: bool = False
    conflicts: List[str] = field(default_factory=list)


class Colors:
    RED = "\033[0;31m"
    GREEN = "\033[0;32m"
    YELLOW = "\033[1;33m"
    BLUE = "\033[0;34m"
    PURPLE = "\033[0;35m"
    CYAN = "\033[0;36m"
    RESET = "\033[0m"
    BOLD = "\033[1m"


class ServerRegistry:
    """Manages available MCP servers from configuration files."""
    
    def __init__(self):
        self.servers: Dict[str, MCPServer] = {}
        self.categories: Dict[str, str] = {}
        self.load_servers()
    
    def load_servers(self):
        """Load server definitions from configuration files."""
        # Look for config files in multiple locations
        config_paths = [
            Path.cwd() / "mcp_servers.json",  # Project directory
            Path(__file__).parent / "mcp_servers.json",  # Script directory
            Path.home() / ".claude" / "mcp_servers.json",  # User directory
            Path("/etc/claude/mcp_servers.json"),  # System directory
        ]
        
        config_loaded = False
        for config_path in config_paths:
            if config_path.exists():
                try:
                    with open(config_path, 'r') as f:
                        config = json.load(f)
                    
                    # Load servers
                    if 'servers' in config:
                        for name, server_data in config['servers'].items():
                            self.servers[name] = MCPServer.from_dict(name, server_data)
                    
                    # Load categories
                    if 'categories' in config:
                        self.categories = config['categories']
                    
                    config_loaded = True
                    break
                    
                except Exception as e:
                    print(f"{Colors.WARNING}Warning: Failed to load {config_path}: {e}{Colors.RESET}")
        
        if not config_loaded:
            # Fall back to hardcoded defaults
            self._load_default_servers()
    
    def _load_default_servers(self):
        """Load default hardcoded servers if no config file found."""
        defaults = {
            "sequential-thinking": MCPServer(
                name="sequential-thinking",
                description="Dynamic problem-solving through sequential thought processes",
                transport="local",
                command="npx -y @modelcontextprotocol/server-sequential-thinking",
                test_prompt="Help me think through a simple decision: tea or coffee?",
                validation_pattern=r"step|think|reasoning|decision",
                category="reasoning"
            ),
            "linear": MCPServer(
                name="linear",
                description="Linear workspace integration for issue tracking",
                transport="sse",
                command="https://mcp.linear.app/sse",
                test_prompt="List my Linear workspaces",
                validation_pattern=r"401|unauthorized|authentication|workspace",
                requires_auth=True,
                auth_instructions="Set LINEAR_API_KEY environment variable",
                category="productivity"
            ),
            "context7": MCPServer(
                name="context7",
                description="Web search and knowledge retrieval",
                transport="sse",
                command="https://mcp.context7.com/sse",
                test_prompt="What is React? use context7",
                validation_pattern=r"context7|documentation|library",
                category="knowledge"
            )
        }
        self.servers = defaults
        self.categories = {
            "reasoning": "Reasoning and thinking tools",
            "productivity": "Productivity and project management",
            "knowledge": "Knowledge retrieval and search"
        }
    
    def get_servers_by_category(self) -> Dict[str, List[MCPServer]]:
        """Group servers by category."""
        categorized = {}
        for server in self.servers.values():
            category = server.category
            if category not in categorized:
                categorized[category] = []
            categorized[category].append(server)
        return categorized
    
    def get_server(self, name: str) -> Optional[MCPServer]:
        """Get a server by name."""
        return self.servers.get(name)
    
    def list_servers(self) -> List[MCPServer]:
        """Get all available servers."""
        return list(self.servers.values())


class MCPInstaller:
    def __init__(self, mode: Mode, scope: Optional[Scope], dry_run: bool, force: bool = False):
        self.mode = mode
        self.scope = scope
        self.dry_run = dry_run
        self.force = force
        self.issues: List[str] = []
        self.registry = ServerRegistry()
        self.selected_servers: List[MCPServer] = []
        
    def log(self, message: str, level: str = "info"):
        colors = {
            "info": Colors.CYAN,
            "success": Colors.GREEN,
            "warning": Colors.YELLOW,
            "error": Colors.RED,
            "dryrun": Colors.PURPLE,
            "section": Colors.BLUE,
            "bold": Colors.BOLD
        }
        
        prefixes = {
            "info": "[INFO]",
            "success": "[SUCCESS]",
            "warning": "[WARNING]",
            "error": "[ERROR]",
            "dryrun": "[DRY-RUN]",
            "section": "",
            "bold": ""
        }
        
        if level == "section":
            print(f"\n{colors[level]}{'=' * 60}{Colors.RESET}")
            print(f"{colors[level]} {message}{Colors.RESET}")
            if self.dry_run:
                print(f"{Colors.PURPLE} (DRY RUN MODE - NO CHANGES WILL BE MADE){Colors.RESET}")
            print(f"{colors[level]}{'=' * 60}{Colors.RESET}")
        else:
            print(f"{colors.get(level, '')}{prefixes.get(level, '')} {message}{Colors.RESET}")
    
    def add_issue(self, issue: str):
        self.issues.append(issue)
    
    def list_configured_servers(self, scope: Optional[Scope] = None):
        """List MCP servers configured at different scopes."""
        self.log("Configured MCP Servers", "section")
        
        configs_to_check = []
        
        if scope is None or scope == Scope.MACHINE:
            # Check machine scope
            machine_path = self.get_config_path(Scope.MACHINE)
            if machine_path.exists():
                configs_to_check.append(("Machine", machine_path, Scope.MACHINE))
        
        if scope is None or scope == Scope.USER:
            # Check user scope
            user_path = self.get_config_path(Scope.USER)
            if user_path.exists():
                configs_to_check.append(("User", user_path, Scope.USER))
        
        if scope is None or scope == Scope.PROJECT:
            # Check project scope
            project_path = self.get_config_path(Scope.PROJECT)
            if project_path.exists():
                configs_to_check.append(("Project", project_path, Scope.PROJECT))
        
        # Also check ~/.claude.json for legacy configurations
        legacy_path = Path.home() / ".claude.json"
        if legacy_path.exists() and scope is None:
            configs_to_check.append(("Legacy (~/.claude.json)", legacy_path, None))
        
        if not configs_to_check:
            self.log("No configuration files found", "warning")
            return
        
        for scope_name, config_path, scope_enum in configs_to_check:
            print(f"\n{Colors.BOLD}{scope_name} scope ({config_path}):{Colors.RESET}")
            
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
                
                servers = {}
                
                # Handle legacy ~/.claude.json format
                if scope_enum is None and 'mcpServers' in config:
                    servers['Global'] = config.get('mcpServers', {})
                    
                    # Check for project-specific servers
                    if 'projects' in config:
                        for proj_path, proj_config in config['projects'].items():
                            if 'mcpServers' in proj_config:
                                servers[f"Project: {proj_path}"] = proj_config['mcpServers']
                else:
                    # Standard format
                    servers[''] = config.get('mcpServers', {})
                
                for section, server_dict in servers.items():
                    if section:
                        print(f"  {Colors.YELLOW}{section}:{Colors.RESET}")
                    
                    if server_dict:
                        for name, server_config in server_dict.items():
                            # Display server info
                            if isinstance(server_config, dict):
                                cmd = server_config.get('command', 'unknown')
                                args = server_config.get('args', [])
                                if args:
                                    cmd_str = f"{cmd} {' '.join(args)}"
                                else:
                                    cmd_str = cmd
                                print(f"    • {Colors.CYAN}{name}{Colors.RESET}: {cmd_str}")
                                
                                # Show environment variables if present
                                if 'env' in server_config:
                                    for env_var in server_config['env'].keys():
                                        print(f"      Environment: {env_var}")
                    else:
                        if not section:
                            print(f"  {Colors.YELLOW}(no servers configured){Colors.RESET}")
                        else:
                            print(f"    {Colors.YELLOW}(empty - overrides higher scopes!){Colors.RESET}")
                        
            except Exception as e:
                print(f"  {Colors.RED}Error reading configuration: {e}{Colors.RESET}")
        
        # Show hierarchy note
        if scope is None:
            print(f"\n{Colors.BOLD}Configuration precedence:{Colors.RESET}")
            print("  1. Project scope (highest priority)")
            print("  2. User scope")
            print("  3. Machine scope (lowest priority)")
            print(f"\n{Colors.YELLOW}Note: Empty mcpServers at any level will override all lower levels!{Colors.RESET}")

    def list_available_servers(self):
        """Display all available servers."""
        self.log("Available MCP Servers", "section")
        
        categorized = self.registry.get_servers_by_category()
        
        for category, servers in sorted(categorized.items()):
            category_desc = self.registry.categories.get(category, category.title())
            print(f"\n{Colors.BOLD}{category_desc}:{Colors.RESET}")
            
            for server in sorted(servers, key=lambda s: s.name):
                auth_marker = " (auth required)" if server.requires_auth else ""
                print(f"  • {Colors.CYAN}{server.name}{Colors.RESET} - {server.description}{auth_marker}")
                if server.homepage:
                    print(f"    {Colors.BLUE}Homepage: {server.homepage}{Colors.RESET}")
    
    def select_servers_from_cli(self, server_names: str) -> List[MCPServer]:
        """Select servers based on CLI argument."""
        if server_names.lower() == "all":
            return self.registry.list_servers()
        
        selected = []
        names = [name.strip() for name in server_names.split(",")]
        
        for name in names:
            server = self.registry.get_server(name)
            if server:
                selected.append(server)
            else:
                self.log(f"Unknown server: {name}", "warning")
                self.add_issue(f"Server '{name}' not found in registry")
        
        return selected
    
    def interactive_select_servers(self, current_installed: Set[str]) -> List[MCPServer]:
        """Interactive menu for server selection."""
        self.log("Select MCP Servers to Install", "section")
        
        # Get all servers and sort by category
        categorized = self.registry.get_servers_by_category()
        all_servers = []
        
        print("\nAvailable servers:")
        print("(Already installed servers are marked with ✓)")
        print("")
        
        idx = 1
        server_map = {}
        
        for category, servers in sorted(categorized.items()):
            category_desc = self.registry.categories.get(category, category.title())
            print(f"\n{Colors.BOLD}{category_desc}:{Colors.RESET}")
            
            for server in sorted(servers, key=lambda s: s.name):
                installed = "✓" if server.name in current_installed else " "
                auth = " (auth)" if server.requires_auth else ""
                print(f"  {idx:2d}. [{installed}] {server.name} - {server.description}{auth}")
                server_map[idx] = server
                all_servers.append(server)
                idx += 1
        
        print(f"\n{Colors.BOLD}Options:{Colors.RESET}")
        print("  • Enter numbers separated by commas (e.g., 1,3,5)")
        print("  • Enter 'all' or press Enter to select all servers")
        print("  • Enter 'none' to cancel")
        
        while True:
            choice = input("\nSelect servers: ").strip()
            
            if choice.lower() == 'none':
                return []
            
            if choice.lower() == 'all' or choice == '':
                return all_servers
            
            # Parse numbers
            try:
                numbers = [int(n.strip()) for n in choice.split(',')]
                selected = []
                
                for num in numbers:
                    if num in server_map:
                        selected.append(server_map[num])
                    else:
                        print(f"{Colors.YELLOW}Invalid number: {num}{Colors.RESET}")
                        raise ValueError
                
                return selected
                
            except ValueError:
                print(f"{Colors.YELLOW}Invalid input. Please enter numbers separated by commas.{Colors.RESET}")
    
    def explain_hierarchy(self):
        """Explain Claude's configuration hierarchy to the user."""
        self.log("Understanding Claude's Configuration Hierarchy", "section")
        
        print(f"\n{Colors.BOLD}Claude uses a configuration hierarchy:{Colors.RESET}\n")
        print(f"  1. {Colors.YELLOW}Project-specific settings{Colors.RESET} (highest priority)")
        print(f"     Location: ~/.claude.json → projects[\"/path\"].mcpServers")
        print(f"     Scope: Only affects the specific project directory")
        print()
        print(f"  2. {Colors.GREEN}User-level settings{Colors.RESET} (lower priority)")
        print(f"     Location: ~/.claude.json → mcpServers")
        print(f"     Scope: Available across all projects\n")
        
        print(f"{Colors.BOLD}Important:{Colors.RESET} Project-specific settings override user-level settings!")
        print("Empty project-specific mcpServers will hide user-level servers.\n")
    
    def get_config_path(self, scope: Scope) -> Path:
        """Get the configuration file path for the given scope."""
        home = Path.home()
        
        if scope == Scope.MACHINE:
            # System-wide configuration
            if sys.platform == "darwin":  # macOS
                return Path("/Library/Application Support/ClaudeCode/managed-settings.json")
            else:  # Linux
                return Path("/etc/claude-code/managed-settings.json")
        elif scope == Scope.USER:
            # User scope - use proper settings file, not .claude.json
            return home / ".claude" / "settings.json"
        else:  # PROJECT or LOCAL
            # Project scope - use .mcp.json in current directory
            return Path.cwd() / ".mcp.json"
    
    def analyze_current_configuration(self) -> ConfigurationState:
        """Analyze the current configuration state."""
        config_path = Path.home() / ".claude.json"
        current_dir = str(Path.cwd())
        state = ConfigurationState()
        state.project_path = current_dir
        
        if not config_path.exists():
            return state
        
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            # Get user-level servers
            state.user_servers = config.get('mcpServers', {})
            
            # Check for project-specific servers
            if 'projects' in config and current_dir in config['projects']:
                project_config = config['projects'][current_dir]
                if 'mcpServers' in project_config:
                    state.has_project_override = True
                    state.project_servers = project_config['mcpServers']
                    
                    # Detect conflicts
                    if not state.project_servers and state.user_servers:
                        state.conflicts.append("Empty project-specific mcpServers is hiding user-level servers")
                    
                    # Check for inconsistencies
                    for server_name in state.user_servers:
                        if server_name in state.project_servers:
                            user_config = state.user_servers[server_name]
                            proj_config = state.project_servers[server_name]
                            if user_config != proj_config:
                                state.conflicts.append(f"Server '{server_name}' has different configurations at user and project levels")
        
        except Exception as e:
            self.log(f"Error analyzing configuration: {e}", "error")
        
        return state
    
    def display_current_state(self, state: ConfigurationState):
        """Display the current configuration state."""
        self.log("Current Configuration State", "section")
        
        print(f"\n{Colors.BOLD}Current working directory:{Colors.RESET} {state.project_path}")
        
        print(f"\n{Colors.BOLD}User-level MCP servers:{Colors.RESET}")
        if state.user_servers:
            for name, config in state.user_servers.items():
                transport = config.get('transport', 'unknown')
                if transport == 'sse':
                    location = config.get('uri', 'undefined')
                else:
                    cmd = config.get('command', [])
                    location = ' '.join(cmd) if isinstance(cmd, list) else str(cmd)
                print(f"  • {name}: {location}")
        else:
            print("  (none)")
        
        if state.has_project_override:
            print(f"\n{Colors.BOLD}Project-specific MCP servers:{Colors.RESET}")
            if state.project_servers:
                for name, config in state.project_servers.items():
                    transport = config.get('transport', 'unknown')
                    if transport == 'sse':
                        location = config.get('uri', 'undefined')
                    else:
                        cmd = config.get('command', [])
                        location = ' '.join(cmd) if isinstance(cmd, list) else str(cmd)
                    print(f"  • {name}: {location}")
            else:
                print(f"  {Colors.YELLOW}(empty - this hides user-level servers!){Colors.RESET}")
        
        if state.conflicts:
            print(f"\n{Colors.YELLOW}⚠️  Configuration issues detected:{Colors.RESET}")
            for conflict in state.conflicts:
                print(f"  • {conflict}")
    
    def resolve_conflicts(self, state: ConfigurationState, target_scope: Scope) -> bool:
        """Interactively resolve configuration conflicts."""
        if not state.conflicts and not (state.has_project_override and target_scope == Scope.USER):
            return True
        
        self.log("Configuration Conflict Resolution", "section")
        
        if target_scope == Scope.USER and state.has_project_override:
            print(f"\n{Colors.YELLOW}Installing at user scope, but project-specific overrides exist.{Colors.RESET}")
            print("Project-specific settings will take precedence in this directory.")
            print("\nOptions:")
            print("  1. Remove project-specific mcpServers (recommended)")
            print("  2. Keep project-specific settings (user-level install won't be visible here)")
            print("  3. Cancel installation")
            
            if self.dry_run:
                self.log("Would prompt for conflict resolution", "dryrun")
                return True
            
            while True:
                choice = input("\nSelect option (1-3): ")
                if choice == "1":
                    return self.remove_project_overrides(state.project_path)
                elif choice == "2":
                    self.log("Keeping project-specific settings", "warning")
                    return True
                elif choice == "3":
                    return False
                else:
                    print(f"{Colors.YELLOW}Invalid choice. Please select 1, 2, or 3.{Colors.RESET}")
        
        return True
    
    def remove_project_overrides(self, project_path: str) -> bool:
        """Remove project-specific mcpServers."""
        if self.dry_run:
            self.log(f"Would remove project-specific mcpServers for: {project_path}", "dryrun")
            return True
        
        config_path = Path.home() / ".claude.json"
        
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            if 'projects' in config and project_path in config['projects']:
                if 'mcpServers' in config['projects'][project_path]:
                    del config['projects'][project_path]['mcpServers']
                    
                    with open(config_path, 'w') as f:
                        json.dump(config, f, indent=2)
                    
                    self.log(f"Removed project-specific mcpServers for: {project_path}", "success")
            
            return True
            
        except Exception as e:
            self.log(f"Error removing project overrides: {e}", "error")
            return False
    
    def check_prerequisites(self) -> bool:
        self.log("Checking Prerequisites", "section")
        
        required_tools = [
            ("claude", "Claude CLI", True, None),
            ("node", "Node.js (for local servers)", False, self.install_node),
            ("curl", "Network testing", False, None)
        ]
        
        all_good = True
        for tool, description, required, installer in required_tools:
            try:
                result = subprocess.run([tool, "--version"], capture_output=True, text=True)
                if result.returncode == 0:
                    version = result.stdout.strip().split('\n')[0]
                    self.log(f"{description} found: {version}", "success")
                else:
                    raise FileNotFoundError
            except FileNotFoundError:
                if required:
                    self.log(f"{description} not found. Please install Claude Code first.", "error")
                    all_good = False
                else:
                    if installer and not self.dry_run:
                        self.log(f"{description} not found. Attempting to install...", "warning")
                        if installer():
                            self.log(f"{description} installed successfully", "success")
                        else:
                            self.log(f"{description} not found. Some features will be limited.", "warning")
                            self.add_issue(f"{tool} command not available")
                    else:
                        self.log(f"{description} not found. Some features will be limited.", "warning")
                        self.add_issue(f"{tool} command not available")
        
        return all_good
    
    def install_node(self) -> bool:
        """Attempt to install Node.js using available package managers."""
        system = sys.platform
        
        try:
            if system == "darwin":  # macOS
                # Check if Homebrew is available
                if subprocess.run(["which", "brew"], capture_output=True).returncode == 0:
                    self.log("Installing Node.js via Homebrew...", "info")
                    subprocess.run(["brew", "install", "node"], check=True)
                    return True
            elif system.startswith("linux"):
                # Try apt-get first
                if subprocess.run(["which", "apt-get"], capture_output=True).returncode == 0:
                    self.log("Installing Node.js via apt-get...", "info")
                    subprocess.run(["sudo", "apt-get", "update"], check=True)
                    subprocess.run(["sudo", "apt-get", "install", "-y", "nodejs", "npm"], check=True)
                    return True
                # Try yum
                elif subprocess.run(["which", "yum"], capture_output=True).returncode == 0:
                    self.log("Installing Node.js via yum...", "info")
                    subprocess.run(["sudo", "yum", "install", "-y", "nodejs", "npm"], check=True)
                    return True
            
            # If we can't auto-install, provide instructions
            self.log("Cannot auto-install Node.js. Please install manually:", "warning")
            self.log("  macOS: brew install node", "info")
            self.log("  Ubuntu/Debian: sudo apt-get install nodejs npm", "info")
            self.log("  RHEL/CentOS: sudo yum install nodejs npm", "info")
            self.log("  Or visit: https://nodejs.org/", "info")
            return False
            
        except subprocess.CalledProcessError:
            return False
    
    def get_installation_scope(self) -> Scope:
        if self.scope:
            return self.scope
        
        self.log("Select Installation Scope", "section")
        print("\nWhere would you like to install the MCP servers?\n")
        print("1. User   - Available across all projects (recommended)")
        print("2. Local  - Only available in current directory\n")
        
        while True:
            choice = input("Select scope (1-2): ")
            if choice == "1":
                return Scope.USER
            elif choice == "2":
                return Scope.LOCAL
            else:
                print(f"{Colors.YELLOW}Invalid choice. Please select 1 or 2.{Colors.RESET}")
    
    def load_config(self, config_path: Path) -> Dict:
        if not config_path.exists():
            # Return appropriate default structure for MCP servers
            return {"mcpServers": {}}
        
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            self.log(f"Failed to parse configuration file: {e}", "warning")
            return None
    
    def save_config(self, config_path: Path, config: Dict):
        if self.dry_run:
            self.log(f"Would save configuration to: {config_path}", "dryrun")
            return
        
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        self.log(f"Configuration saved to: {config_path}", "success")
    
    def is_server_installed(self, server_name: str) -> bool:
        try:
            result = subprocess.run(
                ["claude", "mcp", "list"],
                capture_output=True,
                text=True
            )
            return f"{server_name}:" in result.stdout
        except:
            return False
    
    def get_installed_servers(self) -> Set[str]:
        """Get set of currently installed server names."""
        installed = set()
        try:
            result = subprocess.run(
                ["claude", "mcp", "list"],
                capture_output=True,
                text=True
            )
            for line in result.stdout.splitlines():
                if ":" in line:
                    server_name = line.split(":")[0].strip()
                    if server_name:
                        installed.add(server_name)
        except:
            pass
        return installed
    
    def remove_server_from_config(self, config: Dict, server_name: str, scope: Scope) -> bool:
        removed = False
        
        if "mcpServers" in config and server_name in config["mcpServers"]:
            del config["mcpServers"][server_name]
            removed = True
        
        return removed
    
    def add_server_to_config(self, config: Dict, server: MCPServer, scope: Scope):
        """Add server to configuration using Claude Code's expected format."""
        # For Claude Code, we need command + args format, not transport/uri
        server_config = {}
        
        if server.transport == "local":
            # Local servers use direct command
            cmd_parts = server.command.split()
            server_config["command"] = cmd_parts[0]
            server_config["args"] = cmd_parts[1:] if len(cmd_parts) > 1 else []
        else:  # sse
            # SSE servers need npm proxy packages
            if server.name == "sequential-thinking":
                server_config["command"] = "npx"
                server_config["args"] = ["-y", "@modelcontextprotocol/server-sequential-thinking"]
            elif server.name == "linear":
                server_config["command"] = "npx"
                server_config["args"] = ["-y", "linear-mcp"]
                # Linear requires LINEAR_API_KEY
                linear_api_key = os.environ.get("LINEAR_API_KEY", "")
                if linear_api_key:
                    server_config["env"] = {"LINEAR_API_KEY": linear_api_key}
                else:
                    self.log("Warning: LINEAR_API_KEY not found in environment", "warning")
            elif server.name == "context7":
                server_config["command"] = "npx"
                server_config["args"] = ["-y", "@upstash/context7-mcp@latest"]
            else:
                # Generic SSE server - warn user
                self.log(f"Warning: {server.name} is an SSE server that may need a specific npm package", "warning")
                server_config["command"] = "npx"
                server_config["args"] = ["-y", f"{server.name}-mcp"]
        
        if "mcpServers" not in config:
            config["mcpServers"] = {}
        config["mcpServers"][server.name] = server_config
    
    def test_endpoint_connectivity(self, server: MCPServer):
        if server.transport != "sse":
            return
        
        self.log(f"Testing {server.name} endpoint connectivity...", "info")
        
        try:
            req = urllib.request.Request(server.command, method='HEAD')
            response = urllib.request.urlopen(req, timeout=10)
            self.log(f"{server.name} endpoint is reachable", "success")
        except urllib.error.HTTPError as e:
            if e.code == 401 and server.requires_auth:
                self.log(f"{server.name} endpoint requires authentication (expected)", "warning")
            elif e.code in [401, 404, 405]:
                self.log(f"{server.name} endpoint responded (may not support HEAD requests)", "info")
            else:
                self.log(f"{server.name} endpoint returned status {e.code}", "warning")
        except Exception as e:
            self.log(f"{server.name} connectivity issue: {str(e)}", "warning")
            self.add_issue(f"{server.name} endpoint connectivity failed")
    
    def test_server_functionality(self, server: MCPServer):
        self.log(f"Testing {server.name} server...", "info")
        
        if self.dry_run:
            self.log(f"Would test with prompt: {server.test_prompt}", "dryrun")
            return
        
        try:
            result = subprocess.run(
                ["claude", server.test_prompt],
                capture_output=True,
                text=True,
                timeout=60
            )
            output = result.stdout
            
            if re.search(server.validation_pattern, output, re.IGNORECASE):
                self.log(f"{server.name} functionality confirmed", "success")
            elif server.requires_auth and "401" in output:
                self.log(f"{server.name} requires authentication (expected)", "warning")
                if server.auth_instructions:
                    print(f"\nTo authenticate {server.name}:")
                    print(server.auth_instructions)
            else:
                self.log(f"{server.name} may not be functioning properly", "warning")
                self.add_issue(f"{server.name} server functionality unclear")
                
        except subprocess.TimeoutExpired:
            self.log(f"{server.name} test timed out", "error")
            self.add_issue(f"{server.name} server test timed out")
        except Exception as e:
            self.log(f"{server.name} test failed: {str(e)}", "error")
            self.add_issue(f"{server.name} server test failed")
    
    def install_servers(self, scope: Scope, config_path: Path):
        if self.mode == Mode.TEST or self.mode == Mode.LIST:
            return
        
        action = "Uninstalling" if self.mode == Mode.UNINSTALL else "Installing"
        self.log(f"{action} MCP Servers", "section")
        
        config = self.load_config(config_path)
        if config is None:
            self.log("Failed to load configuration", "error")
            return
        
        for server in self.selected_servers:
            if self.mode == Mode.UNINSTALL:
                # Remove server
                if self.dry_run:
                    self.log(f"Would remove {server.name} from configuration", "dryrun")
                else:
                    if self.remove_server_from_config(config, server.name, scope):
                        self.log(f"Removing {server.name} server...", "info")
                        self.save_config(config_path, config)
                        self.log(f"{server.name} server removed", "success")
                    else:
                        self.log(f"{server.name} server not found in configuration", "warning")
            else:
                # Install server
                # Check if already installed (skip in install mode)
                if self.mode != Mode.INSTALL and self.is_server_installed(server.name):
                    self.log(f"Server {server.name} already installed, skipping", "info")
                    continue
                
                # Remove existing if in install mode
                if self.mode == Mode.INSTALL:
                    if self.dry_run:
                        self.log(f"Would remove {server.name} from configuration", "dryrun")
                    else:
                        self.remove_server_from_config(config, server.name, scope)
                
                # Add server
                if self.dry_run:
                    self.log(f"Would install {server.name} to {config_path}", "dryrun")
                else:
                    self.log(f"Installing {server.name} server...", "info")
                    self.add_server_to_config(config, server, scope)
                    self.save_config(config_path, config)
                    self.log(f"{server.name} server installed", "success")
    
    def test_all_servers(self):
        if self.mode == Mode.UNINSTALL or self.mode == Mode.LIST:
            return
            
        self.log("Testing MCP Servers", "section")
        
        # Test connectivity for SSE servers
        for server in self.selected_servers:
            if server.transport == "sse":
                self.test_endpoint_connectivity(server)
        
        # Test functionality
        for server in self.selected_servers:
            self.test_server_functionality(server)
    
    def verify_installation(self, expected_scope: Scope) -> bool:
        """Verify the installation by checking claude mcp list output."""
        if self.mode == Mode.LIST:
            return True
            
        self.log("Verifying Installation", "section")
        
        if self.dry_run:
            self.log("Would verify installation with 'claude mcp list'", "dryrun")
            return True
        
        try:
            result = subprocess.run(
                ["claude", "mcp", "list"],
                capture_output=True,
                text=True
            )
            
            output = result.stdout
            self.log("Current MCP servers:", "info")
            print(output)
            
            # Check each expected server
            all_present = True
            
            for server in self.selected_servers:
                if self.mode == Mode.UNINSTALL:
                    # Check that server is NOT present
                    if f"{server.name}:" not in output:
                        self.log(f"{server.name} successfully removed", "success")
                    else:
                        self.log(f"{server.name} still present after uninstall", "error")
                        all_present = False
                else:
                    # Check that server IS present
                    if f"{server.name}:" in output:
                        # Check for proper configuration
                        if server.transport == "sse" and "undefined" in output:
                            self.log(f"{server.name} is misconfigured (shows 'undefined')", "error")
                            all_present = False
                        else:
                            self.log(f"{server.name} is properly configured", "success")
                    else:
                        self.log(f"{server.name} is not listed", "error")
                        all_present = False
            
            return all_present
            
        except Exception as e:
            self.log(f"Error verifying installation: {e}", "error")
            return False
    
    def show_final_report(self, verification_passed: bool):
        self.log("Final Report", "section")
        
        if self.dry_run:
            self.log("DRY RUN SUMMARY:", "info")
            print("✅ Script would have performed requested operations")
            print("✅ No actual changes were made")
            return
        
        if verification_passed and not self.issues:
            if self.mode == Mode.UNINSTALL:
                self.log("Uninstallation completed successfully!", "success")
                print("\n✅ Selected MCP servers have been removed")
            else:
                self.log("Installation completed successfully!", "success")
                print("\n✅ All selected MCP servers are properly installed and configured")
                print("✅ Servers are available in the selected scope")
                print("\nYou can now use the MCP servers in Claude!")
        else:
            action = "Uninstallation" if self.mode == Mode.UNINSTALL else "Installation"
            self.log(f"{action} completed with issues:", "warning")
            
            if not verification_passed:
                print(f"\n❌ Verification failed - servers may not be properly configured")
            
            if self.issues:
                print("\nIssues encountered:")
                for issue in self.issues:
                    print(f"  • {issue}")
            
            print("\nTroubleshooting:")
            print("  • Try opening a new terminal and running 'claude mcp list'")
            print("  • Check for conflicting project-specific configurations")
            if self.mode != Mode.UNINSTALL:
                print("  • Run with --mode install to force reinstallation")
    
    def verify_configuration(self):
        """Comprehensive verification of MCP configuration across all scopes."""
        self.log("MCP Configuration Verification", "section")
        
        # Track issues by file
        issues_by_file = {}
        claude_output_issues = []
        
        # First run claude mcp list to see what Claude sees
        self.log("Running 'claude mcp list' from current directory...", "info")
        print(f"Current directory: {Path.cwd()}")
        
        try:
            result = subprocess.run(
                ["claude", "mcp", "list"],
                capture_output=True,
                text=True
            )
            
            output = result.stdout
            print("\nClaude MCP list output:")
            print("-" * 50)
            print(output)
            print("-" * 50)
            
            # Analyze the output for issues
            servers_found = {}
            
            for line in output.splitlines():
                if ":" in line:
                    parts = line.split(":", 1)
                    server_name = parts[0].strip()
                    server_config = parts[1].strip() if len(parts) > 1 else ""
                    servers_found[server_name] = server_config
                    
                    # Check for "undefined" issues
                    if "undefined" in server_config:
                        claude_output_issues.append({
                            'server': server_name,
                            'issue': 'shows as undefined',
                            'details': server_config
                        })
                    
                    # Check for comma-separated commands (should be space-separated)
                    elif "," in server_config and "npx" in server_config:
                        claude_output_issues.append({
                            'server': server_name,
                            'issue': 'command appears comma-separated',
                            'details': server_config
                        })
            
            if claude_output_issues:
                self.log("Issues detected in Claude output:", "warning")
                for issue in claude_output_issues:
                    print(f"  ⚠️  {issue['server']}: {issue['issue']}")
            else:
                self.log("No obvious issues in Claude output", "success")
            
        except Exception as e:
            self.log(f"Error running 'claude mcp list': {e}", "error")
        
        # Now examine all configuration files
        self.log("\nExamining configuration files...", "section")
        
        # Check user-level config
        user_config_path = Path.home() / ".claude.json"
        if user_config_path.exists():
            self.log(f"\nChecking {user_config_path}", "info")
            try:
                with open(user_config_path, 'r') as f:
                    config = json.load(f)
                
                # Check user-level mcpServers
                if 'mcpServers' in config:
                    print("\nUser-level mcpServers:")
                    for name, server_config in config['mcpServers'].items():
                        issues = self._analyze_server_config(name, server_config, "user")
                        if issues:
                            if str(user_config_path) not in issues_by_file:
                                issues_by_file[str(user_config_path)] = []
                            issues_by_file[str(user_config_path)].extend([
                                {'server': name, 'scope': 'user-level mcpServers', 'issues': issues}
                            ])
                else:
                    print("No user-level mcpServers found")
                
                # Check project-specific configs
                current_dir = str(Path.cwd())
                if 'projects' in config:
                    print(f"\nProject-specific configurations found: {len(config['projects'])}")
                    
                    # Check all projects with mcpServers
                    for proj_path, proj_config in config['projects'].items():
                        if 'mcpServers' in proj_config:
                            is_current = proj_path == current_dir
                            if is_current:
                                print(f"\n{Colors.YELLOW}Current directory has project-specific config:{Colors.RESET}")
                            
                            for name, server_config in proj_config['mcpServers'].items():
                                scope_desc = "project (current dir)" if is_current else f"project ({proj_path})"
                                issues = self._analyze_server_config(name, server_config, scope_desc)
                                if issues:
                                    if str(user_config_path) not in issues_by_file:
                                        issues_by_file[str(user_config_path)] = []
                                    issues_by_file[str(user_config_path)].extend([
                                        {'server': name, 'scope': f'projects["{proj_path}"].mcpServers', 'issues': issues}
                                    ])
                            
                            if not is_current:
                                # Just mention other projects briefly
                                print(f"\n  • Project override at: {proj_path}")
                
            except Exception as e:
                self.log(f"Error reading {user_config_path}: {e}", "error")
        
        # Check local project config
        local_config_path = Path.cwd() / ".claude" / "mcp.json"
        if local_config_path.exists():
            self.log(f"\nChecking {local_config_path}", "info")
            try:
                with open(local_config_path, 'r') as f:
                    config = json.load(f)
                
                if 'mcpServers' in config:
                    print("\nLocal project mcpServers:")
                    for name, server_config in config['mcpServers'].items():
                        issues = self._analyze_server_config(name, server_config, "local")
                        if issues:
                            if str(local_config_path) not in issues_by_file:
                                issues_by_file[str(local_config_path)] = []
                            issues_by_file[str(local_config_path)].extend([
                                {'server': name, 'scope': 'mcpServers', 'issues': issues}
                            ])
                        
            except Exception as e:
                self.log(f"Error reading {local_config_path}: {e}", "error")
        
        # Provide diagnosis
        self.log("\nDiagnosis", "section")
        
        if claude_output_issues or issues_by_file:
            # Show which files have issues
            if issues_by_file:
                print(f"\n{Colors.RED}Configuration issues found in these files:{Colors.RESET}")
                for file_path, file_issues in issues_by_file.items():
                    print(f"\n📁 {Colors.YELLOW}{file_path}{Colors.RESET}")
                    for issue_info in file_issues:
                        print(f"   └─ {issue_info['scope']} → {issue_info['server']}:")
                        for issue in issue_info['issues']:
                            print(f"      ⚠️  {issue}")
            
            # Match Claude output issues to config issues
            if claude_output_issues:
                print(f"\n{Colors.YELLOW}Correlation with Claude output issues:{Colors.RESET}")
                
                # Check if all configs look correct but Claude still has issues
                all_configs_look_correct = not issues_by_file
                
                for output_issue in claude_output_issues:
                    server_name = output_issue['server']
                    print(f"\n• {server_name} {output_issue['issue']}:")
                    
                    # Find which config file is causing this
                    found_cause = False
                    for file_path, file_issues in issues_by_file.items():
                        for issue_info in file_issues:
                            if issue_info['server'] == server_name:
                                print(f"  → Caused by: {file_path}")
                                print(f"    Location: {issue_info['scope']}")
                                found_cause = True
                                break
                    
                    if not found_cause:
                        # Check if it's a project override issue
                        if all_configs_look_correct:
                            print(f"  → Caused by project-specific override in ~/.claude.json")
                            print(f"    The override appears correct but Claude may be caching old config")
                            print(f"    OR the 'env' field in the config may be causing issues")
                        else:
                            print(f"  → Likely caused by project-specific override in ~/.claude.json")
            
            print(f"\n{Colors.GREEN}Recommended fixes:{Colors.RESET}")
            
            if issues_by_file:
                print("\n1. To fix broken configurations:")
                print("   python3 install_mcp_servers.py --repair --force")
            
            if all_configs_look_correct and claude_output_issues:
                print("\n⚠️  Your configurations look correct but Claude still shows errors.")
                print("   This is likely due to:")
                print("   • Project-specific overrides that duplicate user-level settings")
                print("   • The 'env' field in project configs causing issues")
                print("   • Claude caching old configuration formats")
            
            print("\n2. To clean up configuration hierarchy:")
            print("   python3 install_mcp_servers.py --install --scope user")
            print("   (Choose option 1 when prompted about project overrides)")
            
            print("\n3. Alternative manual fix:")
            print("   Edit ~/.claude.json and remove the entire")
            print(f"   projects[\"{Path.cwd()}\"].mcpServers section")
        else:
            print(f"\n{Colors.GREEN}✅ No configuration issues detected!{Colors.RESET}")
            print("All MCP servers appear to be properly configured.")
    
    def _analyze_server_config(self, name: str, config: Dict, scope: str) -> List[str]:
        """Analyze a single server configuration for issues. Returns list of issues found."""
        issues = []
        
        # Check if this is using the old format (type/url/command+args)
        is_old_format = 'type' in config or 'url' in config or ('command' in config and 'args' in config)
        
        if is_old_format:
            print(f"\n  {name} ({scope} scope):")
            print(f"    ⚠️  Using OLD configuration format!")
            print(f"    Type: {config.get('type', 'MISSING')}")
            if config.get('type') == 'sse':
                print(f"    URL: {config.get('url', 'MISSING')}")
            elif config.get('type') == 'stdio':
                cmd = config.get('command', '')
                args = config.get('args', [])
                print(f"    Command: {cmd} {' '.join(args)}")
            print(f"    ⚠️  This format causes 'undefined' errors!")
            issues.append("Using OLD format (type/url/command+args) - needs conversion to new format")
            return issues
        
        # New format analysis
        transport = config.get('transport', 'unknown')
        
        print(f"\n  {name} ({scope} scope):")
        print(f"    Transport: {transport}")
        
        if transport == 'sse':
            uri = config.get('uri', 'MISSING')
            print(f"    URI: {uri}")
            if uri == 'MISSING' or not uri:
                issues.append("Missing 'uri' field for SSE transport")
        elif transport == 'local':
            command = config.get('command', [])
            if isinstance(command, list):
                print(f"    Command: {' '.join(command)}")
            else:
                print(f"    Command: {command} (should be array)")
                issues.append("Command should be an array, not a string")
        else:
            issues.append(f"Unknown transport type: {transport}")
        
        if issues:
            for issue in issues:
                print(f"    ⚠️  {issue}")
        else:
            print(f"    ✅ Configuration looks correct")
        
        return issues
    
    def repair_configuration(self):
        """Repair broken MCP configurations by converting old format to new."""
        self.log("MCP Configuration Repair", "section")
        
        repairs_needed = []
        repairs_made = 0
        
        # Check user-level config
        user_config_path = Path.home() / ".claude.json"
        if user_config_path.exists():
            self.log(f"\nAnalyzing {user_config_path}", "info")
            try:
                with open(user_config_path, 'r') as f:
                    config = json.load(f)
                
                # Check user-level mcpServers
                if 'mcpServers' in config:
                    for name, server_config in config['mcpServers'].items():
                        if self._is_old_format(server_config):
                            repairs_needed.append({
                                'path': user_config_path,
                                'scope': 'user',
                                'name': name,
                                'config': server_config,
                                'config_obj': config
                            })
                
                # Check project-specific configs
                current_dir = str(Path.cwd())
                if 'projects' in config:
                    for proj_path, proj_config in config['projects'].items():
                        if 'mcpServers' in proj_config:
                            for name, server_config in proj_config['mcpServers'].items():
                                if self._is_old_format(server_config):
                                    repairs_needed.append({
                                        'path': user_config_path,
                                        'scope': f'project ({proj_path})',
                                        'name': name,
                                        'config': server_config,
                                        'config_obj': config,
                                        'project_path': proj_path
                                    })
                
            except Exception as e:
                self.log(f"Error reading {user_config_path}: {e}", "error")
        
        # Check local project config
        local_config_path = Path.cwd() / ".claude" / "mcp.json"
        if local_config_path.exists():
            self.log(f"\nAnalyzing {local_config_path}", "info")
            try:
                with open(local_config_path, 'r') as f:
                    config = json.load(f)
                
                if 'mcpServers' in config:
                    for name, server_config in config['mcpServers'].items():
                        if self._is_old_format(server_config):
                            repairs_needed.append({
                                'path': local_config_path,
                                'scope': 'local',
                                'name': name,
                                'config': server_config,
                                'config_obj': config
                            })
                        
            except Exception as e:
                self.log(f"Error reading {local_config_path}: {e}", "error")
        
        # Show repairs needed
        if not repairs_needed:
            self.log("\nNo repairs needed!", "success")
            print("All configurations are using the correct format.")
            return
        
        self.log(f"\nFound {len(repairs_needed)} configurations that need repair:", "warning")
        for repair in repairs_needed:
            print(f"\n  📌 {repair['name']} ({repair['scope']})")
            print(f"     Path: {repair['path']}")
            print(f"     Current format: {repair['config'].get('type', 'unknown')} transport")
        
        # Ask for confirmation
        if not self.dry_run and not self.force:
            print(f"\n{Colors.YELLOW}Would you like to repair these configurations?{Colors.RESET}")
            print("This will convert them from the old format to the new format.")
            print("\n1. Yes, repair all configurations")
            print("2. No, cancel")
            
            while True:
                choice = input("\nChoice (1-2): ").strip()
                if choice == '1':
                    break
                elif choice == '2':
                    self.log("Repair cancelled", "warning")
                    return
                else:
                    print("Please enter 1 or 2")
        
        # Perform repairs
        self.log("\nRepairing configurations...", "info")
        
        # Group repairs by config file
        repairs_by_file = {}
        for repair in repairs_needed:
            file_path = str(repair['path'])
            if file_path not in repairs_by_file:
                repairs_by_file[file_path] = []
            repairs_by_file[file_path].append(repair)
        
        for file_path, file_repairs in repairs_by_file.items():
            try:
                # Read the current config
                with open(file_path, 'r') as f:
                    config = json.load(f)
                
                # Apply all repairs for this file
                for repair in file_repairs:
                    new_config = self._convert_to_new_format(repair['config'])
                    
                    if 'project_path' in repair:
                        # Project-specific config
                        proj_path = repair['project_path']
                        config['projects'][proj_path]['mcpServers'][repair['name']] = new_config
                    elif repair['scope'] == 'user':
                        # User-level config
                        config['mcpServers'][repair['name']] = new_config
                    else:
                        # Local config
                        config['mcpServers'][repair['name']] = new_config
                    
                    if not self.dry_run:
                        self.log(f"  ✅ Repaired {repair['name']} ({repair['scope']})", "success")
                    else:
                        self.log(f"  [DRY-RUN] Would repair {repair['name']} ({repair['scope']})", "dryrun")
                    
                    repairs_made += 1
                
                # Write the updated config
                if not self.dry_run:
                    with open(file_path, 'w') as f:
                        json.dump(config, f, indent=2)
                
            except Exception as e:
                self.log(f"Error repairing {file_path}: {e}", "error")
        
        # Summary
        self.log("\nRepair Summary", "section")
        if self.dry_run:
            print(f"Would repair {repairs_made} configurations")
        else:
            print(f"Successfully repaired {repairs_made} configurations")
            print("\nNext steps:")
            print("1. Run 'claude mcp list' to verify servers are working")
            print("2. Try running Claude in different directories")
            print("3. If issues persist, run with --verify flag")
    
    def _is_old_format(self, config: Dict) -> bool:
        """Check if a server config is using the old format."""
        return 'type' in config or 'url' in config or ('command' in config and 'args' in config)
    
    def cleanup_claude_json(self) -> bool:
        """Backup and remove MCP servers from ~/.claude.json to avoid conflicts."""
        claude_json_path = Path.home() / ".claude.json"
        
        if not claude_json_path.exists():
            return True
        
        self.log("Cleaning up ~/.claude.json", "section")
        
        try:
            # Read current config
            with open(claude_json_path, 'r') as f:
                config = json.load(f)
            
            changes_made = False
            servers_to_migrate = {}
            
            # Backup global mcpServers if present
            if 'mcpServers' in config and config['mcpServers']:
                servers_to_migrate['global'] = config['mcpServers'].copy()
                self.log(f"Found {len(config['mcpServers'])} global MCP servers to migrate", "info")
                
                # Create backup
                backup_path = claude_json_path.with_suffix('.json.backup')
                with open(backup_path, 'w') as f:
                    json.dump(config, f, indent=2)
                self.log(f"Created backup at: {backup_path}", "success")
                
                # Remove global mcpServers
                del config['mcpServers']
                changes_made = True
            
            # Clean up project-specific empty mcpServers
            if 'projects' in config:
                for project_path, project_config in config['projects'].items():
                    if 'mcpServers' in project_config:
                        if project_config['mcpServers']:
                            # Non-empty project servers - save for migration
                            if 'projects' not in servers_to_migrate:
                                servers_to_migrate['projects'] = {}
                            servers_to_migrate['projects'][project_path] = project_config['mcpServers'].copy()
                            self.log(f"Found {len(project_config['mcpServers'])} project servers in {project_path}", "info")
                        else:
                            self.log(f"Removing empty mcpServers from project: {project_path}", "info")
                        
                        # Remove mcpServers (empty or not) from projects
                        del project_config['mcpServers']
                        changes_made = True
            
            # Save cleaned config
            if changes_made:
                with open(claude_json_path, 'w') as f:
                    json.dump(config, f, indent=2)
                self.log("Cleaned up ~/.claude.json successfully", "success")
                
                # Save migration data if any servers were found
                if servers_to_migrate:
                    migration_path = Path.home() / ".claude" / "mcp_migration.json"
                    migration_path.parent.mkdir(exist_ok=True)
                    with open(migration_path, 'w') as f:
                        json.dump(servers_to_migrate, f, indent=2)
                    self.log(f"Saved servers for migration to: {migration_path}", "info")
            else:
                self.log("No MCP server configurations found in ~/.claude.json", "info")
            
            return True
            
        except Exception as e:
            self.log(f"Error cleaning up ~/.claude.json: {e}", "error")
            return False

    def migrate_servers(self):
        """Migrate servers from ~/.claude.json to proper configuration files."""
        self.log("Migrating MCP Servers", "section")
        
        # First, cleanup ~/.claude.json and save migration data
        if not self.cleanup_claude_json():
            self.log("Failed to clean up ~/.claude.json", "error")
            return
        
        # Check for migration data
        migration_path = Path.home() / ".claude" / "mcp_migration.json"
        if not migration_path.exists():
            self.log("No servers found to migrate", "info")
            return
        
        try:
            with open(migration_path, 'r') as f:
                migration_data = json.load(f)
            
            total_servers = 0
            
            # Count servers
            if 'global' in migration_data:
                total_servers += len(migration_data['global'])
            if 'projects' in migration_data:
                for proj_servers in migration_data['projects'].values():
                    total_servers += len(proj_servers)
            
            if total_servers == 0:
                self.log("No servers to migrate", "info")
                return
            
            self.log(f"Found {total_servers} servers to migrate", "info")
            
            # Ask user where to migrate global servers
            if 'global' in migration_data and migration_data['global']:
                print(f"\n{Colors.BOLD}Global servers found:{Colors.RESET}")
                for name in migration_data['global'].keys():
                    print(f"  • {name}")
                
                print("\nWhere would you like to migrate these servers?")
                print("1. User scope (recommended - available across all projects)")
                print("2. Project scope (only in current directory)")
                print("3. Skip migration")
                
                while True:
                    choice = input("\nChoice (1-3): ").strip()
                    if choice == '1':
                        target_scope = Scope.USER
                        break
                    elif choice == '2':
                        target_scope = Scope.PROJECT
                        break
                    elif choice == '3':
                        self.log("Skipping global server migration", "info")
                        target_scope = None
                        break
                    else:
                        print("Please enter 1, 2, or 3")
                
                if target_scope:
                    config_path = self.get_config_path(target_scope)
                    config = self.load_config(config_path)
                    
                    for name, server_config in migration_data['global'].items():
                        # Convert to proper format
                        if 'mcpServers' not in config:
                            config['mcpServers'] = {}
                        config['mcpServers'][name] = server_config
                        self.log(f"Migrated {name} to {target_scope.value} scope", "success")
                    
                    self.save_config(config_path, config)
            
            # Handle project-specific servers
            if 'projects' in migration_data:
                current_dir = str(Path.cwd())
                
                for project_path, servers in migration_data['projects'].items():
                    if servers:
                        print(f"\n{Colors.BOLD}Project servers found in {project_path}:{Colors.RESET}")
                        for name in servers.keys():
                            print(f"  • {name}")
                        
                        if project_path == current_dir:
                            print("\nThis is your current directory. Migrate to project scope? (y/n)")
                            if input().lower() == 'y':
                                config_path = self.get_config_path(Scope.PROJECT)
                                config = self.load_config(config_path)
                                
                                for name, server_config in servers.items():
                                    if 'mcpServers' not in config:
                                        config['mcpServers'] = {}
                                    config['mcpServers'][name] = server_config
                                    self.log(f"Migrated {name} to project scope", "success")
                                
                                self.save_config(config_path, config)
                        else:
                            print(f"\n{Colors.YELLOW}Note: Project servers from {project_path} can only be migrated when in that directory{Colors.RESET}")
            
            # Clean up migration file
            migration_path.unlink()
            self.log("Migration complete!", "success")
            
            # Verify with claude mcp list
            print("\nRunning 'claude mcp list' to verify...")
            result = subprocess.run(["claude", "mcp", "list"], capture_output=True, text=True)
            print(result.stdout)
            
        except Exception as e:
            self.log(f"Error during migration: {e}", "error")

    def _convert_to_new_format(self, old_config: Dict) -> Dict:
        """Convert old format config to new format."""
        new_config = {}
        
        # Convert transport type
        if old_config.get('type') == 'stdio':
            new_config['transport'] = 'local'
            # Convert command
            cmd = old_config.get('command', '')
            args = old_config.get('args', [])
            if cmd:
                new_config['command'] = [cmd] + args
            else:
                new_config['command'] = []
        elif old_config.get('type') == 'sse':
            new_config['transport'] = 'sse'
            new_config['uri'] = old_config.get('url', '')
        else:
            # Unknown type, try to infer
            if 'url' in old_config:
                new_config['transport'] = 'sse'
                new_config['uri'] = old_config['url']
            else:
                new_config['transport'] = 'local'
                new_config['command'] = []
        
        # Copy any other fields that might be present
        for key, value in old_config.items():
            if key not in ['type', 'url', 'command', 'args']:
                new_config[key] = value
        
        return new_config
    
    def run(self):
        # Handle list mode
        if self.mode == Mode.LIST:
            if hasattr(self, '_list_configured'):
                # List configured servers
                self.list_configured_servers(self.scope)
            else:
                # List available servers from registry
                self.list_available_servers()
            return
        
        # Handle verify mode
        if self.mode == Mode.VERIFY:
            self.verify_configuration()
            return
        
        # Handle repair mode
        if self.mode == Mode.REPAIR:
            self.repair_configuration()
            return
        
        # Handle migrate mode
        if self.mode == Mode.MIGRATE:
            self.migrate_servers()
            return
        
        # Handle add/remove modes
        if self.mode in [Mode.ADD, Mode.REMOVE]:
            if not self.scope:
                self.log("Error: --scope is required for add/remove operations", "error")
                print("\nUsage:")
                print("  --add <servers> --scope <project|user|machine>")
                print("  --remove <servers> --scope <project|user|machine>")
                return
            
            if not hasattr(self, '_cli_servers') or not self._cli_servers:
                self.log("Error: No servers specified", "error")
                return
            
            # Check if we have permission for machine scope
            if self.scope == Scope.MACHINE:
                config_path = self.get_config_path(self.scope)
                if not os.access(str(config_path.parent), os.W_OK):
                    self.log(f"Error: No write permission for {config_path.parent}", "error")
                    self.log("Try running with sudo for machine scope", "info")
                    return
            
            config_path = self.get_config_path(self.scope)
            config = self.load_config(config_path)
            
            if self.mode == Mode.ADD:
                self.log(f"Adding servers to {self.scope.value} scope", "section")
                for server in self._cli_servers:
                    self.add_server_to_config(config, server, self.scope)
                    self.log(f"Added {server.name}", "success")
            else:  # Mode.REMOVE
                self.log(f"Removing servers from {self.scope.value} scope", "section")
                for server in self._cli_servers:
                    if self.remove_server_from_config(config, server.name, self.scope):
                        self.log(f"Removed {server.name}", "success")
                    else:
                        self.log(f"{server.name} not found in {self.scope.value} scope", "warning")
            
            self.save_config(config_path, config)
            
            # Verify
            print("\nRunning 'claude mcp list' to verify...")
            result = subprocess.run(["claude", "mcp", "list"], capture_output=True, text=True)
            print(result.stdout)
            return
        
        # Check prerequisites
        if not self.check_prerequisites():
            sys.exit(1)
        
        # Explain the hierarchy
        self.explain_hierarchy()
        
        # Analyze current configuration
        current_state = self.analyze_current_configuration()
        
        # Display current state
        self.display_current_state(current_state)
        
        # Get installation scope and config path
        if self.mode != Mode.TEST:
            scope = self.get_installation_scope()
            config_path = self.get_config_path(scope)
            
            self.log(f"{'Uninstallation' if self.mode == Mode.UNINSTALL else 'Installation'} scope: {scope.value}", "info")
            
            # Select servers
            if hasattr(self, '_cli_servers'):
                # Servers specified via CLI
                self.selected_servers = self._cli_servers
            else:
                # Interactive selection
                installed = self.get_installed_servers()
                self.selected_servers = self.interactive_select_servers(installed)
            
            if not self.selected_servers:
                self.log("No servers selected", "warning")
                return
            
            # Resolve conflicts
            if not self.resolve_conflicts(current_state, scope):
                self.log("Operation cancelled", "warning")
                return
            
            # Install/uninstall servers
            self.install_servers(scope, config_path)
        else:
            # Test mode - test all registered servers
            self.selected_servers = self.registry.list_servers()
            scope = None
        
        # Test servers (skip for uninstall)
        if self.mode != Mode.UNINSTALL:
            self.test_all_servers()
        
        # Verify installation
        if self.mode != Mode.TEST:
            verification_passed = self.verify_installation(scope)
        else:
            verification_passed = True
        
        # Show final report
        self.show_final_report(verification_passed)


def main():
    parser = argparse.ArgumentParser(
        description="MCP Server Management Script for Claude Code",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # List operations
  %(prog)s --list                        # List configured servers at all scopes
  %(prog)s --list --scope user           # List only user-scoped servers
  %(prog)s --list-available              # List all available servers from registry
  
  # Add/Remove operations
  %(prog)s --add sequential-thinking --scope user     # Add to user scope
  %(prog)s --add linear context7 --scope project      # Add multiple to project
  %(prog)s --remove linear --scope user               # Remove from user scope
  
  # Migration and maintenance
  %(prog)s --migrate                     # Migrate from ~/.claude.json
  %(prog)s --verify                      # Verify configuration
  %(prog)s --repair                      # Repair broken configurations
  
  # Legacy operations (deprecated)
  %(prog)s --install --servers all --scope user       # Install servers
  %(prog)s --test                        # Test installations
        """
    )
    
    # Operation mode flags (mutually exclusive)
    mode_group = parser.add_mutually_exclusive_group()
    
    # New primary operations
    mode_group.add_argument(
        "--add",
        nargs="+",
        metavar="SERVER",
        help="Add MCP servers to specified scope"
    )
    
    mode_group.add_argument(
        "--remove", 
        nargs="+",
        metavar="SERVER",
        help="Remove MCP servers from specified scope"
    )
    
    mode_group.add_argument(
        "--list",
        action="store_true",
        help="List configured MCP servers (use --list-available for registry)"
    )
    
    mode_group.add_argument(
        "--list-available",
        action="store_true",
        help="List all available MCP servers from registry"
    )
    
    mode_group.add_argument(
        "--migrate",
        action="store_true",
        help="Migrate servers from ~/.claude.json to proper config files"
    )
    
    mode_group.add_argument(
        "--verify",
        action="store_true",
        help="Verify MCP configuration and diagnose issues"
    )
    
    mode_group.add_argument(
        "--repair",
        action="store_true",
        help="Repair broken MCP configurations"
    )
    
    # Legacy operations (kept for compatibility)
    mode_group.add_argument(
        "--install",
        action="store_true",
        help="Install MCP servers (deprecated - use --add)"
    )
    
    mode_group.add_argument(
        "--uninstall",
        action="store_true",
        help="Uninstall MCP servers (deprecated - use --remove)"
    )
    
    mode_group.add_argument(
        "--test",
        action="store_true",
        help="Test existing MCP server installations"
    )
    
    # Configuration options
    parser.add_argument(
        "--scope",
        choices=["project", "user", "machine"],
        help="Scope for add/remove/list operations"
    )
    
    parser.add_argument(
        "--servers",
        help="Servers for legacy install/uninstall (deprecated)"
    )
    
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force operations without prompting"
    )
    
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate actions without making changes"
    )
    
    args = parser.parse_args()
    
    # Determine mode
    if args.add:
        mode = Mode.ADD
    elif args.remove:
        mode = Mode.REMOVE
    elif args.list:
        mode = Mode.LIST
    elif args.list_available:
        mode = Mode.LIST
    elif args.migrate:
        mode = Mode.MIGRATE
    elif args.verify:
        mode = Mode.VERIFY
    elif args.repair:
        mode = Mode.REPAIR
    elif args.uninstall:
        mode = Mode.UNINSTALL
    elif args.test:
        mode = Mode.TEST
    elif args.install:
        mode = Mode.INSTALL
    else:
        # Default to install mode if no mode specified
        mode = Mode.INSTALL
    
    # Parse scope
    if args.scope:
        if args.scope == "local":
            scope = Scope.PROJECT  # Map local to project
        else:
            scope = Scope(args.scope)
    else:
        scope = None
    
    # Create installer
    installer = MCPInstaller(mode, scope, args.dry_run, args.force)
    
    # Handle new add/remove operations
    if args.add:
        installer._cli_servers = installer.select_servers_from_cli(','.join(args.add))
        if not installer._cli_servers:
            print(f"{Colors.RED}No valid servers specified{Colors.RESET}")
            sys.exit(1)
    elif args.remove:
        installer._cli_servers = installer.select_servers_from_cli(','.join(args.remove))
        if not installer._cli_servers:
            print(f"{Colors.RED}No valid servers specified{Colors.RESET}")
            sys.exit(1)
    
    # Handle legacy server selection
    elif args.servers:
        installer._cli_servers = installer.select_servers_from_cli(args.servers)
        if not installer._cli_servers and mode not in [Mode.LIST, Mode.VERIFY, Mode.REPAIR, Mode.MIGRATE]:
            print(f"{Colors.RED}No valid servers specified{Colors.RESET}")
            sys.exit(1)
    
    # Set flag for list mode
    if args.list:
        installer._list_configured = True
    elif args.list_available:
        installer._list_configured = False
    
    try:
        installer.run()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Operation cancelled by user{Colors.RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}[ERROR] Script failed: {e}{Colors.RESET}")
        sys.exit(1)


if __name__ == "__main__":
    main()