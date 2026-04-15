# Data Model: NestJS Backend Generator

No persistent data model — this is a CLI code generator. The relevant "entities" are TypeScript interfaces and configuration objects.

## Config fields consumed by NestJsGenerator

| Field | Type | Used for |
|-------|------|---------|
| `config.name` | `string` | Project name in package.json, app title |
| `config.description` | `string` | package.json description |
| `config.auth` | `boolean` | Conditional: generate auth module + JWT strategy |
| `config.prisma` | `boolean` | Conditional: generate Prisma service/module + schema |
| `config.openapi` | `boolean` | Conditional: Swagger setup in main.ts + @nestjs/swagger dep |

## New version fields in ResolvedVersions

| Field | Interface | Fallback |
|-------|-----------|---------|
| `nestjs` | `ResolvedVersions` | `"11.0.0"` |
| `nestjsJwt` | `ResolvedVersions` | `"11.0.0"` |
| `nestjsSwagger` | `ResolvedVersions` | `"11.2.0"` |

`prismaClient` already exists — reused as-is.

## Template data object

```typescript
const data = {
  name: this.config.name,
  description: this.config.description,
  auth: this.config.auth,
  prisma: this.config.prisma,
  openapi: this.config.openapi,
  versions: this.versions,
};
```
