#!/usr/bin/env python3
"""
Claude Code Configuration Manager

Centralized management of Claude Code configuration files across all scopes.
Handles reading, writing, validation, and migration of configurations.

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
"""

import json
import os
import platform
import tempfile
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import fcntl


class FileLock:
    """Simple file locking mechanism for concurrent access protection"""
    
    def __init__(self, file_path: Path, timeout: int = 30):
        self.file_path = file_path
        self.lock_path = file_path.with_suffix(file_path.suffix + '.lock')
        self.timeout = timeout
        self.lock_file = None
    
    def __enter__(self):
        """Acquire the lock"""
        start_time = time.time()
        
        while time.time() - start_time < self.timeout:
            try:
                self.lock_file = open(self.lock_path, 'w')
                fcntl.flock(self.lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                self.lock_file.write(f"{os.getpid()}\n")
                self.lock_file.flush()
                return self
            except (IOError, OSError):
                if self.lock_file:
                    self.lock_file.close()
                    self.lock_file = None
                time.sleep(0.1)
        
        raise TimeoutError(f"Could not acquire lock for {self.file_path} within {self.timeout} seconds")
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Release the lock"""
        if self.lock_file:
            try:
                fcntl.flock(self.lock_file.fileno(), fcntl.LOCK_UN)
                self.lock_file.close()
            except (IOError, OSError):
                pass
            finally:
                self.lock_file = None
                
            # Remove lock file
            try:
                if self.lock_path.exists():
                    self.lock_path.unlink()
            except (IOError, OSError):
                pass


class ClaudeConfigManager:
    """
    Manages Claude Code configuration files across all scopes.
    
    Handles the configuration hierarchy:
    - Machine scope: /etc/claude/config.json (or Windows equivalent)
    - User scope: ~/.claude/settings.json  
    - Project scope: ./.mcp.json
    - Legacy: ~/.claude.json (should be migrated away from)
    """
    
    def __init__(self, project_dir: Optional[Path] = None):
        """
        Initialize the configuration manager.
        
        Args:
            project_dir: Directory for project-scope config. Defaults to current directory.
        """
        self.project_dir = project_dir or Path.cwd()
        self._setup_paths()
    
    def _setup_paths(self):
        """Set up configuration file paths for all scopes"""
        self.paths = {
            'machine': self._get_machine_config_path(),
            'user': Path.home() / '.claude' / 'settings.json',
            'project': self.project_dir / '.mcp.json',
            'legacy': Path.home() / '.claude.json'
        }
    
    def _normalize_path(self, path: Union[str, Path]) -> Path:
        """Normalize a path for cross-platform compatibility"""
        normalized = Path(path).resolve()
        
        # On Windows, handle long path issues by using extended path syntax if needed
        if platform.system().lower() == 'windows' and len(str(normalized)) > 260:
            path_str = str(normalized)
            if not path_str.startswith('\\\\?\\'):
                normalized = Path('\\\\?\\' + path_str)
        
        return normalized
    
    def _get_machine_config_path(self) -> Path:
        """Get the machine-scope configuration path based on platform"""
        system = platform.system().lower()
        if system == 'windows':
            # Windows: Use ProgramData
            programdata = os.environ.get('PROGRAMDATA', 'C:\\ProgramData')
            return self._normalize_path(Path(programdata) / 'Claude' / 'config.json')
        else:
            # Unix-like: Use /etc
            return self._normalize_path(Path('/etc/claude/config.json'))
    
    def read_config(self, scope: str) -> Tuple[Dict, List[str]]:
        """
        Read configuration from a specific scope.
        
        Args:
            scope: Configuration scope ('machine', 'user', 'project', 'legacy')
            
        Returns:
            Tuple of (config_dict, issues_list)
        """
        if scope not in self.paths:
            return {}, [f"Unknown scope: {scope}"]
        
        config_path = self.paths[scope]
        issues = []
        
        if not config_path.exists():
            return {}, []
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # Validate configuration structure
            validation_issues = self.validate_config(config, scope)
            issues.extend(validation_issues)
            
            return config, issues
            
        except json.JSONDecodeError as e:
            issues.append(f"Invalid JSON in {config_path}: {e}")
            return {}, issues
        except (IOError, OSError) as e:
            issues.append(f"Error reading {config_path}: {e}")
            return {}, issues
    
    def read_all_configs(self) -> Tuple[Dict[str, Dict], List[str]]:
        """
        Read configurations from all scopes.
        
        Returns:
            Tuple of (configs_by_scope, all_issues)
        """
        configs = {}
        all_issues = []
        
        for scope in ['machine', 'user', 'project', 'legacy']:
            config, issues = self.read_config(scope)
            configs[scope] = config
            all_issues.extend(issues)
        
        return configs, all_issues
    
    def get_effective_config(self) -> Tuple[Dict, List[str]]:
        """
        Get the effective configuration after applying scope precedence.
        
        Precedence order: Project > User > Machine
        Legacy configurations are detected as issues.
        
        Returns:
            Tuple of (effective_config, issues)
        """
        configs, issues = self.read_all_configs()
        
        # Start with machine config
        effective = configs['machine'].copy()
        
        # Merge user config
        user_config = configs['user']
        if 'mcpServers' in user_config:
            effective.setdefault('mcpServers', {}).update(user_config['mcpServers'])
        
        # Merge project config (highest precedence)
        project_config = configs['project']
        if 'mcpServers' in project_config:
            effective.setdefault('mcpServers', {}).update(project_config['mcpServers'])
        
        return effective, issues
    
    def get_server_locations(self) -> Tuple[Dict[str, List[str]], List[str]]:
        """
        Get which scopes contain each server.
        
        Returns:
            Tuple of (server_to_scopes_dict, issues)
        """
        configs, issues = self.read_all_configs()
        server_locations = {}
        
        for scope in ['machine', 'user', 'project']:
            config = configs[scope]
            servers = config.get('mcpServers', {})
            
            for server_name in servers:
                server_locations.setdefault(server_name, []).append(scope)
        
        return server_locations, issues
    
    def detect_conflicts(self) -> Tuple[Dict[str, List[str]], List[str]]:
        """
        Detect servers configured in multiple scopes.
        
        Returns:
            Tuple of (conflicts_dict, issues)
        """
        server_locations, issues = self.get_server_locations()
        conflicts = {
            server: scopes for server, scopes in server_locations.items()
            if len(scopes) > 1
        }
        
        return conflicts, issues
    
    def detect_issues(self) -> List[str]:
        """
        Detect all configuration issues.
        
        Returns:
            List of issue descriptions
        """
        all_issues = []
        
        # Read all configs and collect basic issues
        configs, read_issues = self.read_all_configs()
        all_issues.extend(read_issues)
        
        # Check for legacy ~/.claude.json usage
        if configs['legacy']:
            all_issues.append("Legacy ~/.claude.json detected - should migrate to ~/.claude/settings.json")
        
        # Check for empty mcpServers overrides
        for scope in ['user', 'project']:
            config = configs[scope]
            if 'mcpServers' in config and config['mcpServers'] == {}:
                path = self.paths[scope]
                all_issues.append(f"Empty mcpServers:{{}} override in {path}")
        
        # Check for project-specific servers in ~/.claude.json
        legacy_config = configs['legacy']
        if 'projects' in legacy_config:
            current_dir = str(self.project_dir)
            for project_path, project_config in legacy_config['projects'].items():
                if 'mcpServers' in project_config:
                    all_issues.append(f"Project-specific mcpServers in ~/.claude.json for {project_path}")
        
        # Check for conflicts
        conflicts, _ = self.detect_conflicts()
        if conflicts:
            conflict_list = [f"{server}: {', '.join(scopes)}" for server, scopes in conflicts.items()]
            all_issues.append(f"Servers configured in multiple scopes: {'; '.join(conflict_list)}")
        
        return all_issues
    
    def validate_config(self, config: Dict, scope: str) -> List[str]:
        """
        Validate configuration structure and content.
        
        Args:
            config: Configuration dictionary to validate
            scope: Configuration scope for context
            
        Returns:
            List of validation issues
        """
        issues = []
        
        if not isinstance(config, dict):
            issues.append(f"Configuration must be an object, got {type(config).__name__}")
            return issues
        
        # Validate mcpServers section if present
        if 'mcpServers' in config:
            mcp_servers = config['mcpServers']
            
            if not isinstance(mcp_servers, dict):
                issues.append(f"mcpServers must be an object, got {type(mcp_servers).__name__}")
                return issues
            
            # Validate each server configuration
            for server_name, server_config in mcp_servers.items():
                if not isinstance(server_config, dict):
                    issues.append(f"Server '{server_name}' config must be an object")
                    continue
                
                # Check required fields
                if 'command' not in server_config:
                    issues.append(f"Server '{server_name}' missing required 'command' field")
                
                # Validate command field
                if 'command' in server_config:
                    command = server_config['command']
                    if not isinstance(command, str):
                        issues.append(f"Server '{server_name}' command must be a string")
                
                # Validate args field if present
                if 'args' in server_config:
                    args = server_config['args']
                    if not isinstance(args, list):
                        issues.append(f"Server '{server_name}' args must be an array")
                    elif not all(isinstance(arg, str) for arg in args):
                        issues.append(f"Server '{server_name}' args must be array of strings")
                
                # Validate env field if present
                if 'env' in server_config:
                    env = server_config['env']
                    if not isinstance(env, dict):
                        issues.append(f"Server '{server_name}' env must be an object")
                    elif not all(isinstance(k, str) and isinstance(v, str) for k, v in env.items()):
                        issues.append(f"Server '{server_name}' env must be object with string keys and values")
        
        return issues
    
    def write_config(self, scope: str, config: Dict) -> Tuple[bool, List[str]]:
        """
        Write configuration to a specific scope atomically.
        
        Args:
            scope: Configuration scope ('machine', 'user', 'project')
            config: Configuration dictionary to write
            
        Returns:
            Tuple of (success, issues)
        """
        if scope not in ['machine', 'user', 'project']:
            return False, [f"Invalid scope for writing: {scope}"]
        
        config_path = self.paths[scope]
        issues = []
        
        # Validate configuration before writing
        validation_issues = self.validate_config(config, scope)
        if validation_issues:
            return False, validation_issues
        
        # Ensure parent directory exists
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Check permissions for machine scope
        if scope == 'machine' and os.geteuid() != 0:
            return False, ["Machine scope requires administrator/root privileges"]
        
        try:
            with FileLock(config_path):
                # Write to temporary file first
                temp_path = config_path.with_suffix('.tmp')
                
                with open(temp_path, 'w', encoding='utf-8') as f:
                    json.dump(config, f, indent=2, ensure_ascii=False)
                
                # Atomic rename
                temp_path.rename(config_path)
                
            return True, []
            
        except (IOError, OSError) as e:
            issues.append(f"Error writing {config_path}: {e}")
            return False, issues
        except TimeoutError as e:
            issues.append(f"Lock timeout: {e}")
            return False, issues
    
    def add_server(self, scope: str, name: str, server_config: Dict) -> Tuple[bool, List[str]]:
        """
        Add a server to the specified scope.
        
        Args:
            scope: Configuration scope ('machine', 'user', 'project')
            name: Server name
            server_config: Server configuration dictionary
            
        Returns:
            Tuple of (success, issues)
        """
        config, read_issues = self.read_config(scope)
        if read_issues:
            return False, read_issues
        
        # Ensure mcpServers section exists
        config.setdefault('mcpServers', {})
        
        # Add the server
        config['mcpServers'][name] = server_config
        
        # Write back the configuration
        return self.write_config(scope, config)
    
    def remove_server(self, scope: str, name: str) -> Tuple[bool, List[str]]:
        """
        Remove a server from the specified scope.
        
        Args:
            scope: Configuration scope ('machine', 'user', 'project')
            name: Server name to remove
            
        Returns:
            Tuple of (success, issues)
        """
        config, read_issues = self.read_config(scope)
        if read_issues:
            return False, read_issues
        
        # Check if server exists
        servers = config.get('mcpServers', {})
        if name not in servers:
            return False, [f"Server '{name}' not found in {scope} scope"]
        
        # Remove the server
        del servers[name]
        
        # Remove empty mcpServers section
        if not servers:
            config.pop('mcpServers', None)
        
        # Write back the configuration
        return self.write_config(scope, config)
    
    def create_backup(self, scope: str) -> Tuple[Optional[Path], List[str]]:
        """
        Create a timestamped backup of a configuration file.
        
        Args:
            scope: Configuration scope to backup
            
        Returns:
            Tuple of (backup_path, issues)
        """
        if scope not in self.paths:
            return None, [f"Unknown scope: {scope}"]
        
        config_path = self.paths[scope]
        if not config_path.exists():
            return None, [f"No configuration file to backup at {config_path}"]
        
        timestamp = int(time.time())
        backup_name = f"{config_path.stem}_backup_{timestamp}{config_path.suffix}"
        backup_path = config_path.parent / backup_name
        
        try:
            import shutil
            shutil.copy2(config_path, backup_path)
            return backup_path, []
        except (IOError, OSError) as e:
            return None, [f"Error creating backup: {e}"]
    
    def restore_backup(self, backup_path: Path) -> Tuple[bool, List[str]]:
        """
        Restore configuration from a backup file.
        
        Args:
            backup_path: Path to backup file
            
        Returns:
            Tuple of (success, issues)
        """
        if not backup_path.exists():
            return False, [f"Backup file not found: {backup_path}"]
        
        # Determine target scope from backup filename
        backup_name = backup_path.stem
        if 'config_backup_' in backup_name:
            scope = 'machine'
        elif 'settings_backup_' in backup_name:
            scope = 'user'
        elif 'mcp_backup_' in backup_name:
            scope = 'project'
        else:
            return False, [f"Cannot determine scope from backup filename: {backup_name}"]
        
        target_path = self.paths[scope]
        
        try:
            import shutil
            with FileLock(target_path):
                shutil.copy2(backup_path, target_path)
            return True, []
        except (IOError, OSError) as e:
            return False, [f"Error restoring backup: {e}"]
        except TimeoutError as e:
            return False, [f"Lock timeout: {e}"]
    
    def migrate_claude_json(self) -> Tuple[bool, List[str]]:
        """
        Migrate ~/.claude.json to proper configuration files.
        
        Returns:
            Tuple of (success, issues)
        """
        legacy_path = self.paths['legacy']
        if not legacy_path.exists():
            return True, []  # Nothing to migrate
        
        config, read_issues = self.read_config('legacy')
        if read_issues:
            return False, read_issues
        
        issues = []
        migrated = False
        
        # Migrate user-level mcpServers
        if 'mcpServers' in config:
            user_config, _ = self.read_config('user')
            user_config.setdefault('mcpServers', {}).update(config['mcpServers'])
            
            success, write_issues = self.write_config('user', user_config)
            if not success:
                issues.extend(write_issues)
            else:
                migrated = True
        
        # Migrate project-specific configurations
        if 'projects' in config:
            current_dir = str(self.project_dir)
            
            for project_path, project_config in config['projects'].items():
                if project_path == current_dir and 'mcpServers' in project_config:
                    # Only migrate current project
                    existing_config, _ = self.read_config('project')
                    existing_config.setdefault('mcpServers', {}).update(project_config['mcpServers'])
                    
                    success, write_issues = self.write_config('project', existing_config)
                    if not success:
                        issues.extend(write_issues)
                    else:
                        migrated = True
        
        # Remove ~/.claude.json if migration was successful
        if migrated and not issues:
            try:
                legacy_path.unlink()
            except (IOError, OSError) as e:
                issues.append(f"Error removing legacy file: {e}")
        
        return len(issues) == 0, issues
    
    def repair_issues(self, issues: List[str]) -> Tuple[bool, List[str]]:
        """
        Attempt to repair detected configuration issues.
        
        Args:
            issues: List of issues to repair
            
        Returns:
            Tuple of (success, remaining_issues)
        """
        remaining_issues = []
        repair_success = True
        
        for issue in issues:
            if "Empty mcpServers:{} override" in issue:
                # Extract scope and path from issue
                if "settings.json" in issue:
                    scope = 'user'
                elif ".mcp.json" in issue:
                    scope = 'project'
                else:
                    remaining_issues.append(issue)
                    continue
                
                # Remove empty mcpServers
                config, read_issues = self.read_config(scope)
                if read_issues:
                    remaining_issues.extend(read_issues)
                    continue
                
                if 'mcpServers' in config and config['mcpServers'] == {}:
                    del config['mcpServers']
                    success, write_issues = self.write_config(scope, config)
                    if not success:
                        remaining_issues.extend(write_issues)
                        repair_success = False
                
            elif "Legacy ~/.claude.json detected" in issue:
                success, migrate_issues = self.migrate_claude_json()
                if not success:
                    remaining_issues.extend(migrate_issues)
                    repair_success = False
                    
            else:
                # Cannot automatically repair this issue
                remaining_issues.append(issue)
        
        return repair_success, remaining_issues