# Tasks: Add Layer Command

**Feature**: 006 — add-layer-command
**Branch**: 006-add-layer-command
**Total tasks**: 16

---

## Phase 1 — Types & Utilities

- [x] T001 Add `ForgeKitManifest` interface to `src/types.ts` — shape: `{ forgekit: { version: string; generatedAt: string }; config: ProjectConfig }`
- [x] T002 Create `src/utils/forgekit-json.ts` — two exported functions: `readManifest(projectDir): Promise<ForgeKitManifest | null>` (reads `forgekit.json`, returns null if missing/corrupt) and `writeManifest(projectDir, config): Promise<void>` (writes `forgekit.json` with current CLI version from `package.json` and ISO timestamp)

---

## Phase 2 — Project Detection

- [x] T003 Create `src/utils/detect-project.ts` — exported function `detectProject(projectDir): Promise<{ config: ProjectConfig; source: "manifest" | "filesystem" }>` that: (1) tries `readManifest()`, returns config if found; (2) falls back to filesystem detection by checking sentinel files (`backend/pom.xml` → spring-boot, `backend/app/main.py` or `backend/requirements.txt` → fastapi, `frontend/angular.json` → angular, `frontend/vite.config.ts` → react-vite, `docker-compose.yml` → docker, `.github/workflows/ci.yml` → ci, `.claude/settings.json` → claudeCode, `.specify/memory/constitution.md` → speckit, `.husky/` or `.prettierrc` → prettier); (3) throws if no signals found ("Not a ForgeKit project")

---

## Phase 3 — forgekit.json in `forgekit new`

- [x] T004 Modify `src/commands/new.ts` — after `await generateProject(...)` and `await saveConfig(...)` (line ~213), call `writeManifest(projectDir, config)` to persist `forgekit.json` at project root on every successful `forgekit new`

---

## Phase 4 — Layer Prompts

- [x] T005 Create `src/prompts/add.ts` — exported function `promptAddLayerConfig(layer, existingConfig, defaults): Promise<Partial<ProjectConfig>>` that shows layer-specific sub-questions: spring-boot → Group ID + checkbox (Flyway, OpenAPI, MapStruct, Auth); fastapi → Auth confirm; angular → UI framework select + PrimeNG preset (conditional) + NgRx confirm + Auth confirm; react → Auth confirm; prettier → validate `existingConfig.frontend !== null` or throw; docker/ci/claude-code/speckit → return empty (no prompts). CLI flag defaults skip prompts when provided.

---

## Phase 5 — Add Command (core)

- [x] T006 Create `src/commands/add.ts` with the following structure:

  **Layer validation**: Define `VALID_LAYERS` array and `LAYER_CONFIG_MAP` mapping each layer to its config field, value, and conflict group (backend/frontend/null). Validate the positional argument against this list.

  **Conflict detection**: After detecting the project, check if the layer already exists: backend layers conflict if `backendType !== null`, frontend layers conflict if `frontend !== null`, boolean layers conflict if already `true`. Exit with descriptive error.

  **Filesystem fallback confirmation**: If detection source is `"filesystem"`, print the detected config and prompt user to confirm before proceeding.

  **Generation flow**:
  1. Call `promptAddLayerConfig()` to get layer-specific options
  2. Merge into existing config → `updatedConfig`
  3. Call `resolveVersions({ backendType: updatedConfig.backendType, frontend: updatedConfig.frontend })`
  4. Create temp dir via `fs.mkdtemp(path.join(os.tmpdir(), "forgekit-add-"))`
  5. Run the layer's generator against temp dir
  6. Move temp dir contents to project root (`fs.copy` with `overwrite: false`)
  7. Regenerate dependent layers directly in project root (docker/ci/claude-code if they exist and a backend/frontend was added)
  8. Write updated `forgekit.json`
  9. On error: `fs.remove(tmpDir)`, rethrow
  10. Print success message

- [x] T007 [P] Define CLI options on the `add` command in `src/commands/add.ts` — same flags as `new` but scoped: `--group`, `--auth`, `--flyway/--no-flyway`, `--openapi/--no-openapi`, `--mapstruct/--no-mapstruct`, `--ngrx/--no-ngrx`, `--ui`, `--preset`

---

## Phase 6 — CLI Registration

- [x] T008 Modify `src/index.ts` — import `addCommand` from `./commands/add.js` and register via `program.addCommand(addCommand)` after `newCommand`

---

## Phase 7 — Tests

- [x] T009 [P] Create `src/__tests__/detect-project.test.ts` — test cases: (1) reads valid `forgekit.json` and returns config with source `"manifest"`; (2) detects spring-boot backend from `backend/pom.xml` with source `"filesystem"`; (3) detects react frontend from `frontend/vite.config.ts`; (4) detects multiple layers (docker + ci) from sentinel files; (5) throws when no signals found; (6) ignores corrupt `forgekit.json` and falls back to filesystem

- [x] T010 [P] Create `src/__tests__/forgekit-json.test.ts` — test cases: (1) `writeManifest` creates valid JSON with version and timestamp; (2) `readManifest` returns parsed manifest; (3) `readManifest` returns null for missing file; (4) `readManifest` returns null for corrupt JSON

- [x] T011 [P] Create `src/__tests__/add-command.test.ts` — test cases: (1) adding `react` to a spring-boot-only project generates `frontend/` directory; (2) adding `spring-boot` when a backend exists produces conflict error; (3) adding `docker` to a full-stack project generates `docker-compose.yml` with correct backend type; (4) adding `prettier` without frontend produces error; (5) temp dir is cleaned up on generation failure (rollback); (6) `forgekit.json` is updated after successful add with new layer config

---

## Phase 8 — Verification

- [x] T012 Run `npm run typecheck` — zero errors
- [x] T013 Run `npm run lint` — zero errors (fix unused imports if any)
- [x] T014 Run `npm test` — all new + existing tests pass
- [x] T015 Manual smoke test: run `forgekit new test-add-project --spring-boot --no-docker --no-ci --no-claude-code --no-prettier --no-git` then `cd test-add-project && forgekit add react` — verify `frontend/` created, `forgekit.json` updated
- [x] T016 Clean up smoke test project

---

## Dependencies

```
T001 ──> T002 ──> T003 ──┐
                          ├──> T006 ──> T008 ──> T012..T016
T005 ─────────────────────┘
T004 (independent, can parallel with T003–T006)
T007 (parallel with T006 — same file, different section)
T009, T010, T011 (parallel, after T003/T006 respectively)
```

---

## Parallel Execution

- T004 can be done in parallel with T003–T005 (different files)
- T007 is parallelizable with T006 (different section of same file, but logically coupled — safer sequential)
- T009, T010, T011 are fully independent test files — implement in parallel
- T012, T013, T014 are sequential verification steps

---

## MVP Scope

T001 + T002 + T003 + T004 + T005 + T006 + T007 + T008 = functional `forgekit add` without tests.
Minimum viable test: add T009 (detect-project tests) for confidence in the detection layer.
