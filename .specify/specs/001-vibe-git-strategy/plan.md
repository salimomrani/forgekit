# Implementation Plan: Git Strategy Configuration for Vibe Workflow

## Tech Stack & Libraries

- **Language**: TypeScript (ESM)
- **Frameworks**: Commander.js (CLI), Inquirer.js (prompts)
- **Storage**: JSON (settings.json template via Handlebars)

## Project Structure Impact

```
src/
├── types.ts                     # Add gitStrategy field to ProjectConfig
├── prompts/
│   └── project.ts              # Add conditional prompt for git strategy
├── generators/
│   └── claude-code/
│       └── index.ts            # Pass gitStrategy to template
└── templates/
    └── claude-code/
        └── settings.json.hbs   # Conditionally include git.strategy
```

## Implementation Strategy

### Phase 1: Type Definitions
- Add `gitStrategy: "pr-required" | "direct-push"` to `ProjectConfig` interface in `src/types.ts`
- Default value: `"pr-required"` (conservative, safe default)

### Phase 2: Prompts
- Modify `src/prompts/project.ts` to add conditional prompt after `workflowMode` selection
- Condition: only ask if `workflowMode === "vibe"`
- Question: "Which git strategy will you use?"
- Options: 
  - "PR required before merge (safer)" → `"pr-required"`
  - "Push directly to master (faster)" → `"no-pr"`
- Default: `"pr-required"`

### Phase 3: Generator & Template
- Update `src/generators/claude-code/index.ts` to pass `gitStrategy` to the settings.json template
- Update `src/templates/claude-code/settings.json.hbs` to include the `git.strategy` field based on the value

## Dependencies & Sequencing

1. **T001** - Update types (no dependencies)
2. **T002** - Add prompt logic (depends on T001)
3. **T003** - Update generator and template (depends on T001, T002)

## Testing Strategy

- Unit tests in existing test files (`src/__tests__/new-command.test.ts`)
- Verify prompt appears only when `workflowMode === "vibe"`
- Verify `ProjectConfig.gitStrategy` is set correctly
- Verify settings.json contains correct `git.strategy` value
- E2E: Generate a project with Vibe + PR workflow, verify settings.json

## Parallel Opportunities

None — tasks are sequential due to dependencies on type definitions.

## MVP Scope

- All three tasks (types, prompts, template) are minimal and required for the feature
- No optional enhancements in Phase 1
