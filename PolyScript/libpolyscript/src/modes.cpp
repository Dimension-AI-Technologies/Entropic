/**
 * @file modes.cpp
 * @brief Implementation of mode-related functions
 * @author Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

#include "polyscript/modes.hpp"
#include <cstring>

namespace polyscript {

Mode string_to_mode(const char* str) {
    if (!str) return Mode::Live; // Default to live mode
    
    // Check for exact matches
    if (strcmp(str, "simulate") == 0) return Mode::Simulate;
    if (strcmp(str, "sandbox") == 0) return Mode::Sandbox;
    if (strcmp(str, "live") == 0) return Mode::Live;
    
    // Check for common aliases
    if (strcmp(str, "sim") == 0) return Mode::Simulate;
    if (strcmp(str, "dry-run") == 0) return Mode::Simulate;
    if (strcmp(str, "dryrun") == 0) return Mode::Simulate;
    if (strcmp(str, "preview") == 0) return Mode::Simulate;
    if (strcmp(str, "test") == 0) return Mode::Sandbox;
    if (strcmp(str, "validate") == 0) return Mode::Sandbox;
    if (strcmp(str, "check") == 0) return Mode::Sandbox;
    if (strcmp(str, "production") == 0) return Mode::Live;
    if (strcmp(str, "prod") == 0) return Mode::Live;
    if (strcmp(str, "execute") == 0) return Mode::Live;
    
    return Mode::Live; // Default to live mode for unknown strings
}

} // namespace polyscript