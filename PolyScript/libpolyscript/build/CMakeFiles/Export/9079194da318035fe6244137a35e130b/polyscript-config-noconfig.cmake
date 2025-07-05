#----------------------------------------------------------------
# Generated CMake target import file.
#----------------------------------------------------------------

# Commands may need to know the format version.
set(CMAKE_IMPORT_FILE_VERSION 1)

# Import target "polyscript::polyscript" for configuration ""
set_property(TARGET polyscript::polyscript APPEND PROPERTY IMPORTED_CONFIGURATIONS NOCONFIG)
set_target_properties(polyscript::polyscript PROPERTIES
  IMPORTED_LOCATION_NOCONFIG "${_IMPORT_PREFIX}/lib/libpolyscript.dylib"
  IMPORTED_SONAME_NOCONFIG "@rpath/libpolyscript.dylib"
  )

list(APPEND _cmake_import_check_targets polyscript::polyscript )
list(APPEND _cmake_import_check_files_for_polyscript::polyscript "${_IMPORT_PREFIX}/lib/libpolyscript.dylib" )

# Commands beyond this point should not need to know the version.
set(CMAKE_IMPORT_FILE_VERSION)
