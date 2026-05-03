# Q&A Summary — OpenSpec spec mode

User confirmed the following design decisions via AskUserQuestion before this spec was opened.

## Decision 1 — Scope: Init + AGENTS.md augmenté

ForgeKit will run `openspec init` natively (CLI provides 4 default skills + `openspec/config.yaml`) AND augment the generated `AGENTS.md` (Codex) and `CLAUDE.md` (Claude Code) with a documented OpenSpec workflow section.

**Out of scope:** copying CRM-specific skills (`relationship-crm-*`) from the reference project. Those are project-domain skills, not reusable scaffolding.

## Decision 2 — Workflow: speckit and openspec are mutually exclusive

A single spec mode is active per project. The existing `speckit: boolean` is replaced by `specMode: "speckit" | "openspec" | "none"`.

**Rationale:** speckit and openspec are two competing philosophies for the same problem (spec-driven development). Letting both coexist would create conflicting `.codex/skills/` and `.claude/skills/` subtrees. One source of truth.

## Decision 3 — CLI bootstrap: auto-install via `npx`

OpenSpec is invoked through `npx --yes @fission-ai/openspec@latest init --tools <aiTool> --force .`. No prerequisite global install.

**Rationale:** consistency with how scaffolding tools should "just work" out of the box, no preflight install step required from the user. Aligns with constitution §5 (network-failure tolerance: if npx fails, fall back to a warning, do not abort the whole project — same skip pattern as `initSpecify`).

## Decision 4 — `aiTool=none` hides OpenSpec

When the user picks `aiTool=none`, the OpenSpec option is removed from the spec-mode prompt entirely. OpenSpec without an AI tool integration produces only `openspec/config.yaml` with no skills, which is not useful.

**Rationale:** mirrors the existing speckit behaviour (`initSpecify` already returns early when `aiTool === "none"`).

## Constraints from the user message (load-bearing)

- Constitution §1: the new `openspec.ts` generator owns `openspec/` and the `.codex/skills/openspec-*` / `.claude/skills/openspec-*` subtrees that the OpenSpec CLI creates. The codex/claude-code generators must NOT touch those.
- Constitution §3: `specMode` lives in `ProjectConfig` and drives all downstream behaviour.
- Constitution §6: `specMode` is a 3-value union, not a class hierarchy or strategy pattern.
- Constitution §8: CLI detection is synchronous and early via `spawnSync` with `stdio: "ignore"` and `--help` (npx is the gate here, not `openspec` directly).
- Backwards compat: existing CLI flag `--speckit` maps to `specMode=speckit`. New flag `--openspec` maps to `specMode=openspec`.

## Decision 5 — `workflowMode` unifié, pas de champ `specMode` séparé (clarifié post-plan)

The original plan introduced a new `specMode` field alongside the existing `workflowMode`. The user explicitly rejected this: workflow mode must be a single 4-value enum.

Final model:

- `workflowMode: "speckit" | "openspec" | "vibe" | "none"` — single source of truth.
- `speckit: boolean` is removed entirely (was redundant with `workflowMode === "speckit"`).
- `speckitPreset` is asked only when `workflowMode === "speckit"`. OpenSpec has no preset.
- `gitStrategy` is asked only when `workflowMode === "vibe"` (existing behaviour, unchanged).

Rationale: cleaner per Constitution §6, eliminates impossible states (e.g. legacy `speckit: true` + `workflowMode: "vibe"`), and matches the user's mental model that "workflow mode is a single choice".

## Workflow choice

User explicitly asked for the full speckit.workflow (specify → plan → tasks → analyze) and to **stop before implementation**. No `sk:implement` invocation.
