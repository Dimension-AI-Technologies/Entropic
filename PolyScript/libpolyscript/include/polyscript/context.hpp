/**
 * @file context.hpp
 * @brief Context structure for PolyScript operations
 * @author Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 * 
 * The Context structure carries all the information needed to execute
 * a PolyScript operation, including the operation type, execution mode,
 * target resource, and various flags.
 */

#pragma once

#include "operations.hpp"
#include "modes.hpp"

namespace polyscript {

/**
 * @brief Context structure for PolyScript operations
 * 
 * This structure is passed to all CRUD methods and provides
 * access to operation context, mode information, and helper methods.
 * It is designed to be easily marshalled across FFI boundaries.
 */
struct Context {
    // Core fields
    Operation operation;           ///< The CRUD operation being performed
    Mode mode;                     ///< The execution mode (simulate/sandbox/live)
    const char* resource;          ///< Target resource (may be null)
    const char* rebadged_as;       ///< Rebadged command name (may be null)
    
    // Execution flags
    bool verbose;                  ///< Enable verbose output
    bool force;                    ///< Skip confirmation prompts
    bool json_output;              ///< Output in JSON format
    
    // Tool information
    const char* tool_name;         ///< Name of the tool for identification
    
    // C++ helper methods (not exposed via FFI)
#ifdef __cplusplus
    /**
     * @brief Check if this context allows mutations
     * @return true if mutations are allowed in current mode
     */
    constexpr bool can_mutate() const {
        return polyscript::can_mutate(mode);
    }
    
    /**
     * @brief Check if this context should validate prerequisites
     * @return true if validation is required in current mode
     */
    constexpr bool should_validate() const {
        return polyscript::should_validate(mode);
    }
    
    /**
     * @brief Check if this operation requires confirmation
     * @return true if confirmation needed (unless force is set)
     */
    constexpr bool require_confirm() const {
        return polyscript::require_confirm(mode, operation) && !force;
    }
    
    /**
     * @brief Check if this is a safe (non-mutating) mode
     * @return true if in simulate or sandbox mode
     */
    constexpr bool is_safe_mode() const {
        return polyscript::is_safe_mode(mode);
    }
    
    /**
     * @brief Check if context is valid
     * @return true if operation and mode are valid
     */
    constexpr bool is_valid() const {
        return is_valid_operation(operation) && is_valid_mode(mode);
    }
#endif
};

/**
 * @brief Create a context with default values
 * @param op The operation to perform
 * @param mode The execution mode
 * @param tool_name Name of the tool
 * @return Initialized context structure
 */
inline Context create_context(Operation op, Mode mode, const char* tool_name) {
    Context ctx;
    ctx.operation = op;
    ctx.mode = mode;
    ctx.resource = nullptr;
    ctx.rebadged_as = nullptr;
    ctx.verbose = false;
    ctx.force = false;
    ctx.json_output = false;
    ctx.tool_name = tool_name;
    return ctx;
}

/**
 * @brief Create a context from string values (for FFI)
 * @param op_str Operation string
 * @param mode_str Mode string
 * @param tool_name Name of the tool
 * @return Initialized context structure
 */
Context create_context(const char* op_str, const char* mode_str, const char* tool_name);

/**
 * @brief Validate a context structure
 * @param ctx Context to validate
 * @return true if context is valid, false otherwise
 */
inline bool validate_context(const Context& ctx) {
    return is_valid_operation(ctx.operation) && 
           is_valid_mode(ctx.mode) &&
           ctx.tool_name != nullptr;
}

} // namespace polyscript