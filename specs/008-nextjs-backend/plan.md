# Implementation Plan: Next.js Backend Generator

**Branch**: `008-nextjs-backend` | **Date**: 2026-04-11 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/008-nextjs-backend/spec.md`

## Summary

Add Next.js as a 4th backend option in ForgeKit CLI. Mode: API-only (App Router Route Handlers, no pages). Optional features: Prisma ORM, NextAuth.js v5, OpenAPI (next-swagger-doc). PostgreSQL for docker-compose. Compatible with Angular and React Vite as independent frontends.

## Technical Context

**Language/Version**: TypeScript 5.9 (ForgeKit), Node.js ≥ 20  
**Primary Dependencies**: Commander, Inquirer, Handlebars, fs-extra, chalk (existing)  
**Generated project stack**: Next.js 15, React 19, Node.js 22  
**Storage**: PostgreSQL (generated docker-compose)  
**Testing**: Vitest (unit + e2e), existing test infrastructure  
**Target Platform**: ForgeKit CLI (Node.js), generates Node.js/Next.js projects  
**Performance Goals**: Generation completes in < 5s  
**Constraints**: Constitution rules (no cross-generator writes, no logic in templates, fail-fast with rollback)  
**Scale/Scope**: ~15 new/modified files in ForgeKit, ~12 template files

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| 1. Each generator owns exactly one layer | ✅ | `NextJsGenerator` writes only to `backend/` |
| 2. Templates contain zero logic | ✅ | All conditionals in generator; templates receive flat data |
| 3. ProjectConfig is single source of truth | ✅ | Generator reads only from `ProjectConfig` + `ResolvedVersions` |
| 4. Fail fast, rollback completely | ✅ | Existing `try/catch` in `generateProject()` handles rollback |
| 5. Network failures are silent | ✅ | New version fetches use same `fetchNpmVersion` pattern with fallbacks |
| 6. No speculative abstractions | ✅ | No new helpers; reuses `renderAndWrite`, `BaseGenerator`, existing utils |
| 7. Tests declare all fixture fields | ⚠️ | `prisma: boolean` added to `ProjectConfig` → all ~9 fixture files need update |
| 8. CLI detection synchronous and early | N/A | No new CLI tool detection needed |
| 9. Release through pipeline | N/A | Not a release task |
| 10. I/O parallelized | ✅ | New version fetches added to `Promise.all()` block in `resolveVersions()` |

**Gate**: Rule 7 requires fixture updates — tracked as explicit task.

## Project Structure

### Documentation (this feature)

```text
specs/008-nextjs-backend/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── generated-project-api.yml
└── tasks.md             # Phase 2 output (speckit.tasks)
```

### Source Code Changes

```text
# Modified files
src/types.ts                              # Add "nextjs" to BackendType, add prisma: boolean
src/versions.ts                           # Add next/nextAuth/prismaClient to ResolvedVersions
src/prompts/project.ts                    # Add Next.js choice + feature prompts
src/commands/new.ts                       # Add dispatch + success message
src/commands/add.ts                       # Add LAYER_CONFIG_MAP entry + runLayerGenerator case
src/generators/docker/index.ts            # Add nextjs flag
src/generators/ci/index.ts               # Add nextjs flag
src/generators/claude-code/index.ts      # Add Next.js allowed commands
src/templates/docker/docker-compose.yml.hbs   # Add nextjs service block
src/templates/ci/ci.yml.hbs              # Add Next.js backend CI job
# All test fixture files (~9 files)      # Add prisma: false

# New files — Generator
src/generators/nextjs/index.ts
src/generators/nextjs/__tests__/nextjs.test.ts

# New files — Templates
src/templates/nextjs/package.json.hbs
src/templates/nextjs/next.config.ts.hbs
src/templates/nextjs/tsconfig.json.hbs
src/templates/nextjs/.env.example.hbs
src/templates/nextjs/Dockerfile.hbs
src/templates/nextjs/app/api/health/route.ts.hbs
src/templates/nextjs/lib/prisma.ts.hbs
src/templates/nextjs/prisma/schema.prisma.hbs
src/templates/nextjs/auth.ts.hbs
src/templates/nextjs/lib/auth.ts.hbs
src/templates/nextjs/app/api/auth/[...nextauth]/route.ts.hbs
src/templates/nextjs/app/api/openapi.json/route.ts.hbs
src/templates/nextjs/app/api/docs/route.tsx.hbs

# Modified tests
src/__tests__/e2e.test.ts                 # Add Next.js e2e scenarios
```

## Implementation Order

1. **Types + Versions** — Foundation; everything else depends on these
2. **Templates** — Pure file creation, no dependencies
3. **Generator** (`src/generators/nextjs/index.ts`) — Depends on templates + types
4. **Prompts + Commands** (`new.ts`, `add.ts`, `project.ts`) — Depends on generator
5. **Docker + CI + ClaudeCode generators** — Depend on new BackendType value
6. **Fixture updates** — Depends on new `prisma` field in ProjectConfig
7. **Tests** — Written alongside each layer (TDD: RED → GREEN)

## Verification

```bash
npm run build                                          # TypeScript compiles cleanly
npm run test:unit                                      # All unit tests pass
npm run test:e2e                                       # E2E scenarios pass
node dist/index.js new test-api                        # Manual: select Next.js
cd test-api/backend && npm install && npm run build    # Generated project builds
```
