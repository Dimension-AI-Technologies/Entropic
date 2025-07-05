/**
 * @file context.cpp
 * @brief Implementation of context-related functions
 * @author Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

#include "polyscript/context.hpp"

namespace polyscript {

Context create_context(const char* op_str, const char* mode_str, const char* tool_name) {
    Context ctx;
    
    // Parse operation and mode from strings
    Operation op = string_to_operation(op_str);
    Mode mode = string_to_mode(mode_str);
    
    // Initialize context
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

} // namespace polyscript