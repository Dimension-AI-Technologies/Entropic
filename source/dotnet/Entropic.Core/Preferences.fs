namespace Entropic.Core

open System
open System.IO
open System.Text.Json

/// JSON file-based configuration persistence.

// @must_test(REQ-PLT-006)
module Preferences =

    let private defaultPath () =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".entropic", "prefs.json")

    let private ensureDir (filePath: string) =
        let dir = Path.GetDirectoryName(filePath)
        if not (String.IsNullOrEmpty(dir)) && not (Directory.Exists(dir)) then
            Directory.CreateDirectory(dir) |> ignore

    let private loadDoc (filePath: string) : JsonDocument option =
        if File.Exists(filePath) then
            try Some (JsonDocument.Parse(File.ReadAllText(filePath)))
            with _ -> None
        else None

    /// Get a string value from prefs.json.
    let getString (key: string) (filePath: string option) : string option =
        let path = filePath |> Option.defaultWith defaultPath
        match loadDoc path with
        | Some doc ->
            match doc.RootElement.TryGetProperty(key) with
            | true, el when el.ValueKind = JsonValueKind.String -> Some (el.GetString())
            | _ -> None
        | None -> None

    /// Get an int value from prefs.json.
    let getInt (key: string) (fallback: int) (filePath: string option) : int =
        let path = filePath |> Option.defaultWith defaultPath
        match loadDoc path with
        | Some doc ->
            match doc.RootElement.TryGetProperty(key) with
            | true, el -> match el.TryGetInt32() with true, v -> v | _ -> fallback
            | _ -> fallback
        | None -> fallback

    /// Get a bool value from prefs.json.
    let getBool (key: string) (fallback: bool) (filePath: string option) : bool =
        let path = filePath |> Option.defaultWith defaultPath
        match loadDoc path with
        | Some doc ->
            match doc.RootElement.TryGetProperty(key) with
            | true, el when el.ValueKind = JsonValueKind.True -> true
            | true, el when el.ValueKind = JsonValueKind.False -> false
            | _ -> fallback
        | None -> fallback

    // @must_test(REQ-DGN-006)
    /// Get repair threshold (default: 5).
    let getRepairThreshold (filePath: string option) : int =
        getInt "repair.threshold" 5 filePath

    // @must_test(REQ-DGN-007)
    /// Get default dry-run setting (default: true).
    let getDefaultDryRun (filePath: string option) : bool =
        getBool "repair.defaultDryRun" true filePath
