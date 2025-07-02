#!/usr/bin/env python3
"""
Cross-platform Development Environment Setup Script - Compact Version
Data-driven approach to minimize code duplication
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
from dataclasses import dataclass
from typing import Optional, List, Dict, Callable, Any, Tuple, Union

# --- Fix: Add packaging library for semantic versioning ---
try:
    from packaging import version
    HAS_PACKAGING = True
except ImportError:
    HAS_PACKAGING = False

# UTF-8 for Windows
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
    # --- Fix (6): Correct type hint for install dict ---
    install: Dict[Union[OSType, str], Any]
    version_url: Optional[str] = None
    version_parser: Optional[Callable] = None
    supported_os: Optional[List[OSType]] = None
    requires_admin: bool = False
    # --- Fix (7): Correct type hint for optional dependencies ---
    dependencies: Optional[List[str]] = None
    is_gui: bool = False

class Setup:
    """Unified setup class - no inheritance needed"""
    
    def __init__(self, mode: str = "status", verbose: bool = False):
        self.mode = mode
        self.verbose = verbose
        self.os_type = self._detect_os()
        self.is_admin = self._check_admin()
        self.logger = self._setup_logging()
        if not HAS_PACKAGING and self.mode == 'status':
            self.logger.warning("'packaging' module not found. Version comparison will be basic.")
            self.logger.warning("Install with: pip install packaging")
        self.api_cache = {}
        self.check_mark = "✓" if self._can_unicode() else "[OK]"
        self.x_mark = "✗" if self._can_unicode() else "[X]"
        self.wsl2_issues_detected = False
        self.npm_user_dir_configured = False
        
        # Run WSL2-specific checks if on WSL
        if self.os_type == OSType.WSL:
            self._check_wsl2_environment()
        
    def _detect_os(self) -> OSType:
        system = platform.system()
        if system == "Linux" and "microsoft" in platform.uname().release.lower():
            return OSType.WSL
        return OSType(system)
        
    def _check_admin(self) -> bool:
        # --- Fix (1): Prevent os.geteuid() crash on Windows ---
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
        
        # Check if npm is installed and where
        try:
            npm_path = shutil.which('npm')
            if npm_path and npm_path.startswith('/mnt/c'):
                issues.append({
                    'type': 'windows_npm_active',
                    'message': 'npm is pointing to Windows installation',
                    'path': npm_path
                })
        except:
            pass
        
        # Check npm global directory permissions
        try:
            result = self.run_command(['npm', 'config', 'get', 'prefix'], check=False)
            if result.returncode == 0:
                npm_prefix = result.stdout.strip()
                if npm_prefix == '/usr' or npm_prefix == '/usr/local':
                    # Check if we can write to global npm directory
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
            self._report_wsl2_issues(issues)
    
    def _report_wsl2_issues(self, issues):
        """Report WSL2 issues and offer fixes"""
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
            print(f"\n{self.check_mark} Setting up user-specific npm directory...")
            if self._setup_npm_user_directory():
                fixes_applied.append("Configured user npm directory")
                self.npm_user_dir_configured = True
        
        # Clean Windows paths from PATH
        if any(i['type'] == 'windows_npm_in_path' for i in issues):
            print(f"\n{self.check_mark} Cleaning Windows paths from PATH...")
            self._clean_windows_paths()
            fixes_applied.append("Cleaned Windows paths from current session")
        
        if fixes_applied:
            print(f"\n{self.check_mark} Applied fixes:")
            for fix in fixes_applied:
                print(f"  - {fix}")
            print("\nNote: You may need to restart your terminal for all changes to take effect.")
            print("Run this script again after restarting to verify the fixes.")
        
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
                    f.write(f'\n# Added by setup_dev_environment.py\n{export_line}\n')
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
        """Run command with proper encoding and Windows .cmd fallback"""
        if self.mode in ["test", "sandbox"] and not capture:
            self.logger.info(f"[{self.mode.upper()}] Would run: {cmd if isinstance(cmd, str) else ' '.join(cmd)}")
            return subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")
            
        # --- Fix (3): Handle list commands with shell=True ---
        if shell and isinstance(cmd, list):
            cmd_str = ' '.join(cmd)
            self.logger.debug(f"Running (shell): {cmd_str}")
            cmd = cmd_str
        else:
            self.logger.debug(f"Running: {cmd if isinstance(cmd, str) else ' '.join(cmd)}")

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
        if tool.is_gui:
            if tool.name == "Synergy":
                paths = [
                    "C:\\Program Files\\Synergy\\synergy.exe",
                    "C:\\Program Files (x86)\\Synergy\\synergy.exe",
                    "/Applications/Synergy.app"
                ]
                return any(os.path.exists(p) for p in paths), "GUI app"
        
        # Special handling for Node.js on Windows - check standard paths
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
        
        # Special handling for Gemini CLI on Windows - check npm global install path
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
            
    def install_tool(self, tool: Tool) -> bool:
        """Install a tool based on OS-specific config"""
        config = tool.install.get(self.os_type)
        if self.os_type == OSType.WSL and not config:
            config = tool.install.get(OSType.LINUX)
        
        if 'npm_global' in tool.install:
            pkg = tool.install['npm_global']
            if self.os_type == OSType.WINDOWS:
                # Try to find npm.cmd in Node.js installation directory
                npm_paths = [
                    os.path.join(os.environ.get('ProgramFiles', 'C:\\Program Files'), 'nodejs', 'npm.cmd'),
                    os.path.join(os.environ.get('ProgramFiles(x86)', 'C:\\Program Files (x86)'), 'nodejs', 'npm.cmd'),
                    'npm.cmd'  # Fallback to PATH
                ]
                npm_cmd = None
                for npm_path in npm_paths:
                    if os.path.exists(npm_path):
                        npm_cmd = npm_path
                        self.logger.debug(f"Found npm at: {npm_path}")
                        break
                if not npm_cmd:
                    npm_cmd = 'npm.cmd'  # Last resort
                
                # Check if npm global directory exists and is writable
                npm_prefix = os.path.join(os.environ.get('APPDATA', ''), 'npm')
                if not os.path.exists(npm_prefix):
                    try:
                        os.makedirs(npm_prefix)
                        self.logger.debug(f"Created npm global directory: {npm_prefix}")
                    except Exception as e:
                        self.logger.warning(f"Could not create npm global directory: {e}")
            else:
                npm_cmd = 'npm'
                # On WSL2, use user npm directory if configured
                if self.os_type == OSType.WSL and self.npm_user_dir_configured:
                    npm_prefix = os.path.expanduser('~/.npm-global')
                    self.logger.debug(f"Using npm user directory: {npm_prefix}")
            config = [npm_cmd, "install", "-g", pkg]

        if not config:
            self.logger.error(f"No install config for {tool.name} on {self.os_type.value}")
            return False
            
        if self.mode == "test":
            self.logger.info(f"[TEST] Would install {tool.name}")
            return True
        elif self.mode == "sandbox":
            return self._test_download(tool, config)
            
        try:
            if isinstance(config, list):
                # Special handling for npm commands
                if len(config) > 1 and (config[0].endswith('npm.cmd') or config[0] == 'npm') and config[1] == 'install':
                    try:
                        # Ensure Node.js is in PATH for npm post-install scripts
                        if self.os_type == OSType.WINDOWS:
                            node_dir = os.path.dirname(config[0])  # Get directory containing npm.cmd
                            current_path = os.environ.get('PATH', '')
                            if node_dir not in current_path:
                                os.environ['PATH'] = f"{node_dir};{current_path}"
                                self.logger.debug(f"Added {node_dir} to PATH for npm")
                        
                        # Pre-emptively check for corrupted Gemini CLI installation
                        if '@google/gemini-cli' in str(config):
                            gemini_path = os.path.join(os.environ.get('APPDATA', ''), 'npm', 'node_modules', '@google', 'gemini-cli')
                            if os.path.exists(gemini_path):
                                self.logger.info("Found existing Gemini CLI installation. Cleaning up before reinstall...")
                                try:
                                    import shutil
                                    parent_path = os.path.join(os.environ.get('APPDATA', ''), 'npm', 'node_modules', '@google')
                                    shutil.rmtree(parent_path, ignore_errors=True)
                                    self.logger.info("Cleaned up existing installation")
                                except Exception as e:
                                    self.logger.warning(f"Could not clean up existing installation: {e}")
                        
                        result = self.run_command(config, check=False)
                        if result.returncode != 0:
                            self.logger.error(f"npm install failed with code: {result.returncode}")
                            if result.stdout:
                                self.logger.error(f"stdout: {result.stdout}")
                            if result.stderr:
                                self.logger.error(f"stderr: {result.stderr}")
                            
                            # Handle WSL2 EACCES permission errors
                            if self.os_type == OSType.WSL and "EACCES" in str(result.stderr):
                                self.logger.warning("\nPermission denied error detected.")
                                if not self.npm_user_dir_configured:
                                    print(f"\n{self.x_mark} npm global installation requires sudo or user configuration.")
                                    if self.mode == 'live':
                                        response = input("Would you like to set up a user npm directory? [Y/n]: ").strip().lower()
                                        if response != 'n':
                                            if self._setup_npm_user_directory():
                                                self.npm_user_dir_configured = True
                                                print(f"{self.check_mark} User npm directory configured.")
                                                print("Retrying installation...")
                                                # Retry with updated configuration
                                                result = self.run_command(config, check=False)
                                                if result.returncode == 0:
                                                    return True
                                    else:
                                        print("Run with --mode live to fix this automatically.")
                                return False
                            
                            # If EPERM error, try to clean up corrupted installation
                            elif "EPERM" in str(result.stderr) and "@google" in str(result.stderr):
                                self.logger.warning("Permission error detected. Attempting to clean up corrupted installation...")
                                cleanup_path = os.path.join(os.environ.get('APPDATA', ''), 'npm', 'node_modules', '@google')
                                if os.path.exists(cleanup_path):
                                    try:
                                        import shutil
                                        shutil.rmtree(cleanup_path, ignore_errors=True)
                                        self.logger.info("Cleaned up corrupted @google directory. Retrying installation...")
                                        
                                        # Retry the installation
                                        result = self.run_command(config, check=False)
                                        if result.returncode == 0:
                                            self.logger.info("Installation succeeded after cleanup!")
                                            return True
                                        else:
                                            self.logger.error("Installation still failed after cleanup")
                                    except Exception as e:
                                        self.logger.error(f"Could not clean up corrupted installation: {e}")
                                        self.logger.warning("Please manually remove: %APPDATA%\\npm\\node_modules\\@google")
                            return False
                        return True
                    except Exception as e:
                        self.logger.error(f"npm command failed: {e}")
                        return False
                # Special handling for winget commands
                elif config[0] == 'winget' and 'install' in config:
                    try:
                        result = self.run_command(config, check=False)
                        if result.returncode == 2316632107:  # Already installed
                            self.logger.info(f"{tool.name} already installed via winget")
                            if tool.name == "Node.js" and self.os_type == OSType.WINDOWS:
                                self._refresh_windows_path()
                            return True
                        elif result.returncode != 0:
                            self.logger.error(f"winget error code: {result.returncode}")
                            if result.stdout:
                                self.logger.error(f"stdout: {result.stdout}")
                            if result.stderr:
                                self.logger.error(f"stderr: {result.stderr}")
                            return False
                    except Exception as e:
                        self.logger.error(f"winget command failed: {e}")
                        return False
                else:
                    self.run_command(config)
            elif isinstance(config, dict):
                if 'github_release' in config or 'download' in config:
                    return self._install_download(tool, config)
                elif 'commands' in config:
                    for cmd in config['commands']:
                        self.run_command(cmd, shell='shell' in config)
                elif 'manual' in config:
                    self.logger.warning(config['manual'])
                    return False
            # Special handling for Node.js on Windows - refresh PATH
            if tool.name == "Node.js" and self.os_type == OSType.WINDOWS and self.mode == "live":
                self._refresh_windows_path()
            return True
        except Exception as e:
            self.logger.error(f"Install failed: {e}")
            return False

    def _needs_sudo(self, config) -> bool:
        """Check if installation config requires sudo"""
        if isinstance(config, list):
            return any('sudo' in str(cmd) for cmd in config)
        elif isinstance(config, dict):
            if 'commands' in config:
                return any('sudo' in str(cmd) for cmd in config['commands'])
        return False
    
    def _pre_install_checks(self, tool: Tool) -> bool:
        """Perform pre-installation checks for WSL2"""
        if self.os_type != OSType.WSL:
            return True
            
        # Special handling for Node.js on WSL2
        if tool.name == "Node.js":
            # Check if npm is already installed via apt
            try:
                result = self.run_command(['dpkg', '-l', 'npm'], check=False)
                if result.returncode == 0 and 'ii  npm' in result.stdout:
                    print(f"\n{self.x_mark} Detected npm installed via apt, which can conflict with NodeSource.")
                    if self.mode == 'live':
                        response = input("Would you like to remove apt npm and use NodeSource? [Y/n]: ").strip().lower()
                        if response != 'n':
                            print("Removing apt npm package...")
                            self.run_command(['sudo', 'apt', 'remove', '-y', 'npm'], check=False)
                            return True
                    else:
                        print("Run with --mode live to fix this automatically.")
                        return False
            except:
                pass
                
        return True
    
    def _refresh_windows_path(self):
        """Try to refresh PATH for current session after winget install"""
        try:
            # Get the new PATH from registry
            import winreg
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                              r'SYSTEM\CurrentControlSet\Control\Session Manager\Environment') as key:
                system_path, _ = winreg.QueryValueEx(key, 'PATH')
            
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 
                              r'Environment') as key:
                user_path, _ = winreg.QueryValueEx(key, 'PATH')
            
            # Combine paths
            new_path = f"{system_path};{user_path}"
            os.environ['PATH'] = new_path
            self.logger.debug("PATH environment variable refreshed")
        except Exception as e:
            self.logger.debug(f"Could not refresh PATH: {e}")
    
    def _get_github_release_url(self, repo: str, pattern: str) -> Optional[str]:
        api_url = f"https://api.github.com/repos/{repo}/releases/latest"
        data = self._fetch_json(api_url)
        if not data: return None
        for asset in data.get('assets', []):
            if pattern in asset['name']:
                return asset['browser_download_url']
        self.logger.error(f"No asset matching '{pattern}' in repo '{repo}'")
        return None

    # --- Fix (8): Add download progress indicator ---
    def _download_progress_hook(self, count, block_size, total_size):
        percent = int(count * block_size * 100 / total_size)
        sys.stdout.write(f"\r    Downloading... {percent}%")
        sys.stdout.flush()

    def _install_download(self, tool: Tool, config: Dict) -> bool:
        """Handle download-based installation"""
        url = None
        if 'github_release' in config:
            url = self._get_github_release_url(config['github_release'], config['asset_pattern'])
        elif 'download' in config:
            url = config['download']
        
        if not url:
            self.logger.error(f"Could not determine download URL for {tool.name}")
            return False
            
        filename = os.path.basename(url)
        filepath = os.path.join(tempfile.gettempdir(), filename)
        
        # --- Fix (9): Add temp file cleanup ---
        try:
            self.logger.info(f"Downloading {url}")
            urllib.request.urlretrieve(url, filepath, self._download_progress_hook)
            sys.stdout.write("\n") # Newline after progress bar
            
            if 'install_cmd' in config:
                cmd = [filepath if x == '{file}' else x for x in config['install_cmd']]
                self.run_command(cmd)
            return True
        except Exception as e:
            self.logger.error(f"Download/install failed: {e}")
            return False
        finally:
            if os.path.exists(filepath):
                os.remove(filepath)
                self.logger.debug(f"Cleaned up temp file: {filepath}")

    def _test_url(self, url: str) -> bool:
        """Generic URL HEAD request test."""
        try:
            req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'Setup/1.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                self.logger.info(f"[SANDBOX] URL valid (HTTP {response.status}): {url}")
                # --- Fix (4): Prevent division by zero / ValueError ---
                try:
                    if size_str := response.headers.get('Content-Length'):
                        size_mb = int(size_str) / 1024 / 1024
                        self.logger.info(f"[SANDBOX] Size: {size_mb:.1f} MB")
                except (ValueError, TypeError):
                    self.logger.warning("[SANDBOX] Could not parse Content-Length header.")
            return True
        except Exception as e:
            self.logger.error(f"[SANDBOX] URL test failed for {url}: {e}")
            return False

    def _test_download(self, tool: Tool, config: Any) -> bool:
        """Test downloads for sandbox mode"""
        self.logger.info(f"[SANDBOX] Testing {tool.name} resources")
        
        url = None
        if isinstance(config, dict):
            if 'github_release' in config:
                url = self._get_github_release_url(config['github_release'], config['asset_pattern'])
            elif 'download' in config:
                url = config['download']
        
        if url:
            return self._test_url(url)
        else:
            # --- Fix (10): Add sandbox tests for package managers ---
            self.logger.info(f"[SANDBOX] {tool.name} uses a package manager or npm.")
            if 'npm_global' in tool.install:
                return self._test_url("https://registry.npmjs.org/")
            if self.os_type in [OSType.LINUX, OSType.WSL]:
                return self._test_url("http://deb.debian.org/")
            if self.os_type == OSType.MACOS:
                return self._test_url("https://formulae.brew.sh/api/formula.json")
            return True

    # --- Fix (5): Add semantic version comparison ---
    def compare_versions(self, v1: str, v2: str) -> int:
        """Compare two version strings. Returns -1, 0, or 1."""
        if HAS_PACKAGING:
            try:
                return (version.parse(v1) > version.parse(v2)) - (version.parse(v1) < version.parse(v2))
            except version.InvalidVersion:
                pass # Fallback to string comparison
        return (v1 > v2) - (v1 < v2)

    def run(self):
        """Main execution"""
        print(f"Detected OS: {self.os_type.value}")
        print(f"Admin privileges: {'Yes' if self.is_admin else 'No'}")
        print(f"Execution mode: {self.mode.upper()}\n")
        
        if self.mode == "status":
            print("Checking installed development tools...\n")
            
        # --- Fix (2): Efficient O(n) dependency checking ---
        # Only check tools that are supported on this OS
        tool_status = {}
        for tool in TOOLS:
            if tool.supported_os and self.os_type not in tool.supported_os:
                tool_status[tool.name] = (False, None)
            else:
                tool_status[tool.name] = self.check_tool(tool)
        
        installed_count, missing_count, update_count = 0, 0, 0
        needs_sudo = []
        
        for tool in TOOLS:
            if tool.supported_os and self.os_type not in tool.supported_os:
                self.logger.debug(f"Skipping {tool.name} - not for {self.os_type.value}")
                continue
                
            if tool.dependencies:
                deps_met = all(tool_status[dep_name][0] for dep_name in tool.dependencies)
                if not deps_met:
                    self.logger.debug(f"Skipping {tool.name} - missing dependencies")
                    continue
                    
            is_installed, version = tool_status[tool.name]
            
            if self.mode == "status":
                if is_installed:
                    latest = self.get_latest_version(tool)
                    update_info = ""
                    if latest and version != "unknown" and self.compare_versions(version, latest) < 0:
                        update_info = f" (Update: {latest})"
                        update_count += 1
                    
                    print(f"{self.check_mark} {tool.name:<15} {version}{update_info}")
                    installed_count += 1
                else:
                    print(f"{self.x_mark} {tool.name:<15} Not installed")
                    missing_count += 1
            elif is_installed:
                self.logger.info(f"{self.check_mark} {tool.name} already installed")
            else:
                if tool.requires_admin and not self.is_admin and self.mode == "live":
                    self.logger.error("Admin required - relaunch with sudo/admin")
                    sys.exit(1)
                
                # Check if we need sudo for Linux/WSL installations
                if self.mode == "live" and self.os_type in [OSType.LINUX, OSType.WSL]:
                    install_config = tool.install.get(self.os_type, tool.install.get(OSType.LINUX))
                    if install_config and self._needs_sudo(install_config) and not self.is_admin:
                        self.logger.warning(f"\n{tool.name} requires sudo privileges to install.")
                        needs_sudo.append(tool.name)
                        missing_count += 1
                        continue
                    
                # Run pre-installation checks for WSL2
                if not self._pre_install_checks(tool):
                    missing_count += 1
                    continue
                    
                self.logger.info(f"Installing {tool.name}")
                if self.install_tool(tool):
                    self.logger.info(f"{self.check_mark} {tool.name} installed or test passed")
                    # Special message for Node.js on Windows
                    if tool.name == "Node.js" and self.os_type == OSType.WINDOWS and self.mode == "live":
                        self.logger.warning("Note: Node.js was installed but may not be available in this session.")
                        self.logger.warning("Please restart your terminal or run: refreshenv")
                else:
                    self.logger.error(f"{self.x_mark} {tool.name} failed")
                    
        if self.mode == "status":
            # Build summary message
            summary_parts = [f"{installed_count} installed"]
            if missing_count > 0:
                summary_parts.append(f"{missing_count} missing")
            if update_count > 0:
                summary_parts.append(f"{update_count} update{'s' if update_count != 1 else ''} available")
            
            print(f"\nSummary: {', '.join(summary_parts)}")
            
            if missing_count > 0 or update_count > 0:
                if needs_sudo and self.os_type in [OSType.LINUX, OSType.WSL]:
                    print(f"\n{len(needs_sudo)} tools require sudo to install: {', '.join(needs_sudo)}")
                    print(f"To install all tools, run: sudo python3 {os.path.basename(sys.argv[0])} --mode live")
                else:
                    print(f"\nTo install/update, run: python3 {os.path.basename(sys.argv[0])} --mode live")
        else:
            if self.mode == "live" and needs_sudo:
                print(f"\n[LIVE] Finished. {len(needs_sudo)} tools skipped (need sudo): {', '.join(needs_sudo)}")
                print(f"To install these, run: sudo python3 {os.path.basename(sys.argv[0])} --mode live")
            else:
                print(f"\n[{self.mode.upper()}] Finished")
                
        # Additional message for WSL2 users
        if self.os_type == OSType.WSL and self.wsl2_issues_detected and self.mode != 'live':
            print("\n" + "="*60)
            print("NOTE: WSL2 environment issues were detected earlier.")
            print("Run with --mode live to fix them automatically.")
            print("="*60)

# --- Data-driven Tool Definitions ---
TOOLS = [
    Tool(
        name="Git",
        check_cmd=["git", "--version"],
        version_url="https://api.github.com/repos/git-for-windows/git/releases/latest",
        version_parser=lambda d: d.get('tag_name', '').lstrip('v'),
        install={
            OSType.WINDOWS: {
                'github_release': 'git-for-windows/git',
                'asset_pattern': '-64-bit.exe',
                'install_cmd': ['{file}', '/SILENT']
            },
            OSType.LINUX: ["sudo", "apt-get", "install", "-y", "git"],
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
                'github_release': 'cli/cli',
                'asset_pattern': '.msi',
                'install_cmd': ['msiexec', '/i', '{file}', '/quiet']
            },
            OSType.LINUX: {
                'commands': [
                    ["sudo", "sh", "-c", "curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg"],
                    ["sudo", "sh", "-c", 'echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list'],
                    ["sudo", "apt-get", "update"],
                    ["sudo", "apt-get", "install", "-y", "gh"]
                ]
            },
            OSType.MACOS: ["brew", "install", "gh"]
        }
    ),
    Tool(
        name="WSL2",
        check_cmd=["wsl", "--version"],
        supported_os=[OSType.WINDOWS],
        requires_admin=True,
        install={
            OSType.WINDOWS: {
                'commands': [
                    ["powershell", "-Command", "Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart"],
                    ["powershell", "-Command", "Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart"],
                    ["wsl", "--set-default-version", "2"]
                ]
            }
        }
    ),
    Tool(
        name="Ubuntu WSL",
        check_cmd=["wsl", "--list"],
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
        version_parser=lambda d: next((v['version'] for v in d if v.get('lts')), None),
        install={
            OSType.WINDOWS: ["winget", "install", "--id", "OpenJS.NodeJS.LTS", "--silent"],
            OSType.LINUX: {
                'commands': [
                    "curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -",
                    ["sudo", "apt-get", "install", "-y", "nodejs"]
                ],
                'shell': True
            },
            OSType.MACOS: ["brew", "install", "node"]
        }
    ),
    Tool(
        name="Claude Code",
        check_cmd=["claude", "--version"],
        supported_os=[OSType.LINUX, OSType.WSL, OSType.MACOS],
        dependencies=["Node.js"],
        install={'npm_global': '@anthropic-ai/claude-code'}
    ),
    Tool(
        name="Gemini CLI",
        check_cmd=["gemini", "--version"],
        dependencies=["Node.js"],
        install={'npm_global': '@google/gemini-cli'}
    ),
    Tool(
        name="Synergy",
        check_cmd=["synergy", "--version"],
        supported_os=[OSType.WINDOWS, OSType.MACOS],
        is_gui=True,
        install={
            OSType.WINDOWS: {'manual': "Please download Synergy from https://symless.com/synergy/download"},
            OSType.MACOS: ["brew", "install", "--cask", "synergy"]
        }
    ),
]

def main():
    parser = argparse.ArgumentParser(
        description="Cross-platform Development Environment Setup (Compact)",
        epilog="Modes: status (default), test, sandbox, live"
    )
    parser.add_argument("--mode", choices=["status", "test", "sandbox", "live"], 
                       default="status", help="Execution mode")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    try:
        setup = Setup(mode=args.mode, verbose=args.verbose)
        setup.run()
    except KeyboardInterrupt:
        print("\nCancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
