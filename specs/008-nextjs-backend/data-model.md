# Data Model: Next.js Backend Generator

**Feature**: 008-nextjs-backend  
**Date**: 2026-04-11

---

## 1. ProjectConfig Extension

Existing entity in `src/types.ts`. New field added:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `prisma` | `boolean` | `false` | Enable Prisma ORM generation for Next.js backend |

**No other fields change.** `auth`, `openapi`, `docker`, `ci`, `claudeCode` are already in `ProjectConfig` and are reused directly.

**BackendType extension**:
```
BackendType = "spring-boot" | "fastapi" | "laravel" | "nextjs" | null
```

---

## 2. ResolvedVersions Extension

Existing entity in `src/versions.ts`. New fields added:

| Field | Type | Fallback | npm Package |
|-------|------|----------|-------------|
| `next` | `string` | `"15.3.0"` | `next` |
| `nextAuth` | `string` | `"5.0.0"` | `next-auth` |
| `prismaClient` | `string` | `"6.6.0"` | `prisma` / `@prisma/client` |

Version fetches are **conditional** — only triggered when `backendType === "nextjs"`.

---

## 3. Generated Project Entities (runtime, not ForgeKit types)

These are entities in the **generated Next.js project**, not ForgeKit's own types.

### Health Check Response
```typescript
{ status: "ok", timestamp: string }
```

### Prisma User Model (when `prisma: true`)
| Field | Type | Description |
|-------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `email` | `String` (unique) | User email |
| `name` | `String?` | Optional display name |
| `createdAt` | `DateTime` | Creation timestamp |
| `updatedAt` | `DateTime` | Last update timestamp |

### NextAuth Session (when `auth: true`)
Follows Auth.js v5 standard session shape — no custom fields in the scaffold.

---

## 4. Template Data Context

The `NextJsGenerator` passes this flat object to all Handlebars templates:

| Key | Source | Example |
|-----|--------|---------|
| `name` | `config.name` | `"my-api"` |
| `description` | `config.description` | `"My API"` |
| `auth` | `config.auth` | `true` |
| `prisma` | `config.prisma` | `false` |
| `openapi` | `config.openapi` | `true` |
| `nextVersion` | `versions.next` | `"15.3.0"` |
| `nextAuthVersion` | `versions.nextAuth` | `"5.0.0"` |
| `prismaVersion` | `versions.prismaClient` | `"6.6.0"` |
