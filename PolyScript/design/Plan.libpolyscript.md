# Plan: libpolyscript Implementation

## Status Legend
- 🔴 Not Started
- 🟡 In Progress  
- 🟢 Complete
- ✅ Verified (Actually tested/compiled/executed)
- ❓ Unverified (Code/docs exist but not tested)

## 1. Design and Documentation Phase
### 1.1 Core Architecture Design
#### 1.1.1 Write Architecture.md section on C++ core library with FFI approach ✅
#### 1.1.2 Create LanguageIntegration.md with FFI method table for all 16 languages ✅
#### 1.1.3 Document behavioral contract C structures in LibraryDesign.md ✅

### 1.2 Language Integration Planning
#### 1.2.1 Create language/FFI mapping table showing ctypes, cgo, JNI, etc. ✅
#### 1.2.2 Write PolyScript.NET P/Invoke wrapper design for C#/F#/VB/PowerShell ✅
#### 1.2.3 Document CMake build configuration for Linux/Windows/macOS ✅

### 1.3 Implementation Specifications
#### 1.3.1 Write complete libpolyscript.hpp header example in LibraryDesign.md ✅
#### 1.3.2 Add three-layer architecture diagram to Architecture.md ✅
#### 1.3.3 Add "Compiled UML" philosophy section to Vision.md ✅

## 2. libpolyscript C++ Implementation
### 2.1 Project Setup
#### 2.1.1 Create directories: libpolyscript/include/polyscript/, libpolyscript/src/, libpolyscript/tests/ ✅
#### 2.1.2 Create CMakeLists.txt with C++11 standard and -Wall -Werror flags ✅
#### 2.1.3 ~~Create GitHub Actions workflow for Ubuntu/Windows/macOS builds~~ 🚫 REMOVED (over-engineering)

### 2.2 Core Headers Implementation
#### 2.2.1 Write polyscript.hpp with version constants and includes for other headers ✅
#### 2.2.2 Write operations.hpp with enum class Operation {Create=0,Read=1,Update=2,Delete=3} ✅
#### 2.2.3 Write modes.hpp with constexpr ModeRules MODE_BEHAVIORS[3] matrix ✅
#### 2.2.4 Write context.hpp with struct Context containing operation, mode, resource fields ✅

### 2.3 C Interface Implementation
#### 2.3.1 Write polyscript.cpp with polyscript_can_mutate(int mode) function ✅
#### 2.3.2 Write polyscript_free_string(char*) and polyscript_format_discovery_json(char*) ✅
#### 2.3.3 Add extern "C" blocks and DLL export macros for Windows ✅

### 2.4 Testing and Validation
#### 2.4.1 Write test_modes.cpp with static_assert tests for constexpr functions ✅
#### 2.4.2 Write test_operations.cpp testing string_to_operation conversions ✅
#### 2.4.3 Write test_c_interface.c testing all functions from pure C ✅

## 3. Rust Proof-of-Concept
### 3.1 Rust FFI Bindings
#### 3.1.1 Create polyscript-sys crate with bindgen setup in build.rs ✅
#### 3.1.2 Write safe wrapper mod with PolyScriptContext struct wrapping FFI calls ✅
#### 3.1.3 Run cargo test ensuring all FFI functions return expected values ✅

### 3.2 Framework Refactoring
#### 3.2.1 Delete can_mutate(), should_validate() functions from polyscript_framework.rs ✅
#### 3.2.2 Replace with unsafe { polyscript_can_mutate(mode as c_int) } calls ✅
#### 3.2.3 Keep clap argument parsing and JSON serialization unchanged ✅

### 3.3 Integration Testing
#### 3.3.1 Run test-compiler.rs create/read/update/delete in all 3 modes ✅
#### 3.3.2 Verify JSON output matches original framework exactly ✅
#### 3.3.3 Run criterion benchmark comparing native vs FFI function calls 🔴

## 4. Validation Phase
### 4.1 ~~Performance Analysis~~ 🚫 REMOVED (over-engineering for internal tools)
### 4.2 ~~Developer Experience~~ 🚫 REMOVED (over-engineering for internal tools)  
### 4.3 ~~Cross-Platform Testing~~ 🚫 REMOVED (over-engineering for internal tools)

## 5. .NET Languages Integration
### 5.1 PolyScript.NET Wrapper
#### 5.1.1 Run dotnet new classlib -n PolyScript.NET -f netstandard2.0 🟢
#### 5.1.2 Write LibPolyScript.cs with [DllImport("libpolyscript")] declarations 🟢
#### 5.1.3 Create IPolyScriptTool interface and PolyScriptContext class 🟢

### 5.2 Framework Updates
#### 5.2.1 Replace PolyScript.Framework.cs mode logic with LibPolyScript calls 🟢
#### 5.2.2 Update PolyScript.Framework.fs to reference PolyScript.NET.dll 🟢
#### 5.2.3 Update PolyScriptFramework.vb to Imports PolyScript.NET 🟢
#### 5.2.4 Modify polyscript.ps1 to Add-Type -Path PolyScript.NET.dll 🟢

### 5.3 ~~NuGet Packaging~~ 🚫 REMOVED (over-engineering for internal tools)

## 6. Dynamic Languages Integration
### 6.1 Python Integration
#### 6.1.1 Write polyscript_ffi.py using ctypes.CDLL to load libpolyscript.so 🟢
#### 6.1.2 Replace mode logic in polyscript_click.py with libpolyscript calls 🟢
#### 6.1.3 Run python setup.py sdist bdist_wheel with bundled .so file 🔴

### 6.2 Ruby Integration
#### 6.2.1 Add gem 'ffi' to Gemfile and write polyscript_ffi.rb module 🟢
#### 6.2.2 Delete mode methods from polyscript_framework.rb, use FFI.library calls 🟢
#### 6.2.3 Run test-compiler.rb with all Thor commands to verify 🔴

### 6.3 Node.js Integration
#### 6.3.1 Create binding.gyp and polyscript_napi.cc with N-API wrapper 🟢
#### 6.3.2 Replace executeWithMode() in polyscript-framework.js with native calls 🟢
#### 6.3.3 Run npm pack including prebuilt binaries in package 🔴

## 7. Compiled Languages Integration
### 7.1 Go Integration
#### 7.1.1 Add // #cgo LDFLAGS: -lpolyscript to polyscript_framework.go 🟢
#### 7.1.2 Replace Context methods with C.polyscript_can_mutate calls 🟢
#### 7.1.3 Run go test with test-compiler.go Cobra commands 🟢

### 7.2 Additional Compiled Languages
#### 7.2.1 Add foreign import ccall to Framework.hs for libpolyscript functions 🟢
#### 7.2.2 Add extern(C) declarations to polyscript_framework.d 🟢
#### 7.2.3 Use @cImport(@cInclude("polyscript.h")) in polyscript_framework.zig 🟢
#### 7.2.4 Add #flag -lpolyscript to polyscript_framework.v module 🟢

### 7.3 JVM Languages
#### 7.3.1 Write PolyScriptJNI.java with System.loadLibrary("polyscript") 🔴
#### 7.3.2 Create JNA wrapper in Framework.scala for libpolyscript calls 🟢
#### 7.3.3 Run sbt test with TestCompiler.scala scopt parsing 🔴

## 8. Remaining Languages
### 8.1 Functional Languages
#### 8.1.1 Write polyscript_nif.c implementing Erlang NIFs for Elixir 🟢
#### 8.1.2 Run mix test with test_compiler_ex.exs Mix tasks 🔴

### 8.2 Scientific Languages
#### 8.2.1 Add ccall((:polyscript_can_mutate, "libpolyscript"), ...) to polyscript_framework.jl 🟢
#### 8.2.2 Run julia test_compiler.jl with ArgParse.jl commands 🔴

## 9. Documentation and Release
### 9.1 Comprehensive Documentation
#### 9.1.1 Write MIGRATION.md showing before/after code for each language 🔴
#### 9.1.2 Create FFI_PATTERNS.md with code snippets for all 16 languages 🔴
#### 9.1.3 Write TROUBLESHOOTING.md covering "undefined symbol" and ABI issues 🔴

### 9.2 Example Updates
#### 9.2.1 Update backup_tool_example.py/rb/rs/go etc. to use libpolyscript 🔴
#### 9.2.2 Create compiler_tool.py showing @rebadge("compile", "create+live") 🔴
#### 9.2.3 Write benchmark.rs comparing 1M native vs FFI calls with results 🔴

### 9.3 Release Management
#### 9.3.1 Run git tag -a v1.0.0 -m "First stable release" && git push --tags 🔴
#### 9.3.2 Build .deb, .rpm, .msi, .pkg installers with CPack 🔴
#### 9.3.3 Run cargo publish, npm publish, gem push, pip upload commands 🔴

## 10. Deprecation and Cleanup
### 10.1 Legacy Code Removal
#### 10.1.1 Delete can_mutate(), should_validate() functions from all 16 frameworks 🔴
#### 10.1.2 Run rm -rf schema/ removing polyscript-v1.0.json 🔴
#### 10.1.3 Move old implementations to archive/pre-libpolyscript/ directory 🔴

### 10.2 Final Validation
#### 10.2.1 Run ./test_all_frameworks.sh verifying 100% pass rate 🔴
#### 10.2.2 Compare JSON outputs between old and new frameworks byte-for-byte 🔴
#### 10.2.3 Verify FFI overhead <1% using criterion/hyperfine benchmarks 🔴

---

**Author**: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>  
**Created**: 2025-07-05  
**Status**: Phase 1 Complete, Ready to begin Phase 2