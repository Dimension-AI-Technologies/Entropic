namespace Entropic.Core

open System
open System.IO
open System.Text.RegularExpressions

/// Flattened directory path reconstruction and creation.
/// Claude (and other providers) flatten project paths into directory names
/// by replacing path separators with hyphens.

// @must_test(REQ-SES-005)
module PathUtils =

    /// Replace path separators and colons with hyphens.
    let createFlattenedPath (realPath: string) : string =
        Regex.Replace(realPath, @"[/\\:]", "-")

    /// List directory contents, returning Error if directory doesn't exist.
    let private listDirectory (dirPath: string) : Result<string list, string> =
        if not (Directory.Exists(dirPath)) then
            Error (sprintf "Directory does not exist: %s" dirPath)
        else
            try
                Directory.GetFileSystemEntries(dirPath)
                |> Array.map Path.GetFileName
                |> Array.toList
                |> Ok
            with ex ->
                Error (sprintf "Failed to list directory: %s" ex.Message)

    /// Greedy path reconstruction: walk the filesystem trying multi-part matches.
    let buildAndValidatePath (flatParts: string list) (isWindows: bool) : string option =
        let pathSep = if isWindows then "\\" else "/"
        let mutable currentPath = if isWindows then sprintf "%s:\\" flatParts.[0] else "/"
        let mutable consumedParts = if isWindows then 1 else 0
        let parts = flatParts |> Array.ofList

        while consumedParts < parts.Length do
            let remaining = parts.[consumedParts..]
            match listDirectory currentPath with
            | Error _ ->
                // Can't list, append remaining naively
                currentPath <- currentPath + (String.Join(pathSep, remaining))
                consumedParts <- parts.Length
            | Ok dirContents ->
                let mutable bestMatch: string option = None
                let mutable bestMatchLength = 0

                let maxParts = min remaining.Length 5
                for numParts in maxParts .. -1 .. 1 do
                    if bestMatch.IsNone then
                        let testParts = remaining.[..numParts - 1]
                        let candidates = [
                            yield String.Join("-", testParts)
                            if numParts = 2 then yield String.Join(".", testParts)
                            if numParts = 1 then yield "." + testParts.[0]
                        ]
                        for candidate in candidates do
                            if bestMatch.IsNone then
                                if dirContents |> List.contains candidate then
                                    bestMatch <- Some candidate
                                    bestMatchLength <- numParts
                                else
                                    match dirContents |> List.tryFind (fun e -> e.ToLowerInvariant().StartsWith(candidate.ToLowerInvariant())) with
                                    | Some entry ->
                                        bestMatch <- Some entry
                                        bestMatchLength <- numParts
                                    | None -> ()

                match bestMatch with
                | Some m ->
                    currentPath <- currentPath + m
                    consumedParts <- consumedParts + bestMatchLength
                | None ->
                    currentPath <- currentPath + remaining.[0]
                    consumedParts <- consumedParts + 1

                if consumedParts < parts.Length then
                    currentPath <- currentPath + pathSep

        Some currentPath

    /// Reconstruct a real filesystem path from a flattened directory name.
    /// Checks metadata.json first, then uses greedy filesystem matching.
    let reconstructPath (flatPath: string) (projectsDir: string) : string =
        // Check metadata first
        let metadataPath = Path.Combine(projectsDir, flatPath, "metadata.json")
        if File.Exists(metadataPath) then
            try
                let json = File.ReadAllText(metadataPath)
                let doc = System.Text.Json.JsonDocument.Parse(json)
                match doc.RootElement.TryGetProperty("path") with
                | true, pathEl -> pathEl.GetString()
                | _ -> flatPath
            with _ -> flatPath
        else
            // Windows-style: C--Users-username-...
            let windowsMatch = Regex.Match(flatPath, @"^([A-Z])--(.+)$")
            if windowsMatch.Success then
                let driveLetter = windowsMatch.Groups.[1].Value
                let restOfPath = windowsMatch.Groups.[2].Value
                let rawParts = restOfPath.Split('-')
                let flatParts = ResizeArray<string>()
                let mutable i = 0
                while i < rawParts.Length do
                    if rawParts.[i] = "" && i + 1 < rawParts.Length then
                        flatParts.Add("." + rawParts.[i + 1])
                        i <- i + 2
                    elif rawParts.[i] <> "" then
                        flatParts.Add(rawParts.[i])
                        i <- i + 1
                    else
                        i <- i + 1
                let allParts = driveLetter :: (flatParts |> Seq.toList)
                match buildAndValidatePath allParts true with
                | Some p -> p
                | None -> sprintf "%s:\\" driveLetter + String.Join("\\", flatParts)
            // Unix-style: starts with dash
            elif flatPath.StartsWith("-") then
                let rawParts = flatPath.Split('-') |> Array.filter (fun p -> p.Length > 0) |> Array.toList
                match buildAndValidatePath rawParts false with
                | Some p -> p
                | None -> "/" + String.Join("/", rawParts)
            else
                flatPath

    /// Validate whether a path exists on the filesystem.
    let validatePath (testPath: string) : bool =
        Directory.Exists(testPath) || File.Exists(testPath)
