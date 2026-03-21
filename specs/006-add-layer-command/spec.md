# Feature Specification: Add Layer Command

**Feature ID**: 006
**Branch**: 006-add-layer-command
**Status**: Draft
**Created**: 2026-03-21

---

## Summary

Add a `forgekit add <layer>` command that adds a single layer (backend, frontend, or infrastructure) to an existing ForgeKit-generated project without regenerating what already exists.

---

## Problem Statement

Today `forgekit new` is the only entry point — it creates a full project from scratch. A user who generated a Spring Boot backend and later decides to add an Angular frontend must either regenerate the entire project (losing any changes) or manually set up the frontend. This makes ForgeKit a one-shot tool instead of a project companion.

---

## Goals

- Allow users to incrementally add layers to an existing project.
- Preserve all existing project files — never overwrite or delete user work.
- Maintain a persistent record of what layers have been generated (`forgekit.json`).
- Provide the same interactive experience as `forgekit new` (prompts, sub-questions, CLI flags).

## Non-Goals

- Adding sub-features to existing layers (e.g., `forgekit add auth` to an existing Spring Boot project). This is v2 scope.
- Migrating or upgrading existing layer versions. That is a separate `forgekit update` feature.
- Supporting non-ForgeKit projects (arbitrary codebases without `forgekit.json` or recognizable structure).

---

## User Scenarios

### Scenario 1 — Developer adds a frontend to a backend-only project

A developer generated a Spring Boot backend with `forgekit new my-app --spring-boot`. Two weeks later, they decide to add a React frontend. They run `forgekit add react` from the project root. ForgeKit detects the existing backend via `forgekit.json`, asks UI-related sub-questions (auth?), generates the frontend in a temp directory, moves it into `frontend/`, updates `docker-compose.yml` and `ci.yml` if those layers exist, and updates `forgekit.json`.

### Scenario 2 — Developer adds Docker to a full-stack project

A developer has a project with Spring Boot + Angular but no Docker. They run `forgekit add docker`. ForgeKit reads `forgekit.json`, knows the backend type and frontend exist, generates a `docker-compose.yml` with the correct services, and moves it into the project root.

### Scenario 3 — Developer tries to add a second backend

A developer with an existing FastAPI backend runs `forgekit add spring-boot`. ForgeKit reads `forgekit.json`, detects `backendType: "fastapi"`, and exits with a clear error: "A backend (fastapi) already exists. Remove it before adding a new one."

### Scenario 4 — Legacy project without forgekit.json

A developer generated their project with ForgeKit v1.15 (before `forgekit.json` existed). They run `forgekit add angular`. ForgeKit fails to find `forgekit.json`, falls back to filesystem detection (finds `backend/pom.xml` → spring-boot, no `frontend/` directory), reconstructs a partial config, confirms with the user, proceeds with generation, and creates `forgekit.json` for future use.

### Scenario 5 — Generation fails mid-way

A developer runs `forgekit add angular` but a template rendering error occurs. ForgeKit deletes the temp directory. The project is untouched — no partial files remain.

---

## Functional Requirements

### FR-1: Layer argument

The command accepts exactly one layer as a positional argument. Valid layers:

| Layer | Maps to config field | Conflict check |
|-------|---------------------|----------------|
| `spring-boot` | `backendType: "spring-boot"` | Fails if any `backendType` already set |
| `fastapi` | `backendType: "fastapi"` | Fails if any `backendType` already set |
| `angular` | `frontend: "angular"` | Fails if any `frontend` already set |
| `react` | `frontend: "react-vite"` | Fails if any `frontend` already set |
| `docker` | `docker: true` | Fails if `docker` already true |
| `ci` | `ci: true` | Fails if `ci` already true |
| `claude-code` | `claudeCode: true` | Fails if `claudeCode` already true |
| `speckit` | `speckit: true` | Fails if `speckit` already true |
| `prettier` | `prettier: true` | Fails if `prettier` already true |

An invalid layer name produces a clear error listing valid options.

### FR-2: Project detection

The command must be run from a project root. Detection order:

1. **Primary**: Read `forgekit.json` in the current directory. Parse it as `ProjectConfig`.
2. **Fallback**: If `forgekit.json` does not exist, detect layers from filesystem:
   - `backend/pom.xml` → `backendType: "spring-boot"`
   - `backend/app/main.py` or `backend/requirements.txt` → `backendType: "fastapi"`
   - `frontend/angular.json` → `frontend: "angular"`
   - `frontend/vite.config.ts` → `frontend: "react-vite"`
   - `docker-compose.yml` → `docker: true`
   - `.github/workflows/ci.yml` → `ci: true`
   - `.claude/settings.json` → `claudeCode: true`
   - `.specify/memory/constitution.md` → `speckit: true`
   - `.husky/` or `.prettierrc` → `prettier: true`
3. **No detection**: If neither `forgekit.json` nor any recognizable files are found, exit with error: "Not a ForgeKit project. Run `forgekit new` to create one."

When falling back to filesystem detection, show the detected config to the user and ask for confirmation before proceeding.

### FR-3: forgekit.json manifest

A JSON file at the project root that persists the `ProjectConfig` used during generation.

- **Created by**: `forgekit new` (at the end of successful generation) and `forgekit add` (when falling back to filesystem detection).
- **Updated by**: `forgekit add` (after successful layer addition — merge the new layer's config fields into the existing config).
- **Schema**: A `forgekit` metadata object plus the full `ProjectConfig` nested under a `config` key:

```json
{
  "forgekit": {
    "version": "1.16.0",
    "generatedAt": "2026-03-21T10:00:00Z"
  },
  "config": {
    "name": "my-app",
    "description": "My project",
    "backendType": "spring-boot",
    "frontend": null,
    "groupId": "com.example",
    "flyway": true,
    "openapi": true,
    "auth": false,
    "mapstruct": true,
    "prettier": false,
    "uiFramework": "none",
    "primeNGPreset": "Aura",
    "ngrx": false,
    "docker": true,
    "ci": true,
    "claudeCode": true,
    "speckit": false,
    "gitInit": true
  }
}
```

### FR-4: Interactive prompts for layer-specific options

When adding a layer, the command asks relevant sub-questions — same prompts as `forgekit new` but scoped to the layer being added:

- **spring-boot**: Group ID, Flyway, OpenAPI, MapStruct, Auth
- **fastapi**: Auth
- **angular**: UI framework, PrimeNG preset (if PrimeNG), NgRx, Auth
- **react**: Auth
- **docker**: No sub-questions (auto-configured from existing config)
- **ci**: No sub-questions (auto-configured from existing config)
- **claude-code**: No sub-questions
- **speckit**: No sub-questions
- **prettier**: No sub-questions (requires frontend to exist — error if no frontend)

All sub-questions are skippable via CLI flags (same flags as `forgekit new`).

### FR-5: Temp-directory generation with atomic move

1. Create a temp directory (e.g., `os.tmpdir()/forgekit-add-XXXXX/`).
2. Run the relevant generator(s) targeting the temp directory.
3. On success: move generated files from temp to the project root (merge directories, never overwrite existing files).
4. On failure: delete the temp directory. Print the error. Exit 1. The project is untouched.

### FR-6: Dependent layer updates

After adding a layer, regenerate dependent infrastructure layers that already exist:

| Added layer | If exists → regenerate |
|-------------|----------------------|
| `spring-boot` or `fastapi` | `docker-compose.yml`, `.github/workflows/ci.yml`, `.claude/CLAUDE.md`, `.claude/rules/backend.md` |
| `angular` or `react` | `.github/workflows/ci.yml`, `.claude/CLAUDE.md`, `.claude/rules/frontend.md` |
| `docker` | None |
| `ci` | None |
| `claude-code` | None (generates based on current full config) |
| `prettier` | None |

Dependent layer regeneration uses the updated config (with the new layer included). Regenerated files **replace** the existing ones (since they are generated, not user-edited).

### FR-7: CLI flags

The `add` command supports the same option flags as `new`, scoped to the layer being added:

```
forgekit add <layer> [options]

Options:
  --group <id>          Java Group ID (spring-boot only)
  --auth                Include auth scaffold
  --flyway / --no-flyway
  --openapi / --no-openapi
  --mapstruct / --no-mapstruct
  --ngrx / --no-ngrx
  --ui <framework>      primeng | tailwind | none (angular only)
  --preset <preset>     Aura | Lara | Nora (angular + primeng only)
```

### FR-8: Version resolution

Before generation, call `resolveVersions()` with the updated config (existing layers + new layer) to fetch latest stable versions. Same timeout and fallback behavior as `forgekit new`.

---

## Constraints

- Must not modify or delete any existing project files except infrastructure files being regenerated (FR-6).
- Must work offline (fallback versions for all dependencies).
- Must run from the project root directory only.
- `prettier` layer requires a frontend to exist — error if `frontend` is null.

---

## Assumptions

- Users run the command from the same directory where `forgekit new` was run (project root).
- The `forgekit.json` schema matches `ProjectConfig` — no migration needed between versions for v1.
- Infrastructure files (docker-compose.yml, ci.yml, CLAUDE.md, rules/) are generated artifacts and can be safely overwritten during dependent layer updates.
- The existing generator classes can be instantiated and run against any target directory (temp or real) without modification to their `generate()` method signature.

---

## Success Criteria

- A user can add any of the 9 supported layers to an existing project in under 30 seconds.
- No existing project files are lost or corrupted during `forgekit add`.
- A failed `forgekit add` leaves the project in its original state with zero side effects.
- Projects generated with `forgekit new` before this feature can still use `forgekit add` via filesystem fallback detection.
- After `forgekit add`, the resulting project structure is identical to what `forgekit new` would have produced with the same combined options.

---

## Key Entities

- **Layer**: A discrete, independently addable unit of project scaffolding (backend, frontend, or infrastructure).
- **forgekit.json**: Project manifest persisting the full generation config at project root.
- **ProjectConfig**: The single source of truth for all generation decisions (Constitution principle 3).
