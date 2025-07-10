/*
 * polyscript_c.c - C Foundation Implementation for PolyScript
 * 
 * Reference implementation of the PolyScript FFI in pure C99.
 * This serves as both the default foundation and the reference
 * for other language implementations.
 * 
 * Author: Mathew Burkitt <mathew.burkitt@ditech.ai>
 */

#include "../include/polyscript_ffi.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

/* Internal structures */
typedef struct {
    ps_resource_t** items;
    size_t count;
    size_t capacity;
} resource_list_t;

typedef struct {
    bool initialized;
    ps_log_callback_t log_callback;
    void* log_user_data;
    resource_list_t resources;
} global_state_t;

/* Global state - in production would use better encapsulation */
static global_state_t g_state = {0};

/* Utility: Generate unique ID */
static char* generate_id(void) {
    static int counter = 0;
    char buffer[64];
    snprintf(buffer, sizeof(buffer), "%ld_%d", (long)time(NULL), counter++);
    return ps_strdup(buffer);
}

/* Utility: Log message */
static void log_message(const char* level, const char* format, ...) {
    if (g_state.log_callback) {
        char buffer[1024];
        va_list args;
        va_start(args, format);
        vsnprintf(buffer, sizeof(buffer), format, args);
        va_end(args);
        g_state.log_callback(level, buffer, g_state.log_user_data);
    }
}

/* Core lifecycle functions */
ps_error_t ps_initialize(void) {
    if (g_state.initialized) {
        return PS_SUCCESS;
    }
    
    g_state.resources.items = calloc(100, sizeof(ps_resource_t*));
    g_state.resources.capacity = 100;
    g_state.resources.count = 0;
    g_state.initialized = true;
    
    log_message("INFO", "C Foundation initialized");
    return PS_SUCCESS;
}

ps_error_t ps_shutdown(void) {
    if (!g_state.initialized) {
        return PS_SUCCESS;
    }
    
    /* Free all resources */
    for (size_t i = 0; i < g_state.resources.count; i++) {
        ps_resource_free(g_state.resources.items[i]);
    }
    free(g_state.resources.items);
    
    memset(&g_state, 0, sizeof(g_state));
    return PS_SUCCESS;
}

ps_error_t ps_get_version(uint32_t* major, uint32_t* minor, uint32_t* patch) {
    if (!major || !minor || !patch) {
        return PS_ERROR_INVALID_ARGUMENT;
    }
    
    *major = POLYSCRIPT_FFI_VERSION_MAJOR;
    *minor = POLYSCRIPT_FFI_VERSION_MINOR;
    *patch = POLYSCRIPT_FFI_VERSION_PATCH;
    return PS_SUCCESS;
}

const char* ps_get_foundation_name(void) {
    return "C";
}

/* Context management */
ps_context_t* ps_context_create(ps_mode_t mode) {
    ps_context_t* ctx = calloc(1, sizeof(ps_context_t));
    if (!ctx) return NULL;
    
    ctx->mode = mode;
    ctx->internal_data = calloc(1, sizeof(resource_list_t));
    
    log_message("DEBUG", "Created context with mode %d", mode);
    return ctx;
}

void ps_context_destroy(ps_context_t* ctx) {
    if (!ctx) return;
    
    if (ctx->internal_data) {
        resource_list_t* list = (resource_list_t*)ctx->internal_data;
        free(list->items);
        free(list);
    }
    
    free(ctx);
    log_message("DEBUG", "Destroyed context");
}

ps_error_t ps_context_set_mode(ps_context_t* ctx, ps_mode_t mode) {
    if (!ctx) return PS_ERROR_INVALID_ARGUMENT;
    
    ctx->mode = mode;
    log_message("DEBUG", "Set context mode to %d", mode);
    return PS_SUCCESS;
}

ps_mode_t ps_context_get_mode(ps_context_t* ctx) {
    if (!ctx) return PS_MODE_INTERACTIVE;
    return ctx->mode;
}

/* Core CRUD operations */
ps_result_t* ps_create(ps_context_t* ctx, const char* type, const char* data) {
    ps_result_t* result = calloc(1, sizeof(ps_result_t));
    if (!result) return NULL;
    
    if (!ctx || !type || !data) {
        result->error = PS_ERROR_INVALID_ARGUMENT;
        result->message = ps_strdup("Invalid arguments");
        return result;
    }
    
    /* Create new resource */
    ps_resource_t* resource = ps_resource_create(
        generate_id(),
        type,
        data,
        strlen(data)
    );
    
    if (!resource) {
        result->error = PS_ERROR_OUT_OF_MEMORY;
        result->message = ps_strdup("Failed to allocate resource");
        return result;
    }
    
    /* Add to global storage */
    if (g_state.resources.count >= g_state.resources.capacity) {
        size_t new_capacity = g_state.resources.capacity * 2;
        ps_resource_t** new_items = realloc(
            g_state.resources.items,
            new_capacity * sizeof(ps_resource_t*)
        );
        if (!new_items) {
            ps_resource_free(resource);
            result->error = PS_ERROR_OUT_OF_MEMORY;
            result->message = ps_strdup("Failed to expand storage");
            return result;
        }
        g_state.resources.items = new_items;
        g_state.resources.capacity = new_capacity;
    }
    
    g_state.resources.items[g_state.resources.count++] = ps_resource_copy(resource);
    
    result->error = PS_SUCCESS;
    result->message = ps_strdup("Resource created successfully");
    result->resource = resource;
    
    log_message("INFO", "Created %s resource with ID %s", type, resource->id);
    return result;
}

ps_result_t* ps_read(ps_context_t* ctx, const char* type, const char* id) {
    ps_result_t* result = calloc(1, sizeof(ps_result_t));
    if (!result) return NULL;
    
    if (!ctx || !type || !id) {
        result->error = PS_ERROR_INVALID_ARGUMENT;
        result->message = ps_strdup("Invalid arguments");
        return result;
    }
    
    /* Find resource */
    for (size_t i = 0; i < g_state.resources.count; i++) {
        ps_resource_t* res = g_state.resources.items[i];
        if (strcmp(res->id, id) == 0 && strcmp(res->type, type) == 0) {
            result->error = PS_SUCCESS;
            result->message = ps_strdup("Resource found");
            result->resource = ps_resource_copy(res);
            log_message("INFO", "Read %s resource with ID %s", type, id);
            return result;
        }
    }
    
    result->error = PS_ERROR_NOT_FOUND;
    result->message = ps_strdup("Resource not found");
    return result;
}

ps_result_t* ps_update(ps_context_t* ctx, const char* type, const char* id, const char* data) {
    ps_result_t* result = calloc(1, sizeof(ps_result_t));
    if (!result) return NULL;
    
    if (!ctx || !type || !id || !data) {
        result->error = PS_ERROR_INVALID_ARGUMENT;
        result->message = ps_strdup("Invalid arguments");
        return result;
    }
    
    /* Find and update resource */
    for (size_t i = 0; i < g_state.resources.count; i++) {
        ps_resource_t* res = g_state.resources.items[i];
        if (strcmp(res->id, id) == 0 && strcmp(res->type, type) == 0) {
            /* Update data */
            free(res->data);
            res->data = ps_strdup(data);
            res->data_size = strlen(data);
            
            result->error = PS_SUCCESS;
            result->message = ps_strdup("Resource updated");
            result->resource = ps_resource_copy(res);
            log_message("INFO", "Updated %s resource with ID %s", type, id);
            return result;
        }
    }
    
    result->error = PS_ERROR_NOT_FOUND;
    result->message = ps_strdup("Resource not found");
    return result;
}

ps_result_t* ps_delete(ps_context_t* ctx, const char* type, const char* id) {
    ps_result_t* result = calloc(1, sizeof(ps_result_t));
    if (!result) return NULL;
    
    if (!ctx || !type || !id) {
        result->error = PS_ERROR_INVALID_ARGUMENT;
        result->message = ps_strdup("Invalid arguments");
        return result;
    }
    
    /* Find and delete resource */
    for (size_t i = 0; i < g_state.resources.count; i++) {
        ps_resource_t* res = g_state.resources.items[i];
        if (strcmp(res->id, id) == 0 && strcmp(res->type, type) == 0) {
            /* Save copy for result */
            result->resource = ps_resource_copy(res);
            
            /* Delete from storage */
            ps_resource_free(res);
            
            /* Shift remaining items */
            for (size_t j = i; j < g_state.resources.count - 1; j++) {
                g_state.resources.items[j] = g_state.resources.items[j + 1];
            }
            g_state.resources.count--;
            
            result->error = PS_SUCCESS;
            result->message = ps_strdup("Resource deleted");
            log_message("INFO", "Deleted %s resource with ID %s", type, id);
            return result;
        }
    }
    
    result->error = PS_ERROR_NOT_FOUND;
    result->message = ps_strdup("Resource not found");
    return result;
}

ps_result_t* ps_list(ps_context_t* ctx, const char* type, const char* filter) {
    ps_result_t* result = calloc(1, sizeof(ps_result_t));
    if (!result) return NULL;
    
    if (!ctx || !type) {
        result->error = PS_ERROR_INVALID_ARGUMENT;
        result->message = ps_strdup("Invalid arguments");
        return result;
    }
    
    /* Count matching resources */
    size_t count = 0;
    for (size_t i = 0; i < g_state.resources.count; i++) {
        if (strcmp(g_state.resources.items[i]->type, type) == 0) {
            count++;
        }
    }
    
    /* Allocate result array */
    if (count > 0) {
        result->resources = calloc(count, sizeof(ps_resource_t*));
        if (!result->resources) {
            result->error = PS_ERROR_OUT_OF_MEMORY;
            result->message = ps_strdup("Failed to allocate result array");
            return result;
        }
        
        /* Copy matching resources */
        size_t idx = 0;
        for (size_t i = 0; i < g_state.resources.count; i++) {
            if (strcmp(g_state.resources.items[i]->type, type) == 0) {
                result->resources[idx++] = ps_resource_copy(g_state.resources.items[i]);
            }
        }
    }
    
    result->error = PS_SUCCESS;
    result->message = ps_strdup("List operation completed");
    result->resource_count = count;
    
    log_message("INFO", "Listed %zu resources of type %s", count, type);
    return result;
}

/* Result management */
void ps_result_free(ps_result_t* result) {
    if (!result) return;
    
    if (result->message) ps_free(result->message);
    if (result->resource) ps_resource_free(result->resource);
    
    if (result->resources) {
        for (size_t i = 0; i < result->resource_count; i++) {
            ps_resource_free(result->resources[i]);
        }
        free(result->resources);
    }
    
    free(result);
}

const char* ps_error_string(ps_error_t error) {
    switch (error) {
        case PS_SUCCESS: return "Success";
        case PS_ERROR_INVALID_ARGUMENT: return "Invalid argument";
        case PS_ERROR_NOT_FOUND: return "Not found";
        case PS_ERROR_ALREADY_EXISTS: return "Already exists";
        case PS_ERROR_PERMISSION_DENIED: return "Permission denied";
        case PS_ERROR_OUT_OF_MEMORY: return "Out of memory";
        case PS_ERROR_IO_ERROR: return "I/O error";
        case PS_ERROR_NOT_IMPLEMENTED: return "Not implemented";
        case PS_ERROR_INVALID_MODE: return "Invalid mode";
        case PS_ERROR_INVALID_OPERATION: return "Invalid operation";
        default: return "Unknown error";
    }
}

/* Resource management */
ps_resource_t* ps_resource_create(const char* id, const char* type, const char* data, size_t data_size) {
    ps_resource_t* resource = calloc(1, sizeof(ps_resource_t));
    if (!resource) return NULL;
    
    resource->id = ps_strdup(id);
    resource->type = ps_strdup(type);
    resource->data = ps_strdup(data);
    resource->data_size = data_size;
    
    return resource;
}

void ps_resource_free(ps_resource_t* resource) {
    if (!resource) return;
    
    if (resource->id) ps_free(resource->id);
    if (resource->type) ps_free(resource->type);
    if (resource->data) ps_free(resource->data);
    if (resource->metadata) ps_free(resource->metadata);
    
    free(resource);
}

ps_resource_t* ps_resource_copy(const ps_resource_t* resource) {
    if (!resource) return NULL;
    
    return ps_resource_create(
        resource->id,
        resource->type,
        resource->data,
        resource->data_size
    );
}

/* Mode-specific operations */
ps_error_t ps_batch_execute(ps_context_t* ctx, const char* batch_file) {
    if (!ctx || !batch_file) return PS_ERROR_INVALID_ARGUMENT;
    
    log_message("INFO", "Batch execution not fully implemented: %s", batch_file);
    return PS_ERROR_NOT_IMPLEMENTED;
}

ps_error_t ps_watch_start(ps_context_t* ctx, const char* pattern, ps_progress_callback_t callback) {
    if (!ctx || !pattern) return PS_ERROR_INVALID_ARGUMENT;
    
    log_message("INFO", "Watch mode not fully implemented: %s", pattern);
    return PS_ERROR_NOT_IMPLEMENTED;
}

ps_error_t ps_watch_stop(ps_context_t* ctx) {
    if (!ctx) return PS_ERROR_INVALID_ARGUMENT;
    
    log_message("INFO", "Watch stop not implemented");
    return PS_ERROR_NOT_IMPLEMENTED;
}

ps_error_t ps_background_submit(ps_context_t* ctx, ps_operation_t op, const char* params) {
    if (!ctx || !params) return PS_ERROR_INVALID_ARGUMENT;
    
    log_message("INFO", "Background mode not implemented");
    return PS_ERROR_NOT_IMPLEMENTED;
}

/* Utility functions */
ps_error_t ps_set_log_callback(ps_log_callback_t callback, void* user_data) {
    g_state.log_callback = callback;
    g_state.log_user_data = user_data;
    return PS_SUCCESS;
}

ps_error_t ps_validate_resource(const char* type, const char* data) {
    if (!type || !data) return PS_ERROR_INVALID_ARGUMENT;
    
    /* Basic validation - in production would be more sophisticated */
    if (strlen(type) == 0 || strlen(data) == 0) {
        return PS_ERROR_INVALID_ARGUMENT;
    }
    
    return PS_SUCCESS;
}

char* ps_serialize_resource(const ps_resource_t* resource) {
    if (!resource) return NULL;
    
    /* Simple JSON serialization */
    char buffer[4096];
    snprintf(buffer, sizeof(buffer),
        "{\"id\":\"%s\",\"type\":\"%s\",\"data\":\"%s\"}",
        resource->id, resource->type, resource->data
    );
    
    return ps_strdup(buffer);
}

ps_resource_t* ps_deserialize_resource(const char* json) {
    if (!json) return NULL;
    
    /* Simple JSON parsing - in production use proper parser */
    log_message("WARNING", "Deserialization not fully implemented");
    return NULL;
}

/* Memory management helpers */
char* ps_strdup(const char* str) {
    if (!str) return NULL;
    
    size_t len = strlen(str) + 1;
    char* copy = malloc(len);
    if (copy) {
        memcpy(copy, str, len);
    }
    return copy;
}

void ps_free(void* ptr) {
    free(ptr);
}

/* Foundation capability discovery */
bool ps_has_capability(const char* capability) {
    if (!capability) return false;
    
    /* List C foundation capabilities */
    const char* capabilities[] = {
        "crud", "modes", "validation", "serialization", NULL
    };
    
    for (int i = 0; capabilities[i]; i++) {
        if (strcmp(capability, capabilities[i]) == 0) {
            return true;
        }
    }
    
    return false;
}

const char** ps_list_capabilities(size_t* count) {
    static const char* capabilities[] = {
        "crud", "modes", "validation", "serialization", NULL
    };
    
    if (count) {
        *count = 4;
    }
    
    return capabilities;
}