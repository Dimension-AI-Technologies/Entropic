/**
 * @file discovery.cpp
 * @brief Implementation of discovery-related functions
 * @author Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

#include "polyscript/discovery.hpp"
#include "polyscript/polyscript.hpp"
#include <cstring>
#include <cstdlib>
#include <string>
#include <sstream>

namespace polyscript {

char* format_discovery_json(const char* tool_name) {
    if (!tool_name) return nullptr;
    
    // Build JSON manually to avoid external dependencies
    std::ostringstream json;
    json << "{\n";
    json << "  \"polyscript\": \"" << VERSION << "\",\n";
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

void free_discovery_json(char* json_str) {
    if (json_str) {
        free(json_str);
    }
}

} // namespace polyscript