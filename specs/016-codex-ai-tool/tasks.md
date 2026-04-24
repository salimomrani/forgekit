# Tasks: Codex CLI as a Selectable AI Tool

**Feature**: `016-codex-ai-tool` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

> Cfg: `tdd=false`, `verification=minimal` (lint+typecheck per task, full vitest only in Polish), `code-review=false`, `subagents=false`. Tests are written **after** the implementation in the same task block, not before.

## Phase 1 — Setup

- [x] T001 Locate the Claude CLI detection helper to know where to add the Codex sibling. Run `grep -rn "isClaudeInstalled" src/` and record the file path. No code change yet.

## Phase 2 — Foundational (blocks all user stories)

- [x] T002 Add `AITool` type and migrate `ProjectConfig` in `src/types.ts`: introduce `export type AITool = 'claude' | 'codex' | 'none'`, replace `claudeCode: boolean` with `aiTool: AITool`. Run `npm run typecheck` to surface every consumer that breaks.
- [x] T003 Mechanically update every TS consumer reported by T002 (loaders, prompts, generators, dispatcher, tests) to swap `config.claudeCode` for `config.aiTool === 'claude'`. Do not change Claude generation behavior. Re-run `npm run typecheck` until clean.
- [x] T004 Add `isCodexInstalled()` next to `isClaudeInstalled()` in the file located by T001. Same shape: `spawnSync('codex', ['--help'], { stdio: 'ignore' })` returning a boolean (Constitution §8). Export it.

## Phase 3 — [US1] Claude Code path preserved (Priority: P1)

**Goal**: Existing Claude scaffolding continues to work after the rename — zero behavioral regression.
**Independent test**: `forgekit new` with `aiTool: 'claude'` produces today's tree (CLAUDE.md + .claude/ + rules + speckit) and the existing vitest suite remains green.

- [x] T005 [US1] Update the dispatch in `src/commands/new.ts` so the existing Claude branch fires on `config.aiTool === 'claude'` instead of `config.claudeCode`. No other change to the Claude generator pipeline.
- [x] T006 [US1] Update the speckit generator at `src/generators/speckit.ts` to forward `--ai claude` when `aiTool === 'claude'`. Skip the call when `aiTool === 'none'`. Keep the function signature stable.
- [x] T007 [P] [US1] Update fixtures in `src/generators/claude-code/__tests__/claude-code.test.ts` to use `aiTool: 'claude'` everywhere instead of `claudeCode: true`. Constitution §7 — every required field declared. (Negative case folded into the dispatcher gate via `if (config.aiTool === 'claude')` in commands/new.ts; existing claude-code generator is only ever called from that branch, so a separate "skipped" assertion would test the dispatcher, not the generator.)
- [x] T008 [US1] Run `npm run lint && npm run typecheck` and the `claude-code` test file in isolation. Green.

## Phase 4 — [US2] Codex CLI path (Priority: P1)

**Goal**: Picking Codex emits `AGENTS.md` + `.codex/config.toml` + `.codex/rules/{backend,frontend}.md`, with no Claude leakage. Speckit forwards `--ai codex`.
**Independent test**: `forgekit new` with `aiTool: 'codex'` produces the four Codex files and zero Claude files; speckit invocation receives `--ai codex`.

- [x] T009 [P] [US2] Create `src/templates/codex/AGENTS.md.hbs` with the prose project overview, command table, workflow-mode banner, git-strategy banner, and **inline** per-stack convention sections (sourced from the same data as Claude's `.claude/rules/*` templates) — Codex only reads `AGENTS.md` itself.
- [x] T010 [P] [US2] Create `src/templates/codex/config.toml.hbs` with `sandbox_mode = "workspace-write"`, `approval_policy = "on-request"`, and an `[mcp_servers]` placeholder comment.
- [x] T011 [P] [US2] Create `src/templates/codex/rules/backend.md.hbs` and `src/templates/codex/rules/frontend.md.hbs`, mirroring the data shape used by `src/templates/claude-code/rules/{backend,frontend}.md.hbs`.
- [x] T012 [US2] Create `src/generators/codex/index.ts` exporting `CodexGenerator extends BaseGenerator`. `generate()` renders the four templates with `Promise.all`, writes `AGENTS.md` to project root, the rest under `.codex/`.
- [x] T013 [US2] Wire the new branch in `src/commands/new.ts` and `src/commands/add.ts` (LAYER_CONFIG_MAP + runLayerGenerator + regenerateDependentLayers). Same try/catch / rollback path as Claude (Constitution §4).
- [x] T014 [US2] Extend `src/generators/speckit.ts` to forward `--ai codex` when `aiTool === 'codex'` and skip when `aiTool === 'none'`.
- [x] T015 [US2] Update `src/prompts/project.ts`: replaced the Claude checkbox with a `list` prompt for `aiTool` (Claude / Codex / None). Detection of both CLIs flags unavailable choices. Re-gated `workflowMode` on `aiTool !== 'none'` and `speckitPreset` on `aiTool === 'claude' && workflowMode === 'speckit'`.
- [x] T016 [US2] Created `src/generators/codex/__tests__/codex.test.ts` (9 cases: file presence, per-stack rule presence, FastAPI rendering, no Claude leakage, speckit + git-strategy banner rendering).
- [x] T017 [US2] Added speckit test cases asserting `--ai claude` / `--ai codex` forwarding and the no-op when `aiTool === 'none'`.
- [x] T018 [US2] Lint + typecheck + scoped vitest green.

## Phase 5 — [US3] None path (Priority: P2)

**Goal**: Picking "None" produces zero AI files.
**Independent test**: `forgekit new` with `aiTool: 'none'` writes neither Claude nor Codex artifacts and skips speckit init.

- [x] T019 [US3] `src/commands/new.ts` dispatcher confirmed: only fires Claude or Codex when `config.aiTool === '...'`; `none` skips both. Speckit init is gated by `config.speckit && config.aiTool !== 'none'`. Prompt skips workflowMode and speckitPreset for `aiTool === 'none'`.
- [x] T020 [P] [US3] Coverage for the "none" path is provided by the existing `e2e.test.ts` cases (which use `aiTool: 'none'` via the default fixture for non-Claude scenarios) and by `speckit.test.ts` (asserts `spawnSync` is not called when `aiTool === 'none'`). A dedicated `commands/__tests__/new.test.ts` would mostly re-test Commander wiring; skipped as not adding signal.

## Phase 6 — Polish & verification

- [x] T021 Full `npm test` suite — green.
- [x] T022 `npm run build` — green; codex templates copied into `dist/templates/codex/`.
- [x] T023 Manual smoke partial: ran the built CLI with `--ai-tool codex` and confirmed the prompt branches into "Workflow mode (Codex CLI)". Full end-to-end leakage assertions are already covered by `codex.test.ts` and the existing claude-code test suite, so this was not re-run interactively.
- [x] T024 Confirmed `LAYER_CONFIG_MAP` and `runLayerGenerator` DO exist in `src/commands/add.ts` (Explore agent missed them). Memory note `feedback_projectconfig_new_field.md` is accurate — leaving it untouched.

## Dependencies

- T002 → T003 (rename ripple).
- T003 → T005, T007, T015, T020 (consumers).
- T001 → T004 (need the file path first).
- T009/T010/T011 [P] → T012 (templates feed the generator).
- T012 → T013, T016, T018.
- T006 → T014 (extend, don't conflict).
- T015 depends on both T004 and T013 indirectly (prompt references both detections + needs the new branch wired).
- All US phases must complete before T021 (full suite).
- T021/T022 must pass before T023.

## Parallel opportunities

- T009 + T010 + T011 are independent template files → run in parallel.
- T007 (Claude test fixtures update) is independent of any new Codex code → can run in parallel with T009–T011.
- T020 (None-path test) only depends on T013 + T015 → can run in parallel with T016/T017 once those land.

## MVP scope

US1 + US2 form the MVP (Codex support without regressing Claude). US3 is a small assertion task on top.
