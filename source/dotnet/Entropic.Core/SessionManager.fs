namespace Entropic.Core

open System
open System.IO
open System.Text.Json

/// Session lifecycle management: mapping, merge, deletion, history.

// @must_test(REQ-SES-004)
// @must_test(REQ-SES-006)
// @must_test(REQ-SES-007)
// @must_test(REQ-SES-008)
// @must_test(REQ-SES-010)
module SessionManager =

    /// Read session-to-project mapping from sidecar metadata file (REQ-SES-004).
    let readProjectMapping (metaFilePath: string) : Result<string option, string> =
        try
            if not (File.Exists(metaFilePath)) then Ok None
            else
                let json = File.ReadAllText(metaFilePath)
                let doc = JsonDocument.Parse(json)
                match doc.RootElement.TryGetProperty("path") with
                | true, pathEl -> Ok (Some (pathEl.GetString()))
                | _ ->
                    match doc.RootElement.TryGetProperty("projectPath") with
                    | true, pathEl -> Ok (Some (pathEl.GetString()))
                    | _ -> Ok None
        with ex ->
            Error (sprintf "Failed to read metadata: %s" ex.Message)

    /// Write session-to-project mapping to sidecar metadata file.
    let writeProjectMapping (metaFilePath: string) (projectPath: string) : Result<unit, string> =
        try
            let dir = Path.GetDirectoryName(metaFilePath)
            if not (String.IsNullOrEmpty(dir)) && not (Directory.Exists(dir)) then
                Directory.CreateDirectory(dir) |> ignore
            let json = sprintf """{"path":"%s"}""" (projectPath.Replace("\\", "\\\\"))
            File.WriteAllText(metaFilePath, json)
            Ok ()
        with ex ->
            Error (sprintf "Failed to write metadata: %s" ex.Message)

    /// Merge multiple sessions into a target session (REQ-SES-006).
    /// Returns the merged session and counts of duplicate/new todos.
    let mergeSessions (target: Session) (sources: Session list) : {| Merged: Session; NewTodos: int; DuplicateTodos: int |} =
        let existingContents = target.Todos |> List.map (fun t -> t.Content) |> Set.ofList
        let mutable newTodos = []
        let mutable dupCount = 0
        for source in sources do
            for todo in source.Todos do
                if Set.contains todo.Content existingContents then
                    dupCount <- dupCount + 1
                else
                    newTodos <- todo :: newTodos
        let mergedTodos = target.Todos @ (newTodos |> List.rev)
        let mostRecent =
            (target :: sources)
            |> List.choose (fun s -> s.UpdatedAt)
            |> (fun l -> if l.IsEmpty then target.UpdatedAt else Some (List.max l))
        {| Merged = { target with Todos = mergedTodos; UpdatedAt = mostRecent }
           NewTodos = newTodos.Length
           DuplicateTodos = dupCount |}

    /// Delete a session's data file (REQ-SES-007).
    let deleteSession (session: Session) : Result<unit, string> =
        try
            match session.FilePath with
            | Some path when File.Exists(path) ->
                File.Delete(path)
                Ok ()
            | Some path -> Error (sprintf "Session file not found: %s" path)
            | None -> Error "Session has no file path"
        with ex ->
            Error (sprintf "Failed to delete session: %s" ex.Message)

    /// Load JSONL chat history for a session (REQ-SES-008).
    /// Returns (role, truncated_content) pairs.
    let loadHistory (jsonlPath: string) (maxChars: int) : Result<(string * string) list, string> =
        try
            if not (File.Exists(jsonlPath)) then Ok []
            else
                let lines = File.ReadAllLines(jsonlPath)
                let messages = [
                    for line in lines do
                        match JsonlParser.tryParseJson line with
                        | Some el ->
                            let role = match el.TryGetProperty("role") with true, v -> v.GetString() | _ -> ""
                            let content = match el.TryGetProperty("content") with true, v -> v.GetString() | _ -> ""
                            if role <> "" && content <> "" then
                                let truncated = if content.Length > maxChars then content.Substring(0, maxChars) + "..." else content
                                yield (role, truncated)
                        | None -> ()
                ]
                Ok messages
        with ex ->
            Error (sprintf "Failed to load history: %s" ex.Message)

    /// Batch-delete all empty sessions (zero todos) from a project (REQ-SES-010).
    /// Returns (successes, failures) counts.
    let deleteEmptySessions (sessions: Session list) : {| Deleted: int; Failed: int; Errors: string list |} =
        let empty = sessions |> List.filter (fun s -> s.Todos.IsEmpty)
        let mutable deleted = 0
        let mutable failed = 0
        let mutable errors = []
        for s in empty do
            match deleteSession s with
            | Ok () -> deleted <- deleted + 1
            | Error e -> failed <- failed + 1; errors <- e :: errors
        {| Deleted = deleted; Failed = failed; Errors = errors |> List.rev |}
