namespace Entropic.Core

open System
open System.IO
open System.Text.Json

/// Shared JSONL parsing utilities used by Codex and Gemini adapters.
module JsonlParser =

    /// Safely parse a single JSON line, returning None on failure.
    let tryParseJson (line: string) : JsonElement option =
        if String.IsNullOrWhiteSpace(line) then None
        else
            try
                let doc = JsonDocument.Parse(line)
                Some (doc.RootElement.Clone())
            with _ -> None

    /// Normalize a status string to TodoStatus.
    let normalizeStatus (s: string) : TodoStatus =
        let v = (s |> Option.ofObj |> Option.defaultValue "").ToLowerInvariant()
        if v.StartsWith("in") then InProgress
        elif v.StartsWith("comp") then Completed
        else Pending

    /// Recursively find all .jsonl files under a directory (max depth 6).
    let listJsonlFiles (root: string) : string list =
        let results = ResizeArray<string>()
        let rec walk (dir: string) (depth: int) =
            if depth > 6 then ()
            elif not (Directory.Exists(dir)) then ()
            else
                try
                    for entry in Directory.GetFileSystemEntries(dir) do
                        try
                            if Directory.Exists(entry) then
                                walk entry (depth + 1)
                            elif entry.EndsWith(".jsonl", StringComparison.OrdinalIgnoreCase) then
                                results.Add(entry)
                        with _ -> ()
                with _ -> ()
        walk root 0
        results |> Seq.toList

    // @must_test(REQ-ARC-005)
    /// Compute a signature for a directory of JSONL files (count + max mtime).
    let computeJsonlSignature (root: string) : string =
        let mutable count = 0
        let mutable maxMtime = 0L
        let rec walk (dir: string) (depth: int) =
            if depth > 6 then ()
            elif not (Directory.Exists(dir)) then ()
            else
                try
                    for entry in Directory.GetFileSystemEntries(dir) do
                        try
                            let info = FileInfo(entry)
                            if info.Attributes.HasFlag(FileAttributes.Directory) then
                                walk entry (depth + 1)
                            elif entry.EndsWith(".jsonl", StringComparison.OrdinalIgnoreCase) then
                                count <- count + 1
                                let mtime = info.LastWriteTimeUtc.Ticks
                                if mtime > maxMtime then maxMtime <- mtime
                        with _ -> ()
                with _ -> ()
        walk root 0
        sprintf "c:%d|m:%d" count maxMtime

    /// Parse an update_plan style JSONL file (used by Codex and Gemini).
    /// Returns sessionId, updatedAt, project identifier, and todos.
    let parseUpdatePlanJsonl (file: string) (slugExtractor: JsonElement -> string option) : Result<{| SessionId: string; UpdatedAt: int64 option; Slug: string option; Todos: Todo list |} option, string> =
        try
            let lines = File.ReadAllLines(file) |> Array.filter (fun l -> l.Length > 0)
            let mutable sessionId = ""
            let mutable updatedAt: int64 option = None
            let mutable slug: string option = None

            // First 10 lines for id/slug
            for line in lines |> Array.truncate 10 do
                match tryParseJson line with
                | Some el ->
                    if sessionId = "" then
                        let tryGet (name: string) = match el.TryGetProperty(name) with true, v -> v.GetString() | _ -> null
                        let id = tryGet "id" |> Option.ofObj |> Option.orElseWith (fun () -> tryGet "session_id" |> Option.ofObj)
                        id |> Option.iter (fun v -> sessionId <- v)
                    if slug.IsNone then
                        slug <- slugExtractor el
                | None -> ()

            // Parse all lines for timestamps and update_plan
            let mutable lastPlan: (string * string) list option = None
            for line in lines do
                match tryParseJson line with
                | Some el ->
                    match el.TryGetProperty("timestamp") with
                    | true, ts ->
                        match DateTimeOffset.TryParse(ts.GetString()) with
                        | true, dto ->
                            let ms = dto.ToUnixTimeMilliseconds()
                            match updatedAt with
                            | None -> updatedAt <- Some ms
                            | Some prev when ms > prev -> updatedAt <- Some ms
                            | _ -> ()
                        | _ -> ()
                    | _ -> ()

                    match el.TryGetProperty("type"), el.TryGetProperty("name") with
                    | (true, typeEl), (true, nameEl) when typeEl.GetString() = "function_call" && (nameEl.GetString() = "update_plan" || nameEl.GetString() = "updatePlan") ->
                        match el.TryGetProperty("arguments") with
                        | true, argsEl ->
                            let argDoc =
                                if argsEl.ValueKind = JsonValueKind.String then
                                    tryParseJson (argsEl.GetString())
                                else Some argsEl
                            argDoc |> Option.iter (fun args ->
                                match args.TryGetProperty("plan") with
                                | true, planEl when planEl.ValueKind = JsonValueKind.Array ->
                                    let items = [
                                        for item in planEl.EnumerateArray() do
                                            let status = match item.TryGetProperty("status") with true, v -> v.GetString() | _ -> "pending"
                                            let step = match item.TryGetProperty("step") with true, v -> v.GetString() | _ -> ""
                                            yield (status, step)
                                    ]
                                    lastPlan <- Some items
                                | _ -> ())
                        | _ -> ()
                    | _ -> ()
                | None -> ()

            let todos =
                match lastPlan with
                | Some plan ->
                    plan |> List.map (fun (status, step) ->
                        { Id = None; Content = step; Status = normalizeStatus status
                          CreatedAt = None; UpdatedAt = updatedAt; ActiveForm = None })
                | None -> []

            if sessionId = "" then
                let baseName = Path.GetFileNameWithoutExtension(file)
                let parts = baseName.Split('-')
                if parts.Length > 0 then sessionId <- parts.[parts.Length - 1]

            Ok (Some {| SessionId = sessionId; UpdatedAt = updatedAt; Slug = slug; Todos = todos |})
        with ex ->
            // Graceful degradation: return None so callers can skip this file
            eprintfn "[JsonlParser] Failed to parse %s: %s" file ex.Message
            Ok None
