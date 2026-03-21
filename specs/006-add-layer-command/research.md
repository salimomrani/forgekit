# Research: Add Layer Command

## Decision 1: Temp-directory generation strategy

**Decision**: Generate into `os.tmpdir()/forgekit-add-XXXXX/` using `fs.mkdtemp`, then move files to the project root on success via `fs.move` with `overwrite: false` (for new layer files) and `overwrite: true` (for dependent layer regeneration).

**Rationale**: All existing generators take a `projectDir` parameter and write relative to it. Pointing them at a temp directory requires zero changes to generator internals. After success, a recursive move merges the temp tree into the real project. On failure, a single `fs.remove(tmpDir)` cleans up — the project is untouched.

**Alternatives considered**:
- Write directly to project root — rejected: violates rollback requirement (partial state on failure).
- Git stash + restore — rejected: requires git, adds complexity, doesn't work for non-git projects.

---

## Decision 2: forgekit.json persistence — when and where

**Decision**: `forgekit.json` is written at project root by `forgekit new` (after successful generation) and by `forgekit add` (after successful layer addition). It stores the full `ProjectConfig` plus metadata (`forgekit.version`, `generatedAt`).

**Rationale**: Storing config in the project eliminates filesystem guessing for future `add` invocations. Writing it last (after all generators succeed) ensures no partial state (Constitution Rule 4). The metadata field helps debug version mismatches.

**Alternatives considered**:
- Store in `~/.forgekit/projects/<name>.json` — rejected: config should live with the project, not globally. Multiple clones would diverge.
- Use `package.json` custom field — rejected: not all projects have `package.json` (backend-only Spring Boot).

---

## Decision 3: Filesystem fallback detection

**Decision**: When `forgekit.json` is absent, detect layers by checking for sentinel files. Show the detected config to the user and ask for confirmation before proceeding. Then create `forgekit.json` for future use.

**Rationale**: Projects generated before this feature (v1.15 and earlier) have no `forgekit.json`. Filesystem detection provides backward compatibility. User confirmation prevents false positives.

**Detection map**:

| Sentinel file | Detected config |
|---------------|----------------|
| `backend/pom.xml` | `backendType: "spring-boot"` |
| `backend/app/main.py` | `backendType: "fastapi"` |
| `frontend/angular.json` | `frontend: "angular"` |
| `frontend/vite.config.ts` | `frontend: "react-vite"` |
| `docker-compose.yml` | `docker: true` |
| `.github/workflows/ci.yml` | `ci: true` |
| `.claude/settings.json` | `claudeCode: true` |
| `.specify/memory/constitution.md` | `speckit: true` |
| `.prettierrc` | `prettier: true` |

---

## Decision 4: Dependent layer regeneration — overwrite strategy

**Decision**: After adding a new layer, regenerate infrastructure layers that depend on the full config (docker, ci, claude-code). Regenerated files overwrite existing ones since they are generated artifacts, not user-edited.

**Rationale**: Docker and CI templates use conditionals based on `backendType` and `frontend`. Adding a backend to a project with CI means the CI workflow must include the new backend steps. Running the generator with the updated config produces the correct file.

**Files that get overwritten**:
- `docker-compose.yml` (when adding backend/frontend and docker exists)
- `.github/workflows/ci.yml` (when adding backend/frontend and ci exists)
- `.claude/CLAUDE.md`, `.claude/rules/backend.md`, `.claude/rules/frontend.md` (when adding backend/frontend and claudeCode exists)

**Not overwritten**: `README.md` — users frequently edit this. Root generator is skipped during `add`.

---

## Decision 5: Prompt reuse strategy

**Decision**: Create a new `promptAddConfig()` function in `src/prompts/add.ts` that reuses the same sub-question patterns as `promptProjectConfig()` but scoped to the layer being added.

**Rationale**: `promptProjectConfig()` has the full wizard flow (name, description, backend, frontend, infra). For `add`, we only need the sub-questions for the specific layer. Extracting shared prompt logic into small functions would require refactoring `promptProjectConfig()` (not justified by Rule 6 — only 2 callsites). A separate function is simpler.

**Alternatives considered**:
- Refactor `promptProjectConfig()` to accept a "mode" parameter — rejected: over-engineering for 2 callsites.
- Use `promptProjectConfig()` with all defaults pre-filled — rejected: would still show sections for existing layers.

---

## Decision 6: CLI command registration

**Decision**: Add `forgekit add <layer>` as a new Commander subcommand in `src/commands/add.ts`, registered in `src/index.ts` alongside `newCommand`.

**Rationale**: Commander.js supports multiple subcommands natively. The `add` command has its own argument (layer name), its own option flags, and its own action logic. A separate file follows the existing pattern (`src/commands/new.ts`).
