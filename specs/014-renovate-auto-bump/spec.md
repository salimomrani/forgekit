# Feature Specification: Renovate Auto-Bump Pipeline

**Feature Branch**: `014-renovate-auto-bump`
**Created**: 2026-04-16
**Status**: Draft
**Input**: User description: "Renovate pipeline to check and bump versions automatically for both package.json npm deps and the FALLBACK_VERSIONS constants in src/versions.ts"

## User Scenarios & Testing

### User Story 1 - Auto-bump npm dependencies in package.json (Priority: P1)

As a ForgeKit maintainer, I want Renovate to open PRs every Monday morning grouping all `package.json` minor/patch updates into a single PR (with majors in separate PRs), so that I keep the CLI's toolchain current without manual `npm outdated` checks.

**Why this priority**: This is the core value — today 9 deps are behind, and without automation the maintainer must run `npm outdated` manually. This is the minimum viable bump pipeline.

**Independent Test**: After merging `renovate.json`, the Renovate GitHub App detects the repo and opens a PR within the next scheduled window. The PR lists grouped minor/patch updates for `@inquirer/prompts`, `vitest`, `prettier`, `eslint`, etc.

**Acceptance Scenarios**:

1. **Given** `renovate.json` exists at repo root and the GitHub App is installed, **When** the weekly schedule fires (Monday morning), **Then** Renovate opens at most one grouped PR titled like `chore(deps): update non-major dependencies` containing all minor/patch bumps.
2. **Given** a major version is available (e.g. TypeScript 5 → 6), **When** Renovate runs, **Then** the major bump appears in a **separate** PR — not mixed with the minor/patch group.
3. **Given** a devDependency minor/patch PR is open and CI passes, **When** CI completes successfully, **Then** the PR is auto-merged without manual review.
4. **Given** a production dependency PR is open and CI passes, **When** CI completes, **Then** the PR stays open awaiting manual review (no auto-merge).

---

### User Story 2 - Auto-bump FALLBACK_VERSIONS constants in src/versions.ts (Priority: P2)

As a ForgeKit maintainer, I want Renovate to also bump the `FALLBACK_VERSIONS` constants in `src/versions.ts` so that when the live registry fetch fails during a user's `forgekit new`, the fallback versions still reflect recent upstream releases (not multi-month-old defaults).

**Why this priority**: Secondary because fallbacks are only used when network fetches fail — but letting them rot for months defeats the purpose. This prevents silent drift.

**Independent Test**: Change one constant in `src/versions.ts` to an older version locally, push, observe that Renovate opens a PR updating that specific constant to the current upstream latest (queried via npm, Maven, or Packagist).

**Acceptance Scenarios**:

1. **Given** `FALLBACK_VERSIONS.angular = "21.0.0"` and npm latest `@angular/core` is `21.2.0`, **When** Renovate runs, **Then** a PR opens bumping the constant to `21.2.0`.
2. **Given** `FALLBACK_VERSIONS.springBoot = "4.0.2"` and Maven Central latest is `4.1.0`, **When** Renovate runs, **Then** a PR opens bumping the constant (Maven datasource).
3. **Given** `FALLBACK_VERSIONS.laravel = "13.1.1"` and Packagist latest is `13.2.0`, **When** Renovate runs, **Then** a PR opens bumping the constant (Packagist datasource).

---

### Edge Cases

- What if the npm registry rate-limits Renovate? → Renovate retries on next schedule; acceptable.
- What if a bumped constant breaks an e2e test? → CI fails, PR stays red, maintainer intervenes (normal Git flow).
- What if a regex manager mismatches a line (e.g. catches a comment)? → Config is tested via `renovate-config-validator`; mismatch surfaces as an invalid PR during rollout and the regex is adjusted.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST provide a `renovate.json` configuration file at the repository root.
- **FR-002**: The configuration MUST schedule runs for Monday mornings (e.g. `before 9am on monday`).
- **FR-003**: The configuration MUST group all non-major npm dependency updates from `package.json` into a single PR.
- **FR-004**: The configuration MUST place each major version bump in a separate PR.
- **FR-005**: The configuration MUST auto-merge devDependency minor/patch PRs when CI is green.
- **FR-006**: The configuration MUST NOT auto-merge production dependency PRs.
- **FR-007**: The configuration MUST include custom regex managers that extract the `FALLBACK_VERSIONS` constants from `src/versions.ts`.
- **FR-008**: The regex managers MUST map each constant to the correct datasource: npm (frontend/node deps), Maven (`springBoot`, `springDoc`, `mapstruct`), Packagist (`laravel`, `sanctum`, `scramble`).
- **FR-009**: The configuration MUST pass `renovate-config-validator` without errors.
- **FR-010**: The configuration MUST NOT require any GitHub secret, PAT, or `RENOVATE_TOKEN` (GitHub App handles auth).
- **FR-011**: The GitHub repository MUST have branch protection on `master` with the `ci.yml` jobs listed as required checks — Renovate auto-merge relies on this gate.
- **FR-012**: The `next-auth` package MUST follow the `beta` dist-tag via a dedicated `packageRules` entry (current FALLBACK tracks the v5 beta chain).

### Key Entities

- **`renovate.json`**: JSON document at repo root, follows Renovate schema, defines schedules, package rules, and custom regex managers.
- **`FALLBACK_VERSIONS`**: Typed constant object in `src/versions.ts` mapping keys (e.g. `angular`, `springBoot`) to semver strings — target of custom regex managers.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Renovate opens its first PR within 7 days of the `renovate.json` landing on `master`.
- **SC-002**: At least 8 of the 9 currently outdated `package.json` deps (listed via `npm outdated`) are bumped in the first batch.
- **SC-003**: `npx --package renovate -c 'renovate-config-validator' renovate.json` exits 0.
- **SC-004**: At least one `FALLBACK_VERSIONS` constant is bumped by Renovate within 30 days of rollout, confirming the regex managers work.
- **SC-005**: Zero secrets or tokens are added to the repo settings for this feature.
