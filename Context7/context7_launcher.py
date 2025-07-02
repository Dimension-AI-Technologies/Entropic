#!/usr/bin/env python3
"""
Context7 MCP Server Launcher for Ubuntu/WSL2

This script ensures proper PATH setup for npx and node to launch the Context7 MCP server.
It handles various Node.js installation methods and WSL2-specific path issues.

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
"""

import os
import sys
import subprocess
import glob
from pathlib import Path
from typing import Optional, Tuple


def find_node_binaries() -> Optional[Tuple[str, str]]:
    """Find node and npx binaries in common installation locations."""
    
    # WSL2 Ubuntu typical Node.js installation paths
    node_paths = [
        # NVM installations (need to expand wildcards)
        f"/home/{os.environ.get('USER', 'user')}/.nvm/versions/node/*/bin",
        "/usr/local/bin",                    # System-wide installation
        "/usr/bin",                          # Ubuntu package manager
        f"{Path.home()}/.local/bin",         # User local installation
        "/opt/node/bin",                     # Custom installations
    ]
    
    # Check each path pattern
    for path_pattern in node_paths:
        # Expand wildcards
        for path in glob.glob(path_pattern):
            if not os.path.isdir(path):
                continue
                
            node_bin = os.path.join(path, "node")
            npx_bin = os.path.join(path, "npx")
            
            if os.path.isfile(node_bin) and os.access(node_bin, os.X_OK) and \
               os.path.isfile(npx_bin) and os.access(npx_bin, os.X_OK):
                return node_bin, npx_bin
    
    # If not found in specific paths, check if they're in PATH
    try:
        node_bin = subprocess.check_output(["which", "node"], text=True).strip()
        npx_bin = subprocess.check_output(["which", "npx"], text=True).strip()
        if node_bin and npx_bin:
            return node_bin, npx_bin
    except subprocess.CalledProcessError:
        pass
    
    return None


def setup_wsl2_path(node_dir: str) -> None:
    """Set up PATH for WSL2, removing Windows paths that might interfere."""
    current_path = os.environ.get("PATH", "")
    
    # Remove Windows paths that might contain incompatible node versions
    path_parts = [p for p in current_path.split(":") if not p.startswith("/mnt/c")]
    
    # Add node directory at the beginning
    path_parts.insert(0, node_dir)
    
    # Add back only necessary Windows paths (for accessing Windows files)
    user = os.environ.get("USER", "user")
    path_parts.append(f"/mnt/c/Users/{user}/source")
    
    os.environ["PATH"] = ":".join(path_parts)


def get_node_version(node_bin: str) -> str:
    """Get Node.js version."""
    try:
        return subprocess.check_output([node_bin, "--version"], text=True).strip()
    except subprocess.CalledProcessError:
        return "unknown"


def find_context7_server() -> Optional[str]:
    """Find installed Context7 server."""
    possible_locations = [
        f"{Path.home()}/.npm-global/lib/node_modules/@upstash/context7-mcp/dist/index.js",
        "/usr/local/lib/node_modules/@upstash/context7-mcp/dist/index.js",
    ]
    
    for location in possible_locations:
        if os.path.isfile(location):
            return location
    
    return None


def main():
    """Main launcher function."""
    # Find node binaries
    node_binaries = find_node_binaries()
    if not node_binaries:
        print("Error: Node.js not found. Please install Node.js first.", file=sys.stderr)
        print("You can install it using:", file=sys.stderr)
        print("  sudo apt update && sudo apt install nodejs npm", file=sys.stderr)
        print("Or using NVM:", file=sys.stderr)
        print("  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash", file=sys.stderr)
        sys.exit(1)
    
    node_bin, npx_bin = node_binaries
    node_dir = os.path.dirname(node_bin)
    
    # Set up PATH for WSL2
    setup_wsl2_path(node_dir)
    
    # Debug info (output to stderr to not interfere with MCP)
    print("Context7 MCP Server Launcher (WSL2/Ubuntu)", file=sys.stderr)
    print(f"Using node: {node_bin} ({get_node_version(node_bin)})", file=sys.stderr)
    print(f"Using npx: {npx_bin}", file=sys.stderr)
    print(f"Working directory: {os.getcwd()}", file=sys.stderr)
    
    # Set up environment for Context7
    os.environ.setdefault("CONTEXT7_ROOT", "/mnt/c/Users/mathew.burkitt/source/DT")
    os.environ.setdefault("CONTEXT7_PROJECT_NAME", "DT Projects")
    os.environ.setdefault("CONTEXT7_LOG_LEVEL", "info")
    
    # Find Context7 server
    context7_server = find_context7_server()
    
    # Prepare command and arguments
    args = sys.argv[1:]  # Pass through any command line arguments
    
    if context7_server:
        # Use locally installed version
        print(f"Using local Context7: {context7_server}", file=sys.stderr)
        cmd = [node_bin, context7_server] + args
    else:
        # Use npx to run the latest version
        print("Running Context7 via npx...", file=sys.stderr)
        cmd = [node_bin, npx_bin, "-y", "@upstash/context7-mcp"] + args
    
    # Execute the command, replacing this process
    try:
        os.execv(cmd[0], cmd)
    except OSError as e:
        print(f"Error executing Context7: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()