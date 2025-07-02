# Plan: MCP Server Hierarchy Management (Pragmatic Version)

## Overview
Fix our MCP server configuration mess by using Claude Code's proper configuration files instead of the buggy `~/.claude.json`.

## Phase 1: Clean Up ~/.claude.json 🟢
### 1.1 Backup and remove mcpServers from ~/.claude.json 🟢
### 1.2 Remove empty mcpServers: {} from project sections 🟢

## Phase 2: Implement New CLI Structure 🟢
### 2.1 Add --scope flag [project|user|machine] 🟢
### 2.2 Add --add flag to add MCP servers 🟢
### 2.3 Add --remove flag to remove MCP servers 🟢
### 2.4 Update --list to accept optional scope 🟢

## Phase 3: Configuration File Management 🟢
### 3.1 Machine/System scope (macOS & Linux) 🟢
#### 3.1.1 macOS: /Library/Application Support/ClaudeCode/managed-settings.json 🟢
#### 3.1.2 Linux: /etc/claude-code/managed-settings.json 🟢
### 3.2 Project scope 🟢
#### 3.2.1 Primary: .mcp.json (for team sharing) 🟢
#### 3.2.2 Fallback: .claude/settings.json (committed) 🟢
### 3.3 User scope 🟡
#### 3.3.1 Primary: ~/.claude/settings.json 🟡
#### 3.3.2 Avoid: ~/.claude.json (due to bugs) 🟢

## Phase 4: Core Functions 🟢
### 4.1 List function 🟢
#### 4.1.1 --list: Show all scopes with hierarchy 🟢
#### 4.1.2 --list --scope user: Show only user servers 🟢
#### 4.1.3 --list --scope project: Show only project servers 🟢
#### 4.1.4 --list --scope machine: Show only system servers 🟢
### 4.2 Add function 🟢
#### 4.2.1 --add sequential-thinking --scope user 🟢
#### 4.2.2 --add linear context7 --scope project 🟢
#### 4.2.3 Check permissions for machine scope 🟢
### 4.3 Remove function 🟢
#### 4.3.1 --remove sequential-thinking --scope user 🟢
#### 4.3.2 Interactive selection if server exists at multiple scopes 🟢

## Phase 5: Migration & Validation 🟡
### 5.1 --migrate: Move servers from ~/.claude.json 🟢
### 5.2 Validate with `claude mcp list` after changes 🟡

## Success Criteria
- ✅ No direct manipulation of ~/.claude.json
- ✅ MCP servers manageable at all hierarchy levels
- ✅ Compatible with Claude Code's official CLI commands

## Legend
- 🔴 Not Started
- 🟡 In Progress  
- 🟢 Completed

## Important Discovery
During implementation, we discovered that:
1. Claude Code still requires MCP servers in `~/.claude.json` despite documentation suggesting otherwise
2. The `~/.claude/settings.json` file is created but not read by `claude mcp list`
3. The empty `mcpServers: {}` bug in project sections was successfully cleaned up
4. Migration from `~/.claude.json` works, but servers need to be re-added to `~/.claude.json` for Claude Code to see them

This suggests the Claude Code documentation may be aspirational or ahead of the actual implementation.
- ✅ Clear reporting of configuration hierarchy
- ✅ Safe add/remove operations with validation
- ✅ Compatibility with official Claude Code CLI commands

## Legend
- 🔴 Not Started
- 🟡 In Progress  
- 🟢 Completed