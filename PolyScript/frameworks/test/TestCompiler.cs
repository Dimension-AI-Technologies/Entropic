/*
 * Test C# Compiler Tool for PolyScript Framework
 * CRUD × Modes Architecture: Zero-boilerplate CLI development
 * 
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

using System;
using System.Collections.Generic;
using PolyScript.Framework;
using Spectre.Console;

namespace PolyScript.Test
{
    [PolyScriptTool]
    [Rebadge("compile", "create+live")]
    [Rebadge("dry-compile", "create+simulate")]
    [Rebadge("status", "read+live")]
    [Rebadge("clean", "delete+live")]
    public class TestCompilerTool : IPolyScriptTool
    {
        public string Description => "Test C# compiler tool demonstrating CRUD × Modes";

        public object Create(string resource, Dictionary<string, object> options, PolyScriptContext context)
        {
            context.Log($"Compiling {resource}...");

            var outputFile = options.GetValueOrDefault("output", resource?.Replace(".cs", ".exe")) ?? "output.exe";
            var optimize = options.GetValueOrDefault("optimize", false);

            return new
            {
                compiled = resource,
                output = outputFile,
                optimized = optimize,
                timestamp = DateTime.Now.ToString("O")
            };
        }

        public object Read(string resource, Dictionary<string, object> options, PolyScriptContext context)
        {
            context.Log("Checking compilation status...");

            var sourceFiles = string.IsNullOrEmpty(resource) 
                ? new[] { "Program.cs", "Utils.cs", "Config.cs" }
                : new[] { resource };

            return new
            {
                source_files = sourceFiles,
                compiled_files = new[] { "Program.exe", "Utils.dll" },
                missing = new[] { "Config.dll" },
                last_build = DateTime.Now.ToString("O")
            };
        }

        public object Update(string resource, Dictionary<string, object> options, PolyScriptContext context)
        {
            context.Log($"Recompiling {resource}...");

            var incremental = options.GetValueOrDefault("incremental", false);

            return new
            {
                recompiled = resource,
                reason = "source file changed",
                incremental = incremental,
                timestamp = DateTime.Now.ToString("O")
            };
        }

        public object Delete(string resource, Dictionary<string, object> options, PolyScriptContext context)
        {
            context.Log($"Cleaning {resource ?? "build artifacts"}...");

            return new
            {
                cleaned = new[] { "*.exe", "*.dll", "*.pdb", "bin/", "obj/" },
                freed_space = "15.7 MB",
                timestamp = DateTime.Now.ToString("O")
            };
        }

        // Optional validation method for sandbox mode
        public Dictionary<string, string> ValidateCreate(string resource, Dictionary<string, object> options, PolyScriptContext context)
        {
            return new Dictionary<string, string>
            {
                ["compiler_available"] = "verified",
                ["source_exists"] = !string.IsNullOrEmpty(resource) ? "verified" : "failed",
                ["disk_space"] = "sufficient"
            };
        }
    }

    public class Program
    {
        public static int Main(string[] args)
        {
            return PolyScriptFramework.Run<TestCompilerTool>(args);
        }
    }
}