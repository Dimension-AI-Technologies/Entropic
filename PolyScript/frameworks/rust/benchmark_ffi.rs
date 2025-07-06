/*
 * FFI Performance Benchmark for libpolyscript
 * Measures overhead of FFI calls vs native implementation
 * 
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

use polyscript_framework::{PolyScriptContext, PolyScriptOperation, PolyScriptMode};
use std::collections::HashMap;
use std::time::Instant;

// Native implementation for comparison
fn native_can_mutate(mode: PolyScriptMode) -> bool {
    mode == PolyScriptMode::Live
}

fn native_should_validate(mode: PolyScriptMode) -> bool {
    mode == PolyScriptMode::Sandbox
}

fn native_is_safe_mode(mode: PolyScriptMode) -> bool {
    mode != PolyScriptMode::Live
}

const ITERATIONS: usize = 1_000_000;

fn main() {
    println!("PolyScript FFI Performance Benchmark");
    println!("=====================================");
    println!("Iterations: {}", ITERATIONS);
    println!();

    // Create test context
    let ctx = PolyScriptContext::new(
        PolyScriptOperation::Create,
        PolyScriptMode::Live,
        Some("test.rs".to_string()),
        None,
        HashMap::new(),
        false,
        false,
        false,
        "BenchmarkTest",
    );

    // Benchmark can_mutate
    println!("Benchmarking can_mutate():");
    
    let start = Instant::now();
    for _ in 0..ITERATIONS {
        let _ = ctx.can_mutate();
    }
    let ffi_duration = start.elapsed();
    
    let start = Instant::now();
    for _ in 0..ITERATIONS {
        let _ = native_can_mutate(PolyScriptMode::Live);
    }
    let native_duration = start.elapsed();
    
    println!("  FFI:    {:?} ({:.2} ns/call)", ffi_duration, ffi_duration.as_nanos() as f64 / ITERATIONS as f64);
    println!("  Native: {:?} ({:.2} ns/call)", native_duration, native_duration.as_nanos() as f64 / ITERATIONS as f64);
    println!("  Overhead: {:.2}x", ffi_duration.as_nanos() as f64 / native_duration.as_nanos() as f64);
    println!();

    // Benchmark should_validate
    println!("Benchmarking should_validate():");
    
    let start = Instant::now();
    for _ in 0..ITERATIONS {
        let _ = ctx.should_validate();
    }
    let ffi_duration = start.elapsed();
    
    let start = Instant::now();
    for _ in 0..ITERATIONS {
        let _ = native_should_validate(PolyScriptMode::Live);
    }
    let native_duration = start.elapsed();
    
    println!("  FFI:    {:?} ({:.2} ns/call)", ffi_duration, ffi_duration.as_nanos() as f64 / ITERATIONS as f64);
    println!("  Native: {:?} ({:.2} ns/call)", native_duration, native_duration.as_nanos() as f64 / ITERATIONS as f64);
    println!("  Overhead: {:.2}x", ffi_duration.as_nanos() as f64 / native_duration.as_nanos() as f64);
    println!();

    // Benchmark is_safe_mode
    println!("Benchmarking is_safe_mode():");
    
    let start = Instant::now();
    for _ in 0..ITERATIONS {
        let _ = ctx.is_safe_mode();
    }
    let ffi_duration = start.elapsed();
    
    let start = Instant::now();
    for _ in 0..ITERATIONS {
        let _ = native_is_safe_mode(PolyScriptMode::Live);
    }
    let native_duration = start.elapsed();
    
    println!("  FFI:    {:?} ({:.2} ns/call)", ffi_duration, ffi_duration.as_nanos() as f64 / ITERATIONS as f64);
    println!("  Native: {:?} ({:.2} ns/call)", native_duration, native_duration.as_nanos() as f64 / ITERATIONS as f64);
    println!("  Overhead: {:.2}x", ffi_duration.as_nanos() as f64 / native_duration.as_nanos() as f64);
    println!();

    println!("Benchmark complete!");
    println!();
    println!("Analysis:");
    println!("- FFI overhead is expected to be 10-100x native calls");
    println!("- For CLI tools, this overhead is negligible (<1μs impact)"); 
    println!("- The benefit of unified behavioral contracts outweighs the performance cost");
}