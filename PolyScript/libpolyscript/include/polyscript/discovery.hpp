/**
 * @file discovery.hpp
 * @brief Discovery information for PolyScript tools
 * @author Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 * 
 * Discovery allows tools to expose their capabilities in a
 * machine-readable format for documentation and agent integration.
 */

#pragma once

#include <cstddef>

namespace polyscript {

/**
 * @brief Discovery information structure
 * 
 * This structure provides metadata about a PolyScript tool's
 * capabilities. It is designed to be easily converted to JSON
 * for programmatic consumption.
 */
struct DiscoveryInfo {
    const char* tool_name;              ///< Name of the tool
    const char* polyscript_version;     ///< PolyScript version (always "1.0")
    const char* operations[4];          ///< Supported operations
    const char* modes[3];               ///< Supported modes
    size_t operation_count;             ///< Number of operations (always 4)
    size_t mode_count;                  ///< Number of modes (always 3)
};

/**
 * @brief Hardcoded operation names for discovery
 */
constexpr const char* DISCOVERY_OPERATIONS[] = {
    "create", "read", "update", "delete"
};

/**
 * @brief Hardcoded mode names for discovery
 */
constexpr const char* DISCOVERY_MODES[] = {
    "simulate", "sandbox", "live"
};

/**
 * @brief Number of operations in PolyScript
 */
constexpr size_t OPERATION_COUNT = 4;

/**
 * @brief Number of modes in PolyScript
 */
constexpr size_t MODE_COUNT = 3;

/**
 * @brief Create discovery information for a tool
 * @param tool_name Name of the tool
 * @return Initialized discovery information
 * 
 * @note The returned structure contains pointers to static strings
 * and does not require deallocation.
 */
inline DiscoveryInfo create_discovery_info(const char* tool_name) {
    DiscoveryInfo info;
    info.tool_name = tool_name;
    info.polyscript_version = "1.0";
    
    // Point to static arrays
    for (size_t i = 0; i < OPERATION_COUNT; ++i) {
        info.operations[i] = DISCOVERY_OPERATIONS[i];
    }
    
    for (size_t i = 0; i < MODE_COUNT; ++i) {
        info.modes[i] = DISCOVERY_MODES[i];
    }
    
    info.operation_count = OPERATION_COUNT;
    info.mode_count = MODE_COUNT;
    
    return info;
}

/**
 * @brief Format discovery information as JSON
 * @param tool_name Name of the tool
 * @return Dynamically allocated JSON string
 * 
 * @note Caller must free the returned string using polyscript_free_string()
 * 
 * Example output:
 * {
 *   "polyscript": "1.0",
 *   "tool": "MyTool",
 *   "operations": ["create", "read", "update", "delete"],
 *   "modes": ["simulate", "sandbox", "live"]
 * }
 */
char* format_discovery_json(const char* tool_name);

/**
 * @brief Free a string allocated by the library
 * @param json_str String to free
 * 
 * This function must be used to free strings returned by
 * format_discovery_json() to ensure proper memory management
 * across library boundaries.
 */
void free_discovery_json(char* json_str);

} // namespace polyscript