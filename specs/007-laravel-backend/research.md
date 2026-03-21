# Research: Laravel Backend

## Decision 1: Packagist API for version fetching

**Decision**: Use `https://repo.packagist.org/p2/{vendor}/{package}.json` to fetch latest stable versions for Laravel, Sanctum, and Scramble.

**Rationale**: The Packagist p2 API is public, unauthenticated, and returns a JSON object with all versions. We filter for the latest stable (non-dev, non-RC) version. This follows the same pattern as Maven Central for Spring Boot and npm registry for frontend packages.

**Alternatives considered**:
- GitHub Releases API — rejected: requires auth for rate limiting, not all packages mirror releases there.
- Hardcoded versions only — rejected: inconsistent with how Spring Boot and frontend versions are resolved.

---

## Decision 2: Laravel directory structure — API-only mode

**Decision**: Generate a minimal Laravel 12 structure matching what `laravel new --api` would produce, but via Handlebars templates with no `composer` execution.

**Rationale**: Laravel's API-only mode strips web routes, Blade, sessions, and CSRF middleware. The generated structure includes only what's needed for a REST API: `routes/api.php`, `app/Http/Controllers/`, `app/Models/`, `config/`, `database/`, `tests/`. The `bootstrap/app.php` file uses `withRouting(api: __DIR__.'/../routes/api.php')` with no web routes.

**Key structural decisions**:
- No `resources/views/` — no Blade templates
- No `routes/web.php` — API-only
- `bootstrap/app.php` configures API middleware stack only
- CORS is configured via `config/cors.php` (always included)
- `storage/` directories are created with `.gitignore` files to preserve structure in git

---

## Decision 3: Docker service for Laravel

**Decision**: Use `php artisan serve` in a simple PHP container for dev Docker setup. Not PHP-FPM + Nginx.

**Rationale**: The Docker generator is for local development, not production. `php artisan serve` is simpler, requires no Nginx config, and matches the dev workflow pattern. Spring Boot uses an embedded server (no reverse proxy in dev), FastAPI uses uvicorn directly. Laravel should follow the same simplicity principle.

**Docker service config**:
```yaml
api:
  build: ./backend
  container_name: {name}_api
  restart: unless-stopped
  ports:
    - "8000:8000"
  environment:
    DB_CONNECTION: pgsql
    DB_HOST: postgres
    DB_PORT: 5432
    DB_DATABASE: {dbName}
    DB_USERNAME: postgres
    DB_PASSWORD: postgres
  depends_on:
    postgres:
      condition: service_healthy
```

**Alternatives considered**:
- PHP-FPM + Nginx — rejected: over-engineered for dev; adds complexity with two containers + config.
- Laravel Sail — rejected: ForgeKit owns Docker generation, using Sail would create a parallel Docker setup.

---

## Decision 4: Dockerfile for Laravel

**Decision**: Use `php:8.3-cli` base image with Composer multi-stage install.

```dockerfile
FROM composer:2 AS deps
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --prefer-dist

FROM php:8.3-cli
RUN docker-php-ext-install pdo_pgsql
WORKDIR /app
COPY --from=deps /app/vendor vendor
COPY . .
EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
```

**Rationale**: Multi-stage keeps the image small. `php:8.3-cli` is sufficient for `artisan serve`. PostgreSQL extension (`pdo_pgsql`) is required for the DB connection.

---

## Decision 5: Fallback versions

**Decision**: Add these fallback versions to `FALLBACK_VERSIONS`:

| Package | Fallback | Key |
|---------|----------|-----|
| laravel/framework | 12.0.0 | `laravel` |
| laravel/sanctum | 4.0.0 | `sanctum` |
| dedoc/scramble | 0.12.0 | `scramble` |

**Rationale**: These are the latest stable versions as of March 2026. The fetcher will try Packagist first and fall back to these values.

---

## Decision 6: ProjectConfig changes — minimal impact

**Decision**: Add `"laravel"` to `BackendType`. Reuse existing `auth` and `openapi` boolean fields in `ProjectConfig` — no new fields needed.

**Rationale**: Laravel's auth toggle (Sanctum) maps to `config.auth` which already exists for Spring Boot. Laravel's openapi toggle (Scramble) maps to `config.openapi` which also exists. The `flyway` and `mapstruct` fields remain unused for Laravel (they keep their defaults, which is fine — they're already ignored for FastAPI).

**Impact**: Only `BackendType` union type changes. No new fields in `ProjectConfig`. No migration needed for `forgekit.json`.

---

## Decision 7: Sentinel for project detection

**Decision**: Use `backend/artisan` as the filesystem sentinel for Laravel detection.

**Rationale**: The `artisan` file is unique to Laravel projects — it's the CLI entry point and is always present. No other framework uses a file named `artisan` in `backend/`. This parallels `backend/pom.xml` (Spring Boot) and `backend/app/main.py` (FastAPI).
