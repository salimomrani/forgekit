# Tasks: React/Vite Frontend Option

**Feature**: 002-react-vite-frontend
**Plan**: specs/002-react-vite-frontend/plan.md
**Date**: 2026-03-17

---

## Phase 1 — Setup (Foundation)

Type system and version resolver — everything else depends on these.

- [ ] T001 Extend `FrontendType = "angular" | "react-vite" | null` and replace `frontend: boolean` with `frontend: FrontendType` in `src/types.ts` (use `null` for consistency with `BackendType`)
- [ ] T002 Add `react`, `reactRouter`, `vite`, `axiosReact` fields to `ResolvedVersions` interface, add npm fetches (conditional on `frontend === "react-vite"`), and add fallback values in `src/versions.ts`

---

## Phase 2 — Foundational: React Base Templates

All templates are independent files — parallelizable. Required before ReactViteGenerator can render.

- [ ] T003 [P] Create `src/templates/frontend/react-vite/vite.config.ts.hbs` (Vite 6 + `@vitejs/plugin-react` + `@tailwindcss/vite`, dev port 4200)
- [ ] T004 [P] Create `src/templates/frontend/react-vite/tsconfig.json.hbs` (strict, ES2022, bundler module resolution, JSX react-jsx)
- [ ] T005 [P] Create `src/templates/frontend/react-vite/tailwind.config.ts.hbs` (Tailwind v4, content glob `./src/**/*.{ts,tsx}`)
- [ ] T006 [P] Create `src/templates/frontend/react-vite/index.html.hbs` (entry point, `<div id="root">`, title `{{name}}`)
- [ ] T007 [P] Create `src/templates/frontend/react-vite/gitignore.hbs` (node_modules, dist, .env*)
- [ ] T008 [P] Create `src/templates/frontend/react-vite/src/main.tsx.hbs` (ReactDOM.createRoot, RouterProvider)
- [ ] T009 [P] Create `src/templates/frontend/react-vite/src/App.tsx.hbs` (functional component, Tailwind welcome page)
- [ ] T010 [P] Create `src/templates/frontend/react-vite/src/index.css.hbs` (@import "tailwindcss")
- [ ] T011 [P] Create `src/templates/frontend/react-vite/src/router/index.tsx.hbs` (createBrowserRouter, root route → App — no conditionals, pure static content)
- [ ] T011b [P] Create `src/templates/frontend/react-vite/src/router/index-auth.tsx.hbs` (createBrowserRouter, root route wrapped in ProtectedRoute — no conditionals, pure static content)

---

## Phase 3 — US2: React/Vite Project (No Auth)

**Story goal**: `forgekit new my-app` with React (Vite) selected generates a working SPA that starts with `npm run dev`.

**Independent test criteria**:
- Generated `frontend/` contains `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `index.html`, `src/main.tsx`
- `npm run dev` starts without error
- `npm run build` produces `dist/` without error
- No Angular files present

- [ ] T012 [US2] Create `src/generators/frontend/react-vite.ts` with `ReactViteGenerator` class: `buildPackageJson()` + `generate()` rendering all base templates from Phase 2 via `Promise.all()`
- [ ] T013 [US2] Update `src/generators/frontend/index.ts`: rename Angular export to `generateAngularFrontend`, add `generateReactViteFrontend`, update `generateFrontend` to dispatch based on `config.frontend`
- [ ] T014 [US2] Update `src/prompts/project.ts`: replace `confirm("Inclure le frontend Angular ?")` with `select<FrontendType>` (Angular / React Vite / None); gate PrimeNG and NgRx questions inside `if (frontendChoice === "angular")`; auto-set `uiFramework = "tailwind"` when `"react-vite"`
- [ ] T015 [US2] Update `src/commands/new.ts`: add `--react` / `--no-react` flags, update `frontend` default handling from boolean to `FrontendType`, update success message next-steps for React (`npm run dev` instead of `ng serve`)

---

## Phase 4 — US3: React/Vite Project with Auth

**Story goal**: When auth is enabled with React (Vite), `useAuth` hook, `ProtectedRoute`, and preconfigured axios instance are generated.

**Independent test criteria**:
- Generated `frontend/src/hooks/useAuth.ts` exports `useAuth()`
- Generated `frontend/src/components/ProtectedRoute.tsx` redirects unauthenticated users
- Generated `frontend/src/lib/http.ts` exports axios instance with Bearer interceptor
- Router wraps root route in `ProtectedRoute`

- [ ] T016 [P] [US3] Create `src/templates/frontend/react-vite/src/hooks/useAuth.ts.hbs` (useState token from localStorage, login/logout functions)
- [ ] T017 [P] [US3] Create `src/templates/frontend/react-vite/src/components/ProtectedRoute.tsx.hbs` (useAuth, Navigate to `/` if not authenticated — no login page scaffolded)
- [ ] T018 [P] [US3] Create `src/templates/frontend/react-vite/src/lib/http.ts.hbs` (axios.create with baseURL from VITE_API_URL, request interceptor adds Authorization Bearer header)
- [ ] T019 [US3] Update `ReactViteGenerator.generate()` in `src/generators/frontend/react-vite.ts`: select `router/index-auth.tsx.hbs` when `config.auth === true`, `router/index.tsx.hbs` otherwise — no template conditionals
- [ ] T020 [US3] Update `ReactViteGenerator.generate()` in `src/generators/frontend/react-vite.ts`: when `config.auth === true`, render auth templates (T016–T018) in a second `Promise.all()`, creating `hooks/`, `components/`, `lib/` directories

---

## Phase 5 — US4/US5/US6: Infrastructure Integration

**Story goal**: React/Vite projects integrate correctly with Claude Code config, CI, and Docker across all backend combinations.

**Independent test criteria**:
- Generated `CLAUDE.md` contains React block when `frontend === "react-vite"`
- Generated `.github/workflows/ci.yml` contains React lint + build job when `frontend === "react-vite"`
- `docker-compose.yml` includes nginx service when `frontend !== false`

- [ ] T021 [US4] Update `src/generators/claude-code/index.ts`: add derived `reactVite = config.frontend === "react-vite"` to template data; add React-specific allowed commands (`Bash(npm run dev)`, `Bash(npm run build)`, `Bash(npm run lint)`) when `reactVite`; pass `reactVite` and `angular` booleans to template data
- [ ] T022 [P] [US4] Update `src/templates/claude-code/CLAUDE.md.hbs`: rename `{{#if frontend}}` to `{{#if hasFrontend}}`; add `{{#if reactVite}}` block with React architecture, conventions reference to `applying-react-conventions`, and dev commands
- [ ] T023 [P] [US4] Update `src/templates/claude-code/rules/frontend.md.hbs`: add `{{#if reactVite}}` block referencing React conventions; gate Angular-specific content inside `{{#if angular}}`
- [ ] T024 [P] [US5] Update `src/templates/ci/ci.yml.hbs`: add `{{#if reactVite}}` frontend job running `npm ci`, `npm run lint`, `npm run build` in `working-directory: frontend`
- [ ] T025 [US6] Verify `src/templates/docker/docker-compose.yml.hbs`: confirm nginx service gate uses `hasFrontend` (or equivalent boolean that covers both `"angular"` and `"react-vite"`); update generator data if needed

---

## Phase 6 — Polish & Tests

- [ ] T026 Update all Vitest fixture objects in `src/generators/**/__tests__/` that declare `frontend: boolean` to use `FrontendType` (declare all required fields per constitution §7)
- [ ] T027 [P] Add unit test for `ReactViteGenerator` in `src/generators/frontend/__tests__/react-vite.test.ts`: verify base files are written; verify auth files written when `auth: true`; verify auth files absent when `auth: false`
- [ ] T028 [P] Add unit test for `generateFrontend` router in `src/generators/frontend/__tests__/index.test.ts`: verify Angular generator called for `"angular"` (US1 regression), React generator called for `"react-vite"`, neither called for `null` and no files created (US7)
- [ ] T029 Run `npm test` and `npm run typecheck` and `npm run lint` — all must pass before PR

---

## Dependencies

```
T001 → T002 → T003–T011 (parallel)
T003–T011 → T012
T012 → T013 → T014 → T015   (US2 complete)
T015 → T016–T018 (parallel) → T019 → T020   (US3 complete)
T001 → T021 → T022, T023 (parallel)
T001 → T024
T001 → T025
T020, T022, T023, T024, T025 → T026 → T027, T028 (parallel) → T029
```

---

## Parallel Execution

**Batch A** (after T002): T003, T004, T005, T006, T007, T008, T009, T010, T011 — 9 templates in parallel

**Batch B** (after T015): T016, T017, T018 — 3 auth templates in parallel

**Batch C** (after T021): T022, T023, T024 — 3 template updates in parallel

**Batch D** (after T026): T027, T028 — 2 test files in parallel

---

## Implementation Strategy

**MVP** (US2 only — T001 to T015): React/Vite project generates and runs. No auth, no CI update, no Docker change. Validates the core type migration and generator architecture.

**Full delivery**: All 29 tasks. Enables auth scaffold, CI integration, Claude Code conventions, and Docker nginx for React.

---

## Summary

| Phase | Tasks | Parallelizable |
|---|---|---|
| Setup | 2 | 0 |
| Foundational templates | 9 | 9 |
| US2 — React no auth | 4 | 0 |
| US3 — React with auth | 5 | 3 |
| US4/5/6 — Infrastructure | 5 | 3 |
| Polish & Tests | 4 | 2 |
| **Total** | **29** | **17** |
