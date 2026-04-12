namespace Entropic.Core

/// Diagnostics and repair orchestration across all providers.

// @must_test(REQ-DGN-001)
// @must_test(REQ-DGN-002)
// @must_test(REQ-DGN-003)
// @must_test(REQ-DGN-004)
// @must_test(REQ-DGN-005)
module Diagnostics =

    type DiagnosticReport = {
        PerProvider: (string * int * string) list  // (providerId, unknownCount, details)
        TotalUnanchored: int
    }

    type RepairResult = {
        PerProvider: (string * int * int) list  // (providerId, planned, written)
        TotalPlanned: int
        TotalWritten: int
    }

    /// Collect diagnostics from all providers (REQ-DGN-001, REQ-DGN-005).
    let collectAll (providers: IProviderPort list) : Async<Result<DiagnosticReport, string>> =
        async {
            let! results =
                providers
                |> List.map (fun p -> async {
                    let! d = p.CollectDiagnostics()
                    return (p.Id, d)
                })
                |> Async.Parallel
            let entries =
                results
                |> Array.choose (fun (id, r) ->
                    match r with
                    | Ok v -> Some (id, v.UnknownCount, v.Details)
                    | Error _ -> None)
                |> Array.toList
            let errors =
                results
                |> Array.choose (fun (_, r) -> match r with Error e -> Some e | Ok _ -> None)
                |> Array.toList
            if errors.Length > 0 && entries.Length = 0 then
                return Error (errors |> List.head)
            else
                let total = entries |> List.sumBy (fun (_, c, _) -> c)
                return Ok { PerProvider = entries; TotalUnanchored = total }
        }

    /// Check if startup repair prompt should be shown (REQ-DGN-002).
    let shouldPromptRepair (report: DiagnosticReport) (threshold: int) : bool =
        report.TotalUnanchored > threshold

    /// Run repair across all providers (REQ-DGN-003, REQ-DGN-004).
    let repairAll (providers: IProviderPort list) (dryRun: bool) : Async<Result<RepairResult, string>> =
        async {
            let! results =
                providers
                |> List.map (fun p -> async {
                    let! r = p.RepairMetadata(dryRun)
                    return (p.Id, r)
                })
                |> Async.Parallel
            let entries =
                results
                |> Array.choose (fun (id, r) ->
                    match r with
                    | Ok v -> Some (id, v.Planned, v.Written)
                    | Error _ -> None)
                |> Array.toList
            let errors =
                results
                |> Array.choose (fun (_, r) -> match r with Error e -> Some e | Ok _ -> None)
                |> Array.toList
            if errors.Length > 0 && entries.Length = 0 then
                return Error (errors |> List.head)
            else
                let totalPlanned = entries |> List.sumBy (fun (_, p, _) -> p)
                let totalWritten = entries |> List.sumBy (fun (_, _, w) -> w)
                return Ok { PerProvider = entries; TotalPlanned = totalPlanned; TotalWritten = totalWritten }
        }
