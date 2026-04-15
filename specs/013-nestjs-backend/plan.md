# Implementation Plan: NestJS Backend Generator

**Branch**: `013-nestjs-backend` | **Date**: 2026-04-15 | **Spec**: [spec.md](./spec.md)

## Summary

Add NestJS as a fifth backend option in ForgeKit. A new `NestJsGenerator` class (extending `BaseGenerator`, same pattern as `LaravelGenerator`) produces a complete NestJS project under `backend/` with three optional feature flags: JWT auth, Prisma ORM, and OpenAPI/Swagger. Changes touch `types.ts`, `versions.ts`, `prompts/project.ts`, `commands/new.ts`, plus new generator and template files.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js ≥20
**Primary Dependencies**: `@nestjs/core 11`, `@nestjs/jwt 11` (optional), `@nestjs/swagger 11.2` (optional), `@prisma/client 6.6` (optional)
**Storage**: N/A (ForgeKit itself); generated projects use PostgreSQL via Prisma when `prisma: true`
**Testing**: Vitest 4 + `@vitest/coverage-v8` — unit tests in `src/generators/nestjs/__tests__/nestjs.test.ts`
**Target Platform**: CLI (Node.js)
**Project Type**: CLI tool — generator plugin
**Performance Goals**: Parallel file writes via `Promise.all()` (constitution rule 10)
**Constraints**: No generator touches another generator's output directory (constitution rule 1); templates contain zero logic (rule 2); ProjectConfig is the single source of truth (rule 3)

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| 1. Each generator owns exactly one layer | ✅ | NestJsGenerator only writes to `backend/` |
| 2. Templates contain zero logic | ✅ | All conditionals live in the generator; templates receive flat data |
| 3. ProjectConfig is single source of truth | ✅ | Generator receives ProjectConfig; no filesystem derivation |
| 4. Fail fast, rollback completely | ✅ | `generateProject()` in `new.ts` already handles rollback |
| 5. Network failures silent | ✅ | `resolveVersions()` pattern already handles this; NestJS branch follows same pattern |
| 6. No speculative abstractions | ✅ | No new abstractions — follows existing BaseGenerator/renderAndWrite pattern |
| 7. Tests declare all fixture fields | ✅ | `nestjs.test.ts` will use `makeBaseConfig()` from `fixtures.ts` |
| 8. CLI detection synchronous and early | N/A | No new CLI detection needed |
| 9. Release only through pipeline | N/A | Implementation note only |
| 10. I/O parallelized | ✅ | `Promise.all()` for all independent writes |

## Project Structure

### Documentation (this feature)

```text
specs/013-nestjs-backend/
├── plan.md
├── research.md
├── data-model.md
└── tasks.md
```

### Source Code (changes + new files)

```text
src/
├── types.ts                                     MODIFY — BackendType += "nestjs"
├── versions.ts                                  MODIFY — +nestjs/nestjsJwt/nestjsSwagger fields + fallbacks + resolve branch
├── prompts/project.ts                           MODIFY — NestJS choice + feature checkboxes
├── commands/new.ts                              MODIFY — --nestjs flag + generator call + startup hint
│
├── generators/nestjs/
│   ├── index.ts                                 NEW — NestJsGenerator class + export function
│   └── __tests__/
│       └── nestjs.test.ts                       NEW — unit tests
│
└── templates/nestjs/
    ├── package.json.hbs                         NEW
    ├── tsconfig.json.hbs                        NEW
    ├── tsconfig.build.json.hbs                  NEW
    ├── nest-cli.json.hbs                        NEW
    ├── src/main.ts.hbs                          NEW — Swagger conditional
    ├── src/app.module.ts.hbs                    NEW — conditional imports
    ├── src/app.controller.ts.hbs                NEW
    ├── src/app.service.ts.hbs                   NEW
    ├── src/health/health.controller.ts.hbs      NEW
    ├── src/health/health.module.ts.hbs          NEW
    ├── src/prisma/prisma.service.ts.hbs         NEW (if prisma)
    ├── src/prisma/prisma.module.ts.hbs          NEW (if prisma)
    ├── src/auth/auth.module.ts.hbs              NEW (if auth)
    ├── src/auth/auth.service.ts.hbs             NEW (if auth)
    ├── src/auth/jwt.strategy.ts.hbs             NEW (if auth)
    ├── src/auth/jwt-auth.guard.ts.hbs           NEW (if auth)
    ├── prisma/schema.prisma.hbs                 NEW (if prisma)
    ├── env.example.hbs                          NEW
    ├── gitignore.hbs                            NEW
    ├── Dockerfile.hbs                           NEW
    └── dockerignore.hbs                         NEW
```

## Implementation Phases

### Phase A — Types + Versions (no deps)

1. `src/types.ts`: Add `"nestjs"` to `BackendType` union.
2. `src/versions.ts`:
   - Add `nestjs`, `nestjsJwt`, `nestjsSwagger` to `ResolvedVersions` interface.
   - Add fallbacks: `nestjs: "11.0.0"`, `nestjsJwt: "11.0.0"`, `nestjsSwagger: "11.2.0"`.
   - Add `if (opts.backendType === "nestjs")` branch in `resolveVersions()` fetching `@nestjs/core`, `@nestjs/jwt`, `@nestjs/swagger` from npm.

### Phase B — Templates (no deps on A)

Create all 20 Handlebars templates under `src/templates/nestjs/`. Key rules:
- `package.json.hbs`: `{{versions.nestjs}}` for core, `{{#if auth}}...{{/if}}` for jwt/passport blocks, `{{#if prisma}}...{{/if}}` for prisma blocks, `{{#if openapi}}...{{/if}}` for swagger.
- `src/main.ts.hbs`: Swagger bootstrap wrapped in `{{#if openapi}}`.
- `src/app.module.ts.hbs`: `{{#if prisma}}PrismaModule,{{/if}}` and `{{#if auth}}AuthModule,{{/if}}` in imports array.
- Conditional template files (auth, prisma) are rendered by the generator, not by template conditionals.

### Phase C — Generator (depends on A + B)

`src/generators/nestjs/index.ts`:
```
NestJsGenerator extends BaseGenerator
  constructor(projectDir, config, versions: ResolvedVersions)
  generate():
    1. ensureDirs([backendDir/src/health, ...+ prisma?, auth?, prisma/schema?])
    2. data = { name, description, auth, prisma, openapi, versions }
    3. Promise.all([base files])
    4. if (config.auth)   → await renderAndWrite(auth templates × 4)
    5. if (config.prisma) → await renderAndWrite(prisma templates × 3)

export async function generateNestJsBackend(projectDir, config, versions)
```

### Phase D — CLI wiring (depends on A + C)

1. `src/prompts/project.ts`:
   - Add `{ name: "NestJS (Node.js/TypeScript)", value: "nestjs" }` to backend choices.
   - Add `if (backendType === "nestjs" && ...)` checkbox block for auth/prisma/openapi (same pattern as Laravel).

2. `src/commands/new.ts`:
   - Add `import { generateNestJsBackend }` at top.
   - Add `.option("--nestjs", "Inclure le backend NestJS")` to command definition.
   - Add `if (options.nestjs) defaults.backendType = "nestjs"` in options handler.
   - Add `if (config.backendType === "nestjs")` block in `generateProject()` calling `generateNestJsBackend(projectDir, config, versions)`.
   - Add startup hint: `if (config.backendType === "nestjs") console.log(chalk.cyan("  cd backend && npm install && npm run start:dev"))`.
   - Add NestJS to `--help` text backends section.

### Phase E — Tests (depends on A + B + C)

`src/generators/nestjs/__tests__/nestjs.test.ts`:
- Uses `makeBaseConfig({ backendType: "nestjs" })` from `fixtures.ts`.
- **Must add `nestjs`, `nestjsJwt`, `nestjsSwagger` fields to `BASE_VERSIONS` in `fixtures.ts`.**
- Test groups:
  1. Base scaffold: directories + files exist, `package.json` contains core versions.
  2. Auth flag: auth files present/absent, `package.json` content.
  3. Prisma flag: schema.prisma, prisma service/module, `package.json` content.
  4. OpenAPI flag: `main.ts` contains swagger setup / does not.
  5. Combined: auth + prisma both enabled — both directories created.

## Key Files to Read Before Implementing

- `src/generators/laravel/index.ts` — direct pattern to follow
- `src/generators/laravel/__tests__/laravel.test.ts` — test structure to mirror
- `src/__tests__/fixtures.ts` — `makeBaseConfig` + `BASE_VERSIONS` to extend
- `src/templates/laravel/composer.json.hbs` — conditional deps template pattern
- `src/templates/nextjs/` — Prisma template reference (reuse `prismaClient` version key)
