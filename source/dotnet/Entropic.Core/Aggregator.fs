namespace Entropic.Core

open System.Collections.Generic

/// Merges data from multiple providers, deduplicating projects
/// by (provider, projectPath) and sessions by (provider, sessionId).

// @must_test(REQ-PRV-008)
module Aggregator =

    let private optMax a b =
        match a, b with
        | None, x | x, None -> x
        | Some a', Some b' -> Some(max a' b')

    let private optMin a b =
        match a, b with
        | None, x | x, None -> x
        | Some a', Some b' -> Some(min a' b')

    let private combineStats (a: ProjectStats option) (b: ProjectStats option) : ProjectStats option =
        match a, b with
        | None, x | x, None -> x
        | Some a', Some b' ->
            let todos = a'.Todos + b'.Todos
            let active = a'.Active + b'.Active
            Some { Todos = todos; Active = active; Completed = todos - active }

    let mergeProjects (items: Project list) : Project list =
        let map = Dictionary<string, Project>()
        for p in items do
            let key = sprintf "%s::%s" p.Provider p.ProjectPath
            match map.TryGetValue(key) with
            | false, _ ->
                map.[key] <- { p with Sessions = p.Sessions }
            | true, existing ->
                let seen =
                    existing.Sessions
                    |> List.map (fun s -> sprintf "%s::%s" s.Provider s.SessionId)
                    |> Set.ofList
                let newSessions =
                    p.Sessions
                    |> List.filter (fun s ->
                        let skey = sprintf "%s::%s" s.Provider s.SessionId
                        not (Set.contains skey seen))
                let merged = {
                    existing with
                        Sessions = existing.Sessions @ newSessions
                        MostRecentTodoDate = optMax existing.MostRecentTodoDate p.MostRecentTodoDate
                        StartDate = optMin existing.StartDate p.StartDate
                        Stats = combineStats existing.Stats p.Stats
                        PathExists = Some (defaultArg existing.PathExists false || defaultArg p.PathExists false)
                }
                map.[key] <- merged
        map.Values |> Seq.toList

    let getProjects (providers: IProviderPort list) (events: IEventPort option) : Async<Result<Project list, string>> =
        async {
            let! results =
                providers
                |> List.map (fun p -> p.FetchProjects())
                |> Async.Parallel
            let results = results |> Array.toList
            let failures = results |> List.filter (fun r -> match r with Error _ -> true | Ok _ -> false)
            if failures.Length > 0 && failures.Length = results.Length then
                let firstError =
                    match failures.[0] with
                    | Error e -> e
                    | Ok _ -> "All providers failed"
                return Error firstError
            else
                let all =
                    results
                    |> List.collect (fun r -> match r with Ok projects -> projects | Error _ -> [])
                let merged = mergeProjects all
                events |> Option.iter (fun e -> try e.DataChanged() with _ -> ())
                return Ok merged
        }
