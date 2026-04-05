namespace Entropic.Core.Adapters

open System
open System.IO
open System.Text.Json
open System.Text.RegularExpressions
open Entropic.Core

/// Claude Code provider adapter.
/// Reads ~/.claude/projects/ and ~/.claude/todos/ directories.

// @must_test(REQ-PRV-001)
type ClaudeAdapter(projectsDir: string, todosDir: string) =
    let mutable cache: (string * Project list) option = None

    let computeSignature () =
        let pCount = try Directory.GetDirectories(projectsDir).Length with _ -> 0
        let tCount =
            try
                Directory.GetFiles(todosDir)
                |> Array.filter (fun f -> Regex.IsMatch(Path.GetFileName(f), @"-agent(?:-[0-9a-f-]+)?\.json$"))
                |> Array.length
            with _ -> 0
        sprintf "p:%d|t:%d" pCount tCount

    let parseTodoStatus (s: string) : TodoStatus =
        match s with
        | "in_progress" -> InProgress
        | "completed" -> Completed
        | _ -> Pending

    let loadTodosFromFile (filePath: string) : Todo list =
        try
            let json = File.ReadAllText(filePath)
            let doc = JsonDocument.Parse(json)
            [ for el in doc.RootElement.EnumerateArray() do
                let content = match el.TryGetProperty("content") with true, v -> v.GetString() | _ -> ""
                let status = match el.TryGetProperty("status") with true, v -> v.GetString() | _ -> "pending"
                let id = match el.TryGetProperty("id") with true, v -> Some(v.GetString()) | _ -> None
                let activeForm = match el.TryGetProperty("activeForm") with true, v -> Some(v.GetString()) | _ -> None
                yield { Id = id; Content = content; Status = parseTodoStatus status
                        CreatedAt = None; UpdatedAt = None; ActiveForm = activeForm } ]
        with _ -> []

    let loadSessionsFromIndex (projectDirPath: string) (projectPath: string) : Session list =
        try
            let indexPath = Path.Combine(projectDirPath, "sessions-index.json")
            if File.Exists(indexPath) then
                let json = File.ReadAllText(indexPath)
                let doc = JsonDocument.Parse(json)
                match doc.RootElement.TryGetProperty("entries") with
                | true, entries ->
                    [ for el in entries.EnumerateArray() do
                        let sessionId = match el.TryGetProperty("sessionId") with true, v -> v.GetString() | _ -> ""
                        if sessionId <> "" then
                            let jsonlPath = Path.Combine(projectDirPath, sprintf "%s.jsonl" sessionId)
                            let info = if File.Exists(jsonlPath) then Some (FileInfo(jsonlPath)) else None
                            // Match todo file: {sessionId}-agent-{sessionId}.json in todos dir
                            let todos =
                                try
                                    let todoFiles = Directory.GetFiles(todosDir, sprintf "%s-agent-*.json" sessionId)
                                    todoFiles |> Array.toList |> List.collect loadTodosFromFile
                                with _ -> []
                            let created = match el.TryGetProperty("created") with
                                          | true, v ->
                                              try Some (DateTimeOffset.Parse(v.GetString()).ToUnixTimeMilliseconds()) with _ -> None
                                          | _ -> None
                            let modified = match info with
                                           | Some i -> Some (i.LastWriteTimeUtc.Ticks / TimeSpan.TicksPerMillisecond)
                                           | None -> created
                            yield {
                                Provider = "claude"; SessionId = sessionId; FilePath = Some jsonlPath
                                ProjectPath = Some projectPath; Todos = todos
                                CreatedAt = created; UpdatedAt = modified
                            } ]
                | _ -> []
            else
                // Fallback: scan for *.jsonl files directly
                let files = Directory.GetFiles(projectDirPath, "*.jsonl")
                [ for f in files do
                    let info = FileInfo(f)
                    let sessionId = Path.GetFileNameWithoutExtension(f)
                    let todos =
                        try
                            let todoFiles = Directory.GetFiles(todosDir, sprintf "%s-agent-*.json" sessionId)
                            todoFiles |> Array.toList |> List.collect loadTodosFromFile
                        with _ -> []
                    yield {
                        Provider = "claude"; SessionId = sessionId; FilePath = Some f
                        ProjectPath = Some projectPath; Todos = todos
                        CreatedAt = Some (info.CreationTimeUtc.Ticks / TimeSpan.TicksPerMillisecond)
                        UpdatedAt = Some (info.LastWriteTimeUtc.Ticks / TimeSpan.TicksPerMillisecond)
                    } ]
        with _ -> []

    interface IProviderPort with
        member _.Id = "claude"

        member _.FetchProjects() = async {
            let signature = computeSignature()
            match cache with
            | Some (cachedSig, cachedProjects) when cachedSig = signature ->
                return Ok cachedProjects
            | _ ->
                try
                    if not (Directory.Exists(projectsDir)) then
                        return Ok []
                    else
                        let dirs = Directory.GetDirectories(projectsDir)
                        let projects = [
                            for dir in dirs do
                                let flattenedDir = Path.GetFileName(dir)
                                let reconstructed = PathUtils.reconstructPath flattenedDir projectsDir
                                let pathExists = Directory.Exists(reconstructed)
                                let sessions = loadSessionsFromIndex dir reconstructed
                                let todoCount = sessions |> List.sumBy (fun s -> s.Todos.Length)
                                let activeCount = sessions |> List.sumBy (fun s -> s.Todos |> List.filter (fun t -> t.Status <> Completed) |> List.length)
                                let mostRecent = sessions |> List.choose (fun s -> s.UpdatedAt) |> (fun l -> if l.IsEmpty then None else Some (List.max l))
                                yield {
                                    Provider = "claude"; ProjectPath = reconstructed
                                    FlattenedDir = Some flattenedDir; PathExists = Some pathExists
                                    Sessions = sessions
                                    Stats = Some { Todos = todoCount; Active = activeCount; Completed = todoCount - activeCount }
                                    StartDate = None; MostRecentTodoDate = mostRecent
                                }
                        ]
                        cache <- Some (signature, projects)
                        return Ok projects
                with ex ->
                    return Error (sprintf "Claude fetch failed: %s" ex.Message)
        }

        member _.WatchChanges(_onChange) = fun () -> ()

        member _.CollectDiagnostics() = async {
            try
                // Count sessions without metadata
                let mutable total = 0
                let mutable unknown = 0
                if Directory.Exists(todosDir) then
                    for f in Directory.GetFiles(todosDir, "*-agent*.json") do
                        total <- total + 1
                        let metaFile = Path.ChangeExtension(f, ".meta.json")
                        if not (File.Exists(metaFile)) then unknown <- unknown + 1
                return Ok {| UnknownCount = unknown; Details = sprintf "Claude sessions: %d, unanchored: %d" total unknown |}
            with ex ->
                return Error (sprintf "diagnostics failed: %s" ex.Message)
        }

        member _.RepairMetadata(dryRun) = async {
            try
                let summary = RepairStrategies.repairProjectMetadata projectsDir todosDir dryRun
                return Ok {| Planned = summary.MetadataPlanned; Written = summary.MetadataWritten; UnknownCount = summary.UnknownSessions.Length |}
            with ex ->
                return Error (sprintf "repair failed: %s" ex.Message)
        }
