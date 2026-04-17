<p align="center">
  <img src="assets/logo.svg" alt="ForgeKit" width="120" />
</p>

<h1 align="center">ForgeKit</h1>

<p align="center">
  Full-stack scaffolding CLI — generates a production-ready project in seconds.<br/>
  Pick your backend (Spring Boot, FastAPI, or Laravel), your frontend, and go.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@iconsulting-dev/forgekit"><img src="https://img.shields.io/npm/v/@iconsulting-dev/forgekit.svg" alt="npm version"/></a>
  <a href="https://www.npmjs.com/package/@iconsulting-dev/forgekit"><img src="https://img.shields.io/npm/dm/@iconsulting-dev/forgekit.svg" alt="downloads"/></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"/></a>
</p>

---

## What it generates

One command creates an entire project wired together:

| Layer | Options |
|---|---|
| **Backend** | Spring Boot 3 (Java 21) · FastAPI (Python 3.12) · Laravel 12 (PHP 8.3) · NestJS (Node.js/TypeScript) · Next.js (Node.js fullstack) · none |
| **Frontend** | Angular 19 (standalone, OnPush, lazy routes) · React 19 (Vite + Tailwind CSS v4) · Vue 3 (Vite + Tailwind CSS v4) · none |
| **UI** | PrimeNG (Aura / Lara / Nora) · Tailwind CSS v4 · none |
| **Database** | PostgreSQL 17 via Docker Compose |
| **ORM** | Prisma (NestJS optional) |
| **State** | NgRx SignalStore (optional, Angular only) |
| **Auth** | Spring Security + JWT + Angular interceptors/guards (optional) · React `useAuth` hook + `ProtectedRoute` + axios interceptor (optional) · Vue composable + axios interceptor (optional) · NestJS JWT (optional) · Laravel Sanctum (optional) |
| **CI/CD** | GitHub Actions |
| **AI tooling** | Claude Code config (hooks, hookify guards, skills, CLAUDE.md) |
| **Spec workflow** | Speckit integration (spec → plan → tasks → TDD) |

---

## Prerequisites

Install what you need for your stack before running ForgeKit.

### Required for all stacks

| Tool | Version | Install |
|---|---|---|
| **Node.js** | ≥ 20 | [nodejs.org](https://nodejs.org) |
| **Git** | any | [git-scm.com](https://git-scm.com) |

### Spring Boot backend

| Tool | Version | Install |
|---|---|---|
| **Java (JDK)** | 21+ | [adoptium.net](https://adoptium.net) or `brew install temurin@21` |
| **Maven** | 3.9+ | Bundled via Maven Wrapper (`./mvnw`) — no install needed |

### FastAPI backend

| Tool | Version | Install |
|---|---|---|
| **Python** | 3.12+ | [python.org](https://python.org) or `brew install python@3.12` |
| **pip** | any | Bundled with Python |

### Laravel backend

| Tool | Version | Install |
|---|---|---|
| **PHP** | 8.3+ | [php.net](https://www.php.net) or `brew install php@8.3` |
| **Composer** | 2.x | [getcomposer.org](https://getcomposer.org) |

### Docker Compose (database + services)

| Tool | Install |
|---|---|
| **Docker Desktop** | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |

> Docker Compose is auto-checked in the wizard only if Docker is detected in your `$PATH`.

### Claude Code integration (optional)

| Tool | Install |
|---|---|
| **Claude Code CLI** | `npm i -g @anthropic-ai/claude-code` |

> The Claude Code option is auto-checked in the wizard if `claude` is detected. If absent, the option is unchecked and the generated project will not include `.claude/` config.

### Speckit integration (optional)

| Tool | Install |
|---|---|
| **specify CLI** | `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git` |
| **uv** | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |

> The Speckit option is auto-checked if `specify` is detected. If absent, it is shown with a `(specify CLI not detected)` notice and remains unchecked.

---

## Installation

```bash
npm i -g @iconsulting-dev/forgekit
```

### From source

```bash
git clone https://github.com/salimomrani/forgekit.git
cd forgekit
npm install
npm run build
npm link
```

---

## Usage

### Interactive wizard

```bash
forgekit new
```

The wizard guides you through all options with sensible defaults:

```
? Project name: (my-app)
? Description: (My application)
? Backend: (Spring Boot (Java 21) | FastAPI (Python) | Laravel (PHP 8.3) | None)
? Frontend: (Angular (standalone, OnPush) | React (Vite + Tailwind) | Aucun)
? Group ID: (com.example)                          ← Spring Boot only
? Backend features: (Flyway ✓  OpenAPI ✓  JWT ✗  MapStruct ✓)  ← Spring Boot
? Laravel features: (Sanctum ✗  Scramble ✗)                   ← Laravel only
? UI framework: (PrimeNG)                          ← Angular only
? PrimeNG preset: (Aura)                           ← Angular + PrimeNG only
? Include NgRx SignalStore? (No)                   ← Angular only
? Include auth scaffold? (No)                      ← Angular or React
? Infrastructure: (Docker ✓  CI/CD ✓  Claude Code ✓  Speckit ✓  Git ✓)
```

> Options requiring external CLIs are auto-checked/unchecked based on what's installed.

### Add a layer to an existing project

```bash
forgekit add react              # Add React frontend to an existing backend project
forgekit add vue                # Add Vue.js frontend
forgekit add spring-boot        # Add Spring Boot backend
forgekit add nestjs --prisma    # Add NestJS backend with Prisma
forgekit add docker             # Add Docker Compose
forgekit add laravel            # Add Laravel backend
forgekit add angular --ui tailwind --auth   # Add Angular with options
```

Available layers: `spring-boot`, `fastapi`, `laravel`, `nestjs`, `nextjs`, `angular`, `react`, `vue`, `docker`, `ci`, `claude-code`, `speckit`, `prettier`.

ForgeKit detects the existing project via `forgekit.json` (or filesystem fallback for pre-v1.16 projects), asks layer-specific sub-questions, generates in a temp directory, and moves files on success. Dependent layers (Docker, CI, Claude Code) are auto-regenerated when adding a backend or frontend.

### Direct flags

```bash
# Spring Boot + Angular
forgekit new my-app --spring-boot --group com.example --angular --docker --claude-code

# Spring Boot + React (Vite + Tailwind)
forgekit new my-app --spring-boot --group com.example --react --docker --claude-code

# FastAPI + React with auth
forgekit new my-app --fastapi --react --auth --docker --claude-code

# NestJS + Vue with auth and Prisma
forgekit new my-app --nestjs --vue --auth --prisma --docker --claude-code

# Next.js fullstack with auth
forgekit new my-app --nextjs --auth --docker --claude-code

# Laravel + React with auth
forgekit new my-app --laravel --react --auth --docker

# FastAPI backend only (no frontend, no Docker)
forgekit new my-api --fastapi --no-docker

# Spring Boot + Angular with auth
forgekit new my-app --spring-boot --auth --angular --docker
```

### All available flags

| Flag | Description |
|---|---|
| `--spring-boot` | Spring Boot backend (Java 21) |
| `--fastapi` | FastAPI backend (Python 3.12) |
| `--laravel` | Laravel backend (PHP 8.3, API-only) |
| `--nestjs` | NestJS backend (Node.js/TypeScript) |
| `--nextjs` | Next.js fullstack (Node.js, API routes + frontend) |
| `--angular` | Angular frontend (standalone, OnPush) |
| `--react` | React frontend (Vite + Tailwind CSS v4) |
| `--vue` | Vue.js frontend (Vite + Tailwind CSS v4) |
| `--group <id>` | Java Group ID (e.g. `com.example`) — Spring Boot only |
| `--description <desc>` | Project description |
| `--auth` | Auth scaffold — Angular interceptors/guards or React `useAuth` + axios |
| `--flyway` / `--no-flyway` | SQL migrations with Flyway |
| `--openapi` / `--no-openapi` | OpenAPI / Swagger UI |
| `--mapstruct` / `--no-mapstruct` | MapStruct bean mappers |
| `--ngrx` / `--no-ngrx` | NgRx SignalStore (Angular only) |
| `--prisma` / `--no-prisma` | Prisma ORM (NestJS only) |
| `--ui <framework>` | UI framework: `primeng` \| `tailwind` \| `none` (Angular only) |
| `--preset <preset>` | PrimeNG preset: `Aura` \| `Lara` \| `Nora` (Angular only) |
| `--docker` / `--no-docker` | Docker Compose (PostgreSQL + pgAdmin) |
| `--ci` / `--no-ci` | GitHub Actions CI workflow |
| `--claude-code` / `--no-claude-code` | Claude Code config |
| `--no-git` | Skip Git initialization |
| `--prettier` / `--no-prettier` | Prettier + Husky + lint-staged (requires frontend) |

---

## Generated project structure

```
my-project/
├── backend/                 # Spring Boot / Java 21  — or —  FastAPI / Python 3.12  — or —  Laravel / PHP 8.3
├── frontend/                # Angular / PrimeNG (or Tailwind)  — or —  React / Vite / Tailwind
├── docker-compose.yml       # PostgreSQL 17 + pgAdmin (+ api service for FastAPI)
├── .github/workflows/       # GitHub Actions CI
├── CLAUDE.md                # AI workflow conventions, TDD rules, constitution ref
├── .claude/                 # Hooks, hookify guards, skills, settings.json
├── .specify/memory/         # Architectural constitution
├── forgekit.json               # Project manifest (tracks generated layers)
├── .gitignore
└── README.md
```

---

## Backend — Spring Boot

**Included by default:** Spring Web, Spring Data JPA, PostgreSQL driver, Spring Validation, Lombok, Spring Actuator.

**Optional (enabled by default):** Flyway (`--flyway`), SpringDoc OpenAPI (`--openapi`), MapStruct (`--mapstruct`).

**With `--auth`:** Spring Security configured as stateless + JWT-ready, Angular interceptors and route guard.

```
backend/src/main/java/com/{group}/{name}/
├── Application.java
├── config/
│   ├── SecurityConfig.java           # (--auth) CORS, stateless, JWT-ready
│   └── OpenApiConfig.java
├── shared/
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java
│   │   └── ApiError.java             # Record
│   └── dto/
│       └── PageResponse.java         # Pagination record
└── feature/                          # Feature-based structure
```

**Config files:**
- `application.yml` — main config with environment variables
- `application-dev.yml` — dev profile pointing to Docker Compose
- `db/migration/V1__init.sql` — first Flyway migration ready to fill in

**Start the backend:**
```bash
cd backend
./mvnw spring-boot:run   # requires Docker Compose running for DB
```

---

## Backend — FastAPI

**Stack:** FastAPI, uvicorn, pydantic-settings, pytest, httpx.

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # pydantic-settings
│   └── routers/
│       └── health.py        # GET /health
├── tests/
│   └── test_health.py       # pytest + TestClient
├── requirements.txt
├── Dockerfile               # python:3.12-slim + uvicorn
└── .python-version          # 3.12
```

**Start the backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload   # port 8000
pytest                          # run tests
```

---

## Backend — Laravel

**Stack:** Laravel 12, PHP 8.3, API-only (no web routes, Blade, or sessions).

**Always included:** Migrations, Seeders, Factories, API Resources, CORS, Pint (linter).

**Optional:** Sanctum (`--auth`) for API token authentication, Scramble (`--openapi`) for auto-generated OpenAPI docs.

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── HealthController.php   # GET /api/health
│   │   ├── Middleware/
│   │   └── Resources/
│   ├── Models/
│   └── Providers/
│       └── AppServiceProvider.php
├── bootstrap/
│   └── app.php                        # API-only routing, Sanctum middleware
├── config/
│   ├── app.php
│   ├── database.php                   # PostgreSQL default
│   ├── cors.php
│   ├── sanctum.php                    # (--auth)
│   └── scramble.php                   # (--openapi)
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/
├── routes/
│   └── api.php                        # Health + auth routes
├── tests/
│   ├── TestCase.php
│   └── Feature/
│       └── HealthTest.php
├── composer.json
├── artisan
├── phpunit.xml
├── Dockerfile                         # Multi-stage: composer + php:8.3-cli
└── .env.example                       # PostgreSQL env vars
```

**Start the backend:**
```bash
cd backend
composer install
php artisan serve   # port 8000
php artisan test    # run tests
./vendor/bin/pint   # lint
```

---

## Backend — NestJS

**Stack:** NestJS, TypeScript, Express.js, class-validator, Prisma (optional).

**Always included:** Class-based controllers, dependency injection, OpenAPI ready.

**Optional:** Prisma ORM (`--prisma`) for type-safe database access, JWT (`--auth`) for stateless authentication.

```
backend/
├── src/
│   ├── main.ts                  # NestJS entry point
│   ├── app.module.ts            # Root module
│   ├── health/
│   │   ├── health.controller.ts # GET /health
│   │   └── health.service.ts
│   ├── prisma/                  # (--prisma)
│   │   ├── prisma.service.ts
│   │   └── schema.prisma
│   └── common/
│       ├── decorators/
│       ├── filters/
│       └── guards/              # (--auth) JWT guard
├── test/
├── package.json
├── tsconfig.json
├── docker-compose.yml           # PostgreSQL + pgAdmin
└── Dockerfile                   # Node.js + pnpm
```

**Start the backend:**
```bash
cd backend
npm install
npm run start:dev   # port 3000
npm test            # run tests
```

---

## Backend — Next.js

**Stack:** Next.js 15, React 19, TypeScript, API routes.

**Features:** Built as a fullstack framework (frontend + API routes in same project), supports both static and dynamic API endpoints.

**Optional:** Auth scaffold with middleware and route protection.

```
backend/
├── app/
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   ├── api/
│   │   ├── health/
│   │   │   └── route.ts         # GET /api/health
│   │   └── auth/                # (--auth) Auth routes
│   └── (routes)/                # Feature pages
├── middleware.ts                # (--auth) Auth middleware
├── lib/
│   └── auth.ts                  # (--auth) Auth utilities
├── public/
├── package.json
├── next.config.js
└── Dockerfile
```

**Start the application:**
```bash
cd backend
npm install
npm run dev         # port 3000
npm run build       # production build
npm test            # run tests
```

---

## Frontend — Angular

**UI framework (mutually exclusive):**
- `primeng` *(default)* — PrimeNG with `Aura` / `Lara` / `Nora` preset
- `tailwind` — Tailwind CSS v4 (`@import "tailwindcss"`, no JS config)
- `none` — minimal, no UI dependency

**Optional:** NgRx SignalStore (`--ngrx`) — generates `AppStore` in `core/store/`.

```
frontend/src/app/
├── app.component.ts            # Standalone, OnPush
├── app.routes.ts               # Lazy-loaded routes
├── app.config.ts               # Providers (PrimeNG, HttpClient, Router)
├── layout/
│   ├── layout.component.ts     # Shell (sidebar + topbar + router-outlet)
│   ├── sidebar/
│   └── topbar/
├── core/                       # (--auth)
│   ├── interceptors/           # Auth + Error interceptors
│   ├── guards/                 # Auth guard
│   └── services/               # Auth service (signals)
├── shared/                     # Shared components and pipes
└── features/
    └── home/                   # Default home page
```

**Start the frontend:**
```bash
cd frontend
npm install
npm start   # port 4200
```

---

## Frontend — React (Vite + Tailwind)

**Stack:** React 19, Vite 7, Tailwind CSS v4, React Router v7 (declarative).

```
frontend/src/
├── main.tsx               # Entry point
├── App.tsx                # Root component
├── index.css              # Tailwind @import
├── router/
│   └── index.tsx          # Routes (BrowserRouter + lazy-ready)
├── hooks/                 # (--auth) useAuth hook
├── components/            # (--auth) ProtectedRoute component
└── lib/                   # (--auth) axios instance with JWT interceptor
```

**With `--auth`:** generates `useAuth.ts`, `ProtectedRoute.tsx`, and `lib/http.ts` (axios instance that reads the token from `localStorage` and attaches it as `Authorization: Bearer …` on every request).

**Start the frontend:**
```bash
cd frontend
npm install
npm run dev     # port 5173
npm run build   # production build
npm run lint    # TypeScript check (tsc --noEmit)
```

---

## Frontend — Vue.js (Vite + Tailwind)

**Stack:** Vue 3, Vite 7, Tailwind CSS v4, Vue Router 4.

```
frontend/src/
├── main.ts                # Entry point
├── App.vue                # Root component
├── index.css              # Tailwind @import
├── router/
│   └── index.ts           # Routes (createRouter + lazy-ready)
├── stores/                # (--auth) Pinia store for auth state
├── components/
│   └── ProtectedRoute.vue # (--auth) Route protection component
└── lib/                   # (--auth) axios instance with JWT interceptor
```

**With `--auth`:** generates Pinia store for auth state, `ProtectedRoute.vue` component, and `lib/http.ts` (axios instance that reads the token from `localStorage` and attaches it as `Authorization: Bearer …`).

**Start the frontend:**
```bash
cd frontend
npm install
npm run dev     # port 5173
npm run build   # production build
npm run lint    # TypeScript check (tsc --noEmit)
```

---

## Docker Compose

```bash
docker compose up -d
```

| Service | Port | Description |
|---|---|---|
| PostgreSQL 17 | 5432 | Database with persistent volume |
| pgAdmin | 5050 | Web UI — `admin@admin.com` / `admin` |
| api *(FastAPI / Laravel)* | 8000 | Backend API service |

---

## Claude Code integration

ForgeKit generates a complete, ready-to-use Claude Code configuration:

```
my-project/
├── CLAUDE.md                                     # Workflow routing, stack conventions
└── .claude/
    ├── settings.json                             # Permissions (deny rules + allow) + hooks
    ├── hooks/
    │   ├── pre-bash.sh                          # Bash guard
    │   └── session-start.sh                     # Auto-loads constitution
    ├── hookify.block-dangerous-rm.local.md      # Blocks rm -rf
    ├── hookify.block-force-push.local.md        # Blocks git push --force
    ├── hookify.block-no-verify.local.md         # Blocks --no-verify
    ├── hookify.stop-verify-tests.local.md       # TDD reminder
    ├── hookify.warn-console-log.local.md        # Warns on console.log
    ├── hookify.warn-env-edit.local.md           # Warns on .env edits
    ├── hookify.warn-no-test-before-commit.local.md
    ├── hookify.warn-todo-fixme.local.md
    └── skills/
        ├── applying-angular-conventions/SKILL.md    # if Angular frontend
        ├── applying-react-conventions/SKILL.md      # if React frontend
        ├── applying-python-conventions/SKILL.md     # if FastAPI backend
        └── applying-java-conventions/SKILL.md       # if Spring Boot backend
```

> Skills are copied from `~/.claude/skills/` based on the selected stack. Every developer who clones the project gets the same AI conventions automatically.

---

## Speckit — Spec-Driven Development

ForgeKit integrates [Speckit](https://github.com/github/spec-kit), a specification-driven development workflow for Claude Code.

**What ForgeKit generates:**

```
my-project/
└── .specify/
    ├── memory/
    │   └── constitution.md        # Project architectural constitution
    └── templates/
        ├── spec-template.md
        ├── plan-template.md
        └── tasks-template.md
```

**Setup (once per project):**
```
/speckit.constitution   # Fill in the architectural constitution
```

The `session-start.sh` hook detects if the constitution is empty and prompts Claude to configure it at the start of each session.

**Fast track** *(simple feature, 1–3 tasks)*:
```
/speckit.workflow "feature description"
  → /speckit.specify   # spec.md
  → /speckit.tasks     # tasks.md (plan skipped)
  → TDD implementation
```

**Full workflow** *(complex feature)*:
```
/speckit.workflow "feature description"
  Phase 1 — SPEC
    → /speckit.specify    # spec.md
    → /speckit.clarify    # resolve ambiguities
    → /speckit.plan       # plan.md, data-model.md, contracts/
    → /speckit.tasks      # ordered tasks.md
    → /speckit.analyze    # consistency gate (blocks on CRITICAL)

  Phase 2 — IMPLEMENTATION
    → isolated worktree + TDD (RED → GREEN → REFACTOR) per task

  Phase 3 — COMPLETION
    → code review → PR
```

**Resume a workflow:**
```
/speckit.workflow   # no args = resumes last spec where it left off
```

---

## Dynamic version resolution

ForgeKit resolves the latest stable versions from npm and Maven Central at generation time:

- **npm (Angular):** Angular, PrimeNG, @primeuix/themes, NgRx Signals, Tailwind CSS, RxJS, TypeScript, zone.js
- **npm (React):** React, React Router, Vite (capped at v7 — `@vitejs/plugin-react@4.x` peer dep), axios, Tailwind CSS
- **Maven:** Spring Boot, SpringDoc OpenAPI, MapStruct
- **Packagist (Laravel):** Laravel framework, Sanctum, Scramble

Fallback versions are used if resolution fails.

---

## Persistent config

ForgeKit saves your preferences in `~/.forgekit/config.json` (Group ID, etc.) and reuses them automatically on the next run.

Each generated project also contains a `forgekit.json` manifest that tracks which layers and options were used. This enables `forgekit add` to detect the existing config without filesystem guessing.

---

## Architecture

```
src/
├── commands/new.ts              # `forgekit new` command
├── commands/add.ts              # `forgekit add` command
├── prompts/project.ts           # Interactive wizard (new)
├── prompts/add.ts               # Layer-specific prompts (add)
├── generators/
│   ├── base-generator.ts        # Abstract base class
│   ├── backend/index.ts         # Spring Boot generator
│   ├── fastapi/index.ts         # FastAPI generator
│   ├── laravel/index.ts         # Laravel generator
│   ├── nestjs/index.ts          # NestJS generator
│   ├── nextjs/index.ts          # Next.js generator
│   ├── frontend/index.ts        # Frontend router (Angular, React, or Vue)
│   ├── frontend/react-vite.ts   # React / Vite generator
│   ├── frontend/vue.ts          # Vue.js generator
│   ├── docker/index.ts          # Docker Compose generator
│   ├── claude-code/index.ts     # Claude Code config generator
│   ├── ci/index.ts              # GitHub Actions CI generator
│   ├── root/index.ts            # README + .gitignore
│   ├── speckit.ts               # Calls specify init
│   └── git.ts                   # Git init + first commit
├── templates/                   # Handlebars (.hbs) templates
│   ├── backend/                 # Spring Boot templates
│   ├── fastapi/                 # FastAPI templates
│   ├── laravel/                 # Laravel templates
│   ├── nestjs/                  # NestJS templates
│   ├── nextjs/                  # Next.js templates
│   ├── frontend/angular/        # Angular templates
│   ├── frontend/react-vite/     # React/Vite templates
│   ├── frontend/vue/            # Vue.js templates
│   ├── docker/                  # Docker Compose templates
│   ├── claude-code/             # CLAUDE.md, settings.json, hooks, hookify
│   ├── ci/                      # GitHub Actions templates
│   ├── root/                    # Root templates
│   └── shared/                  # Shared templates (prettier, git, etc)
├── utils/
│   ├── template-engine.ts       # Handlebars compile + render
│   ├── validation.ts            # Input validators
│   ├── system.ts                # CLI detection (claude, specify, docker)
│   ├── detect-project.ts        # Project detection (manifest + filesystem fallback)
│   └── forgekit-json.ts         # Read/write forgekit.json manifest
├── types.ts                     # BackendType, FrontendType, ProjectConfig
├── versions.ts                  # Dynamic version resolution
└── config.ts                    # Persistent config (~/.forgekit)
```

**Tech stack:** Node.js / TypeScript ESM · Handlebars · Commander.js · Inquirer.js · fs-extra · chalk

---

## Contributing

```bash
git clone https://github.com/salimomrani/forgekit.git
cd forgekit
npm install
npm test          # vitest run --coverage
npm run typecheck # tsc --noEmit
npm run lint      # eslint src/
npm run build     # compile to dist/
```

---

## License

MIT
