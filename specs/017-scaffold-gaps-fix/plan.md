# Implementation Plan: Scaffold gaps fix (1.29.0 audit)

**Branch**: `017-scaffold-gaps-fix` | **Date**: 2026-04-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/017-scaffold-gaps-fix/spec.md`

> **Plan detail**: `low` — research.md, data-model.md, contracts/, quickstart.md intentionally omitted. All technical details are already grounded in the spec, the conversation history, and the verified codebase audit.

## Summary

Six independent fixes to the ForgeKit CLI generators, sequenced to be parallelizable. Three P1 user stories fix issues that break the most common flows (default scaffold, `--ui none`, no-database backends). Two P2 stories address non-interactive/CI usage and the missing `ng test` target. One P3 story emits a dev-server proxy when both layers are scaffolded together.

Approach: surgical edits to the existing generators and templates. No new abstractions, no helper extraction (Constitution rule #6) unless 3+ callsites are confirmed during implementation. One new field on `ProjectConfig` (`database`), one new field on `ResolvedVersions` (`angularCli`), one new TypeScript cap mirroring the existing vite cap pattern.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node.js ≥20
**Primary Dependencies**: Commander 14 (CLI), Inquirer 8 (prompts), Handlebars 4 (templates)
**Storage**: N/A — code-generation CLI; output is files on disk under the user's chosen project path
**Testing**: Vitest 4 + @vitest/coverage-v8; existing test layout in `src/__tests__/` and `src/generators/**/__tests__/`
**Target Platform**: Cross-platform Node CLI (macOS / Linux / Windows)
**Project Type**: CLI / library
**Performance Goals**: Existing scaffolding completes in seconds — no regression
**Constraints**: All file writes must remain under `Promise.all` batches in each generator (Constitution rule #10); network failures must remain silent (rule #5)
**Scale/Scope**: 6 fix areas across ~12 files, including 1 new field on `ProjectConfig`, 1 new field on `ResolvedVersions`, 4 new template files, 0 new helpers (no rule-#6 violations expected).

## Constitution Check

*Re-evaluated post-design — all gates pass. No violations to justify.*

| Rule | Gate | How this plan complies |
|---|---|---|
| #1 — Each generator owns one layer | `proxy.conf.json` is written exclusively by the frontend generator (reads `config.backendType` from `ProjectConfig` SSOT, writes only inside `frontend/`). Backend generator never touches frontend output. | ✅ |
| #2 — Templates contain zero logic | `angular.json.hbs` `styles[]` becomes a flat array passed by the generator. No new `{{#if}}` over collections. The component-template `{{#if uiPrimeNG}}` gating already exists in `styles.scss.hbs` — extension to four sibling templates is a property toggle, not new logic. | ✅ |
| #3 — ProjectConfig is SSOT | `database: 'postgres' \| 'none'` added to `ProjectConfig`; flows top-down through `LAYER_CONFIG_MAP` and `runLayerGenerator`. No filesystem/env derivation. | ✅ |
| #4 — Fail fast, rollback completely | No change. Existing rollback path in the generator drivers covers all new file writes. | ✅ (no change) |
| #5 — Network failures silent | New `@angular/cli` fetch and the TypeScript cap both go through the existing `fetchNpmVersion` + `fetchWithTimeout` plumbing, which already returns `null` and falls back. | ✅ |
| #6 — No speculative abstractions | TTY-detection: inline at the 2 callsites (`commands/new.ts`, `commands/add.ts`). Only extract if a 3rd callsite appears during implementation. Backend port mapping for proxy: 4 entries in a literal `Record<BackendType, number>` inside the frontend generator — too small/local to extract. | ✅ |
| #7 — Tests declare all fixture fields | New unit tests in `src/__tests__/versions.test.ts` and `src/generators/**/__tests__/` will use full `ProjectConfig` and `ResolvedVersions` fixtures (the new fields force this — TS will fail otherwise). | ✅ |
| #8 — CLI detection synchronous and early | No change to CLI detection. | ✅ (no change) |
| #9 — Release only through pipeline | No change. Existing `git tag vX.Y.Z` flow continues. | ✅ (no change) |
| #10 — I/O parallelized | New `proxy.conf.json` write joins the existing `Promise.all` batch in `src/generators/frontend/index.ts`. New typescript+angularCli fetches join the existing `Promise.all` in `src/versions.ts:resolveVersions`. | ✅ |

## Project Structure

### Documentation (this feature)

```text
specs/017-scaffold-gaps-fix/
├── plan.md                # this file
├── spec.md                # feature spec
├── checklists/
│   └── requirements.md    # spec quality checklist (passed)
└── tasks.md               # generated next, by sk:tasks
```

### Source code touched by this feature (repository root)

```text
src/
├── versions.ts                                     # FR-1.1, FR-1.2 (add angularCli, cap typescript)
├── types.ts                                        # FR-3.1 (add database to ProjectConfig)
├── commands/
│   ├── new.ts                                      # FR-3, FR-4 (--database, --no-auth, --yes, TTY default)
│   └── add.ts                                      # FR-3, FR-4 (--database, --no-auth, --yes, TTY default; LAYER_CONFIG_MAP entry if needed)
├── generators/
│   ├── frontend/
│   │   └── index.ts                                # FR-2 (build flat styles[]); FR-6 (emit proxy.conf.json conditional on backendType)
│   └── backend/
│       └── index.ts                                # FR-3 (pass database to template data)
└── templates/
    ├── frontend/
    │   ├── package.json.hbs                        # FR-1.1 (use versions.angularCli); FR-5 (karma+jasmine devDeps)
    │   ├── angular.json.hbs                        # FR-2 (consume flat styles[]); FR-5 (test target); FR-6 (proxyConfig pointer)
    │   ├── home.component.ts.hbs                   # FR-2.2 (gate --p-* tokens)
    │   ├── layout.component.ts.hbs                 # FR-2.2
    │   ├── topbar.component.ts.hbs                 # FR-2.2
    │   ├── sidebar.component.ts.hbs                # FR-2.2
    │   ├── proxy.conf.json.hbs                     # FR-6 (NEW)
    │   ├── tsconfig.spec.json.hbs                  # FR-5 (NEW)
    │   ├── test.ts.hbs                             # FR-5 (NEW — Karma bootstrap)
    │   └── app.spec.ts.hbs                         # FR-5 (NEW — minimal sample spec)
    └── backend/
        ├── pom.xml.hbs                             # FR-3.2 (gate JPA + postgresql + flyway behind {{#if database}})
        ├── application.yml.hbs                     # FR-3.3 (gate datasource + flyway settings)
        └── application-dev.yml.hbs                 # FR-3.3

tests added (Vitest):
src/__tests__/versions.test.ts                       # FR-1 cases
src/generators/frontend/__tests__/index.test.ts      # FR-2 (styles[]), FR-6 (proxy emission)
src/generators/backend/__tests__/                    # FR-3 (pom diff under database='none' vs 'postgres')
src/commands/__tests__/                              # FR-4 (--no-auth, --yes, TTY default)
```

**Structure Decision**: existing single-project ForgeKit layout (CLI + generators + templates + tests) — no structural change. Each generator continues to own exactly one layer (rule #1).

## Phased delivery (parallelizable)

The 6 fix areas form a near-DAG. Three batches the implementer can run sequentially; within each batch the work is independent:

```text
batch A — 100% parallel
  ├─ FR-1  versions.ts + package.json.hbs (angularCli + ts cap)
  ├─ FR-2  angular.json.hbs styles[] + 4 component templates (UI gating)
  └─ FR-3  ProjectConfig database flag + pom.xml.hbs + application*.yml.hbs

batch B — depends on FR-3 landing first (touches commands/{new,add}.ts that FR-3 already edits)
  └─ FR-4  --no-auth, --yes, non-TTY default

batch C — independent of A/B except for the implicit `frontend generator + angular.json` surface
  ├─ FR-5  ng test target + sample spec
  └─ FR-6  proxy.conf.json + angular.json proxyConfig pointer
```

If batches A and C are run in parallel, the only merge surface is `angular.json.hbs` and `package.json.hbs`. Document this in `tasks.md` so the implementer either serializes those two files or applies both changes in one commit.

## Test strategy (fast-mode, tdd=false)

- **FR-1**: extend `src/__tests__/versions.test.ts` — mock `fetchNpmVersion` to return a TS 6.x string; assert `versions.typescript` stays `<6.0` when `frontend === 'angular'`. Add a case where `@angular/cli` returns `21.2.8` while `@angular/core` returns `21.2.10`; assert `versions.angularCli !== versions.angular`. Add the silent-fallback path: simulate `fetch` returning `null`; assert `versions.angularCli === FALLBACK_VERSIONS.angularCli` and no exception thrown.
- **FR-2**: in `src/generators/frontend/__tests__/`, render the frontend generator twice (`ui: 'primeng'` and `ui: 'none'`), parse the produced `angular.json`, assert `styles` array shape. Render each of the 4 component templates with `uiNone: true` and assert no `--p-` token appears in the output.
- **FR-3**: render `pom.xml.hbs` with `database: 'none'` and `database: 'postgres'`; assert presence/absence of `spring-boot-starter-data-jpa`, `org.postgresql:postgresql`, `flyway-core`. Same for `application.yml` (datasource keys).
- **FR-4**: in `src/commands/__tests__/`, use `commander` parsing in isolation: assert `--no-auth` sets `options.auth === false`. Spawn the CLI with `stdin` closed (`{ stdio: ['ignore', ...] }`) and assert no `ExitPromptError`. Assert `--yes` short-circuits inquirer prompts.
- **FR-5**: e2e — generate an Angular project to a tmp dir, run `npm install --no-audit --prefer-offline` and `npm test --silent`; assert exit 0. Gate this test on `process.env.FORGEKIT_E2E === '1'` to keep CI fast on PRs (existing pattern in the project — confirm during implementation).
- **FR-6**: render the frontend generator with `backendType: 'spring-boot'`; assert `proxy.conf.json` is in the produced file set with port `8080`. Repeat for `'fastapi'` (8000), `'nestjs'` (3000), `'nextjs'` (3000), `'laravel'` (8000), and `null` (file absent).

Verification mode = `minimal` → per-task checks are `npm run build` + `npm run lint` (+ scoped tests on changed files). The full Vitest suite runs once in Phase 3 of the workflow.

## Out of scope

- audit #9 default JSON logs — Constitution rule #6.
- audit #10 default correlation-ID plumbing — Constitution rule #6.
- audit #12 Spring Security marker dependency — Constitution rule #6.
- Regenerating an existing project with a different `--database` value.
- Databases other than Postgres in the new `database` field.

## Complexity Tracking

> No Constitution Check violations. Section intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| _(none)_ | _(n/a)_ | _(n/a)_ |
