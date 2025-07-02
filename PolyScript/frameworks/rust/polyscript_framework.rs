/*
 * PolyScript Framework for Rust using clap
 *
 * A true zero-boilerplate framework for creating PolyScript-compliant CLI tools.
 * Developers write ONLY business logic - the framework handles everything else.
 *
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

use clap::{Arg, ArgMatches, Command};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::error::Error;
use std::fmt;
use std::io::{self, Write};

/// PolyScript execution modes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PolyScriptMode {
    Status,
    Test,
    Sandbox,
    Live,
}

impl fmt::Display for PolyScriptMode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PolyScriptMode::Status => write!(f, "status"),
            PolyScriptMode::Test => write!(f, "test"),
            PolyScriptMode::Sandbox => write!(f, "sandbox"),
            PolyScriptMode::Live => write!(f, "live"),
        }
    }
}

/// PolyScript context passed to tool methods
pub struct PolyScriptContext {
    pub mode: PolyScriptMode,
    pub verbose: bool,
    pub force: bool,
    pub json_output: bool,
    pub output_data: HashMap<String, Value>,
}

impl PolyScriptContext {
    pub fn new(mode: PolyScriptMode, verbose: bool, force: bool, json_output: bool, tool_name: &str) -> Self {
        let mut output_data = HashMap::new();
        output_data.insert("polyscript".to_string(), json!("1.0"));
        output_data.insert("mode".to_string(), json!(mode.to_string()));
        output_data.insert("tool".to_string(), json!(tool_name));
        output_data.insert("status".to_string(), json!("success"));
        output_data.insert("data".to_string(), json!({}));

        Self {
            mode,
            verbose,
            force,
            json_output,
            output_data,
        }
    }

    /// Log a message at the specified level
    pub fn log(&mut self, message: &str, level: Option<&str>) {
        let level = level.unwrap_or("info");
        
        if self.json_output {
            // Route to JSON data structure
            let key = match level {
                "error" | "critical" => Some("errors"),
                "warning" => Some("warnings"),
                "info" | "debug" if self.verbose => Some("messages"),
                _ => None,
            };

            if let Some(k) = key {
                let entry = self.output_data
                    .entry(k.to_string())
                    .or_insert_with(|| json!(Vec::<String>::new()));
                
                if let Value::Array(ref mut arr) = entry {
                    arr.push(json!(format!("{}: {}", level.to_uppercase(), message)));
                }
            }
        } else {
            // Direct console output
            match level {
                "error" | "critical" => {
                    eprintln!("Error: {}", message);
                }
                "warning" => {
                    eprintln!("Warning: {}", message);
                }
                "info" => {
                    println!("{}", message);
                }
                "debug" if self.verbose => {
                    println!("{}", message);
                }
                _ => {}
            }
        }
    }

    /// Output data in appropriate format
    pub fn output(&mut self, data: Value, error: bool) {
        if self.json_output {
            if data.is_string() {
                let key = if error { "errors" } else { "messages" };
                let entry = self.output_data
                    .entry(key.to_string())
                    .or_insert_with(|| json!(Vec::<String>::new()));
                
                if let Value::Array(ref mut arr) = entry {
                    arr.push(data);
                }
            } else if let Value::Object(obj) = data {
                // Merge object properties into data section
                if let Some(Value::Object(ref mut data_obj)) = self.output_data.get_mut("data") {
                    for (key, value) in obj {
                        data_obj.insert(key, value);
                    }
                }
            }
        } else {
            if error {
                eprintln!("Error: {}", data);
            } else if data.is_string() {
                println!("{}", data.as_str().unwrap());
            } else {
                println!("{}", serde_json::to_string_pretty(&data).unwrap_or_default());
            }
        }
    }

    /// Ask for user confirmation
    pub fn confirm(&mut self, message: &str) -> bool {
        if self.force {
            return true;
        }

        if self.json_output {
            self.output(json!({"confirmation_required": message}), true);
            return false;
        }

        print!("{} [y/N]: ", message);
        io::stdout().flush().unwrap();
        
        let mut input = String::new();
        io::stdin().read_line(&mut input).unwrap();
        input.trim().to_lowercase() == "y"
    }

    /// Finalize output (called at the end to output JSON if needed)
    pub fn finalize_output(&self) {
        if self.json_output {
            println!("{}", serde_json::to_string_pretty(&self.output_data).unwrap_or_default());
        }
    }
}

/// Error type for PolyScript execution
#[derive(Debug)]
pub struct PolyScriptError {
    pub message: String,
}

impl fmt::Display for PolyScriptError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl Error for PolyScriptError {}

/// Result type for PolyScript operations
pub type PolyScriptResult<T> = Result<T, PolyScriptError>;

/// Trait that PolyScript tools must implement
pub trait PolyScriptTool {
    /// Tool description for help text
    fn description(&self) -> &str;

    /// Add tool-specific arguments to the command
    fn add_arguments(&self, _cmd: Command) -> Command {
        // Default implementation - no additional arguments
        _cmd
    }

    /// Execute status mode (show current state)
    fn status(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>>;

    /// Execute test mode (simulate operations)
    fn test(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>>;

    /// Execute sandbox mode (test dependencies)
    fn sandbox(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>>;

    /// Execute live mode (actual operations)
    fn live(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>>;
}

/// Main framework function to run a PolyScript tool
pub fn run_polyscript_tool<T: PolyScriptTool>(tool: T) -> i32 {
    let tool_name = std::any::type_name::<T>()
        .split("::")
        .last()
        .unwrap_or("PolyScriptTool");

    // Create base command
    let mut cmd = Command::new(tool_name.to_lowercase())
        .version("1.0.0")
        .about(tool.description())
        .subcommand_required(false)
        .arg_required_else_help(false)
        .arg(
            Arg::new("verbose")
                .short('v')
                .long("verbose")
                .help("Enable verbose output")
                .action(clap::ArgAction::SetTrue),
        )
        .arg(
            Arg::new("force")
                .short('f')
                .long("force")
                .help("Skip confirmation prompts")
                .action(clap::ArgAction::SetTrue),
        )
        .arg(
            Arg::new("json")
                .long("json")
                .help("Output in JSON format")
                .action(clap::ArgAction::SetTrue),
        );

    // Add PolyScript mode subcommands
    cmd = cmd
        .subcommand(
            tool.add_arguments(
                Command::new("status")
                    .about("Show current state")
                    .arg(
                        Arg::new("verbose")
                            .short('v')
                            .long("verbose")
                            .help("Enable verbose output")
                            .action(clap::ArgAction::SetTrue),
                    )
                    .arg(
                        Arg::new("force")
                            .short('f')
                            .long("force")
                            .help("Skip confirmation prompts")
                            .action(clap::ArgAction::SetTrue),
                    )
                    .arg(
                        Arg::new("json")
                            .long("json")
                            .help("Output in JSON format")
                            .action(clap::ArgAction::SetTrue),
                    ),
            ),
        )
        .subcommand(
            tool.add_arguments(
                Command::new("test")
                    .about("Simulate operations (dry-run)")
                    .arg(
                        Arg::new("verbose")
                            .short('v')
                            .long("verbose")
                            .help("Enable verbose output")
                            .action(clap::ArgAction::SetTrue),
                    )
                    .arg(
                        Arg::new("force")
                            .short('f')
                            .long("force")
                            .help("Skip confirmation prompts")
                            .action(clap::ArgAction::SetTrue),
                    )
                    .arg(
                        Arg::new("json")
                            .long("json")
                            .help("Output in JSON format")
                            .action(clap::ArgAction::SetTrue),
                    ),
            ),
        )
        .subcommand(
            tool.add_arguments(
                Command::new("sandbox")
                    .about("Test dependencies and environment")
                    .arg(
                        Arg::new("verbose")
                            .short('v')
                            .long("verbose")
                            .help("Enable verbose output")
                            .action(clap::ArgAction::SetTrue),
                    )
                    .arg(
                        Arg::new("force")
                            .short('f')
                            .long("force")
                            .help("Skip confirmation prompts")
                            .action(clap::ArgAction::SetTrue),
                    )
                    .arg(
                        Arg::new("json")
                            .long("json")
                            .help("Output in JSON format")
                            .action(clap::ArgAction::SetTrue),
                    ),
            ),
        )
        .subcommand(
            tool.add_arguments(
                Command::new("live")
                    .about("Execute actual operations")
                    .arg(
                        Arg::new("verbose")
                            .short('v')
                            .long("verbose")
                            .help("Enable verbose output")
                            .action(clap::ArgAction::SetTrue),
                    )
                    .arg(
                        Arg::new("force")
                            .short('f')
                            .long("force")
                            .help("Skip confirmation prompts")
                            .action(clap::ArgAction::SetTrue),
                    )
                    .arg(
                        Arg::new("json")
                            .long("json")
                            .help("Output in JSON format")
                            .action(clap::ArgAction::SetTrue),
                    ),
            ),
        );

    // Parse arguments
    let matches = cmd.get_matches();

    // Determine mode and get subcommand matches
    let (mode, sub_matches) = match matches.subcommand() {
        Some(("status", sub_m)) => (PolyScriptMode::Status, sub_m),
        Some(("test", sub_m)) => (PolyScriptMode::Test, sub_m),
        Some(("sandbox", sub_m)) => (PolyScriptMode::Sandbox, sub_m),
        Some(("live", sub_m)) => (PolyScriptMode::Live, sub_m),
        _ => {
            // Default to status mode if no subcommand
            let default_matches = ArgMatches::default();
            (PolyScriptMode::Status, &default_matches)
        }
    };

    // Extract flags
    let verbose = sub_matches.get_flag("verbose") || matches.get_flag("verbose");
    let force = sub_matches.get_flag("force") || matches.get_flag("force");
    let json_output = sub_matches.get_flag("json") || matches.get_flag("json");

    // Create context
    let mut context = PolyScriptContext::new(mode, verbose, force, json_output, tool_name);

    context.log(&format!("Executing {} mode", mode), Some("debug"));

    // Execute the appropriate method
    let result = match mode {
        PolyScriptMode::Status => tool.status(&mut context),
        PolyScriptMode::Test => tool.test(&mut context),
        PolyScriptMode::Sandbox => tool.sandbox(&mut context),
        PolyScriptMode::Live => tool.live(&mut context),
    };

    // Handle result
    let exit_code = match result {
        Ok(Some(data)) => {
            context.output(data, false);
            0
        }
        Ok(None) => 0,
        Err(err) => {
            context.output_data.insert("status".to_string(), json!("error"));
            context.output(json!(err.message), true);
            if context.verbose {
                context.log(&format!("Error details: {}", err), Some("error"));
            }
            1
        }
    };

    context.finalize_output();
    exit_code
}

/// Macro to create a simple PolyScript tool
#[macro_export]
macro_rules! polyscript_tool {
    (
        name: $name:ident,
        description: $desc:expr,
        status: $status_fn:expr,
        test: $test_fn:expr,
        sandbox: $sandbox_fn:expr,
        live: $live_fn:expr
    ) => {
        pub struct $name;

        impl PolyScriptTool for $name {
            fn description(&self) -> &str {
                $desc
            }

            fn status(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
                $status_fn(context)
            }

            fn test(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
                $test_fn(context)
            }

            fn sandbox(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
                $sandbox_fn(context)
            }

            fn live(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
                $live_fn(context)
            }
        }
    };
}

// Example tool implementation
pub struct ExampleTool;

impl PolyScriptTool for ExampleTool {
    fn description(&self) -> &str {
        "Example PolyScript tool demonstrating the Rust framework"
    }

    fn add_arguments(&self, cmd: Command) -> Command {
        cmd.arg(
            Arg::new("target")
                .long("target")
                .help("Target to operate on")
                .default_value("default"),
        )
        .arg(
            Arg::new("count")
                .long("count")
                .help("Number of operations")
                .value_parser(clap::value_parser!(u32))
                .default_value("1"),
        )
    }

    fn status(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
        context.log("Checking status...", None);
        
        Ok(Some(json!({
            "operational": true,
            "last_check": "2024-01-02T10:00:00Z",
            "files_ready": 1234
        })))
    }

    fn test(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
        context.log("Running test mode...", None);
        
        Ok(Some(json!({
            "planned_operations": [
                {"operation": "Operation 1", "status": "would execute"},
                {"operation": "Operation 2", "status": "would execute"}
            ],
            "total_operations": 2,
            "note": "No changes made in test mode"
        })))
    }

    fn sandbox(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
        context.log("Testing environment...", None);
        
        let tests = json!({
            "rust": "available",
            "filesystem": "writable",
            "network": "accessible"
        });

        let all_passed = true; // Simplified for example

        Ok(Some(json!({
            "dependency_tests": tests,
            "all_passed": all_passed
        })))
    }

    fn live(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
        context.log("Executing live mode...", None);
        
        if !context.confirm("Execute operations?") {
            return Ok(Some(json!({"status": "cancelled"})));
        }

        context.log("Executing operation 1...", None);
        context.log("Executing operation 2...", None);
        
        Ok(Some(json!({
            "executed_operations": [
                {"operation": "Operation 1", "status": "completed"},
                {"operation": "Operation 2", "status": "completed"}
            ],
            "total_completed": 2
        })))
    }
}

/*
 * EXAMPLE USAGE:
 * 
 * // Simple tool using the macro
 * polyscript_tool! {
 *     name: SimpleBackupTool,
 *     description: "Simple backup tool with zero boilerplate",
 *     status: |context| {
 *         context.log("Checking backup status...", None);
 *         Ok(Some(json!({"operational": true})))
 *     },
 *     test: |context| {
 *         context.log("Planning backup...", None);
 *         Ok(Some(json!({"would_backup": ["file1", "file2"]})))
 *     },
 *     sandbox: |context| {
 *         context.log("Testing environment...", None);
 *         Ok(Some(json!({"environment": "ok"})))
 *     },
 *     live: |context| {
 *         context.log("Executing backup...", None);
 *         Ok(Some(json!({"backup_completed": true})))
 *     }
 * }
 * 
 * // Main function
 * fn main() {
 *     let exit_code = run_polyscript_tool(SimpleBackupTool);
 *     std::process::exit(exit_code);
 * }
 * 
 * // Advanced tool with custom implementation
 * pub struct AdvancedBackupTool {
 *     source_path: String,
 *     dest_path: String,
 * }
 * 
 * impl AdvancedBackupTool {
 *     pub fn new(source: String, dest: String) -> Self {
 *         Self {
 *             source_path: source,
 *             dest_path: dest,
 *         }
 *     }
 * }
 * 
 * impl PolyScriptTool for AdvancedBackupTool {
 *     fn description(&self) -> &str {
 *         "Advanced backup tool with full configuration support"
 *     }
 * 
 *     fn add_arguments(&self, cmd: Command) -> Command {
 *         cmd.arg(
 *             Arg::new("source")
 *                 .help("Source directory")
 *                 .required(true)
 *                 .index(1),
 *         )
 *         .arg(
 *             Arg::new("dest")
 *                 .help("Destination directory")
 *                 .required(true)
 *                 .index(2),
 *         )
 *         .arg(
 *             Arg::new("overwrite")
 *                 .long("overwrite")
 *                 .help("Overwrite existing destination")
 *                 .action(clap::ArgAction::SetTrue),
 *         )
 *     }
 * 
 *     fn status(&self, context: &mut PolyScriptContext) -> PolyScriptResult<Option<Value>> {
 *         // Implementation here
 *         Ok(Some(json!({"source_exists": true, "dest_exists": false})))
 *     }
 * 
 *     // ... other methods
 * }
 */

// Main function for the example
fn main() {
    let exit_code = run_polyscript_tool(ExampleTool);
    std::process::exit(exit_code);
}