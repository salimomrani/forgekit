# Tasks: FastAPI Backend Option

**Feature**: 001-fastapi-backend
**Branch**: 001-fastapi-backend
**Plan**: specs/001-fastapi-backend/plan.md
**Total tasks**: 24

---

## Phase 1 — Foundational: Type System Migration

> Blocking prerequisite for all other phases. Must complete before any other work.

- [ ] T001 Migrate `src/types.ts`: replace `backend: boolean` with `backendType: BackendType` (`"spring-boot" | "fastapi" | null`); remove `backend` field
- [ ] T002 Update `src/versions.ts`: change `resolveVersions(opts: { backend: boolean })` → `opts: { backendType: BackendType }`, replace `opts.backend` with `opts.backendType === "spring-boot"`

---

## Phase 2 — US1: CLI Prompt (Backend Selection)

> User selects one backend type or none. Enables Scenario 1, 2, 4, 5.
> **Test**: Running `forgekit new` presents a select with Spring Boot / FastAPI / Aucun.

- [ ] T003 [US1] Update `src/prompts/project.ts`: replace the `checkbox` stack section with a `select` prompt for `backendType` (`"spring-boot"` | `"fastapi"` | `null`) + a separate `confirm` for `frontend`
- [ ] T004 [US1] Update `src/prompts/project.ts`: show `groupId` prompt only when `backendType === "spring-boot"`; show Spring Boot features (flyway, openapi, auth, mapstruct) only when `backendType === "spring-boot"`; default all Spring Boot booleans to safe values when `backendType !== "spring-boot"`
- [ ] T005 [US1] Update `src/commands/new.ts`: replace `--backend` flag with `--spring-boot` and `--fastapi` boolean flags; update `defaults` mapping to set `backendType`; replace all `config.backend` references with `config.backendType !== null`; replace `config.backend`-gated calls with `config.backendType === "spring-boot"`-gated calls
- [ ] T006 [US1] Update `src/commands/new.ts` success messages: replace `"cd backend && ./mvnw spring-boot:run"` with conditional message based on `backendType`

---

## Phase 3 — US2: FastAPI Generator & Templates

> Generates the FastAPI Python project structure. Enables Scenario 2, 4.
> **Test**: Generated project contains `app/main.py`, `tests/test_health.py`, `requirements.txt`; `uvicorn app.main:app --reload` starts without error; `pytest` passes.

- [ ] T007 [P] [US2] Create `src/templates/fastapi/main.py.hbs`: FastAPI app with title from `{{name}}`, includes health router
- [ ] T008 [P] [US2] Create `src/templates/fastapi/config.py.hbs`: pydantic-settings `Settings` class with `app_name` and `debug` fields
- [ ] T009 [P] [US2] Create `src/templates/fastapi/health.py.hbs`: `APIRouter` with `GET /health` returning `{"status": "ok"}`
- [ ] T010 [P] [US2] Create `src/templates/fastapi/requirements.txt.hbs`: pinned versions — `fastapi==0.115.0`, `uvicorn[standard]==0.32.0`, `pydantic-settings==2.6.0`, `pytest==8.3.0`, `httpx==0.28.0`
- [ ] T011 [P] [US2] Create `src/templates/fastapi/test_health.py.hbs`: `TestClient` test asserting `GET /health` → 200 + `{"status": "ok"}`
- [ ] T012 [P] [US2] Create `src/templates/fastapi/gitignore.hbs`: standard Python gitignore (`__pycache__/`, `.venv/`, `*.pyc`, `.env`, `dist/`)
- [ ] T013 [P] [US2] Create `src/templates/fastapi/python-version.hbs`: static content `3.12`
- [ ] T014 [US2] Create `src/generators/fastapi/index.ts`: `FastAPIGenerator` class extending `BaseGenerator`; `generate()` creates dirs (`backend/app/routers/`, `backend/tests/`), renders all 7 templates; export `generateFastAPIBackend(projectDir, config)`
- [ ] T015 [US2] Update `src/commands/new.ts`: import and call `generateFastAPIBackend` when `config.backendType === "fastapi"`; add progress message `"⏳ Backend FastAPI..."` / `"✔ Backend FastAPI généré"`

---

## Phase 4 — US3: Claude Code Config for FastAPI

> CLAUDE.md and settings.json reflect FastAPI conventions. Enables Scenario 2, 3, 4.
> **Test**: Generated `CLAUDE.md` contains FastAPI commands; `.claude/settings.json` contains `uvicorn`/`pytest` allow rules.

- [ ] T016 [US3] Update `src/generators/claude-code/index.ts`: compute `springBoot = config.backendType === "spring-boot"` and `fastapi = config.backendType === "fastapi"`; pass both in template `data`; update `buildAllowedCommands()` to use `springBoot` / `fastapi` guards instead of `config.backend`; add FastAPI commands (`uvicorn app.main:app --reload`, `pytest`, `pip install`, `pip freeze`)
- [ ] T017 [US3] Update `src/templates/claude-code/CLAUDE.md.hbs`: rename `{{#if backend}}` Spring Boot block to `{{#if springBoot}}`; add new `{{#if fastapi}}` block with FastAPI commands, Python 3.12 stack, and `applying-python-conventions` skill reference; keep `{{#if backend}}` only for generic backend section headings where both apply

---

## Phase 5 — US4: Docker & CI for FastAPI

> Docker compose and CI pipeline adapted for FastAPI. Enables Scenario 3.
> **Test**: Generated `docker-compose.yml` includes `api` service when FastAPI; generated `ci.yml` runs `pytest` when FastAPI.

- [ ] T018 [P] [US4] Update `src/generators/docker/index.ts`: pass `fastapi`, `name`, and `springBoot` to template data
- [ ] T019 [P] [US4] Update `src/templates/docker/docker-compose.yml.hbs`: add `{{#if fastapi}}` app service block (`python:3.12-slim` image, uvicorn cmd, port 8000)
- [ ] T020 [P] [US4] Create `src/templates/fastapi/Dockerfile.hbs`: `FROM python:3.12-slim`, `COPY requirements.txt`, `RUN pip install`, `CMD uvicorn app.main:app --host 0.0.0.0 --port 8000`
- [ ] T021 [P] [US4] Update `src/generators/ci/index.ts`: pass `springBoot`, `fastapi`, `frontend` to template data (remove `backend`)
- [ ] T022 [P] [US4] Update `src/templates/ci/ci.yml.hbs`: rename `{{#if backend}}` blocks to `{{#if springBoot}}`; add `{{#if fastapi}}` job with `actions/setup-python@v5` (python 3.12), `pip install -r requirements.txt`, `pytest`; update `changes` job filter outputs accordingly

---

## Phase 6 — Polish & Regression

> Ensures Spring Boot regression and build integrity.

- [ ] T023 Build project with `npm run build` and fix any TypeScript errors from the type system migration
- [ ] T024 Manual smoke test: run `forgekit new test-spring --spring-boot` and verify output matches pre-change behavior; run `forgekit new test-fastapi --fastapi` and verify FastAPI structure is generated correctly

---

## Dependencies

```
T001 → T002 → T003 → T004
T001 → T005 → T006
T001 → T014 → T015
T007–T013 can run in parallel (independent template files)
T014 depends on T007–T013 (renders them)
T015 depends on T014
T016 depends on T001
T017 depends on T016
T018–T019 can run in parallel
T020 independent (new file)
T021–T022 can run in parallel
T023 depends on all T001–T022
T024 depends on T023
```

## Parallel Opportunities

- **T007–T013**: all 7 FastAPI templates are independent — can be written simultaneously
- **T018–T019**: docker generator + template update
- **T021–T022**: CI generator + CI template update
- **T016 + T018 + T021**: three generator updates are independent of each other

## MVP Scope

**T001–T015** — type migration + prompt + FastAPI generator + templates.
This delivers Scenarios 2 and 4 (FastAPI standalone project) without Docker or CI changes.
Docker (T018–T020) and CI (T021–T022) are additive.
