# Entropic Hexagon Plan

🟡 Preamble — Goal and Scope

Entropic becomes a clean‑room, provider‑agnostic hub for coding‑agent activity (todos + history) with Claude Code and OpenAI Codex as first‑class providers. The core (hexagon) depends only on stable ports; provider adapters live outside and translate each provider’s model/interface into Entropic’s domain.

🟢 1. Clean‑Room Architecture (Hexagon)
  🟢 1.1 Define Entropic domain types: Project, Session, Todo (provider‑agnostic).
  🟢 1.2 Define Ports (TypeScript interfaces): ProviderPort, PersistencePort, EventPort.
  🟢 1.3 Document identity rules: Project = (provider, projectPath); Session = (provider, sessionId).

🟢 2. Ports — ProviderPort (Interface)
  🟢 2.1 fetchProjects(): Promise<Result<Project[]>>.
  🟢 2.2 watchChanges(cb): Unsubscribe.
  🟢 2.3 collectDiagnostics(): Promise<Result<{ unknownCount; details: string }>>.
  🟢 2.4 repairMetadata(dryRun: boolean): Promise<Result<{ planned; written; unknownCount }>>.

🟢 3. Provider Adapter (outside hexagon)
  🟢 3.1 Read ~/.claude/projects (*.jsonl) + ~/.claude/todos (*.json) + sidecar meta via existing loader.
  🟢 3.2 Map sessions via {sessionId}.jsonl in project dir (extension fixed to .jsonl).
  🟢 3.3 Backfill metadata.json { path } when live repair runs (wired through repair module).
  🟢 3.4 Normalize timestamps, stamp provider.
  🟢 3.5 Expose per‑provider diagnostics + repair through ProviderPort (wired and returning counts/details).

🟢 4. AdapterCodex (outside hexagon)
  🟢 4.1 Read ~/.codex/projects + ~/.codex/todos.
  🟢 4.2 Add optional sidecar meta ~/.codex/todos/{sessionId}-agent.meta.json (app can backfill during repair).
  🟢 4.3 Implement same mapping policy (projectPath → JSONL → flattened+validate).
  🟢 4.4 Normalize timestamps, stamp provider.
  🟢 4.5 Provide diagnostics + repair.

🟢 5. Core Aggregator (inside hexagon)
  🟢 5.1 Fan‑out to all enabled adapters via ProviderPort.fetchProjects().
  🟢 5.2 Merge by (provider, projectPath); concat sessions; dedupe by (provider, sessionId).
  🟡 5.3 Compute global stats and emit EventPort.dataChanged().
  🟢 5.4 Return Result<Project[]> to renderer via IPC boundary.

🟡 6. File Watching (main process)
  🟡 6.1 Watch ~/.claude/{projects,todos} (exists today) and debounce updates.
  🔴 6.2 Watch ~/.codex/{projects,todos} and debounce updates.
  🔴 6.3 Broadcast a single, provider‑agnostic “data‑changed” event to renderer.

🔴 7. Renderer Integration
  🔴 7.1 Replace DI usage with a small IPC data service bound to the Aggregator port.
  🔴 7.2 Keep React components provider‑agnostic; display provider badges only.
  🔴 7.3 Provide a fallback empty‑state and resilient error toasts on Result<T> failure.

🔴 8. UI Enhancements
  🔴 8.1 Provider badges (Claude/Codex) on Projects and Global rows.
  🔴 8.2 Provider filters (toggle buttons) with persisted state.
  🟡 8.3 Diagnostics banner shows combined unknowns and per‑provider breakdown with Dry‑Run / Repair buttons (partially done for Claude).

🟡 9. Diagnostics & Repair (per provider)
  🟡 9.1 Dry‑Run by default; Live override from menu (implemented for Claude).
  🟡 9.2 Startup prompt if unknownCount exceeds threshold (implemented for Claude).
  🔴 9.3 Extend both to Codex and include per‑provider counts in dialogs.

🟢 10. Hook Scripts (capture sidecar projectPath)
  🟢 10.1 Claude: write ~/.claude/todos/{sessionId}-agent.meta.json { projectPath }.
  🔴 10.2 Codex: provide equivalent hook examples and docs.

🔴 11. Settings (PersistencePort)
  🔴 11.1 enabledProviders: { claude: true, codex: true }.
  🔴 11.2 Repair thresholds; default dry‑run.
  🔴 11.3 Menu toggles to update prefs and restart watchers.

🔴 12. Security & Privacy
  🔴 12.1 Restrict scanning to configured roots by default.
  🔴 12.2 No upload of diagnostics; local‑only processing.

🔴 13. Performance
  🔴 13.1 Adapter‑level caches and mtime checks; incremental reload.
  🔴 13.2 Debounce watcher events; collapse to a single refresh.
  🔴 13.3 Virtualize Global View rows if needed for large datasets.

🔴 14. Migration & Backward Compatibility
  🔴 14.1 Claude remains first‑class; Codex optional.
  🔴 14.2 Soft‑migrate current direct façade to Aggregator IPC without breaking UI.
  🔴 14.3 Remove legacy DI paths after Aggregator is proven.

🔴 15. Milestones & Acceptance
  🔴 15.1 Phase 0–1 scaffolding compiles; ClaudeAdapter returns identical data vs legacy.
  🔴 15.2 Aggregator merges Claude + synthetic Codex fixtures; UI shows provider badges.
  🔴 15.3 CodexAdapter reads real ~/.codex; watchers emit updates; diagnostics report per‑provider.
  🔴 15.4 Docs + hooks for Codex published; feature flag to enable Codex by default.
