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

        public object Create(string resource, Dictionary<string, object> options, PolyScriptContext context)
        {
            context.Log($"Creating backup for {resource}...");

            var sourceInfo = GetDirectoryInfo(resource ?? SourcePath);
            if (!sourceInfo.exists)
            {
                context.Output("Source directory does not exist", error: true);
                return null!;
            }

            var destPath = options.GetValueOrDefault("destination", DestPath)?.ToString() ?? DestPath;
            var destInfo = GetDirectoryInfo(destPath);

            try
            {
                context.Log($"Starting backup from {resource ?? SourcePath} to {destPath}");
                
                // Simulate backup operation
                System.Threading.Thread.Sleep(1000); // Simulate work
                
                return new
                {
                    operation = "backup_created",
                    source = resource ?? SourcePath,
                    destination = destPath,
                    files_copied = sourceInfo.files,
                    bytes_copied = sourceInfo.size,
                    timestamp = DateTime.Now.ToString("O")
                };
            }
            catch (Exception ex)
            {
                context.Output($"Backup failed: {ex.Message}", error: true);
                return null!;
            }
        }

        public object Read(string resource, Dictionary<string, object> options, PolyScriptContext context)
        {
            context.Log("Checking backup status...");

            var sourcePath = resource ?? SourcePath;
            var sourceInfo = GetDirectoryInfo(sourcePath);
            var destInfo = GetDirectoryInfo(DestPath);

            return new
            {
                source = new
                {
                    path = sourcePath,
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

        public object Update(string resource, Dictionary<string, object> options, PolyScriptContext context)
        {
            context.Log($"Updating backup for {resource}...");

            var sourceInfo = GetDirectoryInfo(resource ?? SourcePath);
            if (!sourceInfo.exists)
            {
                context.Output("Source directory does not exist", error: true);
                return null!;
            }

            var incremental = options.GetValueOrDefault("incremental", false);

            try
            {
                context.Log($"Updating backup from {resource ?? SourcePath}");
                
                // Simulate incremental backup
                System.Threading.Thread.Sleep(500); // Simulate work
                
                return new
                {
                    operation = "backup_updated",
                    source = resource ?? SourcePath,
                    destination = DestPath,
                    incremental = incremental,
                    files_updated = sourceInfo.files / 2, // Simulate partial update
                    bytes_updated = sourceInfo.size / 2,
                    timestamp = DateTime.Now.ToString("O")
                };
            }
            catch (Exception ex)
            {
                context.Output($"Backup update failed: {ex.Message}", error: true);
                return null!;
            }
        }

        public object Delete(string resource, Dictionary<string, object> options, PolyScriptContext context)
        {
            context.Log($"Deleting backup for {resource ?? "all backups"}...");

            var destPath = resource ?? DestPath;
            var destInfo = GetDirectoryInfo(destPath);

            if (!destInfo.exists)
            {
                context.Output("Backup does not exist", error: true);
                return null!;
            }

            try
            {
                context.Log($"Removing backup at {destPath}");
                
                // Simulate deletion
                System.Threading.Thread.Sleep(300); // Simulate work
                
                return new
                {
                    operation = "backup_deleted",
                    path = destPath,
                    files_removed = destInfo.files,
                    bytes_freed = destInfo.size,
                    timestamp = DateTime.Now.ToString("O")
                };
            }
            catch (Exception ex)
            {
                context.Output($"Backup deletion failed: {ex.Message}", error: true);
                return null!;
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
                if (!Directory.Exists(SourcePath))
                    return "failed";
                
                // Try to enumerate files to test read access
                var files = Directory.GetFiles(SourcePath);
                return "passed";
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