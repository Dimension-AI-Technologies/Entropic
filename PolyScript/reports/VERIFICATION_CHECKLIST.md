# PolyScript Verification Checklist

**Date:** 2025-01-06
**Author:** Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>

## Purpose

Systematic checklist to verify each PolyScript framework once development environment is available.

## Pre-Verification Setup

- [ ] Development environment fully configured
- [ ] libpolyscript successfully built
- [ ] libpolyscript installed in system path or LD_LIBRARY_PATH set
- [ ] All language toolchains installed and verified

## Per-Framework Verification

### For Each Framework (repeat 16 times):

#### 1. Build Verification
- [ ] Navigate to framework directory
- [ ] Run language-specific build command
- [ ] Build completes with 0 errors
- [ ] Build warnings documented (if any)
- [ ] Output binary/library created

#### 2. Dependency Verification
- [ ] All dependencies installed
- [ ] Version compatibility confirmed
- [ ] No missing packages
- [ ] Platform-specific deps handled

#### 3. FFI Loading Test
- [ ] Run simple FFI test program
- [ ] libpolyscript loads successfully
- [ ] No dynamic linking errors
- [ ] Fallback mechanism triggers when lib removed

#### 4. Function Call Tests
```
For each FFI function:
- [ ] polyscript_can_mutate() returns expected values
- [ ] polyscript_should_validate() returns expected values
- [ ] polyscript_require_confirm() returns expected values
- [ ] polyscript_is_safe_mode() returns expected values
```

#### 5. Mode Behavior Tests
```
For each mode (simulate/sandbox/live):
- [ ] Create operation behaves correctly
- [ ] Read operation behaves correctly
- [ ] Update operation behaves correctly
- [ ] Delete operation behaves correctly
```

#### 6. Error Handling Tests
- [ ] Missing library handled gracefully
- [ ] Invalid mode values handled
- [ ] Invalid operation values handled
- [ ] Memory safety verified (no crashes)

#### 7. Cross-Platform Tests
- [ ] Linux: .so loading works
- [ ] macOS: .dylib loading works
- [ ] Windows: .dll loading works
- [ ] Path resolution correct

#### 8. Integration Tests
- [ ] Full CRUD cycle completes
- [ ] Mode transitions work
- [ ] Confirmation prompts appear
- [ ] JSON output format correct

## Framework-Specific Checks

### Go
- [ ] CGO_ENABLED=1 set
- [ ] pkg-config finds libpolyscript
- [ ] go test passes

### Python
- [ ] ctypes.CDLL loads library
- [ ] Platform detection works
- [ ] click CLI functions

### .NET (C#/F#/VB.NET)
- [ ] P/Invoke signatures correct
- [ ] No MarshalDirectiveException
- [ ] Both x64 and x86 tested

### Rust
- [ ] cargo test passes
- [ ] polyscript-sys links correctly
- [ ] No unsafe violations

### Ruby
- [ ] FFI gem loads
- [ ] attach_function works
- [ ] No segfaults

### Haskell
- [ ] Foreign imports resolve
- [ ] cabal test passes
- [ ] No FFI type mismatches

### D
- [ ] dub test passes
- [ ] extern(C) links correctly
- [ ] No D runtime conflicts

### Zig
- [ ] zig build test passes
- [ ] @cImport successful
- [ ] C ABI compatible

### V
- [ ] v test passes
- [ ] #flag directives work
- [ ] C interop verified

### Scala
- [ ] sbt test passes
- [ ] JNA finds library
- [ ] No JVM crashes

### Elixir
- [ ] mix test passes
- [ ] NIF loads correctly
- [ ] No BEAM crashes

### Julia
- [ ] Pkg.test() passes
- [ ] ccall successful
- [ ] No Julia runtime errors

### Node.js
- [ ] Fallback behavior confirmed
- [ ] No attempt to load native lib
- [ ] CLI works correctly

### PowerShell
- [ ] Add-Type succeeds
- [ ] DllImport works
- [ ] Execution policy OK

## Performance Benchmarks

For each framework:
- [ ] FFI call overhead measured
- [ ] Memory usage profiled
- [ ] Startup time recorded
- [ ] Comparison with pure implementation

## Documentation Verification

- [ ] README accurately describes setup
- [ ] INSTALLATION.md steps work
- [ ] Code comments accurate
- [ ] Examples run successfully

## Sign-Off Criteria

A framework is considered VERIFIED only when:
1. All build checks pass ✅
2. All test checks pass ✅
3. All platform checks pass ✅
4. Performance acceptable ✅
5. Documentation accurate ✅

## Tracking Template

```
Framework: [Name]
Date Tested: [YYYY-MM-DD]
Tester: [Name]
Environment: [OS, versions]
Status: ❌ Failed / ✅ Passed
Issues Found: [List]
```

## Summary Report

After all frameworks tested:
```
Total Frameworks: 16
Verified: X
Failed: Y
Blocked: Z
Success Rate: X/16 (XX%)
```

## Important Notes

1. **NO FRAMEWORK** is considered working until this checklist is completed
2. Each checkbox must be individually verified, not assumed
3. Any failure requires investigation and documentation
4. This checklist itself may need updates based on findings

Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>