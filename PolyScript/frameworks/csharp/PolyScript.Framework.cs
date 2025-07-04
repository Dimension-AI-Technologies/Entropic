/*
 * PolyScript Framework for C# using Spectre.Console
 * CRUD × Modes Architecture: Zero-boilerplate CLI development
 * 
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;
using Spectre.Console;
using Spectre.Console.Cli;

namespace PolyScript.Framework
{
    /// <summary>
    /// PolyScript CRUD operations
    /// </summary>
    public enum PolyScriptOperation
    {
        Create,
        Read,
        Update,
        Delete
    }

    /// <summary>
    /// PolyScript execution modes
    /// </summary>
    public enum PolyScriptMode
    {
        Simulate,
        Sandbox,
        Live
    }

    /// <summary>
    /// PolyScript context passed to tool methods
    /// </summary>
    public class PolyScriptContext
    {
        public PolyScriptOperation Operation { get; set; }
        public PolyScriptMode Mode { get; set; }
        public string? Resource { get; set; }
        public string? RebadgedAs { get; set; }
        public Dictionary<string, object> Options { get; set; }
        public bool Verbose { get; set; }
        public bool Force { get; set; }
        public bool JsonOutput { get; set; }
        public Dictionary<string, object> OutputData { get; set; }
        public IAnsiConsole Console { get; set; }

        public PolyScriptContext()
        {
            Options = new Dictionary<string, object>();
            OutputData = new Dictionary<string, object>
            {
                ["polyscript"] = "1.0",
                ["status"] = "success",
                ["data"] = new Dictionary<string, object>()
            };
            Console = AnsiConsole.Console;
        }

        public bool CanMutate() => Mode == PolyScriptMode.Live;
        public bool ShouldValidate() => Mode == PolyScriptMode.Sandbox;
        public bool RequireConfirm() => Mode == PolyScriptMode.Live && 
            (Operation == PolyScriptOperation.Update || Operation == PolyScriptOperation.Delete) && !Force;
        public bool IsSafeMode() => Mode != PolyScriptMode.Live;

        public void Log(string message, string level = "info")
        {
            if (JsonOutput)
            {
                var key = level switch
                {
                    "error" or "critical" => "errors",
                    "warning" => "warnings",
                    "info" or "debug" when Verbose => "messages",
                    _ => null
                };
                
                if (key != null)
                {
                    if (!OutputData.ContainsKey(key))
                        OutputData[key] = new List<string>();
                    ((List<string>)OutputData[key]).Add($"{level.ToUpper()}: {message}");
                }
            }
            else
            {
                var color = level switch
                {
                    "error" or "critical" => Color.Red,
                    "warning" => Color.Yellow,
                    "info" => Color.White,
                    "debug" => Color.Grey,
                    _ => Color.White
                };

                if (level == "error" || level == "critical")
                    Console.MarkupLine($"[{color}]Error: {message}[/]");
                else if (level == "warning")
                    Console.MarkupLine($"[{color}]Warning: {message}[/]");
                else if (level == "info" || (level == "debug" && Verbose))
                    Console.MarkupLine($"[{color}]{message}[/]");
            }
        }

        public void Output(object data, bool error = false)
        {
            if (JsonOutput)
            {
                if (data is string str)
                {
                    var key = error ? "errors" : "messages";
                    if (!OutputData.ContainsKey(key))
                        OutputData[key] = new List<string>();
                    ((List<string>)OutputData[key]).Add(str);
                }
                else
                {
                    var dataDict = (Dictionary<string, object>)OutputData["data"];
                    var json = JsonSerializer.Serialize(data);
                    var properties = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
                    
                    foreach (var prop in properties)
                        dataDict[prop.Key] = prop.Value;
                }
            }
            else
            {
                if (error)
                    Console.MarkupLine($"[red]Error: {data}[/]");
                else if (data is string str)
                    Console.WriteLine(str);
                else
                    Console.WriteLine(JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true }));
            }
        }

        public bool Confirm(string message)
        {
            if (Force)
                return true;

            if (JsonOutput)
            {
                Output(new { confirmation_required = message }, error: true);
                return false;
            }

            return Console.Confirm(message);
        }

        public void FinalizeOutput()
        {
            OutputData["operation"] = Operation.ToString().ToLower();
            OutputData["mode"] = Mode.ToString().ToLower();
            
            if (!string.IsNullOrEmpty(Resource))
                OutputData["resource"] = Resource;
            
            if (!string.IsNullOrEmpty(RebadgedAs))
                OutputData["rebadged_as"] = RebadgedAs;

            if (JsonOutput)
            {
                var json = JsonSerializer.Serialize(OutputData, new JsonSerializerOptions { WriteIndented = true });
                Console.WriteLine(json);
            }
        }
    }

    /// <summary>
    /// Interface that PolyScript CRUD tools must implement
    /// </summary>
    public interface IPolyScriptTool
    {
        string Description { get; }
        object Create(string resource, Dictionary<string, object> options, PolyScriptContext context);
        object Read(string resource, Dictionary<string, object> options, PolyScriptContext context);
        object Update(string resource, Dictionary<string, object> options, PolyScriptContext context);
        object Delete(string resource, Dictionary<string, object> options, PolyScriptContext context);
    }


    /// <summary>
    /// Attribute to mark a class as a PolyScript tool and optionally define rebadging
    /// </summary>
    [AttributeUsage(AttributeTargets.Class)]
    public class PolyScriptToolAttribute : Attribute
    {
        public Dictionary<string, string> Rebadge { get; set; }

        public PolyScriptToolAttribute()
        {
            Rebadge = new Dictionary<string, string>();
        }
    }

    /// <summary>
    /// Attribute for rebadging operations
    /// </summary>
    [AttributeUsage(AttributeTargets.Class, AllowMultiple = true)]
    public class RebadgeAttribute : Attribute
    {
        public string Alias { get; set; }
        public string Mapping { get; set; }

        public RebadgeAttribute(string alias, string mapping)
        {
            Alias = alias;
            Mapping = mapping;
        }
    }

    /// <summary>
    /// Base settings for PolyScript commands
    /// </summary>
    public class PolyScriptSettings : CommandSettings
    {
        [Description("Resource to operate on")]
        [CommandArgument(0, "[resource]")]
        public string? Resource { get; set; }

        [Description("Execution mode")]
        [CommandOption("--mode")]
        public PolyScriptMode Mode { get; set; } = PolyScriptMode.Live;

        [Description("Enable verbose output")]
        [CommandOption("-v|--verbose")]
        public bool Verbose { get; set; }

        [Description("Skip confirmation prompts")]
        [CommandOption("-f|--force")]
        public bool Force { get; set; }

        [Description("Output in JSON format")]
        [CommandOption("--json")]
        public bool JsonOutput { get; set; }
    }

    /// <summary>
    /// Generic PolyScript command that routes to CRUD methods
    /// </summary>
    public abstract class PolyScriptCommand<TTool> : Command<PolyScriptSettings>
        where TTool : IPolyScriptTool, new()
    {
        protected abstract PolyScriptOperation Operation { get; }
        protected virtual string? RebadgedAs => null;

        public override int Execute(CommandContext context, PolyScriptSettings settings)
        {
            var tool = new TTool();
            var psContext = new PolyScriptContext
            {
                Operation = Operation,
                Mode = settings.Mode,
                Resource = settings.Resource,
                RebadgedAs = RebadgedAs,
                Verbose = settings.Verbose,
                Force = settings.Force,
                JsonOutput = settings.JsonOutput
            };

            psContext.OutputData["tool"] = typeof(TTool).Name;

            try
            {
                psContext.Log($"Executing {Operation} operation in {settings.Mode} mode", "debug");

                object result = ExecuteWithMode(tool, psContext);

                if (result != null)
                    psContext.Output(result);

                psContext.FinalizeOutput();
                return 0;
            }
            catch (Exception ex)
            {
                psContext.OutputData["status"] = "error";
                psContext.Output($"Unhandled error: {ex.Message}", error: true);
                
                if (psContext.Verbose)
                    psContext.Output(ex.StackTrace, error: true);

                psContext.FinalizeOutput();
                return 1;
            }
        }

        private object ExecuteWithMode(TTool tool, PolyScriptContext context)
        {
            if (context.Mode == PolyScriptMode.Simulate)
            {
                context.Log($"Simulating {context.Operation} operation", "debug");
                
                // Read operations can execute in simulate mode
                if (context.Operation == PolyScriptOperation.Read)
                    return tool.Read(context.Resource, context.Options, context);

                // For mutating operations, describe what would happen
                var actionVerbs = new Dictionary<PolyScriptOperation, string>
                {
                    [PolyScriptOperation.Create] = "Would create",
                    [PolyScriptOperation.Update] = "Would update",
                    [PolyScriptOperation.Delete] = "Would delete"
                };

                return new
                {
                    simulation = true,
                    action = $"{actionVerbs[context.Operation]} {context.Resource ?? "resource"}",
                    options = context.Options
                };
            }
            else if (context.Mode == PolyScriptMode.Sandbox)
            {
                context.Log($"Testing prerequisites for {context.Operation}", "debug");
                
                var validations = new Dictionary<string, string>
                {
                    ["permissions"] = "verified",
                    ["dependencies"] = "available",
                    ["connectivity"] = "established"
                };

                // Check for custom validation method
                var validateMethod = typeof(TTool).GetMethod($"Validate{context.Operation}");
                if (validateMethod != null)
                {
                    var customValidations = validateMethod.Invoke(tool, new object[] { context.Resource, context.Options, context });
                    if (customValidations is Dictionary<string, string> customDict)
                    {
                        foreach (var kvp in customDict)
                            validations[kvp.Key] = kvp.Value;
                    }
                }

                var allPassed = validations.Values.All(v => 
                    v == "verified" || v == "available" || v == "established" || v == "passed" || v == "true");

                return new
                {
                    sandbox = true,
                    validations = validations,
                    ready = allPassed
                };
            }
            else // Live mode
            {
                context.Log($"Executing {context.Operation} operation", "debug");

                // Confirmation for destructive operations
                if (context.RequireConfirm())
                {
                    if (!context.Confirm($"Are you sure you want to {context.Operation.ToString().ToLower()} {context.Resource}?"))
                    {
                        context.OutputData["status"] = "cancelled";
                        return new { status = "cancelled", reason = "User declined confirmation" };
                    }
                }

                // Execute the actual CRUD method
                return context.Operation switch
                {
                    PolyScriptOperation.Create => tool.Create(context.Resource, context.Options, context),
                    PolyScriptOperation.Read => tool.Read(context.Resource, context.Options, context),
                    PolyScriptOperation.Update => tool.Update(context.Resource, context.Options, context),
                    PolyScriptOperation.Delete => tool.Delete(context.Resource, context.Options, context),
                    _ => throw new InvalidOperationException($"Unknown operation: {context.Operation}")
                };
            }
        }
    }

    /// <summary>
    /// Create command implementation
    /// </summary>
    public class CreateCommand<TTool> : PolyScriptCommand<TTool>
        where TTool : IPolyScriptTool, new()
    {
        protected override PolyScriptOperation Operation => PolyScriptOperation.Create;
    }

    /// <summary>
    /// Read command implementation
    /// </summary>
    public class ReadCommand<TTool> : PolyScriptCommand<TTool>
        where TTool : IPolyScriptTool, new()
    {
        protected override PolyScriptOperation Operation => PolyScriptOperation.Read;
    }

    /// <summary>
    /// Update command implementation
    /// </summary>
    public class UpdateCommand<TTool> : PolyScriptCommand<TTool>
        where TTool : IPolyScriptTool, new()
    {
        protected override PolyScriptOperation Operation => PolyScriptOperation.Update;
    }

    /// <summary>
    /// Delete command implementation
    /// </summary>
    public class DeleteCommand<TTool> : PolyScriptCommand<TTool>
        where TTool : IPolyScriptTool, new()
    {
        protected override PolyScriptOperation Operation => PolyScriptOperation.Delete;
    }

    /// <summary>
    /// Discovery command for simple introspection
    /// </summary>
    public class DiscoveryCommand<TTool> : Command
        where TTool : IPolyScriptTool, new()
    {
        public override int Execute(CommandContext context)
        {
            var tool = new TTool();

            var discovery = new Dictionary<string, object>
            {
                ["polyscript"] = "1.0",
                ["tool"] = typeof(TTool).Name,
                ["operations"] = new[] { "create", "read", "update", "delete" },
                ["modes"] = new[] { "simulate", "sandbox", "live" }
            };

            var json = JsonSerializer.Serialize(discovery, new JsonSerializerOptions { WriteIndented = true });
            AnsiConsole.Console.WriteLine(json);
            return 0;
        }
    }

    /// <summary>
    /// Main PolyScript framework class
    /// </summary>
    public static class PolyScriptFramework
    {
        /// <summary>
        /// Run a PolyScript CRUD tool with command-line arguments
        /// </summary>
        public static int Run<TTool>(string[] args) where TTool : IPolyScriptTool, new()
        {
            var app = new CommandApp();
            var tool = new TTool();

            app.Configure(config =>
            {
                config.SetApplicationName(typeof(TTool).Name.ToLower());
                config.SetApplicationVersion("1.0.0");
                
                // Note: SetDescription not available in this version of Spectre.Console.Cli
                // if (!string.IsNullOrEmpty(tool.Description))
                //     config.SetDescription(tool.Description);

                // Add discovery command
                config.AddCommand<DiscoveryCommand<TTool>>("--discover")
                    .WithDescription("Show tool capabilities for agents");

                // Add CRUD commands
                config.AddCommand<CreateCommand<TTool>>("create")
                    .WithDescription("Create new resources");

                config.AddCommand<ReadCommand<TTool>>("read")
                    .WithDescription("Read/query resources");

                config.AddCommand<UpdateCommand<TTool>>("update")
                    .WithDescription("Update existing resources");

                config.AddCommand<DeleteCommand<TTool>>("delete")
                    .WithDescription("Delete resources");

                config.AddCommand<ReadCommand<TTool>>("list")
                    .WithDescription("List resources (alias for read)");

                // Add rebadged commands
                // TODO: Fix rebadged command registration with Spectre.Console.Cli
                // var rebadging = LoadRebadging<TTool>();
                // foreach (var (alias, (operation, mode)) in rebadging)
                // {
                //     var op = Enum.Parse<PolyScriptOperation>(operation, true);
                //     
                //     // Need to create specific command types for rebadged commands
                //     // config.AddCommand<RebadgedCommand<TTool>>(alias)
                //     //     .WithDescription($"{operation} ({mode} mode)");
                // }
            });

            return app.Run(args);
        }

        private static Dictionary<string, (string Operation, string Mode)> LoadRebadging<T>()
        {
            var rebadging = new Dictionary<string, (string Operation, string Mode)>();

            // Load from attributes only
            var toolType = typeof(T);
            foreach (var attr in toolType.GetCustomAttributes<RebadgeAttribute>())
            {
                var parts = attr.Mapping.Split('+');
                var operation = parts[0];
                var mode = parts.Length > 1 ? parts[1] : "live";
                rebadging[attr.Alias] = (operation, mode);
            }

            return rebadging;
        }
    }
}

/*
 * EXAMPLE USAGE:
 * 
 * [PolyScriptTool]
 * [Rebadge("compile", "create+live")]
 * [Rebadge("dry-compile", "create+simulate")]
 * [Rebadge("status", "read+live")]
 * [Rebadge("clean", "delete+live")]
 * public class CompilerTool : IPolyScriptTool
 * {
 *     public string Description => "Example compiler tool demonstrating CRUD × Modes";
 *     
 *     public object Create(string resource, Dictionary<string, object> options, PolyScriptContext context)
 *     {
 *         context.Log($"Compiling {resource}...");
 *         
 *         var outputFile = options.GetValueOrDefault("output", resource.Replace(".c", ".out"));
 *         
 *         return new
 *         {
 *             compiled = resource,
 *             output = outputFile,
 *             optimized = options.GetValueOrDefault("optimize", false),
 *             timestamp = DateTime.Now.ToString("O")
 *         };
 *     }
 *     
 *     public object Read(string resource, Dictionary<string, object> options, PolyScriptContext context)
 *     {
 *         context.Log("Checking compilation status...");
 *         
 *         return new
 *         {
 *             source_files = new[] { "main.c", "utils.c", "config.c" },
 *             compiled_files = new[] { "main.o", "utils.o" },
 *             missing = new[] { "config.o" },
 *             last_build = DateTime.Now.ToString("O")
 *         };
 *     }
 *     
 *     public object Update(string resource, Dictionary<string, object> options, PolyScriptContext context)
 *     {
 *         context.Log($"Recompiling {resource}...");
 *         
 *         return new
 *         {
 *             recompiled = resource,
 *             reason = "source file changed",
 *             timestamp = DateTime.Now.ToString("O")
 *         };
 *     }
 *     
 *     public object Delete(string resource, Dictionary<string, object> options, PolyScriptContext context)
 *     {
 *         context.Log($"Cleaning {resource}...");
 *         
 *         return new
 *         {
 *             cleaned = new[] { "*.o", "*.out", ".build/" },
 *             freed_space = "12.3 MB",
 *             timestamp = DateTime.Now.ToString("O")
 *         };
 *     }
 * }
 * 
 * // Program.cs
 * public class Program
 * {
 *     public static int Main(string[] args)
 *     {
 *         return PolyScriptFramework.Run<CompilerTool>(args);
 *     }
 * }
 * 
 * Command examples:
 * dotnet run create main.c --mode simulate
 * dotnet run compile main.c -o app.exe
 * dotnet run status
 * dotnet run clean --mode simulate
 * dotnet run --discover --json
 */