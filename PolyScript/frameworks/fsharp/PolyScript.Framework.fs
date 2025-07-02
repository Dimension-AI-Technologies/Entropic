(*
 * PolyScript Framework for F# using Argu
 * 
 * A true zero-boilerplate framework for creating PolyScript-compliant CLI tools.
 * Developers write ONLY business logic - the framework handles everything else.
 * 
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 *)

module PolyScript.Framework

open System
open System.Collections.Generic
open System.Text.Json
open Argu

// PolyScript execution modes
type PolyScriptMode =
    | Status
    | Test
    | Sandbox
    | Live

// PolyScript context for tool execution
type PolyScriptContext = {
    Mode: PolyScriptMode
    Verbose: bool
    Force: bool
    JsonOutput: bool
    mutable OutputData: Dictionary<string, obj>
} with
    static member Create(mode, verbose, force, jsonOutput) = {
        Mode = mode
        Verbose = verbose
        Force = force
        JsonOutput = jsonOutput
        OutputData = Dictionary<string, obj>([
            ("polyscript", "1.0" :> obj)
            ("mode", mode.ToString().ToLower() :> obj)
            ("status", "success" :> obj)
            ("data", Dictionary<string, obj>() :> obj)
        ])
    }

    member this.Log(message: string, ?level: string) =
        let level = defaultArg level "info"
        if this.JsonOutput then
            // Route to JSON data structure
            let key = 
                match level with
                | "error" | "critical" -> Some "errors"
                | "warning" -> Some "warnings"
                | "info" | "debug" when this.Verbose -> Some "messages"
                | _ -> None
            
            match key with
            | Some k ->
                if not (this.OutputData.ContainsKey(k)) then
                    this.OutputData.[k] <- List<string>() :> obj
                (this.OutputData.[k] :?> List<string>).Add($"{level.ToUpper()}: {message}")
            | None -> ()
        else
            // Direct console output
            match level with
            | "error" | "critical" -> 
                Console.ForegroundColor <- ConsoleColor.Red
                eprintfn "Error: %s" message
            | "warning" -> 
                Console.ForegroundColor <- ConsoleColor.Yellow
                eprintfn "Warning: %s" message
            | "info" -> 
                Console.ForegroundColor <- ConsoleColor.White
                printfn "%s" message
            | "debug" when this.Verbose -> 
                Console.ForegroundColor <- ConsoleColor.Gray
                printfn "%s" message
            | _ -> ()
            Console.ResetColor()

    member this.Output(data: obj, ?error: bool) =
        let error = defaultArg error false
        if this.JsonOutput then
            match data with
            | :? string as str ->
                let key = if error then "errors" else "messages"
                if not (this.OutputData.ContainsKey(key)) then
                    this.OutputData.[key] <- List<string>() :> obj
                (this.OutputData.[key] :?> List<string>).Add(str)
            | _ ->
                // Merge object properties into data section
                let dataDict = this.OutputData.["data"] :?> Dictionary<string, obj>
                let json = JsonSerializer.Serialize(data)
                let properties = JsonSerializer.Deserialize<Dictionary<string, obj>>(json)
                for prop in properties do
                    dataDict.[prop.Key] <- prop.Value
        else
            if error then
                Console.ForegroundColor <- ConsoleColor.Red
                eprintfn "Error: %A" data
                Console.ResetColor()
            else
                match data with
                | :? string as str -> printfn "%s" str
                | _ -> 
                    let options = JsonSerializerOptions()
                    options.WriteIndented <- true
                    printfn "%s" (JsonSerializer.Serialize(data, options))

    member this.Confirm(message: string) =
        if this.Force then
            true
        elif this.JsonOutput then
            this.Output({| confirmation_required = message |}, error = true)
            false
        else
            printf "%s [y/N]: " message
            let response = Console.ReadLine()
            response.ToLower() = "y"

    member this.FinalizeOutput() =
        if this.JsonOutput then
            let options = JsonSerializerOptions()
            options.WriteIndented <- true
            printfn "%s" (JsonSerializer.Serialize(this.OutputData, options))

// Standard PolyScript arguments
type PolyScriptArgs =
    | [<AltCommandLine("-v")>] Verbose
    | [<AltCommandLine("-f")>] Force
    | Json
    interface IArgParserTemplate with
        member s.Usage =
            match s with
            | Verbose -> "Enable verbose output"
            | Force -> "Skip confirmation prompts"
            | Json -> "Output in JSON format"

// PolyScript tool interface
type IPolyScriptTool =
    abstract member Description: string
    abstract member Status: PolyScriptContext -> obj
    abstract member Test: PolyScriptContext -> obj
    abstract member Sandbox: PolyScriptContext -> obj
    abstract member Live: PolyScriptContext -> obj

// Main framework execution function
let runPolyScriptTool<'T when 'T :> IPolyScriptTool and 'T : (new : unit -> 'T)> (args: string[]) =
    try
        // Parse command line arguments
        let parser = ArgumentParser.Create<PolyScriptArgs>(programName = typeof<'T>.Name.ToLower())
        
        // Determine mode from first argument
        let (mode, remainingArgs) =
            if args.Length > 0 then
                match args.[0].ToLower() with
                | "status" -> (Status, args.[1..])
                | "test" -> (Test, args.[1..])
                | "sandbox" -> (Sandbox, args.[1..])
                | "live" -> (Live, args.[1..])
                | _ -> (Status, args) // Default to status
            else
                (Status, args)

        let results = parser.Parse(remainingArgs, ignoreUnrecognized = true)
        
        // Create tool instance and context
        let tool = new 'T()
        let context = PolyScriptContext.Create(
            mode,
            results.Contains(Verbose),
            results.Contains(Force),
            results.Contains(Json)
        )

        context.OutputData.["tool"] <- typeof<'T>.Name :> obj

        context.Log($"Executing {mode} mode", "debug")

        // Execute the appropriate method
        let result =
            match mode with
            | Status -> tool.Status(context)
            | Test -> tool.Test(context)
            | Sandbox -> tool.Sandbox(context)
            | Live -> tool.Live(context)

        // Output result if not null
        if not (isNull result) then
            context.Output(result)

        context.FinalizeOutput()
        0

    with
    | :? ArguParseException as ex ->
        printfn "%s" ex.Message
        1
    | ex ->
        eprintfn "Unhandled error: %s" ex.Message
        1

// Helper function to create anonymous record types
let inline createRecord fields = fields

// Module for creating PolyScript tools with minimal boilerplate
module PolyScriptTool =
    
    // Helper to create a simple tool from functions
    let create description statusFn testFn sandboxFn liveFn =
        { new IPolyScriptTool with
            member _.Description = description
            member _.Status(ctx) = statusFn ctx
            member _.Test(ctx) = testFn ctx
            member _.Sandbox(ctx) = sandboxFn ctx
            member _.Live(ctx) = liveFn ctx
        }

    // Run a tool created with the helper
    let run tool args =
        let toolType = tool.GetType()
        let methodInfo = typeof<PolyScript.Framework>.GetMethod("runPolyScriptTool")
        let genericMethod = methodInfo.MakeGenericMethod([| toolType |])
        genericMethod.Invoke(null, [| args |]) :?> int

(*
 * EXAMPLE USAGE:
 * 
 * // Define a backup tool
 * type BackupTool() =
 *     interface IPolyScriptTool with
 *         member _.Description = 
 *             "PolyScript-compliant backup tool with zero boilerplate\n\n" +
 *             "Backs up directories with full PolyScript mode support.\n" +
 *             "Provides status checking, dry-run testing, dependency validation,\n" +
 *             "and live backup operations."
 *         
 *         member _.Status(context) =
 *             context.Log("Checking backup status...")
 *             {|
 *                 source = {| path = "/source"; exists = true; size_bytes = 1024000 |}
 *                 destination = {| path = "/dest"; exists = false |}
 *                 backup_needed = true
 *             |}
 *         
 *         member _.Test(context) =
 *             context.Log("Planning backup operations...")
 *             {|
 *                 planned_operations = [|
 *                     {| operation = "backup"; source = "/source"; dest = "/dest" |}
 *                 |]
 *                 note = "No changes made in test mode"
 *             |}
 *         
 *         member _.Sandbox(context) =
 *             context.Log("Testing environment...")
 *             let tests = dict [
 *                 ("filesystem", "accessible")
 *                 ("permissions", "sufficient") 
 *                 ("diskspace", "available")
 *             ]
 *             {|
 *                 dependency_tests = tests
 *                 all_passed = true
 *             |}
 *         
 *         member _.Live(context) =
 *             context.Log("Starting backup operations...")
 *             
 *             if not (context.Confirm("Execute backup operations?")) then
 *                 {| status = "cancelled" |}
 *             else
 *                 // Actual backup logic here
 *                 context.Log("Backup completed successfully")
 *                 {|
 *                     operation = "backup_completed"
 *                     files_copied = 1234
 *                     bytes_copied = 567890L
 *                 |}
 * 
 * // Program entry point
 * [<EntryPoint>]
 * let main args =
 *     runPolyScriptTool<BackupTool> args
 * 
 * // Alternative using the helper functions:
 * let backupTool = PolyScriptTool.create
 *     "Simple backup tool"
 *     (fun ctx -> 
 *         ctx.Log("Status check")
 *         {| operational = true |})
 *     (fun ctx -> 
 *         ctx.Log("Test mode")
 *         {| would_backup = [| "file1"; "file2" |] |})
 *     (fun ctx -> 
 *         ctx.Log("Sandbox test")
 *         {| dependencies = "ok" |})
 *     (fun ctx -> 
 *         ctx.Log("Live execution")
 *         {| completed = true |})
 * 
 * [<EntryPoint>]
 * let main args =
 *     PolyScriptTool.run backupTool args
 *)

// Example tool implementation
type ExampleTool() =
    interface IPolyScriptTool with
        member _.Description = 
            "Example PolyScript tool demonstrating the F# framework"
        
        member _.Status(context) =
            context.Log("Checking status...")
            {|
                operational = true
                last_check = DateTime.Now
                files_ready = 1234
            |}
        
        member _.Test(context) =
            context.Log("Running test mode...")
            {|
                planned_operations = [|
                    {| operation = "Operation 1"; status = "would execute" |}
                    {| operation = "Operation 2"; status = "would execute" |}
                |]
                total_operations = 2
            |}
        
        member _.Sandbox(context) =
            context.Log("Testing environment...")
            let tests = dict [
                ("dotnet", "available")
                ("filesystem", "writable")
                ("network", "accessible")
            ]
            let allPassed = tests.Values |> Seq.forall (fun v -> v = "available" || v = "writable" || v = "accessible")
            {|
                dependency_tests = tests
                all_passed = allPassed
            |}
        
        member _.Live(context) =
            context.Log("Executing live mode...")
            
            if not (context.Confirm("Execute operations?")) then
                {| status = "cancelled" |}
            else
                context.Log("Executing operation 1...")
                context.Log("Executing operation 2...")
                {|
                    executed_operations = [|
                        {| operation = "Operation 1"; status = "completed" |}
                        {| operation = "Operation 2"; status = "completed" |}
                    |]
                    total_completed = 2
                |}

// Example program entry point
module Program =
    [<EntryPoint>]
    let main args =
        runPolyScriptTool<ExampleTool> args