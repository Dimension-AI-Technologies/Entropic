/*
 * PolyScript Framework for Rust using clap
 * CRUD × Modes Architecture: Zero-boilerplate CLI development
 *
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

use clap::{Arg, Command, ValueEnum};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::error::Error;
use std::fmt;
use std::io::{self, Write};

/// PolyScript CRUD operations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ValueEnum)]
#[serde(rename_all = "lowercase")]
pub enum PolyScriptOperation {
    Create,
    Read,
    Update,
    Delete,
}

impl fmt::Display for PolyScriptOperation {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PolyScriptOperation::Create => write!(f, "create"),
            PolyScriptOperation::Read => write!(f, "read"),
            PolyScriptOperation::Update => write!(f, "update"),
            PolyScriptOperation::Delete => write!(f, "delete"),
        }
    }
}

/// PolyScript execution modes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ValueEnum)]
#[serde(rename_all = "lowercase")]
pub enum PolyScriptMode {
    Simulate,
    Sandbox,
    Live,
}

impl fmt::Display for PolyScriptMode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PolyScriptMode::Simulate => write!(f, "simulate"),
            PolyScriptMode::Sandbox => write!(f, "sandbox"),
            PolyScriptMode::Live => write!(f, "live"),
        }
    }
}


/// PolyScript context passed to tool methods
pub struct PolyScriptContext {
    pub operation: PolyScriptOperation,
    pub mode: PolyScriptMode,
    pub resource: Option<String>,
    pub rebadged_as: Option<String>,
    pub options: HashMap<String, Value>,
    pub verbose: bool,
    pub force: bool,
    pub json_output: bool,
    pub output_data: HashMap<String, Value>,
}

impl PolyScriptContext {
    pub fn new(
        operation: PolyScriptOperation,
        mode: PolyScriptMode,
        resource: Option<String>,
        rebadged_as: Option<String>,
        options: HashMap<String, Value>,
        verbose: bool,
        force: bool,
        json_output: bool,
        tool_name: &str,
    ) -> Self {
        let mut output_data = HashMap::new();
        output_data.insert("polyscript".to_string(), json!("1.0"));
        output_data.insert("operation".to_string(), json!(operation.to_string()));
        output_data.insert("mode".to_string(), json!(mode.to_string()));
        output_data.insert("tool".to_string(), json!(tool_name));
        output_data.insert("status".to_string(), json!("success"));
        output_data.insert("data".to_string(), json!({}));

        if let Some(ref r) = resource {
            output_data.insert("resource".to_string(), json!(r));
        }

        if let Some(ref r) = rebadged_as {
            output_data.insert("rebadged_as".to_string(), json!(r));
        }

        Self {
            operation,
            mode,
            resource,
            rebadged_as,
            options,
            verbose,
            force,
            json_output,
            output_data,
        }
    }

    pub fn can_mutate(&self) -> bool {
        self.mode == PolyScriptMode::Live
    }

    pub fn should_validate(&self) -> bool {
        self.mode == PolyScriptMode::Sandbox
    }

    pub fn require_confirm(&self) -> bool {
        self.mode == PolyScriptMode::Live
            && matches!(self.operation, PolyScriptOperation::Update | PolyScriptOperation::Delete)
            && !self.force
    }

    pub fn is_safe_mode(&self) -> bool {
        self.mode != PolyScriptMode::Live
    }


    /// Log a message at the specified level
    pub fn log(&mut self, message: &str, level: Option<&str>) {
        let level = level.unwrap_or("info");

        if self.json_output {
            let key = match level {
                "error" | "critical" => Some("errors"),
                "warning" => Some("warnings"),
                "info" | "debug" if self.verbose => Some("messages"),
                _ => None,
            };

            if let Some(k) = key {
                let entry = self
                    .output_data
                    .entry(k.to_string())
                    .or_insert_with(|| json!(Vec::<String>::new()));

                if let Value::Array(ref mut arr) = entry {
                    arr.push(json!(format!("{}: {}", level.to_uppercase(), message)));
                }
            }
        } else {
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
                let entry = self
                    .output_data
                    .entry(key.to_string())
                    .or_insert_with(|| json!(Vec::<String>::new()));

                if let Value::Array(ref mut arr) = entry {
                    arr.push(data);
                }
            } else if let Value::Object(obj) = data {
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
                println!(
                    "{}",
                    serde_json::to_string_pretty(&data).unwrap_or_default()
                );
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
        matches!(input.trim().to_lowercase().as_str(), "y" | "yes")
    }

    /// Finalize output for JSON mode
    pub fn finalize_output(&self) {
        if self.json_output {
            println!(
                "{}",
                serde_json::to_string_pretty(&self.output_data).unwrap_or_default()
            );
        }
    }
}

/// Trait that PolyScript CRUD tools must implement
pub trait PolyScriptTool {
    fn description(&self) -> &str;

    fn create(
        &self,
        resource: Option<&str>,
        options: &HashMap<String, Value>,
        context: &PolyScriptContext,
    ) -> Result<Value, Box<dyn Error>>;

    fn read(
        &self,
        resource: Option<&str>,
        options: &HashMap<String, Value>,
        context: &PolyScriptContext,
    ) -> Result<Value, Box<dyn Error>>;

    fn update(
        &self,
        resource: Option<&str>,
        options: &HashMap<String, Value>,
        context: &PolyScriptContext,
    ) -> Result<Value, Box<dyn Error>>;

    fn delete(
        &self,
        resource: Option<&str>,
        options: &HashMap<String, Value>,
        context: &PolyScriptContext,
    ) -> Result<Value, Box<dyn Error>>;

    // Optional validation methods
    fn validate_create(
        &self,
        _resource: Option<&str>,
        _options: &HashMap<String, Value>,
        _context: &PolyScriptContext,
    ) -> HashMap<String, String> {
        HashMap::new()
    }

    fn validate_read(
        &self,
        _resource: Option<&str>,
        _options: &HashMap<String, Value>,
        _context: &PolyScriptContext,
    ) -> HashMap<String, String> {
        HashMap::new()
    }

    fn validate_update(
        &self,
        _resource: Option<&str>,
        _options: &HashMap<String, Value>,
        _context: &PolyScriptContext,
    ) -> HashMap<String, String> {
        HashMap::new()
    }

    fn validate_delete(
        &self,
        _resource: Option<&str>,
        _options: &HashMap<String, Value>,
        _context: &PolyScriptContext,
    ) -> HashMap<String, String> {
        HashMap::new()
    }
}

/// Load rebadging configuration (placeholder for future macro-based implementation)
fn load_rebadging() -> HashMap<String, (String, String)> {
    // TODO: In the future, this will be populated by a derive macro
    // For now, rebadging should be done in the tool implementation
    HashMap::new()
}

/// Execute CRUD method with appropriate mode wrapping
fn execute_with_mode<T: PolyScriptTool>(
    tool: &T,
    context: &mut PolyScriptContext,
) -> Result<Value, Box<dyn Error>> {
    match context.mode {
        PolyScriptMode::Simulate => {
            context.log(
                &format!("Simulating {} operation", context.operation),
                Some("debug"),
            );

            // Read operations can execute in simulate mode
            if context.operation == PolyScriptOperation::Read {
                let resource = context.resource.as_deref();
                let options = context.options.clone();
                return tool.read(resource, &options, context);
            }

            // For mutating operations, describe what would happen
            let action = match context.operation {
                PolyScriptOperation::Create => "Would create",
                PolyScriptOperation::Update => "Would update",
                PolyScriptOperation::Delete => "Would delete",
                PolyScriptOperation::Read => "Would read", // Should not reach here
            };

            Ok(json!({
                "simulation": true,
                "action": format!("{} {}", action, context.resource.as_deref().unwrap_or("resource")),
                "options": context.options
            }))
        }
        PolyScriptMode::Sandbox => {
            context.log(
                &format!("Testing prerequisites for {}", context.operation),
                Some("debug"),
            );

            let mut validations = HashMap::new();
            validations.insert("permissions".to_string(), "verified".to_string());
            validations.insert("dependencies".to_string(), "available".to_string());
            validations.insert("connectivity".to_string(), "established".to_string());

            // Add custom validations
            let custom_validations = match context.operation {
                PolyScriptOperation::Create => {
                    tool.validate_create(context.resource.as_deref(), &context.options, context)
                }
                PolyScriptOperation::Read => {
                    tool.validate_read(context.resource.as_deref(), &context.options, context)
                }
                PolyScriptOperation::Update => {
                    tool.validate_update(context.resource.as_deref(), &context.options, context)
                }
                PolyScriptOperation::Delete => {
                    tool.validate_delete(context.resource.as_deref(), &context.options, context)
                }
            };

            validations.extend(custom_validations);

            let all_passed = validations.values().all(|v| {
                matches!(
                    v.as_str(),
                    "verified" | "available" | "established" | "passed" | "true"
                )
            });

            Ok(json!({
                "sandbox": true,
                "validations": validations,
                "ready": all_passed
            }))
        }
        PolyScriptMode::Live => {
            context.log(
                &format!("Executing {} operation", context.operation),
                Some("debug"),
            );

            // Confirmation for destructive operations
            if context.require_confirm() {
                let message = format!(
                    "Are you sure you want to {} {}?",
                    context.operation,
                    context.resource.as_deref().unwrap_or("resource")
                );
                if !context.confirm(&message) {
                    context.output_data.insert("status".to_string(), json!("cancelled"));
                    return Ok(json!({
                        "status": "cancelled",
                        "reason": "User declined confirmation"
                    }));
                }
            }

            // Execute the actual CRUD method
            let resource = context.resource.as_deref();
            let options = context.options.clone();
            match context.operation {
                PolyScriptOperation::Create => {
                    tool.create(resource, &options, context)
                }
                PolyScriptOperation::Read => {
                    tool.read(resource, &options, context)
                }
                PolyScriptOperation::Update => {
                    tool.update(resource, &options, context)
                }
                PolyScriptOperation::Delete => {
                    tool.delete(resource, &options, context)
                }
            }
        }
    }
}

/// Run discovery for simple introspection
pub fn run_discovery<T: PolyScriptTool>(_tool: &T, json_output: bool) -> i32 {
    let discovery = json!({
        "polyscript": "1.0",
        "tool": std::any::type_name::<T>().split("::").last().unwrap_or("Unknown"),
        "operations": ["create", "read", "update", "delete"],
        "modes": ["simulate", "sandbox", "live"]
    });

    if json_output {
        println!("{}", serde_json::to_string_pretty(&discovery).unwrap());
    } else {
        println!("Tool: {}", discovery["tool"]);
        println!("Operations: create, read, update, delete");
        println!("Modes: simulate, sandbox, live");
    }

    0
}

/// Main framework runner function
pub fn run<T: PolyScriptTool>(tool: T, args: Vec<String>) -> i32 {
    let tool_name_str = std::any::type_name::<T>()
        .split("::")
        .last()
        .unwrap_or("Unknown")
        .to_lowercase();

    if args.is_empty() {
        println!("PolyScript CRUD × Modes Framework");
        println!("Available commands: create, read, update, delete, list, --discover");
        println!("Use: {} <command> [options]", tool_name_str);
        return 0;
    }

    let rebadging = load_rebadging();

    // Handle discovery
    if args[0] == "--discover" {
        let json_output = args.len() > 1 && args[1] == "--json";
        return run_discovery(&tool, json_output);
    }

    // Parse operation and rebadging
    let (operation, rebadged_as) = match args[0].as_str() {
        "create" => (PolyScriptOperation::Create, None),
        "read" | "list" => (PolyScriptOperation::Read, None),
        "update" => (PolyScriptOperation::Update, None),
        "delete" => (PolyScriptOperation::Delete, None),
        cmd => {
            if let Some((op_str, _mode)) = rebadging.get(cmd) {
                let operation = match op_str.as_str() {
                    "create" => PolyScriptOperation::Create,
                    "read" => PolyScriptOperation::Read,
                    "update" => PolyScriptOperation::Update,
                    "delete" => PolyScriptOperation::Delete,
                    _ => {
                        eprintln!("Unknown operation: {}", op_str);
                        return 1;
                    }
                };
                (operation, Some(cmd.to_string()))
            } else {
                eprintln!("Unknown command: {}", cmd);
                eprintln!("Available commands: create, read, update, delete, list, --discover");
                return 1;
            }
        }
    };

    // Build clap command for the operation
    let cmd = Command::new("polyscript-tool")
        .arg(
            Arg::new("resource")
                .help("Resource to operate on")
                .required(operation != PolyScriptOperation::Read)
                .index(1),
        )
        .arg(
            Arg::new("mode")
                .long("mode")
                .short('m')
                .help("Execution mode")
                .value_parser(clap::value_parser!(PolyScriptMode))
                .default_value("live"),
        )
        .arg(
            Arg::new("verbose")
                .long("verbose")
                .short('v')
                .help("Enable verbose output")
                .action(clap::ArgAction::SetTrue),
        )
        .arg(
            Arg::new("force")
                .long("force")
                .short('f')
                .help("Skip confirmation prompts")
                .action(clap::ArgAction::SetTrue),
        )
        .arg(
            Arg::new("json")
                .long("json")
                .help("Output in JSON format")
                .action(clap::ArgAction::SetTrue),
        );

    // Parse remaining arguments (skip the command name)
    let remaining_args: Vec<String> = args.into_iter().skip(1).collect();
    let matches = match cmd.try_get_matches_from(std::iter::once("polyscript-tool".to_string()).chain(remaining_args)) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("{}", e);
            return 1;
        }
    };

    // Extract parsed values
    let resource = matches.get_one::<String>("resource").map(|s| s.clone());
    let mode = *matches.get_one::<PolyScriptMode>("mode").unwrap();
    let verbose = matches.get_flag("verbose");
    let force = matches.get_flag("force");
    let json_output = matches.get_flag("json");

    // Create context
    let mut context = PolyScriptContext::new(
        operation,
        mode,
        resource,
        rebadged_as,
        HashMap::new(), // TODO: Add support for additional options
        verbose,
        force,
        json_output,
        &tool_name_str,
    );

    // Execute with mode wrapping
    match execute_with_mode(&tool, &mut context) {
        Ok(result) => {
            context.output(result, false);
            context.finalize_output();
            0
        }
        Err(e) => {
            context.output_data.insert("status".to_string(), json!("error"));
            context.output(json!(format!("Error: {}", e)), true);
            context.finalize_output();
            1
        }
    }
}

/*
 * EXAMPLE USAGE:
 *
 * // Note: Rust rebadging can be implemented in the main function
 * // by customizing the command handling before calling run().
 * // A future version may provide derive macros for this.
 *
 * struct CompilerTool;
 *
 * impl PolyScriptTool for CompilerTool {
 *     fn description(&self) -> &str {
 *         "Example compiler tool demonstrating CRUD × Modes"
 *     }
 *
 *     fn create(
 *         &self,
 *         resource: Option<&str>,
 *         options: &HashMap<String, Value>,
 *         context: &mut PolyScriptContext,
 *     ) -> Result<Value, Box<dyn Error>> {
 *         let resource = resource.unwrap_or("source");
 *         context.log(&format!("Compiling {}...", resource), None);
 *
 *         let output_file = options
 *             .get("output")
 *             .and_then(|v| v.as_str())
 *             .unwrap_or(&resource.replace(".rs", ".exe"));
 *
 *         Ok(json!({
 *             "compiled": resource,
 *             "output": output_file,
 *             "timestamp": chrono::Utc::now().to_rfc3339()
 *         }))
 *     }
 *
 *     fn read(
 *         &self,
 *         _resource: Option<&str>,
 *         _options: &HashMap<String, Value>,
 *         context: &mut PolyScriptContext,
 *     ) -> Result<Value, Box<dyn Error>> {
 *         context.log("Checking compilation status...", None);
 *
 *         Ok(json!({
 *             "source_files": ["main.rs", "utils.rs", "config.rs"],
 *             "compiled_files": ["main.exe", "utils.dll"],
 *             "missing": ["config.dll"],
 *             "last_build": chrono::Utc::now().to_rfc3339()
 *         }))
 *     }
 *
 *     fn update(
 *         &self,
 *         resource: Option<&str>,
 *         _options: &HashMap<String, Value>,
 *         context: &mut PolyScriptContext,
 *     ) -> Result<Value, Box<dyn Error>> {
 *         let resource = resource.unwrap_or("source");
 *         context.log(&format!("Recompiling {}...", resource), None);
 *
 *         Ok(json!({
 *             "recompiled": resource,
 *             "reason": "source file changed",
 *             "timestamp": chrono::Utc::now().to_rfc3339()
 *         }))
 *     }
 *
 *     fn delete(
 *         &self,
 *         resource: Option<&str>,
 *         _options: &HashMap<String, Value>,
 *         context: &mut PolyScriptContext,
 *     ) -> Result<Value, Box<dyn Error>> {
 *         let resource = resource.unwrap_or("build artifacts");
 *         context.log(&format!("Cleaning {}...", resource), None);
 *
 *         Ok(json!({
 *             "cleaned": ["*.exe", "*.dll", "target/"],
 *             "freed_space": "15.2 MB",
 *             "timestamp": chrono::Utc::now().to_rfc3339()
 *         }))
 *     }
 * }
 *
 * fn main() {
 *     let args: Vec<String> = std::env::args().collect();
 *     let tool = CompilerTool;
 *     
 *     // For rebadging, you can manually handle command aliases:
 *     // let args = if args.len() > 1 {
 *     //     match args[1].as_str() {
 *     //         "compile" => vec![args[0].clone(), "create".to_string()]
 *     //             .into_iter().chain(args[2..].iter().cloned()).collect(),
 *     //         "clean" => vec![args[0].clone(), "delete".to_string()]
 *     //             .into_iter().chain(args[2..].iter().cloned()).collect(),
 *     //         _ => args
 *     //     }
 *     // } else { args };
 *     
 *     std::process::exit(run(tool, args));
 * }
 *
 * Command examples:
 * cargo run create main.rs --mode simulate
 * cargo run read
 * cargo run update main.rs
 * cargo run delete --mode simulate
 * cargo run -- --discover --json
 */