# Research: End-to-End Integration Tests

## Decision 1: Test entry point — orchestrator extraction

**Decision**: Extract the generation pipeline from `new.ts` `.action()` callback into a standalone exported function `generateProject(projectDir, config, versions, opts?)`.

**Rationale**: The generation logic (lines 100–189 of `src/commands/new.ts`) is currently embedded inside the Commander `.action()` callback alongside stdin/stdout interaction. Extracting it into a pure async function enables direct invocation from tests without touching the CLI layer. The `.action()` callback becomes a thin shell that calls `generateProject()`.

**Alternatives considered**:
- Running the built binary via `child_process.execSync` — rejected: requires build step, hard to handle interactive prompts, slow.
- Mocking every generator individually — rejected: defeats the purpose of integration testing.

---

## Decision 2: Version resolution — direct fixture injection

**Decision**: Tests construct a `ResolvedVersions` fixture directly from `FALLBACK_VERSIONS` (exported from `versions.ts`) and pass it into `generateProject()`. No mocking of `resolveVersions()` is needed.

**Rationale**: `generateProject()` will receive pre-resolved versions as a parameter. Tests bypass `resolveVersions()` entirely by passing the fixture directly — no network, no mock setup. `FALLBACK_VERSIONS` must be exported from `versions.ts` (currently unexported).

**Alternatives considered**:
- `vi.mock` for `resolveVersions` — unnecessarily complex when we can just pass versions directly.

---

## Decision 3: `initSpecify` — vi.mock

**Decision**: Mock `initSpecify` from `src/generators/speckit.ts` using `vi.mock`. Returns `true` (success) without calling the `specify` binary.

**Rationale**: `initSpecify` calls `specify init` via `spawnSync` — this external binary is not available in CI and is not the subject of these tests. The speckit generator has its own dedicated test at `src/generators/__tests__/speckit.test.ts`.

**Alternatives considered**:
- Set `speckit: false` in all scenarios — would leave the full-stack scenario (S6) incomplete.

---

## Decision 4: `generateClaudeCode` globalSkillsBase — injectable opts

**Decision**: `generateProject()` accepts an `opts.globalSkillsBase` param forwarded to `generateClaudeCode`. Tests that include `claudeCode: true` (S5, S6) seed a fake skills directory in `beforeEach`.

**Rationale**: `generateClaudeCode` already supports injectable `globalSkillsBase` / `globalCommandsBase`. The issue documented in MEMORY.md (`[2026-03] CI test failure — skills tests dépendent de ~/.claude/skills/`) applies here too.

---

## Decision 5: `gitInit: false` for all scenarios

**Decision**: All 6 test scenarios use `gitInit: false`.

**Rationale**: `initGit` runs `git init` + a commit in the generated project directory. This creates real git processes in tmp dirs, pollutes process state, and makes tests slower. Git init is tested through the `initGit` function itself, not at this level.

---

## Decision 6: Test file location

**Decision**: `src/__tests__/e2e.test.ts`

**Rationale**: Consistent with existing `src/__tests__/index.test.ts` location for cross-cutting tests. Generator-specific tests stay in their `__tests__/` subdirectory.
