/**
 * @file polyscript_native_bridge.c
 * @brief Simple C bridge for Node.js to access libpolyscript via child_process
 * @author Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 * 
 * This bridge allows Node.js to call libpolyscript functions without FFI complexity.
 * Usage: ./polyscript_native_bridge <function> <args...>
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

// Include system-installed libpolyscript headers
#include <polyscript/polyscript.hpp>

extern "C" {

// C interface functions from libpolyscript
extern bool polyscript_can_mutate(int mode);
extern bool polyscript_should_validate(int mode);
extern bool polyscript_require_confirm(int mode, int operation);
extern bool polyscript_is_safe_mode(int mode);
extern bool polyscript_validate_mode(int mode);
extern const char* polyscript_mode_to_string(int mode);
extern const char* polyscript_operation_to_string(int operation);
extern int polyscript_string_to_mode(const char* str);
extern int polyscript_string_to_operation(const char* str);

}

/**
 * Parse mode string to integer
 */
int parse_mode(const char* mode_str) {
    if (!mode_str) return -1;
    if (strcmp(mode_str, "simulate") == 0) return 0;
    if (strcmp(mode_str, "sandbox") == 0) return 1;
    if (strcmp(mode_str, "live") == 0) return 2;
    return -1;
}

/**
 * Parse operation string to integer
 */
int parse_operation(const char* op_str) {
    if (!op_str) return -1;
    if (strcmp(op_str, "create") == 0) return 0;
    if (strcmp(op_str, "read") == 0) return 1;
    if (strcmp(op_str, "update") == 0) return 2;
    if (strcmp(op_str, "delete") == 0) return 3;
    return -1;
}

/**
 * Main function - command line interface for libpolyscript
 */
int main(int argc, char* argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <function> [args...]\n", argv[0]);
        fprintf(stderr, "Functions:\n");
        fprintf(stderr, "  can_mutate <mode>\n");
        fprintf(stderr, "  should_validate <mode>\n");
        fprintf(stderr, "  require_confirm <mode> <operation>\n");
        fprintf(stderr, "  is_safe_mode <mode>\n");
        fprintf(stderr, "  validate_mode <mode>\n");
        fprintf(stderr, "  mode_to_string <mode_int>\n");
        fprintf(stderr, "  operation_to_string <op_int>\n");
        fprintf(stderr, "  string_to_mode <mode_str>\n");
        fprintf(stderr, "  string_to_operation <op_str>\n");
        return 1;
    }

    const char* function = argv[1];

    if (strcmp(function, "can_mutate") == 0) {
        if (argc != 3) {
            fprintf(stderr, "Usage: %s can_mutate <mode>\n", argv[0]);
            return 1;
        }
        int mode = parse_mode(argv[2]);
        if (mode < 0) {
            fprintf(stderr, "Invalid mode: %s\n", argv[2]);
            return 1;
        }
        printf("%s\n", polyscript_can_mutate(mode) ? "true" : "false");
        
    } else if (strcmp(function, "should_validate") == 0) {
        if (argc != 3) {
            fprintf(stderr, "Usage: %s should_validate <mode>\n", argv[0]);
            return 1;
        }
        int mode = parse_mode(argv[2]);
        if (mode < 0) {
            fprintf(stderr, "Invalid mode: %s\n", argv[2]);
            return 1;
        }
        printf("%s\n", polyscript_should_validate(mode) ? "true" : "false");
        
    } else if (strcmp(function, "require_confirm") == 0) {
        if (argc != 4) {
            fprintf(stderr, "Usage: %s require_confirm <mode> <operation>\n", argv[0]);
            return 1;
        }
        int mode = parse_mode(argv[2]);
        int operation = parse_operation(argv[3]);
        if (mode < 0) {
            fprintf(stderr, "Invalid mode: %s\n", argv[2]);
            return 1;
        }
        if (operation < 0) {
            fprintf(stderr, "Invalid operation: %s\n", argv[3]);
            return 1;
        }
        printf("%s\n", polyscript_require_confirm(mode, operation) ? "true" : "false");
        
    } else if (strcmp(function, "is_safe_mode") == 0) {
        if (argc != 3) {
            fprintf(stderr, "Usage: %s is_safe_mode <mode>\n", argv[0]);
            return 1;
        }
        int mode = parse_mode(argv[2]);
        if (mode < 0) {
            fprintf(stderr, "Invalid mode: %s\n", argv[2]);
            return 1;
        }
        printf("%s\n", polyscript_is_safe_mode(mode) ? "true" : "false");
        
    } else if (strcmp(function, "validate_mode") == 0) {
        if (argc != 3) {
            fprintf(stderr, "Usage: %s validate_mode <mode>\n", argv[0]);
            return 1;
        }
        int mode = parse_mode(argv[2]);
        if (mode < 0) {
            fprintf(stderr, "Invalid mode: %s\n", argv[2]);
            return 1;
        }
        printf("%s\n", polyscript_validate_mode(mode) ? "true" : "false");
        
    } else if (strcmp(function, "mode_to_string") == 0) {
        if (argc != 3) {
            fprintf(stderr, "Usage: %s mode_to_string <mode_int>\n", argv[0]);
            return 1;
        }
        int mode = atoi(argv[2]);
        const char* result = polyscript_mode_to_string(mode);
        printf("%s\n", result ? result : "null");
        
    } else if (strcmp(function, "operation_to_string") == 0) {
        if (argc != 3) {
            fprintf(stderr, "Usage: %s operation_to_string <op_int>\n", argv[0]);
            return 1;
        }
        int op = atoi(argv[2]);
        const char* result = polyscript_operation_to_string(op);
        printf("%s\n", result ? result : "null");
        
    } else if (strcmp(function, "string_to_mode") == 0) {
        if (argc != 3) {
            fprintf(stderr, "Usage: %s string_to_mode <mode_str>\n", argv[0]);
            return 1;
        }
        int result = polyscript_string_to_mode(argv[2]);
        printf("%d\n", result);
        
    } else if (strcmp(function, "string_to_operation") == 0) {
        if (argc != 3) {
            fprintf(stderr, "Usage: %s string_to_operation <op_str>\n", argv[0]);
            return 1;
        }
        int result = polyscript_string_to_operation(argv[2]);
        printf("%d\n", result);
        
    } else {
        fprintf(stderr, "Unknown function: %s\n", function);
        return 1;
    }

    return 0;
}