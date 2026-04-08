# Entropic — Security

Entropic is a local-only, read-mostly desktop app. Its security posture is intentionally simple.

## Threat model (and non-model)

**In scope:**
- Avoiding accidental corruption of the user's agent data (Claude/Codex/Gemini directories).
- Avoiding leaking session transcripts off the local machine.
- Avoiding multi-instance races that could half-write Entropic's own preferences file.

**Out of scope:**
- Multi-user or multi-tenant isolation — Entropic is single-user.
- Network attackers — Entropic makes no network calls.
- Sandboxing the host OS — Entropic trusts the user's machine.
- Protecting against a malicious local user who already has read access to `~/.claude/`.

## Key properties

### No network
Entropic does not open sockets, make HTTP calls, or talk to any remote service. There are no telemetry beacons, no update checks, no cloud sync. Anything you see in the UI came from a file on your disk.

### No credentials
Entropic does not request, store, or transmit API keys. It never authenticates to Claude, OpenAI, or Google. Those agents have already written their data to disk; Entropic just reads it.

### Read-only by default
The adapters (`ClaudeAdapter`, `CodexAdapter`, `GeminiAdapter`) only open agent directories for reading. No write path exists in the normal refresh loop.

The only code that can write to agent directories is `RepairStrategies.fs`, and it only runs on explicit user action from the Diagnostics panel. Repair operations are narrow: they create missing sidecar metadata files. They do not modify existing transcripts or TODO files.

### Single-instance guard
`SingleInstanceGuard` ensures only one Entropic process runs per user session. This prevents two processes from racing on `entropic.json` writes or double-registering filesystem watchers.

### Own-data scope
The only file Entropic writes in normal operation is `entropic.json` (UI preferences). It lives under the user's profile and contains no secrets — just theme, window size, selected tab, provider toggles.

## What Entropic exposes

If someone has access to your Entropic window, they can see:
- Every project you've touched with any supported agent.
- Every TODO you've accumulated.
- Full session transcripts.
- Git commit history and repo status.

This is the same information they could get by reading `~/.claude/` directly. Entropic does not add or reduce attack surface on the agent data — it is a viewer.

## Dependency hygiene

- Third-party packages are pinned in the csproj/fsproj files (see [README.Technical.md](README.Technical.md)).
- WebView2 is used for Chat View HTML rendering. HTML is generated locally from the parsed JSONL; no remote content is loaded.
- No eval/dynamic-code-execution paths.

## Recommendations for users

- Treat Entropic's window like you treat your terminal: don't screen-share it to strangers.
- If you store secrets in TODO text (don't), remember they'll appear in Global View.
- Back up `~/.claude/` etc. if the data matters — Entropic is a viewer, not a backup tool.
