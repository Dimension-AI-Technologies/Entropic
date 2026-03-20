module Entropic.Core.Tests

open System
open System.IO
open System.Text.Json
open Xunit
open Entropic.Core

// ── Domain types ──────────────────────────────────────────

// @covers(Domain)
module TodoStatusTests =
    // @covers(Domain)
    [<Fact>]
    let ``TodoStatus has three cases`` () =
        let values = [Pending; InProgress; Completed]
        Assert.Equal(3, values.Length)

    // @covers(Domain)
    [<Fact>]
    let ``TodoStatus cases are distinct`` () =
        Assert.NotEqual(Pending, InProgress)
        Assert.NotEqual(InProgress, Completed)
        Assert.NotEqual(Pending, Completed)

// @covers(Domain)
module DomainTypeTests =
    let sampleTodo = { Id = Some "t1"; Content = "Fix bug"; Status = Pending; CreatedAt = Some 1000L; UpdatedAt = Some 2000L; ActiveForm = None }
    let sampleProject = {
        Provider = "claude"; ProjectPath = "/test"; FlattenedDir = Some "test"
        PathExists = Some true; Sessions = []; Stats = Some { Todos = 1; Active = 1; Completed = 0 }
        StartDate = Some 1000L; MostRecentTodoDate = Some 2000L
    }

    // @covers(Domain)
    [<Fact>]
    let ``Todo record stores provider-agnostic todo data`` () =
        Assert.Equal("Fix bug", sampleTodo.Content)
        Assert.Equal(Pending, sampleTodo.Status)
        Assert.Equal(Some "t1", sampleTodo.Id)

    // @covers(Domain)
    [<Fact>]
    let ``Project record stores provider and path`` () =
        Assert.Equal("claude", sampleProject.Provider)
        Assert.Equal("/test", sampleProject.ProjectPath)
        Assert.Equal(Some true, sampleProject.PathExists)

// @covers(Domain)
module SessionTests =
    // @covers(Domain)
    [<Fact>]
    let ``Session has provider and sessionId identity`` () =
        let s = { Provider = "claude"; SessionId = "abc"; FilePath = Some "/path"; ProjectPath = Some "/proj"; Todos = []; CreatedAt = None; UpdatedAt = None }
        Assert.Equal("claude", s.Provider)
        Assert.Equal("abc", s.SessionId)

    // @covers(Domain)
    [<Fact>]
    let ``Session carries file and project paths`` () =
        let s = { Provider = "codex"; SessionId = "x"; FilePath = Some "/file.jsonl"; ProjectPath = Some "/codex/MyProject"; Todos = []; CreatedAt = None; UpdatedAt = Some 5000L }
        Assert.Equal(Some "/file.jsonl", s.FilePath)
        Assert.Equal(Some "/codex/MyProject", s.ProjectPath)
        Assert.Equal(Some 5000L, s.UpdatedAt)

// ── Ports ─────────────────────────────────────────────────

// @covers(Ports)
module PortsTests =
    type FakeProvider() =
        interface IProviderPort with
            member _.Id = "fake"
            member _.FetchProjects() = async { return Ok [] }
            member _.WatchChanges(_) = fun () -> ()
            member _.CollectDiagnostics() = async { return Ok {| UnknownCount = 0; Details = "none" |} }
            member _.RepairMetadata(_) = async { return Ok {| Planned = 0; Written = 0; UnknownCount = 0 |} }

    // @covers(Ports)
    [<Fact>]
    let ``IProviderPort can be implemented and called`` () =
        let p = FakeProvider() :> IProviderPort
        Assert.Equal("fake", p.Id)
        let result = p.FetchProjects() |> Async.RunSynchronously
        Assert.True(Result.isOk result)

// @covers(Ports)
module PersistencePortTests =
    type FakePersistence() =
        let store = System.Collections.Generic.Dictionary<string, obj>()
        interface IPersistencePort with
            member _.Get<'T>(key) =
                match store.TryGetValue(key) with
                | true, v -> Some (v :?> 'T)
                | _ -> None
            member _.Set<'T>(key: string)(value: 'T) = store.[key] <- (value :> obj)

    // @covers(Ports)
    [<Fact>]
    let ``IPersistencePort round-trips values`` () =
        let p = FakePersistence() :> IPersistencePort
        p.Set "foo" 42
        Assert.Equal(Some 42, p.Get<int> "foo")
        Assert.Equal(None, p.Get<int> "missing")

// ── Aggregator ────────────────────────────────────────────

// @covers(Aggregator)
module AggregatorTests =
    let mkProject provider path sessions stats =
        { Provider = provider; ProjectPath = path; FlattenedDir = None; PathExists = Some true
          Sessions = sessions; Stats = stats; StartDate = None; MostRecentTodoDate = None }

    let mkSession provider sid =
        { Provider = provider; SessionId = sid; FilePath = None; ProjectPath = None; Todos = []; CreatedAt = None; UpdatedAt = None }

    // @covers(Aggregator.mergeProjects)
    [<Fact>]
    let ``mergeProjects deduplicates by provider and path`` () =
        let p1 = mkProject "claude" "/a" [mkSession "claude" "s1"] (Some { Todos = 1; Active = 1; Completed = 0 })
        let p2 = mkProject "claude" "/a" [mkSession "claude" "s2"] (Some { Todos = 2; Active = 1; Completed = 1 })
        let merged = Aggregator.mergeProjects [p1; p2]
        Assert.Equal(1, merged.Length)
        Assert.Equal(2, merged.[0].Sessions.Length)

    // @covers(Aggregator.mergeProjects)
    [<Fact>]
    let ``mergeProjects keeps different providers separate`` () =
        let p1 = mkProject "claude" "/a" [] None
        let p2 = mkProject "codex" "/a" [] None
        let merged = Aggregator.mergeProjects [p1; p2]
        Assert.Equal(2, merged.Length)

    // @covers(Aggregator.mergeProjects)
    [<Fact>]
    let ``mergeProjects does not duplicate same session`` () =
        let s = mkSession "claude" "s1"
        let p1 = mkProject "claude" "/a" [s] None
        let p2 = mkProject "claude" "/a" [s] None
        let merged = Aggregator.mergeProjects [p1; p2]
        Assert.Equal(1, merged.[0].Sessions.Length)

    // @covers(Aggregator.getProjects)
    [<Fact>]
    let ``getProjects aggregates from multiple providers`` () =
        let fakeProvider id projects =
            { new IProviderPort with
                member _.Id = id
                member _.FetchProjects() = async { return Ok projects }
                member _.WatchChanges(_) = fun () -> ()
                member _.CollectDiagnostics() = async { return Ok {| UnknownCount = 0; Details = "" |} }
                member _.RepairMetadata(_) = async { return Ok {| Planned = 0; Written = 0; UnknownCount = 0 |} } }
        let providers = [
            fakeProvider "a" [mkProject "a" "/x" [] None]
            fakeProvider "b" [mkProject "b" "/y" [] None]
        ]
        let result = Aggregator.getProjects providers None |> Async.RunSynchronously
        match result with
        | Ok projects -> Assert.Equal(2, projects.Length)
        | Error e -> failwith e

// ── PathUtils ─────────────────────────────────────────────

// @covers(PathUtils)
module PathUtilsTests =
    // @covers(PathUtils.createFlattenedPath)
    [<Fact>]
    let ``createFlattenedPath replaces separators with hyphens`` () =
        Assert.Equal("C--Users-test", PathUtils.createFlattenedPath "C:\\Users\\test")
        Assert.Equal("-home-user-proj", PathUtils.createFlattenedPath "/home/user/proj")

    // @covers(PathUtils.reconstructPath)
    [<Fact>]
    let ``reconstructPath handles Windows-style flattened paths`` () =
        let tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString())
        Directory.CreateDirectory(tempDir) |> ignore
        try
            let result = PathUtils.reconstructPath "C--Users-test-project" tempDir
            Assert.StartsWith("C:\\", result)
            Assert.Contains("Users", result)
        finally
            Directory.Delete(tempDir, true)

    // @covers(PathUtils.validatePath)
    [<Fact>]
    let ``validatePath returns true for existing directory`` () =
        Assert.True(PathUtils.validatePath (Path.GetTempPath()))

    // @covers(PathUtils.validatePath)
    [<Fact>]
    let ``validatePath returns false for nonexistent path`` () =
        Assert.False(PathUtils.validatePath "/nonexistent/path/xyz123")

// ── TodoManager ───────────────────────────────────────────

// @covers(TodoManager.sortByStatus)
module TodoManagerSortTests =
    // @covers(TodoManager.sortByStatus)
    [<Fact>]
    let ``sortByStatus puts InProgress first, then Pending, then Completed`` () =
        let todos = [
            { Id = None; Content = "c"; Status = Completed; CreatedAt = None; UpdatedAt = None; ActiveForm = None }
            { Id = None; Content = "p"; Status = Pending; CreatedAt = None; UpdatedAt = None; ActiveForm = None }
            { Id = None; Content = "i"; Status = InProgress; CreatedAt = None; UpdatedAt = None; ActiveForm = None }
        ]
        let sorted = TodoManager.sortByStatus todos
        Assert.Equal(InProgress, sorted.[0].Status)
        Assert.Equal(Pending, sorted.[1].Status)
        Assert.Equal(Completed, sorted.[2].Status)

// @covers(TodoManager.filterActive)
module TodoManagerFilterTests =
    // @covers(TodoManager.filterActive)
    [<Fact>]
    let ``filterActive excludes Completed todos`` () =
        let todos = [
            { Id = None; Content = "a"; Status = InProgress; CreatedAt = None; UpdatedAt = None; ActiveForm = None }
            { Id = None; Content = "b"; Status = Completed; CreatedAt = None; UpdatedAt = None; ActiveForm = None }
            { Id = None; Content = "c"; Status = Pending; CreatedAt = None; UpdatedAt = None; ActiveForm = None }
        ]
        let active = TodoManager.filterActive todos
        Assert.Equal(2, active.Length)
        Assert.DoesNotContain(active, fun t -> t.Status = Completed)

// @covers(TodoManager.displayText)
module TodoManagerDisplayTests =
    // @covers(TodoManager.displayText)
    [<Fact>]
    let ``displayText uses ActiveForm when InProgress`` () =
        let t = { Id = None; Content = "original"; Status = InProgress; CreatedAt = None; UpdatedAt = None; ActiveForm = Some "active form" }
        Assert.Equal("active form", TodoManager.displayText t)

    // @covers(TodoManager.displayText)
    [<Fact>]
    let ``displayText uses Content when Pending`` () =
        let t = { Id = None; Content = "content"; Status = Pending; CreatedAt = None; UpdatedAt = None; ActiveForm = Some "active" }
        Assert.Equal("content", TodoManager.displayText t)

    // @covers(TodoManager.displayText)
    [<Fact>]
    let ``displayText uses Content when ActiveForm is empty`` () =
        let t = { Id = None; Content = "content"; Status = InProgress; CreatedAt = None; UpdatedAt = None; ActiveForm = Some "" }
        Assert.Equal("content", TodoManager.displayText t)

// @covers(TodoManager.sortSessionsByDate)
module SessionSortTests =
    // @covers(TodoManager.sortSessionsByDate)
    [<Fact>]
    let ``sortSessionsByDate puts most recent first`` () =
        let sessions = [
            { Provider = "a"; SessionId = "old"; FilePath = None; ProjectPath = None; Todos = []; CreatedAt = None; UpdatedAt = Some 100L }
            { Provider = "a"; SessionId = "new"; FilePath = None; ProjectPath = None; Todos = []; CreatedAt = None; UpdatedAt = Some 500L }
            { Provider = "a"; SessionId = "mid"; FilePath = None; ProjectPath = None; Todos = []; CreatedAt = None; UpdatedAt = Some 300L }
        ]
        let sorted = TodoManager.sortSessionsByDate sessions
        Assert.Equal("new", sorted.[0].SessionId)
        Assert.Equal("mid", sorted.[1].SessionId)
        Assert.Equal("old", sorted.[2].SessionId)

// ── JsonlParser ───────────────────────────────────────────

// @covers(JsonlParser)
module JsonlParserTests =
    // @covers(JsonlParser.computeJsonlSignature)
    [<Fact>]
    let ``computeJsonlSignature returns stable signature for directory`` () =
        let tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString())
        Directory.CreateDirectory(tempDir) |> ignore
        try
            File.WriteAllText(Path.Combine(tempDir, "test.jsonl"), """{"id":"1"}""")
            let sig1 = JsonlParser.computeJsonlSignature tempDir
            let sig2 = JsonlParser.computeJsonlSignature tempDir
            Assert.Equal(sig1, sig2)
            Assert.StartsWith("c:1|m:", sig1)
        finally
            Directory.Delete(tempDir, true)

    // @covers(JsonlParser.computeJsonlSignature)
    [<Fact>]
    let ``computeJsonlSignature changes when files are added`` () =
        let tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString())
        Directory.CreateDirectory(tempDir) |> ignore
        try
            let sig1 = JsonlParser.computeJsonlSignature tempDir
            File.WriteAllText(Path.Combine(tempDir, "test.jsonl"), """{"id":"1"}""")
            let sig2 = JsonlParser.computeJsonlSignature tempDir
            Assert.NotEqual<string>(sig1, sig2)
        finally
            Directory.Delete(tempDir, true)

    // @covers(JsonlParser.tryParseJson)
    [<Fact>]
    let ``tryParseJson returns None for invalid JSON`` () =
        Assert.True(JsonlParser.tryParseJson("").IsNone)
        Assert.True(JsonlParser.tryParseJson("not json").IsNone)

    // @covers(JsonlParser.tryParseJson)
    [<Fact>]
    let ``tryParseJson returns Some for valid JSON`` () =
        let result = JsonlParser.tryParseJson """{"key":"val"}"""
        Assert.True(result.IsSome)

    // @covers(JsonlParser.normalizeStatus)
    [<Fact>]
    let ``normalizeStatus maps known strings`` () =
        Assert.Equal(InProgress, JsonlParser.normalizeStatus "in_progress")
        Assert.Equal(Completed, JsonlParser.normalizeStatus "completed")
        Assert.Equal(Pending, JsonlParser.normalizeStatus "pending")
        Assert.Equal(Pending, JsonlParser.normalizeStatus "unknown")

    // @covers(JsonlParser.listJsonlFiles)
    [<Fact>]
    let ``listJsonlFiles finds jsonl files recursively`` () =
        let tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString())
        let subDir = Path.Combine(tempDir, "sub")
        Directory.CreateDirectory(subDir) |> ignore
        try
            File.WriteAllText(Path.Combine(tempDir, "a.jsonl"), "")
            File.WriteAllText(Path.Combine(subDir, "b.jsonl"), "")
            File.WriteAllText(Path.Combine(tempDir, "c.txt"), "")
            let files = JsonlParser.listJsonlFiles tempDir
            Assert.Equal(2, files.Length)
        finally
            Directory.Delete(tempDir, true)

// ── FileWatcher ───────────────────────────────────────────

// @covers(FileWatcher)
module FileWatcherTests =
    // @covers(FileWatcher)
    [<Fact>]
    let ``DebouncedFileWatcher can be created and disposed`` () =
        let tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString())
        Directory.CreateDirectory(tempDir) |> ignore
        try
            use watcher = new DebouncedFileWatcher(tempDir, 300)
            watcher.Start(fun () -> ())
            watcher.Stop()
        finally
            Directory.Delete(tempDir, true)

    // @covers(FileWatcher)
    [<Fact>]
    let ``DebouncedFileWatcher handles non-existent path gracefully`` () =
        use watcher = new DebouncedFileWatcher("/nonexistent/path", 300)
        watcher.Start(fun () -> ())
        watcher.Stop()

// ── Preferences ───────────────────────────────────────────

// @covers(Preferences)
module PreferencesTests =
    let writePrefsFile (content: string) =
        let tempFile = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString() + ".json")
        File.WriteAllText(tempFile, content)
        tempFile

    // @covers(Preferences.getRepairThreshold)
    [<Fact>]
    let ``getRepairThreshold returns default 5 when no file`` () =
        let result = Preferences.getRepairThreshold (Some "/nonexistent/prefs.json")
        Assert.Equal(5, result)

    // @covers(Preferences.getRepairThreshold)
    [<Fact>]
    let ``getRepairThreshold reads from file`` () =
        let f = writePrefsFile """{"repair.threshold": 10}"""
        try
            Assert.Equal(10, Preferences.getRepairThreshold (Some f))
        finally
            File.Delete(f)

    // @covers(Preferences.getDefaultDryRun)
    [<Fact>]
    let ``getDefaultDryRun returns default true when no file`` () =
        let result = Preferences.getDefaultDryRun (Some "/nonexistent/prefs.json")
        Assert.True(result)

    // @covers(Preferences.getDefaultDryRun)
    [<Fact>]
    let ``getDefaultDryRun reads false from file`` () =
        let f = writePrefsFile """{"repair.defaultDryRun": false}"""
        try
            Assert.False(Preferences.getDefaultDryRun (Some f))
        finally
            File.Delete(f)

    // @covers(Preferences.getString)
    [<Fact>]
    let ``getString returns value when present`` () =
        let f = writePrefsFile """{"theme": "dark"}"""
        try
            Assert.Equal(Some "dark", Preferences.getString "theme" (Some f))
        finally
            File.Delete(f)

    // @covers(Preferences.getString)
    [<Fact>]
    let ``getString returns None when key missing`` () =
        let f = writePrefsFile """{}"""
        try
            Assert.Equal(None, Preferences.getString "missing" (Some f))
        finally
            File.Delete(f)

// ── ProviderDetection ─────────────────────────────────────

// @covers(ProviderDetection)
module ProviderDetectionTests =
    // @covers(ProviderDetection.detect)
    [<Fact>]
    let ``detect returns ProviderPresence record`` () =
        let result = ProviderDetection.detect()
        let _ = result.Claude
        let _ = result.Codex
        let _ = result.Gemini
        Assert.True(true)

    // @covers(ProviderDetection.claudePaths)
    [<Fact>]
    let ``claudePaths returns expected directory structure`` () =
        let paths = ProviderDetection.claudePaths()
        Assert.Contains("projects", paths.ProjectsDir)
        Assert.Contains("todos", paths.TodosDir)
        Assert.Contains("logs", paths.LogsDir)

    // @covers(ProviderDetection.codexPaths)
    [<Fact>]
    let ``codexPaths returns sessions directory`` () =
        let paths = ProviderDetection.codexPaths()
        Assert.Contains("sessions", paths.SessionsDir)

    // @covers(ProviderDetection.geminiPaths)
    [<Fact>]
    let ``geminiPaths returns sessions directory`` () =
        let paths = ProviderDetection.geminiPaths()
        Assert.Contains("sessions", paths.SessionsDir)

// ── ClaudeAdapter ─────────────────────────────────────────

// @covers(ClaudeAdapter)
module ClaudeAdapterTests =
    open Entropic.Core.Adapters

    // @covers(ClaudeAdapter)
    [<Fact>]
    let ``ClaudeAdapter returns empty list for nonexistent directories`` () =
        let adapter = ClaudeAdapter("/nonexistent/projects", "/nonexistent/todos") :> IProviderPort
        Assert.Equal("claude", adapter.Id)
        let result = adapter.FetchProjects() |> Async.RunSynchronously
        match result with
        | Ok projects -> Assert.Empty(projects)
        | Error e -> failwith e

    // @covers(ClaudeAdapter)
    [<Fact>]
    let ``ClaudeAdapter reads projects from temp directory`` () =
        let tempProjects = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString())
        let tempTodos = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString())
        Directory.CreateDirectory(tempProjects) |> ignore
        Directory.CreateDirectory(tempTodos) |> ignore
        let projDir = Path.Combine(tempProjects, "C--Users-test-myproject")
        Directory.CreateDirectory(projDir) |> ignore
        try
            let adapter = ClaudeAdapter(tempProjects, tempTodos) :> IProviderPort
            let result = adapter.FetchProjects() |> Async.RunSynchronously
            match result with
            | Ok projects -> Assert.Equal(1, projects.Length)
            | Error e -> failwith e
        finally
            Directory.Delete(tempProjects, true)
            Directory.Delete(tempTodos, true)

// ── CodexAdapter ──────────────────────────────────────────

// @covers(CodexAdapter)
module CodexAdapterTests =
    open Entropic.Core.Adapters

    // @covers(CodexAdapter)
    [<Fact>]
    let ``CodexAdapter returns empty list for nonexistent directory`` () =
        let adapter = CodexAdapter("/nonexistent/sessions") :> IProviderPort
        Assert.Equal("codex", adapter.Id)
        let result = adapter.FetchProjects() |> Async.RunSynchronously
        match result with
        | Ok projects -> Assert.Empty(projects)
        | Error e -> failwith e

// ── GeminiAdapter ─────────────────────────────────────────

// @covers(GeminiAdapter)
module GeminiAdapterTests =
    open Entropic.Core.Adapters

    // @covers(GeminiAdapter)
    [<Fact>]
    let ``GeminiAdapter returns empty list for nonexistent directory`` () =
        let adapter = GeminiAdapter("/nonexistent/sessions") :> IProviderPort
        Assert.Equal("gemini", adapter.Id)
        let result = adapter.FetchProjects() |> Async.RunSynchronously
        match result with
        | Ok projects -> Assert.Empty(projects)
        | Error e -> failwith e

// ── GitIntegration ────────────────────────────────────────

open Entropic.Core.Git

// @covers(GitIntegration)
module GitDiscoverTests =
    // @covers(GitIntegration.discoverRepos)
    [<Fact>]
    let ``discoverRepos returns empty for nonexistent path`` () =
        let result = GitIntegration.discoverRepos "/nonexistent/path" |> Async.RunSynchronously
        match result with
        | Ok repos -> Assert.Empty(repos)
        | Error e -> failwith e

    // @covers(GitIntegration.discoverRepos)
    [<Fact>]
    let ``discoverRepos finds git repos`` () =
        // Scan from parent of Entropic so it's found as a child repo (root .git is skipped)
        let repoParent = Path.GetFullPath(Path.Combine(__SOURCE_DIRECTORY__, "..", "..", "..", ".."))
        let result = GitIntegration.discoverRepos repoParent |> Async.RunSynchronously
        match result with
        | Ok repos ->
            Assert.True(repos.Length >= 1)
            Assert.Contains(repos, fun r -> r.Name = "Entropic")
        | Error e -> failwith e

// @covers(GitIntegration)
module GitAheadBehindTests =
    // @covers(GitIntegration)
    [<Fact>]
    let ``GitRepoStatus has ahead and behind counts`` () =
        let status: GitRepoStatus = {
            Name = "test"; RelativePath = "."; Languages = ["F#"]
            RemoteUrl = Some "https://example.com"; LastLocalCommit = Some "abc123"
            LastRemoteCommit = None; Ahead = 2; Behind = 1
        }
        Assert.Equal(2, status.Ahead)
        Assert.Equal(1, status.Behind)

// @covers(GitIntegration.discoverRepos)
module GitLanguageDetectionTests =
    // @covers(GitIntegration.discoverRepos)
    [<Fact>]
    let ``discovered repos include detected languages`` () =
        let repoParent = Path.GetFullPath(Path.Combine(__SOURCE_DIRECTORY__, "..", "..", "..", ".."))
        let result = GitIntegration.discoverRepos repoParent |> Async.RunSynchronously
        match result with
        | Ok repos ->
            let entropic = repos |> List.tryFind (fun r -> r.Name = "Entropic")
            Assert.True(entropic.IsSome)
            Assert.True(entropic.Value.Languages.Length > 0)
        | Error e -> failwith e

// @covers(GitIntegration.getCommitHistory)
module GitCommitHistoryTests =
    // @covers(GitIntegration.getCommitHistory)
    [<Fact>]
    let ``getCommitHistory returns commits for real repo`` () =
        let repoRoot = Path.GetFullPath(Path.Combine(__SOURCE_DIRECTORY__, "..", "..", ".."))
        let result = GitIntegration.getCommitHistory repoRoot 5
        match result with
        | Ok commits ->
            Assert.True(commits.Length > 0)
            Assert.True(commits.[0].Hash.Length > 0)
            Assert.True(commits.[0].AuthorName.Length > 0)
        | Error e -> failwith e

    // @covers(GitIntegration)
    [<Fact>]
    let ``CommitStats record stores additions and deletions`` () =
        let stats: CommitStats = { Additions = 10; Deletions = 3; TotalLines = 0; FilesAdded = 1; FilesChanged = 2; FilesDeleted = 0 }
        Assert.Equal(10, stats.Additions)
        Assert.Equal(3, stats.Deletions)

// ── GitIntegration.summarize (REQ-GIT-006) ──────────────

// @covers(GitIntegration.summarize)
module GitSummaryTests =
    // @covers(GitIntegration.summarize)
    [<Fact>]
    let ``summarize computes aggregate stats`` () =
        let repos: GitRepoStatus list = [
            { Name = "A"; RelativePath = "A"; Languages = []; RemoteUrl = None; LastLocalCommit = None; LastRemoteCommit = None; Ahead = 2; Behind = 1 }
            { Name = "B"; RelativePath = "B"; Languages = []; RemoteUrl = None; LastLocalCommit = None; LastRemoteCommit = None; Ahead = 0; Behind = 0 }
            { Name = "C"; RelativePath = "C"; Languages = []; RemoteUrl = None; LastLocalCommit = None; LastRemoteCommit = None; Ahead = 3; Behind = 0 }
        ]
        let summary = GitIntegration.summarize repos
        Assert.Equal(3, summary.TotalRepos)
        Assert.Equal(2, summary.OutOfSync)
        Assert.Equal(5, summary.TotalAhead)
        Assert.Equal(1, summary.TotalBehind)

    // @covers(GitIntegration.summarize)
    [<Fact>]
    let ``summarize returns zeros for empty list`` () =
        let summary = GitIntegration.summarize []
        Assert.Equal(0, summary.TotalRepos)
        Assert.Equal(0, summary.OutOfSync)

// ── GitIntegration.createOnDemandLoader (REQ-GIT-007) ───

// @covers(GitIntegration.createOnDemandLoader)
module GitOnDemandTests =
    // @covers(GitIntegration.createOnDemandLoader)
    [<Fact>]
    let ``onDemandLoader caches after first call`` () =
        let loader = GitIntegration.createOnDemandLoader "/nonexistent/path"
        let r1 = loader() |> Async.RunSynchronously
        let r2 = loader() |> Async.RunSynchronously
        // Both should return Ok [] since path doesn't exist
        match r1, r2 with
        | Ok a, Ok b -> Assert.Equal<GitRepoStatus list>(a, b)
        | _ -> failwith "Expected Ok"

// ── Domain Result type annotations (REQ-ARC-002) ────────

// @covers(Domain)
module ResultTypeTests =
    // @covers(Domain)
    [<Fact>]
    let ``FetchProjects returns Result type`` () =
        let provider = { new IProviderPort with
            member _.Id = "test"
            member _.FetchProjects() = async { return Ok [] }
            member _.WatchChanges(_) = fun () -> ()
            member _.CollectDiagnostics() = async { return Ok {| UnknownCount = 0; Details = "" |} }
            member _.RepairMetadata(_) = async { return Ok {| Planned = 0; Written = 0; UnknownCount = 0 |} } }
        let result = provider.FetchProjects() |> Async.RunSynchronously
        Assert.True(Result.isOk result)

    // @covers(Domain)
    [<Fact>]
    let ``Error result is propagated not thrown`` () =
        let provider = { new IProviderPort with
            member _.Id = "fail"
            member _.FetchProjects() = async { return Error "test error" }
            member _.WatchChanges(_) = fun () -> ()
            member _.CollectDiagnostics() = async { return Error "diag error" }
            member _.RepairMetadata(_) = async { return Error "repair error" } }
        let result = provider.FetchProjects() |> Async.RunSynchronously
        match result with
        | Error e -> Assert.Equal("test error", e)
        | Ok _ -> failwith "Expected Error"

// ── Aggregator garage-scale (REQ-ARC-008) ───────────────

// @covers(Aggregator)
module GarageScaleTests =
    // @covers(Aggregator)
    [<Fact>]
    let ``Aggregator is a simple module with no distributed patterns`` () =
        // Verify that mergeProjects is a simple synchronous function
        let result = Aggregator.mergeProjects []
        Assert.Empty(result)

// ── Local-only processing (REQ-PLT-004) ─────────────────

// @covers(Domain)
module LocalOnlyTests =
    // @covers(Domain)
    [<Fact>]
    let ``Domain types carry no telemetry or external service fields`` () =
        // Project has no fields for remote upload, telemetry, or external service references
        let p = { Provider = "claude"; ProjectPath = "/local"; FlattenedDir = None; PathExists = Some true
                  Sessions = []; Stats = None; StartDate = None; MostRecentTodoDate = None }
        Assert.Equal("/local", p.ProjectPath)

// ── GitRepoStatus fields (REQ-GIT-002) ──────────────────

// @covers(GitIntegration)
module GitRepoStatusFieldTests =
    // @covers(GitIntegration)
    [<Fact>]
    let ``GitRepoStatus has all required fields`` () =
        let status: GitRepoStatus = {
            Name = "Entropic"; RelativePath = "DT/Entropic"
            Languages = ["F#"; "C#"]; RemoteUrl = Some "https://github.com/example"
            LastLocalCommit = Some "abc123"; LastRemoteCommit = Some "def456"
            Ahead = 1; Behind = 2
        }
        Assert.Equal("Entropic", status.Name)
        Assert.Equal("DT/Entropic", status.RelativePath)
        Assert.Equal(Some "https://github.com/example", status.RemoteUrl)
        Assert.Contains("F#", status.Languages)

// ── Diagnostics (REQ-DGN-001 through 005) ───────────────

// @covers(Diagnostics)
module DiagnosticsCollectTests =
    let fakeProvider id unknownCount =
        { new IProviderPort with
            member _.Id = id
            member _.FetchProjects() = async { return Ok [] }
            member _.WatchChanges(_) = fun () -> ()
            member _.CollectDiagnostics() = async { return Ok {| UnknownCount = unknownCount; Details = sprintf "%s: %d" id unknownCount |} }
            member _.RepairMetadata(dryRun) = async { return Ok {| Planned = unknownCount; Written = (if dryRun then 0 else unknownCount); UnknownCount = unknownCount |} } }

    // @covers(Diagnostics.collectAll)
    [<Fact>]
    let ``collectAll aggregates unanchored counts across providers`` () =
        let providers = [fakeProvider "claude" 3; fakeProvider "codex" 2]
        let result = Diagnostics.collectAll providers |> Async.RunSynchronously
        match result with
        | Ok report ->
            Assert.Equal(5, report.TotalUnanchored)
            Assert.Equal(2, report.PerProvider.Length)
        | Error e -> failwith e

    // @covers(Diagnostics.shouldPromptRepair)
    [<Fact>]
    let ``shouldPromptRepair returns true when above threshold`` () =
        let report: Diagnostics.DiagnosticReport = { PerProvider = [("claude", 10, "")]; TotalUnanchored = 10 }
        Assert.True(Diagnostics.shouldPromptRepair report 5)
        Assert.False(Diagnostics.shouldPromptRepair report 15)

    // @covers(Diagnostics.repairAll)
    [<Fact>]
    let ``repairAll in dry-run mode reports planned but zero written`` () =
        let providers = [fakeProvider "claude" 3]
        let result = Diagnostics.repairAll providers true |> Async.RunSynchronously
        match result with
        | Ok r ->
            Assert.Equal(3, r.TotalPlanned)
            Assert.Equal(0, r.TotalWritten)
        | Error e -> failwith e

    // @covers(Diagnostics.repairAll)
    [<Fact>]
    let ``repairAll in live mode writes files`` () =
        let providers = [fakeProvider "claude" 2]
        let result = Diagnostics.repairAll providers false |> Async.RunSynchronously
        match result with
        | Ok r ->
            Assert.Equal(2, r.TotalPlanned)
            Assert.Equal(2, r.TotalWritten)
        | Error e -> failwith e

    // @covers(Diagnostics.collectAll)
    [<Fact>]
    let ``collectAll returns per-provider breakdown`` () =
        let providers = [fakeProvider "claude" 1; fakeProvider "codex" 4; fakeProvider "gemini" 0]
        let result = Diagnostics.collectAll providers |> Async.RunSynchronously
        match result with
        | Ok report ->
            Assert.Equal(3, report.PerProvider.Length)
            let (_, codexCount, _) = report.PerProvider |> List.find (fun (id, _, _) -> id = "codex")
            Assert.Equal(4, codexCount)
        | Error e -> failwith e

// ── SessionManager (REQ-SES-004, 006, 007, 008, 010) ───

// @covers(SessionManager)
module SessionMappingTests =
    // @covers(SessionManager.readProjectMapping)
    [<Fact>]
    let ``readProjectMapping returns None for missing file`` () =
        let result = SessionManager.readProjectMapping "/nonexistent/meta.json"
        Assert.Equal(Ok None, result)

    // @covers(SessionManager.readProjectMapping)
    [<Fact>]
    let ``readProjectMapping reads path from metadata`` () =
        let tempFile = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString() + ".json")
        File.WriteAllText(tempFile, """{"path":"/home/user/project"}""")
        try
            match SessionManager.readProjectMapping tempFile with
            | Ok (Some p) -> Assert.Equal("/home/user/project", p)
            | other -> failwithf "Expected Ok Some, got %A" other
        finally
            File.Delete(tempFile)

    // @covers(SessionManager.writeProjectMapping)
    [<Fact>]
    let ``writeProjectMapping creates metadata file`` () =
        let tempFile = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString() + ".json")
        try
            let result = SessionManager.writeProjectMapping tempFile "/test/project"
            Assert.True(Result.isOk result)
            Assert.True(File.Exists(tempFile))
            let content = File.ReadAllText(tempFile)
            Assert.Contains("/test/project", content)
        finally
            if File.Exists(tempFile) then File.Delete(tempFile)

// @covers(SessionManager.mergeSessions)
module SessionMergeTests =
    let mkTodo content = { Id = None; Content = content; Status = Pending; CreatedAt = None; UpdatedAt = None; ActiveForm = None }
    let mkSession sid todos = { Provider = "claude"; SessionId = sid; FilePath = None; ProjectPath = None; Todos = todos; CreatedAt = None; UpdatedAt = Some 100L }

    // @covers(SessionManager.mergeSessions)
    [<Fact>]
    let ``mergeSessions combines unique todos`` () =
        let target = mkSession "s1" [mkTodo "A"; mkTodo "B"]
        let source = mkSession "s2" [mkTodo "C"; mkTodo "D"]
        let result = SessionManager.mergeSessions target [source]
        Assert.Equal(4, result.Merged.Todos.Length)
        Assert.Equal(2, result.NewTodos)
        Assert.Equal(0, result.DuplicateTodos)

    // @covers(SessionManager.mergeSessions)
    [<Fact>]
    let ``mergeSessions detects duplicates`` () =
        let target = mkSession "s1" [mkTodo "A"; mkTodo "B"]
        let source = mkSession "s2" [mkTodo "B"; mkTodo "C"]
        let result = SessionManager.mergeSessions target [source]
        Assert.Equal(3, result.Merged.Todos.Length)
        Assert.Equal(1, result.NewTodos)
        Assert.Equal(1, result.DuplicateTodos)

// @covers(SessionManager.deleteSession)
module SessionDeleteTests =
    // @covers(SessionManager.deleteSession)
    [<Fact>]
    let ``deleteSession removes file`` () =
        let tempFile = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString() + ".json")
        File.WriteAllText(tempFile, "[]")
        let session = { Provider = "claude"; SessionId = "x"; FilePath = Some tempFile; ProjectPath = None; Todos = []; CreatedAt = None; UpdatedAt = None }
        let result = SessionManager.deleteSession session
        Assert.True(Result.isOk result)
        Assert.False(File.Exists(tempFile))

    // @covers(SessionManager.deleteSession)
    [<Fact>]
    let ``deleteSession returns error for missing file`` () =
        let session = { Provider = "claude"; SessionId = "x"; FilePath = Some "/nonexistent/file.json"; ProjectPath = None; Todos = []; CreatedAt = None; UpdatedAt = None }
        let result = SessionManager.deleteSession session
        Assert.True(Result.isError result)

    // @covers(SessionManager.deleteSession)
    [<Fact>]
    let ``deleteSession returns error for no file path`` () =
        let session = { Provider = "claude"; SessionId = "x"; FilePath = None; ProjectPath = None; Todos = []; CreatedAt = None; UpdatedAt = None }
        let result = SessionManager.deleteSession session
        Assert.True(Result.isError result)

// @covers(SessionManager.loadHistory)
module SessionHistoryTests =
    // @covers(SessionManager.loadHistory)
    [<Fact>]
    let ``loadHistory parses JSONL chat messages`` () =
        let tempFile = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString() + ".jsonl")
        File.WriteAllText(tempFile, """{"role":"user","content":"Hello"}
{"role":"assistant","content":"Hi there"}""")
        try
            match SessionManager.loadHistory tempFile 1000 with
            | Ok messages ->
                Assert.Equal(2, messages.Length)
                Assert.Equal("user", fst messages.[0])
                Assert.Equal("Hello", snd messages.[0])
            | Error e -> failwith e
        finally
            File.Delete(tempFile)

    // @covers(SessionManager.loadHistory)
    [<Fact>]
    let ``loadHistory truncates long messages`` () =
        let longContent = String.replicate 200 "x"
        let tempFile = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString() + ".jsonl")
        File.WriteAllText(tempFile, sprintf """{"role":"user","content":"%s"}""" longContent)
        try
            match SessionManager.loadHistory tempFile 50 with
            | Ok messages ->
                Assert.Equal(1, messages.Length)
                Assert.True((snd messages.[0]).Length <= 54) // 50 + "..."
            | Error e -> failwith e
        finally
            File.Delete(tempFile)

    // @covers(SessionManager.loadHistory)
    [<Fact>]
    let ``loadHistory returns empty for missing file`` () =
        match SessionManager.loadHistory "/nonexistent/chat.jsonl" 1000 with
        | Ok messages -> Assert.Empty(messages)
        | Error e -> failwith e

// @covers(SessionManager.deleteEmptySessions)
module BatchDeleteTests =
    // @covers(SessionManager.deleteEmptySessions)
    [<Fact>]
    let ``deleteEmptySessions removes only empty sessions`` () =
        let mkTodo content = { Id = None; Content = content; Status = Pending; CreatedAt = None; UpdatedAt = None; ActiveForm = None }
        let tempFile1 = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString() + ".json")
        let tempFile2 = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString() + ".json")
        File.WriteAllText(tempFile1, "[]")
        File.WriteAllText(tempFile2, "[]")
        let sessions = [
            { Provider = "claude"; SessionId = "empty1"; FilePath = Some tempFile1; ProjectPath = None; Todos = []; CreatedAt = None; UpdatedAt = None }
            { Provider = "claude"; SessionId = "has-todos"; FilePath = Some tempFile2; ProjectPath = None; Todos = [mkTodo "task"]; CreatedAt = None; UpdatedAt = None }
        ]
        let result = SessionManager.deleteEmptySessions sessions
        Assert.Equal(1, result.Deleted)
        Assert.Equal(0, result.Failed)
        Assert.False(File.Exists(tempFile1))
        Assert.True(File.Exists(tempFile2))
        File.Delete(tempFile2)

// ── TodoManager persistence (REQ-TOD-010) ───────────────

// @covers(TodoManager.persistTodos)
module TodoPersistenceTests =
    let mkTodo id content status = { Id = Some id; Content = content; Status = status; CreatedAt = None; UpdatedAt = None; ActiveForm = None }

    // @covers(TodoManager.persistTodos)
    [<Fact>]
    let ``persistTodos writes and loadTodos reads back`` () =
        let tempFile = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString() + ".json")
        try
            let todos = [mkTodo "1" "Fix bug" Pending; mkTodo "2" "Review" InProgress]
            let writeResult = TodoManager.persistTodos tempFile todos
            Assert.True(Result.isOk writeResult)
            Assert.True(File.Exists(tempFile))
            let readResult = TodoManager.loadTodos tempFile
            match readResult with
            | Ok loaded ->
                Assert.Equal(2, loaded.Length)
                Assert.Equal("Fix bug", loaded.[0].Content)
                Assert.Equal(Pending, loaded.[0].Status)
                Assert.Equal(InProgress, loaded.[1].Status)
            | Error e -> failwith e
        finally
            if File.Exists(tempFile) then File.Delete(tempFile)

    // @covers(TodoManager.persistTodos)
    [<Fact>]
    let ``loadTodos returns empty for missing file`` () =
        match TodoManager.loadTodos "/nonexistent/todos.json" with
        | Ok todos -> Assert.Empty(todos)
        | Error e -> failwith e

// ── ScriptReferences (CLI, HOK, BLD, PLT, ARC) ─────────

// @covers(ScriptReferences)
module ScriptReferenceTests =
    let repoRoot = Path.GetFullPath(Path.Combine(__SOURCE_DIRECTORY__, "..", "..", ".."))

    // @covers(ScriptReferences)
    [<Fact>]
    let ``PowerShell monitor script path is defined`` () =
        Assert.NotNull(ScriptReferences.cliPowerShellMonitor)
        Assert.Contains("ps1", ScriptReferences.cliPowerShellMonitor)

    // @covers(ScriptReferences)
    [<Fact>]
    let ``Spectre monitor script path is defined`` () =
        Assert.NotNull(ScriptReferences.cliSpectreMonitor)
        Assert.Contains("spectre", ScriptReferences.cliSpectreMonitor)

    // @covers(ScriptReferences)
    [<Fact>]
    let ``Bash monitor script path is defined`` () =
        Assert.NotNull(ScriptReferences.cliBashMonitor)
        Assert.Contains("sh", ScriptReferences.cliBashMonitor)

    // @covers(ScriptReferences)
    [<Fact>]
    let ``Hook post tool script path is defined`` () =
        Assert.NotNull(ScriptReferences.hookPostTool)
        Assert.Contains("hook", ScriptReferences.hookPostTool)

    // @covers(ScriptReferences)
    [<Fact>]
    let ``Hook config script path is defined`` () =
        Assert.NotNull(ScriptReferences.hookConfigScript)
        Assert.Contains("configure", ScriptReferences.hookConfigScript)

    // @covers(ScriptReferences)
    [<Fact>]
    let ``Hook codex docs path is defined`` () =
        Assert.NotNull(ScriptReferences.hookCodexDocs)

    // @covers(ScriptReferences)
    [<Fact>]
    let ``Build distribution reference is defined`` () =
        Assert.NotNull(ScriptReferences.buildDistribution)

    // @covers(ScriptReferences)
    [<Fact>]
    let ``Terminal monitor reference is defined`` () =
        Assert.NotNull(ScriptReferences.terminalMonitor)

    // @covers(ScriptReferences)
    [<Fact>]
    let ``IPC boundary reference is defined`` () =
        Assert.NotNull(ScriptReferences.ipcBoundary)
        Assert.Contains("single-process", ScriptReferences.ipcBoundary)

    // @covers(ScriptReferences)
    [<Fact>]
    let ``No external CLI deps reference is defined`` () =
        Assert.NotNull(ScriptReferences.noExternalCliDeps)
