# Research: FastAPI Backend Option

**Date**: 2026-03-04

---

## Decision: FastAPI version

- **Chosen**: FastAPI 0.115.x (latest stable)
- **Rationale**: Latest stable, active maintenance, full async support
- **Uvicorn**: 0.32.x with `[standard]` extras (includes watchfiles for `--reload`)

## Decision: Python version

- **Chosen**: 3.12 (pinned in `.python-version`)
- **Rationale**: LTS, stable, supported by all major CI platforms, used by `actions/setup-python@v5`

## Decision: Settings management

- **Chosen**: `pydantic-settings` 2.6.x
- **Rationale**: Native to FastAPI ecosystem, `.env` file support, type-safe config, no extra boilerplate

## Decision: Testing

- **Chosen**: `pytest` + `httpx` + `TestClient` from Starlette
- **Rationale**: `TestClient` is the FastAPI-recommended testing approach; `httpx` is its transport layer
- **Alternative considered**: `unittest` — rejected (inferior ergonomics, not FastAPI idiomatic)

## Decision: Docker base image

- **Chosen**: `python:3.12-slim`
- **Rationale**: Small image, official Python, compatible with uvicorn
- **Command**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

## Decision: Project layout

- **Chosen**: Flat `app/` package with `routers/` subdirectory
- **Rationale**: FastAPI official docs layout, widely adopted, easy to extend
- **Alternative considered**: `src/` layout — rejected (adds complexity for a starter scaffold)

## Decision: No database in scope

- **Confirmed**: No SQLAlchemy, no Alembic — health endpoint only
- **Rationale**: Matches spec Out of Scope, keeps first iteration lean

## Decision: `groupId` prompt for FastAPI

- **Decision**: Skip groupId prompt when `backendType === "fastapi"` — not applicable to Python
- **Default**: `groupId = "com.example"` (kept in config for type compatibility)

## Decision: Backward compatibility of `backend` boolean

- **Decision**: Replace `backend: boolean` in `ProjectConfig` with `backendType: BackendType`
- **All existing code**: Uses derived `config.backendType !== null` in place of `config.backend`
- **Templates**: Receive explicit `backend`, `springBoot`, `fastapi` booleans — no template logic change needed for existing Spring Boot blocks
