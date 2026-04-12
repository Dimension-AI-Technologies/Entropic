namespace Entropic.Core

open System
open System.IO

/// Auto-detection of installed AI coding agent data directories.

// @must_test(REQ-PLT-003)
// @must_test(REQ-PRV-007)
module ProviderDetection =

    type ProviderPresence = {
        Claude: bool
        Codex: bool
        Gemini: bool
    }

    let private home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile)

    /// Detect which provider data directories exist on the local machine.
    let detect () : ProviderPresence =
        {
            Claude = Directory.Exists(Path.Combine(home, ".claude"))
            Codex = Directory.Exists(Path.Combine(home, ".codex"))
            Gemini = Directory.Exists(Path.Combine(home, ".gemini"))
        }

    /// Get standard paths for each provider.
    let claudePaths () =
        let claudeDir = Path.Combine(home, ".claude")
        {| ProjectsDir = Path.Combine(claudeDir, "projects")
           TodosDir = Path.Combine(claudeDir, "todos")
           LogsDir = Path.Combine(claudeDir, "logs") |}

    let codexPaths () =
        {| SessionsDir = Path.Combine(home, ".codex", "sessions") |}

    let geminiPaths () =
        {| SessionsDir = Path.Combine(home, ".gemini", "sessions") |}
