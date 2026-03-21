# Implementation Plan: Laravel Backend

**Feature**: 007 — laravel-backend
**Branch**: 007-laravel-backend
**Spec**: specs/007-laravel-backend/spec.md

---

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| 1. Each generator owns exactly one layer | ✅ | New `LaravelGenerator` owns `backend/` — same as FastAPI/Spring Boot |
| 2. Templates contain zero logic | ✅ | All conditionals (auth, openapi) handled in generator; templates receive flat data |
| 3. ProjectConfig is the single source of truth | ✅ | Generator receives ProjectConfig; reuses existing `auth` and `openapi` fields |
| 4. Fail fast, rollback completely | ✅ | Inherits existing rollback behavior from `forgekit new` and `forgekit add` |
| 5. Network failures are silent and recoverable | ✅ | Packagist fetch with 8s timeout + FALLBACK_VERSIONS |
| 6. No speculative abstractions | ✅ | No shared helpers extracted (3rd backend, but each generator is standalone) |
| 7. Tests declare all fixture fields | ✅ | Test fixtures will include all ResolvedVersions fields (including new laravel ones) |
| 8. CLI detection is synchronous and early | ✅ | Not applicable (no new tool detection) |
| 9. Release only through the pipeline | ✅ | Not applicable |
| 10. I/O is parallelized | ✅ | Generator uses Promise.all() for all file writes |

---

## Architecture

### Files to create

| File | Purpose |
|------|---------|
| `src/generators/laravel/index.ts` | `LaravelGenerator` class — generates Laravel 12 API-only project in `backend/` |
| `src/templates/laravel/composer.json.hbs` | Composer config with conditional sanctum/scramble deps |
| `src/templates/laravel/artisan.hbs` | Laravel CLI entry point |
| `src/templates/laravel/bootstrap-app.php.hbs` | App bootstrap with API routing + conditional sanctum middleware |
| `src/templates/laravel/config-app.php.hbs` | App configuration |
| `src/templates/laravel/config-database.php.hbs` | PostgreSQL database config |
| `src/templates/laravel/config-cors.php.hbs` | CORS configuration |
| `src/templates/laravel/config-sanctum.php.hbs` | Sanctum config (conditional) |
| `src/templates/laravel/config-scramble.php.hbs` | Scramble config (conditional) |
| `src/templates/laravel/routes-api.php.hbs` | API routes with health endpoint + conditional auth routes |
| `src/templates/laravel/HealthController.php.hbs` | Health check controller |
| `src/templates/laravel/AppServiceProvider.php.hbs` | Service provider |
| `src/templates/laravel/DatabaseSeeder.php.hbs` | Database seeder |
| `src/templates/laravel/phpunit.xml.hbs` | PHPUnit config |
| `src/templates/laravel/TestCase.php.hbs` | Base test class |
| `src/templates/laravel/HealthTest.php.hbs` | Health endpoint test |
| `src/templates/laravel/env.example.hbs` | Environment template |
| `src/templates/laravel/gitignore.hbs` | Laravel .gitignore |
| `src/templates/laravel/php-version.hbs` | PHP version file |
| `src/templates/laravel/Dockerfile.hbs` | Multi-stage PHP build |
| `src/templates/laravel/dockerignore.hbs` | Docker ignore |
| `src/__tests__/laravel-generator.test.ts` | Unit tests for LaravelGenerator |

### Files to modify

| File | Change |
|------|--------|
| `src/types.ts` | Add `"laravel"` to `BackendType` union |
| `src/versions.ts` | Add `laravel`, `sanctum`, `scramble` to `ResolvedVersions`, `FALLBACK_VERSIONS`, `resolveVersions()` with Packagist fetcher |
| `src/prompts/project.ts` | Add Laravel choice + Laravel feature checkbox (auth, openapi) |
| `src/prompts/add.ts` | Add `promptLaravel()` for `forgekit add laravel` |
| `src/commands/new.ts` | Add Laravel generator dispatch + `--laravel` flag + start instructions |
| `src/commands/add.ts` | Add `laravel` to `LAYER_CONFIG_MAP` + generator dispatch |
| `src/utils/detect-project.ts` | Add `backend/artisan` sentinel |
| `src/templates/docker/docker-compose.yml.hbs` | Add `{{#if laravel}}` service block |
| `src/templates/ci/ci.yml.hbs` | Add `{{#if laravel}}` backend job |

### Files NOT modified

| File | Reason |
|------|--------|
| `src/generators/backend/index.ts` | Spring Boot generator — unchanged |
| `src/generators/fastapi/index.ts` | FastAPI generator — unchanged |
| `src/generators/docker/index.ts` | Only needs `laravel` boolean passed in template data (minor) |
| `src/generators/ci/index.ts` | Only needs `laravel` boolean passed in template data (minor) |
| `src/index.ts` | No changes — `add` command already registered |

---

## Design Details

### BackendType extension

```typescript
// src/types.ts
export type BackendType = "spring-boot" | "fastapi" | "laravel" | null;
```

No new fields in `ProjectConfig`. Laravel reuses `auth` (Sanctum) and `openapi` (Scramble) — same boolean fields Spring Boot uses for its equivalents.

### Version resolution — Packagist fetcher

```typescript
// New function in src/versions.ts
async function fetchPackagistVersion(vendor: string, pkg: string): Promise<string | null> {
  const url = `https://repo.packagist.org/p2/${vendor}/${pkg}.json`;
  const res = await fetchWithTimeout(url);
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    const versions = data.packages?.[`${vendor}/${pkg}`];
    if (!Array.isArray(versions)) return null;
    // Find latest stable (no dev, no RC, no alpha, no beta)
    const stable = versions.find((v: { version: string }) =>
      /^\d+\.\d+\.\d+$/.test(v.version)
    );
    return stable?.version ?? null;
  } catch {
    return null;
  }
}
```

Added to `resolveVersions()`:
```typescript
if (opts.backendType === "laravel") {
  tasks.push(
    fetchPackagistVersion("laravel", "framework").then(set("laravel")),
    fetchPackagistVersion("laravel", "sanctum").then(set("sanctum")),
    fetchPackagistVersion("dedoc", "scramble").then(set("scramble")),
  );
}
```

### LaravelGenerator — structure

Follows FastAPI pattern (simpler than Spring Boot). Key data:

```typescript
const data = {
  name: this.config.name,
  description: this.config.description,
  auth: this.config.auth,
  openapi: this.config.openapi,
  dbName: this.config.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
  versions: this.versions,
};
```

### Docker generator update

```typescript
// src/generators/docker/index.ts
const laravel = this.config.backendType === "laravel";

await renderAndWrite(
  "docker/docker-compose.yml.hbs",
  path.join(this.projectDir, "docker-compose.yml"),
  { dbName, name: this.config.name, springBoot, fastapi, laravel },
);
```

### CI generator update

```typescript
// src/generators/ci/index.ts
const laravel = this.config.backendType === "laravel";

await renderAndWrite("ci/ci.yml.hbs", path.join(workflowsDir, "ci.yml"), {
  backend: this.config.backendType !== null,
  springBoot, fastapi, laravel,
  frontend: hasFrontend, hasFrontend, angular, reactVite,
});
```

### Prompt flow — `forgekit new`

When `backendType === "laravel"`, show a feature checkbox:

```typescript
if (backendType === "laravel" &&
    defaults.auth === undefined &&
    defaults.openapi === undefined) {
  const features = await checkbox({
    message: "Fonctionnalités Laravel",
    choices: [
      { name: "Sanctum (API authentication)", value: "auth", checked: false },
      { name: "Scramble (OpenAPI documentation)", value: "openapi", checked: false },
    ],
  });
  auth = features.includes("auth");
  openapi = features.includes("openapi");
}
```

### Prompt flow — `forgekit add laravel`

New `promptLaravel()` in `src/prompts/add.ts`:

```typescript
async function promptLaravel(defaults: Partial<ProjectConfig>): Promise<Partial<ProjectConfig>> {
  let auth = defaults.auth ?? false;
  let openapi = defaults.openapi ?? false;

  if (defaults.auth === undefined && defaults.openapi === undefined) {
    const features = await checkbox({
      message: "Fonctionnalités Laravel",
      choices: [
        { name: "Sanctum (API authentication)", value: "auth", checked: false },
        { name: "Scramble (OpenAPI documentation)", value: "openapi", checked: false },
      ],
    });
    auth = features.includes("auth");
    openapi = features.includes("openapi");
  }

  return { auth, openapi };
}
```

### CLI flags — `forgekit new`

Add `--laravel` option (same pattern as `--spring-boot`, `--fastapi`):

```typescript
.option("--laravel", "Inclure le backend Laravel (PHP 8.3)")
```

In action handler:
```typescript
if (options.laravel) defaults.backendType = "laravel" as BackendType;
```

### Layer config map — `forgekit add`

```typescript
laravel: {
  configField: "backendType",
  configValue: "laravel",
  conflictGroup: "backend",
},
```

---

## Task Ordering

| # | Task | Depends on | Files |
|---|------|------------|-------|
| 1 | Extend `BackendType` with `"laravel"` | — | `src/types.ts` |
| 2 | Add Packagist fetcher + Laravel versions to `resolveVersions()` | Task 1 | `src/versions.ts` |
| 3 | Create all Laravel Handlebars templates | — | `src/templates/laravel/*.hbs` |
| 4 | Create `LaravelGenerator` class | Tasks 1, 2, 3 | `src/generators/laravel/index.ts` |
| 5 | Add Laravel to CLI prompts (`forgekit new`) | Task 1 | `src/prompts/project.ts` |
| 6 | Add Laravel to add prompts (`forgekit add`) | Task 1 | `src/prompts/add.ts` |
| 7 | Add Laravel dispatch in `forgekit new` command | Task 4 | `src/commands/new.ts` |
| 8 | Add Laravel to `forgekit add` (layer map + dispatch) | Tasks 4, 6 | `src/commands/add.ts` |
| 9 | Add Laravel sentinel to project detection | Task 1 | `src/utils/detect-project.ts` |
| 10 | Update Docker Compose template for Laravel | — | `src/templates/docker/docker-compose.yml.hbs`, `src/generators/docker/index.ts` |
| 11 | Update CI template for Laravel | — | `src/templates/ci/ci.yml.hbs`, `src/generators/ci/index.ts` |
| 12 | Tests: LaravelGenerator | Tasks 4, 3 | `src/__tests__/laravel-generator.test.ts` |

**Parallelization**:
- Tasks 1, 3 can start in parallel (type change + templates)
- Tasks 5, 6, 9 can run in parallel after Task 1
- Tasks 10, 11 can run in parallel (independent infra updates)
- Task 12 runs last (needs generator + templates)

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Packagist API format changes | Fallback versions ensure generation never fails; API format is stable (v2 metadata) |
| Laravel 12 structure differs from expectation | Templates are authored from official Laravel 12 API skeleton — verify against `laravel/laravel` repo |
| `auth`/`openapi` field reuse causes confusion | These fields are already generic in ProjectConfig; Spring Boot and Laravel both use them for their respective auth/docs packages |
| Existing tests break due to new ResolvedVersions fields | All test fixtures must be updated with `laravel`, `sanctum`, `scramble` fields |
