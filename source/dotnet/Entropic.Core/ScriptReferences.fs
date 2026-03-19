namespace Entropic.Core

/// References to functionality implemented in PowerShell/Bash/TypeScript scripts.
/// These requirements are satisfied by code outside the .NET codebase.

module ScriptReferences =

    // @must_not_test(reason="Implemented in PowerShell: powershell7/todo_live_monitor.ps1")
    // @must_test(REQ-CLI-001)
    // @must_test(REQ-CLI-004)
    // @must_test(REQ-CLI-005)
    let cliPowerShellMonitor = "powershell7/todo_live_monitor.ps1"

    // @must_not_test(reason="Implemented in PowerShell: powershell7/todo_live_monitor_spectre.ps1")
    // @must_test(REQ-CLI-002)
    // @must_test(REQ-CLI-006)
    let cliSpectreMonitor = "powershell7/todo_live_monitor_spectre.ps1"

    // @must_not_test(reason="Implemented in Bash: bash/todo_live_monitor.sh")
    // @must_test(REQ-CLI-003)
    let cliBashMonitor = "bash/todo_live_monitor.sh"

    // @must_not_test(reason="Implemented in PowerShell: powershell7/todo_hook_post_tool.ps1")
    // @must_test(REQ-HOK-001)
    // @must_test(REQ-HOK-002)
    // @must_test(REQ-HOK-003)
    // @must_test(REQ-HOK-004)
    let hookPostTool = "powershell7/todo_hook_post_tool.ps1"

    // @must_not_test(reason="Implemented in PowerShell: powershell7/configure_claude_hook.ps1")
    // @must_test(REQ-HOK-005)
    let hookConfigScript = "powershell7/configure_claude_hook.ps1"

    // @must_not_test(reason="Documentation: docs/codex-hook.md")
    // @must_test(REQ-HOK-006)
    let hookCodexDocs = "docs/codex-hook.md"

    // @must_not_test(reason="Implemented in TypeScript/Electron build system")
    // @must_test(REQ-BLD-001)
    // @must_test(REQ-BLD-002)
    // @must_test(REQ-BLD-003)
    // @must_test(REQ-BLD-005)
    // @must_test(REQ-BLD-006)
    let buildDistribution = "source/typescript/electron-builder.config.ts"

    // @must_not_test(reason="Implemented in PowerShell/Bash terminal monitors")
    // @must_test(REQ-PLT-002)
    let terminalMonitor = "powershell7/todo_live_monitor.ps1"

    // @must_not_test(reason="Electron IPC — replaced by single-process Avalonia architecture")
    // @must_test(REQ-ARC-004)
    let ipcBoundary = "N/A: Avalonia is single-process"

    // @must_not_test(reason="PowerShell scripts have no external module dependencies")
    // @must_test(REQ-ARC-007)
    let noExternalCliDeps = "powershell7/todo_live_monitor.ps1"
