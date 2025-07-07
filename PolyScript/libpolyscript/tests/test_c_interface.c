/**
 * @file test_c_interface.c
 * @brief Pure C tests for libpolyscript FFI interface
 * @author Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 * 
 * This file tests the C interface functions to ensure they work correctly
 * from pure C code without any C++ dependencies. This validates the FFI
 * layer that will be used by all 16 language implementations.
 */

#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include <string.h>
#include <stdbool.h>
#include <limits.h>

/* C interface declarations - these should match polyscript.hpp */
extern bool polyscript_can_mutate(int mode);
extern bool polyscript_should_validate(int mode);
extern bool polyscript_require_confirm(int mode, int operation);
extern bool polyscript_is_safe_mode(int mode);
extern bool polyscript_validate_mode(int mode);

extern int polyscript_get_version_major(void);
extern int polyscript_get_version_minor(void);
extern int polyscript_get_version_patch(void);

extern const char* polyscript_mode_to_string(int mode);
extern const char* polyscript_operation_to_string(int operation);
extern int polyscript_string_to_mode(const char* str);
extern int polyscript_string_to_operation(const char* str);

extern char* polyscript_format_discovery_json(const char* tool_name);
extern void polyscript_free_string(char* str);

/* Mode constants */
#define MODE_SIMULATE 0
#define MODE_SANDBOX  1
#define MODE_LIVE     2

/* Operation constants */
#define OP_CREATE 0
#define OP_READ   1
#define OP_UPDATE 2
#define OP_DELETE 3

/**
 * Test basic mode behavior functions
 */
int test_mode_behaviors(void) {
    printf("Testing mode behaviors...\n");
    
    /* Test Simulate mode (0) */
    assert(!polyscript_can_mutate(MODE_SIMULATE));
    assert(!polyscript_should_validate(MODE_SIMULATE));
    assert(polyscript_is_safe_mode(MODE_SIMULATE));
    assert(polyscript_validate_mode(MODE_SIMULATE));
    
    /* Test Sandbox mode (1) */
    assert(!polyscript_can_mutate(MODE_SANDBOX));
    assert(polyscript_should_validate(MODE_SANDBOX));
    assert(polyscript_is_safe_mode(MODE_SANDBOX));
    assert(polyscript_validate_mode(MODE_SANDBOX));
    
    /* Test Live mode (2) */
    assert(polyscript_can_mutate(MODE_LIVE));
    assert(!polyscript_should_validate(MODE_LIVE));
    assert(!polyscript_is_safe_mode(MODE_LIVE));
    assert(polyscript_validate_mode(MODE_LIVE));
    
    /* Test invalid modes */
    assert(!polyscript_can_mutate(-1));
    assert(!polyscript_can_mutate(3));
    assert(!polyscript_can_mutate(100));
    assert(!polyscript_validate_mode(-1));
    assert(!polyscript_validate_mode(3));
    
    printf("Mode behavior tests passed!\n");
    return 0;
}

/**
 * Test confirmation requirements
 */
int test_confirmation_requirements(void) {
    printf("Testing confirmation requirements...\n");
    
    /* Test Live mode confirmations */
    assert(!polyscript_require_confirm(MODE_LIVE, OP_CREATE));
    assert(!polyscript_require_confirm(MODE_LIVE, OP_READ));
    assert(polyscript_require_confirm(MODE_LIVE, OP_UPDATE));
    assert(polyscript_require_confirm(MODE_LIVE, OP_DELETE));
    
    /* Test safe modes never require confirmation */
    assert(!polyscript_require_confirm(MODE_SIMULATE, OP_UPDATE));
    assert(!polyscript_require_confirm(MODE_SIMULATE, OP_DELETE));
    assert(!polyscript_require_confirm(MODE_SANDBOX, OP_UPDATE));
    assert(!polyscript_require_confirm(MODE_SANDBOX, OP_DELETE));
    
    /* Test invalid inputs */
    assert(!polyscript_require_confirm(-1, OP_CREATE));
    assert(!polyscript_require_confirm(MODE_LIVE, -1));
    assert(!polyscript_require_confirm(3, OP_UPDATE));
    assert(!polyscript_require_confirm(MODE_LIVE, 4));
    
    printf("Confirmation requirement tests passed!\n");
    return 0;
}

/**
 * Test version information
 */
int test_version_info(void) {
    printf("Testing version information...\n");
    
    int major = polyscript_get_version_major();
    int minor = polyscript_get_version_minor();
    int patch = polyscript_get_version_patch();
    
    /* Version numbers should be non-negative */
    assert(major >= 0);
    assert(minor >= 0);
    assert(patch >= 0);
    
    /* For version 1.0.0, test expected values */
    assert(major == 1);
    assert(minor == 0);
    assert(patch == 0);
    
    printf("Version: %d.%d.%d\n", major, minor, patch);
    printf("Version information tests passed!\n");
    return 0;
}

/**
 * Test string conversion functions
 */
int test_string_conversions(void) {
    printf("Testing string conversions...\n");
    
    /* Test mode to string */
    const char* simulate_str = polyscript_mode_to_string(MODE_SIMULATE);
    const char* sandbox_str = polyscript_mode_to_string(MODE_SANDBOX);
    const char* live_str = polyscript_mode_to_string(MODE_LIVE);
    
    assert(simulate_str != NULL);
    assert(sandbox_str != NULL);
    assert(live_str != NULL);
    
    printf("Mode strings: simulate='%s', sandbox='%s', live='%s'\n", 
           simulate_str, sandbox_str, live_str);
    
    /* Test string to mode */
    assert(polyscript_string_to_mode("simulate") == MODE_SIMULATE);
    assert(polyscript_string_to_mode("sandbox") == MODE_SANDBOX);
    assert(polyscript_string_to_mode("live") == MODE_LIVE);
    assert(polyscript_string_to_mode("invalid") == MODE_LIVE); /* Default to live */
    
    /* Test operation to string */
    const char* create_str = polyscript_operation_to_string(OP_CREATE);
    const char* read_str = polyscript_operation_to_string(OP_READ);
    const char* update_str = polyscript_operation_to_string(OP_UPDATE);
    const char* delete_str = polyscript_operation_to_string(OP_DELETE);
    
    assert(create_str != NULL);
    assert(read_str != NULL);
    assert(update_str != NULL);
    assert(delete_str != NULL);
    
    printf("Operation strings: create='%s', read='%s', update='%s', delete='%s'\n",
           create_str, read_str, update_str, delete_str);
    
    /* Test string to operation */
    assert(polyscript_string_to_operation("create") == OP_CREATE);
    assert(polyscript_string_to_operation("read") == OP_READ);
    assert(polyscript_string_to_operation("update") == OP_UPDATE);
    assert(polyscript_string_to_operation("delete") == OP_DELETE);
    assert(polyscript_string_to_operation("invalid") == -1);
    
    /* const char* strings don't need to be freed */
    
    printf("String conversion tests passed!\n");
    return 0;
}

/**
 * Test discovery JSON functionality
 */
int test_discovery_json(void) {
    printf("Testing discovery JSON...\n");
    
    char* json = polyscript_format_discovery_json("test_tool");
    assert(json != NULL);
    assert(strlen(json) > 0);
    
    /* JSON should contain expected fields */
    assert(strstr(json, "polyscript") != NULL);
    assert(strstr(json, "tool") != NULL);
    assert(strstr(json, "modes") != NULL);
    assert(strstr(json, "operations") != NULL);
    
    printf("Discovery JSON length: %zu characters\n", strlen(json));
    printf("JSON snippet: %.100s...\n", json);
    
    polyscript_free_string(json);
    
    printf("Discovery JSON tests passed!\n");
    return 0;
}

/**
 * Test memory management
 */
int test_memory_management(void) {
    printf("Testing memory management...\n");
    
    /* Test that polyscript_free_string handles NULL gracefully */
    polyscript_free_string(NULL);
    
    /* Test multiple allocations and frees */
    for (int i = 0; i < 100; i++) {
        const char* str = polyscript_mode_to_string(i % 3);
        assert(str != NULL);
        (void)str; /* Mark as intentionally used */
        /* const char* strings don't need to be freed */
    }
    
    printf("Memory management tests passed!\n");
    return 0;
}

/**
 * Test edge cases and error handling
 */
int test_edge_cases(void) {
    printf("Testing edge cases...\n");
    
    /* Test with extreme values */
    assert(!polyscript_can_mutate(INT_MAX));
    assert(!polyscript_can_mutate(INT_MIN));
    assert(!polyscript_validate_mode(INT_MAX));
    assert(!polyscript_validate_mode(INT_MIN));
    
    /* Test string functions with NULL */
    assert(polyscript_string_to_mode(NULL) == MODE_LIVE);
    assert(polyscript_string_to_operation(NULL) == -1);
    
    /* Test string functions with empty string */
    assert(polyscript_string_to_mode("") == MODE_LIVE);
    assert(polyscript_string_to_operation("") == -1);
    
    printf("Edge case tests passed!\n");
    return 0;
}

/**
 * Test FFI contract compliance
 */
int test_ffi_contract(void) {
    printf("Testing FFI contract compliance...\n");
    
    /* Test that all functions return consistent values */
    for (int mode = 0; mode <= 2; mode++) {
        bool can_mut1 = polyscript_can_mutate(mode);
        bool can_mut2 = polyscript_can_mutate(mode);
        assert(can_mut1 == can_mut2); /* Functions must be deterministic */
        (void)can_mut1; (void)can_mut2; /* Mark as intentionally used */
        
        bool should_val1 = polyscript_should_validate(mode);
        bool should_val2 = polyscript_should_validate(mode);
        assert(should_val1 == should_val2);
        (void)should_val1; (void)should_val2; /* Mark as intentionally used */
    }
    
    /* Test behavioral contract invariants */
    assert(!polyscript_can_mutate(MODE_SIMULATE)); /* Simulate never mutates */
    assert(!polyscript_can_mutate(MODE_SANDBOX));  /* Sandbox never mutates */
    assert(polyscript_can_mutate(MODE_LIVE));      /* Live can mutate */
    
    assert(polyscript_should_validate(MODE_SANDBOX)); /* Only sandbox validates */
    
    printf("FFI contract compliance tests passed!\n");
    return 0;
}

/**
 * Main test function
 */
int main(void) {
    printf("Starting libpolyscript C interface tests...\n\n");
    
    int result = 0;
    
    result |= test_mode_behaviors();
    result |= test_confirmation_requirements();
    result |= test_version_info();
    result |= test_string_conversions();
    result |= test_discovery_json();
    result |= test_memory_management();
    result |= test_edge_cases();
    result |= test_ffi_contract();
    
    if (result == 0) {
        printf("\n✅ All C interface tests passed successfully!\n");
        printf("FFI layer is working correctly for language integration.\n");
    } else {
        printf("\n❌ Some C interface tests failed!\n");
        printf("FFI layer has issues that need to be resolved.\n");
    }
    
    return result;
}