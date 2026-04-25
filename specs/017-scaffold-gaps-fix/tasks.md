---

description: "Task list for 017-scaffold-gaps-fix — verified 1.29.0 audit fixes"
---

# Tasks: Scaffold gaps fix (1.29.0 audit)

**Input**: Design documents from `/Users/salimomrani/code/_AI/forgekit/specs/017-scaffold-gaps-fix/`
**Prerequisites**: spec.md (required), plan.md (required). No research.md / data-model.md / contracts/ — `plan-detail=low`.

**Tests**: tests=true, **tdd=false** → implementation file written first, Vitest unit tests written **immediately after in the same task** (no separate RED-first task per skill exception under fast-mode). Constitution rule #7 enforced: any change to a typed config object (`ProjectConfig`, `ResolvedVersions`) updates **all** existing fixtures in the same task — no partial fixtures.

**Organization**: Tasks are grouped by user story (matches spec.md priorities P1–P3). Setup and Foundational phases are intentionally empty — this feature ships against an existing 17-feature repo with no infrastructure to bootstrap.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: file-disjoint with other [P]-marked tasks in this list (could run in parallel if staffed)
- **[Story]**: maps to user stories from spec.md (US1–US6)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: none — this feature lands on an established repo with no project init or new tooling. No tasks.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: none — `ProjectConfig` and `ResolvedVersions` extensions live inside the user-story tasks that need them (T001 adds `angularCli`, T003 adds `database`). Each of those tasks updates **all** existing fixtures in the same commit per Constitution rule #7.

---

## Phase 3: User Story 1 — Default scaffold installs without manual fixes (Priority: P1) 🎯 MVP

**Goal**: `forgekit new <name> --spring-boot --angular` produces a project where `npm install` (frontend) and `mvn -DskipTests install` (backend) both exit 0 on a fresh machine.

**Independent Test**: From a clean checkout, run `forgekit new demo --spring-boot --angular` then `cd demo/frontend && npm install --no-audit` — must exit 0 with no `ETARGET` and no `ERESOLVE` errors.

### Implementation for User Story 1

- [x] T001 [P] [US1] **FR-1 (versions caps)** — In `src/versions.ts`: (a) add `angularCli: string` to the `ResolvedVersions` interface and to `FALLBACK_VERSIONS` (with a renovate datasource comment matching the existing pattern), (b) inside the `if (opts.frontend === "angular")` block, add `fetchNpmVersion("@angular/cli").then(set("angularCli"))` to the `tasks` array, (c) add a TypeScript cap mirroring the vite cap at `versions.ts:269` — when `frontend === "angular"`, override the `set("typescript")` callback so a fetched value starting with `6.` (or higher) is rejected and the fallback `5.9.0` is kept. In `src/templates/frontend/package.json.hbs:32`, change `"@angular/cli": "^{{versions.angular}}"` to `"@angular/cli": "^{{versions.angularCli}}"`. **Fixture rule #7**: update every `ResolvedVersions` literal across the test suite (find with `grep -rln "FALLBACK_VERSIONS\|ResolvedVersions" src/`) so each one declares `angularCli`. Add Vitest unit tests in `src/__tests__/versions.test.ts` covering: (i) `@angular/cli` is fetched separately and may differ from `@angular/core`, (ii) when the fetched typescript version is `6.0.0`, the resolved value stays `<6.0` for Angular projects but is unrestricted for non-Angular frontends, (iii) silent fallback path (mocked `fetch` returning `null`) leaves `versions.angularCli === FALLBACK_VERSIONS.angularCli` and never throws.

**Checkpoint**: After T001, `forgekit new demo --spring-boot --angular` should produce a `frontend/package.json` whose `npm install` succeeds.

---

## Phase 4: User Story 2 — `--ui none` produces a project that builds and looks correct (Priority: P1)

**Goal**: `forgekit add angular --ui none` emits no PrimeNG/primeflex assets and no `--p-*` CSS tokens; the resulting project builds with `ng build` and renders neutral, working visuals.

**Independent Test**: `forgekit add angular --ui none` then `cd frontend && npm install --no-audit && npx ng build` — exit 0 with no PrimeNG packages in `package.json` and zero `--p-` matches in `dist/**/*.css`.

### Implementation for User Story 2

- [x] T002 [US2] **FR-2 (UI gating)** — In `src/generators/frontend/index.ts`, build the `angular.json` `styles[]` array as a plain string array on the generator side (driven by `config.uiFramework`): when UI is PrimeNG, include `node_modules/primeicons/primeicons.css`, `node_modules/primeflex/primeflex.css`, `src/styles.scss`; when UI is none/tailwind, include only `src/styles.scss` (or its CSS counterpart). In the generator, build `stylesJson = JSON.stringify(styles, null, 14)` (or whatever indent matches the existing `angular.json.hbs` block — verify by inspecting the file) and pass it as a single flat string field. In `src/templates/frontend/angular.json.hbs:21-24`, replace the hard-coded `styles[]` lines with a single triple-stash `{{{stylesJson}}}` placeholder at the correct indentation. No Handlebars logic over the array (Constitution rule #2). In each of `src/templates/frontend/home.component.ts.hbs`, `layout.component.ts.hbs`, `topbar.component.ts.hbs`, `sidebar.component.ts.hbs`, wrap every block that emits `--p-surface-*` / `--p-primary-color` / `--p-text-color` / `--p-*` tokens inside `{{#if uiPrimeNG}}…{{/if}}` (mirror the gating pattern already used in `styles.scss.hbs`). Provide an alternate neutral declaration inside `{{#if uiNone}}` (sans-serif font, default colours — mirror styles.scss `uiNone` block). Add Vitest tests in `src/generators/frontend/__tests__/index.test.ts` (or a new sibling) that render the generator with `uiFramework: 'primeng'`, then `'none'`, parse the produced `angular.json`, and assert the `styles` array shape; render each of the 4 component templates with `uiNone: true` and assert the rendered output contains zero `--p-` substrings.

**Checkpoint**: After T002, `forgekit add angular --ui none` produces a project where `ng build` exits 0 and no `--p-*` token reaches `dist/`.

---

## Phase 5: User Story 3 — Backend without a database boots cleanly (Priority: P1)

**Goal**: `forgekit add spring-boot --database none` produces a backend that starts via `./mvnw spring-boot:run` with no database server on the host.

**Independent Test**: `forgekit add spring-boot --database none && cd backend && ./mvnw spring-boot:run &` — within 60 s the process listens on the configured port; `pom.xml` contains zero matches of `data-jpa`, `postgresql`, `flyway`.

### Implementation for User Story 3

- [x] T003 [US3] **FR-3 (database opt-out)** — In `src/types.ts`, add `database: 'postgres' | 'none'` to `ProjectConfig`. **Fixture rule #7**: update every `ProjectConfig` literal across the test suite (`grep -rln "ProjectConfig\b" src/__tests__ src/generators src/commands`) to declare `database`. In `src/templates/backend/pom.xml.hbs`, gate the `spring-boot-starter-data-jpa` dependency (lines 36-39), the `org.postgresql:postgresql` dependency (lines 55-60), and the existing flyway block (lines 61-70) inside a single `{{#if databasePostgres}}…{{/if}}` block. In `src/templates/backend/application.yml.hbs` and `application-dev.yml.hbs`, gate the `spring.datasource.*` and `spring.flyway.*` keys behind the same flag. In `src/generators/backend/index.ts`, derive `databasePostgres = config.database === 'postgres'` and `flyway = config.flyway && databasePostgres` (forces flyway off when database is none — FR-3.4) and pass both to the template data. In `src/commands/new.ts` and `src/commands/add.ts`, add `.option("--database <type>", "Type de base de données (postgres, none)", "postgres")` and an Inquirer prompt with the two choices defaulting to `postgres`; thread the value through `defaults`/`updatedConfig`/`LAYER_CONFIG_MAP` per the project's auto-memory checklist. Default behaviour with no flag must remain `database: 'postgres'` so output is byte-identical to today (FR-3.5). Add Vitest tests in `src/generators/backend/__tests__/` rendering `pom.xml.hbs` and `application.yml.hbs` with `database: 'none'` and `database: 'postgres'`, asserting presence/absence of the gated dependencies and config keys; add a regression case asserting that `flyway: true` + `database: 'none'` resolves to flyway off (no flyway-core in pom).

**Checkpoint**: After T003, all three P1 stories are complete and the MVP slice ships. Hold/deploy here for an interim release if desired.

---

## Phase 6: User Story 4 — Non-interactive callers get predictable output (Priority: P2)

**Goal**: `--no-auth`, `--yes`, and non-TTY stdin all produce deterministic, prompt-free runs with sane defaults.

**Independent Test**: `yes | forgekit add angular --no-auth` from a non-TTY shell completes without prompts and produces a project with no auth files; `forgekit add angular --yes` from a TTY runs with no confirmation prompt.

### Implementation for User Story 4

- [x] T004 [US4] **FR-4 (non-interactive UX)** — In `src/commands/add.ts` and `src/commands/new.ts`: (a) replace `.option("--auth", ...)` with `.option("--auth", "Inclure l'authentification").option("--no-auth", "Exclure l'authentification")` so Commander generates the boolean negation, (b) add `.option("-y, --yes", "Skip all confirmation prompts and use defaults", false)`, (c) compute `nonInteractive = options.yes === true || !process.stdin.isTTY` once per command entry point, (d) at every existing Inquirer call site, when `nonInteractive` is true, skip the prompt and apply the configured default (the value already in `defaults`/`config`). Inline the TTY check at both call sites — do not extract a helper (only 2 callsites today; Constitution rule #6). The final confirmation prompt ("Is this correct?") is also skipped when `nonInteractive`. Add Vitest tests in `src/commands/__tests__/` (create the dir if absent) that: (i) parse the Commander program with `['--no-auth']` argv and assert `options.auth === false`, (ii) parse with `['--yes']` and assert `options.yes === true`, (iii) mock `process.stdin.isTTY = false` and a default `ProjectConfig` and confirm the auth prompt is skipped (use Inquirer's prompt registry or a lightweight stub).

**Checkpoint**: After T004, CI pipelines and AI agents can drive ForgeKit without any interactive workaround.

---

## Phase 7: User Story 5 — `ng test` works on a fresh project (Priority: P2)

**Goal**: A freshly scaffolded Angular project's `npm test` exits 0 with at least one passing spec.

**Independent Test**: `forgekit add angular && cd frontend && npm install --no-audit && npm test --silent` exits 0.

### Implementation for User Story 5

- [x] T005 [US5] **FR-5 (Angular test target)** — In `src/templates/frontend/angular.json.hbs`, add a `"test"` architect target using `@angular/build:karma` (Angular 21+ ships the unified `@angular/build` builder for Karma) with `polyfills: ["zone.js", "zone.js/testing"]`, `tsConfig: "tsconfig.spec.json"`, and a `"styles"` reference pointing at the same flat array used by `build` (reuse the placeholder introduced in T002). In `src/templates/frontend/package.json.hbs` `devDependencies`, **hard-pin** Karma deps directly in the template (no `versions.*` plumbing — these versions move slowly and 7 new fields would bloat `ResolvedVersions` for marginal benefit; rule #6 supports this choice): `karma`, `karma-chrome-launcher`, `karma-coverage`, `karma-jasmine`, `karma-jasmine-html-reporter`, `jasmine-core`, `@types/jasmine`. Add a renovate annotation comment per pin (`// renovate: datasource=npm depName=<pkg>`) so version bumps still flow through the existing automation. Hard-pinning these is **more** robust under network failure than fetching (rule #5), since the values are always present in the generated `package.json`. Create `src/templates/frontend/tsconfig.spec.json.hbs` with `extends: "./tsconfig.json"`, `compilerOptions.types: ["jasmine"]`, `include: ["src/**/*.spec.ts", "src/**/*.d.ts"]`. Create `src/templates/frontend/karma.conf.js.hbs` (only if Angular 21 still requires it — verify against `@angular/build:karma` v21 docs at implementation time; the modern builder may auto-configure). Create `src/templates/frontend/app.spec.ts.hbs` with one Jasmine spec asserting truthiness (e.g. `expect(true).toBe(true)`). Wire the new templates into `src/generators/frontend/index.ts` write batch (Promise.all per Constitution rule #10). Add a Vitest unit test in `src/generators/frontend/__tests__/` confirming the new template files are emitted and the generated `angular.json` contains a `test` target.

**Checkpoint**: After T005, `npm test` works out of the box on every freshly scaffolded Angular project.

---

## Phase 8: User Story 6 — Cross-layer dev-server proxy (Priority: P3)

**Goal**: When both a backend and an Angular frontend are scaffolded, `frontend/proxy.conf.json` exists and `angular.json` references it; `ng serve` routes `/api/**` to the backend.

**Independent Test**: `forgekit new demo --spring-boot --angular`, start backend on 8080, run `ng serve` in `frontend/`, hit `http://localhost:4200/api/health` — request reaches backend.

### Implementation for User Story 6

- [x] T006 [US6] **FR-6 (cross-layer proxy)** — Create `src/templates/frontend/proxy.conf.json.hbs` containing a single mapping object: `{"/api/**": {"target": "http://localhost:{{backendPort}}", "secure": false, "changeOrigin": true, "logLevel": "debug"}}`. In `src/generators/frontend/index.ts`, define an inline literal `Record<BackendType, number>` (`{ "spring-boot": 8080, "fastapi": 8000, "nestjs": 3000, "nextjs": 3000, "laravel": 8000 }`) — do not extract a helper (rule #6, single callsite). When `config.backendType !== null`, add the proxy template render to the existing Promise.all I/O batch with `backendPort` resolved from the map, and set a `proxyConfig: 'proxy.conf.json'` flag in the data passed to `angular.json.hbs`. When `config.backendType === null`, do not emit the proxy file and pass `proxyConfig: null`. In `src/templates/frontend/angular.json.hbs`, inside the `serve.options` block (currently absent — add it), conditionally emit `"proxyConfig": "proxy.conf.json"` driven by the new flag (Handlebars `{{#if proxyConfig}}` over a single property is acceptable as it consumes flat data; alternatively, build the entire `serve` block on the generator side and triple-stash it for full rule #2 conformance — pick the path that keeps the diff smallest). Add Vitest tests in `src/generators/frontend/__tests__/` covering: (i) each `backendType` value emits `proxy.conf.json` with the matching port, (ii) `backendType: null` does NOT emit the file and `angular.json` stays without `proxyConfig`.

**Checkpoint**: After T006, all six in-scope FRs ship.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T007 **Verification** — Run the full suite: `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`. Resolve any regressions surfaced by the new fields in `ProjectConfig` / `ResolvedVersions`. Run an end-to-end smoke: `node dist/index.js new /tmp/forgekit-smoke-$$ --spring-boot --angular` followed by `cd /tmp/forgekit-smoke-$$/frontend && npm install --no-audit --prefer-offline && npm run build && npm test --silent` — all must exit 0. Repeat with `--ui none`, `--database none`, and a non-TTY invocation. Capture the smoke results in the PR description (per `verification-before-completion` evidence requirement).

---

## Dependencies & Execution Order

### Phase Dependencies

- Phases 1 and 2 are empty — start at Phase 3.
- Phases 3 (T001), 4 (T002), 5 (T003) are all P1 stories and pairwise independent **at the spec level**, but at the **file level** T002 / T005 / T006 all touch `src/templates/frontend/angular.json.hbs` and T001 / T005 touch `src/templates/frontend/package.json.hbs`. Order T002 before T005 before T006 to keep diffs clean. T001 can interleave anywhere before T005.
- T004 depends on T003 (both edit `commands/new.ts` and `commands/add.ts`; do T003 first to avoid a manual merge of the `--database` and `--no-auth` flag declarations).
- T007 must run last.

### Within Each User Story

- One task per story (per user request: 8-10 max). Each task contains its own implementation + Vitest unit tests + fixture updates.
- Tests are written **after** the implementation file in the same task (tdd=false).

### Parallel Opportunities

With one developer (subagents=false): execute T001 → T002 → T003 → T004 → T005 → T006 → T007 sequentially. The [P] marker on T001 documents file-disjoint potential, not a recommendation to fork work in this session.

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete **T001** (FR-1 versions caps).
2. Run smoke: `forgekit new demo --spring-boot --angular && cd demo/frontend && npm install`.
3. If green → ship as a patch release (1.29.x) and stop here. T001 alone fixes the most painful regression.

### Incremental Delivery (recommended)

1. T001 → patch release covering audit #1 + #2.
2. T002 → minor release covering audit #3 + #4 (`--ui none` works).
3. T003 → minor release covering audit #5 (`--database none`).
4. T004 → minor release covering audit #7 + #8 (CI/agent ergonomics).
5. T005 + T006 together → minor release covering audit #11 + #6.
6. T007 closes the feature.

### Single-PR delivery

Land T001..T007 as one PR if the team prefers fewer integration points. Verification (T007) must still run and pass before merge.

---

## Notes

- [P] = file-disjoint with other [P] tasks; not a parallelism mandate.
- All tasks include their own Vitest tests and fixture updates per Constitution rule #7.
- Constitution rule #6 (no speculative abstractions) explicitly checked in T004 (TTY helper rejected — 2 callsites only) and T006 (port-map rejected — single callsite).
- Out of scope: audit #9 (default JSON logs), #10 (default correlation-ID), #12 (Spring Security marker dep). Not in tasks.md by design.
- Release semantics: per Constitution rule #9, version bumps are pipeline-driven via `git tag`. No `npm version` / manual bump task in this list.
