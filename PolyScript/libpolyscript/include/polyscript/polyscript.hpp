/**
 * @file polyscript.hpp
 * @brief Main PolyScript library interface
 * @author Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 * @version 1.0
 * 
 * libpolyscript provides a universal interface for implementing
 * the PolyScript CRUD × Modes pattern across 16 programming languages.
 * 
 * This is the main header file that includes all PolyScript components.
 */

#pragma once

// Version information
namespace polyscript {
    constexpr const char* VERSION = "1.0";
    constexpr int VERSION_MAJOR = 1;
    constexpr int VERSION_MINOR = 0;
    constexpr int VERSION_PATCH = 0;
}

// Include all PolyScript components
#include "operations.hpp"
#include "modes.hpp"
#include "context.hpp"
#include "discovery.hpp"

// C interface for maximum FFI compatibility
#ifdef __cplusplus
extern "C" {
#endif

// Core behavioral query functions
bool polyscript_can_mutate(int mode);
bool polyscript_should_validate(int mode);
bool polyscript_require_confirm(int mode, int operation);
bool polyscript_is_safe_mode(int mode);

// String conversion functions
const char* polyscript_operation_to_string(int operation);
const char* polyscript_mode_to_string(int mode);
int polyscript_string_to_operation(const char* str);
int polyscript_string_to_mode(const char* str);

// Version information
const char* polyscript_get_version();
int polyscript_get_version_major();
int polyscript_get_version_minor();
int polyscript_get_version_patch();

// Discovery functions
char* polyscript_format_discovery_json(const char* tool_name);
void polyscript_free_string(char* str);

// Context validation
bool polyscript_validate_operation(int operation);
bool polyscript_validate_mode(int mode);

#ifdef __cplusplus
}
#endif

// Windows DLL export macros
#ifdef _WIN32
    #ifdef BUILDING_POLYSCRIPT_DLL
        #define POLYSCRIPT_API __declspec(dllexport)
    #else
        #define POLYSCRIPT_API __declspec(dllimport)
    #endif
#else
    #define POLYSCRIPT_API
#endif