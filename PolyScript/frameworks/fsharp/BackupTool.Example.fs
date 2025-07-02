(*
 * Example: Backup Tool using PolyScript F# Framework
 * 
 * This demonstrates how the F# PolyScript framework eliminates boilerplate.
 * Shows both object-oriented and functional approaches.
 * 
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 *)

module PolyScript.Examples.BackupTool

open System
open System.IO
open PolyScript.Framework

// Object-oriented approach
type BackupTool(sourcePath: string, destPath: string, overwrite: bool) =
    new() = BackupTool("/source", "/dest", false)
    
    interface IPolyScriptTool with
        member _.Description = 
            "PolyScript-compliant backup tool with zero boilerplate\n\n" +
            "Backs up directories with full PolyScript mode support.\n" +
            "Provides status checking, dry-run testing, dependency validation,\n" +
            "and live backup operations."
        
        member _.Status(context) =
            context.Log("Checking backup status...")
            
            let sourceInfo = getDirectoryInfo sourcePath
            let destInfo = getDirectoryInfo destPath
            
            {|
                source = {|
                    path = sourcePath
                    exists = sourceInfo.exists
                    size_bytes = sourceInfo.size
                    file_count = sourceInfo.files
                |}
                destination = {|
                    path = destPath
                    exists = destInfo.exists
                    size_bytes = destInfo.size
                    would_overwrite = destInfo.exists && not overwrite
                |}
                backup_needed = sourceInfo.exists && (not destInfo.exists || overwrite)
            |}
        
        member _.Test(context) =
            context.Log("Planning backup operations...")
            
            let sourceInfo = getDirectoryInfo sourcePath
            let destInfo = getDirectoryInfo destPath
            
            if not sourceInfo.exists then
                context.Output("Source directory does not exist", error = true)
                null
            else
                let operations =
                    if destInfo.exists && not overwrite then
                        [| {|
                            operation = "skip"
                            reason = "destination exists and overwrite not specified"
                            source = sourcePath
                            destination = destPath
                        |} |]
                    else
                        [| {|
                            operation = "backup"
                            source = sourcePath
                            destination = destPath
                            file_count = sourceInfo.files
                            size_bytes = sourceInfo.size
                            would_overwrite = destInfo.exists
                        |} |]
                
                {|
                    planned_operations = operations
                    total_files = sourceInfo.files
                    total_size = sourceInfo.size
                    note = "No changes made in test mode"
                |}
        
        member _.Sandbox(context) =
            context.Log("Testing backup environment...")
            
            let tests = [
                ("source_readable", testSourceReadable sourcePath)
                ("destination_writable", testDestinationWritable destPath)
                ("sufficient_space", testSufficientSpace sourcePath destPath)
                ("filesystem_access", testFilesystemAccess())
            ] |> dict
            
            let allPassed = tests.Values |> Seq.forall (fun status -> status = "passed")
            
            {|
                dependency_tests = tests
                all_passed = allPassed
            |}
        
        member _.Live(context) =
            context.Log("Preparing backup execution...")
            
            let sourceInfo = getDirectoryInfo sourcePath
            if not sourceInfo.exists then
                context.Output("Source directory does not exist", error = true)
                null
            else
                let destInfo = getDirectoryInfo destPath
                let shouldProceed =
                    if destInfo.exists && not overwrite then
                        context.Confirm($"Destination {destPath} exists. Overwrite?")
                    else
                        true
                
                if not shouldProceed then
                    {| status = "cancelled" |}
                else
                    try
                        context.Log($"Starting backup from {sourcePath} to {destPath}")
                        
                        // Simulate backup operation
                        // In real implementation: Directory.Delete(destPath); Directory.Move(sourcePath, destPath)
                        System.Threading.Thread.Sleep(1000) // Simulate work
                        
                        let resultInfo = getDirectoryInfo destPath
                        
                        {|
                            operation = "backup_completed"
                            source = sourcePath
                            destination = destPath
                            files_copied = resultInfo.files
                            bytes_copied = resultInfo.size
                        |}
                    with
                    | ex ->
                        context.Output($"Backup failed: {ex.Message}", error = true)
                        null

// Functional approach using helper functions
and getDirectoryInfo (path: string) =
    try
        if not (Directory.Exists(path)) then
            { exists = false; size = 0L; files = 0 }
        else
            let files = Directory.GetFiles(path, "*", SearchOption.AllDirectories)
            let size = 
                files 
                |> Array.sumBy (fun file ->
                    try (FileInfo(file)).Length
                    with _ -> 0L)
            
            { exists = true; size = size; files = files.Length }
    with
    | _ -> { exists = false; size = 0L; files = 0 }

and testSourceReadable (path: string) =
    try
        if Directory.Exists(path) && (File.GetAttributes(path) &&& FileAttributes.ReadOnly) <> FileAttributes.ReadOnly
        then "passed" else "failed"
    with
    | _ -> "error"

and testDestinationWritable (path: string) =
    try
        let parentDir = Path.GetDirectoryName(path)
        if Directory.Exists(parentDir) then "passed" else "failed"
    with
    | _ -> "error"

and testSufficientSpace (sourcePath: string) (destPath: string) =
    try
        let sourceInfo = getDirectoryInfo sourcePath
        if not sourceInfo.exists then "unknown"
        else
            let destDir = Path.GetDirectoryName(destPath)
            let drive = DriveInfo(Path.GetPathRoot(destDir))
            if drive.AvailableFreeSpace > sourceInfo.size * 1.1 then "passed" else "failed"
    with
    | _ -> "error"

and testFilesystemAccess () =
    try
        let tempFile = Path.GetTempFileName()
        File.Delete(tempFile)
        "passed"
    with
    | _ -> "failed"

// Record type for directory information
type DirectoryInfo = {
    exists: bool
    size: int64
    files: int
}

// Alternative functional approach using the helper module
module FunctionalBackupTool =
    
    let createBackupTool sourcePath destPath overwrite =
        PolyScriptTool.create
            "Functional backup tool with zero boilerplate"
            
            // Status function
            (fun context ->
                context.Log("Checking backup status...")
                let sourceInfo = getDirectoryInfo sourcePath
                let destInfo = getDirectoryInfo destPath
                
                {|
                    source = {| path = sourcePath; exists = sourceInfo.exists; size_bytes = sourceInfo.size |}
                    destination = {| path = destPath; exists = destInfo.exists |}
                    backup_needed = sourceInfo.exists && (not destInfo.exists || overwrite)
                |})
            
            // Test function
            (fun context ->
                context.Log("Planning backup operations...")
                {|
                    planned_operations = [| {| operation = "backup"; source = sourcePath; dest = destPath |} |]
                    note = "No changes made in test mode"
                |})
            
            // Sandbox function
            (fun context ->
                context.Log("Testing environment...")
                let tests = dict [
                    ("source_readable", testSourceReadable sourcePath)
                    ("destination_writable", testDestinationWritable destPath)
                    ("sufficient_space", testSufficientSpace sourcePath destPath)
                ]
                {|
                    dependency_tests = tests
                    all_passed = (tests.Values |> Seq.forall (fun v -> v = "passed"))
                |})
            
            // Live function
            (fun context ->
                context.Log("Executing backup...")
                if context.Confirm("Execute backup operations?") then
                    {| operation = "backup_completed"; files_copied = 1234 |}
                else
                    {| status = "cancelled" |})

// Program entry points

// Object-oriented version
module ObjectOrientedProgram =
    [<EntryPoint>]
    let main args =
        runPolyScriptTool<BackupTool> args

// Functional version  
module FunctionalProgram =
    [<EntryPoint>]
    let main args =
        let tool = FunctionalBackupTool.createBackupTool "/source" "/dest" false
        PolyScriptTool.run tool args

(*
 * PROJECT FILE (BackupTool.fsproj):
 * 
 * <Project Sdk="Microsoft.NET.Sdk">
 *   <PropertyGroup>
 *     <OutputType>Exe</OutputType>
 *     <TargetFramework>net6.0</TargetFramework>
 *   </PropertyGroup>
 *   <ItemGroup>
 *     <Compile Include="PolyScript.Framework.fs" />
 *     <Compile Include="BackupTool.Example.fs" />
 *   </ItemGroup>
 *   <ItemGroup>
 *     <PackageReference Include="Argu" Version="6.1.1" />
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
 * BENEFITS OF F# APPROACH:
 * - ZERO boilerplate code
 * - Choice of functional or object-oriented style
 * - Immutable data structures by default
 * - Pattern matching for robust error handling
 * - Type safety with anonymous records
 * - Functional composition support
 * - Expressive and concise syntax
 * 
 * FUNCTIONAL STYLE ADVANTAGES:
 * - No classes needed - just functions
 * - Easy to compose and test
 * - Immutable by default
 * - Pattern matching for control flow
 * - Anonymous records for data structures
 *)

// Demo of both approaches
module Demo =
    
    // Show how clean the functional approach can be
    let simpleBackupTool = PolyScriptTool.create
        "Ultra-simple backup tool"
        (fun ctx -> {| status = "ready" |})                    // Status
        (fun ctx -> {| would_backup = ["file1"; "file2"] |})   // Test  
        (fun ctx -> {| environment = "ok" |})                  // Sandbox
        (fun ctx -> {| backup_completed = true |})             // Live
    
    [<EntryPoint>]
    let main args =
        PolyScriptTool.run simpleBackupTool args