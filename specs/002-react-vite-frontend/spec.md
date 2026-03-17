# Feature Specification: React/Vite Frontend Option

**Feature ID**: 002
**Short Name**: react-vite-frontend
**Branch**: 002-react-vite-frontend
**Status**: Draft
**Created**: 2026-03-17

---

## Summary

ForgeKit currently scaffolds Angular as the only frontend option. This feature adds React (Vite SPA) as a second frontend choice. When scaffolding a new project, the user selects Angular, React (Vite), or no frontend. The React option generates a production-ready SPA with Tailwind CSS v4, React Router v7, and optionally an authentication scaffold (useAuth hook, ProtectedRoute component, axios instance with JWT interceptor).

---

## Problem Statement

Developers who work in React ecosystems cannot use ForgeKit for their frontend scaffolding. The tool only serves Angular teams, excluding the majority of the frontend developer audience. Adding a React/Vite option makes ForgeKit useful for any full-stack project regardless of frontend preference, while keeping the backend options (Spring Boot, FastAPI, none) unchanged.

---

## User Scenarios & Testing

### Scenario 1 — Angular project (regression)
**Given** a developer runs `forgekit new my-app`
**When** they select "Angular" as frontend
**Then** the generated project is identical to the current Angular output

### Scenario 2 — React/Vite project, no auth
**Given** a developer runs `forgekit new my-app`
**When** they select "React (Vite)" as frontend and skip auth
**Then** the generated frontend contains a Vite + React + Tailwind SPA with React Router and no auth files

### Scenario 3 — React/Vite project, with auth
**Given** a developer selects React (Vite) + auth
**When** the project is generated
**Then** the frontend contains useAuth hook, ProtectedRoute component, and a pre-configured axios instance with JWT Bearer interceptor

### Scenario 4 — React/Vite + Spring Boot (fullstack)
**Given** a developer selects Spring Boot + React (Vite) + auth
**When** the project is generated
**Then** docker-compose includes an nginx service for the React SPA, and the auth scaffold matches the Spring Boot JWT API contract

### Scenario 5 — React/Vite + FastAPI (fullstack)
**Given** a developer selects FastAPI + React (Vite)
**When** the project is generated
**Then** the project scaffolds correctly with no Angular files present

### Scenario 6 — React/Vite, no backend
**Given** a developer selects React (Vite) with no backend
**When** the project is generated
**Then** only the React frontend is scaffolded; Docker and auth are not offered

### Scenario 7 — No frontend selected
**Given** a developer selects no frontend
**When** the project is generated
**Then** no frontend files are generated (existing behavior unchanged)

---

## Functional Requirements

### FR-1: Frontend type extension
The CLI prompt must present frontend as a single-choice selection:
- None
- Angular (existing)
- React (Vite + Tailwind)

The internal `ProjectConfig.frontend` type must extend from `boolean` to a discriminated value:
`"angular" | "react-vite" | false`

### FR-2: React/Vite project structure
When React (Vite) is selected, the generator must produce:
```
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css             # Tailwind directives
    └── router/
        └── index.tsx         # React Router v7 declarative routes
```

### FR-3: Auth scaffold (conditional)
When auth is enabled alongside React (Vite), the generator must additionally produce:
```
frontend/src/
├── hooks/
│   └── useAuth.ts            # Auth state hook (token read/write, logout)
├── components/
│   └── ProtectedRoute.tsx    # Route wrapper redirecting unauthenticated users
└── lib/
    └── http.ts               # Axios instance with JWT Bearer interceptor
```

### FR-4: Wizard conditional logic
- PrimeNG and NgRx questions must be hidden when React (Vite) is selected
- Auth question behavior is unchanged (shown when a backend is selected)
- Tailwind is the only UI framework option for React (Vite)

### FR-5: Docker nginx service
When React (Vite) is selected and Docker is enabled, `docker-compose.yml` must include an nginx service to serve the built SPA, equivalent to the existing Angular Docker setup.

### FR-6: CLAUDE.md conventions
When React (Vite) is selected, the generated `CLAUDE.md` must reference `applying-react-conventions` skill, not `applying-angular-conventions`.

### FR-7: Settings.json allowed commands
When React (Vite) is selected, `.claude/settings.json` must include React-appropriate allowed commands:
```
Bash(npm run dev)
Bash(npm run build)
Bash(npm run lint)
```

### FR-8: CI support
When CI is enabled with React (Vite), the GitHub Actions workflow must run the Vite build and lint steps instead of Angular-specific commands.

---

## Out of Scope

- Next.js (SSR/SSG) — future feature
- shadcn/ui, PrimeReact, or any component library — future feature
- State management (Zustand, TanStack Query, Redux Toolkit) — future feature
- Vue, Svelte, or other frontend frameworks
- Multiple frontends per project

---

## Assumptions

- Vite 6+ is the build tool (latest stable)
- React 19 is the target version
- React Router v7 for declarative routing
- Tailwind CSS v4 (same version as Angular option)
- TypeScript strict mode enabled
- Auth scaffold assumes a Bearer token stored in `localStorage` (consistent with Spring Boot JWT template)
- Nginx serves the built `/dist` output on port 80 in Docker

---

## Success Criteria

1. A developer can scaffold a React/Vite project in under 60 seconds with a single `forgekit new` command
2. The generated React project starts successfully with `npm run dev` without any manual configuration
3. The generated project passes `npm run build` without errors or warnings
4. Existing Angular project generation produces identical output to the current release (no regression)
5. All existing Vitest tests pass after the `ProjectConfig.frontend` type migration

---

## Dependencies & Risks

- **Risk**: Migrating `frontend: boolean` to `frontend: "angular" | "react-vite" | false` is a breaking change in the internal type system — all generators and templates that reference `frontend` must be updated atomically
- **Risk**: Wizard conditional logic for PrimeNG/NgRx must be correctly gated — a regression would expose Angular-only options to React users
- **Dependency**: `applying-react-conventions` skill already exists globally — no new skill needed
- **Dependency**: nginx Docker service pattern already exists for Angular — reuse as template baseline

---

## Key Entities

| Entity | Description |
|---|---|
| `frontend` | `"angular" \| "react-vite" \| false` — replaces `frontend: boolean` |
| `ReactViteGenerator` | New generator class parallel to `FrontendGenerator` (Angular) |
| React/Vite templates | New `.hbs` templates under `templates/frontend/react-vite/` |
| Auth templates | `useAuth.ts.hbs`, `ProtectedRoute.tsx.hbs`, `http.ts.hbs` — conditional |
| `CLAUDE.md.hbs` | Updated with conditional block for `reactVite` vs `angular` |
| `settings.json.hbs` | Updated allowed commands conditional on frontend type |
| `docker-compose.yml.hbs` | nginx service reused for React, identical to Angular block |
| `ci.yml.hbs` | Updated build/lint steps conditional on frontend type |
