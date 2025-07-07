#----------------------------------------------------------------
# Generated CMake target import file for configuration "Release".
#----------------------------------------------------------------

# Commands may need to know the format version.
set(CMAKE_IMPORT_FILE_VERSION 1)

# Import target "polyscript::polyscript" for configuration "Release"
set_property(TARGET polyscript::polyscript APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(polyscript::polyscript PROPERTIES
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/lib/libpolyscript.dylib"
  IMPORTED_SONAME_RELEASE "@rpath/libpolyscript.dylib"
  )

list(APPEND _cmake_import_check_targets polyscript::polyscript )
list(APPEND _cmake_import_check_files_for_polyscript::polyscript "${_IMPORT_PREFIX}/lib/libpolyscript.dylib" )

# Commands beyond this point should not need to know the version.
set(CMAKE_IMPORT_FILE_VERSION)
