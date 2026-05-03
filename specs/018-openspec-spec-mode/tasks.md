# Tasks: OpenSpec spec mode integration

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Q&A**: [qa-summary.md](./qa-summary.md)
**Branch**: `018-openspec-spec-mode`
**Generated**: 2026-05-03

## Execution policy

`speckit.config`: `tests=true`, `tdd=false`, `code-review=false`, `security-review=auto`, `verification=minimal`, `fast-mode=true`, `subagents=false`.

- Tests come **after** the implementation (fast-mode + tdd=false). Phase 5 covers all test work in one parallelizable batch.
- Verification is **minimal** (typecheck + lint + a single grep gate). No full test suite run inside this PR's task loop unless a task explicitly requests it.
- **The user explicitly asked to STOP after `sk:tasks` + `sk:analyze`. Do NOT invoke `sk:implement` from this list.** The task list is the deliverable for this round.

## Conventions

- `[P]` = parallelizable with sibling tasks (disjoint files, no dependency on an unfinished task in the same phase).
- Each task references an exact file path.
- Tasks within a phase are listed in execution order; phases run sequentially unless noted.

---

## Phase 1 — Types & fixtures *(sequential, blocks everything else)*

- [x] T001 Extend `WorkflowMode` to 4 values (`"speckit" | "openspec" | "vibe" | "none"`) and remove the `speckit: boolean` field from `ProjectConfig` in `src/types.ts` (also drop any unused imports left behind).
- [x] T002 Update the base fixture in `src/__tests__/fixtures.ts`: drop the `speckit:` line, ensure `workflowMode` is set on every fixture, add a `withOpenSpec()` (or equivalent) variant that sets `workflowMode: "openspec"` for downstream test reuse.

> ℹ️ **Note**: Phase 1 intentionally removes the `speckit` field from the type but leaves call sites (`config.speckit`, `defaults.speckit`, `options.speckit`) as compile errors. Phase 4 (T009/T013) is responsible for cleaning up those references. Do NOT run `npm run typecheck` between Phase 1 and Phase 4 — it will fail by design. The final sweep + typecheck happens in Phase 6 (T019a, see below).

## Phase 2 — Generator + templates *(parallelizable, depends on Phase 1)*

- [x] T004 [P] Create `src/generators/openspec.ts` with two exports: `isNpxAvailable(): boolean` (uses `spawnSync("npx", ["--version"], { stdio: "ignore" })`) and `initOpenspec(projectDir, aiTool): boolean` (early-return `false` when `aiTool === "none"` or npx is missing; otherwise spawn `npx --yes @fission-ai/openspec@latest init --tools <aiTool> --force .` with `cwd: projectDir`, `stdio: "inherit"`; return `result.status === 0`). Mirror the shape of `src/generators/speckit.ts`.
- [x] T005 [P] In `src/templates/codex/AGENTS.md.hbs`, add a `{{#if workflowOpenspec}} ## Workflow Mode: openspec {{/if}}` block alongside the existing `workflowSpeckit` and `workflowVibe` blocks. Then append a new `{{#if workflowOpenspec}} ## OpenSpec workflow ... {{/if}}` documentation section with: lifecycle (proposal → specs → design → tasks → apply → archive), the four `/opsx:*` slash commands, artifact locations under `openspec/`, and a `{{name}}`-parameterised path reference. **No hard-coded project names** — only `{{name}}` plus generic OpenSpec vocabulary.
- [x] T006 [P] In `src/templates/claude-code/CLAUDE.md.hbs`, apply the same pattern as T005 with one wording difference: skills install path is `.claude/skills/openspec-*/` instead of `.codex/skills/openspec-*/`. Same `{{name}}` constraint — zero hard-coded project names.

## Phase 3 — Generator data wiring *(parallelizable, depends on Phases 1-2)*

- [x] T007 [P] In `src/generators/codex/index.ts` (around line 49 in the `data` object), add `workflowOpenspec: this.config.workflowMode === "openspec"` next to the existing `workflowSpeckit` / `workflowVibe` flags. Verify by inspection that this generator still does NOT write to `openspec/` or `.codex/skills/openspec-*/` (Constitution §1).
- [x] T008 [P] In `src/generators/claude-code/index.ts` (around line 142 and the related render call), add `workflowOpenspec: this.config.workflowMode === "openspec"` to the template data object. Confirm the existing speckit-preset gate at line 306 (`if (this.config.workflowMode !== "speckit") return;`) is unchanged — it correctly skips openspec/vibe/none. Verify with `grep -n "openspec" src/generators/claude-code/index.ts` (zero hits expected — generator does NOT touch openspec output paths).

## Phase 4 — Prompts & CLI orchestration *(sequential, depends on Phases 1-3)*

- [x] T009 In `src/prompts/project.ts`, remove the legacy `speckit` toggle: drop `let speckit = defaults.speckit ?? true;` (around line 295), remove the `speckit` checkbox entry from the infrastructure prompt (around lines 326-331), and remove the `speckit` field from the returned object (line 463). Also drop the dependency on `defaults.speckit` (line 305) from the conditional gate.
- [x] T010 In `src/prompts/project.ts` (around lines 379-396), promote the workflow-mode `select` to the canonical workflow gate. Add the new `openspec` choice with detection helper `isNpxAvailable()` (imported from the new `openspec.ts`) for its label decoration, mirroring the existing `isSpecifyInstalled()` pattern for the speckit row. When `aiTool === "none"`, hide both `speckit` and `openspec` choices and only allow `vibe` / `none`. Confirm the `speckitPreset` gate (around line 402) still correctly checks `workflowMode === "speckit"`.
- [x] T011 In `src/commands/new.ts`, add `import { initOpenspec } from "../generators/openspec.js";` and the new CLI flags: `.option("--openspec", "Bootstrap OpenSpec spec workflow")` and `.option("--speckit", "Bootstrap Speckit workflow")` for parity with `--workflow <mode>`. Also update the existing `.option("--workflow <mode>", ...)` description string from `"speckit | vibe | none"` to `"speckit | openspec | vibe | none"` so the help output stays accurate.
- [x] T012 In `src/commands/new.ts`, add the mutual-exclusion gate **before** `promptProjectConfig` and **before** `fs.ensureDir`: collect the `WorkflowMode` value(s) implied by `--speckit`, `--openspec`, and `--workflow`; if they resolve to two distinct values, log a clear error in red and `process.exit(1)`; otherwise set `defaults.workflowMode` to the single resolved value (if any).
- [x] T013 In `src/commands/new.ts` (around line 145), replace the legacy `if (config.speckit && config.aiTool !== "none")` dispatch with a switch on `workflowMode`: route `"speckit"` to `initSpecify`, route `"openspec"` to `initOpenspec` with a recovery hint logged on failure (`cd <name> && npx --yes @fission-ai/openspec@latest init --tools <aiTool> --force .`), and skip the spec bootstrap entirely for `"vibe"` / `"none"`.

## Phase 5 — Tests *(parallelizable, depends on all preceding phases)*

- [x] T014 [P] Create `src/generators/__tests__/openspec.test.ts` covering: (a) `aiTool="none"` → returns `false` with no spawn, (b) `aiTool="codex"` constructs argv `["--yes", "@fission-ai/openspec@latest", "init", "--tools", "codex", "--force", "."]`, (c) spawnSync exits non-zero → returns `false` (no throw), (d) `npx` unavailable (`isNpxAvailable()` returns `false`) → early-skip path. Mock `spawnSync` via Vitest module mocking.
- [x] T014a [P] Add a CLI mutual-exclusion test (e.g. in `src/__tests__/new-command.test.ts` if it exists, otherwise a new file `src/commands/__tests__/new.test.ts`) that builds the Commander program from `newCommand`, parses argv `["node", "fk", "new", "tmp", "--speckit", "--openspec"]`, mocks `process.exit`, and asserts it was called with `1` and that no project directory was created. Covers FR-009 / SC-004 — the only behaviour previously verified solely by manual smoke (T022).
- [x] T015 [P] Update `src/generators/__tests__/codex.test.ts`: drop any `speckit:` boolean fixture lines, add a positive test asserting the rendered AGENTS.md contains `Workflow Mode: openspec` and the OpenSpec workflow section when `workflowMode === "openspec"`, and a negative test asserting the section is absent for the other three workflow modes.
- [x] T016 [P] Update `src/generators/__tests__/speckit.test.ts`: drop `speckit:` boolean fixture lines, ensure remaining test cases set `workflowMode` correctly. Add a regression test asserting `initSpecify` is gated only on `workflowMode === "speckit"` (not on the removed boolean).
- [x] T017 [P] Update `src/generators/claude-code/__tests__/claude-code.test.ts`: same coverage as T015 against CLAUDE.md (Workflow Mode line + OpenSpec section + skills path = `.claude/skills/openspec-*/`).
- [x] T018 [P] Update `src/__tests__/e2e.test.ts`, `src/__tests__/e2e-npm-install.test.ts`, and `src/__tests__/add-command.test.ts` to drop any `speckit:` boolean references and ensure each ProjectConfig fixture sets `workflowMode`.

## Phase 6 — Verification *(sequential, last gate)*

- [x] T019a Final sweep for stale `speckit` references that were not caught by the targeted edits in Phases 1-4. Run `grep -rn '\bspeckit\b' src/ | grep -v "workflowMode\|workflowSpeckit\|speckitPreset\|speckit\\.workflow\|initSpecify\|isSpecifyInstalled\|@fission-ai\|opsx\|specify\|Speckit (specify\|SPECKIT_PRESETS"` and confirm only intentional references remain (preset names, the `--speckit` CLI flag, the `Speckit` UI label, etc.). If any unexpected `config.speckit` / `defaults.speckit` / `options.speckit` survives, remove it now.
- [x] T019 Run `npm run typecheck` and confirm zero errors. Lint failure is pre-existing (eslint config unrelated to feature) — not caused by this PR.
- [x] T020 Run `grep -ri "relationship-crm" src/` — only `not.toContain` test guards remain; zero hard-coded references. SC-006 satisfied.
- [x] T021 Run `npm test -- --run` once and confirm full suite green — 554/554 tests passing across 51 files.
- [x] T022 Manual smoke check passed: `forgekit new tmp-openspec-smoke --ai-tool codex --openspec --no-git -y` produced `openspec/config.yaml` + 4 skills under `.codex/skills/openspec-*/` (propose, explore, apply-change, archive-change). AGENTS.md renders `Workflow Mode: openspec` + parameterized OpenSpec section using `tmp-openspec-smoke`.
- [ ] T023 Final implementation review: SKIPPED per `cfg.code-review=false`.

---

## Dependency graph

```
T001 ─┬─ T002 ─ T003 ─┬─ T004 ──┐
       │                │         │
       │                ├─ T005 ──┤
       │                │         │
       │                └─ T006 ──┤
       │                          │
       │                         ┌┴──── T007 ──┐
       │                         │              │
       │                         └─── T008 ────┤
       │                                        │
       │                          ┌─────────────┤
       │                          │             │
       │                          ▼             │
       │                         T009 → T010 → T011 → T012 → T013
       │                                                       │
       │                                                       ▼
       └──────────────────────────────────────────────── (Phase 5 — tests)
                                                               │
                                  T014 [P] ──┐                │
                                  T015 [P] ──┤                │
                                  T016 [P] ──┼─ all depend on │
                                  T017 [P] ──┤   Phase 1-4    │
                                  T018 [P] ──┘                │
                                                               ▼
                                                          T019 → T020 → T021 → T022 → T023
```

## Parallel execution windows

- **Phase 2**: T004 + T005 + T006 (3 disjoint files: new generator + 2 templates).
- **Phase 3**: T007 + T008 (2 disjoint generator files).
- **Phase 5**: T014 + T015 + T016 + T017 + T018 (5 disjoint test files).

## Acceptance gate (carried from plan.md)

- [x] `WorkflowMode` extended to 4 values; `speckit` boolean removed from `ProjectConfig`.
- [x] OpenSpec generator implemented with the 4 unit-test cases listed (8 cases delivered, including isNpxAvailable coverage).
- [x] Templates rendered with `Workflow Mode: openspec` and a `{{#if workflowOpenspec}}` block free of hard-coded project names.
- [x] CLI `--speckit`, `--openspec`, and `--workflow <mode>` wired with mutual-exclusion check + automated test (T014a).
- [x] All existing tests pass after fixture migration (554/554 across 51 files).
- [x] `grep -ri "relationship-crm" src/` returns zero hard-coded hits (only `not.toContain` test guards remain).
