/*
 * polyscript_ffi.h - Universal FFI Interface for PolyScript Foundation Libraries
 * 
 * This header defines the C ABI that ALL foundation libraries (C, Rust, Zig, V)
 * must implement identically to ensure complete interchangeability.
 * 
 * Version: 1.0.0
 * Author: Mathew Burkitt <mathew.burkitt@ditech.ai>
 */

#ifndef POLYSCRIPT_FFI_H
#define POLYSCRIPT_FFI_H

#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

/* Version information for ABI compatibility checking */
#define POLYSCRIPT_FFI_VERSION_MAJOR 1
#define POLYSCRIPT_FFI_VERSION_MINOR 0
#define POLYSCRIPT_FFI_VERSION_PATCH 0

/* Error codes - must be consistent across all implementations */
typedef enum {
    PS_SUCCESS = 0,
    PS_ERROR_INVALID_ARGUMENT = -1,
    PS_ERROR_NOT_FOUND = -2,
    PS_ERROR_ALREADY_EXISTS = -3,
    PS_ERROR_PERMISSION_DENIED = -4,
    PS_ERROR_OUT_OF_MEMORY = -5,
    PS_ERROR_IO_ERROR = -6,
    PS_ERROR_NOT_IMPLEMENTED = -7,
    PS_ERROR_INVALID_MODE = -8,
    PS_ERROR_INVALID_OPERATION = -9,
    PS_ERROR_UNKNOWN = -999
} ps_error_t;

/* Operation modes */
typedef enum {
    PS_MODE_INTERACTIVE = 0,
    PS_MODE_BATCH = 1,
    PS_MODE_WATCH = 2,
    PS_MODE_BACKGROUND = 3
} ps_mode_t;

/* Operation types */
typedef enum {
    PS_OP_CREATE = 0,
    PS_OP_READ = 1,
    PS_OP_UPDATE = 2,
    PS_OP_DELETE = 3,
    PS_OP_LIST = 4
} ps_operation_t;

/* Forward declarations */
typedef struct ps_context ps_context_t;
typedef struct ps_resource ps_resource_t;
typedef struct ps_result ps_result_t;

/* Resource structure - represents any managed resource */
struct ps_resource {
    char* id;
    char* type;
    char* data;
    size_t data_size;
    void* metadata;
};

/* Result structure - returned by operations */
struct ps_result {
    ps_error_t error;
    char* message;
    ps_resource_t* resource;
    ps_resource_t** resources;  /* For list operations */
    size_t resource_count;
};

/* Context structure - maintains state across operations */
struct ps_context {
    ps_mode_t mode;
    void* user_data;
    void* internal_data;  /* Foundation-specific data */
};

/* Callback function types */
typedef void (*ps_log_callback_t)(const char* level, const char* message, void* user_data);
typedef void (*ps_progress_callback_t)(const char* operation, int percent, void* user_data);

/* Core lifecycle functions - REQUIRED */
ps_error_t ps_initialize(void);
ps_error_t ps_shutdown(void);
ps_error_t ps_get_version(uint32_t* major, uint32_t* minor, uint32_t* patch);
const char* ps_get_foundation_name(void);

/* Context management - REQUIRED */
ps_context_t* ps_context_create(ps_mode_t mode);
void ps_context_destroy(ps_context_t* ctx);
ps_error_t ps_context_set_mode(ps_context_t* ctx, ps_mode_t mode);
ps_mode_t ps_context_get_mode(ps_context_t* ctx);

/* Core CRUD operations - REQUIRED */
ps_result_t* ps_create(ps_context_t* ctx, const char* type, const char* data);
ps_result_t* ps_read(ps_context_t* ctx, const char* type, const char* id);
ps_result_t* ps_update(ps_context_t* ctx, const char* type, const char* id, const char* data);
ps_result_t* ps_delete(ps_context_t* ctx, const char* type, const char* id);
ps_result_t* ps_list(ps_context_t* ctx, const char* type, const char* filter);

/* Result management - REQUIRED */
void ps_result_free(ps_result_t* result);
const char* ps_error_string(ps_error_t error);

/* Resource management - REQUIRED */
ps_resource_t* ps_resource_create(const char* id, const char* type, const char* data, size_t data_size);
void ps_resource_free(ps_resource_t* resource);
ps_resource_t* ps_resource_copy(const ps_resource_t* resource);

/* Mode-specific operations - REQUIRED */
ps_error_t ps_batch_execute(ps_context_t* ctx, const char* batch_file);
ps_error_t ps_watch_start(ps_context_t* ctx, const char* pattern, ps_progress_callback_t callback);
ps_error_t ps_watch_stop(ps_context_t* ctx);
ps_error_t ps_background_submit(ps_context_t* ctx, ps_operation_t op, const char* params);

/* Utility functions - REQUIRED */
ps_error_t ps_set_log_callback(ps_log_callback_t callback, void* user_data);
ps_error_t ps_validate_resource(const char* type, const char* data);
char* ps_serialize_resource(const ps_resource_t* resource);
ps_resource_t* ps_deserialize_resource(const char* json);

/* Memory management helpers - REQUIRED */
char* ps_strdup(const char* str);
void ps_free(void* ptr);

/* Foundation capability discovery - OPTIONAL */
bool ps_has_capability(const char* capability);
const char** ps_list_capabilities(size_t* count);

#ifdef __cplusplus
}
#endif

#endif /* POLYSCRIPT_FFI_H */