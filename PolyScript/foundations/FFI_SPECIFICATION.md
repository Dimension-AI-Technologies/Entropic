# PolyScript FFI Specification v1.0

## Overview

This document specifies the Foreign Function Interface (FFI) that all PolyScript foundation libraries must implement to ensure complete interchangeability across the 28 framework languages.

## Design Principles

1. **C ABI Compatibility**: Pure C interface with no C++ features
2. **Memory Safety**: Clear ownership rules for all allocated memory
3. **Error Handling**: Consistent error codes across all implementations
4. **Zero Dependencies**: No external library dependencies in the interface
5. **Platform Agnostic**: Works on Linux, Windows, macOS, and WebAssembly

## Memory Management Rules

### Ownership Transfer
- Functions returning `char*` transfer ownership to caller
- Caller must free using `ps_free()` not system `free()`
- Functions returning `ps_resource_t*` transfer ownership
- Functions returning `ps_result_t*` transfer ownership

### Borrowed References
- All `const char*` parameters are borrowed (no ownership transfer)
- Context pointers are borrowed during function calls
- Callbacks receive borrowed pointers

### String Handling
- All strings are UTF-8 encoded, null-terminated
- Use `ps_strdup()` for string duplication
- Never mix foundation allocators with system allocators

## Function Categories

### 1. Lifecycle Functions (Required)
```c
ps_initialize()    - One-time global initialization
ps_shutdown()      - Global cleanup
ps_get_version()   - ABI version checking
ps_get_foundation_name() - Returns "C", "Rust", "Zig", or "V"
```

### 2. Context Management (Required)
```c
ps_context_create()  - Creates operation context
ps_context_destroy() - Frees context and resources
ps_context_set_mode() - Changes operation mode
ps_context_get_mode() - Queries current mode
```

### 3. CRUD Operations (Required)
All CRUD functions follow the pattern:
- Take context and parameters
- Return `ps_result_t*` (owned by caller)
- Never throw exceptions across FFI boundary
- Set error code in result structure

### 4. Mode Operations (Required)
Each mode has specific functions:
- **Interactive**: Standard CRUD operations
- **Batch**: `ps_batch_execute()` for script processing
- **Watch**: `ps_watch_start/stop()` for file monitoring
- **Background**: `ps_background_submit()` for async operations

## Error Handling

### Error Codes
All error codes are negative integers:
- `PS_SUCCESS (0)`: Operation succeeded
- `PS_ERROR_*`: Specific error conditions
- Custom errors must be < -1000

### Error Propagation
1. Set error code in result structure
2. Set human-readable message in result
3. Log detailed error if callback registered
4. Never panic/abort across FFI boundary

## Thread Safety

### Requirements
- `ps_initialize/shutdown` are NOT thread-safe (call once)
- Context operations are NOT thread-safe (use one context per thread)
- Read-only functions ARE thread-safe
- Callbacks are called on the same thread as operation

### Synchronization
- Foundations may use internal locking
- Must not hold locks during callbacks
- Must handle callback exceptions safely

## Platform Considerations

### Windows
- Export functions with `__declspec(dllexport)`
- Use `__stdcall` calling convention
- Handle path separators (\ vs /)

### Linux/macOS
- Export with default visibility
- Use standard C calling convention
- Handle case-sensitive filesystems

### WebAssembly
- Compile with Emscripten settings:
  - `-s EXPORTED_FUNCTIONS` for each function
  - `-s EXPORTED_RUNTIME_METHODS=['ccall','cwrap']`
  - `-s MODULARIZE=1` for module loading

## Implementation Requirements

### C Foundation
- Pure C99 implementation
- No external dependencies
- Use standard library only

### Rust Foundation
- Use `#[no_mangle]` and `extern "C"`
- Catch panics at FFI boundary
- Use `CString` for string conversion
- Box large structures for stable ABI

### Zig Foundation
- Use `export` with `callconv(.C)`
- Handle error unions at boundary
- Ensure no hidden allocations
- Compatible struct layout

### V Foundation
- Use `[export]` attribute
- Compile to C with compatible ABI
- Disable garbage collection for FFI data
- Match exact struct layouts

## Validation

Each foundation must pass:
1. ABI compatibility test suite
2. Memory leak detection (Valgrind/ASAN)
3. Thread safety tests
4. Cross-foundation data exchange
5. Performance benchmarks

## Version Negotiation

Frameworks should:
1. Check version with `ps_get_version()`
2. Verify major version matches
3. Warn if minor version differs
4. Refuse if major version incompatible

## Example Usage

```c
// Initialize foundation
if (ps_initialize() != PS_SUCCESS) {
    return -1;
}

// Create context
ps_context_t* ctx = ps_context_create(PS_MODE_INTERACTIVE);

// Perform operation
ps_result_t* result = ps_create(ctx, "user", "{\"name\":\"test\"}");
if (result->error == PS_SUCCESS) {
    printf("Created: %s\n", result->resource->id);
}

// Cleanup
ps_result_free(result);
ps_context_destroy(ctx);
ps_shutdown();
```

## Foundation Selection

Set environment variable:
```bash
export POLYSCRIPT_FOUNDATION=rust  # Use Rust foundation
export POLYSCRIPT_FOUNDATION=zig   # Use Zig foundation
export POLYSCRIPT_FOUNDATION=v     # Use V foundation
# Default/unset uses C foundation
```

## Binary Naming Convention

- Linux: `libpolyscript_c.so`, `libpolyscript_rust.so`, etc.
- Windows: `polyscript_c.dll`, `polyscript_rust.dll`, etc.
- macOS: `libpolyscript_c.dylib`, `libpolyscript_rust.dylib`, etc.
- WASM: `polyscript_c.wasm`, `polyscript_rust.wasm`, etc.

*Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>*