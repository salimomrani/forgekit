# Tasks — 010 Workflow Mode Scaffolding

Add `workflowMode` selection (`speckit | vibe | none`) to the ForgeKit scaffolding CLI, so generated projects have a properly configured `CLAUDE.md` with the correct `## Workflow Mode` section.

## Phase 1 — Setup (compilation prerequisites)

- [x] T001 Add `WorkflowMode` type and `workflowMode` field to `ProjectConfig` in `src/types.ts`
- [x] T002 Add `workflowMode: "none"` default to `makeBaseConfig` in `src/__tests__/fixtures.ts`

## Phase 2 — Workflow mode rendering in CLAUDE.md [US1]

- [x] T003 [US1] Write test: `workflowMode: "speckit"` renders `## Workflow Mode: speckit` in `CLAUDE.md` in `src/generators/claude-code/__tests__/claude-code.test.ts`
- [x] T004 [US1] Write test: `workflowMode: "vibe"` renders `## Workflow Mode: vibe` in `CLAUDE.md` in `src/generators/claude-code/__tests__/claude-code.test.ts`
- [x] T005 [US1] Write test: `workflowMode: "none"` renders no `## Workflow Mode` line in `CLAUDE.md` in `src/generators/claude-code/__tests__/claude-code.test.ts`
- [x] T006 [US1] Pass `workflowMode` flags (`workflowSpeckit`, `workflowVibe`) to template data in `src/generators/claude-code/index.ts`
- [x] T007 [US1] Update `CLAUDE.md.hbs` to conditionally render `## Workflow Mode: speckit` or `## Workflow Mode: vibe` section in `src/templates/claude-code/CLAUDE.md.hbs`

## Phase 3 — Prompt [US2]

- [x] T008 [US2] Write test: prompt asks for `workflowMode` and defaults to `"speckit"` when `claudeCode: true` in `src/__tests__/new-command.test.ts`
- [x] T009 [US2] Add `workflowMode` select prompt (after `claudeCode` checkbox) to `src/prompts/project.ts`

## Dependencies

- T001 → all (type must exist before compilation)
- T002 → T003, T004, T005 (fixtures needed for tests)
- T003, T004, T005 → T006, T007 (RED tests must exist before GREEN implementation)
- T006, T007 → T008, T009 (rendering must work before prompt wires it in)
