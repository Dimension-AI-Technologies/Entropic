# Project History

## 2025-09-17: Fixed File Watcher Feedback Loop and Memory Leak

### Problem
- Application experiencing Out of Memory (OOM) crashes after Electron 36 upgrade
- Auto-selection bug: ".claude" project was being selected automatically without user interaction
- Memory usage growing rapidly, causing renderer process crashes

### Root Cause
- File watchers were emitting high-frequency `todo-files-changed` events
- Renderer subscribed to both immediate and debounced events
- This created a feedback loop: file change → reload → file change → reload
- Electron 36's file watcher behavior is more chatty than previous versions
- Attempted fixes using React useEffect hooks made the problem worse by introducing infinite loops

### Solution
1. **Fixed File Watcher Events**
   - Removed immediate legacy `todo-files-changed` emissions from fileWatchers.ts
   - Removed `onTodoFilesChanged` subscriptions from renderer DI facade
   - Kept only debounced `data-changed` events (300ms debounce)

2. **Verified Stability**
   - App now runs with stable memory usage (0.1-0.2% MEM)
   - No OOM crashes after extended runtime
   - Auto-selection behavior fixed - no unwanted project switching

### Technical Details
- File watcher feedback loops can amplify with more responsive file system monitoring
- Debouncing is critical for file system events to prevent cascade effects
- React useEffect dependency arrays must be carefully managed to avoid infinite loops

## 2025-09-17: Fixed Electron Preload Script and Updated Dependencies

### Problem
- Application was not loading projects - UI showed "NOTHING loads"
- Preload script was failing with "SyntaxError: Cannot use import statement outside a module"
- This broke IPC communication between main and renderer processes

### Root Cause
- TypeScript was compiling the preload script as ES modules (`"module": "ES2022"`)
- Electron's preload context requires CommonJS for stability and compatibility
- Without the preload script, `window.electronAPI` was undefined, preventing project loading

### Solution
1. **Fixed Preload Script Configuration**
   - Changed `tsconfig.preload.json` to use `"module": "CommonJS"`
   - Kept modern JavaScript features with `"target": "ES2022"`
   - This ensures maximum stability with Electron's preload context

2. **Updated All Dependencies**
   - Updated Electron from incorrect 38.0.0 to stable 36.9.1
   - Created `scripts/update-to-latest.js` for automatic version management
   - Updated all packages to latest stable versions:
     - React 19.1.1
     - Vite 7.1.5
     - TypeScript 5.9.2
     - And all other dependencies

3. **Added Documentation**
   - Created `Note.Electron.Preload.Scripts.md` documenting ESM vs CommonJS in Electron
   - Explains why CommonJS is recommended for preload scripts
   - Includes troubleshooting guide and best practices

4. **Enhanced Diagnostics**
   - Added diagnostic IPC handlers for debugging
   - Added global view refresh capabilities
   - Improved error handling and logging

### Result
- Projects now load correctly (15 projects, 55 sessions)
- IPC communication restored between main and renderer
- Application working with latest stable package versions
- No JavaScript errors in console

### Technical Details
- Preload scripts in Electron 36+ support ES modules but CommonJS is more stable
- Sandboxed renderers may have undefined `module` object with ESM
- Build tools like electron-vite default to CommonJS for preload scripts
- Full Node.js API access is most reliable with CommonJS

## Previous Updates
(Add previous history entries here)| 2025-09-21 18:29:09 | doowell2 | refactor: enhance UI with splash screen and improve error handling |
| 2025-09-22 09:12:33 | doowell2 | refactor: simplify splash screen and improve app initialization |
