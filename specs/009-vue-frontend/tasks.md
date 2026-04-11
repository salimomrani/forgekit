# Tasks: Vue.js Frontend Generator

**Input**: Design documents from `specs/009-vue-frontend/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, quickstart.md ✅

**Tests**: Included — TDD approach consistent with ForgeKit convention (Vitest unit + e2e).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in all descriptions

---

## Phase 1: Setup

**Purpose**: Extend type system and version resolver — foundational for all user stories.

- [x] T001 Add `"vue"` to `FrontendType` union in `src/types.ts`
- [x] T002 Add `vue`, `pinia`, `vueRouter` fields to `ResolvedVersions` interface, `FALLBACK_VERSIONS` object, and conditional fetch block (when `frontend === "vue"`) in `src/versions.ts`
- [x] T003 [P] Add `vue: "3.5.32"`, `pinia: "3.0.4"`, `vueRouter: "4.6.3"` to `BASE_VERSIONS` in `src/__tests__/fixtures.ts`

**Checkpoint**: `npm run build` must succeed before proceeding.

---

## Phase 2: Foundational (CLI Entry Points)

**Purpose**: Wire Vue.js into the CLI prompts and command dispatcher. Blocks all user story phases.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 [P] Add `{ name: "Vue.js (Vite + Tailwind)", value: "vue" }` to frontend `select()` choices in `src/prompts/project.ts`; add `else if (frontend === "vue") { uiFramework = "tailwind"; }` block (line ~196, matching React pattern)
- [x] T005 [P] Add `promptVue()` function in `src/prompts/add.ts` (auth-only prompt, identical structure to `promptAuth()`); add dispatcher `if (layer === "vue") return promptVue(defaults);`
- [x] T006 [P] Add `vue: { configField: "frontend", configValue: "vue", conflictGroup: "frontend" }` to `LAYER_CONFIG_MAP` in `src/commands/add.ts`; add `case "vue": await generateFrontend(projectDir, config, versions); break;` to `runLayerGenerator()` switch
- [x] T006b [P] Add `{ files: ["frontend/src/App.vue"], apply: (c) => { c.frontend = "vue"; } }` to `SENTINEL_MAP` in `src/utils/detect-project.ts`; also add `prisma: false` to `defaultConfig()` if not already present
- [x] T007 [P] Route `"vue"` to `generateVueFrontend()` in `src/generators/frontend/index.ts`; add `import { generateVueFrontend } from "./vue.js";`

**Checkpoint**: `npm run build` passes; Vue appears as a CLI option.

---

## Phase 3: User Story 1 — Core Vue.js Project Generation (Priority: P1) 🎯 MVP

**Goal**: Generate a complete, runnable Vue 3 SPA scaffold in `frontend/` including routing, Pinia store, Tailwind styling, and Layout components.

**Independent Test**: `forgekit new` → select Vue.js → `cd project/frontend && npm install && npm run build` exits 0; all 14 base files exist.

### Templates — US1 base (parallelizable)

- [x] T008 [P] [US1] Create `src/templates/frontend/vue/vite.config.ts.hbs` — `@vitejs/plugin-vue` + `@tailwindcss/vite` + `@` path alias via `fileURLToPath`
- [x] T009 [P] [US1] Create `src/templates/frontend/vue/tsconfig.json.hbs` — `"moduleResolution": "bundler"`, `"jsx": "preserve"`, `"jsxImportSource": "vue"`, `"paths": { "@/*": ["./src/*"] }`, references tsconfig.node.json
- [x] T010 [P] [US1] Create `src/templates/frontend/vue/tsconfig.node.json.hbs` — Node context for vite.config.ts (`"moduleResolution": "bundler"`, `"allowSyntheticDefaultImports": true`)
- [x] T011 [P] [US1] Create `src/templates/frontend/vue/index.html.hbs` — standard Vite HTML entry with `<div id="app">` and `<script type="module" src="/src/main.ts">`
- [x] T012 [P] [US1] Create `src/templates/frontend/vue/gitignore.hbs` — standard Vite/Node gitignore
- [x] T013 [P] [US1] Create `src/templates/frontend/vue/src/main.ts.hbs` — `createApp(App).use(createPinia()).use(router).mount('#app')`
- [x] T014 [P] [US1] Create `src/templates/frontend/vue/src/App.vue.hbs` — `<RouterView />` wrapped in Layout component
- [x] T015 [P] [US1] Create `src/templates/frontend/vue/src/index.css.hbs` — `@import "tailwindcss";`
- [x] T016 [P] [US1] Create `src/templates/frontend/vue/src/router/index.ts.hbs` — `createRouter(createWebHistory(...))` with home + 404 routes (lazy loaded)
- [x] T017 [P] [US1] Create `src/templates/frontend/vue/src/stores/app.ts.hbs` — `defineStore('app', () => { ... })` Composition API store with count ref and increment action
- [x] T018 [P] [US1] Create `src/templates/frontend/vue/src/components/Layout.vue.hbs` — wrapper with `<Header>` + `<slot>` (via RouterView) + `<Footer>`
- [x] T019 [P] [US1] Create `src/templates/frontend/vue/src/components/Header.vue.hbs` — responsive nav bar with project name `{{name}}`
- [x] T020 [P] [US1] Create `src/templates/frontend/vue/src/components/Footer.vue.hbs` — minimal footer

### Generator — US1

- [x] T021 [US1] Create `src/generators/frontend/vue.ts` — `VueGenerator extends BaseGenerator` with `buildPackageJson()` (vue, vue-router, pinia, @vitejs/plugin-vue, @tailwindcss/vite, typescript, vite) and `generate()` ensuring dirs + rendering all US1 templates + writing `package.json` via `fs.outputJson()`; add `export async function generateVueFrontend()`
- [x] T022 [US1] Add dispatch block in `src/commands/new.ts`: `else if (config.frontend === "vue") { ... }` with chalk progress + success message showing `versions.vue`

### Tests — US1

- [x] T023 [US1] Create `src/generators/frontend/__tests__/vue.test.ts` — unit tests: (a) all 14 base files exist: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `.gitignore`, `src/main.ts`, `src/App.vue`, `src/index.css`, `src/router/index.ts`, `src/stores/app.ts`, `src/components/Layout.vue`, `src/components/Header.vue`, `src/components/Footer.vue`; (b) `package.json` has `vue` dependency + `dev`/`build`/`lint` scripts + `vue` in `dependencies`, `vite` in `devDependencies`; (c) no auth files when `auth: false`
- [x] T024 [US1] Add e2e scenario S9 to `src/__tests__/e2e.test.ts`: Vue.js only — verify 6 key files exist + `package.json` contains `"vue"`

**Checkpoint**: `npm run test:unit` passes for vue generator. US1 independently deliverable.

---

## Phase 4: User Story 2 — Optional Authentication Scaffold (Priority: P2)

**Goal**: When `auth: true`, generate `ProtectedRoute.vue`, `composables/useAuth.ts`, `lib/http.ts`, and an auth-aware router.

**Independent Test**: Generate with `auth: true` → verify 3 auth files exist + auth router; generate with `auth: false` → verify none exist.

### Templates — US2 (parallelizable)

- [x] T025 [P] [US2] Create `src/templates/frontend/vue/src/router/index-auth.ts.hbs` — `createRouter` with navigation guard `router.beforeEach` checking auth state from Pinia store; redirects unauthenticated users to `/login`
- [x] T026 [P] [US2] Create `src/templates/frontend/vue/src/composables/useAuth.ts.hbs` — `useAuth()` composable using Pinia auth store; exposes `user`, `isAuthenticated`, `login()`, `logout()`
- [x] T027 [P] [US2] Create `src/templates/frontend/vue/src/lib/http.ts.hbs` — axios instance with request interceptor adding `Authorization: Bearer <token>` from Pinia auth store + 401 response interceptor redirecting to login
- [x] T028 [P] [US2] Create `src/templates/frontend/vue/src/components/ProtectedRoute.vue.hbs` — renders `<slot>` if authenticated, redirects to `/login` otherwise

### Generator — US2

- [x] T029 [US2] Update `src/generators/frontend/vue.ts` — add auth conditional block in `generate()`: when `config.auth`, ensure `composables/` and `lib/` dirs, render 3 auth templates + `index-auth.ts.hbs` instead of `index.ts.hbs` for router

### Tests — US2

- [x] T030 [US2] Update `src/generators/frontend/__tests__/vue.test.ts` — add tests: (a) auth files generated when `auth: true`, (b) no auth files when `auth: false`, (c) auth-aware router generated when `auth: true`

**Checkpoint**: Auth scaffold generated/excluded correctly. US2 independently testable.

---

## Phase 5: User Story 3 — CLI Integration (forgekit add, CI, Claude Code) (Priority: P2)

**Goal**: `forgekit add vue` works; CI job added; Claude Code allowed commands updated.

**Independent Test**: `forgekit add vue` on a backend-only project generates `frontend/`; adding vue to a project with an existing frontend fails.

### CI — US3

- [x] T031 [P] [US3] Update `src/generators/ci/index.ts` — add `const vue = this.config.frontend === "vue";` + pass `vue` in template data object
- [x] T032 [P] [US3] Update `src/templates/ci/ci.yml.hbs` — add `{{#if vue}}` frontend job: Node 22, `cache-dependency-path: frontend/package-lock.json`, `npm ci`, `npm run lint`, `npm run build` (no test step, same as reactVite)

### Claude Code — US3

- [x] T033 [P] [US3] Update `src/generators/claude-code/index.ts` — add `const vue = this.config.frontend === "vue";` + pass to template data + add allowed commands when `frontend === "vue"`: `Bash(npm run dev)`, `Bash(npm run build)`, `Bash(npm run lint)`, `Bash(npm install)`, `Bash(npm run)`

### Tests — US3

- [x] T034 [US3] Add e2e scenario S10 to `src/__tests__/e2e.test.ts`: Vue.js + Spring Boot + Docker + CI — verify `frontend/package.json` exists, `ci.yml` contains `frontend/package-lock.json`, `docker-compose.yml` contains `postgres:`

**Checkpoint**: Full CLI integration verified end-to-end.

---

## Phase 6: Polish & Verification

**Purpose**: Final build and all tests green.

- [x] T035 Run `npm run build` — zero TypeScript errors
- [x] T036 [P] Run `npm run test:unit` — all tests pass including new vue.test.ts
- [x] T037 [P] Run `npm run test:e2e` — S9 + S10 pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — 🎯 MVP
- **Phase 4 (US2)**: Depends on Phase 3 (generator file must exist to extend it)
- **Phase 5 (US3)**: Depends on Phase 2 (CI/Claude Code independent of US1 generator, but Vue must be wired into CLI)
- **Phase 6 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1 (P1)**: Core — must be done first
- **US2 (P2)**: Extends US1's `vue.ts` — must follow US1
- **US3 (P2)**: CI/Claude Code changes independent of US1/US2 generator logic; tests depend on US1

### Within Each User Story

- Templates [P] → Generator update → Tests
- All templates for a story are independent and can be created in parallel

### Parallel Opportunities

- T001, T002, T003 can run in parallel
- T008–T020 (US1 templates) all run in parallel
- T025–T028 (US2 templates) all run in parallel
- T031, T032, T033 (CI generator, CI template, Claude Code generator) all run in parallel — different files
- T036, T037 run in parallel

---

## Parallel Example: User Story 1

```bash
# All US1 templates can be created simultaneously:
T008: src/templates/frontend/vue/vite.config.ts.hbs
T009: src/templates/frontend/vue/tsconfig.json.hbs
T010: src/templates/frontend/vue/tsconfig.node.json.hbs
T011: src/templates/frontend/vue/index.html.hbs
T012: src/templates/frontend/vue/gitignore.hbs
T013: src/templates/frontend/vue/src/main.ts.hbs
T014: src/templates/frontend/vue/src/App.vue.hbs
T015: src/templates/frontend/vue/src/index.css.hbs
T016: src/templates/frontend/vue/src/router/index.ts.hbs
T017: src/templates/frontend/vue/src/stores/app.ts.hbs
T018: src/templates/frontend/vue/src/components/Layout.vue.hbs
T019: src/templates/frontend/vue/src/components/Header.vue.hbs
T020: src/templates/frontend/vue/src/components/Footer.vue.hbs

# Then sequentially:
T021: src/generators/frontend/vue.ts        (needs templates)
T022: src/commands/new.ts                   (needs generator)
T023: __tests__/vue.test.ts                 (needs generator)
T024: e2e.test.ts                           (needs generator)
```

---

## Implementation Strategy

### MVP (User Story 1 only — Phases 1–3)

1. Complete Phase 1: Types + Versions + Fixture updates
2. Complete Phase 2: CLI entry points
3. Complete Phase 3: Core generator + templates
4. **VALIDATE**: `npm run build` + `npm run test:unit` + manual generation test
5. MVP deliverable: `forgekit new` works with Vue.js frontend

### Incremental Delivery

1. Phases 1–3 → Core Vue.js generator
2. Phase 4 → Add auth option
3. Phase 5 → CI + Claude Code integration
4. Phase 6 → Final verification

---

## Notes

- [P] = different files, no inter-task dependencies, safe to dispatch in parallel
- Constitution rule 2: `package.json` built programmatically in `buildPackageJson()` — no Handlebars JSON template
- Constitution rule 7: `BASE_VERSIONS` in `src/__tests__/fixtures.ts` must include `vue`, `pinia`, `vueRouter`
- Layer key in `add.ts` is `"vue"` (not `"vue-vite"`) — maps to `configValue: "vue"` in `FrontendType`
- Vue Router v4 chosen (not v5 — still in early release)
- `tsconfig.node.json` is required by Vite's standard Vue scaffold (referenced from `tsconfig.json`)
