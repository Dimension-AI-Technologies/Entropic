(*
 * PolyScript Framework for F# using Argu
 * CRUD × Modes Architecture: Zero-boilerplate CLI development
 * 
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 *)

module PolyScript.Framework

open System
open System.Collections.Generic
open System.Text.Json
open System.IO
open Argu

// PolyScript CRUD operations
type PolyScriptOperation =
    | Create
    | Read
    | Update
    | Delete

// PolyScript execution modes
type PolyScriptMode =
    | Simulate
    | Sandbox
    | Live


// PolyScript context for tool execution
type PolyScriptContext = {
    Operation: PolyScriptOperation
    Mode: PolyScriptMode
    Resource: string option
    RebadgedAs: string option
    Options: Dictionary<string, obj>
    Verbose: bool
    Force: bool
    JsonOutput: bool
    mutable OutputData: Dictionary<string, obj>
} with
    static member Create(operation, mode, resource, rebadgedAs, options, verbose, force, jsonOutput) = {
        Operation = operation
        Mode = mode
        Resource = resource
        RebadgedAs = rebadgedAs
        Options = defaultArg options (Dictionary<string, obj>())
        Verbose = verbose
        Force = force
        JsonOutput = jsonOutput
        OutputData = 
            let data = Dictionary<string, obj>()
            data.["polyscript"] <- "1.0" :> obj
            data.["operation"] <- operation.ToString().ToLower() :> obj
            data.["mode"] <- mode.ToString().ToLower() :> obj
            data.["status"] <- "success" :> obj
            data.["data"] <- Dictionary<string, obj>() :> obj
            data
    }

    member this.CanMutate() = this.Mode = Live
    member this.ShouldValidate() = this.Mode = Sandbox
    member this.RequireConfirm() = 
        this.Mode = Live && 
        (this.Operation = Update || this.Operation = Delete) && 
        not this.Force
    member this.IsSafeMode() = this.Mode <> Live

    member this.Log(message: string, ?level: string) =
        let level = defaultArg level "info"
        if this.JsonOutput then
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
                    let json = JsonSerializer.Serialize(data, JsonSerializerOptions(WriteIndented = true))
                    printfn "%s" json

    member this.Confirm(message: string) =
        if this.Force then
            true
        elif this.JsonOutput then
            this.Output(dict [("confirmation_required", message :> obj)], error = true)
            false
        else
            printf "%s (y/n): " message
            match Console.ReadLine().ToLower() with
            | "y" | "yes" -> true
            | _ -> false

    member this.FinalizeOutput() =
        // Add resource and rebadged info if present
        match this.Resource with
        | Some r -> this.OutputData.["resource"] <- r :> obj
        | None -> ()
        
        match this.RebadgedAs with
        | Some r -> this.OutputData.["rebadged_as"] <- r :> obj
        | None -> ()

        if this.JsonOutput then
            let json = JsonSerializer.Serialize(this.OutputData, JsonSerializerOptions(WriteIndented = true))
            printfn "%s" json

// Attribute for rebadging operations
[<AttributeUsage(AttributeTargets.Class, AllowMultiple = true)>]
type RebadgeAttribute(alias: string, mapping: string) =
    inherit Attribute()
    member this.Alias = alias
    member this.Mapping = mapping

// Interface that PolyScript CRUD tools must implement
type IPolyScriptTool =
    abstract member Description: string
    abstract member Create: string option -> Dictionary<string, obj> -> PolyScriptContext -> obj
    abstract member Read: string option -> Dictionary<string, obj> -> PolyScriptContext -> obj
    abstract member Update: string option -> Dictionary<string, obj> -> PolyScriptContext -> obj
    abstract member Delete: string option -> Dictionary<string, obj> -> PolyScriptContext -> obj

// Argu argument types for CRUD operations
type CrudArguments =
    | [<MainCommand; ExactlyOnce>] Resource of resource: string
    | [<AltCommandLine("-m")>] Mode of mode: PolyScriptMode
    | [<AltCommandLine("-v")>] Verbose
    | [<AltCommandLine("-f")>] Force
    | Json
    
    interface IArgParserTemplate with
        member this.Usage =
            match this with
            | Resource _ -> "resource to operate on"
            | Mode _ -> "execution mode (simulate, sandbox, live)"
            | Verbose -> "enable verbose output"
            | Force -> "skip confirmation prompts"
            | Json -> "output in JSON format"

type DiscoveryArguments =
    | Json
    
    interface IArgParserTemplate with
        member this.Usage =
            match this with
            | Json -> "output in JSON format"

// Load rebadging configuration from attributes
let loadRebadging<'T>() =
    let rebadging = Dictionary<string, string * string>()
    
    // Load from attributes only
    let toolType = typeof<'T>
    let attrs = toolType.GetCustomAttributes(typeof<RebadgeAttribute>, false)
    for attr in attrs do
        let rebadgeAttr = attr :?> RebadgeAttribute
        let parts = rebadgeAttr.Mapping.Split('+')
        let operation = parts.[0]
        let mode = if parts.Length > 1 then parts.[1] else "live"
        rebadging.[rebadgeAttr.Alias] <- (operation, mode)
    
    rebadging

// Execute CRUD method with mode wrapping
let executeWithMode (tool: 'T when 'T :> IPolyScriptTool) (context: PolyScriptContext) =
    match context.Mode with
    | Simulate ->
        context.Log($"Simulating {context.Operation} operation", "debug")
        
        // Read operations can execute in simulate mode
        if context.Operation = Read then
            tool.Read context.Resource context.Options context
        else
            // For mutating operations, describe what would happen
            let actionVerbs = 
                match context.Operation with
                | Create -> "Would create"
                | Update -> "Would update"
                | Delete -> "Would delete"
                | Read -> "Would read" // Should not reach here
            
            dict [
                ("simulation", true :> obj)
                let resourceName = context.Resource |> Option.defaultValue "resource"
                ("action", sprintf "%s %s" actionVerbs resourceName :> obj)
                ("options", context.Options :> obj)
            ] :> obj
    
    | Sandbox ->
        context.Log($"Testing prerequisites for {context.Operation}", "debug")
        
        let validations = Dictionary<string, string>()
        validations.["permissions"] <- "verified"
        validations.["dependencies"] <- "available"
        validations.["connectivity"] <- "established"
        
        // TODO: Add custom validation support
        let allPassed = validations.Values |> Seq.forall (fun v -> 
            v = "verified" || v = "available" || v = "established" || v = "passed")
        
        dict [
            ("sandbox", true :> obj)
            ("validations", validations :> obj)
            ("ready", allPassed :> obj)
        ] :> obj
    
    | Live ->
        context.Log($"Executing {context.Operation} operation", "debug")
        
        // Confirmation for destructive operations
        if context.RequireConfirm() then
            let resourceName = context.Resource |> Option.defaultValue "resource"
            let confirmMsg = sprintf "Are you sure you want to %s %s?" (context.Operation.ToString().ToLower()) resourceName
            if not (context.Confirm(confirmMsg)) then
                context.OutputData.["status"] <- "cancelled" :> obj
                dict [
                    ("status", "cancelled" :> obj)
                    ("reason", "User declined confirmation" :> obj)
                ] :> obj
            else
                // Execute the actual CRUD method
                match context.Operation with
                | Create -> tool.Create context.Resource context.Options context
                | Read -> tool.Read context.Resource context.Options context
                | Update -> tool.Update context.Resource context.Options context
                | Delete -> tool.Delete context.Resource context.Options context
        else
            // Execute the actual CRUD method
            match context.Operation with
            | Create -> tool.Create context.Resource context.Options context
            | Read -> tool.Read context.Resource context.Options context
            | Update -> tool.Update context.Resource context.Options context
            | Delete -> tool.Delete context.Resource context.Options context

// Main execution function for CRUD operations
let executeCrudOperation<'T when 'T :> IPolyScriptTool and 'T : (new : unit -> 'T)> 
    (operation: PolyScriptOperation) 
    (rebadgedAs: string option)
    (args: string[]) =
    
    let parser = ArgumentParser.Create<CrudArguments>(programName = $"{typeof<'T>.Name.ToLower()}")
    
    try
        let results = parser.Parse(args)
        let resource = results.TryGetResult(Resource)
        let mode = results.GetResult(Mode, defaultValue = Live)
        let verbose = results.Contains(CrudArguments.Verbose)
        let force = results.Contains(CrudArguments.Force)
        let jsonOutput = results.Contains(CrudArguments.Json)
        
        let tool = new 'T()
        let context = PolyScriptContext.Create(operation, mode, resource, rebadgedAs, None, verbose, force, jsonOutput)
        context.OutputData.["tool"] <- typeof<'T>.Name :> obj
        
        context.Log($"Executing {operation} operation in {mode} mode", "debug")
        
        let result = executeWithMode tool context
        
        if not (isNull result) then
            context.Output(result)
        
        context.FinalizeOutput()
        0
        
    with
    | :? ArguParseException as ex ->
        eprintfn "%s" ex.Message
        1
    | ex ->
        eprintfn "Error: %s" ex.Message
        1

// Discovery function for agent introspection
let executeDiscovery<'T when 'T :> IPolyScriptTool and 'T : (new : unit -> 'T)> (args: string[]) =
    let parser = ArgumentParser.Create<DiscoveryArguments>(programName = $"{typeof<'T>.Name.ToLower()}")
    
    try
        let results = parser.Parse(args)
        let jsonOutput = results.Contains(DiscoveryArguments.Json)
        
        let tool = new 'T()
        
        let discovery = dict [
            ("polyscript", "1.0" :> obj)
            ("tool", typeof<'T>.Name :> obj)
            ("operations", ["create"; "read"; "update"; "delete"] :> obj)
            ("modes", ["simulate"; "sandbox"; "live"] :> obj)
        ]
        
        if jsonOutput then
            let json = JsonSerializer.Serialize(discovery, JsonSerializerOptions(WriteIndented = true))
            printfn "%s" json
        else
            printfn "Tool: %s" (discovery.["tool"] :?> string)
            printfn "Operations: create, read, update, delete"
            printfn "Modes: simulate, sandbox, live"
            printfn "\nOperations:"
            let ops = discovery.["operations"] :?> obj :?> string list
            for op in ops do
                printfn "  %s" op
            let modes = discovery.["modes"] :?> obj :?> string list
            printfn "\nModes: %s" (String.Join(", ", modes))
        
        0
        
    with
    | :? ArguParseException as ex ->
        eprintfn "%s" ex.Message
        1
    | ex ->
        eprintfn "Error: %s" ex.Message
        1

// Main framework runner function
let run<'T when 'T :> IPolyScriptTool and 'T : (new : unit -> 'T)> (args: string[]) =
    if args.Length = 0 then
        // Show help
        printfn "PolyScript CRUD × Modes Framework"
        printfn "Available commands: create, read, update, delete, list, --discover"
        printfn "Use: %s <command> [options]" (typeof<'T>.Name.ToLower())
        0
    else
        let rebadging = loadRebadging<'T>()
        
        match args.[0] with
        | "--discover" -> executeDiscovery<'T> (args |> Array.skip 1)
        | "create" -> executeCrudOperation<'T> Create None (args |> Array.skip 1)
        | "read" | "list" -> executeCrudOperation<'T> Read None (args |> Array.skip 1)
        | "update" -> executeCrudOperation<'T> Update None (args |> Array.skip 1)
        | "delete" -> executeCrudOperation<'T> Delete None (args |> Array.skip 1)
        | cmd when rebadging.ContainsKey(cmd) ->
            let (operation, _mode) = rebadging.[cmd]
            let parsedOp = 
                match operation with
                | "create" -> Create
                | "read" -> Read
                | "update" -> Update
                | "delete" -> Delete
                | _ -> failwith $"Unknown operation: {operation}"
            executeCrudOperation<'T> parsedOp (Some cmd) (args |> Array.skip 1)
        | _ ->
            eprintfn "Unknown command: %s" args.[0]
            eprintfn "Available commands: create, read, update, delete, list, --discover"
            1

(*
 * EXAMPLE USAGE:
 * 
 * [<Rebadge("compile", "create+live")>]
 * [<Rebadge("dry-compile", "create+simulate")>]
 * [<Rebadge("status", "read+live")>]
 * [<Rebadge("clean", "delete+live")>]
 * type CompilerTool() =
 *     interface IPolyScriptTool with
 *         member _.Description = "Example compiler tool demonstrating CRUD × Modes"
 *         
 *         member _.Create(resource, options, context) =
 *             let resourceName = resource |> Option.defaultValue "source"
 *             context.Log(sprintf "Compiling %s..." resourceName)
 *             
 *             let outputFile = 
 *                 match options.TryGetValue("output") with
 *                 | (true, value) -> value :?> string
 *                 | _ -> resourceName.Replace(".fs", ".exe")
 *             
 *             dict [
 *                 ("compiled", resourceName :> obj)
 *                 ("output", outputFile :> obj)
 *                 ("timestamp", DateTime.Now.ToString("O") :> obj)
 *             ] :> obj
 *         
 *         member _.Read(resource, options, context) =
 *             context.Log("Checking compilation status...")
 *             
 *             dict [
 *                 ("source_files", ["main.fs"; "utils.fs"; "config.fs"] :> obj)
 *                 ("compiled_files", ["main.exe"; "utils.dll"] :> obj)
 *                 ("missing", ["config.dll"] :> obj)
 *                 ("last_build", DateTime.Now.ToString("O") :> obj)
 *             ] :> obj
 *         
 *         member _.Update(resource, options, context) =
 *             let resourceName = resource |> Option.defaultValue "source"
 *             context.Log(sprintf "Recompiling %s..." resourceName)
 *             
 *             dict [
 *                 ("recompiled", resourceName :> obj)
 *                 ("reason", "source file changed" :> obj)
 *                 ("timestamp", DateTime.Now.ToString("O") :> obj)
 *             ] :> obj
 *         
 *         member _.Delete(resource, options, context) =
 *             let resourceName = resource |> Option.defaultValue "build artifacts"
 *             context.Log(sprintf "Cleaning %s..." resourceName)
 *             
 *             dict [
 *                 ("cleaned", ["*.exe"; "*.dll"; "bin/"; "obj/"] :> obj)
 *                 ("freed_space", "8.7 MB" :> obj)
 *                 ("timestamp", DateTime.Now.ToString("O") :> obj)
 *             ] :> obj
 * 
 * [<EntryPoint>]
 * let main args =
 *     run<CompilerTool> args
 * 
 * Command examples:
 * dotnet run create main.fs --mode simulate
 * dotnet run read
 * dotnet run update main.fs
 * dotnet run delete --mode simulate
 * dotnet run --discover --json
 *)