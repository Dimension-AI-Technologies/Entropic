namespace Entropic.Core

open System
open System.IO
open System.Text.Json

/// Sorting, filtering, and status logic for TODOs.

module TodoManager =

    /// Status priority for sorting: InProgress first, then Pending, then Completed.
    let private statusPriority (status: TodoStatus) =
        match status with
        | InProgress -> 0
        | Pending -> 1
        | Completed -> 2

    // @must_test(REQ-TOD-009)
    let sortByStatus (todos: Todo list) : Todo list =
        todos |> List.sortBy (fun t -> statusPriority t.Status)

    // @must_test(REQ-TOD-011)
    let filterActive (todos: Todo list) : Todo list =
        todos |> List.filter (fun t -> t.Status <> Completed)

    // @must_test(REQ-TOD-006)
    /// Get display text for a todo: uses ActiveForm when in-progress, else Content.
    let displayText (todo: Todo) : string =
        match todo.Status, todo.ActiveForm with
        | InProgress, Some form when form.Length > 0 -> form
        | _ -> todo.Content

    // @must_test(REQ-SES-009)
    /// Sort sessions by last modification time, most recent first.
    let sortSessionsByDate (sessions: Session list) : Session list =
        sessions |> List.sortByDescending (fun s -> defaultArg s.UpdatedAt 0L)

    /// Count todos by status across sessions.
    let countByStatus (sessions: Session list) : {| Pending: int; InProgress: int; Completed: int |} =
        let all = sessions |> List.collect (fun s -> s.Todos)
        {| Pending = all |> List.filter (fun t -> t.Status = Pending) |> List.length
           InProgress = all |> List.filter (fun t -> t.Status = InProgress) |> List.length
           Completed = all |> List.filter (fun t -> t.Status = Completed) |> List.length |}

    // @must_test(REQ-TOD-010)
    /// Persist todos to a JSON file at the specified path.
    let persistTodos (filePath: string) (todos: Todo list) : Result<unit, string> =
        try
            let dir = Path.GetDirectoryName(filePath)
            if not (String.IsNullOrEmpty(dir)) && not (Directory.Exists(dir)) then
                Directory.CreateDirectory(dir) |> ignore
            let statusStr (s: TodoStatus) = match s with Pending -> "pending" | InProgress -> "in_progress" | Completed -> "completed"
            let items = todos |> List.map (fun t ->
                let obj = System.Collections.Generic.Dictionary<string, obj>()
                obj.["content"] <- t.Content
                obj.["status"] <- statusStr t.Status
                t.Id |> Option.iter (fun id -> obj.["id"] <- id)
                t.ActiveForm |> Option.iter (fun af -> obj.["activeForm"] <- af)
                obj)
            let json = JsonSerializer.Serialize(items, JsonSerializerOptions(WriteIndented = true))
            File.WriteAllText(filePath, json)
            Ok ()
        with ex ->
            Error (sprintf "Failed to persist todos: %s" ex.Message)

    /// Load todos from a JSON file.
    let loadTodos (filePath: string) : Result<Todo list, string> =
        try
            if not (File.Exists(filePath)) then Ok []
            else
                let json = File.ReadAllText(filePath)
                let doc = JsonDocument.Parse(json)
                let todos = [
                    for el in doc.RootElement.EnumerateArray() do
                        let content = match el.TryGetProperty("content") with true, v -> v.GetString() | _ -> ""
                        let status = match el.TryGetProperty("status") with true, v -> v.GetString() | _ -> "pending"
                        let id = match el.TryGetProperty("id") with true, v -> Some(v.GetString()) | _ -> None
                        let activeForm = match el.TryGetProperty("activeForm") with true, v -> Some(v.GetString()) | _ -> None
                        let todoStatus =
                            let v = (status |> Option.ofObj |> Option.defaultValue "").ToLowerInvariant()
                            if v.StartsWith("in") then InProgress
                            elif v.StartsWith("comp") then Completed
                            else Pending
                        yield { Id = id; Content = content; Status = todoStatus
                                CreatedAt = None; UpdatedAt = None; ActiveForm = activeForm }
                ]
                Ok todos
        with ex ->
            Error (sprintf "Failed to load todos: %s" ex.Message)
