# Feature Specification: Scaffold gaps fix (1.29.0 audit)

**Feature Branch**: `017-scaffold-gaps-fix`
**Created**: 2026-04-25
**Status**: Draft
**Input**: User description: "Fix structural gaps observed during a real ForgeKit 1.29.0 scaffold (`forgekit new --spring-boot --angular`), based on a verified 12-issue audit."

## Context

A real-world scaffold session against ForgeKit 1.29.0 surfaced 12 issues. Six were verified against the codebase and are in scope for this feature. Three were rejected as speculative abstractions per Constitution rule #6 and are out of scope:

- Default JSON-logs encoder for backends (rejected — opt-in only if added later).
- Default correlation-ID filter + interceptor (rejected — same reason).
- Spring Security marker dependency "for later" (rejected — `--auth` already adds it when actually needed).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Default scaffold installs without manual fixes (Priority: P1)

A developer scaffolds a new full-stack project with the most common combination (`forgekit new <name> --spring-boot --angular`) and expects `npm install` and `mvn install` to succeed on the generated project, today, without editing any file. Currently, both fail because the Angular CLI version is pinned to a non-existent npm release and TypeScript is pinned to a major incompatible with the Angular build peer range.

**Why this priority**: This is the most common entry point into the tool. If the default `new` command produces a project that does not install, the tool is broken from the user's first attempt.

**Independent Test**: Run `forgekit new demo --spring-boot --angular` against a clean directory in CI, then run `npm install` in `demo/frontend` and `mvn -DskipTests install` in `demo/backend`. Both must exit 0.

**Acceptance Scenarios**:

1. **Given** a clean working directory with network access, **When** the user runs `forgekit new demo --spring-boot --angular`, **Then** every dependency in the generated `frontend/package.json` resolves to a real published version on npm.
2. **Given** the same project, **When** the user runs `npm install` inside `frontend/`, **Then** the install exits 0 with no `ETARGET` and no `ERESOLVE` errors.
3. **Given** the same project, **When** the user runs `mvn -DskipTests install` inside `backend/`, **Then** Maven resolves all declared dependencies and the build exits 0.
4. **Given** a temporarily unreachable npm registry, **When** ForgeKit cannot fetch the latest published versions, **Then** generation still succeeds using fallback versions and the produced `package.json` still installs against npm later.

---

### User Story 2 — `--ui none` produces a project that builds and looks correct (Priority: P1)

A developer who does not want the PrimeNG component library expects `forgekit add angular --ui none` to produce a frontend that:
- Does not require any PrimeNG, primeicons, or primeflex packages to be installed.
- Builds with `ng build` exit 0.
- Renders with neutral, working styles — no broken color palette caused by undefined CSS variables.

Currently the generator emits PrimeNG stylesheet entries in `angular.json` and `--p-*` CSS tokens in component templates regardless of UI choice. With `--ui none`, the build fails on missing modules; if the user removes those entries manually, components silently render with undefined colors.

**Why this priority**: The flag is documented and offered to users. A flag whose output silently breaks visuals is worse than no flag at all.

**Independent Test**: Run `forgekit add angular --ui none` in a fresh project, then run `npm install && ng build` inside `frontend/`. Build must exit 0. Inspect rendered components in a browser — no missing/black/white-on-white text.

**Acceptance Scenarios**:

1. **Given** the user passes `--ui none`, **When** the project is generated, **Then** `angular.json` `styles[]` contains only `src/styles.scss`.
2. **Given** the user passes `--ui none`, **When** the project is generated, **Then** no component template references `--p-*` CSS custom properties.
3. **Given** the user passes `--ui primeng` (or default), **When** the project is generated, **Then** PrimeNG-related stylesheet entries and tokens are present and functional, exactly as before this feature.

---

### User Story 3 — Backend without a database boots cleanly (Priority: P1)

A developer scaffolding a backend that does not need a database (e.g., a thin proxy, a stateless API gateway, a quick prototype) expects to be able to opt out of all database-layer dependencies, not just the migration tool. Currently `--no-flyway` removes Flyway but keeps JPA + the Postgres driver, which causes Spring Boot to try to connect to a non-existent local database at startup and crash.

**Why this priority**: Users who don't want a database have no path to a running app today.

**Independent Test**: Run `forgekit add spring-boot --database none` in a fresh project, then run `./mvnw spring-boot:run` inside `backend/`. The application must start (HTTP up on the configured port) without a running database.

**Acceptance Scenarios**:

1. **Given** the user passes `--database none`, **When** the project is generated, **Then** `pom.xml` contains no JPA starter, no Postgres driver, and no Flyway dependencies.
2. **Given** the user passes `--database none`, **When** the project is generated, **Then** `application.yml` (or equivalent) contains no `spring.datasource` or `spring.flyway` configuration.
3. **Given** the user passes `--database none`, **When** the developer runs `./mvnw spring-boot:run`, **Then** the application starts and responds on the configured port without any database running on the host.
4. **Given** the user does not pass `--database` (default), **When** the project is generated, **Then** the output is identical to today — JPA + Postgres driver + Flyway included.

---

### User Story 4 — Non-interactive callers (CI, agents) get predictable output (Priority: P2)

A CI pipeline, an AI agent, or a developer running through a pipe (`yes | forgekit add angular ...`) expects to be able to drive the CLI without any interactive prompt. Today, `forgekit add` always asks confirmation questions, and when stdin is piped, every prompt is auto-answered "y" — including "include authentication?", which silently turns auth on against intent.

**Why this priority**: Important for the tool's usability in automation but does not block the happy interactive path. Existing scripts can work around it with patches; new ones cannot use the tool reliably.

**Independent Test**: From a non-TTY shell, run `yes | forgekit add angular --no-auth` and confirm the produced project contains no auth-related files. Run `forgekit add angular --yes` from a TTY and confirm no prompt is shown.

**Acceptance Scenarios**:

1. **Given** the user passes `--no-auth`, **When** the project is generated, **Then** auth-related files (guards, services, login pages) are not emitted regardless of any other input.
2. **Given** stdin is not a TTY and no relevant flag is passed, **When** the CLI runs, **Then** all interactive prompts are skipped and configuration defaults are applied.
3. **Given** the user passes `--yes` from a TTY, **When** the CLI runs, **Then** no confirmation prompt is shown and defaults are applied for unspecified options.

---

### User Story 5 — `ng test` works on a fresh project (Priority: P2)

A developer expects `npm test` to run without errors on a freshly scaffolded Angular project. Currently `package.json` declares `"test": "ng test"`, but `angular.json` has no `test` target — the command fails with `Project does not have a 'test' target`.

**Why this priority**: Doesn't break the happy path of building/serving, but is the second action most users take after scaffolding.

**Independent Test**: Run `forgekit add angular` in a fresh project, then `npm install && npm test` inside `frontend/`. Test runner must exit 0 with at least one passing spec.

**Acceptance Scenarios**:

1. **Given** a freshly scaffolded Angular project, **When** the developer runs `npm test`, **Then** the test runner starts, executes at least one passing spec, and exits 0.
2. **Given** a freshly scaffolded Angular project, **When** the developer inspects the generated files, **Then** the project ships exactly one minimal sample spec — not a full test suite.

---

### User Story 6 — Cross-layer dev-server proxy works out of the box (Priority: P3)

A developer scaffolding both a backend and an Angular frontend expects to be able to run `ng serve` and have requests to `/api/...` reach the backend without manual CORS configuration or proxy wiring. Today no proxy file is emitted; the frontend hits `http://localhost:4200/api/...` and 404s.

**Why this priority**: Affects only the dual-layer combination and only the dev-time experience. Production builds are unaffected.

**Independent Test**: Run `forgekit new demo --spring-boot --angular`, start the backend, then run `ng serve` from `frontend/`, then `curl http://localhost:4200/api/...`. The request must reach the backend without CORS errors.

**Acceptance Scenarios**:

1. **Given** both a backend and an Angular frontend are scaffolded, **When** the project is generated, **Then** `frontend/proxy.conf.json` exists and routes `/api/**` to the matching backend port.
2. **Given** the same project, **When** the developer inspects `angular.json`, **Then** `serve.options.proxyConfig` references the generated proxy file.
3. **Given** only an Angular frontend is scaffolded (no backend), **When** the project is generated, **Then** no proxy file is emitted and `angular.json` is unchanged from today.

---

### Edge Cases

- **Network failure during version resolution**: ForgeKit must fall back silently to `FALLBACK_VERSIONS`, and the produced `package.json` must still install successfully against the live npm registry once it is reachable.
- **TypeScript releases a new major (e.g. 6.x) before Angular bumps its peer range**: ForgeKit must continue to pin TypeScript inside the supported range without manual intervention.
- **`@angular/cli` lags behind `@angular/core` (asymmetric publishing)**: ForgeKit must not pin them to the same version expression.
- **Existing project regenerated with `--database none` after originally being scaffolded with a database**: out of scope (regeneration semantics are not part of this feature).
- **User specifies `--ui none` but also passes a UI-specific flag (e.g. `--theme dark`)**: out of scope (no such flag exists today).
- **Non-TTY environment with no flags at all**: prompts are skipped, defaults are used. Output must remain deterministic across runs.

## Requirements *(mandatory)*

### Functional Requirements

#### FR-1 — Version resolution (covers audit #1, #2)

- **FR-1.1**: ForgeKit MUST resolve `@angular/cli` independently from `@angular/core` and pin the generated `frontend/package.json` to a published `@angular/cli` version.
- **FR-1.2**: ForgeKit MUST pin TypeScript to a range compatible with the `@angular/build` peer-dependency declaration of the version it ships.
- **FR-1.3**: ForgeKit MUST keep the existing silent-fallback behavior on network failure: when version resolution cannot reach the registry, generation succeeds using the bundled fallback values.

#### FR-2 — UI-aware Angular output (covers audit #3, #4)

- **FR-2.1**: When `ui=none`, the generated `angular.json` `styles[]` array MUST contain only the project's own stylesheet entry — no PrimeNG, primeicons, or primeflex references.
- **FR-2.2**: When `ui=none`, no generated component template MAY emit references to `--p-*` CSS custom properties.
- **FR-2.3**: When `ui=primeng` (or the default), generated output MUST be functionally identical to the pre-feature output — same packages, same styles, same tokens.

#### FR-3 — Database opt-out (covers audit #5)

- **FR-3.1**: ForgeKit MUST expose a project-level configuration field that lets the user opt out of the entire database layer for Spring Boot backends. Allowed values: a default ("postgres") and an opt-out value ("none").
- **FR-3.2**: When the database is opted out, the generated `pom.xml` MUST NOT include the JPA starter, the Postgres driver, or Flyway.
- **FR-3.3**: When the database is opted out, the generated application configuration MUST NOT contain datasource or migration settings.
- **FR-3.4**: When the user opts out of the database, opting in to Flyway MUST be impossible (the migration tool requires a database).
- **FR-3.5**: Default behavior (no flag) MUST match the pre-feature output exactly.

#### FR-4 — Non-interactive UX (covers audit #7, #8)

- **FR-4.1**: ForgeKit MUST accept a `--no-auth` flag on every command that today accepts `--auth`, and the negation MUST suppress the auth-inclusion prompt and produce a project without auth scaffolding.
- **FR-4.2**: ForgeKit MUST accept a `--yes` (alias `-y`) flag that suppresses every confirmation prompt and applies configured defaults to optional questions.
- **FR-4.3**: When stdin is not a TTY, ForgeKit MUST behave as if `--yes` was passed — no interactive prompts, defaults applied.
- **FR-4.4**: When stdin is a TTY and no `--yes` is passed, the existing interactive flow MUST be preserved unchanged.

#### FR-5 — Angular `test` target (covers audit #11)

- **FR-5.1**: A freshly scaffolded Angular project MUST contain a working `test` target that, combined with the project's existing `npm test` script, exits 0 when run from a clean install.
- **FR-5.2**: ForgeKit MUST ship exactly one minimal sample spec — enough to make the runner exit 0, not enough to be considered a test suite (Constitution rule #6).

#### FR-6 — Cross-layer dev-server proxy (covers audit #6)

- **FR-6.1**: When the project includes both a backend and an Angular frontend, the generated `frontend/proxy.conf.json` MUST route requests under `/api/**` to the host and port of the scaffolded backend.
- **FR-6.2**: The Angular generator MUST NOT write outside its own output directory; the proxy file lives under `frontend/` and is referenced from `frontend/angular.json`.
- **FR-6.3**: When no backend is scaffolded, ForgeKit MUST NOT emit a proxy file, and `angular.json` MUST remain unchanged from today.

### Key Entities

- **ProjectConfig**: the single source of truth carried top-down through every generator (Constitution rule #3). Gains one new field (`database`) for FR-3 and continues to carry `backendType`, `frontend`, `ui`, `auth`, etc., used by FR-2 / FR-4 / FR-6.
- **Resolved versions**: gains one new field (`angularCli`) for FR-1.1; the TypeScript field gains a frontend-aware cap for FR-1.2.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A default `forgekit new <name> --spring-boot --angular` produces a project where both `npm install` (in `frontend/`) and `mvn -DskipTests install` (in `backend/`) exit 0 on a fresh machine — measured by an end-to-end smoke run on CI.
- **SC-002**: `forgekit add angular --ui none` followed by `npm install && ng build` exits 0 with zero PrimeNG packages installed — measured by inspecting the lockfile + a clean `ng build` run.
- **SC-003**: `forgekit add spring-boot --database none` produces a backend that starts via `./mvnw spring-boot:run` with no database server running on the host — measured by an HTTP probe against the configured port within 60 seconds of startup.
- **SC-004**: A non-TTY invocation (`yes | forgekit add angular --no-auth`) completes without writing any auth-related file — measured by a directory-listing assertion in CI.
- **SC-005**: `npm test` on a freshly scaffolded Angular project exits 0 with at least one passing spec — measured by parsing the runner exit code.
- **SC-006**: A request to `http://localhost:4200/api/health` reaches the running backend in a default `forgekit new <name> --spring-boot --angular` setup, with no manual configuration — measured by an end-to-end probe in dev mode.
- **SC-007**: The full existing test suite (Vitest unit + e2e) keeps passing after this feature is merged, with new unit tests covering each of the six in-scope fixes.

## Assumptions

- The current `package.json.hbs` reuse of `versions.angular` for `@angular/cli` is the simplest existing mechanism to fix and replace; introducing a separate field is consistent with the project's existing per-package version-resolution pattern.
- The existing vite-version cap pattern in `src/versions.ts` is the precedent to mirror for the TypeScript cap.
- The existing `LAYER_CONFIG_MAP` / `runLayerGenerator` plumbing is the canonical extension point for adding the `database` field to `ProjectConfig`, per the project's own auto-memory checklist.
- The Angular generator can read `config.backendType` (already in `ProjectConfig`) without violating Constitution rule #1, because it writes only inside its own output directory.
- The existing `--auth` flag on Commander does not auto-generate a `--no-auth` negation; it must be declared explicitly.

## Out of scope

- Default structured (JSON) logs in Spring Boot output — speculative per Constitution rule #6.
- Default correlation-ID propagation primitive (backend filter + frontend interceptor) — speculative per Constitution rule #6.
- Spring Security "marker" dependency added by default for projects that intend to add auth later — speculative per Constitution rule #6.
- Regenerating an existing project with a different `--database` value (semantics of regeneration are not part of this feature).
- Supporting databases other than Postgres in the new `database` field (only "postgres" and "none" are exposed in this iteration).
