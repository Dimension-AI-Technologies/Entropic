#!/bin/bash
# PolyScript Environment Setup
# Source this script to set up environment for FFI frameworks

export POLYSCRIPT_ROOT="/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript"
export POLYSCRIPT_LIB_DIR="/usr/local/lib"
export POLYSCRIPT_INCLUDE_DIR="/usr/local/include"

# Library search paths for runtime FFI loading
if [[ "$OS" == "Darwin" ]]; then
    export DYLD_LIBRARY_PATH="/usr/local/lib:$DYLD_LIBRARY_PATH"
elif [[ "$OS" == "Linux" ]]; then
    export LD_LIBRARY_PATH="/usr/local/lib:$LD_LIBRARY_PATH"
fi

# pkg-config path for build-time discovery
export PKG_CONFIG_PATH="/usr/local/lib/pkgconfig:$PKG_CONFIG_PATH"

echo "PolyScript environment configured:"
echo "  Library: /usr/local/lib/libpolyscript.dylib"
echo "  Headers: /usr/local/include/polyscript"
echo "  Runtime path configured for FFI frameworks"
