# CMake generated Testfile for 
# Source directory: /Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/libpolyscript/tests
# Build directory: /Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/libpolyscript/build/tests
# 
# This file includes the relevant testing commands required for 
# testing this directory and lists subdirectories to be tested as well.
add_test(ModesTest "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/libpolyscript/build/tests/test_modes")
set_tests_properties(ModesTest PROPERTIES  PASS_REGULAR_EXPRESSION "All mode tests passed successfully!" _BACKTRACE_TRIPLES "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/libpolyscript/tests/CMakeLists.txt;24;add_test;/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/libpolyscript/tests/CMakeLists.txt;0;")
add_test(OperationsTest "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/libpolyscript/build/tests/test_operations")
set_tests_properties(OperationsTest PROPERTIES  PASS_REGULAR_EXPRESSION "All operation tests passed successfully!" _BACKTRACE_TRIPLES "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/libpolyscript/tests/CMakeLists.txt;25;add_test;/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/libpolyscript/tests/CMakeLists.txt;0;")
add_test(CInterfaceTest "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/libpolyscript/build/tests/test_c_interface")
set_tests_properties(CInterfaceTest PROPERTIES  PASS_REGULAR_EXPRESSION "All C interface tests passed successfully!" _BACKTRACE_TRIPLES "/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/libpolyscript/tests/CMakeLists.txt;26;add_test;/Users/doowell2/Source/repos/Scripts/scripts-dev/PolyScript/libpolyscript/tests/CMakeLists.txt;0;")
