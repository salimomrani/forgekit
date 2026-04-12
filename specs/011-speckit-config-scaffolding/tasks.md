---
description: "Task list — Speckit Config block in scaffolded CLAUDE.md"
---

# Tasks: Speckit Config Scaffolding

**Feature**: When `forgekit new` generates a project with `workflowMode = "speckit"`, the scaffolded `CLAUDE.md` must include a `## Speckit Config` block with the preset chosen by the user.

## Format: `[ID] [P?] Description — file`

- **[P]**: Can run in parallel (different files, no shared state)
- Tests use `cfg.tdd = false` → write implementation first, then tests after

---

## Phase 1: Types + Fixtures (Foundational)

**Purpose**: Establish the data contract before touching prompts, generator, or template.

- [ ] T001 Add `speckitPreset: 'rigorous' | 'balanced' | 'fast' | 'bare-metal' | null` to `ProjectConfig` in `src/types.ts`
- [ ] T002 Add `speckitPreset: null` to `makeBaseConfig` fixture in `src/__tests__/fixtures.ts`

---

## Phase 2: Prompt

**Purpose**: Ask the user for their preset when `workflowMode = "speckit"` is selected.

- [ ] T003 In `src/prompts/project.ts`, after the `workflowMode` select, add a `select<SpeckitPreset>` for the preset (only when `workflowMode === "speckit"`). Include all 4 choices (rigorous / balanced / fast / bare-metal) with default `balanced`. Return `speckitPreset` in the config object.

---

## Phase 3: Generator

**Purpose**: Pre-compute all speckit config flags from the preset and pass them to Handlebars (constitution rule 2 — zero logic in templates).

- [ ] T004 In `src/generators/claude-code/index.ts`, add `speckitPreset` to constructor data + derive the 9 flag booleans/strings from the preset value using a `resolveSpeckitConfig(preset)` helper. Pass them in the `data` object passed to `renderAndWrite`.

  Preset → flags mapping:
  | preset | tests | tdd | testTypes | codeReview | securityReview | verification | planDetail | skipClarify | fastMode |
  |--------|-------|-----|-----------|------------|----------------|--------------|------------|-------------|----------|
  | rigorous | true | true | unit | true | auto | full | high | false | false |
  | balanced | true | false | unit | true | auto | minimal | medium | false | false |
  | fast | true | false | unit | false | auto | minimal | low | true | false |
  | bare-metal | false | false | unit | false | false | skip | low | true | false |

  `fastMode` is only emitted in template when `true` (same rule as `init-claudemd`).
  `subagents` is always `true` (default) — omit from template.

---

## Phase 4: Template

**Purpose**: Render the `## Speckit Config` block in the generated CLAUDE.md.

- [ ] T005 In `src/templates/claude-code/CLAUDE.md.hbs`, add the Speckit Config block after `## Workflow Mode: speckit`:

  ```
  {{#if workflowSpeckit}}
  ## Workflow Mode: speckit

  ## Speckit Config
  tests: {{speckitTests}}
  tdd: {{speckitTdd}}
  test-types: {{speckitTestTypes}}
  code-review: {{speckitCodeReview}}
  security-review: {{speckitSecurityReview}}
  verification: {{speckitVerification}}
  plan-detail: {{speckitPlanDetail}}
  skip-clarify: {{speckitSkipClarify}}
  {{#if speckitFastMode}}fast-mode: true
  {{/if}}
  {{/if}}
  ```

---

## Phase 5: Tests

**Purpose**: Verify the new behaviour is covered (constitution rule 7 — all fixture fields declared).

- [ ] T006 [P] In `src/generators/claude-code/__tests__/claude-code.test.ts`, add tests:
  - `CLAUDE.md contains ## Speckit Config when workflowMode is speckit`
  - `CLAUDE.md Speckit Config shows rigorous preset flags correctly`
  - `CLAUDE.md Speckit Config shows balanced preset flags correctly`
  - `CLAUDE.md Speckit Config shows fast preset (fast-mode: true line omitted when false)`
  - `CLAUDE.md Speckit Config shows bare-metal preset flags correctly`
  - `CLAUDE.md does not contain ## Speckit Config when workflowMode is vibe`
  - `CLAUDE.md does not contain ## Speckit Config when workflowMode is none`

- [ ] T007 [P] In `src/__tests__/e2e.test.ts`, verify that the `speckitPreset` field is accepted in `makeBaseConfig` without TypeScript errors (compile-only check via existing test structure).

---

## Dependencies

- T001 → T002, T003, T004 (types must exist first)
- T002 → T006, T007 (fixtures required for tests)
- T004 → T005 (data keys must match template variable names)
- T005 → T006 (template must render before tests can assert on output)

T003 and T004 can run in parallel after T001.
T006 and T007 can run in parallel after T005.

---

## Implementation Strategy

MVP: T001 → T002 → T003+T004 (parallel) → T005 → T006+T007 (parallel).
Full feature complete after T007 + `npm test` passes.
