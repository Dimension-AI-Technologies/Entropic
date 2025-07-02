/*
 * Example: Backup Tool using PolyScript C# Framework
 * 
 * This demonstrates how the C# PolyScript framework eliminates boilerplate.
 * Compare this to manual CLI implementations.
 * 
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 */

using System;
using System.Collections.Generic;
using System.IO;
using PolyScript.Framework;

namespace PolyScript.Examples
{
    [PolyScriptTool]
    public class BackupTool : IPolyScriptTool
    {
        public string Description => 
            "PolyScript-compliant backup tool with zero boilerplate\n\n" +
            "Backs up directories with full PolyScript mode support.\n" +
            "Provides status checking, dry-run testing, dependency validation,\n" +
            "and live backup operations.";

        // Tool-specific properties (would be set via command arguments in a full implementation)
        public string SourcePath { get; set; } = "/source";
        public string DestPath { get; set; } = "/dest";
        public bool Overwrite { get; set; } = false;

        public object Status(PolyScriptContext context)
        {
            context.Log("Checking backup status...");

            var sourceInfo = GetDirectoryInfo(SourcePath);
            var destInfo = GetDirectoryInfo(DestPath);

            return new
            {
                source = new
                {
                    path = SourcePath,
                    exists = sourceInfo.exists,
                    size_bytes = sourceInfo.size,
                    file_count = sourceInfo.files
                },
                destination = new
                {
                    path = DestPath,
                    exists = destInfo.exists,
                    size_bytes = destInfo.size,
                    would_overwrite = destInfo.exists && !Overwrite
                },
                backup_needed = sourceInfo.exists && (!destInfo.exists || Overwrite)
            };
        }

        public object Test(PolyScriptContext context)
        {
            context.Log("Planning backup operations...");

            var sourceInfo = GetDirectoryInfo(SourcePath);
            var destInfo = GetDirectoryInfo(DestPath);

            if (!sourceInfo.exists)
            {
                context.Output("Source directory does not exist", error: true);
                return null;
            }

            var operations = new List<object>();

            if (destInfo.exists && !Overwrite)
            {
                operations.Add(new
                {
                    operation = "skip",
                    reason = "destination exists and overwrite not specified",
                    source = SourcePath,
                    destination = DestPath
                });
            }
            else
            {
                operations.Add(new
                {
                    operation = "backup",
                    source = SourcePath,
                    destination = DestPath,
                    file_count = sourceInfo.files,
                    size_bytes = sourceInfo.size,
                    would_overwrite = destInfo.exists
                });
            }

            return new
            {
                planned_operations = operations,
                total_files = sourceInfo.files,
                total_size = sourceInfo.size,
                note = "No changes made in test mode"
            };
        }

        public object Sandbox(PolyScriptContext context)
        {
            context.Log("Testing backup environment...");

            var tests = new Dictionary<string, string>
            {
                ["source_readable"] = TestSourceReadable(),
                ["destination_writable"] = TestDestinationWritable(),
                ["sufficient_space"] = TestSufficientSpace(),
                ["filesystem_access"] = TestFilesystemAccess()
            };

            var allPassed = true;
            foreach (var test in tests.Values)
            {
                if (test != "passed")
                {
                    allPassed = false;
                    break;
                }
            }

            return new
            {
                dependency_tests = tests,
                all_passed = allPassed
            };
        }

        public object Live(PolyScriptContext context)
        {
            context.Log("Preparing backup execution...");

            var sourceInfo = GetDirectoryInfo(SourcePath);
            if (!sourceInfo.exists)
            {
                context.Output("Source directory does not exist", error: true);
                return null;
            }

            var destInfo = GetDirectoryInfo(DestPath);
            if (destInfo.exists && !Overwrite)
            {
                if (!context.Confirm($"Destination {DestPath} exists. Overwrite?"))
                {
                    return new { status = "cancelled" };
                }
            }

            try
            {
                context.Log($"Starting backup from {SourcePath} to {DestPath}");
                
                // Simulate backup operation
                // In real implementation: Directory.Delete(DestPath); Directory.Copy(SourcePath, DestPath);
                System.Threading.Thread.Sleep(1000); // Simulate work
                
                var resultInfo = GetDirectoryInfo(DestPath);
                
                return new
                {
                    operation = "backup_completed",
                    source = SourcePath,
                    destination = DestPath,
                    files_copied = resultInfo.files,
                    bytes_copied = resultInfo.size
                };
            }
            catch (Exception ex)
            {
                context.Output($"Backup failed: {ex.Message}", error: true);
                return null;
            }
        }

        // Helper methods - pure business logic
        private (bool exists, long size, int files) GetDirectoryInfo(string path)
        {
            try
            {
                if (!Directory.Exists(path))
                    return (false, 0, 0);

                var files = Directory.GetFiles(path, "*", SearchOption.AllDirectories);
                var size = 0L;
                
                foreach (var file in files)
                {
                    try
                    {
                        size += new FileInfo(file).Length;
                    }
                    catch
                    {
                        // Skip files we can't access
                    }
                }

                return (true, size, files.Length);
            }
            catch
            {
                return (false, 0, 0);
            }
        }

        private string TestSourceReadable()
        {
            try
            {
                return Directory.Exists(SourcePath) && 
                       Directory.GetAccessControl(SourcePath).AreAccessRulesCanonical 
                       ? "passed" : "failed";
            }
            catch
            {
                return "error";
            }
        }

        private string TestDestinationWritable()
        {
            try
            {
                var parentDir = Path.GetDirectoryName(DestPath);
                return Directory.Exists(parentDir) ? "passed" : "failed";
            }
            catch
            {
                return "error";
            }
        }

        private string TestSufficientSpace()
        {
            try
            {
                var sourceInfo = GetDirectoryInfo(SourcePath);
                if (!sourceInfo.exists) return "unknown";

                var destDir = Path.GetDirectoryName(DestPath);
                var drive = new DriveInfo(Path.GetPathRoot(destDir));
                
                return drive.AvailableFreeSpace > sourceInfo.size * 1.1 ? "passed" : "failed";
            }
            catch
            {
                return "error";
            }
        }

        private string TestFilesystemAccess()
        {
            try
            {
                var tempFile = Path.GetTempFileName();
                File.Delete(tempFile);
                return "passed";
            }
            catch
            {
                return "failed";
            }
        }
    }

    // Program entry point
    public class Program
    {
        public static int Main(string[] args)
        {
            return PolyScriptFramework.Run<BackupTool>(args);
        }
    }
}

/*
 * PROJECT FILE (BackupTool.csproj):
 * 
 * <Project Sdk="Microsoft.NET.Sdk">
 *   <PropertyGroup>
 *     <OutputType>Exe</OutputType>
 *     <TargetFramework>net6.0</TargetFramework>
 *     <Nullable>enable</Nullable>
 *   </PropertyGroup>
 *   <ItemGroup>
 *     <PackageReference Include="Spectre.Console" Version="0.47.0" />
 *   </ItemGroup>
 * </Project>
 * 
 * USAGE EXAMPLES:
 * 
 * dotnet run status
 * dotnet run test --verbose
 * dotnet run sandbox --json
 * dotnet run live --force
 * 
 * The framework automatically provides:
 * - All CLI argument parsing and validation
 * - Command routing for the four PolyScript modes
 * - --json, --verbose, --force standard flags
 * - PolyScript v1.0 JSON output formatting
 * - Error handling and exit codes
 * - Help text generation
 * - Confirmation prompts
 * 
 * BENEFITS:
 * - ZERO boilerplate code
 * - Developer writes ONLY business logic
 * - Framework handles all PolyScript compliance automatically
 * - Automatic CLI generation with Spectre.Console
 * - Rich console output with colors and formatting
 * - Type-safe command definition
 * - Consistent error handling
 */