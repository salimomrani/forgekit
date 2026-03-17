# Spec: Prettier Pre-commit Hooks (Husky + lint-staged)

**Feature ID**: 004
**Branch**: 4-prettier-hooks
**Status**: Ready for planning
**Created**: 2026-03-17

---

## Overview

Developers who scaffold a frontend project with ForgeKit currently receive no automated code formatting. This feature adds an optional pre-commit hook setup (Husky + lint-staged + Prettier) that automatically formats staged files before every commit, enforcing consistent code style from day one.

---

## Problem Statement

Generated frontend projects ship without any formatting enforcement. Developers who want consistent style must set up Husky, lint-staged, and Prettier manually after scaffolding — a repetitive task that ForgeKit should handle automatically when the user opts in.

---

## Goals

- A developer can opt into pre-commit formatting during the `forgekit new` wizard.
- When opted in, every generated frontend project (React/Vite or Angular) includes a working Husky + lint-staged setup that auto-formats staged files with Prettier before each commit.
- No manual post-scaffolding setup required — `git commit` triggers formatting out of the box.

---

## Out of Scope

- ESLint integration (formatting only, not linting).
- Forcing Prettier on projects where the option was not selected.
- Backend projects (Spring Boot, FastAPI) — frontend only.
- Custom Prettier config — sensible opinionated defaults are provided; the developer can override.
- Commit message linting (commitlint).

---

## User Scenarios

### Scenario 1 — Opt in during wizard

**Given** a developer runs `forgekit new` and selects a React/Vite or Angular frontend
**When** they see the infrastructure options and check "Prettier (pre-commit formatting)"
**Then** the generated project includes `.prettierrc`, `.husky/pre-commit`, and lint-staged config.
**And** running `git commit` on a project with unsaved formatting triggers auto-formatting of staged files before the commit completes.

### Scenario 2 — Opt out during wizard

**Given** a developer runs `forgekit new` and leaves "Prettier" unchecked
**Then** no Prettier, Husky, or lint-staged files are generated.
**And** the `package.json` does not include these dependencies or a `prepare` script.

### Scenario 3 — Frontend without git init

**Given** a developer opts into Prettier but does not select "Initialize Git"
**Then** Prettier files are still generated (`.prettierrc`, lint-staged config).
**And** the `prepare` script is included in `package.json`.
**And** Husky will activate automatically when the developer runs `npm install` after initializing git.

---

## Functional Requirements

### FR-1: New wizard option
The `forgekit new` wizard exposes a "Prettier (pre-commit formatting)" checkbox in the infrastructure/frontend options section. It is unchecked by default.

### FR-2: ProjectConfig field
A new `prettier: boolean` field is added to `ProjectConfig` to carry the user's choice through the generation pipeline.

### FR-3: Prettier config file
When `prettier: true`, a `.prettierrc` file is generated in the frontend root with sensible defaults: 2-space indentation, single quotes, no semicolons, trailing commas (ES5), 100-char print width.

### FR-4: lint-staged config
When `prettier: true`, `package.json` includes a `lint-staged` configuration that runs `prettier --write` on all staged `.ts`, `.tsx`, `.html`, `.css`, `.scss`, and `.json` files.

### FR-5: Husky pre-commit hook
When `prettier: true`, a `.husky/pre-commit` file is generated containing `npx lint-staged`. The file has executable permissions.

### FR-6: package.json devDependencies
When `prettier: true`, `husky`, `lint-staged`, and `prettier` are added to `devDependencies` with pinned major versions.

### FR-7: prepare script
When `prettier: true`, a `"prepare": "husky"` script is added to `package.json` so Husky installs its hooks automatically on `npm install`.

### FR-8: Works for both React/Vite and Angular
Both frontend generators apply FR-3 through FR-7 identically when `prettier: true`.

---

## Success Criteria

- A project generated with Prettier enabled passes a `git commit` that automatically formats staged files — no manual setup required.
- A project generated without Prettier contains no Prettier, Husky, or lint-staged files or dependencies.
- `npm test` passes with no regressions after the generator changes.
- The wizard checkbox is visible only when a frontend (React/Vite or Angular) is selected.

---

## Key Entities

| Entity | Description |
|---|---|
| `ProjectConfig.prettier` | Boolean flag set by wizard, flows to both frontend generators |
| `.prettierrc` | Prettier configuration file in the frontend root |
| `.husky/pre-commit` | Shell script invoked by git pre-commit hook |
| `lint-staged` config | In `package.json` — maps file globs to Prettier command |

---

## Assumptions

- Husky v9 is used (`"prepare": "husky"` is the correct install command for v9+).
- `prettier --write` is the correct lint-staged action (format in place, not check-only).
- The checkbox is unchecked by default to respect the "opt-in" principle — not every project needs opinionated formatting.
- The Angular generator builds `package.json` programmatically (same pattern as React/Vite) and can be extended with the same conditional logic.

---

## Dependencies

- `src/types.ts` — add `prettier: boolean` to `ProjectConfig`
- `src/prompts/project.ts` — add wizard checkbox
- `src/generators/frontend/react-vite.ts` — conditional file generation + package.json update
- Angular frontend generator — same changes
- New templates: `.prettierrc.hbs`, `.husky/pre-commit.hbs`
