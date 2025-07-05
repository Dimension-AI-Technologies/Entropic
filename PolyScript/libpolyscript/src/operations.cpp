/**
 * @file operations.cpp
 * @brief Implementation of operation-related functions
 * @author Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

#include "polyscript/operations.hpp"
#include <cstring>

namespace polyscript {

Operation string_to_operation(const char* str) {
    if (!str) return static_cast<Operation>(-1);
    
    // Check for exact matches
    if (strcmp(str, "create") == 0) return Operation::Create;
    if (strcmp(str, "read") == 0) return Operation::Read;
    if (strcmp(str, "update") == 0) return Operation::Update;
    if (strcmp(str, "delete") == 0) return Operation::Delete;
    
    // Check for common aliases
    if (strcmp(str, "list") == 0) return Operation::Read;
    if (strcmp(str, "get") == 0) return Operation::Read;
    if (strcmp(str, "add") == 0) return Operation::Create;
    if (strcmp(str, "new") == 0) return Operation::Create;
    if (strcmp(str, "modify") == 0) return Operation::Update;
    if (strcmp(str, "change") == 0) return Operation::Update;
    if (strcmp(str, "remove") == 0) return Operation::Delete;
    if (strcmp(str, "rm") == 0) return Operation::Delete;
    
    return static_cast<Operation>(-1); // Invalid operation
}

} // namespace polyscript