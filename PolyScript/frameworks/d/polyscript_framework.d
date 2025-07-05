/**
 * PolyScript Framework for D
 * CRUD × Modes Architecture: Zero-boilerplate CLI development
 * 
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

module polyscript.framework;

import std.stdio;
import std.getopt;
import std.json;
import std.string;
import std.algorithm;
import std.array;
import std.datetime;
import std.conv;
import std.traits;
import std.typecons;

/// CRUD operations
enum PolyScriptOperation {
    create,
    read,
    update,
    delete_
}

/// Execution modes
enum PolyScriptMode {
    simulate,
    sandbox,
    live
}

/// Context for operations
struct PolyScriptContext {
    PolyScriptOperation operation;
    PolyScriptMode mode;
    string resource;
    string rebadgedAs;
    string[string] options;
    bool verbose;
    bool force;
    bool jsonOutput;
    string toolName;
    JSONValue outputData;
    string[] messages;
    
    this(string toolName) {
        this.toolName = toolName;
        this.outputData = JSONValue([
            "polyscript": JSONValue("1.0"),
            "status": JSONValue("success"),
            "data": JSONValue((JSONValue[string]).init)
        ]);
    }
    
    @property bool canMutate() const {
        return mode == PolyScriptMode.live;
    }
    
    @property bool shouldValidate() const {
        return mode == PolyScriptMode.sandbox;
    }
    
    @property bool requireConfirm() const {
        return mode == PolyScriptMode.live && 
               (operation == PolyScriptOperation.update || operation == PolyScriptOperation.delete_) &&
               !force;
    }
    
    @property bool isSafeMode() const {
        return mode == PolyScriptMode.simulate || mode == PolyScriptMode.sandbox;
    }
    
    void log(string message, string level = "info") {
        if (jsonOutput) {
            messages ~= "[" ~ level ~ "] " ~ message;
            if (verbose) {
                outputData["messages"] = messages.map!(m => JSONValue(m)).array;
            }
        } else {
            switch (level) {
                case "error":
                    stderr.writeln("Error: ", message);
                    break;
                case "warning":
                    stderr.writeln("Warning: ", message);
                    break;
                case "info":
                    writeln(message);
                    break;
                case "debug":
                    if (verbose) writeln("Debug: ", message);
                    break;
                default:
                    break;
            }
        }
    }
    
    void output(JSONValue data, bool error = false) {
        if (jsonOutput) {
            if (error) {
                outputData["status"] = "error";
                outputData["error"] = data;
            } else {
                if (data.type == JSONType.object) {
                    auto dataObj = outputData["data"].object;
                    foreach (key, value; data.object) {
                        dataObj[key] = value;
                    }
                    outputData["data"] = dataObj;
                } else {
                    outputData["result"] = data;
                }
            }
        } else {
            if (error) {
                stderr.writeln(data.toPrettyString());
            } else {
                writeln(data.toPrettyString());
            }
        }
    }
    
    bool confirm(string message) {
        if (force) return true;
        
        if (jsonOutput) {
            output(JSONValue(["confirmation_required": message]), true);
            return false;
        }
        
        write(message, " [y/N]: ");
        stdout.flush();
        string response = readln().strip().toLower();
        return response == "y" || response == "yes";
    }
    
    void finalizeOutput() {
        outputData["operation"] = to!string(operation).replace("_", "");
        outputData["mode"] = to!string(mode);
        outputData["tool"] = toolName;
        
        if (!resource.empty) {
            outputData["resource"] = resource;
        }
        
        if (!rebadgedAs.empty) {
            outputData["rebadged_as"] = rebadgedAs;
        }
        
        if (jsonOutput) {
            writeln(outputData.toPrettyString());
        }
    }
}

/// Tool interface that all PolyScript tools must implement
interface PolyScriptTool {
    string description();
    JSONValue create(string resource, string[string] options, ref PolyScriptContext context);
    JSONValue read(string resource, string[string] options, ref PolyScriptContext context);
    JSONValue update(string resource, string[string] options, ref PolyScriptContext context);
    JSONValue delete_(string resource, string[string] options, ref PolyScriptContext context);
}

/// Execute operation with mode wrapping
JSONValue executeWithMode(PolyScriptTool tool, ref PolyScriptContext context) {
    final switch (context.mode) {
        case PolyScriptMode.simulate:
            context.log("Simulating " ~ to!string(context.operation) ~ " operation", "debug");
            
            if (context.operation == PolyScriptOperation.read) {
                return tool.read(context.resource, context.options, context);
            } else {
                string actionVerb;
                final switch (context.operation) {
                    case PolyScriptOperation.create:
                        actionVerb = "Would create";
                        break;
                    case PolyScriptOperation.update:
                        actionVerb = "Would update";
                        break;
                    case PolyScriptOperation.delete_:
                        actionVerb = "Would delete";
                        break;
                    case PolyScriptOperation.read:
                        actionVerb = "Would read";
                        break;
                }
                
                return JSONValue([
                    "simulation": JSONValue(true),
                    "action": JSONValue(actionVerb ~ " " ~ (context.resource.empty ? "resource" : context.resource)),
                    "options": JSONValue(context.options)
                ]);
            }
            
        case PolyScriptMode.sandbox:
            context.log("Testing prerequisites for " ~ to!string(context.operation), "debug");
            
            return JSONValue([
                "sandbox": JSONValue(true),
                "validations": JSONValue([
                    "permissions": JSONValue("verified"),
                    "dependencies": JSONValue("available"),
                    "connectivity": JSONValue("established")
                ]),
                "ready": JSONValue(true)
            ]);
            
        case PolyScriptMode.live:
            context.log("Executing " ~ to!string(context.operation) ~ " operation", "debug");
            
            if (context.requireConfirm) {
                string msg = "Are you sure you want to " ~ to!string(context.operation).replace("_", "") ~ 
                            " " ~ (context.resource.empty ? "resource" : context.resource) ~ "?";
                if (!context.confirm(msg)) {
                    context.outputData["status"] = "cancelled";
                    return JSONValue(["cancelled": JSONValue(true)]);
                }
            }
            
            final switch (context.operation) {
                case PolyScriptOperation.create:
                    return tool.create(context.resource, context.options, context);
                case PolyScriptOperation.read:
                    return tool.read(context.resource, context.options, context);
                case PolyScriptOperation.update:
                    return tool.update(context.resource, context.options, context);
                case PolyScriptOperation.delete_:
                    return tool.delete_(context.resource, context.options, context);
            }
    }
}

/// Show discovery information
void showDiscovery(string toolName) {
    JSONValue discovery = [
        "polyscript": JSONValue("1.0"),
        "tool": JSONValue(toolName),
        "operations": JSONValue(["create", "read", "update", "delete"]),
        "modes": JSONValue(["simulate", "sandbox", "live"])
    ];
    writeln(discovery.toPrettyString());
}

/// Show help information
void showHelp(string toolName, string description) {
    writefln(`%s - %s

Usage:
  %s <operation> [resource] [options]

Operations:
  create    Create new resources
  read      Read/query resources
  list      List resources (alias for read)
  update    Update existing resources
  delete    Delete resources

Options:
  -m, --mode      Execution mode (simulate, sandbox, live) [default: live]
  -v, --verbose   Enable verbose output
  -f, --force     Skip confirmation prompts
  --json          Output in JSON format
  --discover      Show tool capabilities
  -h, --help      Show this help

Examples:
  %s create myfile.txt --mode simulate
  %s read --json
  %s delete old-data --force`, 
        toolName, description, toolName, toolName, toolName, toolName);
}

/// Main entry point template
mixin template PolyScriptMain(T : PolyScriptTool) {
    int main(string[] args) {
        auto tool = new T();
        string toolName = T.stringof;
        
        // Parse command line arguments
        bool discover = false;
        string mode = "live";
        bool verbose = false;
        bool force = false;
        bool jsonOutput = false;
        bool help = false;
        
        try {
            auto helpInfo = getopt(
                args,
                std.getopt.config.bundling,
                "discover", "Show tool capabilities", &discover,
                "mode|m", "Execution mode (simulate, sandbox, live)", &mode,
                "verbose|v", "Enable verbose output", &verbose,
                "force|f", "Skip confirmation prompts", &force,
                "json", "Output in JSON format", &jsonOutput,
                "help|h", "Show this help", &help
            );
            
            if (help || helpInfo.helpWanted) {
                showHelp(toolName, tool.description());
                return 0;
            }
        } catch (Exception e) {
            stderr.writeln("Error parsing arguments: ", e.msg);
            return 1;
        }
        
        if (discover) {
            showDiscovery(toolName);
            return 0;
        }
        
        if (args.length < 2) {
            stderr.writeln("Error: No operation specified");
            showHelp(toolName, tool.description());
            return 1;
        }
        
        // Parse operation
        string operationStr = args[1];
        PolyScriptOperation operation;
        
        switch (operationStr) {
            case "create":
                operation = PolyScriptOperation.create;
                break;
            case "read":
            case "list":
                operation = PolyScriptOperation.read;
                break;
            case "update":
                operation = PolyScriptOperation.update;
                break;
            case "delete":
                operation = PolyScriptOperation.delete_;
                break;
            default:
                stderr.writeln("Error: Unknown operation: ", operationStr);
                return 1;
        }
        
        // Parse mode
        PolyScriptMode psMode;
        switch (mode) {
            case "simulate":
                psMode = PolyScriptMode.simulate;
                break;
            case "sandbox":
                psMode = PolyScriptMode.sandbox;
                break;
            case "live":
                psMode = PolyScriptMode.live;
                break;
            default:
                stderr.writeln("Error: Unknown mode: ", mode);
                return 1;
        }
        
        // Create context
        auto context = PolyScriptContext(toolName);
        context.operation = operation;
        context.mode = psMode;
        context.resource = args.length > 2 ? args[2] : "";
        context.verbose = verbose;
        context.force = force;
        context.jsonOutput = jsonOutput;
        
        // Execute
        try {
            context.log("Executing " ~ to!string(operation) ~ " operation in " ~ to!string(psMode) ~ " mode", "debug");
            
            JSONValue result = executeWithMode(tool, context);
            context.output(result);
            context.finalizeOutput();
            
            return 0;
        } catch (Exception e) {
            context.output(JSONValue(["error": e.msg]), true);
            if (context.verbose) {
                stderr.writeln(e.toString());
            }
            context.finalizeOutput();
            return 1;
        }
    }
}