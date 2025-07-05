/**
 * @file polyscript.cpp
 * @brief C interface implementation for libpolyscript
 * @author Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 * 
 * This file implements the C interface functions that provide
 * FFI access to PolyScript functionality for all 16 languages.
 */

#include "polyscript/polyscript.hpp"
#include <cstring>
#include <cstdlib>
#include <string>
#include <sstream>

using namespace polyscript;

extern "C" {

// Core behavioral query functions

bool polyscript_can_mutate(int mode) {
    if (mode < 0 || mode > 2) return false;
    return polyscript::can_mutate(static_cast<Mode>(mode));
}

bool polyscript_should_validate(int mode) {
    if (mode < 0 || mode > 2) return false;
    return polyscript::should_validate(static_cast<Mode>(mode));
}

bool polyscript_require_confirm(int mode, int operation) {
    if (mode < 0 || mode > 2 || operation < 0 || operation > 3) return false;
    return polyscript::require_confirm(
        static_cast<Mode>(mode),
        static_cast<Operation>(operation)
    );
}

bool polyscript_is_safe_mode(int mode) {
    if (mode < 0 || mode > 2) return false;
    return polyscript::is_safe_mode(static_cast<Mode>(mode));
}

// String conversion functions

const char* polyscript_operation_to_string(int operation) {
    if (operation < 0 || operation > 3) return "unknown";
    return polyscript::operation_to_string(static_cast<Operation>(operation));
}

const char* polyscript_mode_to_string(int mode) {
    if (mode < 0 || mode > 2) return "unknown";
    return polyscript::mode_to_string(static_cast<Mode>(mode));
}

int polyscript_string_to_operation(const char* str) {
    if (!str) return -1;
    Operation op = polyscript::string_to_operation(str);
    return static_cast<int>(op);
}

int polyscript_string_to_mode(const char* str) {
    if (!str) return static_cast<int>(Mode::Live); // Default to live
    Mode mode = polyscript::string_to_mode(str);
    return static_cast<int>(mode);
}

// Version information

const char* polyscript_get_version() {
    return polyscript::VERSION;
}

int polyscript_get_version_major() {
    return polyscript::VERSION_MAJOR;
}

int polyscript_get_version_minor() {
    return polyscript::VERSION_MINOR;
}

int polyscript_get_version_patch() {
    return polyscript::VERSION_PATCH;
}

// Discovery functions

char* polyscript_format_discovery_json(const char* tool_name) {
    if (!tool_name) return nullptr;
    
    // Build JSON manually to avoid external dependencies
    std::ostringstream json;
    json << "{\n";
    json << "  \"polyscript\": \"" << polyscript::VERSION << "\",\n";
    json << "  \"tool\": \"" << tool_name << "\",\n";
    json << "  \"operations\": [";
    
    // Add operations
    for (size_t i = 0; i < OPERATION_COUNT; ++i) {
        if (i > 0) json << ", ";
        json << "\"" << DISCOVERY_OPERATIONS[i] << "\"";
    }
    json << "],\n";
    
    json << "  \"modes\": [";
    // Add modes
    for (size_t i = 0; i < MODE_COUNT; ++i) {
        if (i > 0) json << ", ";
        json << "\"" << DISCOVERY_MODES[i] << "\"";
    }
    json << "]\n";
    json << "}";
    
    // Allocate and copy result
    std::string result = json.str();
    char* c_str = static_cast<char*>(malloc(result.length() + 1));
    if (c_str) {
        strcpy(c_str, result.c_str());
    }
    return c_str;
}

void polyscript_free_string(char* str) {
    if (str) {
        free(str);
    }
}

// Context validation

bool polyscript_validate_operation(int operation) {
    return operation >= 0 && operation <= 3;
}

bool polyscript_validate_mode(int mode) {
    return mode >= 0 && mode <= 2;
}

} // extern "C"