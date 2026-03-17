# Tasks: React/Vite Layout — Header & Footer

**Feature**: 003-react-layout
**Spec**: [spec.md](./spec.md)
**Total tasks**: 9
**Parallel opportunities**: T001, T002, T003 (all new templates); T007, T008 (router updates)

---

## Phase 1 — New Handlebars Templates

Create the 3 new template files. All are independent and can be written in parallel.

- [x] T001 [P] Create `src/templates/frontend/react-vite/src/components/Header.tsx.hbs` — renders project name, nav Home link, conditional login/logout button when `{{#if auth}}`
- [x] T002 [P] Create `src/templates/frontend/react-vite/src/components/Footer.tsx.hbs` — renders `© {year} {name}`, three static anchor placeholders (Docs `#`, GitHub `#`, Privacy Policy `#`)
- [x] T003 [P] Create `src/templates/frontend/react-vite/src/components/Layout.tsx.hbs` — imports Header and Footer, renders `<Header /><main><Outlet /></main><Footer />` using React Router `<Outlet />`

---

## Phase 2 — Router Template Updates

Update both router templates to use the Layout as a parent route.

- [x] T004 [P] Update `src/templates/frontend/react-vite/src/router/index.tsx.hbs` — add Layout as parent route wrapping the `App` child route
- [x] T005 [P] Update `src/templates/frontend/react-vite/src/router/index-auth.tsx.hbs` — add Layout as parent route wrapping the `ProtectedRoute > App` child route

---

## Phase 3 — Generator Update

Wire the new templates into the generator so they are written for every project.

- [x] T006 Create `src/components/` dir (always, not just when auth) in `src/generators/frontend/react-vite.ts` — move `ensureDirs` for `components` out of the `if (this.config.auth)` block
- [x] T007 Add `renderAndWrite` calls for `Header.tsx`, `Footer.tsx`, and `Layout.tsx` in the main `Promise.all` in `src/generators/frontend/react-vite.ts` — always generated, auth data passed via template data object

---

## Phase 4 — Tests

Update and extend tests to cover the new files.

- [x] T008 Update `src/generators/frontend/__tests__/react-vite.test.ts` — add assertions that `Header.tsx`, `Footer.tsx`, and `Layout.tsx` are written for both auth and non-auth projects; assert router file references Layout

---

## Phase 5 — Validation

- [x] T009 Run `npm test` and `npm run typecheck` and confirm all pass with no regressions

---

## Dependencies

```
T001 ──┐
T002 ──┤─→ T003 ─→ T004, T005 ─→ T006 ─→ T007 ─→ T008 ─→ T009
T003 ──┘
```

T001–T003 are parallel. T004–T005 depend on T003 existing. T006–T007 can proceed once template files exist. T008 after T007. T009 last.

---

## Implementation Notes

- Template data object already contains `name` (projectName) — use `{{name}}` in templates for both project name and copyright.
- Auth conditionality: use `{{#if auth}}` Handlebars helper in `Header.tsx.hbs`. Pass `auth: this.config.auth` in the data object in the generator.
- Year in Footer: hardcode `new Date().getFullYear()` evaluated at generation time — pass as `year` in data object.
- `<Outlet />` import: from `'react-router'` (already a dependency).
- The `components/` dir must be created unconditionally (T006) since Layout/Header/Footer are always generated.
