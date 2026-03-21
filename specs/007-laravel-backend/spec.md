# Feature Specification: Laravel Backend

**Feature ID**: 007
**Branch**: 007-laravel-backend
**Status**: Draft
**Created**: 2026-03-21

---

## Summary

Add Laravel 12 as a third backend option in ForgeKit, configured exclusively as a REST API (no web routes, no Blade, no sessions). PostgreSQL by default. Two optional toggles: **auth** (Sanctum) and **openapi** (Scramble). Always included: Migrations, Seeders, Factories, API Resources, CORS, Pint.

---

## Problem Statement

ForgeKit currently supports two backend types: Spring Boot (Java) and FastAPI (Python). Teams working with PHP/Laravel have no scaffolding option. Laravel is one of the most popular backend frameworks and its API-only mode makes it a natural fit for the same full-stack patterns ForgeKit already supports (separate `backend/` + `frontend/` directories, Docker Compose, CI).

---

## Goals

- Add `"laravel"` as a third value for `BackendType` in ForgeKit.
- Generate a Laravel 12 API-only project inside `backend/` using Handlebars templates (no network dependency on `composer create-project`).
- Provide two optional feature toggles: **auth** (Sanctum) and **openapi** (Scramble).
- Integrate fully with existing ForgeKit systems: CLI prompts, `forgekit new`, `forgekit add`, project detection, Docker Compose, CI workflow, and version fetching.
- Follow all existing conventions: BaseGenerator pattern, template-engine rendering, parallel I/O, fail-fast rollback.

## Non-Goals

- Supporting Laravel as a full-stack framework (Blade views, Inertia, Livewire, sessions, cookies).
- Adding a database choice toggle — PostgreSQL is the only supported database (consistent with Spring Boot and FastAPI generators).
- Supporting PHP versions below 8.3.
- Generating a Sail-based development environment — Docker Compose is handled by ForgeKit's existing Docker generator.

---

## User Scenarios

### Scenario 1 — Developer creates a new Laravel API project

A developer runs `forgekit new my-api`. They select "Laravel (PHP 8.3)" as the backend. ForgeKit asks two sub-questions: enable Sanctum auth? Enable Scramble OpenAPI docs? The developer enables both. ForgeKit generates the project with `backend/` containing a complete Laravel 12 API-only application with Sanctum and Scramble configured.

### Scenario 2 — Developer adds Laravel to an existing frontend-only project

A developer has a React frontend project generated with ForgeKit. They run `forgekit add laravel`. ForgeKit detects the existing frontend via `forgekit.json`, prompts for auth and openapi toggles, generates the Laravel backend in `backend/`, updates `docker-compose.yml` and `ci.yml` if they exist, and updates `forgekit.json`.

### Scenario 3 — Developer tries to add Laravel when a backend already exists

A developer with an existing FastAPI backend runs `forgekit add laravel`. ForgeKit reads `forgekit.json`, detects `backendType: "fastapi"`, and exits with a clear error: "A backend (fastapi) already exists. Remove it before adding a new one."

### Scenario 4 — Developer uses CLI flags to skip prompts

A developer runs `forgekit new my-api --laravel --auth --openapi`. ForgeKit skips all backend-related prompts and generates the Laravel project with Sanctum and Scramble enabled.

### Scenario 5 — Offline generation

A developer with no internet runs `forgekit new my-api --laravel`. Version fetching for Laravel/Sanctum/Scramble times out silently. ForgeKit falls back to `FALLBACK_VERSIONS` and generates the project successfully.

---

## Functional Requirements

### FR-1: BackendType extension

Add `"laravel"` to the `BackendType` union type. This value flows through `ProjectConfig` to all generators and infrastructure layers.

### FR-2: CLI prompt integration

Add a third choice to the backend selection prompt:

| Choice | Value |
|--------|-------|
| Spring Boot (Java 21) | `"spring-boot"` |
| FastAPI (Python) | `"fastapi"` |
| Laravel (PHP 8.3) | `"laravel"` |
| Aucun | `null` |

When Laravel is selected, prompt for two sub-questions:
- **Auth**: "Include Sanctum API authentication?" (default: no)
- **OpenAPI**: "Include Scramble API documentation?" (default: no)

### FR-3: Laravel generator

A new `LaravelGenerator` class extending `BaseGenerator` that generates a Laravel 12 API-only project inside `backend/`.

**Directory structure generated:**

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── HealthController.php
│   │   ├── Middleware/
│   │   └── Resources/
│   ├── Models/
│   └── Providers/
│       └── AppServiceProvider.php
├── bootstrap/
│   └── app.php
├── config/
│   ├── app.php
│   ├── database.php
│   ├── cors.php
│   ├── sanctum.php          (if auth enabled)
│   └── scramble.php         (if openapi enabled)
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/
│       └── DatabaseSeeder.php
├── routes/
│   └── api.php
├── storage/
│   ├── app/
│   ├── framework/
│   │   ├── cache/
│   │   ├── sessions/
│   │   └── views/
│   └── logs/
├── tests/
│   ├── Feature/
│   │   └── HealthTest.php
│   └── TestCase.php
├── .env.example
├── .gitignore
├── artisan
├── composer.json
├── phpunit.xml
└── .php-version
```

**Template data passed to Handlebars:**

```
{
  name,
  description,
  auth,        // boolean — Sanctum toggle
  openapi,     // boolean — Scramble toggle
  dbName,      // derived from project name (lowercase, underscores)
  versions     // { laravel, sanctum, scramble }
}
```

### FR-4: API-only configuration

The generated Laravel project must be configured for API-only use:
- `bootstrap/app.php` uses `withRouting(api: ...)` — no web routes file.
- No Blade views, no session middleware, no CSRF middleware.
- API middleware group is the default.
- CORS is configured to allow all origins in development.
- A `/api/health` endpoint is included as a smoke-test route.

### FR-5: Sanctum integration (auth toggle)

When auth is enabled:
- `composer.json` includes `laravel/sanctum`.
- `config/sanctum.php` is generated.
- `bootstrap/app.php` registers Sanctum middleware.
- API routes include a `/api/user` example endpoint protected by `auth:sanctum`.

### FR-6: Scramble integration (openapi toggle)

When openapi is enabled:
- `composer.json` includes `dedoc/scramble`.
- `config/scramble.php` is generated.
- Scramble auto-discovers API routes — no manual annotation required.
- OpenAPI docs available at `/docs/api` in development.

### FR-7: Version fetching

Add Laravel ecosystem versions to the version resolution system:
- **Laravel**: fetch latest stable from Packagist API.
- **Sanctum**: fetch latest stable from Packagist API (conditional on auth toggle).
- **Scramble**: fetch latest stable from Packagist API (conditional on openapi toggle).
- **Fallback versions**: hardcoded defaults in `FALLBACK_VERSIONS`.
- Same 8-second timeout and silent failure behavior as existing version fetches.

### FR-8: Project detection

Add Laravel sentinel for filesystem detection:
- `backend/artisan` → `backendType: "laravel"`

This is used by `forgekit add` when `forgekit.json` is absent.

### FR-9: Docker Compose integration

When Laravel is the backend and Docker is enabled, the Docker Compose generator must produce:
- A PHP-FPM + Nginx service (or a single `php artisan serve` service for dev simplicity).
- A PostgreSQL service with the correct `dbName`.
- Appropriate environment variables (`DB_CONNECTION=pgsql`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`).

### FR-10: CI workflow integration

When Laravel is the backend and CI is enabled, the GitHub Actions workflow must include:
- PHP 8.3 setup.
- `composer install` step.
- `php artisan test` step.
- Pint lint check (`./vendor/bin/pint --test`).

### FR-11: `forgekit add laravel` support

The `add` command layer mapping must include:

| Layer | Config field | Conflict group |
|-------|-------------|----------------|
| `laravel` | `backendType: "laravel"` | `"backend"` |

Sub-questions when adding: auth, openapi (same as `forgekit new`).

### FR-12: CLI flags

Add `--laravel` flag to both `forgekit new` and `forgekit add`:

```
forgekit new <name> --laravel [--auth] [--openapi]
forgekit add laravel [--auth] [--openapi]
```

---

## Constraints

- The generator must not execute `composer`, `php`, or any external PHP tooling. All files are generated from templates.
- No Blade, no web routes, no session/cookie middleware.
- PostgreSQL only — no database choice toggle.
- Must work fully offline (fallback versions).
- Templates contain zero logic (Constitution principle 2).
- ProjectConfig is the single source of truth (Constitution principle 3).

---

## Assumptions

- Laravel 12 is the current latest stable version.
- PHP 8.3 is the minimum required version for Laravel 12.
- Packagist API (`repo.packagist.org`) provides version metadata in a stable, public format.
- The `artisan` file is a reliable sentinel for detecting a Laravel project (always present, unique to Laravel).
- Users will run `composer install` after generation to install dependencies — ForgeKit does not execute package managers.

---

## Success Criteria

- A user can generate a complete Laravel API-only project with `forgekit new` in under 30 seconds.
- A user can add Laravel to an existing project with `forgekit add laravel` without losing any existing files.
- The generated project passes `composer validate` after the user runs `composer install`.
- The generated project starts and responds to `/api/health` with a 200 status after `composer install` and `php artisan serve`.
- Auth toggle generates a working Sanctum configuration that protects `/api/user` with token-based auth.
- OpenAPI toggle generates a working Scramble configuration that serves API docs at `/docs/api`.
- Offline generation succeeds using fallback versions with no errors or warnings.
- The Laravel option appears correctly in CLI prompts, Docker Compose, CI workflows, and project detection.

---

## Key Entities

- **LaravelGenerator**: The generator class responsible for scaffolding the Laravel backend inside `backend/`.
- **BackendType**: Extended union type: `"spring-boot" | "fastapi" | "laravel" | null`.
- **Sanctum**: Laravel's official API token authentication package (optional toggle).
- **Scramble**: Auto-generated OpenAPI documentation for Laravel (optional toggle).
- **FALLBACK_VERSIONS**: Extended with `laravel`, `sanctum`, `scramble` default versions.
