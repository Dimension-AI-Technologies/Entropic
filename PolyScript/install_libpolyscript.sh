#!/bin/bash
#
# PolyScript libpolyscript Installation Script
# Installs libpolyscript to system paths for runtime FFI access
#
# Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================"
echo "PolyScript libpolyscript Installation"
echo "Installing runtime library for FFI access"
echo "========================================"
echo

# Determine OS and architecture
OS=$(uname -s)
ARCH=$(uname -m)

# Set installation paths based on OS
if [[ "$OS" == "Darwin" ]]; then
    INSTALL_PREFIX="/usr/local"
    LIB_DIR="$INSTALL_PREFIX/lib"
    INCLUDE_DIR="$INSTALL_PREFIX/include"
    LIB_EXT="dylib"
elif [[ "$OS" == "Linux" ]]; then
    INSTALL_PREFIX="/usr/local"
    LIB_DIR="$INSTALL_PREFIX/lib"
    INCLUDE_DIR="$INSTALL_PREFIX/include"
    LIB_EXT="so"
else
    echo -e "${RED}Error: Unsupported OS: $OS${NC}"
    exit 1
fi

# Source and build paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/libpolyscript/build"
SOURCE_DIR="$SCRIPT_DIR/libpolyscript"

echo "System: $OS $ARCH"
echo "Install prefix: $INSTALL_PREFIX"
echo "Library directory: $LIB_DIR"
echo "Include directory: $INCLUDE_DIR"
echo

# Check if we need sudo
if [[ ! -w "$LIB_DIR" ]]; then
    echo -e "${YELLOW}Note: Installation requires sudo privileges${NC}"
    SUDO="sudo"
else
    SUDO=""
fi

# Build libpolyscript if needed
echo "Building libpolyscript..."
if [[ ! -d "$BUILD_DIR" ]]; then
    mkdir -p "$BUILD_DIR"
fi

cd "$BUILD_DIR"
cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX="$INSTALL_PREFIX" -DBUILD_TESTING=ON
make -j$(nproc 2>/dev/null || echo 4)

# Run tests to ensure quality
echo "Running tests to verify build quality..."
if ! ctest --output-on-failure; then
    echo -e "${RED}Error: Tests failed, aborting installation${NC}"
    exit 1
fi
echo -e "${GREEN}All tests passed${NC}"

# Install library and headers
echo "Installing libpolyscript..."
$SUDO make install

# Verify installation
echo "Verifying installation..."

INSTALLED_LIB="$LIB_DIR/libpolyscript.$LIB_EXT"
INSTALLED_HEADERS="$INCLUDE_DIR/polyscript"

if [[ -f "$INSTALLED_LIB" ]]; then
    echo -e "${GREEN}✓ Library installed: $INSTALLED_LIB${NC}"
else
    echo -e "${RED}✗ Library not found: $INSTALLED_LIB${NC}"
    exit 1
fi

if [[ -d "$INSTALLED_HEADERS" ]]; then
    echo -e "${GREEN}✓ Headers installed: $INSTALLED_HEADERS${NC}"
else
    echo -e "${RED}✗ Headers not found: $INSTALLED_HEADERS${NC}"
    exit 1
fi

# Update library cache on Linux
if [[ "$OS" == "Linux" ]]; then
    echo "Updating library cache..."
    $SUDO ldconfig
fi

# Create environment setup script
SETUP_SCRIPT="$SCRIPT_DIR/setup_polyscript_env.sh"
cat > "$SETUP_SCRIPT" << EOF
#!/bin/bash
# PolyScript Environment Setup
# Source this script to set up environment for FFI frameworks

export POLYSCRIPT_ROOT="$SCRIPT_DIR"
export POLYSCRIPT_LIB_DIR="$LIB_DIR"
export POLYSCRIPT_INCLUDE_DIR="$INCLUDE_DIR"

# Library search paths for runtime FFI loading
if [[ "\$OS" == "Darwin" ]]; then
    export DYLD_LIBRARY_PATH="$LIB_DIR:\$DYLD_LIBRARY_PATH"
elif [[ "\$OS" == "Linux" ]]; then
    export LD_LIBRARY_PATH="$LIB_DIR:\$LD_LIBRARY_PATH"
fi

# pkg-config path for build-time discovery
export PKG_CONFIG_PATH="$LIB_DIR/pkgconfig:\$PKG_CONFIG_PATH"

echo "PolyScript environment configured:"
echo "  Library: $INSTALLED_LIB"
echo "  Headers: $INSTALLED_HEADERS"
echo "  Runtime path configured for FFI frameworks"
EOF

chmod +x "$SETUP_SCRIPT"

echo
echo -e "${GREEN}✓ Installation completed successfully${NC}"
echo
echo "Usage:"
echo "  1. For system-wide access: Libraries are now installed to system paths"
echo "  2. For development: Source $SETUP_SCRIPT"
echo "  3. Test FFI integration: Run ./test_ffi_integration.sh"
echo
echo "Next steps:"
echo "  - Test framework FFI integration with: ./test_ffi_integration.sh"
echo "  - Build frameworks that use libpolyscript FFI"
echo "  - Verify runtime library loading works correctly"