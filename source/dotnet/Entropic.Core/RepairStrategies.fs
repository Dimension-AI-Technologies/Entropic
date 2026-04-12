namespace Entropic.Core

open System
open System.IO
open System.Text.Json
open System.Text.RegularExpressions

/// Repair strategies for resolving orphaned todo sessions to project paths.
/// Ported from TypeScript repair.ts — 5 resolution strategies in priority order.

// @must_test(REQ-DGN-003)
// @must_test(REQ-DGN-004)
// @must_test(REQ-SES-004)
module RepairStrategies =

    type RepairSummary = {
        ProjectsScanned: int
        TodosScanned: int
        MetadataWritten: int
        MetadataPlanned: int
        MatchedBySidecar: int
        MatchedByJsonl: int
        MatchedByContent: int
        MatchedByEnvironment: int
        MatchedByLogFile: int
        UnknownSessions: (string * string * string) list  // (sessionId, todoFile, reason)
        DryRun: bool
    }

    let private todoFileRegex = Regex(@"^([0-9a-f-]+)-agent(?:-[0-9a-f-]+)?\.json$", RegexOptions.Compiled)

    let private envPatterns = [
        Regex(@"""cwd"":\s*""([^""]+)""", RegexOptions.Compiled)
        Regex(@"""pwd"":\s*""([^""]+)""", RegexOptions.Compiled)
        Regex(@"current working directory[^:]*:\s*([^""\\,}]+)", RegexOptions.Compiled ||| RegexOptions.IgnoreCase)
        Regex(@"workspace[^:]*:\s*([^""\\,}]+)", RegexOptions.Compiled ||| RegexOptions.IgnoreCase)
    ]

    let private tryReadFile (path: string) : string option =
        try
            if File.Exists(path) then Some (File.ReadAllText(path))
            else None
        with _ -> None

    let private existsSafe (path: string) : bool =
        try File.Exists(path) || Directory.Exists(path) with _ -> false

    let private writeMetaIfMissing (metaPath: string) (payload: string) (dryRun: bool) : bool =
        if existsSafe metaPath then false
        else
            if not dryRun then
                try
                    File.WriteAllText(metaPath, payload)
                    true
                with _ -> false
            else false

    let private writeSidecarMeta (todosDir: string) (sessionId: string) (projectPath: string) (dryRun: bool) =
        let sidecar = Path.Combine(todosDir, sprintf "%s-agent.meta.json" sessionId)
        if not (existsSafe sidecar) && not dryRun then
            try File.WriteAllText(sidecar, sprintf """{"projectPath":"%s"}""" (projectPath.Replace("\\", "\\\\")))
            with _ -> ()

    let private parseJsonlLines (content: string) (maxLines: int) : string list =
        content.Split('\n')
        |> Array.filter (fun l -> l.Trim().Length > 0)
        |> Array.truncate maxLines
        |> Array.toList

    /// Strategy 1: Read sidecar meta file for session→project mapping.
    let tryResolveBySidecar (sessionId: string) (todosDir: string) (projectsDir: string) (dryRun: bool)
        : Result<bool * int * int, string> =
        try
            let sidecar = Path.Combine(todosDir, sprintf "%s-agent.meta.json" sessionId)
            match tryReadFile sidecar with
            | None -> Ok (false, 0, 0)
            | Some raw ->
                let doc = JsonDocument.Parse(raw)
                match doc.RootElement.TryGetProperty("projectPath") with
                | false, _ -> Ok (false, 0, 0)
                | true, pathEl ->
                    let projectPath = pathEl.GetString()
                    let flat = PathUtils.createFlattenedPath projectPath
                    let projDir = Path.Combine(projectsDir, flat)
                    if not (existsSafe projDir) then Ok (false, 0, 0)
                    else
                        let metaPath = Path.Combine(projDir, "metadata.json")
                        let payload = sprintf """{"path":"%s"}""" (projectPath.Replace("\\", "\\\\"))
                        let wrote = writeMetaIfMissing metaPath payload dryRun
                        Ok (true, (if not (existsSafe metaPath) || wrote then 1 else 0), (if wrote then 1 else 0))
        with ex ->
            Error (sprintf "Sidecar strategy failed: %s" ex.Message)

    /// Strategy 2: Match JSONL filename in project directories.
    let tryResolveByJsonl (sessionId: string) (projectDirs: string list) (projectsDir: string) (dryRun: bool)
        : Result<bool * int * int, string> =
        try
            let found =
                projectDirs |> List.tryFind (fun flat ->
                    let dir = Path.Combine(projectsDir, flat)
                    let jsonlPath = Path.Combine(dir, sprintf "%s.jsonl" sessionId)
                    File.Exists(jsonlPath))
            match found with
            | None -> Ok (false, 0, 0)
            | Some flat ->
                let realPath = PathUtils.reconstructPath flat projectsDir
                if not (PathUtils.validatePath realPath) then Ok (false, 0, 0)
                else
                    let metaPath = Path.Combine(projectsDir, flat, "metadata.json")
                    let payload = sprintf """{"path":"%s"}""" (realPath.Replace("\\", "\\\\"))
                    let wrote = writeMetaIfMissing metaPath payload dryRun
                    Ok (true, (if not (existsSafe metaPath) || wrote then 1 else 0), (if wrote then 1 else 0))
        with ex ->
            Error (sprintf "JSONL strategy failed: %s" ex.Message)

    /// Strategy 3: Scan JSONL content for "Working directory:" pattern.
    let tryResolveByContent (sessionId: string) (projectDirs: string list) (projectsDir: string) (dryRun: bool)
        : Result<bool * int * int, string> =
        try
            let workingDirRegex = Regex(@"working directory:\s*([^""\\]+)", RegexOptions.IgnoreCase)
            let found =
                projectDirs |> List.tryPick (fun flat ->
                    let jsonlPath = Path.Combine(projectsDir, flat, sprintf "%s.jsonl" sessionId)
                    match tryReadFile jsonlPath with
                    | None -> None
                    | Some content ->
                        parseJsonlLines content 50
                        |> List.tryPick (fun line ->
                            let m = workingDirRegex.Match(line)
                            if m.Success then
                                let inferredPath = m.Groups.[1].Value.Replace("\\\\", "/").Trim()
                                if inferredPath.Length > 3 then Some (flat, inferredPath)
                                else None
                            else None))
            match found with
            | None -> Ok (false, 0, 0)
            | Some (flat, inferredPath) ->
                let metaPath = Path.Combine(projectsDir, flat, "metadata.json")
                let payload = sprintf """{"path":"%s"}""" (inferredPath.Replace("\\", "\\\\"))
                let wrote = writeMetaIfMissing metaPath payload dryRun
                Ok (true, (if not (existsSafe metaPath) || wrote then 1 else 0), (if wrote then 1 else 0))
        with ex ->
            Error (sprintf "Content strategy failed: %s" ex.Message)

    /// Strategy 4: Scan JSONL for cwd/pwd/workspace environment patterns.
    let tryResolveByEnvVars (sessionId: string) (projectDirs: string list) (projectsDir: string) (dryRun: bool)
        : Result<bool * int * int, string> =
        try
            let found =
                projectDirs |> List.tryPick (fun flat ->
                    let jsonlPath = Path.Combine(projectsDir, flat, sprintf "%s.jsonl" sessionId)
                    match tryReadFile jsonlPath with
                    | None -> None
                    | Some content ->
                        parseJsonlLines content 100
                        |> List.tryPick (fun line ->
                            envPatterns |> List.tryPick (fun pattern ->
                                let m = pattern.Match(line)
                                if m.Success then
                                    let inferredPath = m.Groups.[1].Value.Replace("\\\\", "/").Trim()
                                    if inferredPath.Length > 3 && not (inferredPath.Contains("undefined")) then
                                        Some (flat, inferredPath)
                                    else None
                                else None)))
            match found with
            | None -> Ok (false, 0, 0)
            | Some (flat, inferredPath) ->
                let metaPath = Path.Combine(projectsDir, flat, "metadata.json")
                let payload = sprintf """{"path":"%s"}""" (inferredPath.Replace("\\", "\\\\"))
                let wrote = writeMetaIfMissing metaPath payload dryRun
                Ok (true, (if not (existsSafe metaPath) || wrote then 1 else 0), (if wrote then 1 else 0))
        with ex ->
            Error (sprintf "EnvVars strategy failed: %s" ex.Message)

    /// Strategy 5: Check logs/current_todos.json for session→project mapping.
    let tryResolveByLogFile (sessionId: string) (todosDir: string) (projectsDir: string) (dryRun: bool)
        : Result<bool * int * int, string> =
        try
            let logsDir = Path.Combine(Path.GetDirectoryName(todosDir), "logs")
            let currentTodosPath = Path.Combine(logsDir, "current_todos.json")
            match tryReadFile currentTodosPath with
            | None -> Ok (false, 0, 0)
            | Some content ->
                if not (content.Contains(sessionId)) then Ok (false, 0, 0)
                else
                    let patterns = [
                        Regex(sprintf @"%s[^}]*""projectPath"":\s*""([^""]+)""" sessionId, RegexOptions.IgnoreCase)
                        Regex(sprintf @"%s[^}]*""path"":\s*""([^""]+)""" sessionId, RegexOptions.IgnoreCase)
                        Regex(sprintf @"""([^""]+)""[^}]*%s" sessionId, RegexOptions.IgnoreCase)
                    ]
                    let found =
                        patterns |> List.tryPick (fun pattern ->
                            let m = pattern.Match(content)
                            if m.Success then
                                let inferredPath = m.Groups.[1].Value.Replace("\\\\", "/").Trim()
                                if inferredPath.Length > 3 && not (inferredPath.Contains(sessionId)) then
                                    let flat = PathUtils.createFlattenedPath inferredPath
                                    let projDir = Path.Combine(projectsDir, flat)
                                    if existsSafe projDir then Some (flat, inferredPath)
                                    else None
                                else None
                            else None)
                    match found with
                    | None -> Ok (false, 0, 0)
                    | Some (flat, inferredPath) ->
                        let metaPath = Path.Combine(projectsDir, flat, "metadata.json")
                        let payload = sprintf """{"path":"%s"}""" (inferredPath.Replace("\\", "\\\\"))
                        let wrote = writeMetaIfMissing metaPath payload dryRun
                        Ok (true, (if not (existsSafe metaPath) || wrote then 1 else 0), (if wrote then 1 else 0))
        with ex ->
            Error (sprintf "LogFile strategy failed: %s" ex.Message)

    /// Run all 5 strategies in priority order for a single session.
    let resolveSession (sessionId: string) (todosDir: string) (projectsDir: string) (projectDirs: string list) (dryRun: bool)
        : {| Resolved: bool; Planned: int; Written: int; Strategy: string |} =
        let strategies: (string * (unit -> Result<bool * int * int, string>)) list = [
            "sidecar", fun () -> tryResolveBySidecar sessionId todosDir projectsDir dryRun
            "jsonl",   fun () -> tryResolveByJsonl sessionId projectDirs projectsDir dryRun
            "content", fun () -> tryResolveByContent sessionId projectDirs projectsDir dryRun
            "envvars", fun () -> tryResolveByEnvVars sessionId projectDirs projectsDir dryRun
            "logfile", fun () -> tryResolveByLogFile sessionId todosDir projectsDir dryRun
        ]
        let mutable result = {| Resolved = false; Planned = 0; Written = 0; Strategy = "" |}
        for (name, strategy) in strategies do
            if not result.Resolved then
                match strategy () with
                | Ok (true, planned, written) ->
                    writeSidecarMeta todosDir sessionId "" dryRun  // sidecar already written by strategy
                    result <- {| Resolved = true; Planned = planned; Written = written; Strategy = name |}
                | _ -> ()
        result

    /// Run full repair across all todo sessions.
    let repairProjectMetadata (projectsDir: string) (todosDir: string) (dryRun: bool) : RepairSummary =
        let mutable summary = {
            ProjectsScanned = 0; TodosScanned = 0
            MetadataWritten = 0; MetadataPlanned = 0
            MatchedBySidecar = 0; MatchedByJsonl = 0; MatchedByContent = 0
            MatchedByEnvironment = 0; MatchedByLogFile = 0
            UnknownSessions = []; DryRun = dryRun
        }

        // Phase 1: Ensure every valid flattened project dir has metadata.json
        let projectDirs =
            try
                Directory.GetDirectories(projectsDir) |> Array.map Path.GetFileName |> Array.toList
            with _ -> []
        summary <- { summary with ProjectsScanned = projectDirs.Length }

        for flat in projectDirs do
            let reconstructed = PathUtils.reconstructPath flat projectsDir
            if PathUtils.validatePath reconstructed then
                let metaPath = Path.Combine(projectsDir, flat, "metadata.json")
                let payload = sprintf """{"path":"%s"}""" (reconstructed.Replace("\\", "\\\\"))
                let wrote = writeMetaIfMissing metaPath payload dryRun
                if wrote then
                    summary <- { summary with MetadataWritten = summary.MetadataWritten + 1; MetadataPlanned = summary.MetadataPlanned + 1 }
                elif not (existsSafe metaPath) then
                    summary <- { summary with MetadataPlanned = summary.MetadataPlanned + 1 }

        // Phase 2: Scan todo sessions and resolve via 5 strategies
        if Directory.Exists(todosDir) then
            let todoFiles =
                try Directory.GetFiles(todosDir) |> Array.map Path.GetFileName |> Array.toList
                with _ -> []
            for file in todoFiles do
                let m = todoFileRegex.Match(file)
                if m.Success then
                    summary <- { summary with TodosScanned = summary.TodosScanned + 1 }
                    let sessionId = m.Groups.[1].Value
                    let result = resolveSession sessionId todosDir projectsDir projectDirs dryRun

                    if result.Resolved then
                        summary <- { summary with
                                        MetadataPlanned = summary.MetadataPlanned + result.Planned
                                        MetadataWritten = summary.MetadataWritten + result.Written }
                        match result.Strategy with
                        | "sidecar" -> summary <- { summary with MatchedBySidecar = summary.MatchedBySidecar + 1 }
                        | "jsonl"   -> summary <- { summary with MatchedByJsonl = summary.MatchedByJsonl + 1 }
                        | "content" -> summary <- { summary with MatchedByContent = summary.MatchedByContent + 1 }
                        | "envvars" -> summary <- { summary with MatchedByEnvironment = summary.MatchedByEnvironment + 1 }
                        | "logfile" -> summary <- { summary with MatchedByLogFile = summary.MatchedByLogFile + 1 }
                        | _ -> ()
                    else
                        summary <- { summary with
                                        UnknownSessions = (sessionId, file, "No match via sidecar, JSONL, content, env vars, or log files") :: summary.UnknownSessions }

        { summary with UnknownSessions = summary.UnknownSessions |> List.rev }
