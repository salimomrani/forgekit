# Implementation Plan: FastAPI Backend Option

**Spec**: specs/001-fastapi-backend/spec.md
**Branch**: 001-fastapi-backend
**Date**: 2026-03-04

---

## Architecture Decision

### Type System Migration Strategy

`ProjectConfig.backend: boolean` → `ProjectConfig.backendType: "spring-boot" | "fastapi" | null`

To minimize blast radius, three derived booleans are computed and passed to all templates and generators:
- `backend` = `backendType !== null` (any backend active)
- `springBoot` = `backendType === "spring-boot"`
- `fastapi` = `backendType === "fastapi"`

All existing `{{#if backend}}` template blocks remain unchanged (regression-safe).
New `{{#if springBoot}}` and `{{#if fastapi}}` blocks are added where needed.

### FastAPI Generator

New generator class `FastAPIGenerator` mirrors `BackendGenerator` — same interface, different templates.
Entry point: `generateFastAPIBackend(projectDir, config)`.

Called from `new.ts` alongside the existing `generateBackend` (Spring Boot).

### Docker Compose

Current template: postgres + pgadmin only (no Spring Boot app service — developers run locally).
For FastAPI: same postgres + pgadmin + add a `fastapi` app service (Python/uvicorn container).

### CI

Replace `{{#if backend}}` Java job with two conditional jobs:
- `{{#if springBoot}}` → Maven job (existing)
- `{{#if fastapi}}` → Python/pytest job (new)

---

## Files to Create

### New generator
- `src/generators/fastapi/index.ts`

### New templates
- `src/templates/fastapi/main.py.hbs`
- `src/templates/fastapi/config.py.hbs`
- `src/templates/fastapi/health.py.hbs`
- `src/templates/fastapi/requirements.txt.hbs`
- `src/templates/fastapi/test_health.py.hbs`
- `src/templates/fastapi/gitignore.hbs`
- `src/templates/fastapi/python-version.hbs`

---

## Files to Modify

| File | Change |
|---|---|
| `src/types.ts` | Replace `backend: boolean` with `backendType: BackendType` |
| `src/prompts/project.ts` | Replace checkbox with `select` for backend type |
| `src/commands/new.ts` | Add `--fastapi` / `--spring-boot` flags, update `config.backend` → `config.backendType`, update success messages |
| `src/versions.ts` | Update `resolveVersions` to use `backendType` |
| `src/generators/claude-code/index.ts` | Pass `springBoot`, `fastapi` to template data; update `buildAllowedCommands()` |
| `src/generators/docker/index.ts` | Pass `springBoot`, `fastapi` to template data |
| `src/generators/ci/index.ts` | Pass `springBoot`, `fastapi` to template data |
| `src/templates/claude-code/CLAUDE.md.hbs` | Add `{{#if fastapi}}` block, rename `{{#if backend}}` → `{{#if springBoot}}` for Spring-specific content |
| `src/templates/claude-code/settings.json.hbs` | Already fine — generator handles allowed commands |
| `src/templates/docker/docker-compose.yml.hbs` | Add `{{#if fastapi}}` app service block |
| `src/templates/ci/ci.yml.hbs` | Replace `{{#if backend}}` with `{{#if springBoot}}` + add `{{#if fastapi}}` |

---

## Detailed Design

### 1. `src/types.ts`

```typescript
export type BackendType = "spring-boot" | "fastapi" | null;

export interface ProjectConfig {
  name: string;
  groupId: string;
  description: string;
  backendType: BackendType;   // replaces backend: boolean
  frontend: boolean;
  // Spring Boot only
  flyway: boolean;
  openapi: boolean;
  auth: boolean;
  mapstruct: boolean;
  // Frontend
  uiFramework: UIFramework;
  primeNGPreset: PrimeNGPreset;
  ngrx: boolean;
  // Infrastructure
  docker: boolean;
  ci: boolean;
  claudeCode: boolean;
  gitInit: boolean;
}
```

Derived helpers (computed inline where needed):
```typescript
const backend   = config.backendType !== null;
const springBoot = config.backendType === "spring-boot";
const fastapi   = config.backendType === "fastapi";
```

### 2. `src/prompts/project.ts` — Backend selection

Replace the `checkbox` stack selection with a `select` for backend type + separate confirm for frontend:

```typescript
// Step 1: Backend type
const backendType = await select({
  message: "Backend",
  choices: [
    { name: "Spring Boot (Java 21)", value: "spring-boot" },
    { name: "FastAPI (Python)", value: "fastapi" },
    { name: "Aucun", value: null },
  ],
  default: "spring-boot",
});

// Step 2: Frontend (unchanged)
const frontend = await confirm({ message: "Inclure Angular ?", default: true });
```

groupId prompt only shown if `backendType === "spring-boot"`.
Spring Boot features (flyway, openapi, auth, mapstruct) only shown if `backendType === "spring-boot"`.

### 3. FastAPI template structure

**`main.py.hbs`**
```python
from fastapi import FastAPI
from app.routers import health

app = FastAPI(title="{{name}}", version="0.1.0")
app.include_router(health.router)
```

**`config.py.hbs`**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "{{name}}"
    debug: bool = False

settings = Settings()
```

**`health.py.hbs`** (routers/health.py)
```python
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "ok"}
```

**`requirements.txt.hbs`**
```
fastapi==0.115.0
uvicorn[standard]==0.32.0
pydantic-settings==2.6.0
pytest==8.3.0
httpx==0.28.0
```

**`test_health.py.hbs`**
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

### 4. `docker-compose.yml.hbs` — FastAPI service

Add after pgadmin service:
```yaml
{{#if fastapi}}
  api:
    build: ./backend
    container_name: {{name}}_api
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      DEBUG: "false"
{{/if}}
```

When FastAPI is selected, add a `Dockerfile` template to `src/templates/fastapi/Dockerfile.hbs`.

### 5. `ci.yml.hbs` — Python job

```yaml
{{#if fastapi}}
  backend:
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: pip
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Test
        run: pytest
{{/if}}
```

### 6. `CLAUDE.md.hbs` — FastAPI block

Replace `{{#if backend}}` Spring Boot block with two separate blocks:
```hbs
{{#if springBoot}}
## Backend — Spring Boot {{versions.springBoot}}
...
{{/if}}

{{#if fastapi}}
## Backend — FastAPI (Python 3.12)
- **Architecture:** `app/routers/`, `app/config.py`, `tests/`
- **Conventions:** Pydantic models, async endpoints, dependency injection
- **Skill:** apply `applying-python-conventions` for all Python code

### Commands
```bash
cd backend
uvicorn app.main:app --reload    # Start dev server (port 8000)
pytest                           # Run tests
pip install -r requirements.txt  # Install dependencies
```
{{/if}}
```

### 7. `claude-code/index.ts` — Allowed commands

```typescript
const springBoot = config.backendType === "spring-boot";
const fastapi    = config.backendType === "fastapi";

if (springBoot) {
  commands.push("Bash(./mvnw spring-boot:run)", "Bash(./mvnw test)", ...);
}
if (fastapi) {
  commands.push(
    "Bash(uvicorn app.main:app --reload)",
    "Bash(pytest)",
    "Bash(pip install)",
    "Bash(pip freeze)",
  );
}
```

---

## Sequence of Implementation

1. **Types first** — `src/types.ts` (foundation, everything depends on it)
2. **Versions** — `src/versions.ts` (adapt to `backendType`)
3. **Prompts** — `src/prompts/project.ts` (new select UI)
4. **New FastAPI generator + templates** — isolated, no deps on existing generators
5. **Update existing generators** — claude-code, docker, ci (add `springBoot`/`fastapi` derived props)
6. **Update templates** — CLAUDE.md.hbs, docker-compose.yml.hbs, ci.yml.hbs
7. **Update `new.ts`** — wire FastAPI generator, update flags + success messages
8. **Tests** — update validation tests if needed, manual smoke test
