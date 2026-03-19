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

    let loadSessionsForProject (projectDirPath: string) (projectPath: string) : Session list =
        try
            let files = Directory.GetFiles(projectDirPath, ".session_*.json")
            [ for f in files do
                let info = FileInfo(f)
                let sessionId =
                    let name = Path.GetFileNameWithoutExtension(f)
                    if name.StartsWith(".session_") then name.Substring(9) else name
                // Check for matching todo file
                let todoFile = Path.Combine(todosDir, sprintf "%s-agent-%s.json" sessionId sessionId)
                let todos =
                    if File.Exists(todoFile) then loadTodosFromFile todoFile
                    else []
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
                                let sessions = loadSessionsForProject dir reconstructed
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
            // Simplified: scan todos dir, write metadata for unanchored sessions
            try
                let mutable planned = 0
                let mutable written = 0
                let mutable unknownCount = 0
                if Directory.Exists(todosDir) then
                    for f in Directory.GetFiles(todosDir, "*-agent*.json") do
                        let metaFile = Path.ChangeExtension(f, ".meta.json")
                        if not (File.Exists(metaFile)) then
                            planned <- planned + 1
                            unknownCount <- unknownCount + 1
                            if not dryRun then
                                // Try to infer project path from directory structure
                                File.WriteAllText(metaFile, """{"path":"unknown"}""")
                                written <- written + 1
                return Ok {| Planned = planned; Written = written; UnknownCount = unknownCount |}
            with ex ->
                return Error (sprintf "repair failed: %s" ex.Message)
        }
