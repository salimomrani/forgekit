# Research: React/Vite Frontend Option

**Date**: 2026-03-17

---

## Decision: React version

- **Chosen**: React 19 (latest stable)
- **Rationale**: Latest stable, concurrent features, improved TypeScript support, hooks-first architecture
- **Packages**: `react@^19`, `react-dom@^19`, `@types/react@^19`, `@types/react-dom@^19`

## Decision: Build tool

- **Chosen**: Vite 6 with `@vitejs/plugin-react`
- **Rationale**: Official React + Vite scaffolding target, HMR, ESM-native, minimal config
- **Alternative considered**: Create React App — rejected (deprecated, unmaintained)

## Decision: Routing

- **Chosen**: React Router v7 (declarative mode, not framework mode)
- **Rationale**: Most widely adopted React router; v7 is stable; declarative mode = SPA, no SSR
- **Package**: `react-router@^7`
- **Alternative considered**: TanStack Router — rejected (additional learning curve, less ecosystem adoption)

## Decision: CSS framework

- **Chosen**: Tailwind CSS v4 (same version already in ResolvedVersions for Angular)
- **Rationale**: Reuses existing version fetch; consistent toolchain across frontend options
- **No postcss.config.js needed**: Tailwind v4 uses Vite plugin (`@tailwindcss/vite`)

## Decision: Auth HTTP client

- **Chosen**: axios@^1 with a preconfigured instance + JWT Bearer interceptor
- **Rationale**: Consistent with Angular auth scaffold (axios mirrors Angular HttpClient interceptor pattern); widely adopted
- **Alternative considered**: native `fetch` — rejected (no interceptor pattern without boilerplate)

## Decision: FrontendType migration strategy

- **Chosen**: `frontend: boolean` → `frontend: FrontendType` where `FrontendType = "angular" | "react-vite" | false`
- **Derived booleans** (inline, not stored in config):
  - `hasFrontend = config.frontend !== false`
  - `angular = config.frontend === "angular"`
  - `reactVite = config.frontend === "react-vite"`
- **Rationale**: Same pattern as `BackendType` migration (feature 001); all existing `{{#if frontend}}` template blocks stay regression-safe via `hasFrontend`
- **Angular templates**: receive `angular: true` — existing conditional blocks unchanged

## Decision: Generator architecture

- **Chosen**: New `ReactViteGenerator` class in `src/generators/frontend/react-vite.ts`; existing `FrontendGenerator` (Angular) untouched
- **`src/generators/frontend/index.ts`**: becomes a router — dispatches to Angular or React based on `config.frontend`
- **Rationale**: Parallel generators, zero coupling, each testable in isolation (constitution §1)

## Decision: Wizard uiFramework for React

- **Chosen**: Auto-set `uiFramework = "tailwind"` when `frontend === "react-vite"` — no user prompt
- **Rationale**: PrimeNG is Angular-only; no other UI lib in scope for this iteration; asking the user adds friction with no real choice
- **NgRx question**: skipped entirely for React (no equivalent in scope)

## Decision: Versions to add to ResolvedVersions

New fields required:
- `react` — fetched from npm `react/latest`
- `reactRouter` — fetched from npm `react-router/latest`
- `vite` — fetched from npm `vite/latest`
- `axiosReact` — fetched from npm `axios/latest` (only used when auth is enabled)

## Decision: Docker nginx for React

- **Chosen**: Reuse the exact same nginx service block as Angular in `docker-compose.yml.hbs`
- **Rationale**: Both are static SPA builds served on port 80; no distinction needed at Docker level
