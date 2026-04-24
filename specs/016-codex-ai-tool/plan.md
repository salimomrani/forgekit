# Implementation Plan: Codex CLI as a Selectable AI Tool

**Branch**: `016-codex-ai-tool` | **Date**: 2026-04-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-codex-ai-tool/spec.md`

## Summary

Replace the existing `claudeCode: boolean` flag in `ProjectConfig` with `aiTool: 'claude' | 'codex' | 'none'`, branch the generator dispatcher on it, add a new `CodexGenerator` that emits `AGENTS.md` + `.codex/config.toml` + `.codex/rules/{backend,frontend}.md`, and parameterize the existing `speckit` generator so `specify init` receives the correct `--ai` flag for each tool. Skip the `speckitPreset` prompt for Codex.

## Technical Context

**Language/Version**: TypeScript 5.9 / Node.js ≥20
**Primary Dependencies**: Commander 14, Inquirer 8, Handlebars 4 (existing — no new deps)
**Storage**: N/A (CLI scaffolder; reads/writes filesystem only)
**Testing**: Vitest 4 + @vitest/coverage-v8 (existing)
**Target Platform**: Local developer machines (macOS, Linux, Windows via Node)
**Project Type**: CLI tool (single project, single module tree)
**Performance Goals**: N/A (one-shot scaffolding; existing constraints apply: parallel I/O per Constitution §10)
**Constraints**: Must follow ForgeKit Constitution (single layer per generator, fail-fast rollback, no speculative abstractions)
**Scale/Scope**: ~5 modified files + ~5 new files; ~3 new vitest suites or expanded suites

## Constitution Check

*GATE: Must pass before implementation. Re-check after Phase 1 design.*

| Constitution Rule | Compliance |
|---|---|
| §1 — One layer per generator | ✅ `CodexGenerator` writes only `AGENTS.md` + `.codex/`. `ClaudeCodeGenerator` unchanged. `speckit.ts` continues owning `.specify/`. |
| §2 — Templates contain zero logic | ✅ All branching (per-stack rules, presence of MCP) lives in `CodexGenerator`. Handlebars templates receive a flat data object. |
| §3 — ProjectConfig is single source of truth | ✅ `aiTool` flows top-down. No filesystem probing inside generators. |
| §4 — Fail fast, rollback completely | ✅ Existing rollback in `commands/new.ts` already wraps generators. Codex generator integrates into the same try/catch. |
| §5 — Network failures silent | ✅ No new network calls. Codex generator has no version-fetch path. |
| §6 — No speculative abstractions | ✅ Per-stack rule rendering has only 2 callsites (Claude, Codex). No shared module extracted. |
| §7 — Tests declare all fixture fields | ✅ All Claude tests will be updated to swap `claudeCode: true` → `aiTool: 'claude'`. New Codex tests follow same rule. |
| §8 — CLI detection synchronous + early | ✅ New `isCodexInstalled()` mirrors `isClaudeInstalled()`: `spawnSync` with `stdio: 'ignore'` and `--help`. |
| §9 — Release only via pipeline | ✅ No release-script changes. |
| §10 — I/O parallelized | ✅ `AGENTS.md`, `.codex/config.toml`, `.codex/rules/backend.md`, `.codex/rules/frontend.md` are independent → `Promise.all`. |

**No violations. Complexity Tracking section omitted.**

## Project Structure

### Documentation (this feature)

```text
specs/016-codex-ai-tool/
├── plan.md              # This file
├── spec.md              # Feature spec
├── qa-summary.md        # Confirmed scope from Q&A
├── checklists/
│   └── requirements.md  # Spec-quality checklist
└── tasks.md             # Phase 2 output (sk:tasks)
```

`research.md`, `data-model.md`, and `contracts/` are intentionally **not generated** (plan-detail=low + no genuine technical unknowns + no entity model + no external wire contract).

### Source Code (repository root)

```text
src/
├── types.ts                                       [MODIFY: add AITool, swap claudeCode → aiTool]
├── prompts/
│   └── project.ts                                 [MODIFY: list-prompt for aiTool, conditional preset]
├── utils/
│   └── (cli-detect helper file)                   [MODIFY: add isCodexInstalled]
├── commands/
│   └── new.ts                                     [MODIFY: branch on aiTool]
├── generators/
│   ├── claude-code/
│   │   ├── index.ts                               [MODIFY: gate on aiTool === 'claude' externally]
│   │   └── __tests__/claude-code.test.ts          [MODIFY: fixtures use aiTool: 'claude']
│   ├── codex/
│   │   ├── index.ts                               [NEW: CodexGenerator]
│   │   └── __tests__/codex.test.ts                [NEW: vitest suite]
│   └── speckit.ts                                 [MODIFY: forward --ai based on aiTool]
└── templates/
    └── codex/
        ├── AGENTS.md.hbs                          [NEW]
        ├── config.toml.hbs                        [NEW]
        └── rules/
            ├── backend.md.hbs                     [NEW]
            └── frontend.md.hbs                    [NEW]
```

**Structure Decision**: Single Node project, existing `src/` layout. New work confined to `src/generators/codex/` and `src/templates/codex/`. No top-level reshuffling.

## Implementation Phases (high level)

Following `cfg`: `tdd=false, verification=minimal, code-review=false, security-review=auto, subagents=false, fast-mode=true`. Per-task loop: write impl → write tests → `npm run lint && npm run typecheck`. Full `npm test` runs once in Phase 3.

### Phase 2 — Direct implementation (per-task loop, no subagents)

1. **Type migration** — `src/types.ts`: add `AITool`, replace `claudeCode` with `aiTool`. Mechanical rename across the codebase.
2. **CLI detection** — locate `isClaudeInstalled` (likely in `src/utils/`), add sibling `isCodexInstalled`. Same shape: `spawnSync('codex', ['--help'], { stdio: 'ignore' })`.
3. **Prompt rewiring** — `src/prompts/project.ts`: replace the Claude checkbox with a single `list` question for `aiTool`. Re-gate `workflowMode` on `aiTool !== 'none'` and `speckitPreset` on `aiTool === 'claude' && workflowMode === 'speckit'`.
4. **Dispatch update** — `src/commands/new.ts`: replace `if (config.claudeCode)` with `if (config.aiTool === 'claude')` and add an `else if (config.aiTool === 'codex')` branch invoking the new generator.
5. **Speckit generator** — `src/generators/speckit.ts`: forward `--ai claude` or `--ai codex` based on `config.aiTool`. Skip when `aiTool === 'none'`.
6. **Codex generator** — `src/generators/codex/index.ts`: new class extending `BaseGenerator`. Renders the four templates via `Promise.all`.
7. **Codex templates** — write the four `.hbs` files. Embed per-stack rule text in `AGENTS.md.hbs` since Codex does not read sub-files reliably. Keep `.codex/rules/*.md` for human/IDE convention.
8. **Update Claude tests** — swap `claudeCode: true` → `aiTool: 'claude'` everywhere. Add a "no Claude artifacts when aiTool !== 'claude'" case.
9. **Codex tests** — new suite asserting file presence per stack, content shape, no Claude leakage, and proper `--ai codex` forwarding to speckit.
10. **Smoke build** — `npm run build && npm run lint && npm run typecheck`.

### Phase 3 — Verification & ship

- Run full `npm test` once. Must be green.
- Security review (auto): touches no auth/input/secrets/external APIs → **skip** per cfg.
- Code review (cfg=false) → skip.
- `commit-commands:commit-push-pr` with title `feat(cli): add Codex CLI as AI tool option`.

## Risks / Unknowns (still open)

- The exact module path of `isClaudeInstalled` was not pinned in research; resolve at impl time via `grep -r "isClaudeInstalled" src/`.
- `BaseGenerator` is reportedly minimal (constructor + abstract `generate()`); confirm the constructor signature before subclassing.
- Old preset/JSON config files (if any exist in the wild) carrying `claudeCode: true` will break loudly. The spec accepts this.
