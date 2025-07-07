#!/usr/bin/env node

/**
 * Test Node.js FFI integration with libpolyscript
 */

const { PolyScriptContext } = require('./polyscript-framework.js');

console.log('Testing Node.js FFI integration...\n');

// Test cases to verify FFI calls work correctly
const testCases = [
    { mode: 'simulate', operation: 'update', expectedCanMutate: false, expectedRequireConfirm: false },
    { mode: 'sandbox', operation: 'update', expectedCanMutate: false, expectedRequireConfirm: false },
    { mode: 'live', operation: 'read', expectedCanMutate: true, expectedRequireConfirm: false },
    { mode: 'live', operation: 'update', expectedCanMutate: true, expectedRequireConfirm: true },
    { mode: 'live', operation: 'delete', expectedCanMutate: true, expectedRequireConfirm: true },
];

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
    const ctx = new PolyScriptContext(testCase.operation, testCase.mode);
    
    const canMutate = ctx.canMutate();
    const requireConfirm = ctx.requireConfirm();
    const shouldValidate = ctx.shouldValidate();
    const isSafeMode = ctx.isSafeMode();
    
    const canMutateMatch = canMutate === testCase.expectedCanMutate;
    const requireConfirmMatch = requireConfirm === testCase.expectedRequireConfirm;
    
    console.log(`Test ${index + 1}: ${testCase.mode} + ${testCase.operation}`);
    console.log(`  can_mutate: ${canMutate} (expected: ${testCase.expectedCanMutate}) ${canMutateMatch ? '✅' : '❌'}`);
    console.log(`  require_confirm: ${requireConfirm} (expected: ${testCase.expectedRequireConfirm}) ${requireConfirmMatch ? '✅' : '❌'}`);
    console.log(`  should_validate: ${shouldValidate}`);
    console.log(`  is_safe_mode: ${isSafeMode}`);
    
    if (canMutateMatch && requireConfirmMatch) {
        console.log(`  Result: PASS\n`);
        passed++;
    } else {
        console.log(`  Result: FAIL\n`);
        failed++;
    }
});

console.log(`\nFFI Integration Test Results:`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total: ${testCases.length}`);

if (failed === 0) {
    console.log('\n✅ All FFI integration tests passed!');
    console.log('Node.js framework is successfully using libpolyscript via native bridge.');
    process.exit(0);
} else {
    console.log('\n❌ Some FFI integration tests failed!');
    console.log('There may be issues with the native bridge integration.');
    process.exit(1);
}