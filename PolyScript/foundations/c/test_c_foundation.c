/*
 * test_c_foundation.c - Test program for C Foundation
 * 
 * Verifies basic functionality of the C foundation implementation.
 */

#include "../include/polyscript_ffi.h"
#include <stdio.h>
#include <assert.h>
#include <string.h>

void log_callback(const char* level, const char* message, void* user_data) {
    printf("[%s] %s\n", level, message);
}

int main(void) {
    printf("Testing PolyScript C Foundation...\n\n");
    
    /* Test version */
    uint32_t major, minor, patch;
    assert(ps_get_version(&major, &minor, &patch) == PS_SUCCESS);
    printf("Version: %u.%u.%u\n", major, minor, patch);
    printf("Foundation: %s\n\n", ps_get_foundation_name());
    
    /* Initialize */
    assert(ps_initialize() == PS_SUCCESS);
    ps_set_log_callback(log_callback, NULL);
    
    /* Create context */
    ps_context_t* ctx = ps_context_create(PS_MODE_INTERACTIVE);
    assert(ctx != NULL);
    
    /* Test CREATE */
    printf("Testing CREATE...\n");
    ps_result_t* result = ps_create(ctx, "user", "{\"name\":\"John Doe\",\"age\":30}");
    assert(result != NULL);
    assert(result->error == PS_SUCCESS);
    assert(result->resource != NULL);
    
    char* user_id = ps_strdup(result->resource->id);
    printf("Created user with ID: %s\n", user_id);
    ps_result_free(result);
    
    /* Test READ */
    printf("\nTesting READ...\n");
    result = ps_read(ctx, "user", user_id);
    assert(result != NULL);
    assert(result->error == PS_SUCCESS);
    assert(result->resource != NULL);
    assert(strcmp(result->resource->id, user_id) == 0);
    printf("Read user: %s\n", result->resource->data);
    ps_result_free(result);
    
    /* Test UPDATE */
    printf("\nTesting UPDATE...\n");
    result = ps_update(ctx, "user", user_id, "{\"name\":\"Jane Doe\",\"age\":31}");
    assert(result != NULL);
    assert(result->error == PS_SUCCESS);
    printf("Updated user data: %s\n", result->resource->data);
    ps_result_free(result);
    
    /* Test LIST */
    printf("\nTesting LIST...\n");
    result = ps_list(ctx, "user", NULL);
    assert(result != NULL);
    assert(result->error == PS_SUCCESS);
    assert(result->resource_count == 1);
    printf("Found %zu users\n", result->resource_count);
    ps_result_free(result);
    
    /* Test DELETE */
    printf("\nTesting DELETE...\n");
    result = ps_delete(ctx, "user", user_id);
    assert(result != NULL);
    assert(result->error == PS_SUCCESS);
    printf("Deleted user: %s\n", user_id);
    ps_result_free(result);
    
    /* Verify deletion */
    result = ps_read(ctx, "user", user_id);
    assert(result != NULL);
    assert(result->error == PS_ERROR_NOT_FOUND);
    ps_result_free(result);
    
    /* Test error strings */
    printf("\nTesting error strings...\n");
    printf("SUCCESS: %s\n", ps_error_string(PS_SUCCESS));
    printf("NOT_FOUND: %s\n", ps_error_string(PS_ERROR_NOT_FOUND));
    
    /* Test capabilities */
    printf("\nTesting capabilities...\n");
    assert(ps_has_capability("crud") == true);
    assert(ps_has_capability("unknown") == false);
    
    size_t cap_count;
    const char** caps = ps_list_capabilities(&cap_count);
    printf("Foundation supports %zu capabilities:\n", cap_count);
    for (size_t i = 0; i < cap_count; i++) {
        printf("  - %s\n", caps[i]);
    }
    
    /* Cleanup */
    ps_free(user_id);
    ps_context_destroy(ctx);
    ps_shutdown();
    
    printf("\nAll tests passed! ✓\n");
    return 0;
}