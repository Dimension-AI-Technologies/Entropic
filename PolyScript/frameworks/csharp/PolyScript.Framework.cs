/*
 * PolyScript Framework for C# using Spectre.Console
 * 
 * A true zero-boilerplate framework for creating PolyScript-compliant CLI tools.
 * Developers write ONLY business logic - the framework handles everything else.
 * 
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;
using Spectre.Console;
using Spectre.Console.Cli;

namespace PolyScript.Framework
{
    /// <summary>
    /// PolyScript execution modes
    /// </summary>
    public enum PolyScriptMode
    {
        Status,
        Test,
        Sandbox,
        Live
    }

    /// <summary>
    /// PolyScript context passed to tool methods
    /// </summary>
    public class PolyScriptContext
    {
        public PolyScriptMode Mode { get; set; }
        public bool Verbose { get; set; }
        public bool Force { get; set; }
        public bool JsonOutput { get; set; }
        public Dictionary<string, object> OutputData { get; set; }
        public IAnsiConsole Console { get; set; }

        public PolyScriptContext()
        {
            OutputData = new Dictionary<string, object>
            {
                ["polyscript"] = "1.0",
                ["status"] = "success",
                ["data"] = new Dictionary<string, object>()
            };
            Console = AnsiConsole.Console;
        }

        public void Log(string message, string level = "info")
        {
            if (JsonOutput)
            {
                // Route to JSON data structure
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
                // Direct console output
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
                    // Merge object properties into data section
                    var dataDict = (Dictionary<string, object>)OutputData["data"];
                    var properties = JsonSerializer.Deserialize<Dictionary<string, object>>(
                        JsonSerializer.Serialize(data));
                    
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
            if (JsonOutput)
            {
                var json = JsonSerializer.Serialize(OutputData, new JsonSerializerOptions { WriteIndented = true });
                Console.WriteLine(json);
            }
        }
    }

    /// <summary>
    /// Interface that PolyScript tools must implement
    /// </summary>
    public interface IPolyScriptTool
    {
        string Description { get; }
        object Status(PolyScriptContext context);
        object Test(PolyScriptContext context);
        object Sandbox(PolyScriptContext context);
        object Live(PolyScriptContext context);
    }

    /// <summary>
    /// Attribute to mark a class as a PolyScript tool
    /// </summary>
    [AttributeUsage(AttributeTargets.Class)]
    public class PolyScriptToolAttribute : Attribute
    {
    }

    /// <summary>
    /// Base settings for PolyScript commands
    /// </summary>
    public class PolyScriptSettings : CommandSettings
    {
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
    /// Generic PolyScript command that routes to tool methods
    /// </summary>
    public class PolyScriptCommand<TTool> : Command<PolyScriptSettings>
        where TTool : IPolyScriptTool, new()
    {
        private readonly PolyScriptMode _mode;

        public PolyScriptCommand(PolyScriptMode mode)
        {
            _mode = mode;
        }

        public override int Execute(CommandContext context, PolyScriptSettings settings)
        {
            var tool = new TTool();
            var psContext = new PolyScriptContext
            {
                Mode = _mode,
                Verbose = settings.Verbose,
                Force = settings.Force,
                JsonOutput = settings.JsonOutput
            };

            psContext.OutputData["mode"] = _mode.ToString().ToLower();
            psContext.OutputData["tool"] = typeof(TTool).Name;

            try
            {
                psContext.Log($"Executing {_mode} mode", "debug");

                object result = _mode switch
                {
                    PolyScriptMode.Status => tool.Status(psContext),
                    PolyScriptMode.Test => tool.Test(psContext),
                    PolyScriptMode.Sandbox => tool.Sandbox(psContext),
                    PolyScriptMode.Live => tool.Live(psContext),
                    _ => throw new InvalidOperationException($"Unknown mode: {_mode}")
                };

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
    }

    /// <summary>
    /// Main PolyScript framework class
    /// </summary>
    public static class PolyScriptFramework
    {
        /// <summary>
        /// Run a PolyScript tool with command-line arguments
        /// </summary>
        public static int Run<TTool>(string[] args) where TTool : IPolyScriptTool, new()
        {
            // Verify the tool has the PolyScript attribute
            if (!typeof(TTool).HasCustomAttribute<PolyScriptToolAttribute>())
                throw new InvalidOperationException($"{typeof(TTool).Name} must have [PolyScriptTool] attribute");

            var app = new CommandApp();
            var tool = new TTool();

            app.Configure(config =>
            {
                config.SetApplicationName(typeof(TTool).Name.ToLower());
                config.SetApplicationVersion("1.0.0");
                
                // Set description from tool
                if (!string.IsNullOrEmpty(tool.Description))
                    config.SetDescription(tool.Description);

                // Add the four PolyScript mode commands
                config.AddCommand<PolyScriptCommand<TTool>>("status")
                    .WithDescription("Show current state");

                config.AddCommand<PolyScriptCommand<TTool>>("test")
                    .WithDescription("Simulate operations (dry-run)");

                config.AddCommand<PolyScriptCommand<TTool>>("sandbox")
                    .WithDescription("Test dependencies and environment");

                config.AddCommand<PolyScriptCommand<TTool>>("live")
                    .WithDescription("Execute actual operations");

                // Set default command to status
                config.SetDefaultCommand<PolyScriptCommand<TTool>>();
            });

            return app.Run(args);
        }
    }

    /// <summary>
    /// Extension methods for reflection
    /// </summary>
    public static class TypeExtensions
    {
        public static bool HasCustomAttribute<T>(this Type type) where T : Attribute
        {
            return type.GetCustomAttribute<T>() != null;
        }
    }
}

/*
 * EXAMPLE USAGE:
 * 
 * [PolyScriptTool]
 * public class BackupTool : IPolyScriptTool
 * {
 *     public string Description => "PolyScript-compliant backup tool with zero boilerplate";
 *     
 *     public object Status(PolyScriptContext context)
 *     {
 *         context.Log("Checking backup status...");
 *         return new
 *         {
 *             operational = true,
 *             last_backup = DateTime.Now.AddDays(-1),
 *             files_ready = 1234
 *         };
 *     }
 *     
 *     public object Test(PolyScriptContext context)
 *     {
 *         context.Log("Planning backup operations...");
 *         return new
 *         {
 *             planned_operations = new[]
 *             {
 *                 new { operation = "backup", source = "/src", dest = "/dest" }
 *             },
 *             note = "No changes made in test mode"
 *         };
 *     }
 *     
 *     public object Sandbox(PolyScriptContext context)
 *     {
 *         context.Log("Testing environment...");
 *         var tests = new Dictionary<string, string>
 *         {
 *             ["filesystem"] = "accessible",
 *             ["permissions"] = "sufficient",
 *             ["diskspace"] = "available"
 *         };
 *         
 *         return new
 *         {
 *             dependency_tests = tests,
 *             all_passed = true
 *         };
 *     }
 *     
 *     public object Live(PolyScriptContext context)
 *     {
 *         context.Log("Starting backup operations...");
 *         
 *         if (!context.Confirm("Execute backup operations?"))
 *             return new { status = "cancelled" };
 *         
 *         // Actual backup logic here
 *         context.Log("Backup completed successfully");
 *         
 *         return new
 *         {
 *             operation = "backup_completed",
 *             files_copied = 1234,
 *             bytes_copied = 567890
 *         };
 *     }
 * }
 * 
 * // Program.cs
 * public class Program
 * {
 *     public static int Main(string[] args)
 *     {
 *         return PolyScriptFramework.Run<BackupTool>(args);
 *     }
 * }
 * 
 * Command examples:
 * dotnet run status
 * dotnet run test --verbose
 * dotnet run sandbox --json
 * dotnet run live --force
 */