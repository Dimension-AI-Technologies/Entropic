/**
 * @file test_operations.cpp
 * @brief Tests for PolyScript CRUD operations
 * @author Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 * 
 * This file tests the Operation enum and related functions,
 * particularly string conversion and operation classification.
 */

#include "polyscript/operations.hpp"
#include <cassert>
#include <cstdio>

using namespace polyscript;

// Compile-time tests using static_assert
// These validate operation classification and string functions

// Test operation classification
static_assert(is_valid_operation(Operation::Create), "Create must be valid");
static_assert(is_valid_operation(Operation::Read), "Read must be valid");
static_assert(is_valid_operation(Operation::Update), "Update must be valid");
static_assert(is_valid_operation(Operation::Delete), "Delete must be valid");

// Test mutating operations
static_assert(is_mutating_operation(Operation::Create), "Create is mutating");
static_assert(!is_mutating_operation(Operation::Read), "Read is not mutating");
static_assert(is_mutating_operation(Operation::Update), "Update is mutating");
static_assert(is_mutating_operation(Operation::Delete), "Delete is mutating");

// Test destructive operations
static_assert(!is_destructive_operation(Operation::Create), "Create is not destructive");
static_assert(!is_destructive_operation(Operation::Read), "Read is not destructive");
static_assert(is_destructive_operation(Operation::Update), "Update is destructive");
static_assert(is_destructive_operation(Operation::Delete), "Delete is destructive");

// Test string representations
static_assert(operation_to_string(Operation::Create)[0] == 'c', "Create string starts with 'c'");
static_assert(operation_to_string(Operation::Read)[0] == 'r', "Read string starts with 'r'");
static_assert(operation_to_string(Operation::Update)[0] == 'u', "Update string starts with 'u'");
static_assert(operation_to_string(Operation::Delete)[0] == 'd', "Delete string starts with 'd'");

// Test descriptions exist
static_assert(operation_description(Operation::Create)[0] == 'C', "Create description starts with 'C'");
static_assert(operation_description(Operation::Read)[0] == 'Q', "Read description starts with 'Q'");
static_assert(operation_description(Operation::Update)[0] == 'M', "Update description starts with 'M'");
static_assert(operation_description(Operation::Delete)[0] == 'R', "Delete description starts with 'R'");

/**
 * Runtime tests for string_to_operation function
 */
int test_string_to_operation() {
    // Test valid operation strings
    assert(string_to_operation("create") == Operation::Create);
    assert(string_to_operation("read") == Operation::Read);
    assert(string_to_operation("update") == Operation::Update);
    assert(string_to_operation("delete") == Operation::Delete);
    
    // Test case sensitivity (implementation should handle this gracefully)
    // Note: We test what the implementation actually does, not assume behavior
    Operation create_upper = string_to_operation("CREATE");
    Operation read_mixed = string_to_operation("Read");
    (void)create_upper; (void)read_mixed; // Mark as intentionally used
    assert(create_upper == Operation::Create || static_cast<int>(create_upper) == -1);
    assert(read_mixed == Operation::Read || static_cast<int>(read_mixed) == -1);
    
    // Test invalid strings should return invalid value
    assert(static_cast<int>(string_to_operation("invalid")) == -1);
    assert(static_cast<int>(string_to_operation("")) == -1);
    assert(static_cast<int>(string_to_operation(nullptr)) == -1);
    
    // Test partial matches
    assert(static_cast<int>(string_to_operation("cre")) == -1);
    assert(static_cast<int>(string_to_operation("creating")) == -1);
    
    return 0;
}

/**
 * Test edge cases and boundary conditions
 */
int test_edge_cases() {
    // Test all valid enum values
    for (int i = 0; i <= 3; ++i) {
        Operation op = static_cast<Operation>(i);
        assert(is_valid_operation(op));
        
        // Ensure operation_to_string never returns null
        const char* str = operation_to_string(op);
        assert(str != nullptr);
        assert(str[0] != '\0'); // Non-empty string
        (void)str; // Mark as intentionally used
        
        // Ensure operation_description never returns null
        const char* desc = operation_description(op);
        assert(desc != nullptr);
        assert(desc[0] != '\0'); // Non-empty string
        (void)desc; // Mark as intentionally used
    }
    
    // Test invalid enum values
    assert(!is_valid_operation(static_cast<Operation>(-1)));
    assert(!is_valid_operation(static_cast<Operation>(4)));
    assert(!is_valid_operation(static_cast<Operation>(100)));
    
    return 0;
}

/**
 * Test operation classification consistency
 */
int test_operation_classification() {
    // Test that Read is the only non-mutating operation
    assert(!is_mutating_operation(Operation::Read));
    assert(is_mutating_operation(Operation::Create));
    assert(is_mutating_operation(Operation::Update));
    assert(is_mutating_operation(Operation::Delete));
    
    // Test that Create and Read are non-destructive
    assert(!is_destructive_operation(Operation::Create));
    assert(!is_destructive_operation(Operation::Read));
    assert(is_destructive_operation(Operation::Update));
    assert(is_destructive_operation(Operation::Delete));
    
    // Test logical consistency: destructive operations must be mutating
    for (int i = 0; i <= 3; ++i) {
        Operation op = static_cast<Operation>(i);
        if (is_destructive_operation(op)) {
            assert(is_mutating_operation(op));
        }
    }
    
    return 0;
}

/**
 * Test string conversion round-trip consistency
 */
int test_string_roundtrip() {
    // Test that operation_to_string produces strings that string_to_operation can parse
    for (int i = 0; i <= 3; ++i) {
        Operation original = static_cast<Operation>(i);
        const char* str = operation_to_string(original);
        Operation parsed = string_to_operation(str);
        assert(parsed == original);
        (void)parsed; // Mark as intentionally used
    }
    
    return 0;
}

/**
 * Test string format consistency
 */
int test_string_format() {
    // Test that all operation strings are lowercase
    assert(operation_to_string(Operation::Create)[0] >= 'a' && operation_to_string(Operation::Create)[0] <= 'z');
    assert(operation_to_string(Operation::Read)[0] >= 'a' && operation_to_string(Operation::Read)[0] <= 'z');
    assert(operation_to_string(Operation::Update)[0] >= 'a' && operation_to_string(Operation::Update)[0] <= 'z');
    assert(operation_to_string(Operation::Delete)[0] >= 'a' && operation_to_string(Operation::Delete)[0] <= 'z');
    
    // Test that all descriptions start with uppercase
    assert(operation_description(Operation::Create)[0] >= 'A' && operation_description(Operation::Create)[0] <= 'Z');
    assert(operation_description(Operation::Read)[0] >= 'A' && operation_description(Operation::Read)[0] <= 'Z');
    assert(operation_description(Operation::Update)[0] >= 'A' && operation_description(Operation::Update)[0] <= 'Z');
    assert(operation_description(Operation::Delete)[0] >= 'A' && operation_description(Operation::Delete)[0] <= 'Z');
    
    return 0;
}

/**
 * Main test function
 * Returns 0 on success, non-zero on failure
 */
int main() {
    // All static_assert tests are verified at compile time
    
    // Run runtime tests
    int result = 0;
    result |= test_string_to_operation();
    result |= test_edge_cases();
    result |= test_operation_classification();
    result |= test_string_roundtrip();
    result |= test_string_format();
    
    if (result == 0) {
        printf("All operation tests passed successfully!\n");
    } else {
        printf("Some operation tests failed!\n");
    }
    
    return result;
}