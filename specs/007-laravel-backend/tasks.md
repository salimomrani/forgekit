# Tasks: Laravel Backend

**Feature**: 007 — laravel-backend
**Branch**: 007-laravel-backend
**Total tasks**: 20

---

## Phase 1 — Setup (Type System & Versions)

> Foundation: extend the type system and version resolution so all subsequent tasks can reference `"laravel"` and its versions.

- [x] T001 Add `"laravel"` to `BackendType` union type in `src/types.ts`
- [x] T002 Add `fetchPackagistVersion()` function, `laravel`/`sanctum`/`scramble` fields to `ResolvedVersions` and `FALLBACK_VERSIONS`, and Laravel fetch tasks to `resolveVersions()` in `src/versions.ts`

---

## Phase 2 — Templates (Handlebars)

> Create all Laravel Handlebars templates. No TypeScript changes — pure `.hbs` files. All tasks in this phase are parallelizable.

- [x] T003 [P] Create `src/templates/laravel/composer.json.hbs` — Composer config with conditional `laravel/sanctum` and `dedoc/scramble` dependencies, PHP 8.3 requirement, PSR-4 autoload, Laravel framework dependency with version from `{{versions.laravel}}`
- [x] T004 [P] Create `src/templates/laravel/artisan.hbs` — Laravel CLI entry point (executable PHP script that bootstraps the app)
- [x] T005 [P] Create `src/templates/laravel/bootstrap-app.php.hbs` — App bootstrap using `Application::configure()` with `withRouting(api:)` only, conditional `{{#if auth}}` Sanctum middleware registration, no web routes
- [x] T006 [P] Create config templates: `src/templates/laravel/config-app.php.hbs` (app name from `{{name}}`), `src/templates/laravel/config-database.php.hbs` (PostgreSQL default with env vars), `src/templates/laravel/config-cors.php.hbs` (allow all origins in dev)
- [x] T007 [P] Create conditional config templates: `src/templates/laravel/config-sanctum.php.hbs` (Sanctum guard config), `src/templates/laravel/config-scramble.php.hbs` (Scramble API docs config)
- [x] T008 [P] Create `src/templates/laravel/routes-api.php.hbs` — health route + conditional `{{#if auth}}` `/api/user` route with `auth:sanctum` middleware
- [x] T009 [P] Create PHP class templates: `src/templates/laravel/HealthController.php.hbs`, `src/templates/laravel/AppServiceProvider.php.hbs`, `src/templates/laravel/DatabaseSeeder.php.hbs`
- [x] T010 [P] Create test templates: `src/templates/laravel/TestCase.php.hbs` (base class), `src/templates/laravel/HealthTest.php.hbs` (GET /api/health returns 200), `src/templates/laravel/phpunit.xml.hbs` (PHPUnit config with SQLite in-memory for tests)
- [x] T011 [P] Create project files: `src/templates/laravel/env.example.hbs` (PostgreSQL env vars with `{{dbName}}`), `src/templates/laravel/gitignore.hbs`, `src/templates/laravel/php-version.hbs` (8.3), `src/templates/laravel/Dockerfile.hbs` (multi-stage composer + php:8.3-cli), `src/templates/laravel/dockerignore.hbs`

---

## Phase 3 — Generator

> Create the LaravelGenerator class and wire it into the generation pipeline.

- [x] T012 Create `LaravelGenerator` class in `src/generators/laravel/index.ts` — extends `BaseGenerator`, creates directory structure per spec FR-3, renders all templates with `Promise.all()`, conditionally renders sanctum/scramble configs, exports `generateLaravelBackend(projectDir, config, versions)`
- [x] T013 Wire Laravel into `forgekit new` command in `src/commands/new.ts` — add `--laravel` CLI flag, add `if (config.backendType === "laravel")` dispatch block calling `generateLaravelBackend()`, add post-generation start instructions (`cd backend && composer install && php artisan serve`)

---

## Phase 4 — CLI Integration (Prompts, Add, Detection)

> Integrate Laravel into all CLI touchpoints. Tasks in this phase are parallelizable.

- [x] T014 [P] Add Laravel choice to backend prompt in `src/prompts/project.ts` — add `{ name: "Laravel (PHP 8.3)", value: "laravel" }` choice, add Laravel feature checkbox (Sanctum auth, Scramble openapi) when `backendType === "laravel"`
- [x] T015 [P] Add `promptLaravel()` to `src/prompts/add.ts` — checkbox for auth/openapi, wire into `promptAddLayerConfig()` for `layer === "laravel"`
- [x] T016 [P] Add Laravel to `src/commands/add.ts` — add `laravel` entry in `LAYER_CONFIG_MAP` with `conflictGroup: "backend"`, add `case "laravel"` in `runLayerGenerator()` calling `generateLaravelBackend()`
- [x] T017 [P] Add Laravel sentinel to `src/utils/detect-project.ts` — detect `backend/artisan` → `backendType: "laravel"`

---

## Phase 5 — Infrastructure Templates

> Update Docker Compose and CI templates with Laravel-specific blocks. Both tasks are parallelizable.

- [x] T018 [P] Update `src/templates/docker/docker-compose.yml.hbs` — add `{{#if laravel}}` service block (php artisan serve, PostgreSQL env vars, depends_on postgres), pass `laravel` boolean in `src/generators/docker/index.ts`
- [x] T019 [P] Update `src/templates/ci/ci.yml.hbs` — add `{{#if laravel}}` backend job (PHP 8.3 setup, composer install, php artisan test, pint --test), pass `laravel` boolean in `src/generators/ci/index.ts`

---

## Phase 6 — Tests

- [x] T020 Create `src/__tests__/laravel-generator.test.ts` — test directory structure creation, template rendering with/without auth/openapi, verify artisan file exists, verify composer.json includes conditional deps, verify all ResolvedVersions fixture fields

---

## Dependencies

```
T001 ──┬──> T002 ──> T012 ──> T013
       │              ↑
       ├──> T014      │
       ├──> T015      │
       ├──> T016 ─────┘
       └──> T017
T003-T011 (parallel) ──> T012
T018, T019 (parallel, independent)
T020 (after T012)
```

## Parallel Execution Opportunities

| Group | Tasks | Condition |
|-------|-------|-----------|
| Templates batch | T003–T011 | All independent, different files |
| CLI integration batch | T014, T015, T016, T017 | Different files, all depend only on T001 |
| Infrastructure batch | T018, T019 | Different files, no dependencies on each other |

## Implementation Strategy

**MVP**: T001 → T002 → T003-T011 (parallel) → T012 → T013 → T020
This gives a working `forgekit new --laravel` with all templates and tests.

**Full integration**: T014-T017 (parallel) → T018-T019 (parallel)
Adds CLI prompts, `forgekit add`, project detection, Docker, and CI.
