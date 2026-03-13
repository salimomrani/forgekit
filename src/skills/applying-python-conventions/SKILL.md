---
name: applying-python-conventions
description: Applies Python 3.12 best practices when writing or modifying Python files — FastAPI routes, Pydantic schemas, SQLAlchemy models, pytest tests, or any backend module. Also trigger for Python-specific symptoms: missing type hints, bare exceptions, manual env var parsing, sync handlers in async context, missing dependency injection, global state, or test code without fixtures. Don't use for Node.js, Java, TypeScript, or non-Python backends.
---

## General

- Python 3.12 — use `type` aliases, `match` statements, `@override`
- Type hints everywhere — no untyped functions or variables
- Never use bare `python` — always the venv: `.venv/bin/python`
- `from __future__ import annotations` at top of files with forward refs

## Naming

| Element | Convention | Example |
|---|---|---|
| Functions, variables | `snake_case` | `get_user_by_id` |
| Classes | `PascalCase` | `UserService` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRIES` |
| Private | `_leading_underscore` | `_internal_helper` |
| Modules | `snake_case` | `user_repository.py` |

## Type hints (3.12)

```python
from typing import Protocol, TypeVar, Self

# New-style union (3.10+)
def find(id: int) -> User | None: ...

# TypeAlias (3.12)
type UserId = int

# Self for fluent APIs
class Builder:
    def with_name(self, name: str) -> Self:
        self.name = name
        return self
```

Never use `Any` — use `object` or `Unknown` for truly unknown types.

## Pydantic v2

```python
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

class UserCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, frozen=True)

    name: str = Field(min_length=2, max_length=100)
    email: str = Field(pattern=r'^[\w.-]+@[\w.-]+\.\w+$')
    age: int = Field(ge=0, le=150)

    @field_validator('name')
    @classmethod
    def name_must_not_be_reserved(cls, v: str) -> str:
        if v.lower() == 'admin':
            raise ValueError('reserved name')
        return v

    @model_validator(mode='after')
    def check_coherence(self) -> Self:
        # cross-field validation here
        return self
```

- `model_config = ConfigDict(...)` — never class-based `Config`
- `frozen=True` for immutable request/response models
- `Field(...)` for all validation constraints — no bare `str` with no limits

## Environment config (pydantic-settings)

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')

    database_url: str
    secret_key: str
    debug: bool = False

settings = Settings()
```

Never `os.getenv(...)` scattered across the codebase — one `Settings` singleton.

## FastAPI

```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated

router = APIRouter(prefix='/users', tags=['users'])

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    user = await user_service.from_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]

@router.get('/{user_id}', response_model=UserRead, status_code=status.HTTP_200_OK)
async def get_user(user_id: int, current_user: CurrentUser) -> UserRead:
    user = await user_service.get(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')
    return UserRead.model_validate(user)
```

- `Annotated` + `Depends` for DI — never bare function params for dependencies
- `response_model=` always set — no implicit serialization
- `HTTPException` with explicit `status_code` — never bare `Exception`
- Async route handlers (`async def`) for all I/O-bound routes
- Use `lifespan` context manager for startup/shutdown (not `@app.on_event`)

## SQLAlchemy (async)

```python
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    orders: Mapped[list['Order']] = relationship(back_populates='user', lazy='selectin')

# Repository pattern
class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, user_id: int) -> User | None:
        return await self._session.get(User, user_id)

    async def save(self, user: User) -> User:
        self._session.add(user)
        await self._session.flush()
        return user
```

- `Mapped[T]` + `mapped_column()` — never the old `Column(...)` style
- `lazy='selectin'` for collections fetched in the same request (avoids N+1)
- Repository pattern — no raw queries in route handlers

## Exception handling

```python
# Custom domain exceptions
class UserNotFoundError(Exception):
    def __init__(self, user_id: int) -> None:
        super().__init__(f'User {user_id} not found')
        self.user_id = user_id

# Global handler in FastAPI
@app.exception_handler(UserNotFoundError)
async def user_not_found_handler(request: Request, exc: UserNotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={'detail': str(exc)})
```

Never swallow exceptions with bare `except: pass`. Never catch `Exception` without re-raising or logging.

## Testing (pytest)

```python
# conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine('sqlite+aiosqlite:///:memory:')
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSession(engine) as session:
        yield session

@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    app.dependency_overrides[get_session] = lambda: db_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as ac:
        yield ac
    app.dependency_overrides.clear()
```

```python
# test_users.py
import pytest

@pytest.mark.asyncio
async def test_get_user_returns_404(client: AsyncClient) -> None:
    response = await client.get('/users/999')
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_create_user(client: AsyncClient) -> None:
    payload = {'name': 'Alice', 'email': 'alice@example.com'}
    response = await client.post('/users', json=payload)
    assert response.status_code == 201
    assert response.json()['email'] == 'alice@example.com'
```

- `pytest-asyncio` with `asyncio_mode = 'auto'` in `pyproject.toml`
- Fixtures in `conftest.py` — never repeated setup in test files
- `httpx.AsyncClient` with `ASGITransport` for FastAPI integration tests
- Mock external calls with `pytest-mock` (`mocker.patch`)

## Linting & formatting

```bash
.venv/bin/ruff check . --fix
.venv/bin/ruff format .
.venv/bin/mypy src/
.venv/bin/pytest tests/ -v
```

`pyproject.toml` config:
```toml
[tool.ruff]
line-length = 120
select = ["E", "F", "I", "UP", "B", "SIM"]

[tool.mypy]
strict = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
```

## Key constraints

- No `global` state — use dependency injection
- No mutable default arguments: `def f(items: list = [])` → `def f(items: list | None = None)`
- No `print()` in production code — use `logging` or `structlog`
- No unhandled `None` — check before access or use `assert` with a message
- All deviations → `DECISIONS.md`
