namespace Entropic.Core

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
