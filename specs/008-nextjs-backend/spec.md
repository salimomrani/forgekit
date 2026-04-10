# Feature Specification: Next.js Backend Generator

**Feature Branch**: `008-nextjs-backend`  
**Created**: 2026-04-11  
**Status**: Draft  
**Input**: Ajouter Next.js comme 4e option de backend dans ForgeKit CLI. Mode API-only (App Router Route Handlers uniquement, pas de pages React). Features optionnelles : Auth (NextAuth.js v5), ORM (Prisma), OpenAPI (next-swagger-doc). PostgreSQL pour docker-compose. Compatible avec Angular/React en frontend séparé.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate a Next.js API Backend (Priority: P1)

A developer runs `forgekit new my-api` and selects Next.js as the backend type. They receive a ready-to-run Next.js project structured as a pure API server with Route Handlers in the App Router, a health check endpoint, and a Dockerfile ready for containerized deployment.

**Why this priority**: Core feature — without this story, nothing else is possible.

**Independent Test**: Run `forgekit new my-api`, choose Next.js backend, verify the `backend/` directory contains a working Next.js API project with at least one working endpoint.

**Acceptance Scenarios**:

1. **Given** a developer runs `forgekit new`, **When** they select "Next.js" as backend, **Then** a `backend/` directory is generated with `package.json`, `next.config.ts`, `tsconfig.json`, `.env.example`, `Dockerfile`, and `app/api/health/route.ts`.
2. **Given** the generated project, **When** `npm install && npm run build` is run in `backend/`, **Then** the build succeeds with no errors.
3. **Given** the generated project, **When** the app is started, **Then** `GET /api/health` returns a JSON response with status 200.

---

### User Story 2 - Optional Prisma ORM Integration (Priority: P2)

A developer generating a Next.js backend chooses to include Prisma ORM. The generated project contains a Prisma schema connected to PostgreSQL, a singleton client, and a `.env.example` with a `DATABASE_URL` placeholder.

**Why this priority**: Prisma is the most common data-access choice for Next.js; it unblocks persistence without manual wiring.

**Independent Test**: Generate with Prisma enabled, verify `prisma/schema.prisma`, `lib/prisma.ts`, and `DATABASE_URL` in `.env.example` are present and syntactically valid.

**Acceptance Scenarios**:

1. **Given** a developer selects Next.js + Prisma, **When** generation completes, **Then** `prisma/schema.prisma` (with PostgreSQL datasource), `lib/prisma.ts` (singleton client), and `DATABASE_URL` in `.env.example` are generated.
2. **Given** the generated project with Prisma, **When** `npm install` is run, **Then** `prisma generate` runs without error.
3. **Given** a developer selects Next.js without Prisma, **Then** no Prisma files are generated.

---

### User Story 3 - Optional NextAuth.js v5 Authentication (Priority: P2)

A developer selects Auth (NextAuth.js v5) during generation. The generated project includes the NextAuth configuration file and the catch-all API route handler, ready to be wired to a provider.

**Why this priority**: Authentication is frequently the first layer developers add; scaffolding it avoids boilerplate and common mis-wiring.

**Independent Test**: Generate with auth enabled, verify `auth.ts`, `lib/auth.ts`, and `app/api/auth/[...nextauth]/route.ts` are present and importable.

**Acceptance Scenarios**:

1. **Given** a developer selects Next.js + Auth, **When** generation completes, **Then** `auth.ts`, `lib/auth.ts`, and `app/api/auth/[...nextauth]/route.ts` are generated with the correct NextAuth v5 boilerplate.
2. **Given** the generated project with auth, **When** `npm install && npm run build` is run, **Then** the build succeeds.
3. **Given** a developer selects Next.js without auth, **Then** no auth files are generated.

---

### User Story 4 - Optional OpenAPI Documentation (Priority: P3)

A developer selects OpenAPI during generation. The generated project includes an `/api/docs` route that serves a Swagger UI, and an `/api/openapi.json` endpoint with a base OpenAPI schema.

**Why this priority**: Useful for teams relying on API contracts, but not required for an MVP backend.

**Independent Test**: Generate with OpenAPI enabled, verify the swagger route and schema file are present and the project builds.

**Acceptance Scenarios**:

1. **Given** a developer selects Next.js + OpenAPI, **When** generation completes, **Then** an OpenAPI route and Swagger UI endpoint are generated.
2. **Given** the generated project with OpenAPI, **When** `npm run build` is run, **Then** the build succeeds.
3. **Given** a developer selects Next.js without OpenAPI, **Then** no OpenAPI files are generated.

---

### User Story 5 - Combined Stack: Next.js Backend + Angular Frontend (Priority: P2)

A developer generates a project with Next.js as backend and Angular as a separate frontend. Both layers are generated independently; the docker-compose includes the Next.js API service and PostgreSQL, CI includes both a Node.js backend job and an Angular frontend job.

**Why this priority**: Validates that the "API-only" mode is truly compatible with an independent frontend — core claim of the feature.

**Independent Test**: Generate with Next.js backend and Angular frontend, verify both `backend/` and `frontend/` are generated, docker-compose includes an `api` service, and CI has both jobs.

**Acceptance Scenarios**:

1. **Given** a developer selects Next.js + Angular, **When** generation completes, **Then** `backend/` and `frontend/` directories exist independently with no shared code.
2. **Given** the generated project, **When** the docker-compose is inspected, **Then** it contains an `api` service (Next.js on port 3000) and a `postgres` service.
3. **Given** the generated project, **When** the CI workflow is inspected, **Then** it contains a backend job (Node.js) and a frontend job (Angular), each triggered only when their own layer changes.

---

### Edge Cases

- What happens when a developer selects Next.js and React Vite as frontend? Both layers use Node.js but remain independent — no conflict expected.
- What happens if both Prisma and auth are selected? The `.env.example` must contain both `DATABASE_URL` and `AUTH_SECRET` without duplication.
- What happens when the npm registry is unreachable during version resolution? The fallback hardcoded versions must be used silently.
- What happens when `forgekit add nextjs` is run on a project that already has a backend configured? The conflict group must reject the addition with a clear error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The CLI MUST offer "Next.js (Node.js)" as a selectable backend option alongside Spring Boot, FastAPI, and Laravel.
- **FR-002**: The generator MUST produce a `backend/` directory containing a Next.js project configured as an API-only server (no pages, no React UI components).
- **FR-003**: The generated Next.js project MUST include a working health check endpoint at `GET /api/health` returning `{ status: "ok" }`.
- **FR-004**: The generated project MUST build successfully (`npm run build`) without manual edits.
- **FR-005**: When Prisma is selected, the generator MUST produce `prisma/schema.prisma` (PostgreSQL datasource), `lib/prisma.ts` (singleton client), and `DATABASE_URL` in `.env.example`.
- **FR-006**: When Auth is selected, the generator MUST produce an Auth.js v5 configuration (`auth.ts`, `lib/auth.ts`) and the catch-all route handler `app/api/auth/[...nextauth]/route.ts`.
- **FR-007**: When OpenAPI is selected, the generator MUST produce an endpoint serving an OpenAPI schema and a Swagger UI.
- **FR-008**: The generator MUST produce a `Dockerfile` using a multi-stage build suitable for containerized deployment.
- **FR-009**: When Docker is enabled, the docker-compose MUST include a `postgres` service and an `api` service pointing to `./backend`.
- **FR-010**: When CI is enabled, the CI workflow MUST include a backend job that runs the Next.js build and linting, triggered only on changes to `backend/`.
- **FR-011**: The `forgekit add nextjs` command MUST work on existing projects and reject the addition if another backend is already configured.
- **FR-012**: Version resolution for Next.js packages MUST fall back to hardcoded versions silently if the npm registry is unreachable.
- **FR-013**: The Next.js backend MUST be compatible with Angular and React Vite as independent frontends — no shared code generation between layers.

### Key Entities

- **NextJsGenerator**: Generates the `backend/` directory for a Next.js API-only project. Receives project configuration and resolved package versions.
- **ProjectConfig (extended)**: Gains a `prisma` feature flag used by the Next.js generator to conditionally generate ORM files.
- **ResolvedVersions (extended)**: Gains Next.js, NextAuth, and Prisma version fields resolved from the package registry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can generate a working Next.js API project end-to-end in under 60 seconds (including prompt answering).
- **SC-002**: The generated project builds without errors on a fresh machine with Node.js ≥ 20, with no manual changes required.
- **SC-003**: All 13 functional requirements have corresponding passing automated tests (unit + e2e).
- **SC-004**: Selecting Next.js + Angular + Docker + CI generates all four layers with no build errors across any layer.
- **SC-005**: Running `forgekit add nextjs` on a project with an existing backend exits with a clear error message and makes no changes to the project.

## Assumptions

- Next.js is used in "API-only" mode: the generated `backend/` contains no pages, layouts, or React UI components.
- PostgreSQL is the assumed database when Prisma is selected, consistent with all other ForgeKit backends.
- The NextAuth.js v5 scaffold uses a credentials provider as the simplest default; the developer is expected to swap it for their chosen provider.
- OpenAPI documentation is implemented via `next-swagger-doc` + `swagger-ui-react`.
- The `prisma` feature flag is added globally to `ProjectConfig` but is only consumed by the Next.js generator for now.
