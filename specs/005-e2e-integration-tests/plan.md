# Implementation Plan: End-to-End Integration Tests

**Feature**: 005 — e2e-integration-tests
**Branch**: 5-e2e-integration-tests
**Spec**: specs/005-e2e-integration-tests/spec.md

---

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| 1. Each generator owns exactly one layer | ✅ | No generator changes; only new orchestration wrapper |
| 2. Templates contain zero logic | ✅ | No template changes |
| 3. ProjectConfig is the single source of truth | ✅ | Tests pass full ProjectConfig directly |
| 4. Fail fast, rollback completely | ✅ | Rollback tested in FR-7 scenario |
| 5. Network failures are silent and recoverable | ✅ | Tests bypass network entirely via fixture injection |
| 6. No speculative abstractions | ✅ | `generateProject()` extraction has 2 callsites: action + tests |
| 7. Tests declare all fixture fields | ✅ | All required ProjectConfig + ResolvedVersions fields declared |
| 8. CLI detection is synchronous and early | ✅ | Not applicable to test additions |
| 9. Release only through the pipeline | ✅ | Not applicable |
| 10. I/O is parallelized | ✅ | Existing generators already use Promise.all; not changed |

**Note on Rule 6**: `generateProject()` is used in 2 callsites (`.action()` callback + e2e tests). Exception applies: extracted to avoid duplication of complex orchestration logic.

---

## Architecture

### Files to modify

| File | Change |
|------|--------|
| `src/commands/new.ts` | Extract generation pipeline into exported `generateProject()` function |
| `src/versions.ts` | Export `FALLBACK_VERSIONS` |

### Files to create

| File | Purpose |
|------|---------|
| `src/__tests__/e2e.test.ts` | 6 stack scenarios + rollback test |

---

## Task 1 — Export `FALLBACK_VERSIONS` from `versions.ts`

**File**: `src/versions.ts`

Change `const FALLBACK_VERSIONS` → `export const FALLBACK_VERSIONS`.

No other changes.

---

## Task 2 — Extract `generateProject()` from `new.ts`

**File**: `src/commands/new.ts`

Extract lines 100–189 (the `try { ... }` block inside `.action()`) into:

```typescript
export async function generateProject(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
  opts?: { globalSkillsBase?: string; globalCommandsBase?: string }
): Promise<void>
```

Rules:
- All `console.log` / `process.stdout.write` / `chalk` calls stay **inside** `generateProject()` — the tests will just produce output noise (acceptable).
- `generateClaudeCode(projectDir, config, versions)` call becomes `generateClaudeCode(projectDir, config, versions, opts?.globalSkillsBase, opts?.globalCommandsBase)`.
- **`saveConfig()` stays in `.action()`** (not moved into `generateProject()`). Reason: it writes to `~/.forgekit/config.json` — running it in every test would corrupt the developer's real config. Additionally, it should not run on failed generation (Constitution Rule 4: no partial state).
- The `.action()` callback:
  1. Prompts (unchanged)
  2. Checks `projectDir` existence (unchanged)
  3. Calls `await generateProject(projectDir, config, versions)`
  4. Calls `await saveConfig({ groupId: config.groupId })` (after successful generation)
  5. `catch` block for user messaging + `process.exit(1)`

**Rollback ownership**: Keep the `catch` block with `fs.remove(projectDir)` inside `generateProject()` so rollback is testable.

Wait — if rollback is inside `generateProject()`, then after an error the function doesn't rethrow, it swallows the error after rollback and calls `process.exit(1)`. For testability, `generateProject()` must **rethrow** after rollback so tests can catch the error without killing the process.

Revised design:
```typescript
export async function generateProject(...): Promise<void> {
  // ... all generation steps ...
  // On error: remove projectDir, then rethrow original error
}
```

The `.action()` callback wraps `generateProject()` in its own try/catch to handle `process.exit(1)` and user-facing messaging.

---

## Task 3 — Write `src/__tests__/e2e.test.ts`

### Imports & mocks

```typescript
vi.mock("../../generators/speckit.js", () => ({ initSpecify: vi.fn(() => true) }));
```

### Fixtures

```typescript
const BASE_VERSIONS = FALLBACK_VERSIONS; // imported from versions.ts

function baseConfig(overrides: Partial<ProjectConfig>): ProjectConfig {
  return {
    name: "test-proj",
    groupId: "com.example",
    description: "E2E test",
    backendType: null,
    frontend: null,
    flyway: false, openapi: false, auth: false, mapstruct: false,
    prettier: false, uiFramework: "none", primeNGPreset: "Aura", ngrx: false,
    docker: false, ci: false, claudeCode: false, speckit: false, gitInit: false,
    ...overrides,
  };
}
```

### Test setup

```typescript
let tmpDir: string;
let fakeSkillsDir: string;
let fakeCommandsDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-e2e-"));
  fakeSkillsDir = path.join(tmpDir, "skills");
  fakeCommandsDir = path.join(tmpDir, "commands");
  await fs.ensureDir(fakeSkillsDir);
  await fs.ensureDir(fakeCommandsDir);
});

afterEach(async () => {
  await fs.remove(tmpDir);
});
```

### Helper

```typescript
async function run(config: ProjectConfig): Promise<string> {
  const projectDir = path.join(tmpDir, config.name);
  await fs.ensureDir(projectDir);
  await generateProject(projectDir, config, BASE_VERSIONS, {
    globalSkillsBase: fakeSkillsDir,
    globalCommandsBase: fakeCommandsDir,
  });
  return projectDir;
}
```

### Scenarios

#### S1 — Spring Boot + Angular

Config: `backendType: "spring-boot"`, `frontend: "angular"`, `gitInit: false`

Expected files:
- `backend/pom.xml`
- `backend/src/main/java/com/example/testproj/TestprojApplication.java`
- `frontend/package.json`
- `frontend/src/app/app.component.ts`
- `README.md`

Content assertions:
- `backend/pom.xml` contains `<artifactId>test-proj</artifactId>`
- `frontend/package.json` contains `"@angular/core"`

#### S2 — FastAPI + React/Vite

Config: `backendType: "fastapi"`, `frontend: "react-vite"`, `gitInit: false`

Expected files:
- `backend/requirements.txt`
- `backend/app/main.py`
- `frontend/package.json`
- `frontend/src/main.tsx`
- `README.md`

Content assertions:
- `backend/requirements.txt` contains `fastapi`
- `frontend/package.json` contains `"react"`

#### S3 — Spring Boot only (no frontend)

Config: `backendType: "spring-boot"`, `frontend: null`

Expected files:
- `backend/pom.xml`
- `README.md`

Not expected: `frontend/` directory

#### S4 — React/Vite only (no backend)

Config: `backendType: null`, `frontend: "react-vite"`

Expected files:
- `frontend/package.json`
- `frontend/src/main.tsx`
- `README.md`

Not expected: `backend/` directory

#### S5 — Claude Code only

Config: `backendType: null`, `frontend: null`, `claudeCode: true`, `gitInit: false`

Expected files:
- `.claude/settings.json`
- `.claude/CLAUDE.md`
- `README.md`

Content assertions:
- `.claude/settings.json` is valid JSON

#### S6 — Full stack (FastAPI + React + Docker + CI + Claude + Speckit)

Config: `backendType: "fastapi"`, `frontend: "react-vite"`, `docker: true`, `ci: true`, `claudeCode: true`, `speckit: true`, `prettier: true`, `gitInit: false`

Expected files:
- `backend/requirements.txt`
- `frontend/package.json`
- `docker-compose.yml`
- `.github/workflows/ci.yml`
- `.claude/settings.json`
- `README.md`

Content assertions:
- `docker-compose.yml` contains `fastapi` (service reference)
- `.github/workflows/ci.yml` contains `python` (CI step)

#### FR-7 — Rollback on error

Mock one generator to throw mid-pipeline. Assert:
1. `generateProject()` rejects (error propagates)
2. `projectDir` does not exist after the call

```typescript
vi.mock("../../generators/root/index.js", () => ({
  generateRoot: vi.fn().mockRejectedValue(new Error("simulated failure")),
}));
```

---

## Task ordering

| # | Task | Depends on |
|---|------|------------|
| 1 | Export FALLBACK_VERSIONS | — |
| 2 | Extract generateProject() | — |
| 3 | Write e2e.test.ts | Tasks 1 + 2 |
| 4 | npm test green | Task 3 |

Tasks 1 and 2 are independent and can be done in parallel.

---

## Rollback test — design note

The rollback test lives in a **separate file** `src/__tests__/e2e-rollback.test.ts`. Using `vi.mock` at the top level (hoisted) to mock `generateRoot` keeps the implementation simple — no dynamic import, no `vi.resetModules()`. Separating it from `e2e.test.ts` ensures the mock does not affect the 6 scenario tests.
