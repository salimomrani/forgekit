# Feature Specification: FastAPI Backend Option

**Feature ID**: 001
**Short Name**: fastapi-backend
**Branch**: 001-fastapi-backend
**Status**: Draft
**Created**: 2026-03-04

---

## Summary

Forgekit currently scaffolds Spring Boot as the only backend option. This feature adds FastAPI (Python) as a mutually exclusive alternative backend choice. When scaffolding a new project, the user selects either Spring Boot or FastAPI — not both.

---

## Problem Statement

Developers who work in Python ecosystems cannot use Forgekit for their projects. The tool only serves Java/Spring Boot teams, excluding a large segment of the developer audience. Adding FastAPI support makes Forgekit useful for full-stack Python+Angular projects.

---

## User Scenarios & Testing

### Scenario 1 — Spring Boot project (regression)
**Given** a developer runs `forgekit new my-app`
**When** they select "Spring Boot" as backend
**Then** the generated project is identical to the current output

### Scenario 2 — FastAPI project
**Given** a developer runs `forgekit new my-app`
**When** they select "FastAPI" as backend
**Then** the generated project contains a Python FastAPI structure with uvicorn, a virtual environment config, and appropriate CLAUDE.md/settings.json

### Scenario 3 — FastAPI + Angular (fullstack)
**Given** a developer selects FastAPI + Angular
**When** the project is generated
**Then** docker-compose includes the FastAPI service instead of the Spring Boot service, and the CLAUDE.md references Python conventions

### Scenario 4 — Backend-only FastAPI
**Given** a developer selects FastAPI without frontend
**When** the project is generated
**Then** only the Python backend is scaffolded with no Angular files

### Scenario 5 — No backend selected
**Given** a developer deselects backend entirely
**When** the project is generated
**Then** neither Spring Boot nor FastAPI files are generated (existing behavior unchanged)

---

## Functional Requirements

### FR-1: Exclusive backend selection
The CLI prompt must present backend as a single-choice selection:
- None
- Spring Boot (Java 21)
- FastAPI (Python)

Only one backend can be active per project. The existing boolean `backend: true/false` must evolve to a discriminated value (`backendType: "spring-boot" | "fastapi" | null`).

### FR-2: FastAPI project structure
When FastAPI is selected, the generator must produce:
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI app entry point
│   ├── config.py        # Settings via pydantic-settings
│   └── routers/
│       └── health.py    # GET /health endpoint
├── tests/
│   └── test_health.py
├── requirements.txt
├── .python-version      # pinned Python version
└── .gitignore
```

### FR-3: FastAPI dev commands in CLAUDE.md
The generated CLAUDE.md must include FastAPI-specific commands:
```bash
cd backend
uvicorn app.main:app --reload    # Start dev server (port 8000)
pytest                           # Run tests
pip install -r requirements.txt  # Install dependencies
```

### FR-4: settings.json allowed commands for FastAPI
When FastAPI is selected, `.claude/settings.json` must include:
```
Bash(uvicorn app.main:app --reload)
Bash(pytest)
Bash(pip install)
Bash(pip freeze)
```

### FR-5: FastAPI CLAUDE.md conventions block
The generated CLAUDE.md must reference the `applying-python-conventions` skill for FastAPI projects, not `applying-java-conventions`.

### FR-6: Docker support for FastAPI
When docker is enabled with FastAPI, `docker-compose.yml` must include a FastAPI service (Python image + uvicorn) instead of the Spring Boot service.

### FR-7: CI support for FastAPI
When CI is enabled with FastAPI, the generated GitHub Actions workflow must run `pytest` instead of `./mvnw test`.

### FR-8: Type system migration
`ProjectConfig.backend: boolean` → `ProjectConfig.backendType: "spring-boot" | "fastapi" | null`. All generators and templates must be updated to use the new discriminator. The `backend` computed boolean (`backendType !== null`) is derived where needed.

---

## Out of Scope

- Database integration for FastAPI (SQLAlchemy, Alembic) — future feature
- Authentication scaffolding for FastAPI — future feature
- Multiple backend frameworks simultaneously
- Django, Flask, or other Python frameworks

---

## Assumptions

- Python 3.12+ is the target runtime
- `uvicorn` is the ASGI server (standard for FastAPI)
- `pydantic-settings` for configuration management
- `pytest` for testing (not unittest)
- No ORM or database wiring in this first iteration — just the app skeleton + health endpoint
- The FastAPI template does not need a `groupId` equivalent (Python packaging uses package names)

---

## Success Criteria

1. A developer can scaffold a FastAPI project in under 60 seconds with a single `forgekit new` command
2. The generated FastAPI project starts successfully with `uvicorn app.main:app --reload` without any manual configuration
3. The generated `GET /health` endpoint returns HTTP 200 and passes the generated test with `pytest`
4. Existing Spring Boot project generation produces byte-for-byte identical output to the current release
5. All existing tests pass after the type system migration (`backendType`)

---

## Dependencies & Risks

- **Risk**: Migrating `backend: boolean` to `backendType` is a breaking change in the internal type system — all generators must be updated atomically
- **Risk**: The docker-compose template must conditionally render Spring Boot or FastAPI service blocks — needs careful conditional logic
- **Dependency**: `applying-python-conventions` skill already exists globally — no new skill needed

---

## Key Entities

| Entity | Description |
|---|---|
| `backendType` | `"spring-boot" \| "fastapi" \| null` — replaces `backend: boolean` |
| FastAPI generator | New generator class mirroring `BackendGenerator` for Python |
| FastAPI templates | New `.hbs` templates for Python project files |
| CLAUDE.md.hbs | Updated with conditional blocks for `springBoot` vs `fastapi` |
| settings.json.hbs | Updated allowed commands per backend type |
| docker-compose.yml.hbs | Updated service block conditional on backend type |
| ci.yml.hbs | Updated test command conditional on backend type |
