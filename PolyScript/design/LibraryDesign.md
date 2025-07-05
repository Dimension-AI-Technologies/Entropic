# libpolyscript C++ Library Design

## Overview

libpolyscript is the core C++ library that implements the PolyScript specification. It provides a stable, dependency-free interface that can be consumed by all 16 supported languages through FFI or direct linkage.

## Design Principles

### 1. Zero Dependencies
- **No external libraries**: No JSON parsers, no YAML libraries, no boost
- **Standard library only**: Uses only C++11 standard library features
- **Self-contained**: All specifications hardcoded in headers

### 2. ABI Stability
- **C++11 minimum**: Ensures stable ABI across compilers since 2011
- **C interface**: Pure C functions for maximum compatibility
- **POD types**: Plain Old Data structures for easy marshalling
- **No exceptions**: Error handling via return codes

### 3. Compile-Time Validation
- **constexpr everything**: All specifications validated at compile time
- **Template metaprogramming**: Type-safe operation and mode handling
- **Static assertions**: Compile-time contract validation

### 4. Performance
- **Header-only where possible**: Inline simple functions
- **Minimal allocations**: Stack-based data structures preferred
- **Cache-friendly**: Contiguous memory layouts

## Header Organization

```cpp
// include/polyscript/polyscript.hpp - Main include
#pragma once

#include "operations.hpp"
#include "modes.hpp"
#include "context.hpp"
#include "discovery.hpp"

namespace polyscript {
    // Version information
    constexpr const char* VERSION = "1.0";
    constexpr int VERSION_MAJOR = 1;
    constexpr int VERSION_MINOR = 0;
    constexpr int VERSION_PATCH = 0;
}

// C interface
extern "C" {
    // Core functions exported for FFI
    bool polyscript_can_mutate(int mode);
    bool polyscript_should_validate(int mode);
    bool polyscript_require_confirm(int mode, int operation);
    const char* polyscript_get_version();
    // ... other functions
}
```

### operations.hpp
```cpp
// include/polyscript/operations.hpp
#pragma once

namespace polyscript {
    
enum class Operation : int {
    Create = 0,
    Read   = 1,
    Update = 2,
    Delete = 3
};

// Compile-time operation validation
constexpr bool is_valid_operation(Operation op) {
    return static_cast<int>(op) >= 0 && static_cast<int>(op) <= 3;
}

// Operation properties
constexpr bool is_mutating_operation(Operation op) {
    return op == Operation::Create || 
           op == Operation::Update || 
           op == Operation::Delete;
}

constexpr bool is_destructive_operation(Operation op) {
    return op == Operation::Update || op == Operation::Delete;
}

// String conversion (compile-time)
constexpr const char* operation_to_string(Operation op) {
    switch(op) {
        case Operation::Create: return "create";
        case Operation::Read:   return "read";
        case Operation::Update: return "update";
        case Operation::Delete: return "delete";
        default: return "unknown";
    }
}

// Reverse lookup (runtime)
Operation string_to_operation(const char* str);

} // namespace polyscript
```

### modes.hpp
```cpp
// include/polyscript/modes.hpp
#pragma once

namespace polyscript {

enum class Mode : int {
    Simulate = 0,
    Sandbox  = 1,
    Live     = 2
};

// Mode behavior rules (compile-time)
struct ModeRules {
    bool can_mutate;
    bool should_validate;
    bool require_confirm_update;
    bool require_confirm_delete;
    bool read_only_safe;
};

// Hardcoded behavior matrix
constexpr ModeRules MODE_BEHAVIORS[] = {
    // Simulate: show what would happen, no mutations
    {false, false, false, false, true},
    
    // Sandbox: test prerequisites, no mutations  
    {false, true,  false, false, true},
    
    // Live: actual execution, confirmations required
    {true,  false, true,  true,  false}
};

// Compile-time mode queries
constexpr bool can_mutate(Mode mode) {
    return MODE_BEHAVIORS[static_cast<int>(mode)].can_mutate;
}

constexpr bool should_validate(Mode mode) {
    return MODE_BEHAVIORS[static_cast<int>(mode)].should_validate;
}

constexpr bool require_confirm(Mode mode, Operation op) {
    const auto& rules = MODE_BEHAVIORS[static_cast<int>(mode)];
    return (op == Operation::Update && rules.require_confirm_update) ||
           (op == Operation::Delete && rules.require_confirm_delete);
}

constexpr bool is_safe_mode(Mode mode) {
    return mode == Mode::Simulate || mode == Mode::Sandbox;
}

// String conversions
constexpr const char* mode_to_string(Mode mode) {
    switch(mode) {
        case Mode::Simulate: return "simulate";
        case Mode::Sandbox:  return "sandbox";
        case Mode::Live:     return "live";
        default: return "unknown";
    }
}

Mode string_to_mode(const char* str);

} // namespace polyscript
```

### context.hpp
```cpp
// include/polyscript/context.hpp
#pragma once

#include "operations.hpp"
#include "modes.hpp"

namespace polyscript {

// Context structure for C interface
struct Context {
    Operation operation;
    Mode mode;
    const char* resource;      // May be null
    const char* rebadged_as;   // May be null  
    bool verbose;
    bool force;
    bool json_output;
    const char* tool_name;
    
    // Helper methods (C++ only)
    constexpr bool can_mutate() const {
        return polyscript::can_mutate(mode);
    }
    
    constexpr bool should_validate() const {
        return polyscript::should_validate(mode);
    }
    
    constexpr bool require_confirm() const {
        return polyscript::require_confirm(mode, operation) && !force;
    }
    
    constexpr bool is_safe_mode() const {
        return polyscript::is_safe_mode(mode);
    }
};

// Factory functions
Context create_context(Operation op, Mode mode, const char* tool_name);
Context create_context(const char* op_str, const char* mode_str, const char* tool_name);

// Validation
bool validate_context(const Context& ctx);

} // namespace polyscript
```

### discovery.hpp
```cpp
// include/polyscript/discovery.hpp
#pragma once

namespace polyscript {

// Discovery information structure
struct DiscoveryInfo {
    const char* tool_name;
    const char* polyscript_version;
    const char* operations[4];  // ["create", "read", "update", "delete"]
    const char* modes[3];       // ["simulate", "sandbox", "live"]
    size_t operation_count;
    size_t mode_count;
};

// Hardcoded discovery data
constexpr const char* OPERATIONS[] = {"create", "read", "update", "delete"};
constexpr const char* MODES[] = {"simulate", "sandbox", "live"};

// Factory function
DiscoveryInfo create_discovery_info(const char* tool_name);

// JSON formatting (for C interface)
char* format_discovery_json(const char* tool_name);
void free_discovery_json(char* json_str);

} // namespace polyscript
```

## Implementation Files

### src/polyscript.cpp
```cpp
// src/polyscript.cpp - C interface implementation
#include "polyscript/polyscript.hpp"
#include <cstring>
#include <cstdlib>

extern "C" {

bool polyscript_can_mutate(int mode) {
    if (mode < 0 || mode > 2) return false;
    return polyscript::can_mutate(static_cast<polyscript::Mode>(mode));
}

bool polyscript_should_validate(int mode) {
    if (mode < 0 || mode > 2) return false;
    return polyscript::should_validate(static_cast<polyscript::Mode>(mode));
}

bool polyscript_require_confirm(int mode, int operation) {
    if (mode < 0 || mode > 2 || operation < 0 || operation > 3) return false;
    return polyscript::require_confirm(
        static_cast<polyscript::Mode>(mode),
        static_cast<polyscript::Operation>(operation)
    );
}

const char* polyscript_get_version() {
    return polyscript::VERSION;
}

char* polyscript_format_discovery_json(const char* tool_name) {
    if (!tool_name) return nullptr;
    
    // Simple JSON formatting without external dependencies
    std::string json = "{\n";
    json += "  \"polyscript\": \"" + std::string(polyscript::VERSION) + "\",\n";
    json += "  \"tool\": \"" + std::string(tool_name) + "\",\n";
    json += "  \"operations\": [\"create\", \"read\", \"update\", \"delete\"],\n";
    json += "  \"modes\": [\"simulate\", \"sandbox\", \"live\"]\n";
    json += "}";
    
    char* result = static_cast<char*>(malloc(json.length() + 1));
    if (result) {
        strcpy(result, json.c_str());
    }
    return result;
}

void polyscript_free_string(char* str) {
    if (str) {
        free(str);
    }
}

} // extern "C"
```

### src/operations.cpp
```cpp
// src/operations.cpp
#include "polyscript/operations.hpp"
#include <cstring>

namespace polyscript {

Operation string_to_operation(const char* str) {
    if (!str) return static_cast<Operation>(-1);
    
    if (strcmp(str, "create") == 0) return Operation::Create;
    if (strcmp(str, "read") == 0 || strcmp(str, "list") == 0) return Operation::Read;
    if (strcmp(str, "update") == 0) return Operation::Update;
    if (strcmp(str, "delete") == 0) return Operation::Delete;
    
    return static_cast<Operation>(-1); // Invalid
}

} // namespace polyscript
```

### src/modes.cpp
```cpp
// src/modes.cpp
#include "polyscript/modes.hpp"
#include <cstring>

namespace polyscript {

Mode string_to_mode(const char* str) {
    if (!str) return Mode::Live; // Default to live
    
    if (strcmp(str, "simulate") == 0) return Mode::Simulate;
    if (strcmp(str, "sandbox") == 0) return Mode::Sandbox;
    if (strcmp(str, "live") == 0) return Mode::Live;
    
    return Mode::Live; // Default to live for unknown modes
}

} // namespace polyscript
```

## Memory Management

### String Handling
- **Input strings**: Always const char*, never modified
- **Output strings**: Caller must free using polyscript_free_string()
- **String lifetime**: No internal string storage, immediate copy or reference

### Error Handling
- **No exceptions**: Pure C interface for maximum compatibility
- **Return codes**: Boolean false for simple failures, -1 for invalid enums
- **Null checking**: All pointer parameters validated before use

## Thread Safety

### Stateless Design
- **No global state**: All functions are pure or take explicit context
- **No static variables**: All data is compile-time constants or passed parameters
- **Reentrant**: Multiple threads can call functions simultaneously

### Const Correctness
- **Input parameters**: Always const where possible
- **Constexpr functions**: Evaluated at compile time, inherently thread-safe
- **Immutable data**: All behavioral constants are constexpr

## Build Configuration

### CMakeLists.txt
```cmake
cmake_minimum_required(VERSION 3.15)
project(libpolyscript VERSION 1.0.0 LANGUAGES CXX)

# C++11 requirement
set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Compiler flags
if(MSVC)
    add_compile_options(/W4 /WX)
else()
    add_compile_options(-Wall -Wextra -Werror)
endif()

# Library target
add_library(polyscript SHARED
    src/polyscript.cpp
    src/operations.cpp
    src/modes.cpp
    src/context.cpp
    src/discovery.cpp
)

target_include_directories(polyscript
    PUBLIC 
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

# Export symbols on Windows
if(WIN32)
    target_compile_definitions(polyscript PRIVATE BUILDING_POLYSCRIPT_DLL)
    target_compile_definitions(polyscript INTERFACE USING_POLYSCRIPT_DLL)
endif()

# Tests
if(BUILD_TESTING)
    enable_testing()
    add_subdirectory(tests)
endif()

# Install configuration
install(TARGETS polyscript
    EXPORT polyscript-targets
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)

install(DIRECTORY include/polyscript DESTINATION include)

install(EXPORT polyscript-targets
    FILE polyscript-config.cmake
    DESTINATION lib/cmake/polyscript
)
```

## Testing Strategy

### Unit Tests
```cpp
// tests/test_modes.cpp
#include "polyscript/modes.hpp"
#include <cassert>

void test_mode_behaviors() {
    using namespace polyscript;
    
    // Compile-time tests
    static_assert(can_mutate(Mode::Live), "Live mode should allow mutations");
    static_assert(!can_mutate(Mode::Simulate), "Simulate mode should not allow mutations");
    static_assert(!can_mutate(Mode::Sandbox), "Sandbox mode should not allow mutations");
    
    static_assert(should_validate(Mode::Sandbox), "Sandbox mode should validate");
    static_assert(!should_validate(Mode::Simulate), "Simulate mode should not validate");
    static_assert(!should_validate(Mode::Live), "Live mode should not validate");
    
    // Runtime tests
    assert(require_confirm(Mode::Live, Operation::Delete));
    assert(require_confirm(Mode::Live, Operation::Update));
    assert(!require_confirm(Mode::Live, Operation::Read));
    assert(!require_confirm(Mode::Live, Operation::Create));
}

int main() {
    test_mode_behaviors();
    return 0;
}
```

### Integration Tests
- **C interface validation**: Test all extern "C" functions
- **Memory leak detection**: Valgrind/AddressSanitizer testing
- **Cross-platform builds**: Linux, Windows, macOS
- **Compiler compatibility**: GCC, Clang, MSVC

## Documentation Generation

### Doxygen Configuration
```cpp
/**
 * @file polyscript.hpp
 * @brief Main PolyScript library interface
 * @author Mathew Burkitt, Dimension Technologies
 * @version 1.0
 * 
 * libpolyscript provides a universal interface for implementing
 * the PolyScript CRUD × Modes pattern across 16 programming languages.
 */

/**
 * @namespace polyscript
 * @brief Core PolyScript functionality
 */

/**
 * @brief Check if a mode allows mutations
 * @param mode The execution mode to check
 * @return true if mutations are allowed, false otherwise
 * @since 1.0
 */
constexpr bool can_mutate(Mode mode);
```

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>