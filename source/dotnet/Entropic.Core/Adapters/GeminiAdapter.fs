namespace Entropic.Core.Adapters

open System.IO
open System.Text.Json
open Entropic.Core

/// Google Gemini provider adapter.
/// Reads ~/.gemini/sessions/*.jsonl, using the slug field as project identifier.

// @must_test(REQ-PRV-003)
type GeminiAdapter(sessionsDir: string) =
    let mutable cache: (string * Project list) option = None

    let extractSlug (el: JsonElement) : string option =
        // Heuristic: look for repo/workspace/project URLs in the JSON
        let json = el.GetRawText().ToLowerInvariant()
        let patterns = [
            @"repo(?:sitory)?_url""\s*:\s*""([^""]+)"
            @"workspace""\s*:\s*""([^""]+)"
            @"project""\s*:\s*""([^""]+)"
        ]
        patterns
        |> List.tryPick (fun pattern ->
            let m = System.Text.RegularExpressions.Regex.Match(json, pattern)
            if m.Success then
                let tail = m.Groups.[1].Value.Split('/') |> Array.last
                Some (tail.Replace(".git", ""))
            else None)

    interface IProviderPort with
        member _.Id = "gemini"

        member _.FetchProjects() = async {
            let signature = JsonlParser.computeJsonlSignature sessionsDir
            match cache with
            | Some (cachedSig, cachedProjects) when cachedSig = signature -> return Ok cachedProjects
            | _ ->
                try
                    let files = JsonlParser.listJsonlFiles sessionsDir
                    let byProject = System.Collections.Generic.Dictionary<string, ResizeArray<Session> * int64>()
                    for f in files do
                        match JsonlParser.parseUpdatePlanJsonl f extractSlug with
                        | Ok (Some parsed) ->
                            let projectPath =
                                match parsed.Slug with
                                | Some slug -> sprintf "/gemini/%s" slug
                                | None -> "/gemini/Unknown Project"
                            let session: Session = {
                                Provider = "gemini"; SessionId = parsed.SessionId; FilePath = Some f
                                ProjectPath = Some projectPath; Todos = parsed.Todos
                                CreatedAt = None; UpdatedAt = parsed.UpdatedAt
                            }
                            match byProject.TryGetValue(projectPath) with
                            | true, (sessions, mostRecent) ->
                                sessions.Add(session)
                                let newMostRecent = max mostRecent (defaultArg parsed.UpdatedAt 0L)
                                byProject.[projectPath] <- (sessions, newMostRecent)
                            | false, _ ->
                                let sessions = ResizeArray<Session>()
                                sessions.Add(session)
                                byProject.[projectPath] <- (sessions, defaultArg parsed.UpdatedAt 0L)
                        | _ -> ()

                    let projects = [
                        for kv in byProject do
                            let projectPath = kv.Key
                            let sessions, mostRecent = kv.Value
                            let sessionList = sessions |> Seq.toList
                            let todoCount = sessionList |> List.sumBy (fun s -> s.Todos.Length)
                            let activeCount = sessionList |> List.sumBy (fun s -> s.Todos |> List.filter (fun t -> t.Status <> Completed) |> List.length)
                            yield {
                                Provider = "gemini"; ProjectPath = projectPath
                                FlattenedDir = Some (PathUtils.createFlattenedPath projectPath)
                                PathExists = Some false; Sessions = sessionList
                                Stats = Some { Todos = todoCount; Active = activeCount; Completed = todoCount - activeCount }
                                StartDate = None; MostRecentTodoDate = if mostRecent > 0L then Some mostRecent else None
                            }
                    ]
                    cache <- Some (signature, projects)
                    return Ok projects
                with ex ->
                    return Error (sprintf "Gemini fetch failed: %s" ex.Message)
        }

        member _.WatchChanges(_onChange) = fun () -> ()

        member _.CollectDiagnostics() = async {
            try
                let files = JsonlParser.listJsonlFiles sessionsDir
                let mutable total = 0
                let mutable unknown = 0
                for f in files do
                    match JsonlParser.parseUpdatePlanJsonl f extractSlug with
                    | Ok (Some parsed) ->
                        total <- total + 1
                        if parsed.Slug.IsNone then unknown <- unknown + 1
                    | _ -> ()
                return Ok {| UnknownCount = unknown; Details = sprintf "Gemini sessions: %d, without slug: %d" total unknown |}
            with ex ->
                return Error (sprintf "diagnostics failed: %s" ex.Message)
        }

        member this.RepairMetadata(_dryRun) = async {
            let! d = (this :> IProviderPort).CollectDiagnostics()
            match d with
            | Ok v -> return Ok {| Planned = 0; Written = 0; UnknownCount = v.UnknownCount |}
            | Error e -> return Error e
        }
