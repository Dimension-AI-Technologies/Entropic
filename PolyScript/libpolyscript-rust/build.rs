/**
 * Build script for polyscript-sys
 * Links to libpolyscript and sets up FFI bindings
 * 
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

use std::env;
use std::path::PathBuf;

fn main() {
    // Get the libpolyscript path relative to this crate
    let libpolyscript_dir = PathBuf::from("../libpolyscript");
    let build_dir = libpolyscript_dir.join("build");
    
    // Tell cargo to look for shared libraries in the build directory
    println!("cargo:rustc-link-search=native={}", build_dir.display());
    
    // Link to libpolyscript
    println!("cargo:rustc-link-lib=dylib=polyscript");
    
    // Tell cargo to invalidate the built crate whenever the wrapper changes
    println!("cargo:rerun-if-changed=src/lib.rs");
    println!("cargo:rerun-if-changed=../libpolyscript/include/polyscript/polyscript.hpp");
    
    // Tell cargo to invalidate if libpolyscript changes
    println!("cargo:rerun-if-changed=../libpolyscript/build/libpolyscript.dylib");
}