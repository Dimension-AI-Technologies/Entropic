import { dialog, type BrowserWindow } from 'electron';

export function showHelp(mainWindow: BrowserWindow) {
  const helpContent = `
ClaudeToDo Help

WHAT THIS DOES
Monitor todo lists from Claude Code sessions. View todos by project. Track progress.

INTERFACE
• Left pane: Projects (folders where you used Claude Code)
• Right pane: Sessions (Claude conversations) and their todos
• Status icons: ● pending, ◐ in progress, ● completed

NAVIGATION  
• Click projects to switch between them
• Click sessions to view their todos
• Most recent project/session loads automatically

CONTROLS
• Edit todos: Double-click any todo text
• Move todos: Drag and drop to reorder
• Select multiple: Ctrl/Cmd+click, Shift+click for ranges
• Delete todos: Select and press Delete key
• Keyboard shortcuts work as expected

SORTING & FILTERING
• Sort projects: Alphabetical, by recent activity, by todo count
• Filter todos: Show all, pending only, or active only
• Adjust spacing: Normal, compact, or minimal padding

SESSION MANAGEMENT
• Merge sessions: Ctrl/Cmd+click multiple tabs, right-click → Merge
• Delete sessions: Right-click tab → Delete
• Failed reconstructions show when session files can't be found

ACTIVITY MODE
• Toggle Activity Mode button for live updates
• Auto-focuses newest session changes
• Polls for updates when enabled

TECHNICAL
• Data source: ~/.claude/todos/ folder (Claude Code session files)
• Project mapping: Attempts to match sessions to project directories
• File operations: Read-only monitoring, safe to delete files externally

That's it. No features you don't need.`;

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'ClaudeToDo Help',
    message: 'ClaudeToDo Help',
    detail: helpContent,
    buttons: ['Close'],
    defaultId: 0,
  });
}

