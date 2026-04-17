# Tasks: Git Strategy Configuration for Vibe Workflow

## Implementation Summary

Add `gitStrategy` configuration prompt to ForgeKit's Vibe workflow mode, allowing users to choose between PR-required or direct-push workflows. The selection updates the generated project's `settings.json`.

**Total tasks**: 3  
**Estimated effort**: ~30 mins  
**MVP scope**: All 3 tasks

---

## Phase 1: Setup (Foundation)

*No setup tasks needed — changes are localized to existing files.*

---

## Phase 2: Implementation

### T001 — Add gitStrategy type to ProjectConfig
- [x] T001 Add `gitStrategy: "pr-required" | "no-pr"` field to `ProjectConfig` interface in `src/types.ts`
  - Default value when creating ProjectConfig instances: `"pr-required"`
  - Rationale: Conservative default ensures safety (PR workflow) if unset

**Test criteria**: TypeScript compilation passes, no type errors

---

## Phase 3: User Story 1 — Vibe Git Strategy Prompt

### T002 — Add conditional git strategy prompt in project wizard
- [x] T002 [US1] Add git strategy question to `src/prompts/project.ts` after `workflowMode` selection
  - Condition: Only ask if `workflowMode === "vibe"`
  - Question text: "Which git strategy will you use?"
  - Options:
    - "PR required before merge (safer)" → sets `gitStrategy = "pr-required"`
    - "Push directly to master (faster)" → sets `gitStrategy = "no-pr"`
  - Default: `"pr-required"`
  - Store result in returned `ProjectConfig`

**Test criteria**: 
- Prompt appears only when Vibe workflow selected
- Both options work correctly
- Default is "pr-required"
- ProjectConfig.gitStrategy is set accurately

### T003 — Update claude-code generator and settings.json template
- [x] T003 [US1] Update `src/generators/claude-code/index.ts` to pass `gitStrategy` from `ProjectConfig` to the settings.json template
- [x] T003b [US1] Update `src/templates/claude-code/settings.json.hbs` to include:
  ```json
  "git": {
    "strategy": "{{gitStrategy}}"
  }
  ```
  - Ensure the `git` object exists (may need to merge with existing config)
  - Template should render `"pr-required"` or `"direct-push"` based on the config value

**Test criteria**:
- Generated project's `settings.json` contains `"git.strategy": "pr-required"` when user selects PR mode
- Generated project's `settings.json` contains `"git.strategy": "no-pr"` when user selects direct-push mode
- All other settings remain intact

---

## Testing Strategy

### Unit Tests
Update `src/__tests__/new-command.test.ts`:
- Test that `gitStrategy` defaults to `"pr-required"` when not explicitly set
- Test that prompt is skipped when `workflowMode !== "vibe"`
- Test that prompt appears and sets correct value when `workflowMode === "vibe"`

### E2E Test (optional, use existing e2e framework)
- Run `forgekit new test-pr-mode --vibe --git-strategy=pr-required` (if flag support added)
- Verify generated `settings.json` contains correct `git.strategy`
- Run `forgekit new test-no-pr-mode --vibe --git-strategy=no-pr`
- Verify generated `settings.json` contains correct `git.strategy`

---

## Implementation Notes

### Dependencies
- T001 must complete before T002 and T003 (types needed for prompt config)
- T002 and T003 are sequential (prompt result needs to reach template)

### Constitution Alignment
- **Principle 3** (ProjectConfig is source of truth): gitStrategy flows through ProjectConfig only
- **Principle 2** (Templates contain zero logic): Settings.json template receives flat value, no conditionals
- **Principle 1** (Each generator owns one layer): claude-code generator handles passing config to template

### File Impact Summary
- `src/types.ts` — 1 line addition (gitStrategy field)
- `src/prompts/project.ts` — ~15 lines (conditional prompt block)
- `src/generators/claude-code/index.ts` — 1 line (pass gitStrategy)
- `src/templates/claude-code/settings.json.hbs` — 2 lines (git.strategy object)

### Backward Compatibility
- Existing projects without `gitStrategy` in `ProjectConfig` will use default `"pr-required"`
- No breaking changes to CLI flags or existing workflows

---

## Completion Criteria

- [ ] All three tasks marked `[x]`
- [ ] TypeScript compiles with no errors
- [ ] Tests pass (unit + optional e2e)
- [ ] Code follows constitution principles
- [ ] PR reviewed and merged
