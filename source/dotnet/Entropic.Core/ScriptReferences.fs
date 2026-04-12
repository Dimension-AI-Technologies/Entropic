namespace Entropic.Core

/// References to functionality implemented in PowerShell/Bash/TypeScript scripts.
/// These requirements are satisfied by code outside the .NET codebase.

module ScriptReferences =

    // @must_not_test(reason="Implemented in PowerShell: powershell7/todo_live_monitor.ps1")
    let cliPowerShellMonitor = "powershell7/todo_live_monitor.ps1"

    // @must_not_test(reason="Implemented in PowerShell: powershell7/todo_live_monitor_spectre.ps1")
    let cliSpectreMonitor = "powershell7/todo_live_monitor_spectre.ps1"

    // @must_not_test(reason="Implemented in Bash: bash/todo_live_monitor.sh")
    let cliBashMonitor = "bash/todo_live_monitor.sh"

    // @must_not_test(reason="Implemented in PowerShell: powershell7/todo_hook_post_tool.ps1")
    let hookPostTool = "powershell7/todo_hook_post_tool.ps1"

    // @must_not_test(reason="Implemented in PowerShell: powershell7/configure_claude_hook.ps1")
    let hookConfigScript = "powershell7/configure_claude_hook.ps1"

    // @must_not_test(reason="Documentation: docs/codex-hook.md")
    let hookCodexDocs = "docs/codex-hook.md"

    // @must_not_test(reason="Implemented in TypeScript/Electron build system")
    let buildDistribution = "source/typescript/electron-builder.config.ts"

    // @must_not_test(reason="Implemented in PowerShell/Bash terminal monitors")
    let terminalMonitor = "powershell7/todo_live_monitor.ps1"

    // @must_not_test(reason="Electron IPC — replaced by single-process Avalonia architecture")
    let ipcBoundary = "N/A: Avalonia is single-process"

    // @must_not_test(reason="PowerShell scripts have no external module dependencies")
    let noExternalCliDeps = "powershell7/todo_live_monitor.ps1"
