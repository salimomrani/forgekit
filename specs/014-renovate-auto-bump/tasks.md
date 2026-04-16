---

description: "Task list for feature 014-renovate-auto-bump"
---

# Tasks: Renovate Auto-Bump Pipeline

**Input**: Design documents from `/specs/014-renovate-auto-bump/`
**Prerequisites**: plan.md (required), spec.md (required)

**Tests**: Unit tests included (cfg.tests=true, cfg.test-types=unit). No TDD (cfg.tdd=false) — tests written after implementation.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 Verify Renovate GitHub App installation on the `forgekit` repo (https://github.com/apps/renovate → check access). No file change.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Prepare `src/versions.ts` so regex managers can extract each `FALLBACK_VERSIONS` entry.

- [x] T002 Add renovate marker comments to every entry in `FALLBACK_VERSIONS` in `src/versions.ts` using the format `// renovate: datasource=<npm|maven|packagist> depName=<pkg>`. Cover all 36 keys: npm keys (`angular`, `angularBuild`, `primeng`, `primeuixThemes`, `primeicons`, `primeflex`, `ngrxSignals`, `rxjs`, `zoneJs`, `typescript`, `tailwind`, `react`, `reactRouter`, `vite`, `axiosReact`, `next`, `nextAuth`, `prismaClient`, `nestjs`, `nestjsJwt`, `nestjsSwagger`, `vue`, `pinia`, `vueRouter`, `husky`, `lintStaged`, `prettier`, `eslint`, `typescriptEslint`, `eslintConfigPrettier`), maven keys (`springBoot` → `org.springframework.boot:spring-boot-starter-parent`, `springDoc` → `org.springdoc:springdoc-openapi-starter-webmvc-ui`, `mapstruct` → `org.mapstruct:mapstruct`), packagist keys (`laravel` → `laravel/framework`, `sanctum` → `laravel/sanctum`, `scramble` → `dedoc/scramble`).

**Checkpoint**: `src/versions.ts` has one marker comment per constant; no behavior change.

---

## Phase 3: User Story 1 - Auto-bump npm deps in package.json (Priority: P1) 🎯 MVP

**Goal**: Weekly grouped PRs for `package.json` minor/patch, separate PRs for majors, auto-merge for devDeps minor/patch when CI is green.

**Independent Test**: Run `npx --package renovate -c 'renovate-config-validator' renovate.json` → exit 0. After merge to `master`, Renovate opens a grouped PR within 7 days.

### Implementation for User Story 1

- [x] T003 [US1] Create `renovate.json` at repo root with: `extends: ["config:recommended"]`, `schedule: ["before 9am on monday"]`, `timezone: "Europe/Paris"`, `labels: ["dependencies"]`, `prConcurrentLimit: 5`, `rangeStrategy: "bump"`, `packageRules` grouping all non-major updates into `chore(deps): update non-major dependencies` and setting `automerge: true` + `automergeType: "branch"` for devDependencies minor/patch only.

### Tests for User Story 1

- [x] T004 [US1] Add npm script `"renovate:validate": "npx --yes --package renovate -c 'renovate-config-validator'"` in `package.json` and run it — must exit 0.

**Checkpoint**: `renovate.json` passes the official Renovate validator.

---

## Phase 4: User Story 2 - Auto-bump FALLBACK_VERSIONS constants (Priority: P2)

**Goal**: Regex managers in `renovate.json` pick up every marker-commented constant in `src/versions.ts` and open PRs when upstream (npm/Maven/Packagist) releases new versions.

**Independent Test**: Write a vitest unit test that (a) reads `renovate.json`, extracts the regex managers' `matchStrings`, and (b) applies each regex against `src/versions.ts`, asserting the extracted `depName`/`currentValue` pairs match the expected 33 constants.

### Implementation for User Story 2

- [x] T005 [US2] Add a `customManagers` entry of `customType: "regex"` to `renovate.json` with `fileMatch: ["^src/versions\\.ts$"]` and a `matchStrings` regex capturing `currentValue`, `depName`, `datasource` from lines like `key: "1.2.3", // renovate: datasource=npm depName=@angular/core`. Use `datasourceTemplate: "{{{datasource}}}"` and `depNameTemplate: "{{{depName}}}"`.

### Tests for User Story 2

- [x] T006 [US2] Write unit test `src/__tests__/renovate-config.test.ts` with 3 cases: (1) `renovate.json` is valid JSON and has at least one `customManagers` entry, (2) the regex in `customManagers[0].matchStrings` matches every key of `FALLBACK_VERSIONS` from `src/versions.ts` (load via dynamic import, assert extracted count === `Object.keys(FALLBACK_VERSIONS).length`), (3) each extracted `datasource` is one of `npm | maven | packagist`.

**Checkpoint**: `npm run test:unit` passes the new test; validator still exits 0.

---

## Phase 6: Follow-up fixes (post-merge)

- [x] T009 Disable auto-merge globally in `renovate.json` (no branch protection on `master`) — replace per-devDep automerge rule with a single `"automerge": false` rule covering all packages. Update CLAUDE.md to document the decision and the path to re-enable.

---

## Phase 5: Polish & Cross-Cutting

- [x] T007 [P] Update `README.md` (if it documents CI/automation) or add a short `## Automated dependency updates` note in `CLAUDE.md` pointing to `renovate.json` and the marker-comment convention in `src/versions.ts`.
- [x] T008 Run `npm run test` and `npm run typecheck` on the feature branch; zero failures required before PR.

---

## Dependencies & Execution Order

- **T001** (App install check) → manual, no file change; can run in parallel with all tasks.
- **T002** (marker comments) blocks **T005 + T006** (regex depends on comments existing).
- **T003** blocks **T004** (validator needs the file).
- **T003** blocks **T005** (customManagers merged into the same file).
- **T005** blocks **T006** (test reads the customManagers regex).
- **T007** depends on everything (final doc pass).
- **T008** is the exit gate.

### Parallel Opportunities

- None significant — the work is 2 file edits + 1 test file. Sequential execution is fastest.

---

## Implementation Strategy

### MVP (User Story 1 only)

1. T002 — marker comments on `src/versions.ts` (foundational).
2. T003 + T004 — `renovate.json` + validator.
3. Ship the PR, merge to master, observe first Renovate PR within 7 days.

### Full scope

4. T005 + T006 — regex managers + unit test.
5. T007 + T008 — docs + verification.

---

## Notes

- Marker comment format is `// renovate: datasource=<src> depName=<pkg>` placed at end of line. Renovate's regex parser is line-based — keep markers on the same line as the key/value.
- For Maven and Packagist datasources, `depName` is the full `group:artifact` or `vendor/package` identifier. Using `depNameTemplate` directly avoids per-key manager entries.
- Auto-merge uses `automergeType: "branch"` (Renovate merges the branch into master without opening a PR) to reduce notification noise for trivial devDep patches. Majors and prod deps still open a PR.
