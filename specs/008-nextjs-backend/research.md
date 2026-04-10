# Research: Next.js Backend Generator

**Date**: 2026-04-11  
**Feature**: 008-nextjs-backend

---

## Decision 1: Next.js API-Only Configuration

**Decision**: Use Next.js 15 App Router with `output: 'standalone'` in `next.config.ts`. No `pages/` directory. API routes live exclusively under `app/api/`.

**Rationale**: App Router Route Handlers are the idiomatic Next.js 15 way to define API endpoints. `output: 'standalone'` is required for Docker deployment (copies only necessary files). Omitting `pages/` and `app/page.tsx` keeps the project purely backend.

**Alternatives considered**:
- Pages Router (`pages/api/`): deprecated path, App Router is the current standard.
- Dedicated Node.js framework (Express, Fastify): defeats the purpose of using Next.js.

---

## Decision 2: NextAuth.js v5 (Auth.js) Scaffold

**Decision**: Use `next-auth@5` with a credentials provider as the default scaffold. Files: `auth.ts` (root config), `lib/auth.ts` (re-export for server), `app/api/auth/[...nextauth]/route.ts` (catch-all handler).

**Rationale**: Auth.js v5 is the current stable release. Credentials provider is the simplest scaffold requiring no external OAuth app setup; developers swap it for their provider of choice. The catch-all route is mandatory for Auth.js to handle all auth flows.

**Alternatives considered**:
- GitHub/Google OAuth provider as default: requires external app credentials at generation time — not viable for scaffolding.
- `next-auth@4`: legacy version, not maintained.

**Key env vars**: `AUTH_SECRET`, `NEXTAUTH_URL`

---

## Decision 3: Prisma ORM Scaffold

**Decision**: Generate `prisma/schema.prisma` with PostgreSQL datasource and a minimal `User` model, `lib/prisma.ts` singleton client, and `postinstall: "prisma generate"` in `package.json`.

**Rationale**: PostgreSQL is consistent with all other ForgeKit backends. The singleton pattern prevents connection pool exhaustion in Next.js dev mode (hot reload). `postinstall` ensures `prisma generate` runs after `npm install` on any machine.

**Alternatives considered**:
- Drizzle ORM: growing but less established in the Next.js ecosystem.
- Raw `pg` / `node-postgres`: no type safety, too low-level for scaffolding.

**Packages**: `prisma` (devDep), `@prisma/client` (dep)

---

## Decision 4: OpenAPI Documentation

**Decision**: Use `next-swagger-doc` + `swagger-ui-react`. Expose `/api/openapi.json` (raw spec) and `/api/docs` (Swagger UI page).

**Rationale**: `next-swagger-doc` reads JSDoc annotations from route handlers — zero schema duplication. `swagger-ui-react` renders the UI with a single import.

**Alternatives considered**:
- `@asteasolutions/zod-to-openapi`: more robust but requires Zod throughout — too opinionated for a scaffold.
- Manual OpenAPI JSON: error-prone, no sync with code.

**Packages**: `next-swagger-doc`, `swagger-ui-react`

---

## Decision 5: Multi-Stage Dockerfile

**Decision**: 3-stage Dockerfile (deps → builder → runtime) using `node:22-alpine`. Builder uses `next build` with `output: 'standalone'`. Runtime copies only `.next/standalone` + static assets.

**Rationale**: Standalone output minimizes image size. Non-root user (`nextjs`) follows security best practices. Alpine base keeps the image small.

**Alternatives considered**:
- Single-stage: larger image, includes dev dependencies.
- Distroless: more complex, less tooling available.

---

## Decision 6: Package Versions (Fallbacks)

| Package | Fallback Version | Fetch Source |
|---------|-----------------|--------------|
| `next` | `15.3.0` | npm registry |
| `next-auth` | `5.0.0` | npm registry |
| `prisma` | `6.6.0` | npm registry |
| `@prisma/client` | `6.6.0` | npm registry |
| `next-swagger-doc` | `0.4.0` | npm registry (hardcoded, rarely changes) |
| `swagger-ui-react` | `5.21.0` | npm registry (hardcoded, rarely changes) |

**Note**: `react` and `react-dom` versions are already in `ResolvedVersions` (shared with React Vite frontend) — reused, not duplicated.

---

## Decision 7: Conflict with Frontend

**Decision**: Next.js backend (API-only) is fully compatible with Angular and React Vite as independent frontends. No shared code generation. The `backend/` directory is self-contained.

**Rationale**: Constitution rule 1 — each generator owns exactly one layer. The Next.js generator only writes to `backend/`. Angular/React generators only write to `frontend/`. No inter-generator dependencies.

**Edge case**: If a developer picks Next.js backend + React Vite frontend, both are generated independently. The developer is responsible for configuring cross-origin requests.
