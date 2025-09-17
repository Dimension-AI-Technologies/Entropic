Entropic — Investigation TODOs

- [ ] Test the app launches and loads properly; trace execution flow-control, log files and screenshots.
  - Steps
    - Clean build: `cd typescript && npm run build`
    - Start app: `npm start` (production mode)
    - Observe main stdout for [MAIN] logs; in the app, open DevTools if needed.
    - Verify renderer receives debounced `data-changed` events (no `todo-files-changed` floods).
    - Use in-app menu Help → “Show Diagnostics…” to confirm provider counts.
    - Take a screenshot via menu or `window.electronAPI.takeScreenshot()` and confirm toast + clipboard path.
  - Capture
    - Renderer console (filter: data-changed, refresh, memory)
    - Main process logs: look for `[FileWatch]` and `[MAIN]` lines
    - Note any V8 OOM or render-process-gone events
  - Exit criteria
    - No blank screen on launch
    - No unbounded memory growth for 5+ minutes idle
    - Diagnostics/repair actions function for Claude and Codex

