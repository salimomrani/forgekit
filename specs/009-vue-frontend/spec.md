# Feature Specification: Vue.js Frontend Generator

**Feature Branch**: `009-vue-frontend`
**Created**: 2026-04-11
**Status**: Draft
**Input**: User description: "Ajouter Vue.js (Vite + TypeScript + Tailwind + Pinia) comme 3e option frontend dans ForgeKit CLI."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Core Vue.js Project Generation (Priority: P1)

A developer selects Vue.js as the frontend when creating a new project with ForgeKit. The tool generates a complete, runnable Vue 3 SPA scaffold in the `frontend/` directory, including routing, state management (Pinia), and Tailwind styling — ready to start development immediately.

**Why this priority**: This is the minimum viable feature. Without the base generation working, no other user story is deliverable.

**Independent Test**: Run `forgekit new` → select Vue.js → `cd project/frontend && npm install && npm run build` succeeds with zero errors. A `frontend/` directory exists with all expected files.

**Acceptance Scenarios**:

1. **Given** a developer runs `forgekit new`, **When** they select Vue.js as frontend, **Then** a `frontend/` directory is created containing `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, and a `src/` directory with `main.ts`, `App.vue`, router, Pinia store, and Layout/Header/Footer components.
2. **Given** the generated project, **When** the developer runs the install and build commands, **Then** the build succeeds with no errors.
3. **Given** a project with any backend (Spring Boot, FastAPI, Laravel, Next.js, or none), **When** Vue.js frontend is generated, **Then** it coexists without conflict in the `frontend/` directory.

---

### User Story 2 — Optional Authentication Scaffold (Priority: P2)

A developer who needs authentication enables the auth option during project creation. ForgeKit generates a protected-route pattern, an auth composable, and an HTTP client with bearer token interceptor — ready to connect to any backend API.

**Why this priority**: Auth is the most common feature added after the base scaffold; having it pre-wired saves significant boilerplate.

**Independent Test**: Generate with auth enabled → verify `ProtectedRoute.vue`, `composables/useAuth.ts`, and `lib/http.ts` exist; generate without auth → verify these files are absent.

**Acceptance Scenarios**:

1. **Given** a developer selects Vue.js with auth enabled, **When** the project is generated, **Then** `ProtectedRoute.vue`, `composables/useAuth.ts`, `lib/http.ts`, and an auth-aware router are present.
2. **Given** a developer selects Vue.js without auth, **When** the project is generated, **Then** none of the auth-specific files exist.
3. **Given** the generated auth scaffold, **When** the developer reviews the router config, **Then** protected routes require authentication and redirect unauthenticated users to a login page.

---

### User Story 3 — CLI Integration (forgekit add, CI, Claude Code) (Priority: P2)

A developer using `forgekit add vue` on an existing project gets the Vue.js frontend layer added. CI pipelines and Claude Code configuration are also updated to support the Vue.js workflow.

**Why this priority**: Consistency with other generators (Angular, React). A frontend layer must be addable independently to any project.

**Independent Test**: Run `forgekit add vue` on a backend-only project → `frontend/` directory appears with all expected files; running `forgekit add vue` on a project already having a frontend fails with a conflict error.

**Acceptance Scenarios**:

1. **Given** a project with only a backend, **When** the developer runs `forgekit add vue`, **Then** the Vue.js frontend is generated and the project manifest is updated.
2. **Given** a project already having a frontend, **When** `forgekit add vue` is run, **Then** the command exits with an error and makes no changes.
3. **Given** Vue.js frontend is generated with CI enabled, **When** the CI workflow is inspected, **Then** a frontend job exists that installs dependencies, lints, and builds the frontend.
4. **Given** Vue.js frontend with Claude Code config, **When** settings are inspected, **Then** Vue.js dev commands (`npm run dev`, `npm run build`, `npm run lint`) are listed as allowed commands.

---

### Edge Cases

- What happens when a project already has an Angular or React frontend and the user tries `forgekit add vue`? → The command must fail with a clear conflict error, making no changes.
- What happens if the user selects Vue.js as frontend with no backend? → A frontend-only project is generated correctly (no `backend/` directory).
- What if the `frontend/` directory already exists? → The generator should fail fast and roll back (ForgeKit's standard fail-fast behaviour).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The CLI MUST offer "Vue.js" as a selectable frontend option during `forgekit new` project creation.
- **FR-002**: The CLI MUST offer "Vue.js" as an addable layer via `forgekit add vue`.
- **FR-003**: When Vue.js is selected, the system MUST generate a complete project scaffold in `frontend/` containing: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, and a `src/` directory.
- **FR-004**: The generated `src/` directory MUST include: `main.ts`, `App.vue`, `index.css`, a router module, a Pinia store, and Layout/Header/Footer components.
- **FR-005**: Pinia state management MUST always be included — it is not optional.
- **FR-006**: Tailwind CSS MUST always be included — no UI framework selection is presented to the user.
- **FR-007**: When `auth` is enabled, the system MUST generate `ProtectedRoute.vue`, `composables/useAuth.ts`, `lib/http.ts`, and an auth-aware router with navigation guards.
- **FR-008**: When `auth` is disabled, none of the auth-specific files MUST be present.
- **FR-009**: Adding Vue.js to a project that already has any frontend MUST fail with an error and make no changes.
- **FR-010**: When CI generation is enabled alongside Vue.js frontend, the generated CI workflow MUST include a frontend job that installs dependencies, lints, and builds the project.
- **FR-011**: When Claude Code config is generated alongside Vue.js frontend, the allowed commands MUST include the standard Vue/npm development commands.
- **FR-012**: The Vue.js frontend MUST be compatible (no file conflicts) with all existing backend types: Spring Boot, FastAPI, Laravel, Next.js, and no backend.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can generate a complete Vue.js frontend project in under 5 seconds on a standard machine.
- **SC-002**: 100% of generated projects build successfully (`npm run build` exits 0) without any additional manual setup.
- **SC-003**: Developers can choose Vue.js as a frontend option in the same number of steps as Angular or React — no additional prompts or decisions required beyond the auth checkbox.
- **SC-004**: Adding Vue.js to any existing backend-only project succeeds on the first attempt without manual file editing.
- **SC-005**: All existing Angular and React generation scenarios continue to pass without regression after Vue.js is added.

---

## Assumptions

- Vue 3 (Composition API) is the only supported Vue version — Vue 2 is not in scope.
- The auth scaffold provides structure only (composable + HTTP client + protected route) — it does not implement a specific auth provider.
- `vue-router` (v4) and `pinia` are always included in the generated `package.json`, regardless of auth selection.
- The frontend is not containerized (no Dockerfile for frontend) — consistent with Angular and React/Vite behaviour.
- Versions for `vue`, `pinia`, and `vue-router` are resolved from npm at generation time, with fallbacks for offline use.
