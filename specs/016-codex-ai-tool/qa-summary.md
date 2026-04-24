# Q&A Summary — Codex CLI as AI tool option

Confirmed by user before spec generation:

## 1. ProjectConfig field shape
**Decision:** Replace `claudeCode: boolean` with an enum `aiTool: 'claude' | 'codex' | 'none'`.
- Hard rename — no compat shim, no parallel boolean.
- `AITool` type added to `src/types.ts`.

## 2. Codex generator scope
**Decision:** Generate three artifacts when `aiTool === 'codex'`:
- `AGENTS.md` at project root — prose instructions with stack-specific conventions embedded inline (since Codex's `project_doc` discovery only reads `AGENTS.md` itself, not subfiles).
- `.codex/config.toml` — minimal TOML with `sandbox_mode`, `approval_policy`, optional MCP block.
- `.codex/rules/{backend,frontend}.md` — explicit user choice: keep a `rules/` directory as a human/IDE convention, even though Codex CLI does not natively read it. Risk acknowledged.

**Not generated** for Codex: hooks, skills, slash commands, hookify files, `.claude/settings.json` equivalent — none of these exist as concepts in Codex CLI.

## 3. Speckit + Codex
**Decision:** `specify init --ai codex --no-git` runs the same way as for Claude. Constitution template (`.specify/memory/constitution.md`) is generated identically. **The `speckitPreset` prompt is skipped** when `aiTool === 'codex'` because presets translate into a `.claude/settings.json` speckit block, which Codex cannot read.

## 4. "None" option
**Decision:** Keep `aiTool: 'none'` as a valid choice, preserving the current `claudeCode: false` behavior (no AI tooling files emitted at all).

## Out of scope
- No backward-compat shim for the renamed field.
- No support for additional AI tools (Cursor, Gemini, etc.) in this iteration.
- No refactor of the BaseGenerator pattern.
- No extraction of shared rules-rendering module — only 2 callsites (Claude + Codex), per Constitution §6.
