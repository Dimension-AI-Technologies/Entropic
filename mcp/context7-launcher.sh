#!/bin/bash
# Launcher script for Context7 MCP server on Ubuntu/WSL2
# This ensures proper PATH setup for npx and node

# WSL2 Ubuntu typical Node.js installation paths
# Check multiple possible locations for Node.js
NODE_PATHS=(
    "/home/$USER/.nvm/versions/node/*/bin"  # NVM installations
    "/usr/local/bin"                         # System-wide installation
    "/usr/bin"                               # Ubuntu package manager
    "$HOME/.local/bin"                       # User local installation
    "/opt/node/bin"                          # Custom installations
)

# Function to find node and npx
find_node_binaries() {
    for path_pattern in "${NODE_PATHS[@]}"; do
        # Expand the pattern (for NVM paths with wildcards)
        for path in $path_pattern; do
            if [ -d "$path" ] && [ -x "$path/node" ] && [ -x "$path/npx" ]; then
                NODE_BIN="$path/node"
                NPX_BIN="$path/npx"
                return 0
            fi
        done
    done
    return 1
}

# Try to find node binaries
if ! find_node_binaries; then
    # If not found, check if node is in PATH
    if command -v node >/dev/null 2>&1 && command -v npx >/dev/null 2>&1; then
        NODE_BIN=$(command -v node)
        NPX_BIN=$(command -v npx)
    else
        echo "Error: Node.js not found. Please install Node.js first." >&2
        echo "You can install it using:" >&2
        echo "  sudo apt update && sudo apt install nodejs npm" >&2
        echo "Or using NVM:" >&2
        echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash" >&2
        exit 1
    fi
fi

# Set up the PATH to include node binaries
NODE_DIR=$(dirname "$NODE_BIN")
export PATH="$NODE_DIR:$PATH"

# WSL2 specific: Ensure Windows paths don't interfere
# Remove Windows paths that might contain incompatible node versions
export PATH=$(echo "$PATH" | tr ':' '\n' | grep -v "/mnt/c" | tr '\n' ':')

# Add back only necessary Windows paths (for accessing Windows files)
export PATH="$PATH:/mnt/c/Users/$USER/source"

# Debug: Show what we're using (output to stderr to not interfere with MCP)
echo "Context7 MCP Server Launcher (WSL2/Ubuntu)" >&2
echo "Using node: $NODE_BIN ($(${NODE_BIN} --version))" >&2
echo "Using npx: $NPX_BIN" >&2
echo "Working directory: $(pwd)" >&2

# Set up environment for Context7
export CONTEXT7_ROOT="${CONTEXT7_ROOT:-/mnt/c/Users/mathew.burkitt/source/DT}"
export CONTEXT7_PROJECT_NAME="${CONTEXT7_PROJECT_NAME:-DT Projects}"
export CONTEXT7_LOG_LEVEL="${CONTEXT7_LOG_LEVEL:-info}"

# Check if Context7 is installed globally
if [ -f "$HOME/.npm-global/lib/node_modules/@upstash/context7-mcp/dist/index.js" ]; then
    # Use globally installed version
    CONTEXT7_SERVER="$HOME/.npm-global/lib/node_modules/@upstash/context7-mcp/dist/index.js"
    echo "Using global Context7: $CONTEXT7_SERVER" >&2
    exec "$NODE_BIN" "$CONTEXT7_SERVER" "$@"
elif [ -f "/usr/local/lib/node_modules/@upstash/context7-mcp/dist/index.js" ]; then
    # System-wide npm installation
    CONTEXT7_SERVER="/usr/local/lib/node_modules/@upstash/context7-mcp/dist/index.js"
    echo "Using system Context7: $CONTEXT7_SERVER" >&2
    exec "$NODE_BIN" "$CONTEXT7_SERVER" "$@"
else
    # Use npx to run the latest version
    echo "Running Context7 via npx..." >&2
    exec "$NODE_BIN" "$NPX_BIN" -y @upstash/context7-mcp "$@"
fi