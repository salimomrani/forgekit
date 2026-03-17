# Tasks: End-to-End Integration Tests

**Feature**: 005 — e2e-integration-tests
**Branch**: 5-e2e-integration-tests
**Total tasks**: 8

---

## Phase 1 — Setup (Foundational changes, parallelizable)

- [ ] T001 [P] Export `FALLBACK_VERSIONS` constant from `src/versions.ts` (change `const` → `export const`)
- [ ] T002 [P] Extract generation pipeline from `.action()` callback in `src/commands/new.ts` into exported async function `generateProject(projectDir, config, versions, opts?)` — rethrows after rollback, forwards `opts.globalSkillsBase`/`globalCommandsBase` to `generateClaudeCode`; **keep `saveConfig()` call in `.action()` (not inside `generateProject()`)** to avoid writing `~/.forgekit/config.json` during tests and to ensure config is not written on failed generation; `.action()` becomes thin wrapper with its own try/catch for user messaging and `process.exit(1)`

---

## Phase 2 — Integration Test File

- [ ] T003 Create `src/__tests__/e2e.test.ts` with shared scaffolding: imports (`generateProject`, `FALLBACK_VERSIONS`, `fs-extra`, `path`, `os`, vitest helpers), `vi.mock` for `src/generators/speckit.ts` returning `{ initSpecify: vi.fn(() => true) }`, `baseConfig()` helper function with all ProjectConfig fields, `beforeEach`/`afterEach` tmp dir lifecycle, and `run()` helper that calls `generateProject()` with fake skills/commands dirs

---

## Phase 3 — Stack Scenarios (S1–S6, all parallelizable within phase)

- [ ] T004 [P] [US1] Add scenario S1 (Spring Boot + Angular) in `src/__tests__/e2e.test.ts`: config `backendType:"spring-boot"`, `frontend:"angular"`, `gitInit:false` — assert existence of `backend/pom.xml`, `backend/src/main/java/com/example/testproj/TestprojApplication.java`, `frontend/package.json`, `frontend/src/app/app.component.ts`, `README.md`; assert `backend/pom.xml` contains `<artifactId>test-proj</artifactId>` and `frontend/package.json` contains `"@angular/core"`
- [ ] T005 [P] [US2] Add scenario S2 (FastAPI + React/Vite) in `src/__tests__/e2e.test.ts`: config `backendType:"fastapi"`, `frontend:"react-vite"`, `gitInit:false` — assert existence of `backend/requirements.txt`, `backend/app/main.py`, `frontend/package.json`, `frontend/src/main.tsx`, `README.md`; assert `backend/requirements.txt` contains `fastapi` and `frontend/package.json` contains `"react"`
- [ ] T006 [P] [US3] Add scenario S3 (Spring Boot only) in `src/__tests__/e2e.test.ts`: config `backendType:"spring-boot"`, `frontend:null`, `gitInit:false` — assert `backend/pom.xml` and `README.md` exist; assert `frontend/` directory does NOT exist; assert `backend/pom.xml` contains `<artifactId>test-proj</artifactId>`
- [ ] T007 [P] [US4] Add scenario S4 (React/Vite only) in `src/__tests__/e2e.test.ts`: config `backendType:null`, `frontend:"react-vite"`, `gitInit:false` — assert `frontend/package.json`, `frontend/src/main.tsx`, `README.md` exist; assert `backend/` directory does NOT exist; assert `frontend/package.json` contains `"react"`
- [ ] T008 [P] [US5] Add scenario S5 (Claude Code only) in `src/__tests__/e2e.test.ts`: config `backendType:null`, `frontend:null`, `claudeCode:true`, `gitInit:false` — assert `.claude/settings.json`, `.claude/CLAUDE.md`, `README.md` exist; assert `.claude/settings.json` is valid JSON (parse without throwing)
- [ ] T009 [P] [US6] Add scenario S6 (full stack: FastAPI + React + Docker + CI + Claude + Speckit) in `src/__tests__/e2e.test.ts`: config `backendType:"fastapi"`, `frontend:"react-vite"`, `docker:true`, `ci:true`, `claudeCode:true`, `speckit:true`, `prettier:true`, `gitInit:false` — assert `backend/requirements.txt`, `frontend/package.json`, `docker-compose.yml`, `.github/workflows/ci.yml`, `.claude/settings.json`, `README.md` exist; assert `docker-compose.yml` contains `fastapi` and `.github/workflows/ci.yml` contains `python`

---

## Phase 4 — Rollback Test

- [ ] T010 [US7] Add rollback scenario (FR-7) in a **separate file** `src/__tests__/e2e-rollback.test.ts` — use a top-level `vi.mock("../generators/root/index.js", () => ({ generateRoot: vi.fn().mockRejectedValue(new Error("simulated failure")) }))` (hoisted, no dynamic import needed); import `generateProject` and `FALLBACK_VERSIONS`; assert `generateProject()` rejects with an error AND that `projectDir` does not exist on disk after the rejection (full rollback confirmed)

---

## Phase 5 — Verification

- [ ] T011 Run `npm test` and confirm all new e2e tests pass, existing tests are unaffected, and integration tests appear in the total test count output

---

## Dependencies

```
T001 ──┐
       ├──> T003 ──> T004..T010 ──> T011
T002 ──┘
```

T001 and T002 are independent — implement in parallel.
T003 depends on T001 + T002 (needs the exports).
T004–T010 all depend on T003 and are independent of each other.
T011 depends on all previous tasks.

---

## Parallel Execution

T001 and T002 can be implemented simultaneously (different files).
T004–T010 (the 6 scenarios + rollback) can be written in any order once T003 scaffolding exists.

---

## MVP Scope

T001 + T002 + T003 + T004 (S1 Spring+Angular only) = minimal passing e2e test.
Then T005–T010 add coverage incrementally.
