# Feature Specification: NestJS Backend Generator

**Feature Branch**: `013-nestjs-backend`
**Created**: 2026-04-15
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Base NestJS scaffold (Priority: P1)

A developer runs `forgekit new my-api` and selects NestJS as the backend. ForgeKit generates a working NestJS project in `backend/` with a health endpoint, TypeScript config, and package.json — ready to `npm install && npm run start:dev`.

**Why this priority**: Core deliverable. All other stories depend on a valid base NestJS scaffold.

**Independent Test**: Running the generator with `backendType: "nestjs"` and all feature flags false produces a complete, compilable NestJS project with a `/health` endpoint.

**Acceptance Scenarios**:

1. **Given** a user selects NestJS with no optional features, **When** `forgekit new` completes, **Then** `backend/` contains `package.json`, `tsconfig.json`, `nest-cli.json`, `src/main.ts`, `src/app.module.ts`, and `src/health/health.controller.ts`.
2. **Given** the generated `package.json`, **When** inspected, **Then** it contains `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` with resolved versions.
3. **Given** a version resolution failure, **When** the generator runs, **Then** fallback versions are used silently and generation completes without error.

---

### User Story 2 — NestJS with JWT authentication (Priority: P2)

A developer selects the `auth` feature during `forgekit new`. The generated project includes a JWT guard, auth module, and Passport strategy wired into the app module.

**Why this priority**: Auth is the most commonly needed feature after the base scaffold.

**Independent Test**: With `auth: true`, `backend/src/auth/` contains all auth files and `package.json` includes `@nestjs/jwt` and `passport-jwt`.

**Acceptance Scenarios**:

1. **Given** `auth: true`, **When** the generator runs, **Then** `src/auth/auth.module.ts`, `src/auth/jwt.strategy.ts`, and `src/auth/jwt-auth.guard.ts` are created.
2. **Given** `auth: true`, **When** `package.json` is inspected, **Then** `@nestjs/jwt` and `passport-jwt` are present in dependencies.
3. **Given** `auth: false`, **When** the generator runs, **Then** no `src/auth/` directory exists and auth packages are absent from `package.json`.

---

### User Story 3 — NestJS with Prisma ORM (Priority: P2)

A developer selects the `prisma` feature. The generated project includes a `PrismaService`, `PrismaModule`, and `prisma/schema.prisma` configured for PostgreSQL.

**Why this priority**: Database access is critical for most backends; Prisma is the chosen ORM.

**Independent Test**: With `prisma: true`, `backend/prisma/schema.prisma` exists and `@prisma/client` appears in `package.json`.

**Acceptance Scenarios**:

1. **Given** `prisma: true`, **When** the generator runs, **Then** `src/prisma/prisma.service.ts`, `src/prisma/prisma.module.ts`, and `prisma/schema.prisma` are created.
2. **Given** `prisma: true`, **When** `package.json` is inspected, **Then** `@prisma/client` is in dependencies and `prisma` is in devDependencies.
3. **Given** `prisma: false`, **When** the generator runs, **Then** no Prisma files are generated.

---

### User Story 4 — NestJS with OpenAPI/Swagger (Priority: P3)

A developer selects the `openapi` feature. The generated project configures Swagger UI at `/api` in `main.ts`.

**Why this priority**: Useful but not blocking — project works without it.

**Independent Test**: With `openapi: true`, `src/main.ts` contains Swagger setup code and `package.json` includes `@nestjs/swagger`.

**Acceptance Scenarios**:

1. **Given** `openapi: true`, **When** `main.ts` is inspected, **Then** it imports `SwaggerModule` and `DocumentBuilder` and mounts the UI at `/api`.
2. **Given** `openapi: true`, **When** `package.json` is inspected, **Then** `@nestjs/swagger` is present in dependencies.
3. **Given** `openapi: false`, **When** `main.ts` is inspected, **Then** no Swagger setup code is present.

---

### User Story 5 — NestJS selection in the interactive CLI (Priority: P1)

A developer runs `forgekit new` interactively. NestJS appears as a backend option alongside Spring Boot, FastAPI, and Laravel. Feature checkboxes follow selection.

**Why this priority**: The CLI prompt is the primary user entry point.

**Independent Test**: Running `forgekit new` interactively presents NestJS as a backend choice, and selecting it shows feature checkboxes for auth, prisma, and openapi.

**Acceptance Scenarios**:

1. **Given** the backend selection prompt, **When** displayed, **Then** `NestJS (Node.js/TypeScript)` appears as a choice.
2. **Given** NestJS is selected, **When** feature checkboxes appear, **Then** options include JWT authentication, Prisma ORM, and OpenAPI/Swagger UI.
3. **Given** `forgekit new my-app --nestjs`, **When** executed, **Then** NestJS is pre-selected without interactive prompting.
4. **Given** NestJS generation completes, **When** the startup hint is displayed, **Then** it reads `cd backend && npm install && npm run start:dev`.

---

### Edge Cases

- Both `auth` and `prisma` enabled: both module directories are created independently; `app.module.ts` imports both.
- Network unavailable during version resolution: fallback versions are used; generator completes without error.
- NestJS backend combined with a frontend: generator only writes to `backend/`; `frontend/` is untouched.
- Any generation error mid-way: entire project directory is deleted (fail-fast rollback).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `BackendType` MUST include `"nestjs"` as a valid value.
- **FR-002**: `ResolvedVersions` MUST include `nestjs`, `nestjsJwt`, and `nestjsSwagger` version fields.
- **FR-003**: `FALLBACK_VERSIONS` MUST provide hardcoded defaults for `nestjs` (`11.0.0`), `nestjsJwt` (`11.0.0`), and `nestjsSwagger` (`11.2.0`).
- **FR-004**: Version resolution MUST fetch `@nestjs/core`, `@nestjs/jwt`, and `@nestjs/swagger` from npm when `backendType === "nestjs"`, with silent fallback on network failure.
- **FR-005**: The backend selection prompt MUST offer `NestJS (Node.js/TypeScript)` as a choice.
- **FR-006**: When NestJS is selected, the CLI MUST show feature checkboxes for JWT authentication (`auth`), Prisma ORM (`prisma`), and OpenAPI/Swagger UI (`openapi`).
- **FR-007**: The `new` command MUST accept `--nestjs` as a CLI flag that pre-selects NestJS.
- **FR-008**: The generator MUST produce all base NestJS files under `backend/` using resolved versions.
- **FR-009**: Auth files MUST only be generated when `auth: true`; Prisma files MUST only be generated when `prisma: true`; Swagger setup MUST only appear when `openapi: true`.
- **FR-010**: The `forgekit new` completion output MUST display `cd backend && npm install && npm run start:dev` as the startup hint for NestJS.
- **FR-011**: All independent file writes MUST be parallelized via `Promise.all()`.
- **FR-012**: Any generation error MUST trigger full rollback of the project directory.

### Key Entities

- **NestJsGenerator**: Generator class that receives project directory, config, and resolved versions, and produces all NestJS files under `backend/`.
- **NestJS template set**: Handlebars templates covering base scaffold, auth, prisma, and openapi concerns.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All unit tests in `nestjs.test.ts` pass with zero failures.
- **SC-002**: The full `npm run test:unit` suite passes after integration with zero regressions.
- **SC-003**: `npm run build` and `npm run lint` on the ForgeKit codebase produce zero errors.
- **SC-004**: A generated NestJS project (base only) starts without errors after `npm install && npm run start:dev`.
- **SC-005**: A generated project with all three feature flags enabled (`auth`, `prisma`, `openapi`) produces no TypeScript compilation errors.
- **SC-006**: Simulated network failure during version resolution results in graceful fallback — generation completes without throwing.
