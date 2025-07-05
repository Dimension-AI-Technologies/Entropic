cmake_minimum_required(VERSION 3.15)
project(libpolyscript VERSION 1.0.0 LANGUAGES CXX)

# C++14 requirement for constexpr functions
set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Compiler flags with -Wall -Werror
if(MSVC)
    add_compile_options(/W4 /WX)
else()
    add_compile_options(-Wall -Wextra -Werror -Wno-unused-parameter)
endif()

# Position independent code for shared library
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Library target
add_library(polyscript SHARED
    src/polyscript.cpp
    src/operations.cpp
    src/modes.cpp
    src/context.cpp
    src/discovery.cpp
)

# Include directories
target_include_directories(polyscript
    PUBLIC 
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

# Export symbols on Windows
if(WIN32)
    target_compile_definitions(polyscript PRIVATE BUILDING_POLYSCRIPT_DLL)
    set_target_properties(polyscript PROPERTIES WINDOWS_EXPORT_ALL_SYMBOLS ON)
endif()

# Tests
if(BUILD_TESTING)
    enable_testing()
    add_subdirectory(tests)
endif()

# Install configuration
install(TARGETS polyscript
    EXPORT polyscript-targets
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)

install(DIRECTORY include/polyscript DESTINATION include)

install(EXPORT polyscript-targets
    FILE polyscript-config.cmake
    NAMESPACE polyscript::
    DESTINATION lib/cmake/polyscript
)

# Package configuration
include(CMakePackageConfigHelpers)
write_basic_package_version_file(
    "${CMAKE_CURRENT_BINARY_DIR}/polyscript-config-version.cmake"
    VERSION ${PROJECT_VERSION}
    COMPATIBILITY AnyNewerVersion
)

install(FILES
    "${CMAKE_CURRENT_BINARY_DIR}/polyscript-config-version.cmake"
    DESTINATION lib/cmake/polyscript
)

# Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>