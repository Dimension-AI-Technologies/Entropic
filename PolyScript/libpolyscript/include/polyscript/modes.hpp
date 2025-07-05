/**
 * @file modes.hpp
 * @brief Execution modes and behavioral contracts for PolyScript
 * @author Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 * 
 * This is the core of the PolyScript behavioral contract system.
 * The MODE_BEHAVIORS matrix encodes all behavioral rules that
 * ensure consistent operation across 16 programming languages.
 */

#pragma once

#include "operations.hpp"

namespace polyscript {

/**
 * @brief Execution modes that modify operation behavior
 * 
 * Each operation can be executed in one of three modes,
 * creating a 4×3 matrix of 12 distinct behaviors.
 */
enum class Mode : int {
    Simulate = 0,  ///< Show what would happen without making changes
    Sandbox  = 1,  ///< Test prerequisites and validate permissions
    Live     = 2   ///< Execute actual operations with real effects
};

/**
 * @brief Behavioral rules for each execution mode
 * 
 * This structure encodes the behavioral contract that all
 * PolyScript implementations must follow.
 */
struct ModeRules {
    bool can_mutate;               ///< Whether this mode allows mutations
    bool should_validate;          ///< Whether to validate prerequisites
    bool require_confirm_update;   ///< Whether updates need confirmation
    bool require_confirm_delete;   ///< Whether deletes need confirmation
    bool read_only_safe;          ///< Whether read operations are always safe
};

/**
 * @brief The behavioral contract matrix - heart of PolyScript
 * 
 * This compile-time constant matrix defines all mode behaviors.
 * It is immutable and ensures consistency across all language implementations.
 */
constexpr ModeRules MODE_BEHAVIORS[] = {
    // Simulate mode: show what would happen, no mutations
    {false, false, false, false, true},
    
    // Sandbox mode: test prerequisites, no mutations  
    {false, true,  false, false, true},
    
    // Live mode: actual execution, confirmations required for destructive ops
    {true,  false, true,  true,  false}
};

/**
 * @brief Check if a mode allows mutations
 * @param mode The execution mode to check
 * @return true if mutations are allowed, false otherwise
 */
constexpr bool can_mutate(Mode mode) {
    return MODE_BEHAVIORS[static_cast<int>(mode)].can_mutate;
}

/**
 * @brief Check if a mode should validate prerequisites
 * @param mode The execution mode to check
 * @return true if validation is required, false otherwise
 */
constexpr bool should_validate(Mode mode) {
    return MODE_BEHAVIORS[static_cast<int>(mode)].should_validate;
}

/**
 * @brief Check if an operation requires confirmation in a given mode
 * @param mode The execution mode
 * @param op The operation to perform
 * @return true if confirmation is required, false otherwise
 */
constexpr bool require_confirm(Mode mode, Operation op) {
    const auto& rules = MODE_BEHAVIORS[static_cast<int>(mode)];
    return (op == Operation::Update && rules.require_confirm_update) ||
           (op == Operation::Delete && rules.require_confirm_delete);
}

/**
 * @brief Check if a mode is considered safe (non-mutating)
 * @param mode The execution mode to check
 * @return true if mode is safe, false otherwise
 */
constexpr bool is_safe_mode(Mode mode) {
    return mode == Mode::Simulate || mode == Mode::Sandbox;
}

/**
 * @brief Check if a mode value is valid
 * @param mode Mode to validate
 * @return true if mode is valid, false otherwise
 */
constexpr bool is_valid_mode(Mode mode) {
    return static_cast<int>(mode) >= 0 && static_cast<int>(mode) <= 2;
}

/**
 * @brief Convert mode to string representation
 * @param mode Mode to convert
 * @return String representation of the mode
 */
constexpr const char* mode_to_string(Mode mode) {
    switch(mode) {
        case Mode::Simulate: return "simulate";
        case Mode::Sandbox:  return "sandbox";
        case Mode::Live:     return "live";
        default: return "unknown";
    }
}

/**
 * @brief Convert string to mode enum
 * @param str String to parse
 * @return Mode enum value, defaults to Live if invalid
 * @note This function is not constexpr due to string comparison
 */
Mode string_to_mode(const char* str);

/**
 * @brief Get friendly description of mode
 * @param mode Mode to describe
 * @return Human-readable description
 */
constexpr const char* mode_description(Mode mode) {
    switch(mode) {
        case Mode::Simulate: return "Preview changes without executing";
        case Mode::Sandbox:  return "Validate prerequisites and permissions";
        case Mode::Live:     return "Execute operations with real effects";
        default: return "Unknown mode";
    }
}

} // namespace polyscript