# Feature Specification: Codex CLI as a Selectable AI Tool

**Feature Branch**: `016-codex-ai-tool`
**Created**: 2026-04-24
**Status**: Draft
**Input**: User description: "Add Codex CLI as a selectable AI tool in `forgekit new` alongside Claude Code; choices are Claude Code, Codex CLI, or None; ProjectConfig replaces `claudeCode` boolean with `aiTool` enum; Codex path emits `AGENTS.md` plus `.codex/` config and rules; `specify init` forwards `--ai codex`; `speckitPreset` prompt is skipped for Codex."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Scaffold a project for Claude Code (Priority: P1)

A developer who already uses Claude Code runs `forgekit new`, picks **Claude Code** when asked which AI assistant to set up, and ends up with a project that contains the same `CLAUDE.md`, `.claude/` directory, hooks, skills, rules, and (optionally) speckit artifacts that ForgeKit produces today.

**Why this priority**: Existing users must not regress. This is the baseline behavior the rename touches.

**Independent Test**: Run `forgekit new`, choose Claude Code + a stack, then assert the generated tree contains `CLAUDE.md`, `.claude/settings.json`, `.claude/rules/`, and zero `.codex/` or `AGENTS.md` artifacts.

**Acceptance Scenarios**:

1. **Given** Claude Code CLI is installed, **When** the user picks "Claude Code" at the AI tool prompt, **Then** the generated project contains all current Claude artifacts and no Codex artifacts.
2. **Given** Claude Code CLI is **not** installed, **When** the user opens the AI tool prompt, **Then** the "Claude Code" choice is shown but flagged as unavailable (matching today's behavior).
3. **Given** the user picks Claude Code with workflow mode `speckit`, **When** generation runs, **Then** `specify init` is invoked with `--ai claude`.

---

### User Story 2 — Scaffold a project for Codex CLI (Priority: P1)

A developer who uses OpenAI Codex CLI runs `forgekit new`, picks **Codex CLI** at the AI tool prompt, and receives a project pre-wired for Codex: an `AGENTS.md` at the project root with embedded stack conventions, a `.codex/config.toml` with sensible sandbox/approval defaults, and a `.codex/rules/` directory carrying the same backend/frontend convention notes (as a human/IDE convention, even though Codex does not natively read sub-files).

**Why this priority**: This is the new capability the user is asking for.

**Independent Test**: Run `forgekit new`, choose Codex CLI + a backend + a frontend, then assert the tree contains `AGENTS.md`, `.codex/config.toml`, `.codex/rules/backend.md`, `.codex/rules/frontend.md`, and contains **no** `CLAUDE.md` or `.claude/` directory.

**Acceptance Scenarios**:

1. **Given** Codex CLI is installed, **When** the user picks "Codex CLI" at the AI tool prompt, **Then** the generated project contains the four Codex artifacts above and no Claude artifacts.
2. **Given** the user picks Codex with workflow mode `speckit`, **When** generation runs, **Then** `specify init` is invoked with `--ai codex` and the `speckitPreset` prompt is **not** asked.
3. **Given** Codex is chosen, **When** the AI tool prompt is rendered, **Then** the `speckitPreset` follow-up question is unreachable in the prompt flow.
4. **Given** Codex CLI is **not** installed, **When** the user opens the AI tool prompt, **Then** the "Codex CLI" choice is shown but flagged as unavailable, matching the pattern used for Claude.

---

### User Story 3 — Scaffold a project with no AI tooling (Priority: P2)

A developer wants a clean project skeleton without any AI assistant files. They run `forgekit new`, pick **None**, and the resulting project contains neither `CLAUDE.md` / `.claude/` nor `AGENTS.md` / `.codex/`.

**Why this priority**: Preserves the current opt-out path (`claudeCode: false`) so users who do not use any agent still get a working scaffold.

**Independent Test**: Run `forgekit new`, choose None, assert the generated tree contains zero AI-related files at the root or in `.claude/` / `.codex/`.

**Acceptance Scenarios**:

1. **Given** the user picks None, **When** generation completes, **Then** no AI-tool files are created.
2. **Given** the user picks None, **When** generation runs, **Then** the workflow-mode and speckit-preset prompts are skipped and no `.specify/` scaffold is created.

---

### Edge Cases

- The CLI is invoked non-interactively (preset/JSON config). The new `aiTool` field must be required in that path; an unknown or missing value fails fast with a clear error.
- Codex chosen but the `specify` CLI is missing on the user's machine. Speckit init must fail with the same error message currently shown for Claude — no special-casing.
- A previously generated project on disk had `claudeCode: true` written into a saved preset file. Loading the old preset must surface a clear migration error (or be auto-mapped to `aiTool: 'claude'` if a preset loader exists). Behavior to be confirmed during planning.
- Both Claude and Codex CLIs are installed. The prompt must show both as available; only one can be picked.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `forgekit new` interactive prompt MUST present a single, mutually-exclusive choice for the AI assistant with three options: Claude Code, Codex CLI, None.
- **FR-002**: The `ProjectConfig` type MUST expose a single field `aiTool` whose value is one of `claude`, `codex`, or `none`. The previous `claudeCode: boolean` field MUST be removed.
- **FR-003**: When `aiTool === 'claude'`, the system MUST produce the same Claude artifacts ForgeKit produces today (CLAUDE.md, `.claude/` settings, hooks, hookify, rules, skills, commands).
- **FR-004**: When `aiTool === 'codex'`, the system MUST produce: `AGENTS.md` at project root, `.codex/config.toml`, `.codex/rules/backend.md`, `.codex/rules/frontend.md`. It MUST NOT produce any Claude artifacts.
- **FR-005**: When `aiTool === 'none'`, the system MUST NOT produce any AI-tool files (no Claude artifacts, no Codex artifacts, no `.specify/`).
- **FR-006**: When `aiTool === 'claude'` AND workflow mode is `speckit`, the system MUST invoke `specify init` with `--ai claude`.
- **FR-007**: When `aiTool === 'codex'` AND workflow mode is `speckit`, the system MUST invoke `specify init` with `--ai codex`.
- **FR-008**: The `speckitPreset` prompt MUST only be shown when `aiTool === 'claude'` AND workflow mode is `speckit`. For Codex it MUST be skipped entirely.
- **FR-009**: The system MUST detect whether each AI CLI is installed before listing it in the prompt, using a synchronous detection (consistent with Constitution §8). Unavailable choices remain visible but flagged.
- **FR-010**: The Codex `AGENTS.md` MUST embed the same per-stack backend and frontend convention text used in the Claude rules, since Codex does not reliably read sub-files.
- **FR-011**: The Codex `.codex/config.toml` MUST set sensible defaults: `sandbox_mode = "workspace-write"` and `approval_policy = "on-request"`. No MCP servers are scaffolded by default.
- **FR-012**: Generation MUST follow the existing fail-fast / full-rollback contract (Constitution §4): any error in the Codex generator deletes the entire project directory.
- **FR-013**: Each AI tool generator MUST own only its own output directory (`.claude/` for Claude, `.codex/` and `AGENTS.md` for Codex), per Constitution §1.

### Key Entities

- **AITool**: Enum value identifying which AI assistant the project is set up for. Members: `claude`, `codex`, `none`.
- **ProjectConfig** (modified): The single source of truth for generation. Loses `claudeCode: boolean`, gains `aiTool: AITool`.
- **CodexGenerator**: New generator class responsible exclusively for Codex artifacts (`AGENTS.md`, `.codex/config.toml`, `.codex/rules/`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can scaffold a Codex-ready project in a single `forgekit new` run with no manual file creation afterwards.
- **SC-002**: 100% of existing Claude scaffolding tests continue to pass after the rename, with no behavioral change to the Claude artifacts they assert on.
- **SC-003**: A new user-driven smoke run for each of the three `aiTool` values produces the expected file set with zero leakage between profiles (no Claude file appears in a Codex project, no Codex file appears in a Claude project, no AI files appear in a None project).
- **SC-004**: When Codex CLI is selected with workflow mode `speckit`, the `specify` invocation receives `--ai codex` exactly once, verified via a unit test on the speckit generator.
- **SC-005**: The interactive prompt asks at most one extra question compared to today's flow (the AI tool choice itself); no Codex-only follow-up questions are introduced.

## Assumptions

- The user's environment will continue to provide `specify` (spec-kit CLI) for both Claude and Codex paths. Detection of `specify` itself remains out of scope for this feature.
- The user explicitly accepted the trade-off that `.codex/rules/` will not be read natively by Codex CLI — it is generated as a human/IDE convention.
- No legacy preset files are stored that pin `claudeCode: true`; if any do exist, a clear failure (rather than silent migration) is acceptable.
- The Codex CLI binary is named `codex` and supports a `--help` invocation suitable for synchronous detection.

## Out of Scope

- Support for additional AI tools (Cursor, Gemini, Copilot, Qwen, etc.).
- Generating Codex-specific MCP server configuration.
- Migrating any existing Claude project to Codex (one-shot scaffolding only).
- Refactoring the `BaseGenerator` pattern.
- Extracting a shared rules-rendering module (only two callsites, per Constitution §6).
