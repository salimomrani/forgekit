# Tasks: NestJS Backend Generator

**Input**: Design documents from `/specs/013-nestjs-backend/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Tests**: Included (unit tests, `cfg.tdd = false` → implementation first, tests after)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend existing ForgeKit types and version resolution to support NestJS.

- [x] T001 Add `"nestjs"` to `BackendType` union in `src/types.ts`
- [x] T002 [P] Add `nestjs`, `nestjsJwt`, `nestjsSwagger` fields to `ResolvedVersions` interface in `src/versions.ts`
- [x] T003 [P] Add fallback values `nestjs: "11.0.0"`, `nestjsJwt: "11.0.0"`, `nestjsSwagger: "11.2.0"` to `FALLBACK_VERSIONS` in `src/versions.ts`
- [x] T004 Add `nestjs` version resolution branch in `resolveVersions()` in `src/versions.ts` — fetch `@nestjs/core`, `@nestjs/jwt`, `@nestjs/swagger` from npm with silent fallback
- [x] T005 Add `nestjs`, `nestjsJwt`, `nestjsSwagger` fields to `BASE_VERSIONS` fixture in `src/__tests__/fixtures.ts`

---

## Phase 2: Foundational (NestJS Templates)

**Purpose**: Create all Handlebars templates. Independent of generator code — can be written in parallel.

**⚠️ CRITICAL**: Generator (Phase 3) depends on these templates existing.

- [x] T006 [P] Create `src/templates/nestjs/package.json.hbs` — deps: `@nestjs/core/common/platform-express` always; `{{#if auth}}@nestjs/jwt, @nestjs/passport, passport, passport-jwt{{/if}}`; `{{#if prisma}}@prisma/client{{/if}}`; `{{#if openapi}}@nestjs/swagger{{/if}}`; devDeps: `@nestjs/cli`, `@nestjs/testing`, `ts-jest`, `jest`; scripts: `build`, `start`, `start:dev`, `test`, `lint`; `{{#if prisma}}prisma{{/if}}` in devDeps
- [x] T007 [P] Create `src/templates/nestjs/tsconfig.json.hbs` — `experimentalDecorators: true`, `emitDecoratorMetadata: true`, `strict: true`, `target: "ES2021"`, `module: "commonjs"`
- [x] T008 [P] Create `src/templates/nestjs/tsconfig.build.json.hbs` — extends tsconfig.json, excludes `node_modules`, `test`, `dist`
- [x] T009 [P] Create `src/templates/nestjs/nest-cli.json.hbs` — `collection: "@nestjs/schematics"`, `sourceRoot: "src"`
- [x] T010 [P] Create `src/templates/nestjs/src/main.ts.hbs` — bootstrap NestFactory; `{{#if openapi}}DocumentBuilder + SwaggerModule.setup('api', ...){{/if}}`; listen on port 3000
- [x] T011 [P] Create `src/templates/nestjs/src/app.module.ts.hbs` — `@Module({ imports: [HealthModule{{#if prisma}}, PrismaModule{{/if}}{{#if auth}}, AuthModule{{/if}}] })` — imports section conditional
- [x] T012 [P] Create `src/templates/nestjs/src/app.controller.ts.hbs` — minimal `@Controller()` with `@Get()` returning `appService.getHello()`
- [x] T013 [P] Create `src/templates/nestjs/src/app.service.ts.hbs` — `@Injectable()` with `getHello(): string`
- [x] T014 [P] Create `src/templates/nestjs/src/health/health.controller.ts.hbs` — `@Controller('health')` with `@Get()` returning `{ status: 'ok' }`
- [x] T015 [P] Create `src/templates/nestjs/src/health/health.module.ts.hbs` — `@Module({ controllers: [HealthController] })`
- [x] T016 [P] Create `src/templates/nestjs/src/prisma/prisma.service.ts.hbs` — `PrismaService extends PrismaClient implements OnModuleInit`
- [x] T017 [P] Create `src/templates/nestjs/src/prisma/prisma.module.ts.hbs` — `@Global() @Module({ providers: [PrismaService], exports: [PrismaService] })`
- [x] T018 [P] Create `src/templates/nestjs/src/auth/auth.module.ts.hbs` — imports `JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: '1d' } })`
- [x] T019 [P] Create `src/templates/nestjs/src/auth/auth.service.ts.hbs` — `@Injectable()` with `validateToken()` stub
- [x] T020 [P] Create `src/templates/nestjs/src/auth/jwt.strategy.ts.hbs` — `PassportStrategy(Strategy)` extracting Bearer token, validating payload
- [x] T021 [P] Create `src/templates/nestjs/src/auth/jwt-auth.guard.ts.hbs` — `AuthGuard('jwt')` extending `@nestjs/passport`
- [x] T022 [P] Create `src/templates/nestjs/prisma/schema.prisma.hbs` — `datasource db { provider = "postgresql", url = env("DATABASE_URL") }`, generator client block
- [x] T023 [P] Create `src/templates/nestjs/env.example.hbs` — `PORT=3000`, `{{#if auth}}JWT_SECRET=change_me{{/if}}`, `{{#if prisma}}DATABASE_URL=postgresql://...{{/if}}`
- [x] T024 [P] Create `src/templates/nestjs/gitignore.hbs` — `node_modules/`, `dist/`, `.env`, `{{#if prisma}}.prisma/{{/if}}`
- [x] T025 [P] Create `src/templates/nestjs/Dockerfile.hbs` — multi-stage: `node:20-alpine` build stage + production stage, `npm run build`, `COPY dist/ dist/`
- [x] T026 [P] Create `src/templates/nestjs/dockerignore.hbs` — `node_modules`, `dist`, `.env`, `.git`

**Checkpoint**: All 21 templates exist → generator can now be written.

---

## Phase 3: User Story 1 — Base NestJS Scaffold (Priority: P1) 🎯 MVP

**Goal**: Generator class + CLI wiring so `forgekit new --nestjs` produces a working NestJS project.

**Independent Test**: `generateNestJsBackend(tmpDir, makeBaseConfig({ backendType: "nestjs" }), BASE_VERSIONS)` creates all base files; `package.json` contains `@nestjs/core`.

### Implementation

- [x] T027 [US1] Create `src/generators/nestjs/index.ts` — `NestJsGenerator extends BaseGenerator`, constructor `(projectDir, config, versions: ResolvedVersions)`, `generate()` method: `ensureDirs` for `backend/src/health`; `data = { name, description, auth, prisma, openapi, versions }`; `Promise.all([base template renders: package.json, tsconfig.json, tsconfig.build.json, nest-cli.json, src/main.ts, src/app.module.ts, src/app.controller.ts, src/app.service.ts, src/health/health.controller.ts, src/health/health.module.ts, gitignore → .gitignore, env.example → .env.example, Dockerfile, dockerignore → .dockerignore])`; export `generateNestJsBackend(projectDir, config, versions)`
- [x] T028 [US1] Wire NestJS into `src/commands/new.ts` — add `import { generateNestJsBackend }` ; add `.option("--nestjs", "Inclure le backend NestJS")` ; add `if (options.nestjs) defaults.backendType = "nestjs"` in options handler ; add `if (config.backendType === "nestjs") { ... await generateNestJsBackend(...) ... }` block in `generateProject()` with progress output ; add startup hint `cd backend && npm install && npm run start:dev` ; add NestJS to `--help` backends section
### Tests

- [x] T030 [US1] Create `src/generators/nestjs/__tests__/nestjs.test.ts` — test base scaffold: verify `backend/package.json`, `backend/tsconfig.json`, `backend/nest-cli.json`, `backend/src/main.ts`, `backend/src/app.module.ts`, `backend/src/health/health.controller.ts`, `backend/.gitignore`, `backend/.env.example`, `backend/Dockerfile` all exist; verify `package.json` content contains `@nestjs/core` version string

**Checkpoint**: `npm run test:unit -- nestjs` passes. US1 fully functional.

---

## Phase 4: User Story 2 — JWT Authentication (Priority: P2)

**Goal**: `auth: true` generates complete auth module; `auth: false` generates nothing auth-related.

**Independent Test**: `makeBaseConfig({ backendType: "nestjs", auth: true })` → auth files exist + `@nestjs/jwt` in `package.json`; `auth: false` → no auth files.

### Implementation

- [x] T031 [US2] Add conditional auth file rendering to `NestJsGenerator.generate()` in `src/generators/nestjs/index.ts` — `if (config.auth) { await ensureDir(auth dir); await Promise.all([render auth.module.ts, auth.service.ts, jwt.strategy.ts, jwt-auth.guard.ts]) }`

### Tests

- [x] T032 [US2] Add auth flag tests to `nestjs.test.ts` — `auth: true`: verify `src/auth/auth.module.ts`, `src/auth/jwt.strategy.ts`, `src/auth/jwt-auth.guard.ts` exist and `package.json` contains `@nestjs/jwt`; `auth: false`: verify no `src/auth/` dir, no jwt packages

**Checkpoint**: Auth on/off both tested. US2 fully functional.

---

## Phase 5: User Story 3 — Prisma ORM (Priority: P2)

**Goal**: `prisma: true` generates Prisma service/module + schema; `prisma: false` generates nothing Prisma-related.

**Independent Test**: `makeBaseConfig({ backendType: "nestjs", prisma: true })` → `prisma/schema.prisma` exists + `@prisma/client` in `package.json`.

### Implementation

- [x] T033 [US3] Add conditional Prisma file rendering to `NestJsGenerator.generate()` in `src/generators/nestjs/index.ts` — `if (config.prisma) { await ensureDirs([prisma dir, src/prisma dir]); await Promise.all([render schema.prisma, prisma.service.ts, prisma.module.ts]) }`

### Tests

- [x] T034 [US3] Add prisma flag tests to `nestjs.test.ts` — `prisma: true`: verify `prisma/schema.prisma`, `src/prisma/prisma.service.ts`, `src/prisma/prisma.module.ts` exist and `package.json` contains `@prisma/client`; `prisma: false`: verify none of these files exist

**Checkpoint**: Prisma on/off both tested. US3 fully functional.

---

## Phase 6: User Story 4 — OpenAPI/Swagger (Priority: P3)

**Goal**: `openapi: true` adds Swagger setup in `main.ts` and `@nestjs/swagger` in `package.json`.

**Independent Test**: `makeBaseConfig({ backendType: "nestjs", openapi: true })` → `main.ts` contains `SwaggerModule` + `@nestjs/swagger` in `package.json`.

### Tests

- [x] T035 [US4] Add openapi flag tests to `nestjs.test.ts` — `openapi: true`: verify `main.ts` contains `SwaggerModule` and `DocumentBuilder`, verify `package.json` contains `@nestjs/swagger`; `openapi: false`: verify no swagger code in `main.ts`

*(No new implementation task — openapi is handled via Handlebars `{{#if openapi}}` conditionals already in T010 and T006 templates)*

**Checkpoint**: OpenAPI on/off both tested via template conditionals. US4 fully functional.

---

## Phase 7: User Story 5 — CLI Prompt Integration (Priority: P1)

**Goal**: `forgekit new` interactive prompt includes NestJS choice and feature checkboxes.

**Independent Test**: `prompts/project.ts` includes `{ value: "nestjs" }` in backend choices and a NestJS feature checkbox block.

### Implementation

- [x] T036 [US5] Add NestJS to backend selection and feature checkboxes in `src/prompts/project.ts` — add `{ name: "NestJS (Node.js/TypeScript)", value: "nestjs" }` to the `select<BackendType>` choices list; add `if (backendType === "nestjs" && defaults.auth === undefined && defaults.prisma === undefined && defaults.openapi === undefined)` checkbox block with choices: `{ name: "JWT authentication (@nestjs/jwt)", value: "auth" }`, `{ name: "Prisma ORM (PostgreSQL)", value: "prisma" }`, `{ name: "OpenAPI / Swagger UI (@nestjs/swagger)", value: "openapi" }`

### Tests

- [x] T037 [US5] Add combined flags test to `nestjs.test.ts` — `auth: true, prisma: true, openapi: true`: verify all feature directories created, all packages present in `package.json`, `main.ts` contains swagger, no generation errors thrown

**Checkpoint**: Full CLI integration verified. US5 functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T038 Run `npm run build` and verify zero TypeScript errors after all changes
- [x] T039 Run `npm run lint` and fix any ESLint issues in new files
- [x] T040 Run `npm run test:unit` — verify full suite passes with zero regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No deps — start immediately
- **Phase 2 (Templates)**: Depends on Phase 1 (T001-T005 for version keys) — all T006-T026 parallelizable among themselves
- **Phase 3 (US1 base scaffold)**: Depends on Phase 2 completion
- **Phases 4-7 (US2-US5)**: Depend on Phase 3 (generator class must exist)
- **Phase 8 (Polish)**: Depends on all phases complete

### Parallel Opportunities

```bash
# Phase 1 — T002, T003, T005 can run in parallel (different files/fields)
# Phase 2 — All T006–T026 fully parallel (different template files)
# Phases 4+5+6 — US2/US3/US4 can run in parallel after T027 (generator base exists)
```

### Implementation Strategy

**MVP**: Complete Phases 1–3 → working `forgekit new --nestjs` with base scaffold.
**Full**: Add Phases 4–7 for feature flags and CLI prompts.
**Polish**: Phase 8 — build + lint + full test suite.
