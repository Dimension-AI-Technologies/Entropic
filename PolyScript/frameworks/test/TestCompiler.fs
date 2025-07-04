(*
 * Test F# Compiler Tool for PolyScript Framework
 * CRUD × Modes Architecture: Zero-boilerplate CLI development
 * 
 * Author: Mathew Burkitt, Dimension Technologies <mathew.burkitt@ditech.ai>
 *)

open System
open System.Collections.Generic
open PolyScript.Framework

[<Rebadge("compile", "create+live")>]
[<Rebadge("dry-compile", "create+simulate")>]
[<Rebadge("status", "read+live")>]
[<Rebadge("clean", "delete+live")>]
type TestCompilerTool() =
    interface IPolyScriptTool with
        member _.Description = "Test F# compiler tool demonstrating CRUD × Modes"
        
        member _.Create resource options (context: PolyScriptContext) =
            let resourceName = resource |> Option.defaultValue "main.fs"
            context.Log(sprintf "Compiling %s..." resourceName)
            
            let outputFile = 
                match options.TryGetValue("output") with
                | (true, value) -> value :?> string
                | _ -> resourceName.Replace(".fs", ".exe")
            
            let optimize = 
                match options.TryGetValue("optimize") with
                | (true, value) -> value :?> bool
                | _ -> false
            
            dict [
                ("compiled", resourceName :> obj)
                ("output", outputFile :> obj)
                ("optimized", optimize :> obj)
                ("timestamp", DateTime.Now.ToString("O") :> obj)
            ] :> obj
        
        member _.Read resource options (context: PolyScriptContext) =
            context.Log("Checking compilation status...")
            
            let sourceFiles = 
                match resource with
                | Some r -> [r]
                | None -> ["Program.fs"; "Utils.fs"; "Config.fs"]
            
            dict [
                ("source_files", sourceFiles :> obj)
                ("compiled_files", ["Program.exe"; "Utils.dll"] :> obj)
                ("missing", ["Config.dll"] :> obj)
                ("last_build", DateTime.Now.ToString("O") :> obj)
            ] :> obj
        
        member _.Update resource options (context: PolyScriptContext) =
            let resourceName = resource |> Option.defaultValue "main.fs"
            context.Log(sprintf "Recompiling %s..." resourceName)
            
            let incremental = 
                match options.TryGetValue("incremental") with
                | (true, value) -> value :?> bool
                | _ -> false
            
            dict [
                ("recompiled", resourceName :> obj)
                ("reason", "source file changed" :> obj)
                ("incremental", incremental :> obj)
                ("timestamp", DateTime.Now.ToString("O") :> obj)
            ] :> obj
        
        member _.Delete resource options (context: PolyScriptContext) =
            let resourceName = resource |> Option.defaultValue "build artifacts"
            context.Log(sprintf "Cleaning %s..." resourceName)
            
            dict [
                ("cleaned", ["*.exe"; "*.dll"; "*.pdb"; "bin/"; "obj/"] :> obj)
                ("freed_space", "12.8 MB" :> obj)
                ("timestamp", DateTime.Now.ToString("O") :> obj)
            ] :> obj

[<EntryPoint>]
let main args =
    run<TestCompilerTool> args