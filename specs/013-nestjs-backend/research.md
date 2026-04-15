# Research: NestJS Backend Generator

## NestJS package versions (npm, 2026-04)

| Decision | Value |
|----------|-------|
| `@nestjs/core` fallback | `11.0.0` |
| `@nestjs/jwt` fallback | `11.0.0` |
| `@nestjs/swagger` fallback | `11.2.0` |
| `@nestjs/platform-express` | same as `nestjs` |
| `passport-jwt` | bundled with `@nestjs/jwt` usage |
| `@prisma/client` | reuse existing `prismaClient` key (`6.6.0`) |

**Rationale**: NestJS 11 is the current LTS-compatible major. All `@nestjs/*` packages share the same major version. `@nestjs/swagger` may be on a slightly higher patch/minor — using `11.2.0` as conservative fallback.

## NestJS tsconfig requirements

NestJS requires `experimentalDecorators: true` and `emitDecoratorMetadata: true` in `tsconfig.json`. This differs from standard TypeScript projects — must be explicit in the template.

## Conditional file strategy

Two approaches evaluated:

| Approach | Description | Chosen |
|----------|-------------|--------|
| A — Conditional in template | `{{#if auth}}...{{/if}}` wrapping entire file blocks | Only for inline content (e.g., imports in app.module.ts) |
| B — Conditional in generator | `if (config.auth) { await renderAndWrite(...) }` | For entire files (auth/*.ts, prisma/*.ts) |

**Decision**: Hybrid — use approach B (generator-level) for entire feature files, approach A (template-level) for conditional sections within shared files (package.json deps, app.module.ts imports, main.ts swagger setup). This follows the Laravel pattern exactly.

## Prisma schema for NestJS

Reuse the same pattern as the Next.js generator — `prismaClient` version key already exists in `ResolvedVersions`. No new key needed for `prisma` (CLI tool) — it goes in devDependencies at the same version as `@prisma/client`.

## Version key naming

Three new keys needed (not overlapping with existing):
- `nestjs` → `@nestjs/core` (and `@nestjs/common`, `@nestjs/platform-express`)
- `nestjsJwt` → `@nestjs/jwt`
- `nestjsSwagger` → `@nestjs/swagger`

`prismaClient` is reused (shared with Next.js generator).
