# Entropic — Vision

## What Entropic is for

Developers who use AI coding agents accumulate context in places they never look: TODO lists buried in `~/.claude/todos/`, JSONL transcripts scattered across project directories, commit trails that reference AI-generated changes. Each agent (Claude Code, Codex, Gemini) stores this data in its own silo. Entropic exists to bring that context into one room.

## The one-sentence vision

**A single pane of glass for everything your AI coding agents are doing, across every project, in real time.**

## Guiding principles

- **Local-first.** Entropic reads from your filesystem and never talks to the network. Your session data stays on your machine.
- **Provider-agnostic.** Claude, Codex, and Gemini should be equal citizens. The domain model is provider-aware but not provider-biased.
- **Read-only.** Entropic never mutates source transcripts or TODO files. It observes.
- **Live, not polled.** File watchers push updates into the UI within a debounce window; the dashboard reflects reality without manual refresh.
- **Keyboard-driven.** A developer should be able to run the app without touching the mouse.
- **Garage-scale.** Entropic is a 1-person prototype, not an enterprise platform. Simple wins over clever.

## What Entropic is NOT

- Not a chat client — it will not send messages to an LLM.
- Not a build system, test runner, or CI dashboard.
- Not a team tool — single user, single machine.
- Not a replacement for the agents themselves.

## Success looks like

You run Entropic in the background. When you switch projects, the Chat View shows what you asked the agent yesterday. The Global View tells you which TODOs are still open across all your repos. The Git View flags the repo you forgot to push. You never open a terminal to run `git status` or a file explorer to find a JSONL transcript again.
