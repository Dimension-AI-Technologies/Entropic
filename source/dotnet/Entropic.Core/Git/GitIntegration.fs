namespace Entropic.Core.Git

open System
open System.Diagnostics
open System.IO

// @must_test(REQ-GIT-001)
// @must_test(REQ-GIT-002)
type GitRepoStatus = {
    Name: string
    RelativePath: string
    Languages: string list
    RemoteUrl: string option
    LastLocalCommit: string option
    LastRemoteCommit: string option
    Ahead: int
    Behind: int
}

// @must_test(REQ-GIT-005)
type CommitStats = {
    Additions: int
    Deletions: int
    TotalLines: int
    FilesAdded: int
    FilesChanged: int
    FilesDeleted: int
}

type GitCommit = {
    Hash: string
    Date: string
    Message: string
    AuthorName: string
    AuthorEmail: string option
    CoAuthors: string list
    Stats: CommitStats
}

type GitCommitSummary = {
    Repo: string
    RelativePath: string
    Commits: GitCommit list
}

module GitIntegration =

    let private runGit (workDir: string) (args: string) : Result<string, string> =
        try
            let psi = ProcessStartInfo("git", args)
            psi.WorkingDirectory <- workDir
            psi.RedirectStandardOutput <- true
            psi.RedirectStandardError <- true
            psi.UseShellExecute <- false
            psi.CreateNoWindow <- true
            let p = Process.Start(psi)
            let output = p.StandardOutput.ReadToEnd()
            p.WaitForExit(15000) |> ignore
            if p.ExitCode = 0 then Ok (output.TrimEnd())
            else Error (p.StandardError.ReadToEnd().TrimEnd())
        with ex -> Error ex.Message

    // @must_test(REQ-GIT-004)
    let private detectLanguages (repoPath: string) : string list =
        let extMap = Map [
            ".ts", "TypeScript"; ".tsx", "TypeScript"; ".js", "JavaScript"; ".jsx", "JavaScript"
            ".py", "Python"; ".go", "Go"; ".rs", "Rust"; ".java", "Java"; ".kt", "Kotlin"
            ".cs", "C#"; ".fs", "F#"; ".rb", "Ruby"; ".cpp", "C++"; ".c", "C"
            ".swift", "Swift"; ".zig", "Zig"; ".odin", "Odin"; ".nim", "Nim"
        ]
        try
            Directory.GetFiles(repoPath, "*.*", SearchOption.AllDirectories)
            |> Array.choose (fun f ->
                let ext = Path.GetExtension(f).ToLowerInvariant()
                Map.tryFind ext extMap)
            |> Array.distinct
            |> Array.toList
        with _ -> []

    let private skipDirs = Set.ofList [
        "node_modules"; "bin"; "obj"; "dist"; "AppData"; "OneDrive"
        ".nuget"; ".dotnet"; ".vscode"; ".vs"; "packages"
    ]

    let private addRepo (repos: ResizeArray<GitRepoStatus>) (rootPath: string) (dir: string) =
        let name = Path.GetFileName(dir)
        let relativePath = Path.GetRelativePath(rootPath, dir)
        let remoteUrl =
            match runGit dir "remote get-url origin" with
            | Ok url -> Some url | Error _ -> None
        // @must_test(REQ-GIT-003)
        let ahead, behind =
            match runGit dir "rev-list --left-right --count HEAD...@{upstream}" with
            | Ok output ->
                let parts = output.Split('\t')
                if parts.Length >= 2 then
                    (Int32.TryParse(parts.[0]) |> (fun (ok, v) -> if ok then v else 0)),
                    (Int32.TryParse(parts.[1]) |> (fun (ok, v) -> if ok then v else 0))
                else 0, 0
            | Error _ -> 0, 0
        let lastCommit =
            match runGit dir "log -1 --format=%H" with
            | Ok h -> Some h | Error _ -> None
        repos.Add({
            Name = name; RelativePath = relativePath
            Languages = detectLanguages dir
            RemoteUrl = remoteUrl; LastLocalCommit = lastCommit
            LastRemoteCommit = None; Ahead = ahead; Behind = behind
        })

    /// Discover git repositories under a root path.
    /// Skips the root directory itself if it has .git (e.g. home dir dotfiles repo).
    let discoverRepos (rootPath: string) : Async<Result<GitRepoStatus list, string>> = async {
        try
            if not (Directory.Exists(rootPath)) then return Ok []
            else
                let repos = ResizeArray<GitRepoStatus>()
                let rootFull = Path.GetFullPath(rootPath).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
                let rec walk (dir: string) (depth: int) =
                    if depth > 6 then ()
                    else
                        let gitDir = Path.Combine(dir, ".git")
                        if Directory.Exists(gitDir) then
                            let dirFull = Path.GetFullPath(dir).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
                            let isRoot = String.Equals(dirFull, rootFull, StringComparison.OrdinalIgnoreCase)
                            if isRoot then
                                // Root has .git (e.g. home dir) — skip it as a repo but recurse into children
                                try
                                    for subDir in Directory.GetDirectories(dir) do
                                        let subName = Path.GetFileName(subDir)
                                        if not (skipDirs.Contains subName) && not (subName.StartsWith(".")) then
                                            walk subDir (depth + 1)
                                with _ -> ()
                            else
                                addRepo repos rootPath dir
                        else
                            try
                                for subDir in Directory.GetDirectories(dir) do
                                    let subName = Path.GetFileName(subDir)
                                    if not (skipDirs.Contains subName) && not (subName.StartsWith(".")) then
                                        walk subDir (depth + 1)
                            with _ -> ()
                walk rootPath 0
                return Ok (repos |> Seq.toList)
        with ex ->
            return Error (sprintf "Git discovery failed: %s" ex.Message)
    }

    // @must_test(REQ-GIT-006)
    /// Compute aggregate statistics across all discovered repos.
    let summarize (repos: GitRepoStatus list) : {| TotalRepos: int; OutOfSync: int; TotalAhead: int; TotalBehind: int |} =
        let outOfSync = repos |> List.filter (fun r -> r.Ahead > 0 || r.Behind > 0) |> List.length
        {| TotalRepos = repos.Length
           OutOfSync = outOfSync
           TotalAhead = repos |> List.sumBy (fun r -> r.Ahead)
           TotalBehind = repos |> List.sumBy (fun r -> r.Behind) |}

    // @must_test(REQ-GIT-007)
    /// Lazy loader: fetches git data only when requested, not at startup.
    let createOnDemandLoader (rootPath: string) =
        let mutable cached: GitRepoStatus list option = None
        fun () -> async {
            match cached with
            | Some repos -> return Ok repos
            | None ->
                let! result = discoverRepos rootPath
                match result with
                | Ok repos -> cached <- Some repos; return Ok repos
                | Error e -> return Error e
        }

    // @must_test(REQ-GIT-005)
    /// Get commit history for discovered repos.
    let getCommitHistory (repoPath: string) (limit: int) : Result<GitCommit list, string> =
        match runGit repoPath (sprintf "log -%d --format=%%H|%%aI|%%s|%%aN|%%aE --shortstat" limit) with
        | Error e -> Error e
        | Ok output ->
            // Strip \r for Windows, filter blank lines, then pair format lines with stat lines
            let lines =
                output.Split('\n')
                |> Array.map (fun l -> l.TrimEnd('\r'))
                |> Array.filter (fun l -> l.Length > 0)
                |> Array.toList
            let rec parse (lines: string list) (acc: GitCommit list) =
                match lines with
                | [] -> List.rev acc
                | line :: rest when line.Contains("|") ->
                    let parts = line.Split('|')
                    if parts.Length >= 5 then
                        // After filtering blanks, next line is shortstat (if it exists)
                        let stats, remaining =
                            match rest with
                            | statLine :: rest2 when statLine.Contains("changed") ->
                                let adds = System.Text.RegularExpressions.Regex.Match(statLine, @"(\d+) insertion")
                                let dels = System.Text.RegularExpressions.Regex.Match(statLine, @"(\d+) deletion")
                                let files = System.Text.RegularExpressions.Regex.Match(statLine, @"(\d+) file")
                                { Additions = if adds.Success then int adds.Groups.[1].Value else 0
                                  Deletions = if dels.Success then int dels.Groups.[1].Value else 0
                                  TotalLines = 0; FilesAdded = 0
                                  FilesChanged = if files.Success then int files.Groups.[1].Value else 0
                                  FilesDeleted = 0 }, rest2
                            | _ -> { Additions = 0; Deletions = 0; TotalLines = 0; FilesAdded = 0; FilesChanged = 0; FilesDeleted = 0 }, rest
                        let commit = {
                            Hash = parts.[0]; Date = parts.[1]; Message = parts.[2]
                            AuthorName = parts.[3]; AuthorEmail = Some (parts.[4].TrimEnd())
                            CoAuthors = []; Stats = stats
                        }
                        parse remaining (commit :: acc)
                    else parse rest acc
                | _ :: rest -> parse rest acc
            Ok (parse lines [])
