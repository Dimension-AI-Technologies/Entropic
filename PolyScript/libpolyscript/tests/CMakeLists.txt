# CMakeLists.txt for libpolyscript tests
# Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>

cmake_minimum_required(VERSION 3.15)

# Add test executables
add_executable(test_modes test_modes.cpp)
add_executable(test_operations test_operations.cpp)
add_executable(test_c_interface test_c_interface.c)

# Link tests to the main library
target_link_libraries(test_modes polyscript)
target_link_libraries(test_operations polyscript)
target_link_libraries(test_c_interface polyscript)

# Include directories for C++ tests
target_include_directories(test_modes PRIVATE ../include)
target_include_directories(test_operations PRIVATE ../include)

# Set C standard for C test
set_property(TARGET test_c_interface PROPERTY C_STANDARD 99)

# Add tests to CTest
add_test(NAME ModesTest COMMAND test_modes)
add_test(NAME OperationsTest COMMAND test_operations)
add_test(NAME CInterfaceTest COMMAND test_c_interface)

# Set test properties
set_tests_properties(ModesTest PROPERTIES 
    PASS_REGULAR_EXPRESSION "All mode tests passed successfully!")

set_tests_properties(OperationsTest PROPERTIES 
    PASS_REGULAR_EXPRESSION "All operation tests passed successfully!")

set_tests_properties(CInterfaceTest PROPERTIES 
    PASS_REGULAR_EXPRESSION "All C interface tests passed successfully!")

# Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>