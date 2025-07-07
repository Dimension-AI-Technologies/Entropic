/**
 * @file test_modes.cpp
 * @brief Compile-time tests for PolyScript mode behavioral contracts
 * @author Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 * 
 * This file uses static_assert to verify behavioral contracts at compile time.
 * These tests ensure the MODE_BEHAVIORS matrix is correctly implemented.
 */

#include "polyscript/modes.hpp"
#include <cassert>
#include <cstdio>

using namespace polyscript;

// Compile-time tests using static_assert
// These validate the behavioral contract matrix

// Test Simulate mode behaviors
static_assert(!can_mutate(Mode::Simulate), "Simulate mode must not allow mutations");
static_assert(!should_validate(Mode::Simulate), "Simulate mode should not validate");
static_assert(!require_confirm(Mode::Simulate, Operation::Update), "Simulate mode requires no confirmations");
static_assert(!require_confirm(Mode::Simulate, Operation::Delete), "Simulate mode requires no confirmations");
static_assert(is_safe_mode(Mode::Simulate), "Simulate mode must be safe");

// Test Sandbox mode behaviors
static_assert(!can_mutate(Mode::Sandbox), "Sandbox mode must not allow mutations");
static_assert(should_validate(Mode::Sandbox), "Sandbox mode must validate prerequisites");
static_assert(!require_confirm(Mode::Sandbox, Operation::Update), "Sandbox mode requires no confirmations");
static_assert(!require_confirm(Mode::Sandbox, Operation::Delete), "Sandbox mode requires no confirmations");
static_assert(is_safe_mode(Mode::Sandbox), "Sandbox mode must be safe");

// Test Live mode behaviors  
static_assert(can_mutate(Mode::Live), "Live mode must allow mutations");
static_assert(!should_validate(Mode::Live), "Live mode should not validate by default");
static_assert(require_confirm(Mode::Live, Operation::Update), "Live mode must confirm updates");
static_assert(require_confirm(Mode::Live, Operation::Delete), "Live mode must confirm deletes");
static_assert(!is_safe_mode(Mode::Live), "Live mode is not safe");

// Test non-destructive operations don't require confirmation in any mode
static_assert(!require_confirm(Mode::Live, Operation::Create), "Create should not require confirmation");
static_assert(!require_confirm(Mode::Live, Operation::Read), "Read should not require confirmation");
static_assert(!require_confirm(Mode::Simulate, Operation::Create), "Create should not require confirmation in Simulate");
static_assert(!require_confirm(Mode::Sandbox, Operation::Read), "Read should not require confirmation in Sandbox");

// Test mode validation
static_assert(is_valid_mode(Mode::Simulate), "Simulate mode must be valid");
static_assert(is_valid_mode(Mode::Sandbox), "Sandbox mode must be valid");
static_assert(is_valid_mode(Mode::Live), "Live mode must be valid");

// Test mode string representations
static_assert(mode_to_string(Mode::Simulate)[0] == 's', "Simulate mode string must start with 's'");
static_assert(mode_to_string(Mode::Sandbox)[0] == 's', "Sandbox mode string must start with 's'");
static_assert(mode_to_string(Mode::Live)[0] == 'l', "Live mode string must start with 'l'");

// Test mode descriptions exist
static_assert(mode_description(Mode::Simulate)[0] == 'P', "Simulate description must start with 'P'");
static_assert(mode_description(Mode::Sandbox)[0] == 'V', "Sandbox description must start with 'V'");
static_assert(mode_description(Mode::Live)[0] == 'E', "Live description must start with 'E'");

// Test behavioral matrix consistency
static_assert(MODE_BEHAVIORS[0].can_mutate == false, "Index 0 (Simulate) must not allow mutations");
static_assert(MODE_BEHAVIORS[1].should_validate == true, "Index 1 (Sandbox) must validate");
static_assert(MODE_BEHAVIORS[2].can_mutate == true, "Index 2 (Live) must allow mutations");

// Test that read operations are safe in safe modes
static_assert(MODE_BEHAVIORS[static_cast<int>(Mode::Simulate)].read_only_safe, "Simulate mode must be read-safe");
static_assert(MODE_BEHAVIORS[static_cast<int>(Mode::Sandbox)].read_only_safe, "Sandbox mode must be read-safe");
static_assert(!MODE_BEHAVIORS[static_cast<int>(Mode::Live)].read_only_safe, "Live mode is not read-safe");

/**
 * Runtime tests for non-constexpr functions
 * These test dynamic string parsing and edge cases
 */
int test_string_to_mode() {
    // Test valid mode strings
    assert(string_to_mode("simulate") == Mode::Simulate);
    assert(string_to_mode("sandbox") == Mode::Sandbox);
    assert(string_to_mode("live") == Mode::Live);
    
    // Test case sensitivity (should be case-insensitive or default to Live)
    assert(string_to_mode("SIMULATE") == Mode::Simulate || string_to_mode("SIMULATE") == Mode::Live);
    assert(string_to_mode("Sandbox") == Mode::Sandbox || string_to_mode("Sandbox") == Mode::Live);
    assert(string_to_mode("LIVE") == Mode::Live);
    
    // Test invalid strings default to Live
    assert(string_to_mode("invalid") == Mode::Live);
    assert(string_to_mode("") == Mode::Live);
    assert(string_to_mode(nullptr) == Mode::Live);
    
    return 0;
}

/**
 * Test edge cases and boundary conditions
 */
int test_edge_cases() {
    // Test all valid enum values
    for (int i = 0; i <= 2; ++i) {
        Mode mode = static_cast<Mode>(i);
        assert(is_valid_mode(mode));
        
        // Ensure mode_to_string never returns null
        const char* str = mode_to_string(mode);
        assert(str != nullptr);
        assert(str[0] != '\0'); // Non-empty string
        (void)str; // Mark as intentionally used
        
        // Ensure mode_description never returns null
        const char* desc = mode_description(mode);
        assert(desc != nullptr);
        assert(desc[0] != '\0'); // Non-empty string
        (void)desc; // Mark as intentionally used
    }
    
    // Test invalid enum values
    assert(!is_valid_mode(static_cast<Mode>(-1)));
    assert(!is_valid_mode(static_cast<Mode>(3)));
    assert(!is_valid_mode(static_cast<Mode>(100)));
    
    return 0;
}

/**
 * Test the behavioral matrix invariants
 */
int test_behavioral_invariants() {
    // Test that safe modes never allow mutations
    assert(!can_mutate(Mode::Simulate));
    assert(!can_mutate(Mode::Sandbox));
    
    // Test that only Live mode allows mutations
    assert(can_mutate(Mode::Live));
    
    // Test that only Sandbox mode validates by default
    assert(should_validate(Mode::Sandbox));
    assert(!should_validate(Mode::Simulate));
    assert(!should_validate(Mode::Live));
    
    // Test confirmation requirements
    assert(require_confirm(Mode::Live, Operation::Update));
    assert(require_confirm(Mode::Live, Operation::Delete));
    assert(!require_confirm(Mode::Live, Operation::Create));
    assert(!require_confirm(Mode::Live, Operation::Read));
    
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
    result |= test_string_to_mode();
    result |= test_edge_cases();
    result |= test_behavioral_invariants();
    
    if (result == 0) {
        printf("All mode tests passed successfully!\n");
    } else {
        printf("Some mode tests failed!\n");
    }
    
    return result;
}