# Tasks: Next.js Backend Generator

**Input**: Design documents from `specs/008-nextjs-backend/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Included — TDD approach per ForgeKit convention (RED → GREEN → REFACTOR via Vitest).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in all descriptions

---

## Phase 1: Setup

**Purpose**: Extend type system and version resolver — foundational for all user stories.

- [x] T001 Add `"nextjs"` to `BackendType` union and `prisma: boolean` to `ProjectConfig` in `src/types.ts`
- [x] T002 Add `next`, `nextAuth`, `prismaClient` fields to `ResolvedVersions` interface, `FALLBACK_VERSIONS` object, and conditional `Promise.all()` fetch block (when `backendType === "nextjs"`) in `src/versions.ts`
- [x] T003 [P] Add `prisma: false` to every `ProjectConfig` fixture object — grep `prettier: false` to find all ~9 fixture files across `src/__tests__/` and `src/generators/*/` test directories

**Checkpoint**: `npm run build` must succeed before proceeding. All existing tests must still pass.

---

## Phase 2: Foundational (CLI Entry Points)

**Purpose**: Wire Next.js into the CLI prompts and command dispatcher. Blocks all user story phases.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Add `{ name: "Next.js (Node.js)", value: "nextjs" }` to the backend `select()` choices in `src/prompts/project.ts`
- [x] T005 Add feature prompt block for Next.js in `src/prompts/project.ts`: `checkbox` with choices `auth`, `prisma`, `openapi` — only shown when `backendType === "nextjs"`
- [x] T006 Add `"nextjs": { configField: "backendType", configValue: "nextjs", conflictGroup: "backend" }` to `LAYER_CONFIG_MAP` in `src/commands/add.ts`
- [x] T007 Add `import { generateNextJsBackend } from "../generators/nextjs/index.js";` at top of `src/commands/add.ts`, then add `case "nextjs": await generateNextJsBackend(projectDir, config, versions); break;` to `runLayerGenerator()` switch

- [x] T007b [P] Verify `LAYER_CONFIG_MAP` entry in `src/commands/add.ts` has `conflictGroup: "backend"` by adding a test case in the existing `add-command.test.ts` (or equivalent): assert that adding `"nextjs"` to a project already having `backendType !== null` exits with an error and makes no changes

**Checkpoint**: Foundation ready — `npm run build` passes, Next.js appears as a CLI option, conflict rejection is tested.

---

## Phase 3: User Story 1 — Core Next.js API Generator (Priority: P1) 🎯 MVP

**Goal**: Generate a working Next.js API-only project in `backend/` with a health check endpoint, Dockerfile, and valid `npm run build`.

**Independent Test**: `forgekit new test-api` → select Next.js → `cd test-api/backend && npm install && npm run build` succeeds → `GET /api/health` returns `{"status":"ok"}`.

### Templates — US1 base (parallelizable)

- [x] T008 [P] [US1] Create `src/templates/nextjs/package.json.hbs` — template receives pre-computed flat arrays `dependencies` and `devDependencies` (built by generator based on feature flags); NO `{{#if}}` blocks in JSON body to avoid trailing-comma issues; scripts: `dev`, `build`, `start`, `lint`, plus `postinstall` and `db:migrate` entries passed as a pre-computed `scripts` object from the generator
- [x] T009 [P] [US1] Create `src/templates/nextjs/next.config.ts.hbs` — `output: 'standalone'`, no pages config needed
- [x] T010 [P] [US1] Create `src/templates/nextjs/tsconfig.json.hbs` — standard Next.js 15 tsconfig with `"moduleResolution": "bundler"`, `"paths": { "@/*": ["./*"] }`
- [x] T011 [P] [US1] Create `src/templates/nextjs/.env.example.hbs` — `NODE_ENV=development`; `{{#if prisma}}DATABASE_URL={{/if}}`; `{{#if auth}}AUTH_SECRET= \nNEXTAUTH_URL=http://localhost:3000{{/if}}`
- [x] T012 [P] [US1] Create `src/templates/nextjs/Dockerfile.hbs` — 3-stage (`deps` → `builder` → `runtime`) using `node:22-alpine`; copies `.next/standalone` in runtime stage; non-root `nextjs` user; `EXPOSE 3000`
- [x] T013 [P] [US1] Create `src/templates/nextjs/app/api/health/route.ts.hbs` — `export async function GET() { return Response.json({ status: "ok" }); }`

### Generator — US1

- [x] T014 [US1] Create `src/generators/nextjs/index.ts` — `NextJsGenerator extends BaseGenerator` taking `versions: ResolvedVersions`; US1 scope: ensure dirs (`app/api/health`), render all US1 templates; export `generateNextJsBackend(projectDir, config, versions)`
- [x] T015 [US1] Import `generateNextJsBackend` in `src/commands/new.ts` and add dispatch block: `if (config.backendType === "nextjs") { ... }` with chalk progress + success message showing `versions.next`

### Tests — US1

- [x] T016 [US1] Create `src/generators/nextjs/__tests__/nextjs.test.ts` — unit tests: (a) base directory structure created, (b) all 6 base files exist (`package.json`, `next.config.ts`, `tsconfig.json`, `.env.example`, `Dockerfile`, `app/api/health/route.ts`), (c) health route contains `status: "ok"`, (d) no Prisma/auth files when flags are false
- [x] T017 [US1] Add e2e scenario to `src/__tests__/e2e.test.ts`: Next.js backend only — verify 6 expected files exist and `package.json` contains `"next"`

**Checkpoint**: `npm run test:unit` passes for nextjs generator. US1 independently deliverable.

---

## Phase 4: User Story 2 — Prisma ORM (Priority: P2)

**Goal**: When `prisma: true`, generate `prisma/schema.prisma`, `lib/prisma.ts`, and `DATABASE_URL` in `.env.example`.

**Independent Test**: Generate with `prisma: true` → verify `prisma/schema.prisma` exists with `provider = "postgresql"`, `lib/prisma.ts` exists with singleton pattern, `DATABASE_URL` in `.env.example`.

### Templates — US2 (parallelizable)

- [x] T018 [P] [US2] Create `src/templates/nextjs/lib/prisma.ts.hbs` — `globalThis` singleton PrismaClient pattern; `log: ['query', 'error', 'warn']` in development
- [x] T019 [P] [US2] Create `src/templates/nextjs/prisma/schema.prisma.hbs` — `datasource db { provider = "postgresql", url = env("DATABASE_URL") }`; minimal `User` model with `id`, `email`, `name?`, `createdAt`, `updatedAt`

### Generator + Prompt — US2

- [x] T020 [US2] Update `src/generators/nextjs/index.ts` — add Prisma conditional block: when `config.prisma`, ensure `lib/` and `prisma/` dirs, render `lib/prisma.ts.hbs` and `prisma/schema.prisma.hbs`

### Tests — US2

- [x] T021 [US2] Update `src/generators/nextjs/__tests__/nextjs.test.ts` — add tests: (a) Prisma files generated when `prisma: true`, (b) no Prisma files when `prisma: false`, (c) `DATABASE_URL` present in `.env.example` when `prisma: true`

**Checkpoint**: Prisma files generated correctly. US2 independently testable with `prisma: true` config.

---

## Phase 5: User Story 3 — NextAuth.js v5 Authentication (Priority: P2)

**Goal**: When `auth: true`, generate `auth.ts`, `lib/auth.ts`, and `app/api/auth/[...nextauth]/route.ts`.

**Independent Test**: Generate with `auth: true` → verify all 3 auth files exist; `npm run build` succeeds; `AUTH_SECRET` in `.env.example`.

### Templates — US3 (parallelizable)

- [x] T022 [P] [US3] Create `src/templates/nextjs/auth.ts.hbs` — NextAuth v5 config with credentials provider scaffold; exports `{ handlers, auth, signIn, signOut }`
- [x] T023 [P] [US3] Create `src/templates/nextjs/lib/auth.ts.hbs` — re-export `auth` from `"../../auth"` for server-side use
- [x] T024 [P] [US3] Create `src/templates/nextjs/app/api/auth/[...nextauth]/route.ts.hbs` — `import { handlers } from "@/auth"; export const { GET, POST } = handlers;`

### Generator — US3

- [x] T025 [US3] Update `src/generators/nextjs/index.ts` — add auth conditional: when `config.auth`, ensure `lib/` and `app/api/auth/[...nextauth]/` dirs, render the 3 auth templates

### Tests — US3

- [x] T026 [US3] Update `src/generators/nextjs/__tests__/nextjs.test.ts` — add tests: (a) all 3 auth files generated when `auth: true`, (b) no auth files when `auth: false`, (c) `AUTH_SECRET` in `.env.example` when `auth: true`

**Checkpoint**: Auth scaffold generated correctly. US3 independently testable with `auth: true` config.

---

## Phase 6: User Story 4 — OpenAPI Documentation (Priority: P3)

**Goal**: When `openapi: true`, generate `/api/openapi.json` and `/api/docs` endpoints.

**Independent Test**: Generate with `openapi: true` → verify 2 route files exist; `npm run build` succeeds.

### Templates — US4 (parallelizable)

- [x] T027 [P] [US4] Create `src/templates/nextjs/app/api/openapi.json/route.ts.hbs` — uses `next-swagger-doc` `createSwaggerSpec`; returns `NextResponse.json(spec)`; includes API title from `{{name}}`
- [x] T028 [P] [US4] Create `src/templates/nextjs/app/api/docs/route.tsx.hbs` — server component rendering `swagger-ui-react` `<SwaggerUI url="/api/openapi.json" />`; imports `swagger-ui-react/swagger-ui.css`

### Generator — US4

- [x] T029 [US4] Update `src/generators/nextjs/index.ts` — add openapi conditional: when `config.openapi`, ensure `app/api/openapi.json/` and `app/api/docs/` dirs, render 2 openapi templates

### Tests — US4

- [x] T030 [US4] Update `src/generators/nextjs/__tests__/nextjs.test.ts` — add tests: (a) openapi route files generated when `openapi: true`, (b) no openapi files when `openapi: false`

**Checkpoint**: OpenAPI scaffold generated correctly. US4 independently testable with `openapi: true` config.

---

## Phase 7: User Story 5 — Docker, CI, and Claude Code Integration (Priority: P2)

**Goal**: Docker compose includes `api` + `postgres` services for Next.js. CI includes a Node.js backend job. `forgekit add nextjs` works correctly.

**Independent Test**: Generate Next.js + Angular + Docker + CI → `docker-compose.yml` contains `api` service on port 3000 → `ci.yml` contains a `backend` job with `next build`.

### Docker — US5

- [x] T031 [US5] Update `src/generators/docker/index.ts` — add `const nextjs = this.config.backendType === "nextjs";` and pass `nextjs` in template data object
- [x] T032 [US5] Update `src/templates/docker/docker-compose.yml.hbs` — add `{{#if nextjs}}` block: `api` service with `build: ./backend`, `ports: "3000:3000"`, `environment` (DATABASE_URL if needed), `depends_on: postgres`

### CI — US5

- [x] T033 [US5] Update `src/generators/ci/index.ts` — add `const nextjs = this.config.backendType === "nextjs";` and pass `nextjs` in template data
- [x] T034 [US5] Update `src/templates/ci/ci.yml.hbs` — add `{{#if nextjs}}` backend job: `runs-on: ubuntu-latest`, Node 22, `npm ci`, `next build`, triggered on `paths: ['backend/**']`

### Claude Code — US5

- [x] T035 [US5] Update `src/generators/claude-code/index.ts` — add Next.js allowed commands when `backendType === "nextjs"`: `npm run dev` (in backend/), `npm run build` (in backend/), `npx prisma migrate dev` (if prisma), `npx prisma studio` (if prisma)

### E2E Tests — US5

- [x] T036 [US5] Update `src/__tests__/e2e.test.ts` — add e2e scenario: Next.js + Angular + Docker + CI → verify `docker-compose.yml` contains `api:` and `postgres:`, `ci.yml` contains `next build`, both `backend/` and `frontend/` directories exist

**Checkpoint**: Full stack integration verified end-to-end.

---

## Phase 8: Polish & Verification

**Purpose**: Final build, all tests green, spec checklist validated.

- [x] T037 Run `npm run build` and confirm zero TypeScript errors
- [x] T038 [P] Run `npm run test:unit` — all unit tests pass including new nextjs generator tests
- [x] T039 [P] Run `npm run test:e2e` — all e2e scenarios pass including new Next.js scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — 🎯 MVP
- **Phase 4 (US2)**: Depends on Phase 3 (generator file must exist to extend it)
- **Phase 5 (US3)**: Depends on Phase 3 (same reason)
- **Phase 6 (US4)**: Depends on Phase 3 (same reason)
- **Phase 7 (US5)**: Depends on Phase 3 (needs `backendType === "nextjs"` to be valid)
- **Phase 8 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1 (P1)**: Core — must be done first
- **US2, US3, US5 (P2)**: Can be done in any order after US1
- **US4 (P3)**: Can be done after US1, independent of US2/US3/US5

### Within Each User Story

- Templates [P] → Generator update → Tests
- Templates are independent and can be created in parallel
- Generator update depends on templates existing
- Tests written after implementation (standard unit test pattern for ForgeKit)

### Parallel Opportunities

- T001, T002, T003 can run in parallel (different files)
- T008–T013 (US1 templates) all run in parallel
- T018–T019 (US2 templates) run in parallel
- T022–T024 (US3 templates) run in parallel
- T027–T028 (US4 templates) run in parallel
- T031+T033 (Docker/CI generator updates) run in parallel
- T032+T034 (Docker/CI template updates) run in parallel
- T038, T039 run in parallel

---

## Parallel Example: User Story 1

```bash
# All US1 templates can be created simultaneously:
Task T008: src/templates/nextjs/package.json.hbs
Task T009: src/templates/nextjs/next.config.ts.hbs
Task T010: src/templates/nextjs/tsconfig.json.hbs
Task T011: src/templates/nextjs/.env.example.hbs
Task T012: src/templates/nextjs/Dockerfile.hbs
Task T013: src/templates/nextjs/app/api/health/route.ts.hbs

# Then sequentially:
Task T014: src/generators/nextjs/index.ts  (needs templates)
Task T015: src/commands/new.ts             (needs generator)
Task T016: __tests__/nextjs.test.ts        (needs generator)
Task T017: e2e.test.ts                     (needs generator)
```

---

## Implementation Strategy

### MVP (User Story 1 only — Phases 1–3)

1. Complete Phase 1: Types + Versions + Fixture updates
2. Complete Phase 2: CLI entry points
3. Complete Phase 3: Core generator + templates
4. **VALIDATE**: `npm run build` + `npm run test:unit` + manual generation test
5. MVP deliverable: `forgekit new` works with Next.js API backend

### Incremental Delivery

1. Phases 1–3 → Core Next.js generator working
2. Phase 4 → Add Prisma option
3. Phase 5 → Add Auth option
4. Phase 7 (Docker/CI first) → Infrastructure integration
5. Phase 6 → Add OpenAPI option
6. Phase 8 → Polish and verify

---

## Notes

- [P] = different files, no inter-task dependencies, safe to dispatch in parallel
- Constitution rule 2: `package.json.hbs` must NOT use `{{#if}}` inside the JSON body (trailing commas break JSON.parse). The generator pre-computes `dependencies`, `devDependencies`, and `scripts` as plain key-value objects and passes them as template data — the template renders them via `{{#each}}` loops only
- Constitution rule 7: ALL fixture objects (`ProjectConfig`) must include `prisma: false` after T003
- The `[...nextauth]` directory name is a Next.js convention — must be created literally as `app/api/auth/[...nextauth]/`
