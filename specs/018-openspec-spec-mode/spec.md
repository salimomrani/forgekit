# Feature Specification: OpenSpec spec mode integration

**Feature Branch**: `018-openspec-spec-mode`
**Created**: 2026-05-03
**Status**: Draft
**Input**: User description: "Add OpenSpec as an alternative spec mode to ForgeKit, mutually exclusive with the existing speckit mode."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Scaffolding with OpenSpec selected (Priority: P1)

A developer running `forgekit new` chooses an AI tool (Claude or Codex) and selects **openspec** as their workflow mode. After the run completes, their new project contains a working OpenSpec setup ready for the first `/opsx:propose` command, with no manual install or configuration steps.

**Why this priority**: This is the core value the feature delivers — making OpenSpec a first-class peer of speckit in ForgeKit's workflow-mode choice. Without it the feature does not exist.

**Independent Test**: Run `forgekit new sample --ai-tool codex --openspec`. Confirm the generated project contains `openspec/config.yaml`, the four native OpenSpec skills under `.codex/skills/openspec-*/`, and an `AGENTS.md` documenting the OpenSpec workflow. No prior `npm i -g @fission-ai/openspec` should have been required.

**Acceptance Scenarios**:

1. **Given** a developer with no global `openspec` install, **When** they run `forgekit new` and pick `aiTool=codex` + `workflowMode=openspec`, **Then** the generated project contains `openspec/config.yaml` and at least one `.codex/skills/openspec-*/SKILL.md` file.
2. **Given** the same scenario, **When** the generation finishes, **Then** the printed AGENTS.md contains a "Workflow Mode: openspec" indicator and a documented list of the four `/opsx:*` slash commands.
3. **Given** the user picks `aiTool=claude` + `workflowMode=openspec`, **When** generation finishes, **Then** OpenSpec skills land under `.claude/skills/openspec-*/` and CLAUDE.md documents the OpenSpec workflow.

---

### User Story 2 — Single-choice workflow mode (Priority: P1)

A developer cannot accidentally end up with two workflow modes active at once. The interactive prompt offers a single `workflowMode` choice across speckit / openspec / vibe / none. The CLI flags `--speckit`, `--openspec`, and `--workflow <mode>` are mutually exclusive when they would resolve to different values.

**Why this priority**: Allowing two workflow modes would create conflicting `.codex/skills/` and `.claude/skills/` subtrees, contradictory documentation in `AGENTS.md` / `CLAUDE.md`, and confuse downstream automation. This is a correctness invariant, not a nice-to-have.

**Independent Test**: Run `forgekit new sample --ai-tool codex --speckit --openspec` — the CLI rejects the combination with a clear error message and exits non-zero.

**Acceptance Scenarios**:

1. **Given** the interactive prompt, **When** the user reaches the workflow-mode question, **Then** they see exactly four options: speckit, openspec, vibe, none.
2. **Given** both `--speckit` and `--openspec` flags are passed on the command line, **When** ForgeKit parses the arguments, **Then** it errors out before any project files are written.
3. **Given** a project generated with `workflowMode=openspec`, **When** the user inspects the project, **Then** no `.specify/` directory exists and no speckit-specific commands have been copied.
4. **Given** a project generated with `workflowMode=vibe`, **When** the user inspects the project, **Then** neither `openspec/` nor `.specify/` directories exist (vibe = no spec scaffolding at all).

---

### User Story 3 — OpenSpec hidden when no AI tool (Priority: P2)

When a developer chooses `aiTool=none`, both the `openspec` and `speckit` choices are removed from the workflow-mode prompt (only `vibe` and `none` remain). OpenSpec without an AI tool integration produces only an empty `openspec/config.yaml` with no skills, which is not useful and would mislead the user. Same rationale for speckit.

**Why this priority**: Mirrors the existing speckit-when-aiTool=none behaviour. Prevents a degenerate combination from reaching the user without explicitly forbidding it in code (the prompt simply does not surface it).

**Independent Test**: Run the interactive prompt with `aiTool=none` selected. Confirm the workflow-mode question offers only `vibe` and `none`.

**Acceptance Scenarios**:

1. **Given** the interactive prompt with `aiTool=none`, **When** the user reaches the workflow-mode question, **Then** neither `speckit` nor `openspec` are listed as choices.
2. **Given** the CLI flag `--ai-tool none --openspec`, **When** ForgeKit parses arguments, **Then** it warns that OpenSpec requires an AI tool and falls back to `workflowMode=none` (no project abort).

---

### User Story 4 — Resilient bootstrap (Priority: P2)

If the network is offline or the OpenSpec npm package cannot be fetched at scaffold time, the user still gets a usable project. ForgeKit logs a clear warning and continues — it does not delete the project or abort the run.

**Why this priority**: Constitution §5 (network failures are silent and recoverable). Matches the existing speckit fallback behaviour. Without it, users behind corporate proxies or on flaky connections cannot use ForgeKit.

**Independent Test**: Run `forgekit new` with networking disabled and `workflowMode=openspec`. The project still completes, with a warning that the OpenSpec init step was skipped and instructions on how to run it manually later.

**Acceptance Scenarios**:

1. **Given** `npx @fission-ai/openspec init` fails (any non-zero exit, network error, etc.), **When** the openspec generator runs, **Then** ForgeKit logs a warning, leaves the rest of the project intact, and exits successfully.
2. **Given** the warning is logged, **When** the user reads the output, **Then** they see the exact command needed to retry the init manually inside the project.

---

### Edge Cases

- A developer passes `--speckit-preset balanced` together with `--openspec`. The CLI rejects this — `speckitPreset` is only meaningful when `workflowMode=speckit`.
- A developer regenerates an existing project. The OpenSpec generator runs `init --force` so it will overwrite previously generated OpenSpec files; this is the documented behaviour of the underlying CLI.
- A developer picks `workflowMode=openspec` but the `aiTool` they select is not in OpenSpec's supported list (currently OpenSpec supports both `claude` and `codex`, so this should not happen with current ForgeKit options — but the generator must surface a clear warning if a future ForgeKit AI tool is added without the corresponding OpenSpec mapping).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: ForgeKit MUST extend the existing `WorkflowMode` union to four values: `"speckit" | "openspec" | "vibe" | "none"`. The legacy `speckit: boolean` field MUST be removed from `ProjectConfig` (it was redundant with `workflowMode === "speckit"` and produced impossible states).
- **FR-002**: The interactive prompt MUST offer all four workflow-mode choices only when an AI tool is selected (`aiTool ≠ none`); when `aiTool=none`, the prompt MUST hide the `speckit` and `openspec` choices and only allow `vibe` or `none`.
- **FR-003**: ForgeKit MUST only ask for `speckitPreset` when `workflowMode=speckit`; selecting OpenSpec, vibe, or none MUST leave `speckitPreset` as `null`. OpenSpec has no equivalent preset to ask for.
- **FR-004**: When `workflowMode=openspec`, ForgeKit MUST invoke `npx --yes @fission-ai/openspec@latest init --tools <aiTool> --force .` synchronously inside the freshly generated project directory.
- **FR-005**: The OpenSpec init step MUST follow the same silent-skip pattern as the existing speckit generator: a non-zero exit code or missing CLI MUST log a warning and allow the rest of the project generation to complete successfully.
- **FR-006**: ForgeKit MUST detect availability of the `npx` runner synchronously and early using `spawnSync` with `stdio: "ignore"` and a `--version` (or equivalent lightweight) probe before attempting the init invocation.
- **FR-007**: The generated `AGENTS.md` (Codex) and `CLAUDE.md` (Claude Code) MUST contain a `Workflow Mode: <speckit|openspec|vibe|none>` line driven by `workflowMode`, extending the existing `Workflow Mode:` heuristic to cover the new `openspec` value.
- **FR-008**: When `workflowMode=openspec`, the generated `AGENTS.md` and `CLAUDE.md` MUST include a documented OpenSpec workflow section listing: the proposal → specs → design → tasks → apply → archive flow, the four native slash commands (`/opsx:propose`, `/opsx:explore`, `/opsx:apply`, `/opsx:archive`), and the artifact locations (`openspec/specs/`, `openspec/changes/`, `openspec/config.yaml`). Project-specific tokens MUST be parameterized via `{{name}}`; no project name (e.g. the reference project's name) MUST be hard-coded in the templates.
- **FR-009**: The CLI MUST accept the new `--openspec` flag mapping to `workflowMode=openspec`, continue to accept `--workflow <mode>` for the full enum, and add `--speckit` as a shortcut mapping to `workflowMode=speckit`. Passing two of these that resolve to different values MUST fail with a non-zero exit and a clear error message.
- **FR-010**: The codex and claude-code generators MUST NOT write to `openspec/`, `.codex/skills/openspec-*`, or `.claude/skills/openspec-*` (Constitution §1 — those paths are owned exclusively by the new openspec generator).
- **FR-011**: ForgeKit MUST regenerate fixtures (`src/__tests__/fixtures.ts`) and update every existing test so that they no longer reference the removed `speckit` boolean field; the new `workflowMode=openspec` value MUST be exercised by at least one fixture.
- **FR-012**: A new test file `src/generators/__tests__/openspec.test.ts` MUST cover at minimum: the spawn command shape, the early-skip path when `aiTool=none`, and the warning-not-abort behaviour when the npx invocation fails.

### Key Entities *(included because the feature touches typed configuration)*

- **ProjectConfig.workflowMode**: A 4-value union `"speckit" | "openspec" | "vibe" | "none"` carried through the prompt → generator pipeline. Extends the previous 3-value union and absorbs the responsibilities of the removed `speckit: boolean` field.
- **ProjectConfig.speckitPreset**: Continues to exist but is meaningful only when `workflowMode=speckit`; `null` for OpenSpec, vibe, and none.
- **OpenSpec generator output**: `openspec/config.yaml` plus four `SKILL.md` files under `.codex/skills/openspec-*/` (Codex) or `.claude/skills/openspec-*/` (Claude Code), all created by the upstream `@fission-ai/openspec` CLI rather than by ForgeKit templates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer scaffolding a new Codex-based project with `workflowMode=openspec` reaches a working `/opsx:propose` command in zero manual steps after `forgekit new` completes.
- **SC-002**: 100% of generated projects with `workflowMode=speckit` continue to behave exactly as they did before the feature (no regression in the existing speckit path).
- **SC-003**: 100% of generated projects with `workflowMode=none` (or `workflowMode=vibe`) contain neither `openspec/` nor `.specify/` directories.
- **SC-004**: A developer running `forgekit new` with both `--speckit` and `--openspec` sees a clear, immediately actionable error message and the project directory is not created.
- **SC-005**: When the OpenSpec npx invocation fails (offline, npm registry down, etc.), the rest of the generated project is intact and a single warning line points the user to the manual recovery command.
- **SC-006**: A grep for `relationship-crm` (the reference project's name) across `src/templates/` after this feature ships returns zero matches, proving the OpenSpec doc block uses only `{{name}}` and generic vocabulary.

## Assumptions

- OpenSpec's `@fission-ai/openspec` package remains available on the public npm registry under that name. If renamed or scoped differently in the future, the generator can be updated in a single place (`src/generators/openspec.ts`).
- OpenSpec supports both `claude` and `codex` as `--tools` values (verified against `openspec init --help` output). If a new ForgeKit AI tool is added later without an OpenSpec mapping, the generator must surface the gap as a warning rather than silently produce a broken project.
- Developers who currently rely on the legacy `--speckit` flag in CI scripts continue to work unchanged. They migrate to `--openspec` only if and when they want the new mode.
- The reference project at `/Users/salimomrani/code/open-spec/relationship-crm` is consulted only as documentation inspiration for the AGENTS.md / CLAUDE.md OpenSpec section; no skill files or schema files from it are copied into ForgeKit templates.
