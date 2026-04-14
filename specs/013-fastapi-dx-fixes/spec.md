# Feature Specification: FastAPI DX Fixes

**Feature Branch**: `013-fastapi-dx-fixes`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: Fix ForgeKit CLI so generated FastAPI projects work out of the box without manual IDE/test setup

## User Scenarios & Testing *(mandatory)*

### User Story 1 - IDE resolves imports without manual setup (Priority: P1)

A developer runs `forgekit new` with a FastAPI backend, opens the project in VS Code or Cursor, and all Python imports (`fastapi`, `app.*`, `pytest`) are immediately resolved — no red squiggles, no manual `pyrightconfig.json` creation.

**Why this priority**: This was the most impactful issue — 8 Pyright false positives blocked the entire development session and forced manual intervention before writing a single line of code.

**Independent Test**: Generate a FastAPI project and verify that `backend/pyrightconfig.json` and root `pyrightconfig.json` exist with correct `venvPath` and `include` fields.

**Acceptance Scenarios**:

1. **Given** a generated FastAPI project, **When** an IDE opens `backend/app/main.py`, **Then** `pyrightconfig.json` at `backend/` resolves imports using `backend/.venv`
2. **Given** a generated FastAPI project opened at the project root, **When** Pyright runs, **Then** root `pyrightconfig.json` points `venvPath` to `backend` so all `app.*` imports resolve

---

### User Story 2 - Tests run without deprecation warnings (Priority: P1)

A developer runs `pytest` on a generated FastAPI project and sees clean output — zero `DeprecationWarning` about asyncio fixture loop scope.

**Why this priority**: 400+ warnings on every test run degrades signal-to-noise ratio and erodes trust in the test suite.

**Independent Test**: Generate a FastAPI project and verify `backend/pytest.ini` exists with `asyncio_mode = auto` and `asyncio_default_fixture_loop_scope = function`. Verify `pytest-asyncio` is in `requirements.txt`.

**Acceptance Scenarios**:

1. **Given** a generated FastAPI project, **When** `backend/pytest.ini` is read, **Then** it contains both `asyncio_mode = auto` and `asyncio_default_fixture_loop_scope = function`
2. **Given** a generated FastAPI project, **When** `backend/requirements.txt` is read, **Then** it contains `pytest-asyncio`

---

### User Story 3 - Venv setup is documented in the quickstart (Priority: P2)

A developer reading the generated `README.md` follows the quickstart steps in order and ends up with a working venv, installed dependencies, and a running backend — without consulting external docs.

**Why this priority**: Without an active venv, both Pyright and pytest fail silently. The current README skips the venv creation step.

**Independent Test**: Generate a FastAPI project and verify the `README.md` quickstart includes `python3 -m venv .venv` before `pip install`.

**Acceptance Scenarios**:

1. **Given** a generated FastAPI project, **When** a developer reads the README quickstart, **Then** the venv creation command appears before `pip install -r requirements.txt`

---

### User Story 4 - AI subagents use correct HTTP status codes for POST (Priority: P3)

When Claude Code generates or modifies a FastAPI router, it uses `HTTP_201_CREATED` for resource-creating POST endpoints by default, without having to be corrected.

**Why this priority**: This caused a subtle bug in tests (endpoint returned 200, assertions expected 201). Fixing the rule doc prevents future AI agents from repeating the mistake.

**Independent Test**: Generate a FastAPI project and verify `.claude/rules/backend.md` contains the HTTP status code convention.

**Acceptance Scenarios**:

1. **Given** a generated FastAPI project with Claude Code config, **When** `.claude/rules/backend.md` is read, **Then** it contains an explicit rule: POST (create) → 201

---

### Edge Cases

- What if `backendType` is not `fastapi`? → `pyrightconfig.json` files must NOT be generated at root or `backend/`
- What if only FastAPI is selected without a frontend? → Both `pyrightconfig.json` files still generated
- What if Docker is included? → No impact on these fixes

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Generated FastAPI projects MUST include `backend/pyrightconfig.json` with `pythonVersion: "3.12"`, `venvPath: "."`, `venv: ".venv"`, `include: ["app", "tests"]`, `extraPaths: ["."]`
- **FR-002**: Generated FastAPI projects MUST include a root-level `pyrightconfig.json` with `venvPath: "backend"`, `venv: ".venv"`, `include: ["backend/app", "backend/tests"]`, `extraPaths: ["backend"]`
- **FR-003**: Root `pyrightconfig.json` MUST NOT be generated for non-FastAPI projects
- **FR-004**: Generated FastAPI projects MUST include `backend/pytest.ini` with `asyncio_mode = auto` and `asyncio_default_fixture_loop_scope = function`
- **FR-005**: Generated FastAPI `requirements.txt` MUST include `pytest-asyncio`
- **FR-006**: Generated FastAPI project README MUST include `python3 -m venv .venv` and `source .venv/bin/activate` before `pip install -r requirements.txt` in the quickstart
- **FR-007**: Generated `.claude/rules/backend.md` for FastAPI projects MUST document: POST (create) → 201, GET → 200, PUT/PATCH → 200, DELETE → 204
- **FR-008**: Generated `.claude/rules/backend.md` for FastAPI projects MUST note that tests are run via `.venv/bin/pytest`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can open a generated FastAPI project in a Pyright-enabled IDE and see zero import resolution errors without any manual configuration
- **SC-002**: Running tests on a generated FastAPI project produces zero `DeprecationWarning` lines related to asyncio fixture scope
- **SC-003**: Following the generated README quickstart step-by-step results in a working development environment without consulting external documentation
- **SC-004**: AI-generated FastAPI routers default to HTTP 201 for POST create endpoints with no correction needed

## Assumptions

- Python 3.12 is assumed (consistent with current `.python-version` template)
- `pytest-asyncio==0.24.0` is compatible with `pytest==8.3.0` already in `requirements.txt`
- Venv is created at `backend/.venv` — consistent with Python monorepo convention
- Root `pyrightconfig.json` is owned by the root generator (Constitution rule 1)
