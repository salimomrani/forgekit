# Implementation Plan: Add Layer Command

**Feature**: 006 — add-layer-command
**Branch**: 006-add-layer-command
**Spec**: specs/006-add-layer-command/spec.md

---

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| 1. Each generator owns exactly one layer | ✅ | No generator changes; `add` reuses existing generators as-is |
| 2. Templates contain zero logic | ✅ | No template changes |
| 3. ProjectConfig is the single source of truth | ✅ | `forgekit.json` persists ProjectConfig; `add` reads + updates it |
| 4. Fail fast, rollback completely | ✅ | Temp-dir strategy: on failure, delete temp only — project untouched |
| 5. Network failures are silent and recoverable | ✅ | `resolveVersions()` reused with same fallback behavior |
| 6. No speculative abstractions | ✅ | No shared prompt helpers extracted (only 2 callsites); no base class changes |
| 7. Tests declare all fixture fields | ✅ | Tests will use full ProjectConfig + forgekit.json fixtures |
| 8. CLI detection is synchronous and early | ✅ | Not applicable (no new tool detection) |
| 9. Release only through the pipeline | ✅ | Not applicable |
| 10. I/O is parallelized | ✅ | Generators already use Promise.all internally |

---

## Architecture

### Files to create

| File | Purpose |
|------|---------|
| `src/commands/add.ts` | `forgekit add <layer>` command — detection, prompts, temp-dir generation, move, dependent updates |
| `src/prompts/add.ts` | Layer-specific interactive prompts (sub-questions scoped to added layer) |
| `src/utils/detect-project.ts` | Read `forgekit.json` or fall back to filesystem detection |
| `src/utils/forgekit-json.ts` | Read/write `forgekit.json` manifest (typed I/O) |
| `src/__tests__/add-command.test.ts` | Unit tests for the add command flow |
| `src/__tests__/detect-project.test.ts` | Unit tests for project detection (forgekit.json + filesystem fallback) |

### Files to modify

| File | Change |
|------|--------|
| `src/index.ts` | Register `addCommand` alongside `newCommand` |
| `src/commands/new.ts` | Write `forgekit.json` after successful generation (end of `.action()`) |
| `src/types.ts` | Add `ForgeKitManifest` type for `forgekit.json` schema |

### Files NOT modified

| File | Reason |
|------|--------|
| All generators (`src/generators/*`) | Reused as-is — they already accept `projectDir` + `config` |
| `src/prompts/project.ts` | Not refactored — Rule 6 (only 2 callsites) |
| `src/versions.ts` | Reused as-is |
| Templates (`src/templates/*`) | No changes needed |

---

## Design Details

### forgekit.json schema

```typescript
// src/types.ts — new type
export interface ForgeKitManifest {
  forgekit: {
    version: string;      // CLI version that generated/last modified
    generatedAt: string;  // ISO 8601 timestamp
  };
  config: ProjectConfig;  // Full config snapshot
}
```

Stored at `<projectRoot>/forgekit.json`. Config is nested under `config` key to separate metadata from project config cleanly.

### Layer-to-generator mapping

```typescript
const LAYER_GENERATORS: Record<string, LayerDef> = {
  "spring-boot": { configField: "backendType", configValue: "spring-boot", conflictGroup: "backend" },
  "fastapi":     { configField: "backendType", configValue: "fastapi",     conflictGroup: "backend" },
  "angular":     { configField: "frontend",    configValue: "angular",     conflictGroup: "frontend" },
  "react":       { configField: "frontend",    configValue: "react-vite",  conflictGroup: "frontend" },
  "docker":      { configField: "docker",      configValue: true,          conflictGroup: null },
  "ci":          { configField: "ci",           configValue: true,          conflictGroup: null },
  "claude-code": { configField: "claudeCode",  configValue: true,          conflictGroup: null },
  "speckit":     { configField: "speckit",      configValue: true,          conflictGroup: null },
  "prettier":    { configField: "prettier",     configValue: true,          conflictGroup: null },
};
```

### Conflict detection logic

```
if (conflictGroup === "backend" && existingConfig.backendType !== null)
  → error: "A backend (${existingConfig.backendType}) already exists."
if (conflictGroup === "frontend" && existingConfig.frontend !== null)
  → error: "A frontend (${existingConfig.frontend}) already exists."
if (configField is boolean && existingConfig[configField] === true)
  → error: "${layer} is already configured."
```

### Generation flow (`src/commands/add.ts`)

```
1. Validate layer argument (is it in LAYER_GENERATORS?)
2. Detect project (forgekit.json → filesystem fallback → error)
3. Check conflicts (error if layer already exists)
4. Prompt sub-questions for the layer (or use CLI flags)
5. Merge prompted values into existing config → updatedConfig
6. resolveVersions(updatedConfig)
7. Create tmpDir = os.tmpdir()/forgekit-add-XXXXX/
8. try {
     Run generator(tmpDir, updatedConfig, versions) for the new layer
     Copy tmpDir contents → projectDir (fs.copy with overwrite: false, errorOnExist: true), then fs.remove(tmpDir)
     Regenerate dependent layers directly in projectDir (overwrite: true)
     Write forgekit.json with updatedConfig
   } catch {
     fs.remove(tmpDir)
     throw
   }
9. Print success message with layer-specific instructions
```

### Dependent layer regeneration

After moving the new layer's files, regenerate dependent infrastructure **directly in the project root** (not in temp) since these are generated artifacts:

| Event | Regenerate |
|-------|-----------|
| Added backend | docker (if exists), ci (if exists), claude-code rules (if exists) |
| Added frontend | ci (if exists), claude-code rules (if exists) |
| Added docker/ci/claude-code/speckit/prettier | Nothing |

### Prompt flow per layer

| Layer | Prompts shown |
|-------|--------------|
| `spring-boot` | Group ID, Backend features (Flyway, OpenAPI, MapStruct, Auth) |
| `fastapi` | Auth only |
| `angular` | UI framework, PrimeNG preset (conditional), NgRx, Auth |
| `react` | Auth only |
| `docker` | None (auto-configured from existing config) |
| `ci` | None |
| `claude-code` | None |
| `speckit` | None |
| `prettier` | None (validates frontend exists, errors if not) |

---

## Task Ordering

| # | Task | Depends on | Files |
|---|------|------------|-------|
| 1 | Add `ForgeKitManifest` type | — | `src/types.ts` |
| 2 | Create `forgekit-json.ts` (read/write) | Task 1 | `src/utils/forgekit-json.ts` |
| 3 | Create `detect-project.ts` (detection + fallback) | Task 2 | `src/utils/detect-project.ts` |
| 4 | Write `forgekit.json` in `forgekit new` | Task 2 | `src/commands/new.ts` |
| 5 | Create `src/prompts/add.ts` (layer prompts) | Task 1 | `src/prompts/add.ts` |
| 6 | Create `src/commands/add.ts` (main command) | Tasks 2, 3, 5 | `src/commands/add.ts` |
| 7 | Register `addCommand` in CLI | Task 6 | `src/index.ts` |
| 8 | Tests: detect-project | Task 3 | `src/__tests__/detect-project.test.ts` |
| 9 | Tests: add command | Tasks 6, 7 | `src/__tests__/add-command.test.ts` |

Tasks 1–3 are sequential (type → I/O util → detection).
Tasks 4 and 5 are independent of each other (both depend on Task 2 or 1).
Task 6 depends on 2, 3, 5.
Tasks 8 and 9 can run in parallel after their deps.

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| `fs.move` conflicts with existing files | Use `overwrite: false` for new layer; `overwrite: true` only for dependent regeneration |
| Filesystem detection false positives | Show detected config + ask user confirmation before proceeding |
| Generator side effects (console output in temp-dir mode) | Acceptable — generators already print progress; `add` will show the same spinners |
| `prettier` added without frontend | Validate early: check `frontend !== null` before prompting |
