/**
 * @file operations.hpp
 * @brief CRUD operations for PolyScript
 * @author Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 * 
 * Defines the four fundamental CRUD operations that form the basis
 * of all PolyScript tools. These operations can be rebadged to
 * domain-specific names while maintaining consistent behavior.
 */

#pragma once

namespace polyscript {

/**
 * @brief CRUD operations supported by PolyScript tools
 * 
 * These four operations form the foundation of the CRUD × Modes matrix.
 * Each operation can be executed in three different modes (Simulate, Sandbox, Live).
 */
enum class Operation : int {
    Create = 0,  ///< Create new resources/entities
    Read   = 1,  ///< Query existing resources/state
    Update = 2,  ///< Modify existing resources
    Delete = 3   ///< Remove resources
};

/**
 * @brief Check if an operation value is valid
 * @param op Operation to validate
 * @return true if operation is valid, false otherwise
 */
constexpr bool is_valid_operation(Operation op) {
    return static_cast<int>(op) >= 0 && static_cast<int>(op) <= 3;
}

/**
 * @brief Check if an operation can mutate resources
 * @param op Operation to check
 * @return true if operation can modify data, false if read-only
 */
constexpr bool is_mutating_operation(Operation op) {
    return op == Operation::Create || 
           op == Operation::Update || 
           op == Operation::Delete;
}

/**
 * @brief Check if an operation is destructive
 * @param op Operation to check
 * @return true if operation removes or modifies existing data
 */
constexpr bool is_destructive_operation(Operation op) {
    return op == Operation::Update || op == Operation::Delete;
}

/**
 * @brief Convert operation to string representation
 * @param op Operation to convert
 * @return String representation of the operation
 */
constexpr const char* operation_to_string(Operation op) {
    switch(op) {
        case Operation::Create: return "create";
        case Operation::Read:   return "read";
        case Operation::Update: return "update";
        case Operation::Delete: return "delete";
        default: return "unknown";
    }
}

/**
 * @brief Convert string to operation enum
 * @param str String to parse
 * @return Operation enum value, or -1 if invalid
 * @note This function is not constexpr due to string comparison
 */
Operation string_to_operation(const char* str);

/**
 * @brief Get friendly description of operation
 * @param op Operation to describe
 * @return Human-readable description
 */
constexpr const char* operation_description(Operation op) {
    switch(op) {
        case Operation::Create: return "Create new resources";
        case Operation::Read:   return "Query existing resources";
        case Operation::Update: return "Modify existing resources";
        case Operation::Delete: return "Remove resources";
        default: return "Unknown operation";
    }
}

} // namespace polyscript