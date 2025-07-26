#!/usr/bin/env python3
"""
PolyScript-Compliant Development Environment Setup Script

A PolyScript v1.0 compliant tool for setting up cross-platform development environments.
Supports Windows, macOS, Linux, and WSL2 with robust error handling and automatic fixes.

PolyScript Modes:
- status: Show current tool installation state (default)
- test: Simulate installation without making changes
- sandbox: Test network connectivity and download URLs
- live: Actually install/update development tools
"""

import os
import sys
import io
import platform
import subprocess
import argparse
import logging
import json
import urllib.request
import tempfile
import shutil
from enum import Enum
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Callable, Any, Tuple, Union

# Try to import packaging for semantic versioning
try:
    from packaging import version
    HAS_PACKAGING = True
except ImportError:
    HAS_PACKAGING = False

# UTF-8 for Windows console
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

class OSType(Enum):
    WINDOWS = "Windows"
    LINUX = "Linux" 
    MACOS = "Darwin"
    WSL = "WSL"

@dataclass
class Tool:
    name: str
    check_cmd: List[str]
    install: Dict[Union[OSType, str], Any]
    version_url: Optional[str] = None
    version_parser: Optional[Callable] = None
    supported_os: Optional[List[OSType]] = None
    requires_admin: bool = False
    dependencies: Optional[List[str]] = None
    is_gui: bool = False

@dataclass
class PolyScriptOutput:
    """Standard PolyScript output structure"""
    mode: str
    operation: str = "setup"
    status: str = "success"
    message: str = ""
    data: Dict = None
    
    def __post_init__(self):
        if self.data is None:
            self.data = {}

class DevEnvironmentSetup:
    """PolyScript-compliant development environment setup tool"""
    
    def __init__(self, args):
        self.args = args
        self.mode = args.mode
        self.verbose = args.verbose
        self.force = args.force
        self.json_output = args.json
        
        # Environment detection
        self.os_type = self._detect_os()
        self.is_admin = self._check_admin()
        
        # Logging setup
        self.logger = self._setup_logging()
        
        # State tracking
        self.api_cache = {}
        self.check_mark = "✓" if self._can_unicode() else "[OK]"
        self.x_mark = "✗" if self._can_unicode() else "[X]"
        self.wsl2_issues_detected = False
        self.npm_user_dir_configured = False
        
        # Output data for JSON mode
        self.output = PolyScriptOutput(mode=self.mode)
        
        # WSL2-specific initialization (only in live mode to avoid timeouts)
        if self.os_type == OSType.WSL and self.mode == 'live':
            self._check_wsl2_environment()
    
    def _detect_os(self) -> OSType:
        system = platform.system()
        if system == "Linux" and "microsoft" in platform.uname().release.lower():
            return OSType.WSL
        return OSType(system)
    
    def _check_admin(self) -> bool:
        if self.os_type == OSType.WINDOWS:
            try:
                import ctypes
                return ctypes.windll.shell32.IsUserAnAdmin() != 0
            except (ImportError, AttributeError):
                return False
        else:
            return os.geteuid() == 0
    
    def _setup_logging(self) -> logging.Logger:
        level = logging.DEBUG if self.verbose else logging.INFO
        logging.basicConfig(
            level=level,
            format='%(asctime)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        return logging.getLogger(__name__)
    
    def _can_unicode(self) -> bool:
        # Don't print test characters in JSON mode to avoid contaminating output
        if self.json_output:
            return True  # Assume unicode works in JSON mode
        try:
            print("✓", end="", flush=True)
            print("\r", end="")
            return True
        except:
            return False
    
    def _check_wsl2_environment(self):
        """Check for common WSL2 issues and offer fixes"""
        issues = []
        
        # Check for Windows npm in PATH
        path = os.environ.get('PATH', '')
        windows_npm_paths = [p for p in path.split(':') if p.startswith('/mnt/c') and 'npm' in p.lower()]
        if windows_npm_paths:
            issues.append({
                'type': 'windows_npm_in_path',
                'message': 'Windows npm paths detected in WSL2 PATH',
                'paths': windows_npm_paths
            })
        
        # Check if npm is installed and where (with timeout)
        try:
            import signal
            def timeout_handler(signum, frame):
                raise TimeoutError("Command timed out")
            
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(2)  # 2 second timeout
            
            npm_path = shutil.which('npm')
            signal.alarm(0)  # Cancel timeout
            
            if npm_path and npm_path.startswith('/mnt/c'):
                issues.append({
                    'type': 'windows_npm_active',
                    'message': 'npm is pointing to Windows installation',
                    'path': npm_path
                })
        except (TimeoutError, Exception):
            try:
                signal.alarm(0)  # Cancel timeout if still active
            except:
                pass
        
        # Check npm global directory permissions (skip if npm not found quickly)
        try:
            if shutil.which('npm'):
                result = self.run_command(['npm', 'config', 'get', 'prefix'], check=False)
                if result.returncode == 0:
                    npm_prefix = result.stdout.strip()
                    if npm_prefix == '/usr' or npm_prefix == '/usr/local':
                        test_dir = os.path.join(npm_prefix, 'lib', 'node_modules')
                        if os.path.exists(test_dir) and not os.access(test_dir, os.W_OK):
                            issues.append({
                                'type': 'npm_needs_sudo',
                                'message': 'npm global directory requires sudo',
                                'path': test_dir
                            })
        except:
            pass
        
        # Check if user npm directory is configured
        npm_user_dir = os.path.expanduser('~/.npm-global')
        if os.path.exists(npm_user_dir) and npm_user_dir in path:
            self.npm_user_dir_configured = True
        
        if issues:
            self.wsl2_issues_detected = True
            self.output.data['wsl2_issues'] = issues
            if not self.json_output:
                self._report_wsl2_issues(issues)
    
    def _report_wsl2_issues(self, issues):
        """Report WSL2 issues and offer fixes"""
        if self.json_output:
            return
            
        print("\n" + "="*60)
        print("WSL2 ENVIRONMENT ISSUES DETECTED")
        print("="*60 + "\n")
        
        for issue in issues:
            print(f"{self.x_mark} {issue['message']}")
            if issue['type'] == 'windows_npm_in_path':
                print(f"  Found Windows paths: {', '.join(issue['paths'])}")
            elif issue['type'] == 'windows_npm_active':
                print(f"  npm location: {issue['path']}")
            elif issue['type'] == 'npm_needs_sudo':
                print(f"  Cannot write to: {issue['path']}")
        
        print("\nThese issues can cause installation failures.")
        
        if self.mode == 'live':
            if self.force:
                self._fix_wsl2_issues(issues)
            else:
                response = input("\nWould you like to fix these issues automatically? [Y/n]: ").strip().lower()
                if response != 'n':
                    self._fix_wsl2_issues(issues)
        else:
            print("\nTo fix these issues, run with --mode live")
    
    def _fix_wsl2_issues(self, issues):
        """Attempt to fix WSL2 issues"""
        fixes_applied = []
        
        # Fix npm permission issues by setting up user directory
        if any(i['type'] in ['npm_needs_sudo', 'windows_npm_active'] for i in issues):
            if not self.json_output:
                print(f"\n{self.check_mark} Setting up user-specific npm directory...")
            if self._setup_npm_user_directory():
                fixes_applied.append("Configured user npm directory")
                self.npm_user_dir_configured = True
        
        # Clean Windows paths from PATH
        if any(i['type'] == 'windows_npm_in_path' for i in issues):
            if not self.json_output:
                print(f"\n{self.check_mark} Cleaning Windows paths from PATH...")
            self._clean_windows_paths()
            fixes_applied.append("Cleaned Windows paths from current session")
        
        self.output.data['fixes_applied'] = fixes_applied
        
        if fixes_applied and not self.json_output:
            print(f"\n{self.check_mark} Applied fixes:")
            for fix in fixes_applied:
                print(f"  - {fix}")
            print("\nNote: You may need to restart your terminal for all changes to take effect.")
    
    def _setup_npm_user_directory(self) -> bool:
        """Set up user-specific npm directory to avoid permission issues"""
        try:
            npm_dir = os.path.expanduser('~/.npm-global')
            
            # Create directory if it doesn't exist
            if not os.path.exists(npm_dir):
                os.makedirs(npm_dir)
                self.logger.debug(f"Created npm user directory: {npm_dir}")
            
            # Configure npm to use this directory
            self.run_command(['npm', 'config', 'set', 'prefix', npm_dir], check=False)
            
            # Update PATH for current session
            current_path = os.environ.get('PATH', '')
            npm_bin = os.path.join(npm_dir, 'bin')
            if npm_bin not in current_path:
                os.environ['PATH'] = f"{npm_bin}:{current_path}"
            
            # Add to .bashrc for persistence
            bashrc = os.path.expanduser('~/.bashrc')
            export_line = f'export PATH="{npm_bin}:$PATH"'
            
            # Check if already in .bashrc
            add_to_bashrc = True
            if os.path.exists(bashrc):
                with open(bashrc, 'r') as f:
                    if export_line in f.read():
                        add_to_bashrc = False
            
            if add_to_bashrc:
                with open(bashrc, 'a') as f:
                    f.write(f'\n# Added by setup_dev_environment_polyscript.py\n{export_line}\n')
                self.logger.debug("Added npm user directory to .bashrc")
            
            return True
        except Exception as e:
            self.logger.error(f"Failed to setup npm user directory: {e}")
            return False
    
    def _clean_windows_paths(self):
        """Remove Windows paths from current PATH"""
        path = os.environ.get('PATH', '')
        path_parts = path.split(':')
        clean_parts = [p for p in path_parts if not p.startswith('/mnt/c')]
        os.environ['PATH'] = ':'.join(clean_parts)
        self.logger.debug("Cleaned Windows paths from PATH")
    
    def run_command(self, cmd, check=True, shell=False, capture=True):
        """Run command with proper encoding and platform handling"""
        if self.mode in ["test", "sandbox"] and not capture:
            self.logger.info(f"[{self.mode.upper()}] Would run: {cmd if isinstance(cmd, str) else ' '.join(cmd)}")
            return subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")
        
        self.logger.debug(f"Running: {cmd if isinstance(cmd, str) else ' '.join(cmd)}")
        
        # Handle WSL UTF-16 on Windows
        if self.os_type == OSType.WINDOWS and isinstance(cmd, list) and cmd[0] == 'wsl':
            result = subprocess.run(cmd, check=False, capture_output=capture, shell=shell)
            if capture and result.stdout:
                try:
                    stdout = result.stdout.decode('utf-16-le')
                except:
                    stdout = result.stdout.decode('utf-8', errors='ignore')
                result = subprocess.CompletedProcess(
                    cmd, result.returncode, 
                    stdout=stdout,
                    stderr=result.stderr.decode('utf-8', errors='ignore') if result.stderr else ""
                )
            if check and result.returncode != 0:
                raise subprocess.CalledProcessError(result.returncode, cmd)
            return result

        try:
            return subprocess.run(cmd, check=check, capture_output=capture, text=True, shell=shell)
        except FileNotFoundError:
            if self.os_type == OSType.WINDOWS and isinstance(cmd, list) and not cmd[0].endswith('.cmd'):
                cmd_alt = [cmd[0] + '.cmd'] + cmd[1:]
                self.logger.debug(f"Windows: Retrying with .cmd suffix: {' '.join(cmd_alt)}")
                result = subprocess.run(cmd_alt, check=check, capture_output=capture, text=True, shell=shell)
                if result.returncode == 0:
                    self.logger.debug(f"Success with .cmd suffix for {cmd[0]}")
                return result
            raise
    
    def check_tool(self, tool: Tool) -> Tuple[bool, Optional[str]]:
        """Check if tool is installed and get version"""
        # Special case for GUI apps
        if tool.is_gui:
            if tool.name == "Synergy":
                paths = [
                    "C:\\Program Files\\Synergy\\synergy.exe",
                    "C:\\Program Files (x86)\\Synergy\\synergy.exe",
                    "/Applications/Synergy.app"
                ]
                return any(os.path.exists(p) for p in paths), "GUI app"
        
        # Special handling for Node.js on Windows
        if tool.name == "Node.js" and self.os_type == OSType.WINDOWS:
            node_paths = [
                os.path.join(os.environ.get('ProgramFiles', 'C:\\Program Files'), 'nodejs', 'node.exe'),
                os.path.join(os.environ.get('ProgramFiles(x86)', 'C:\\Program Files (x86)'), 'nodejs', 'node.exe'),
            ]
            for node_path in node_paths:
                if os.path.exists(node_path):
                    try:
                        result = self.run_command([node_path, '--version'], check=False)
                        if result.returncode == 0:
                            version = self._extract_version(result.stdout)
                            return True, version
                    except:
                        pass
        
        # Special handling for Gemini CLI on Windows
        if tool.name == "Gemini CLI" and self.os_type == OSType.WINDOWS:
            gemini_paths = [
                os.path.join(os.environ.get('APPDATA', ''), 'npm', 'gemini.cmd'),
                os.path.join(os.environ.get('ProgramFiles', 'C:\\Program Files'), 'nodejs', 'gemini.cmd'),
            ]
            for gemini_path in gemini_paths:
                if os.path.exists(gemini_path):
                    try:
                        result = self.run_command([gemini_path, '--version'], check=False)
                        if result.returncode == 0:
                            version = self._extract_version(result.stdout)
                            return True, version
                    except:
                        pass
        
        # Standard tool check
        try:
            result = self.run_command(tool.check_cmd, check=False)
            if result.returncode != 0:
                return False, None

            if tool.name == "Ubuntu WSL" and self.os_type == OSType.WINDOWS:
                if "Ubuntu" in result.stdout:
                    test = self.run_command(['wsl', '-d', 'Ubuntu', 'echo', 'test'], check=False)
                    return test.returncode == 0, "installed"
                return False, None
                
            version = self._extract_version(result.stdout)
            return True, version
        except (FileNotFoundError, subprocess.CalledProcessError) as e:
            self.logger.debug(f"Check for {tool.name} failed: {e}")
            return False, None
    
    def _extract_version(self, output: str) -> str:
        """Extract version from command output"""
        if not output:
            return "unknown"
        line = output.strip().split('\n')[0]
        for word in line.split():
            if any(c.isdigit() for c in word):
                return word.strip('v')
        return line[:50]
    
    def get_latest_version(self, tool: Tool) -> Optional[str]:
        """Get latest version from API"""
        if not tool.version_url:
            return None
            
        data = self._fetch_json(tool.version_url)
        if data and tool.version_parser:
            return tool.version_parser(data)
        return None
    
    def _fetch_json(self, url: str) -> Optional[Dict]:
        """Fetch JSON with caching"""
        if url in self.api_cache:
            return self.api_cache[url]
            
        try:
            self.logger.debug(f"Fetching: {url}")
            req = urllib.request.Request(url, headers={'User-Agent': 'Setup/1.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode())
                self.api_cache[url] = data
                return data
        except Exception as e:
            self.logger.warning(f"API fetch failed: {e}")
            return None
    
    def compare_versions(self, v1: str, v2: str) -> int:
        """Compare two version strings. Returns -1, 0, or 1."""
        if HAS_PACKAGING:
            try:
                return (version.parse(v1) > version.parse(v2)) - (version.parse(v1) < version.parse(v2))
            except version.InvalidVersion:
                pass
        return (v1 > v2) - (v1 < v2)
    
    def _install_tool(self, tool: Tool) -> bool:
        """Install a tool using its configuration"""
        install_config = tool.install.get(self.os_type)
        
        if not install_config:
            # Check for npm global packages
            if 'npm_global' in tool.install:
                return self._install_npm_package(tool.install['npm_global'])
            self.logger.error(f"No installation method for {tool.name} on {self.os_type.value}")
            return False
        
        # Handle different installation types
        if isinstance(install_config, dict):
            if 'url_from_api' in install_config:
                return self._install_from_download(tool, install_config)
            elif 'manual' in install_config:
                if not self.json_output:
                    print(f"Manual installation required for {tool.name}: {install_config['manual']}")
                return True  # Consider manual instructions as success
        elif isinstance(install_config, list):
            return self._install_from_commands(install_config)
        
        return False
    
    def _install_from_download(self, tool: Tool, config: Dict) -> bool:
        """Install tool by downloading from URL"""
        try:
            url_config = config['url_from_api']
            api_url = url_config['api']
            pattern = url_config['pattern']
            
            # Get download URL
            api_data = self._fetch_json(api_url)
            if not api_data:
                self.logger.error(f"Failed to fetch API data for {tool.name}")
                return False
            
            download_url = None
            if 'url_template' in url_config:
                # Node.js style - construct URL from version
                latest_version = tool.version_parser(api_data) if tool.version_parser else None
                if latest_version:
                    download_url = url_config['url_template'].format(version=f"v{latest_version}")
            else:
                # GitHub releases style - find asset with pattern
                assets = api_data.get('assets', [])
                for asset in assets:
                    if pattern in asset['name']:
                        download_url = asset['browser_download_url']
                        break
            
            if not download_url:
                self.logger.error(f"Could not find download URL for {tool.name}")
                return False
            
            # Download and install
            if not self.json_output:
                self.logger.info(f"Downloading {tool.name} from {download_url}")
            
            with tempfile.TemporaryDirectory() as temp_dir:
                filename = os.path.basename(download_url)
                filepath = os.path.join(temp_dir, filename)
                
                # Download file
                urllib.request.urlretrieve(download_url, filepath)
                
                # Run installer
                install_cmd = config['install_cmd']
                cmd = [part.format(file=filepath) if '{file}' in part else part for part in install_cmd]
                
                result = self.run_command(cmd, check=False)
                return result.returncode == 0
                
        except Exception as e:
            self.logger.error(f"Failed to install {tool.name}: {e}")
            return False
    
    def _install_from_commands(self, commands: List[str]) -> bool:
        """Install tool by running a series of commands"""
        for cmd in commands:
            try:
                if isinstance(cmd, str) and ('|' in cmd or '&&' in cmd or 'curl' in cmd):
                    # Complex shell command
                    result = self.run_command(cmd, shell=True, check=False)
                else:
                    # Simple command
                    result = self.run_command(cmd.split() if isinstance(cmd, str) else cmd, check=False)
                
                if result.returncode != 0:
                    self.logger.error(f"Command failed: {cmd}")
                    return False
            except Exception as e:
                self.logger.error(f"Failed to run command '{cmd}': {e}")
                return False
        return True
    
    def _install_npm_package(self, package: str) -> bool:
        """Install npm package globally"""
        try:
            # Check if npm user directory is configured for WSL2
            if self.os_type == OSType.WSL and not self.npm_user_dir_configured:
                if not self.json_output:
                    self.logger.info("Setting up user npm directory for WSL2...")
                self._setup_npm_user_directory()
            
            cmd = ['npm', 'install', '-g', package]
            result = self.run_command(cmd, check=False)
            
            if result.returncode != 0:
                if "EACCES" in result.stderr and self.os_type in [OSType.LINUX, OSType.WSL]:
                    if not self.json_output:
                        self.logger.info("Permission error detected, setting up user npm directory...")
                    if self._setup_npm_user_directory():
                        # Retry installation
                        result = self.run_command(cmd, check=False)
                        return result.returncode == 0
                return False
            
            return True
        except Exception as e:
            self.logger.error(f"Failed to install npm package {package}: {e}")
            return False
    
    # PolyScript Mode Implementations
    
    def execute_status(self):
        """PolyScript Status Mode: Show current tool installation state"""
        self.output.operation = "status_check"
        
        if not self.json_output:
            print(f"Detected OS: {self.os_type.value}")
            print(f"Admin privileges: {'Yes' if self.is_admin else 'No'}")
            print("Checking installed development tools...\n")
        
        # Check all tools
        tool_status = {}
        for tool in TOOLS:
            if tool.supported_os and self.os_type not in tool.supported_os:
                tool_status[tool.name] = (False, None)
            else:
                tool_status[tool.name] = self.check_tool(tool)
        
        installed_count, missing_count, update_count = 0, 0, 0
        tools_data = []
        
        for tool in TOOLS:
            if tool.supported_os and self.os_type not in tool.supported_os:
                continue
            
            is_installed, version = tool_status[tool.name]
            tool_data = {
                'name': tool.name,
                'installed': is_installed,
                'version': version,
                'latest_version': None,
                'needs_update': False
            }
            
            if is_installed:
                latest = self.get_latest_version(tool)
                tool_data['latest_version'] = latest
                
                if latest and version != "unknown" and self.compare_versions(version, latest) < 0:
                    tool_data['needs_update'] = True
                    update_count += 1
                    if not self.json_output:
                        print(f"{self.check_mark} {tool.name:<15} {version} (Update: {latest})")
                else:
                    if not self.json_output:
                        print(f"{self.check_mark} {tool.name:<15} {version}")
                installed_count += 1
            else:
                missing_count += 1
                if not self.json_output:
                    print(f"{self.x_mark} {tool.name:<15} Not installed")
            
            tools_data.append(tool_data)
        
        # Prepare output data
        summary_data = {
            'os': self.os_type.value,
            'admin': self.is_admin,
            'installed_count': installed_count,
            'missing_count': missing_count,
            'update_count': update_count,
            'tools': tools_data
        }
        
        self.output.data.update(summary_data)
        
        if not self.json_output:
            # Build summary message
            summary_parts = [f"{installed_count} installed"]
            if missing_count > 0:
                summary_parts.append(f"{missing_count} missing")
            if update_count > 0:
                summary_parts.append(f"{update_count} update{'s' if update_count != 1 else ''} available")
            
            print(f"\nSummary: {', '.join(summary_parts)}")
            
            if missing_count > 0 or update_count > 0:
                print(f"\nTo install/update, run: python3 {os.path.basename(sys.argv[0])} --mode live")
        
        return 0
    
    def execute_test(self):
        """PolyScript Test Mode: Simulate installation without making changes"""
        self.output.operation = "simulate_install"
        
        if not self.json_output:
            print(f"[TEST MODE] Simulating installation on {self.os_type.value}")
            print("No actual changes will be made.\n")
        
        # Get current state
        tool_status = {}
        for tool in TOOLS:
            if tool.supported_os and self.os_type not in tool.supported_os:
                tool_status[tool.name] = (False, None)
            else:
                tool_status[tool.name] = self.check_tool(tool)
        
        operations = []
        
        for tool in TOOLS:
            if tool.supported_os and self.os_type not in tool.supported_os:
                continue
                
            is_installed, version = tool_status[tool.name]
            
            if is_installed:
                if not self.json_output:
                    self.logger.info(f"{self.check_mark} {tool.name} already installed")
                operations.append({
                    'tool': tool.name,
                    'action': 'skip',
                    'reason': 'already_installed',
                    'current_version': version
                })
            else:
                if not self.json_output:
                    self.logger.info(f"[TEST] Would install {tool.name}")
                operations.append({
                    'tool': tool.name,
                    'action': 'install',
                    'reason': 'missing'
                })
        
        self.output.data['operations'] = operations
        
        if not self.json_output:
            print(f"\n[TEST] Would perform {len([op for op in operations if op['action'] == 'install'])} installations")
        
        return 0
    
    def execute_sandbox(self):
        """PolyScript Sandbox Mode: Test dependencies and connectivity"""
        self.output.operation = "test_dependencies"
        
        if not self.json_output:
            print(f"[SANDBOX MODE] Testing dependencies and connectivity")
            print("Testing download URLs and package managers...\n")
        
        # Test API connectivity for version checking
        connectivity_tests = []
        
        for tool in TOOLS:
            if tool.version_url:
                test_result = {
                    'tool': tool.name,
                    'test_type': 'api',
                    'url': tool.version_url,
                    'success': False,
                    'error': None
                }
                
                try:
                    data = self._fetch_json(tool.version_url)
                    if data:
                        test_result['success'] = True
                        if not self.json_output:
                            print(f"{self.check_mark} {tool.name} API reachable")
                    else:
                        if not self.json_output:
                            print(f"{self.x_mark} {tool.name} API failed")
                except Exception as e:
                    test_result['error'] = str(e)
                    if not self.json_output:
                        print(f"{self.x_mark} {tool.name} API error: {e}")
                
                connectivity_tests.append(test_result)
        
        # Test package manager connectivity
        if self.os_type == OSType.WSL:
            # Test apt repositories
            test_result = {
                'tool': 'apt',
                'test_type': 'package_manager',
                'url': 'http://archive.ubuntu.com/ubuntu/',
                'success': False,
                'error': None
            }
            
            try:
                result = self.run_command(['curl', '-s', '--connect-timeout', '5', 'http://archive.ubuntu.com/ubuntu/'], check=False)
                if result.returncode == 0:
                    test_result['success'] = True
                    if not self.json_output:
                        print(f"{self.check_mark} APT repositories reachable")
                else:
                    if not self.json_output:
                        print(f"{self.x_mark} APT repositories unreachable")
            except Exception as e:
                test_result['error'] = str(e)
                if not self.json_output:
                    print(f"{self.x_mark} APT test error: {e}")
            
            connectivity_tests.append(test_result)
        
        self.output.data['connectivity_tests'] = connectivity_tests
        
        if not self.json_output:
            successful_tests = len([t for t in connectivity_tests if t['success']])
            total_tests = len(connectivity_tests)
            print(f"\n[SANDBOX] {successful_tests}/{total_tests} connectivity tests passed")
        
        return 0
    
    def execute_live(self):
        """PolyScript Live Mode: Actually install/update development tools"""
        self.output.operation = "install_tools"
        
        if not self.json_output:
            print(f"[LIVE MODE] Installing development tools on {self.os_type.value}")
            print("Making actual changes to your system...\n")
        
        # Get current state
        tool_status = {}
        for tool in TOOLS:
            if tool.supported_os and self.os_type not in tool.supported_os:
                tool_status[tool.name] = (False, None)
            else:
                tool_status[tool.name] = self.check_tool(tool)
        
        installation_results = []
        
        for tool in TOOLS:
            if tool.supported_os and self.os_type not in tool.supported_os:
                continue
                
            is_installed, version = tool_status[tool.name]
            
            result = {
                'tool': tool.name,
                'action': 'skip',
                'success': True,
                'message': 'Already installed'
            }
            
            if is_installed:
                if not self.json_output:
                    self.logger.info(f"{self.check_mark} {tool.name} already installed")
            else:
                result['action'] = 'install'
                
                if not self.json_output:
                    self.logger.info(f"Installing {tool.name}")
                
                # Actual installation logic
                try:
                    success = self._install_tool(tool)
                    result['success'] = success
                    
                    if success:
                        result['message'] = 'Installation completed successfully'
                        if not self.json_output:
                            self.logger.info(f"{self.check_mark} {tool.name} installed successfully")
                    else:
                        result['message'] = 'Installation failed'
                        if not self.json_output:
                            self.logger.error(f"{self.x_mark} {tool.name} installation failed")
                        
                except Exception as e:
                    result['success'] = False
                    result['message'] = str(e)
                    
                    if not self.json_output:
                        self.logger.error(f"{self.x_mark} {tool.name} installation failed: {e}")
            
            installation_results.append(result)
        
        self.output.data['installation_results'] = installation_results
        
        if not self.json_output:
            successful_installs = len([r for r in installation_results if r['action'] == 'install' and r['success']])
            attempted_installs = len([r for r in installation_results if r['action'] == 'install'])
            print(f"\n[LIVE] {successful_installs}/{attempted_installs} installations completed successfully")
        
        return 0
    
    def run(self):
        """Main execution method - routes to appropriate mode"""
        try:
            if self.mode == "status":
                result = self.execute_status()
            elif self.mode == "test":
                result = self.execute_test()
            elif self.mode == "sandbox":
                result = self.execute_sandbox()
            elif self.mode == "live":
                result = self.execute_live()
            else:
                self.output.status = "error"
                self.output.message = f"Unknown mode: {self.mode}"
                result = 1
            
            # Output results
            if self.json_output:
                print(json.dumps(asdict(self.output), indent=2))
            
            return result
            
        except KeyboardInterrupt:
            self.output.status = "cancelled"
            self.output.message = "Operation cancelled by user"
            if not self.json_output:
                print("\nOperation cancelled by user")
            return 1
        except Exception as e:
            self.output.status = "error"
            self.output.message = str(e)
            if not self.json_output:
                self.logger.error(f"Error: {e}")
            return 1

# Tool definitions - comprehensive with actual installation logic
TOOLS = [
    Tool(
        name="Git",
        check_cmd=["git", "--version"],
        version_url="https://api.github.com/repos/git-for-windows/git/releases/latest",
        version_parser=lambda d: d.get('tag_name', '').lstrip('v'),
        install={
            OSType.WINDOWS: {
                'url_from_api': {
                    'api': "https://api.github.com/repos/git-for-windows/git/releases/latest",
                    'pattern': '-64-bit.exe'
                },
                'install_cmd': ['{file}', '/SILENT']
            },
            OSType.LINUX: ["sudo", "apt-get", "install", "-y", "git"],
            OSType.WSL: ["sudo", "apt-get", "install", "-y", "git"],
            OSType.MACOS: ["brew", "install", "git"]
        }
    ),
    Tool(
        name="GitHub CLI",
        check_cmd=["gh", "--version"],
        version_url="https://api.github.com/repos/cli/cli/releases/latest",
        version_parser=lambda d: d.get('tag_name', '').lstrip('v'),
        install={
            OSType.WINDOWS: {
                'url_from_api': {
                    'api': "https://api.github.com/repos/cli/cli/releases/latest",
                    'pattern': '_windows_amd64.msi'
                },
                'install_cmd': ['msiexec', '/i', '{file}', '/quiet']
            },
            OSType.LINUX: [
                "type -p curl >/dev/null || (sudo apt update && sudo apt install curl -y)",
                "curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg",
                "sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg",
                "echo 'deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main' | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null",
                "sudo apt update",
                "sudo apt install gh -y"
            ],
            OSType.WSL: [
                "type -p curl >/dev/null || (sudo apt update && sudo apt install curl -y)",
                "curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg",
                "sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg",
                "echo 'deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main' | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null",
                "sudo apt update",
                "sudo apt install gh -y"
            ],
            OSType.MACOS: ["brew", "install", "gh"]
        }
    ),
    Tool(
        name="WSL2",
        check_cmd=["wsl", "--list", "--verbose"],
        supported_os=[OSType.WINDOWS],
        install={
            OSType.WINDOWS: [
                "dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart",
                "dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart"
            ]
        }
    ),
    Tool(
        name="Ubuntu WSL",
        check_cmd=["wsl", "--list", "--verbose"],
        supported_os=[OSType.WINDOWS],
        dependencies=["WSL2"],
        install={
            OSType.WINDOWS: ["wsl", "--install", "-d", "Ubuntu"]
        }
    ),
    Tool(
        name="Node.js",
        check_cmd=["node", "--version"],
        version_url="https://nodejs.org/dist/index.json",
        version_parser=lambda d: next((v['version'].lstrip('v') for v in d if v.get('lts')), None),
        install={
            OSType.WINDOWS: {
                'url_from_api': {
                    'api': "https://nodejs.org/dist/index.json",
                    'pattern': '-x64.msi',
                    'url_template': 'https://nodejs.org/dist/{version}/node-{version}-x64.msi'
                },
                'install_cmd': ['msiexec', '/i', '{file}', '/quiet']
            },
            OSType.LINUX: [
                "curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -",
                "sudo apt-get install -y nodejs"
            ],
            OSType.WSL: [
                "curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -",
                "sudo apt-get install -y nodejs"
            ],
            OSType.MACOS: ["brew", "install", "node"]
        }
    ),
    Tool(
        name="Claude Code",
        check_cmd=["claude", "--version"],
        supported_os=[OSType.LINUX, OSType.WSL, OSType.MACOS],
        dependencies=["Node.js"],
        install={
            'npm_global': '@anthropic-ai/claude-code'
        }
    ),
    Tool(
        name="Gemini CLI",
        check_cmd=["gemini", "--version"],
        dependencies=["Node.js"],
        install={
            'npm_global': '@google/gemini-cli'
        }
    ),
    Tool(
        name="Synergy",
        check_cmd=[],  # GUI app - no CLI check
        is_gui=True,
        supported_os=[OSType.WINDOWS, OSType.MACOS],
        install={
            OSType.WINDOWS: {"manual": "Download from symless.com/synergy"},
            OSType.MACOS: {"manual": "Download from symless.com/synergy"}
        }
    ),
]

def main():
    """Main entry point - PolyScript compliant"""
    parser = argparse.ArgumentParser(
        description="PolyScript-compliant development environment setup tool",
        epilog="Modes: status (default), test, sandbox, live"
    )
    
    # Required PolyScript arguments
    parser.add_argument(
        "--mode",
        choices=["status", "test", "sandbox", "live"],
        default="status",
        help="Execution mode: status (default), test, sandbox, or live"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output with detailed logging"
    )
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        help="Skip confirmations and apply fixes automatically"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results in JSON format"
    )
    
    args = parser.parse_args()
    
    # Check for missing packaging module
    if not HAS_PACKAGING and not args.json:
        print("Warning: 'packaging' module not found. Version comparison will be basic.")
        print("Install with: pip install packaging\n")
    
    # Create and run setup
    setup = DevEnvironmentSetup(args)
    return setup.run()

if __name__ == "__main__":
    sys.exit(main())