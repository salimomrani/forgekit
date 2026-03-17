# Feature Specification: End-to-End Integration Tests

**Feature ID**: 005
**Branch**: 5-e2e-integration-tests
**Status**: Draft
**Created**: 2026-03-17

---

## Summary

Add a suite of end-to-end integration tests that exercise the full ForgeKit project generation pipeline — from a complete `ProjectConfig` object through all generators to a verified output directory — covering six representative stack combinations.

---

## Problem Statement

ForgeKit's existing tests validate each generator in isolation. No test verifies that the full generation pipeline (all generators working in sequence, rollback on failure, version resolution) produces a coherent, structurally valid project for real-world stack combinations. Regressions in cross-generator interactions or orchestration logic are invisible until users report them.

---

## Goals

- Detect regressions in the full generation pipeline before they reach users.
- Confirm that each supported stack combination produces the expected files.
- Run within the existing CI pipeline without external network access or long compile times.

## Non-Goals

- Compiling or running the generated projects (npm install, mvn test, etc.).
- Testing interactive CLI prompts or stdin handling.
- Achieving 100% coverage of every flag permutation.
- Replacing existing generator-level unit tests.

---

## User Scenarios

### Scenario 1 — Developer adds a new generator
A contributor adds a new generator. The integration test suite immediately reveals whether the new generator breaks any of the six existing stack combinations.

### Scenario 2 — Developer changes a shared utility
A contributor refactors `template-engine.ts`. Integration tests catch any regression in file output across all stacks, not just the generator they edited.

### Scenario 3 — CI pipeline validates a pull request
On every PR, the full test suite (unit + integration) runs. The integration layer gives reviewers confidence that the generated project structure is intact for all supported combinations.

---

## Functional Requirements

### FR-1: Six stack scenarios
The suite must cover exactly these combinations:

| ID | Backend      | Frontend    | Extras                          |
|----|--------------|-------------|---------------------------------|
| S1 | spring-boot  | angular     | none                            |
| S2 | fastapi      | react-vite  | none                            |
| S3 | spring-boot  | none        | none                            |
| S4 | none         | react-vite  | none                            |
| S5 | none         | none        | claudeCode: true                |
| S6 | fastapi      | react-vite  | docker, ci, claudeCode, speckit |

### FR-2: Orchestrator invocation
Each test must invoke the generation orchestrator (`runNew()` or equivalent) with a complete, valid `ProjectConfig` — not individual generators directly.

### FR-3: Mocked network/version resolution
All external network calls (npm registry, Maven Central) must be intercepted so tests run offline and at deterministic versions. Tests use `FALLBACK_VERSIONS` or an equivalent fixture.

### FR-4: Isolated output directories
Each test writes to a unique temporary directory. Directories are cleaned up after each test, whether the test passes or fails.

### FR-5: File existence assertions
Each scenario defines a list of expected files. The test asserts every expected file exists at the correct path inside the output directory.

### FR-6: Key content assertions
For a representative subset of generated files, the test asserts that critical content is present (e.g., project name appears in the root README, correct backend type in docker-compose, correct stack in CI workflow).

### FR-7: Rollback assertion
One test scenario must verify that when a generator throws an error mid-pipeline, the output directory is fully deleted (rollback behavior per Constitution rule 4).

### FR-8: Integration with npm test
The integration tests run automatically as part of `npm test` (Vitest). No separate script or manual step is required.

---

## Success Criteria

- All six stack scenarios pass without network access.
- Any deletion of a required generated file causes at least one test to fail.
- Rollback test confirms no partial output remains after a simulated failure.
- `npm test` completes with integration tests included in the total count.
- Each integration test scenario runs in under 5 seconds.

---

## Assumptions

- `runNew()` (or the orchestrator function in `commands/new.ts`) can be called programmatically with a pre-built `ProjectConfig` and pre-resolved versions, bypassing the interactive prompt layer.
- If `runNew()` is not directly importable in its current form, a minimal refactor to extract the generation pipeline into a testable function is in scope.
- `FALLBACK_VERSIONS` from `versions.ts` provides sufficient fixture data without network access.
- `git init` during generation can be disabled via config flag or skipped in test mode to avoid test environment side effects.

---

## Dependencies

- Existing `ProjectConfig` type and all current generators.
- Vitest (already in use).
- `fs-extra` (already in use in generator tests).
- `FALLBACK_VERSIONS` export from `versions.ts`.

---

## Out of Scope

- New CLI flags or changes to the prompt flow.
- Changes to any generator's output logic (unless needed to make `runNew()` testable).
- Performance benchmarking of generation speed.
