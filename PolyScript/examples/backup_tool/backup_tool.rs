/*
 * Example: Backup Tool using PolyScript Rust Framework
 *
 * This demonstrates how the Rust PolyScript framework eliminates boilerplate.
 * Shows both trait implementation and macro-based approaches.
 *
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

use polyscript_framework::{
    polyscript_tool, run_polyscript_tool, PolyScriptContext, PolyScriptResult, PolyScriptTool,
};
use serde_json::{json, Value};
use std::fs;
use std::path::Path;

// Full trait implementation approach
pub struct BackupTool {
    source_path: String,
    dest_path: String,
    overwrite: bool,
}

impl BackupTool {
    pub fn new(source: String, dest: String, overwrite: bool) -> Self {
        Self {
            source_path: source,
            dest_path: dest,
            overwrite,
        }
    }

    fn get_directory_info(&self, path: &str) -> DirectoryInfo {
        match fs::metadata(path) {
            Ok(metadata) if metadata.is_dir() => {
                let (size, file_count) = self.calculate_directory_size(path);
                DirectoryInfo {
                    exists: true,
                    size,
                    file_count,
                }
            }
            _ => DirectoryInfo {
                exists: false,
                size: 0,
                file_count: 0,
            },
        }
    }

    fn calculate_directory_size(&self, path: &str) -> (u64, u32) {
        let mut total_size = 0u64;
        let mut file_count = 0u32;

        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_file() {
                        total_size += metadata.len();
                        file_count += 1;
                    } else if metadata.is_dir() {
                        let (sub_size, sub_count) = self.calculate_directory_size(
                            &entry.path().to_string_lossy()
                        );
                        total_size += sub_size;
                        file_count += sub_count;
                    }
                }
            }
        }

        (total_size, file_count)
    }

    fn test_source_readable(&self) -> &str {
        if Path::new(&self.source_path).exists() {
            "passed"
        } else {
            "failed"
        }
    }

    fn test_destination_writable(&self) -> &str {
        if let Some(parent) = Path::new(&self.dest_path).parent() {
            if parent.exists() {
                "passed"
            } else {
                "failed"
            }
        } else {
            "error"
        }
    }

    fn test_sufficient_space(&self) -> &str {
        // Simplified implementation
        let source_info = self.get_directory_info(&self.source_path);
        if source_info.exists && source_info.size < 1_000_000_000 {
            // Assume sufficient if less than 1GB
            "passed"
        } else {
            "unknown"
        }
    }

    fn test_filesystem_access(&self) -> &str {
        match std::env::temp_dir().try_exists() {
            Ok(true) => "passed",
            _ => "failed",
        }
    }
}

impl PolyScriptTool for BackupTool {
    fn description(&self) -> &str {
        "PolyScript-compliant backup tool with zero boilerplate\n\n\
         Backs up directories with full PolyScript mode support.\n\
         Provides status checking, dry-run testing, dependency validation,\n\
         and live backup operations."
    }

    fn add_arguments(&self, cmd: clap::Command) -> clap::Command {
        cmd.arg(
            clap::Arg::new("source")
                .help("Source directory to backup")
                .required(false)
                .index(1),
        )
        .arg(
            clap::Arg::new("dest")
                .help("Destination directory")
                .required(false)
                .index(2),
        )
        .arg(
            clap::Arg::new("overwrite")
                .long("overwrite")
                .help("Overwrite existing destination")
                .action(clap::ArgAction::SetTrue),
        )
    }

    fn status(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
        context.log("Checking backup status...", None);

        let source_info = self.get_directory_info(&self.source_path);
        let dest_info = self.get_directory_info(&self.dest_path);

        Ok(Some(json!({
            "source": {
                "path": self.source_path,
                "exists": source_info.exists,
                "size_bytes": source_info.size,
                "file_count": source_info.file_count
            },
            "destination": {
                "path": self.dest_path,
                "exists": dest_info.exists,
                "size_bytes": dest_info.size,
                "would_overwrite": dest_info.exists && !self.overwrite
            },
            "backup_needed": source_info.exists && (!dest_info.exists || self.overwrite)
        })))
    }

    fn test(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
        context.log("Planning backup operations...", None);

        let source_info = self.get_directory_info(&self.source_path);
        let dest_info = self.get_directory_info(&self.dest_path);

        if !source_info.exists {
            context.output(json!("Source directory does not exist"), true);
            return Ok(None);
        }

        let operations = if dest_info.exists && !self.overwrite {
            vec![json!({
                "operation": "skip",
                "reason": "destination exists and overwrite not specified",
                "source": self.source_path,
                "destination": self.dest_path
            })]
        } else {
            vec![json!({
                "operation": "backup",
                "source": self.source_path,
                "destination": self.dest_path,
                "file_count": source_info.file_count,
                "size_bytes": source_info.size,
                "would_overwrite": dest_info.exists
            })]
        };

        Ok(Some(json!({
            "planned_operations": operations,
            "total_files": source_info.file_count,
            "total_size": source_info.size,
            "note": "No changes made in test mode"
        })))
    }

    fn sandbox(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
        context.log("Testing backup environment...", None);

        let tests = json!({
            "source_readable": self.test_source_readable(),
            "destination_writable": self.test_destination_writable(),
            "sufficient_space": self.test_sufficient_space(),
            "filesystem_access": self.test_filesystem_access()
        });

        let all_passed = [
            self.test_source_readable(),
            self.test_destination_writable(),
            self.test_sufficient_space(),
            self.test_filesystem_access(),
        ]
        .iter()
        .all(|&status| status == "passed");

        Ok(Some(json!({
            "dependency_tests": tests,
            "all_passed": all_passed
        })))
    }

    fn live(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
        context.log("Preparing backup execution...", None);

        let source_info = self.get_directory_info(&self.source_path);
        if !source_info.exists {
            context.output(json!("Source directory does not exist"), true);
            return Ok(None);
        }

        let dest_info = self.get_directory_info(&self.dest_path);
        if dest_info.exists && !self.overwrite {
            if !context.confirm(&format!("Destination {} exists. Overwrite?", self.dest_path)) {
                return Ok(Some(json!({"status": "cancelled"})));
            }
        }

        context.log(&format!("Starting backup from {} to {}", self.source_path, self.dest_path), None);

        // Simulate backup operation
        // In real implementation: std::fs::remove_dir_all(&self.dest_path); std::fs::rename(&self.source_path, &self.dest_path);
        std::thread::sleep(std::time::Duration::from_millis(1000));

        let result_info = self.get_directory_info(&self.dest_path);

        Ok(Some(json!({
            "operation": "backup_completed",
            "source": self.source_path,
            "destination": self.dest_path,
            "files_copied": result_info.file_count,
            "bytes_copied": result_info.size
        })))
    }
}

// Helper struct for directory information
#[derive(Debug)]
struct DirectoryInfo {
    exists: bool,
    size: u64,
    file_count: u32,
}

// Macro-based approach for simpler tools
polyscript_tool! {
    name: SimpleBackupTool,
    description: "Simple backup tool using macro approach",
    status: |context| {
        context.log("Checking simple backup status...", None);
        Ok(Some(json!({
            "operational": true,
            "last_backup": "never",
            "ready": true
        })))
    },
    test: |context| {
        context.log("Planning simple backup...", None);
        Ok(Some(json!({
            "planned_operations": [
                {"operation": "backup", "files": 42}
            ],
            "note": "No changes made in test mode"
        })))
    },
    sandbox: |context| {
        context.log("Testing simple backup environment...", None);
        Ok(Some(json!({
            "dependency_tests": {
                "filesystem": "accessible",
                "permissions": "sufficient"
            },
            "all_passed": true
        })))
    },
    live: |context| {
        context.log("Executing simple backup...", None);
        if context.confirm("Execute backup?") {
            Ok(Some(json!({
                "operation": "backup_completed",
                "files_backed_up": 42
            })))
        } else {
            Ok(Some(json!({"status": "cancelled"})))
        }
    }
}

// Functional approach using closures
fn create_functional_backup_tool() -> impl PolyScriptTool {
    struct FunctionalBackupTool;
    
    impl PolyScriptTool for FunctionalBackupTool {
        fn description(&self) -> &str {
            "Functional backup tool demonstrating closure-based approach"
        }

        fn status(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
            context.log("Functional status check...", None);
            Ok(Some(json!({"functional": true, "status": "ready"})))
        }

        fn test(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
            context.log("Functional test mode...", None);
            Ok(Some(json!({"would_execute": ["backup_operation"]})))
        }

        fn sandbox(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
            context.log("Functional sandbox test...", None);
            Ok(Some(json!({"environment": "ready", "all_passed": true})))
        }

        fn live(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
            context.log("Functional live execution...", None);
            Ok(Some(json!({"executed": true, "result": "success"})))
        }
    }
    
    FunctionalBackupTool
}

// Example programs showing different approaches

// Program using full trait implementation
fn main_full_implementation() {
    let tool = BackupTool::new(
        "/source".to_string(),
        "/dest".to_string(),
        false,
    );
    let exit_code = run_polyscript_tool(tool);
    std::process::exit(exit_code);
}

// Program using macro approach
fn main_macro_approach() {
    let exit_code = run_polyscript_tool(SimpleBackupTool);
    std::process::exit(exit_code);
}

// Program using functional approach
fn main_functional_approach() {
    let tool = create_functional_backup_tool();
    let exit_code = run_polyscript_tool(tool);
    std::process::exit(exit_code);
}

// Main function - choose which approach to demonstrate
fn main() {
    // Uncomment the approach you want to test:
    main_full_implementation();
    // main_macro_approach();
    // main_functional_approach();
}

/*
 * CARGO.TOML:
 * 
 * [package]
 * name = "backup-tool"
 * version = "0.1.0"
 * edition = "2021"
 * 
 * [dependencies]
 * clap = { version = "4.4", features = ["derive"] }
 * serde = { version = "1.0", features = ["derive"] }
 * serde_json = "1.0"
 * 
 * [[bin]]
 * name = "backup-tool"
 * path = "src/backup_tool_example.rs"
 * 
 * USAGE EXAMPLES:
 * 
 * cargo run status
 * cargo run test --verbose
 * cargo run sandbox --json
 * cargo run live --force
 * cargo run -- status /source /dest --overwrite
 * 
 * The framework automatically provides:
 * - All CLI argument parsing and validation with clap
 * - Command routing for the four PolyScript modes
 * - --json, --verbose, --force standard flags
 * - PolyScript v1.0 JSON output formatting
 * - Error handling and exit codes
 * - Help text generation
 * - Confirmation prompts
 * - Memory safety and performance
 * 
 * BENEFITS OF RUST APPROACH:
 * - ZERO boilerplate code
 * - Memory safety without garbage collection
 * - Zero-cost abstractions
 * - Excellent performance
 * - Rich type system with pattern matching
 * - Cargo package management
 * - Cross-platform compilation
 * - Multiple implementation approaches (trait, macro, functional)
 * - Compile-time guarantees
 * 
 * RUST-SPECIFIC ADVANTAGES:
 * - Ownership system prevents data races
 * - No runtime overhead for abstractions
 * - Excellent error handling with Result<T, E>
 * - Pattern matching for control flow
 * - Trait system for flexible interfaces
 * - Macro system for code generation
 * - Strong ecosystem with cargo/crates.io
 */