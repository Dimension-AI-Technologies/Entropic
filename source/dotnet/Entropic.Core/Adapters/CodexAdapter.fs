namespace Entropic.Core.Adapters

open System.IO
open System.Text.Json
open Entropic.Core

/// OpenAI Codex provider adapter.
/// Reads ~/.codex/sessions/ directories, parsing rollout-*.jsonl files.

// @must_test(REQ-PRV-002)
type CodexAdapter(sessionsDir: string) =
    let mutable cache: (string * Project list) option = None

    let extractSlug (el: JsonElement) : string option =
        // Look for git.repository_url
        match el.TryGetProperty("git") with
        | true, gitEl ->
            match gitEl.TryGetProperty("repository_url") with
            | true, urlEl ->
                let url = urlEl.GetString()
                let tail = url.Split('/') |> Array.last
                Some (tail.Replace(".git", ""))
            | _ -> None
        | _ -> None

    interface IProviderPort with
        member _.Id = "codex"

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
                                | Some slug -> sprintf "/codex/%s" slug
                                | None -> "/codex/Unknown Project"
                            let session: Session = {
                                Provider = "codex"; SessionId = parsed.SessionId; FilePath = Some f
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
                                Provider = "codex"; ProjectPath = projectPath
                                FlattenedDir = Some (PathUtils.createFlattenedPath projectPath)
                                PathExists = Some false; Sessions = sessionList
                                Stats = Some { Todos = todoCount; Active = activeCount; Completed = todoCount - activeCount }
                                StartDate = None; MostRecentTodoDate = if mostRecent > 0L then Some mostRecent else None
                            }
                    ]
                    cache <- Some (signature, projects)
                    return Ok projects
                with ex ->
                    return Error (sprintf "Codex fetch failed: %s" ex.Message)
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
                return Ok {| UnknownCount = unknown; Details = sprintf "Codex sessions: %d, without repo: %d" total unknown |}
            with ex ->
                return Error (sprintf "diagnostics failed: %s" ex.Message)
        }

        member this.RepairMetadata(_dryRun) = async {
            // No write-side repair for Codex yet
            let! d = (this :> IProviderPort).CollectDiagnostics()
            match d with
            | Ok v -> return Ok {| Planned = 0; Written = 0; UnknownCount = v.UnknownCount |}
            | Error e -> return Error e
        }
