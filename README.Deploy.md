# Entropic — Build & Deploy

## Prerequisites

- **.NET 10 SDK** (`dotnet --version` should report `10.x`)
- **Git**
- Windows, macOS, or Linux desktop (Avalonia targets all three)
- Optional: an AI coding agent installed locally so there's data to display (`~/.claude/`, `~/.codex/`, or `~/.gemini/`)

## Clone

```sh
git clone <repo-url> Entropic
cd Entropic
```

## Build everything

```sh
cd source/dotnet
dotnet build Entropic.slnx
```

The `.slnx` file is the modern solution format; if your SDK doesn't recognize it, upgrade to .NET 10+.

## Build & run the desktop app

```sh
cd source/dotnet
dotnet run --project Entropic.GUI/Entropic.GUI.csproj
```

First run takes a few seconds for JIT. Subsequent runs are faster.

### Release build

```sh
cd source/dotnet
dotnet build Entropic.slnx -c Release
dotnet run --project Entropic.GUI/Entropic.GUI.csproj -c Release
```

### Self-contained publish (no .NET runtime required on target)

```sh
cd source/dotnet/Entropic.GUI
dotnet publish -c Release -r win-x64   --self-contained true
dotnet publish -c Release -r linux-x64 --self-contained true
dotnet publish -c Release -r osx-arm64 --self-contained true
```

Output lands in `bin/Release/net10.0/<rid>/publish/`. Copy that folder to the target machine and run `Entropic.GUI.exe` (or the matching binary).

## Run tests

```sh
cd source/dotnet

# All tests
dotnet test Entropic.slnx

# Just Core (F#)
dotnet test Entropic.Core.Tests/Entropic.Core.Tests.fsproj

# Just GUI (C#)
dotnet test Entropic.GUI.Tests/Entropic.GUI.Tests.csproj
```

Coverage is collected via `coverlet.collector` — pass `--collect:"XPlat Code Coverage"` for a report.

## First-run checks

1. Launch the app.
2. Confirm the five tabs are present (Ctrl+1–5).
3. If `~/.claude/projects/` exists, Project View should populate within a second.
4. F1 opens the help dialog; F5 forces a refresh.
5. The Git View discovers any repos referenced by the projects it found.

If the views are empty, check that at least one of `~/.claude/`, `~/.codex/`, or `~/.gemini/` contains actual session data.

## Alternative implementations

### TypeScript / Electron (legacy)

```sh
cd source/typescript
bun install          # per CLAUDE.md, prefer bun over npm
bun run build
bun start
```

Build installers:
```sh
bun run dist         # AppImage, macOS, Windows portable
```

### PowerShell 7 monitor

```powershell
pwsh powershell7/Launch-TodoMonitor.ps1
```
See [README-ps.md](README-ps.md).

### Bash monitor

```sh
bash/todo_live_monitor.sh
```
See [README-sh.md](README-sh.md). Note: new scripting work should be PowerShell Core or Python per project policy.

## Troubleshooting

| Symptom                                   | Likely cause                                           |
|-------------------------------------------|--------------------------------------------------------|
| "Unknown file extension .slnx"            | SDK older than .NET 10 — upgrade.                      |
| App starts but all tabs empty             | No agent data found under `~/.claude` etc.             |
| File locks on `Entropic.GUI.dll` on build | Previous instance still running; close it or kill PID. |
| Chat View blank                           | WebView2 runtime missing on Windows — install it.      |
| Two copies refuse to start                | Single-instance guard working as intended.             |

## CI / automation

No CI pipeline is currently committed. Build verification is:
```sh
dotnet build source/dotnet/Entropic.slnx -c Release
dotnet test  source/dotnet/Entropic.slnx -c Release
```
Both should exit 0.
