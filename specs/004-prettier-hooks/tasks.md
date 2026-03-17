# Tasks: Prettier Pre-commit Hooks (Husky + lint-staged)

**Feature**: 004-prettier-hooks
**Spec**: [spec.md](./spec.md)
**Total tasks**: 13
**Parallel opportunities**: T003, T004, T005 (templates); T009, T010 (generator updates)

---

## Phase 1 — Foundational (blocking all story work)

Shared prerequisites across both generators.

- [x] T001 Add `husky`, `lintStaged`, `prettier` fields to `ResolvedVersions` interface and `FALLBACK_VERSIONS` in `src/versions.ts` — `husky: "9.1.0"`, `lintStaged: "15.5.0"`, `prettier: "3.5.0"`
- [x] T002 Add `prettier: boolean` field to `ProjectConfig` interface in `src/types.ts`
- [x] T003 Add "Prettier (pre-commit formatting)" checkbox to the infrastructure/frontend section in `src/prompts/project.ts` — visible only when `frontend !== null`, unchecked by default, value `"prettier"`

---

## Phase 2 — Templates (parallel, no dependencies between them)

- [x] T004 [P] Create `src/templates/shared/prettier/prettierrc.hbs` — config: `singleQuote: true`, `semi: false`, `tabWidth: 2`, `trailingComma: "es5"`, `printWidth: 100`
- [x] T005 [P] Create `src/templates/shared/prettier/pre-commit.hbs` — content: `#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\nnpx lint-staged`

---

## Phase 3 — React/Vite generator update

- [x] T006 [US1] Add `prettier`, `auth` data fields to the generator `data` object and update `buildPackageJson()` in `src/generators/frontend/react-vite.ts` — when `prettier: true`: add `husky`, `lint-staged`, `prettier` to `devDependencies`; add `"prepare": "husky"` to scripts; add `lint-staged` config `{"*.{ts,tsx,css,json}": "prettier --write"}`
- [x] T007 [US1] Add conditional `renderAndWrite` calls in `generate()` in `src/generators/frontend/react-vite.ts` — when `prettier: true`: write `.prettierrc` and `.husky/pre-commit` (ensure `.husky/` dir is created via `ensureDirs`)
- [x] T008 [US1] Update tests in `src/generators/frontend/__tests__/react-vite.test.ts` — assert `.prettierrc` and `.husky/pre-commit` exist when `prettier: true`; assert neither file exists when `prettier: false`; assert `prepare` script and `lint-staged` config present/absent accordingly

---

## Phase 4 — Angular generator update

- [x] T009 [P] [US2] Add `prettier` data field and update `buildPackageJson()` in `src/generators/frontend/index.ts` — same logic as T006: devDeps + prepare script + lint-staged config targeting `*.{ts,html,css,scss,json}`
- [x] T010 [P] [US2] Add conditional `renderAndWrite` calls in `generate()` in `src/generators/frontend/index.ts` — same pattern as T007: `.prettierrc` + `.husky/pre-commit` when `prettier: true`
- [x] T011 [US2] Add/update tests in `src/generators/frontend/__tests__/angular.test.ts` (or equivalent) — same assertions as T008 for Angular generator

---

## Phase 5 — Version fetching

- [x] T012 Add `husky`, `lintStaged`, `prettier` npm registry fetch entries in `src/versions.ts` fetch logic — follow the existing pattern used for other packages

---

## Phase 6 — Validation

- [x] T013 Run `npm test` and `npm run typecheck` — confirm 0 regressions, all new assertions green

---

## Dependencies

```
T001 ──┐
T002 ──┤─→ T003 ─→ T004, T005 (parallel)
       │         ↘
       └──────────→ T006 → T007 → T008
                  → T009 → T010 → T011 (parallel with T006-T008)
                  → T012
                  → T013 (last)
```

T001–T002 must complete before any generator work. Templates (T004–T005) can be written in parallel with foundational work. React (T006–T008) and Angular (T009–T011) are fully independent of each other.

---

## Implementation Notes

- Template path convention: use `shared/prettier/` since both generators share the same templates — avoids duplication.
- Husky v9 uses `"prepare": "husky"` (no `install` subcommand).
- `.husky/pre-commit` must be created in the `frontend/` root (not project root) since `package.json` lives there.
- `lint-staged` config key for React: `"*.{ts,tsx,css,json}"`. For Angular: `"*.{ts,html,css,scss,json}"`.
- Pass `prettier: this.config.prettier` in the template `data` object for both generators.
- `ResolvedVersions` additions follow the Constitution: all required fields must be declared with fallback values to avoid CI failures (rule #7).
