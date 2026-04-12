# Electron Preload Scripts: ESM vs CommonJS Configuration Guide

## Overview
This document covers the configuration of Electron preload scripts, particularly the considerations between ES Modules (ESM) and CommonJS formats in Electron 36+.

## Key Concepts

### Preload Script Context
Preload scripts run in a special context that bridges the Node.js environment and the renderer process. They have access to Node.js APIs while being able to safely expose selected functionality to the renderer through the `contextBridge` API.

### Module Systems in Electron 36+

#### ES Modules (ESM)
- **Status**: Supported in Electron 36+, but with caveats for preload scripts
- **Syntax**: Uses `import/export` statements
- **File extension**: `.mjs` or `.js` with `"type": "module"` in package.json
- **Modern standard**: Aligns with browser-side module standards

#### CommonJS
- **Status**: Default and most robust for preload scripts
- **Syntax**: Uses `require()` and `module.exports`
- **File extension**: `.js` (default)
- **Stability**: Most reliable for preload scripts with full Node.js API access

## When to Use Each Module System

### CommonJS for Preload Scripts (Recommended)

**Use CommonJS when:**
1. **Sandboxed Preload Scripts**: The `module` object may be undefined in sandboxed contexts, causing ESM modules to fail
2. **Full Node.js API Access**: Preload scripts need reliable access to Node.js APIs
3. **Build Tool Compatibility**: Most bundlers (electron-vite, webpack) default to CommonJS for preload scripts
4. **Maximum Stability**: CommonJS is battle-tested and has fewer edge cases in the preload context

**Configuration Example:**
```json
// tsconfig.preload.json
{
  "compilerOptions": {
    "target": "ES2022",      // Modern JavaScript features
    "module": "CommonJS",    // CommonJS module output
    "lib": ["ES2022", "DOM"],
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

### ESM for Preload Scripts (Advanced)

**ESM can be used when:**
1. **Unsandboxed Context**: With `contextIsolation: true` and `sandbox: false`
2. **Modern Build Pipeline**: Your bundler is configured to handle ESM in preload context
3. **Import() Dynamic Imports**: You need dynamic imports for code splitting

**Potential Issues with ESM:**
- Preload script may run after page load
- `module` object undefined in sandboxed contexts
- Requires careful bundler configuration
- May have compatibility issues with certain Node.js modules

## Practical Implementation

### 1. TypeScript Configuration

For maximum stability, use this configuration:

```json
// tsconfig.preload.json (CommonJS - Recommended)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",    // Critical for preload stability
    "lib": ["ES2022", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/main/preload.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### 2. Main Process Configuration

The main process can use ES modules freely:

```json
// tsconfig.main.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",      // Main process can use ESM
    "lib": ["ES2022"],
    "moduleResolution": "node"
  }
}
```

### 3. Package.json Configuration

```json
{
  "type": "module",  // Enables ESM for main process
  "main": "dist/main/main.js",
  "scripts": {
    "build:main": "tsc -p tsconfig.main.json",
    "build:preload": "tsc -p tsconfig.preload.json"
  }
}
```

## Troubleshooting Common Issues

### Issue 1: "Cannot use import statement outside a module"
**Cause**: Preload script compiled as ESM but Electron expects CommonJS
**Solution**: Set `"module": "CommonJS"` in tsconfig.preload.json

### Issue 2: "window.electronAPI is undefined"
**Cause**: Preload script failed to load due to module format mismatch
**Solution**: Ensure preload script is compiled as CommonJS

### Issue 3: "module is not defined"
**Cause**: ESM preload script in sandboxed renderer
**Solution**: Use CommonJS for sandboxed preload scripts

## Best Practices

1. **Always use CommonJS for preload scripts** unless you have specific requirements for ESM
2. **Keep preload scripts minimal** - only expose necessary APIs through contextBridge
3. **Test with sandboxed renderers** to ensure compatibility
4. **Use separate TypeScript configs** for main, preload, and renderer processes
5. **Enable contextIsolation** for security (default in Electron 12+)

## Version Compatibility

| Electron Version | ESM Support | Preload Recommendation |
|-----------------|-------------|------------------------|
| < 28            | Limited     | CommonJS only          |
| 28-35           | Improved    | CommonJS recommended   |
| 36+             | Full        | CommonJS for stability, ESM possible with caveats |

## Example Preload Script (CommonJS)

```typescript
// src/main/preload.ts
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getTodos: () => ipcRenderer.invoke('get-todos'),
  onTodoUpdate: (callback: Function) => {
    ipcRenderer.on('todo-update', (_event, value) => callback(value));
  }
});
```

## Conclusion

While Electron 36+ supports ES modules, **CommonJS remains the most robust choice for preload scripts**. This ensures:
- Maximum compatibility with sandboxed renderers
- Reliable access to Node.js APIs
- Simpler build configuration
- Fewer runtime surprises

Use ESM for your main and renderer processes where modern JavaScript features provide clear benefits, but stick with CommonJS for preload scripts unless you have specific requirements that necessitate ESM.