# Tools Docs Status (ToM Alignment)

Updated: 2026-02-19

This directory was imported from an OpenClaw documentation set. Pages are now tagged with a ToM alignment note. Use this status file to track rewrite priority.

## Status legend

- `legacy-import`: retained for reference, not authoritative for current ToM runtime
- `active-reference`: currently useful for ToM workflows
- `rewrite-needed`: should be rewritten to native ToM command/runtime model

## Current inventory

| File | Status | Notes |
| --- | --- | --- |
| `agent-send.md` | legacy-import | OpenClaw agent CLI surface |
| `apply-patch.md` | active-reference | Patch format is still directly useful |
| `browser-linux-troubleshooting.md` | legacy-import | OpenClaw browser gateway specific |
| `browser-login.md` | legacy-import | OpenClaw browser relay specific |
| `browser.md` | legacy-import | OpenClaw browser tool runtime |
| `chrome-extension.md` | legacy-import | OpenClaw extension relay |
| `clawhub.md` | legacy-import | External OpenClaw skill registry |
| `creating-skills.md` | rewrite-needed | Needs ToM-native skill setup path |
| `elevated.md` | legacy-import | OpenClaw slash directives |
| `exec-approvals.md` | legacy-import | OpenClaw approvals model |
| `exec.md` | legacy-import | OpenClaw exec/process semantics |
| `firecrawl.md` | legacy-import | OpenClaw web-fetch integration |
| `index.md` | active-reference | ToM-aligned index + source-of-truth pointers |
| `llm-task.md` | legacy-import | OpenClaw plugin tool |
| `lobster.md` | legacy-import | OpenClaw/Lobster plugin flow |
| `loop-detection.md` | legacy-import | OpenClaw tool-loop policy schema |
| `multi-agent-sandbox-tools.md` | legacy-import | OpenClaw gateway sandbox model |
| `plugin.md` | legacy-import | OpenClaw plugin lifecycle |
| `reactions.md` | legacy-import | Channel stack not authoritative for current ToM runtime |
| `skills-config.md` | rewrite-needed | Uses OpenClaw home/config paths |
| `skills.md` | rewrite-needed | Needs ToM-native skill loading behavior |
| `slash-commands.md` | legacy-import | OpenClaw gateway parser model |
| `subagents.md` | legacy-import | OpenClaw sub-agent runtime |
| `thinking.md` | legacy-import | OpenClaw directive parser/model behavior |
| `web.md` | legacy-import | OpenClaw web tools |

## Next rewrite priorities

1. `creating-skills.md`
2. `skills-config.md`
3. `skills.md`
4. `exec.md` (if ToM native exec model is required)
5. `web.md` (if ToM web retrieval tool docs are needed)
