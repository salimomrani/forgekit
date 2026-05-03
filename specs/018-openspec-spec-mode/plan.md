# Implementation Plan: OpenSpec spec mode integration

**Branch**: `018-openspec-spec-mode` | **Date**: 2026-05-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/018-openspec-spec-mode/spec.md`
**Q&A reference**: [qa-summary.md](./qa-summary.md) (5 confirmed decisions, last one revised the field model)

## Summary

Extend the existing `WorkflowMode` union from 3 values to 4: `"speckit" | "openspec" | "vibe" | "none"`. Remove the redundant `speckit: boolean` field from `ProjectConfig`. Add a new generator `src/generators/openspec.ts` that bootstraps OpenSpec via `npx --yes @fission-ai/openspec@latest init --tools <aiTool> --force .`, mirroring the silent-skip pattern of the existing `initSpecify` generator. Augment Codex `AGENTS.md.hbs` and Claude Code `CLAUDE.md.hbs` with an OpenSpec documentation block — fully parameterized by `{{name}}` so no project name (e.g. `relationship-crm`) is hard-coded. CLI flags `--speckit`, `--openspec`, and `--workflow <mode>` all map to `workflowMode`; conflicts are rejected at parse time.

`speckit.config`: `plan-detail=low`, `fast-mode=true` → no `research.md`, `data-model.md`, or `contracts/`. Single `plan.md` only.

## Technical Context

**Language/Version**: TypeScript 5.9 / Node ≥20
**Primary Dependencies**: Commander 14, Inquirer 8, Handlebars 4, fs-extra
**Testing**: Vitest 4, fixtures in `src/__tests__/fixtures.ts`
**Target Platform**: macOS / Linux CLI
**Project Type**: CLI scaffolding tool (single binary)
**External CLI dependencies**: existing `specify` (already wrapped); new `npx @fission-ai/openspec` (no global install required)
**Constraints**: Constitution §1 (one layer per generator), §3 (ProjectConfig single source of truth), §5 (network-failure tolerance), §6 (no premature abstraction), §8 (sync early CLI detection).

## Constitution Check

| Principle | Compliance |
|-----------|-----------|
| §1 — One layer per generator | The new `openspec.ts` generator owns `openspec/` + `.codex/skills/openspec-*/` + `.claude/skills/openspec-*/`. Codex generator (writes `AGENTS.md`, `.codex/config.toml`, `.codex/rules/*`) and Claude Code generator (writes `CLAUDE.md`, `.claude/commands/*`, `.claude/hooks/*`) MUST NOT touch the openspec-owned paths. ✅ |
| §2 — Templates have zero logic | Template branching uses precomputed booleans `workflowSpeckit` / `workflowOpenspec` / `workflowVibe` injected by the generators. No nested computation, no Handlebars helpers. ✅ |
| §3 — ProjectConfig is the single source of truth | `workflowMode` is the canonical workflow choice. The legacy `speckit: boolean` field is removed entirely (it was redundant and produced impossible states). ✅ |
| §4 — Fail fast, rollback completely | Mutual-exclusion check on conflicting CLI flags errors before `fs.ensureDir`. The OpenSpec init failure path matches the speckit silent-skip pattern (warn but don't abort) — explicitly authorised by the spec (FR-005, SC-005) and Constitution §5. ✅ |
| §5 — Network failures silent and recoverable | `npx` failure (no network, npm registry down) → warn + continue. Same pattern as `initSpecify`. ✅ |
| §6 — No speculative abstractions | A single union type extension (3→4 values), one new generator file, one new CLI flag. No strategy class, no factory, no spec-mode/workflow-mode duality (initially proposed and rejected — see qa-summary §5). ✅ |
| §7 — Tests declare all fixture fields | `src/__tests__/fixtures.ts` is updated to remove `speckit` and ensure every fixture sets `workflowMode` (no partials). ✅ |
| §8 — CLI detection synchronous and early | `isNpxAvailable()` uses `spawnSync("npx", ["--version"], { stdio: "ignore" })` before the prompt offers OpenSpec. ✅ |
| §9 — Release only through pipeline | No release work in this PR. ✅ |
| §10 — I/O parallelized | Independent file edits run via `Promise.all`-equivalent multi-edit dispatch. The OpenSpec init step is intentionally sequential because it's a child-process bootstrap (must finish before the project tree is "done"). ✅ |

## Architecture decisions

### Decision 1 — Single `workflowMode` enum, drop `speckit: boolean`

The current `ProjectConfig` has both `speckit: boolean` (bootstrap toggle) and `workflowMode: "speckit" | "vibe" | "none"` (documentation flavour). These are not orthogonal — the only sensible combinations are:

- `speckit=true,  workflowMode=speckit` → init speckit + speckit doc
- `speckit=false, workflowMode=vibe`    → no init + vibe doc
- `speckit=false, workflowMode=none`    → no init + no spec doc

The other states (`speckit=true, workflowMode=vibe`, etc.) are nonsensical. We collapse them into a single 4-value enum:

```ts
type WorkflowMode = "speckit" | "openspec" | "vibe" | "none";
```

**Rationale**: matches user's mental model ("workflow mode is one choice"), eliminates impossible states, simplifies the prompt, satisfies Constitution §6.

### Decision 2 — OpenSpec has no preset

`speckitPreset` (`rigorous | balanced | fast | bare-metal`) only exists for the speckit workflow. OpenSpec ships with a single default schema (`spec-driven`) and exposes no equivalent dial. The prompt asks for `speckitPreset` only when `workflowMode === "speckit"`. For OpenSpec, we go straight to the bootstrap.

### Decision 3 — Templates use precomputed `workflowOpenspec` boolean

Existing templates already use `workflowSpeckit` and `workflowVibe`. We add a parallel `workflowOpenspec`. This preserves the existing pattern (Constitution §2 — zero logic in templates) and is a pure addition with no rename.

### Decision 4 — `{{name}}`-driven OpenSpec doc block (NO hard-coded project names)

The new `{{#if workflowOpenspec}}` block in `AGENTS.md.hbs` and `CLAUDE.md.hbs` MUST reference the project via `{{name}}` everywhere a project-specific token is needed. The reference project at `/Users/salimomrani/code/open-spec/relationship-crm` is consulted only for vocabulary and structure inspiration. Per user clarification: "il faut pas relationship-crm — il faut que ça soit dynamique en fonction du nom du projet".

**Verification gate** (also encoded as **SC-006** in the spec): a `grep -ri "relationship-crm" src/templates/` after implementation must return zero matches.

### Decision 5 — CLI flag mutual exclusion at parse time

`--speckit`, `--openspec`, and `--workflow <mode>` all map to the same field. Conflicts are detected before any prompt or filesystem work: if two flags resolve to different `workflowMode` values, we error out with a clear message and exit non-zero.

## File-by-file changes

### NEW files

**`src/generators/openspec.ts`** (≈30 LOC, mirror of `speckit.ts`)
```ts
import { spawnSync } from "node:child_process";
import type { AITool } from "../types.js";

export function isNpxAvailable(): boolean {
  return spawnSync("npx", ["--version"], { stdio: "ignore" }).status === 0;
}

export function initOpenspec(projectDir: string, aiTool: AITool): boolean {
  if (aiTool === "none") return false;
  if (!isNpxAvailable()) return false;
  const result = spawnSync(
    "npx",
    ["--yes", "@fission-ai/openspec@latest", "init", "--tools", aiTool, "--force", "."],
    { cwd: projectDir, stdio: "inherit" },
  );
  return result.status === 0;
}
```

**`src/generators/__tests__/openspec.test.ts`** — covers:
- `aiTool=none` → returns `false`, no spawn
- `aiTool=codex` + `npx` available → constructs argv `["--yes", "@fission-ai/openspec@latest", "init", "--tools", "codex", "--force", "."]`
- `aiTool=claude` + spawnSync exits non-zero → returns `false`, does not throw
- `npx` unavailable → returns `false`, no spawn

### MODIFIED files

**`src/types.ts`**
- Extend `WorkflowMode` from 3 to 4 values: `"speckit" | "openspec" | "vibe" | "none"`.
- Remove `speckit: boolean;` field from `ProjectConfig`. Keep `speckitPreset: SpeckitPreset | null;` (only meaningful when `workflowMode === "speckit"`).
- Note: `SavedConfig` (only `groupId?`) needs no migration. ✅

**`src/prompts/project.ts`** (lines 295-353, 379-396, 463)
- Remove `let speckit = defaults.speckit ?? true;` (line 295) and the entire speckit checkbox entry from the infrastructure prompt (lines 326-331).
- Promote the workflow-mode `select` from a conditional add-on to the canonical workflow gate, with 4 options:
  - `speckit — spec → plan → tasks → impl → review → PR` (hidden when `aiTool === "none"`)
  - `openspec — proposal → specs → design → tasks → apply → archive` (hidden when `aiTool === "none"`)
  - `vibe — itérations rapides, pas de spec`
  - `aucun`
- Detection helpers in the choice labels: `isSpecifyInstalled()` (existing) for the speckit row, new `isNpxAvailable()` (imported from `openspec.ts`) for the openspec row. If detection fails, append `(npx CLI non détecté)` etc. to the label, like the existing speckit pattern.
- `speckitPreset` prompt block (lines 398-427) keeps its current gate `workflowMode === "speckit"` — already correct, no change needed.
- Return object: replace `speckit,` with nothing (field is gone). `workflowMode` is already returned.

**`src/commands/new.ts`**
- Add CLI option `.option("--openspec", "Bootstrap OpenSpec spec workflow")`. Add `.option("--speckit", "Bootstrap Speckit workflow")` for parity (currently only `--workflow speckit` exists).
- Mutual-exclusion gate in the `action` callback, BEFORE `promptProjectConfig` and BEFORE `fs.ensureDir`:
  ```ts
  const flagModes: WorkflowMode[] = [];
  if (options.speckit) flagModes.push("speckit");
  if (options.openspec) flagModes.push("openspec");
  if (typeof options.workflow === "string") flagModes.push(options.workflow as WorkflowMode);
  const distinct = [...new Set(flagModes)];
  if (distinct.length > 1) {
    console.log(chalk.red(`\n✖ Conflicting workflow flags: ${distinct.join(", ")}. Pick one.`));
    process.exit(1);
  }
  if (distinct.length === 1) defaults.workflowMode = distinct[0];
  ```
- Replace the dispatch around line 145 (`if (config.speckit && config.aiTool !== "none")`) with a switch on `workflowMode`:
  ```ts
  if (config.aiTool !== "none") {
    if (config.workflowMode === "speckit") {
      process.stdout.write(chalk.yellow("  ⏳ Speckit..."));
      initSpecify(projectDir, config.aiTool);
      console.log(chalk.green("\r  ✔ Speckit initialisé                "));
    } else if (config.workflowMode === "openspec") {
      process.stdout.write(chalk.yellow("  ⏳ OpenSpec..."));
      const ok = initOpenspec(projectDir, config.aiTool);
      if (!ok) {
        console.log(chalk.yellow(
          `\r  ⚠ OpenSpec init skipped — run manually: cd ${config.name} && npx --yes @fission-ai/openspec@latest init --tools ${config.aiTool} --force .`
        ));
      } else {
        console.log(chalk.green("\r  ✔ OpenSpec initialisé               "));
      }
    }
  }
  ```
- Add `import { initOpenspec } from "../generators/openspec.js";` at the top.

**`src/generators/codex/index.ts`** (line 31-53 — data object)
- Add to `data`:
  ```ts
  workflowOpenspec: this.config.workflowMode === "openspec",
  ```
  (alongside the existing `workflowSpeckit` and `workflowVibe`).
- Constitution §1 check: NO writes to `openspec/` or `.codex/skills/openspec-*/`. Verified — codex generator only writes `AGENTS.md`, `.codex/config.toml`, and `.codex/rules/*.md`.

**`src/generators/claude-code/index.ts`** (line 142, 306, etc.)
- Add `workflowOpenspec: this.config.workflowMode === "openspec"` to the template data object.
- Verify the speckit-preset gate at line 306 (`if (this.config.workflowMode !== "speckit")`) is unchanged — it correctly already prevents preset wiring for openspec/vibe/none.
- Constitution §1 check: this generator writes to `.claude/commands/`, `.claude/hooks/`, `.claude/skills/<own-skills>/` — NOT to `.claude/skills/openspec-*/`. Verified by `grep -n "openspec" src/generators/claude-code/index.ts` (zero hits expected).

**`src/templates/codex/AGENTS.md.hbs`** (lines 5-10 currently)
- Replace:
  ```hbs
  {{#if workflowSpeckit}}
  ## Workflow Mode: speckit
  {{/if}}
  {{#if workflowVibe}}
  ## Workflow Mode: vibe
  {{/if}}
  ```
  with:
  ```hbs
  {{#if workflowSpeckit}}
  ## Workflow Mode: speckit
  {{/if}}
  {{#if workflowOpenspec}}
  ## Workflow Mode: openspec
  {{/if}}
  {{#if workflowVibe}}
  ## Workflow Mode: vibe
  {{/if}}
  ```
  (purely additive — no rename, no break for existing templates that branch on the legacy variables).
- Append a new conditional block (placement: after the existing Git section, before stack-specific sections):
  ```hbs
  {{#if workflowOpenspec}}
  ## OpenSpec workflow

  This project uses **OpenSpec** for spec-driven development. The change lifecycle is:

      proposal → specs → design → tasks → apply → archive

  Native slash commands (provided by `.codex/skills/openspec-*/`):

  - `/opsx:propose <name>` — start a new change with proposal + design + specs + tasks generated in one step
  - `/opsx:explore` — thinking-partner mode for clarifying requirements before proposing
  - `/opsx:apply` — execute the tasks in the active change
  - `/opsx:archive` — finalize and archive a completed change

  Artifact locations (relative to the `{{name}}` project root):

  - `openspec/specs/<capability>/spec.md` — capability specifications (single source of truth)
  - `openspec/changes/<change-name>/` — in-progress change proposals (proposal.md + design.md + tasks.md)
  - `openspec/changes/archive/` — completed changes
  - `openspec/config.yaml` — project schema and rules

  Run `openspec --help` for the full CLI reference.
  {{/if}}
  ```
- **Constraint**: NO mention of `relationship-crm` or any other concrete project name. The block uses only generic OpenSpec vocabulary plus relative paths plus `{{name}}`.

**`src/templates/claude-code/CLAUDE.md.hbs`**
- Same pattern as the codex AGENTS.md.hbs change. Skills install path is `.claude/skills/openspec-*/` (single sentence difference). Otherwise identical content.

**`src/__tests__/fixtures.ts`** (line 27-30)
- Remove `speckit: false,` from the base fixture.
- Verify `workflowMode` is set on every fixture (existing fixtures already include it via `workflowMode: "none"` etc. — audit pass).
- Add a `withOpenSpec()` variant or extend the existing fixture so at least one test path exercises `workflowMode: "openspec"`.

### EXISTING tests to update

- `src/generators/__tests__/codex.test.ts` — drop any `speckit:` reference, add a test asserting the `workflowOpenspec` block renders only when `workflowMode === "openspec"`.
- `src/generators/__tests__/speckit.test.ts` — currently tests `initSpecify`; update fixtures to drop `speckit:` boolean.
- `src/generators/claude-code/__tests__/claude-code.test.ts` — same updates as codex test file.
- `src/__tests__/e2e.test.ts`, `src/__tests__/e2e-npm-install.test.ts`, `src/__tests__/add-command.test.ts` — drop `speckit:` references; ensure `workflowMode` is set.

## Sequencing

```
Phase 1 (sequential — type system foundation)
  └─ Update src/types.ts (extend WorkflowMode, remove speckit boolean)
     └─ Update src/__tests__/fixtures.ts (so other phases compile)

Phase 2 (parallel — generator + templates, both depend only on Phase 1)
  ├─ NEW src/generators/openspec.ts
  ├─ MODIFY src/templates/codex/AGENTS.md.hbs
  └─ MODIFY src/templates/claude-code/CLAUDE.md.hbs

Phase 3 (parallel — generator data wiring, depends on Phase 1 + 2)
  ├─ MODIFY src/generators/codex/index.ts (data object)
  └─ MODIFY src/generators/claude-code/index.ts (data object)

Phase 4 (sequential — orchestration, depends on Phase 1-3)
  └─ MODIFY src/prompts/project.ts (4-value workflowMode prompt, drop speckit checkbox)
     └─ MODIFY src/commands/new.ts (CLI flags + dispatch + mutual-exclusion gate)

Phase 5 (parallel — tests, depend on all preceding phases)
  ├─ NEW src/generators/__tests__/openspec.test.ts
  ├─ UPDATE src/generators/__tests__/codex.test.ts
  ├─ UPDATE src/generators/__tests__/speckit.test.ts
  ├─ UPDATE src/generators/claude-code/__tests__/claude-code.test.ts
  └─ UPDATE src/__tests__/{e2e,e2e-npm-install,add-command}.test.ts

Phase 6 (sequential — verification)
  └─ npm run typecheck && npm run lint  (cfg.verification=minimal)
  └─ grep -ri "relationship-crm" src/    (must return zero — Decision 4 invariant / SC-006)
```

Per Constitution §10, edits within a phase run in parallel via multi-tool dispatch. Phases 3, 4, 5 likewise.

## Test strategy

`speckit.config: tests=true, tdd=false, test-types=unit, verification=minimal`. Tests are written AFTER implementation (TDD off) and scoped to unit-level (no e2e additions in this PR).

**New tests** (one file): see `openspec.test.ts` cases above.

**Updated tests** (assertions to add):
- Codex test: rendered AGENTS.md contains `Workflow Mode: openspec` when `workflowMode=openspec`; contains the OpenSpec workflow section; contains `{{name}}` substituted (no hard-coded names).
- Codex test: rendered AGENTS.md contains `Workflow Mode: speckit` when `workflowMode=speckit`; does NOT contain the OpenSpec section.
- Claude Code test: same dual coverage on CLAUDE.md.
- Snapshot regression for `workflowMode=none` AGENTS.md (verifies the bootstrap-skip path).

**Verification command** (matches `cfg.verification=minimal`): `npm run typecheck && npm run lint`. Full test suite runs once at end of Phase 6.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| OpenSpec CLI writes to `.codex/skills/` and `.claude/skills/` — could collide with codex/claude-code generators | Confirmed by inspection: codex generator writes ONLY `.codex/config.toml`, `.codex/rules/*`, and root-level `AGENTS.md`. The claude-code generator writes to `.claude/commands/`, `.claude/hooks/`, `.claude/skills/<own-skills>/` but NEVER to `.claude/skills/openspec-*/`. No collision. Documented in Constitution §1 check above. |
| `npx` first-run downloads ~1MB and takes 5–10s on cold cache — slows down `forgekit new` perceptibly | Acceptable: `forgekit new` is a one-off command. The user already accepts speckit's `specify init` doing similar work. Document in the spinner status line. |
| `@fission-ai/openspec@latest` — pinning to `@latest` means scaffold output drifts as upstream releases | Acceptable for now. If this becomes a stability issue, the generator can pin to a known-good major (e.g. `@1`) — single-line change. Out of scope per qa-summary §"Out of scope". |
| Template back-compat: existing `{{#if workflowSpeckit}}` blocks in OTHER templates (root/, frontend/, backend/) might still reference the legacy variable | Audit pass: `grep -rn "workflowSpeckit\|workflowVibe" src/templates/` — confirmed only `codex/AGENTS.md.hbs` and `claude-code/CLAUDE.md.hbs` use these. No other touch points. |
| `--speckit` was not previously a CLI flag (only `--workflow speckit` existed) | Adding it now as a new boolean flag is purely additive — existing CI scripts using `--workflow speckit` continue to work, and the new `--speckit` shortcut maps to the same `workflowMode=speckit` value. No back-compat break. |
| Existing users with the legacy `speckit: true` field in their `.forgekit.json` manifest | The manifest is read-only legacy data; ForgeKit does not consume it back to drive future commands. No migration needed. |

## Migration plan for ProjectConfig

- The `speckit: boolean` field is removed from `ProjectConfig`. Every call site is updated in this PR (Phase 1 + 3 + 4).
- The persisted `SavedConfig` (`~/.forgekitrc.json`) holds only `{ groupId?: string }` (verified at `src/types.ts:48-50`). No migration script needed.
- The forgekit manifest (`.forgekit.json` written by `writeManifest`) embeds the full `ProjectConfig`. Existing manifests on user disks will have `speckit: <bool>` and lack the new `workflowMode=openspec` literal. This is read-only legacy data — ForgeKit does not read it back to drive future commands. No migration needed.

## Out of scope (carried from qa-summary.md)

- Copying CRM-specific skills (`relationship-crm-*`) from the reference project.
- Supporting OpenSpec custom schemas (we use the default `spec-driven` schema only).
- Mixing speckit + openspec in the same project (mutually exclusive by construction).
- Pinning the `@fission-ai/openspec` major version (deferred until upstream stability becomes an issue).
- Back-compat reading of legacy `.forgekit.json` manifests with the old `speckit` boolean.

## Acceptance gate (before `sk:tasks`)

- [ ] `WorkflowMode` extended to 4 values; `speckit` boolean removed from `ProjectConfig`.
- [ ] OpenSpec generator implemented with the 4 unit-test cases listed.
- [ ] Templates rendered with `Workflow Mode: openspec` and a `{{#if workflowOpenspec}}` block free of hard-coded project names.
- [ ] CLI `--speckit`, `--openspec`, and `--workflow <mode>` wired with mutual-exclusion check.
- [ ] All existing tests pass after fixture migration.
- [ ] `grep -ri "relationship-crm" src/` returns zero hits (Decision 4 invariant / SC-006).
