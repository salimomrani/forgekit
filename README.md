<p align="center">
  <img src="assets/logo.svg" alt="ForgeKit" width="120" />
</p>

<h1 align="center">ForgeKit</h1>

<p align="center">
  CLI de scaffolding full-stack qui génère des projets préconfigurés et prêts à l'emploi.<br/>
  Choisissez votre backend (Spring Boot ou FastAPI), votre frontend, et lancez.
</p>

## Installation

```bash
npm i -g @iconsulting-dev/forgekit
```

### Depuis les sources

```bash
git clone https://github.com/salimomrani/forgekit.git
cd forgekit
npm install
npm run build
npm link
```

## Utilisation

### Mode interactif (wizard)

```bash
forgekit new
```

Un wizard vous guide avec des valeurs par défaut modifiables :

```
? Nom du projet : (mon-app)
? Description : (Mon application)
? Backend : (Spring Boot (Java 21) | FastAPI (Python) | Aucun)
? Inclure le frontend Angular ? (Oui)
? Group ID : (com.example)                          ← Spring Boot uniquement
? Fonctionnalités backend : (Flyway ✓  OpenAPI ✓  JWT ✗  MapStruct ✓)  ← Spring Boot uniquement
? Framework UI : (PrimeNG)
? Preset PrimeNG : (Aura)
? Inclure NgRx SignalStore ? (Non)
? Infrastructure : (Docker ✓  CI/CD ✓  Claude Code ✓  Git ✓)    ← Claude Code auto-décoché si claude CLI absent
```

### Mode commande directe

```bash
# Projet Spring Boot + Angular
forgekit new mon-app --spring-boot --group com.salim --frontend --docker --claude-code

# Projet FastAPI + Angular
forgekit new mon-app --fastapi --frontend --docker --claude-code

# Backend FastAPI seul
forgekit new mon-api --fastapi --no-frontend --no-docker
```

### Options disponibles

| Flag | Description |
|---|---|
| `--spring-boot` | Backend Spring Boot (Java 21) |
| `--fastapi` | Backend FastAPI (Python 3.12) |
| `--frontend` / `--no-frontend` | Inclure/exclure le frontend Angular |
| `--group <id>` | Group ID Java (ex: `com.salim`) — Spring Boot uniquement |
| `--description <desc>` | Description du projet |
| `--auth` | Inclure Spring Security + interceptors Angular |
| `--flyway` / `--no-flyway` | Inclure/exclure Flyway (migrations SQL) |
| `--openapi` / `--no-openapi` | Inclure/exclure OpenAPI / Swagger UI |
| `--mapstruct` / `--no-mapstruct` | Inclure/exclure MapStruct |
| `--ngrx` / `--no-ngrx` | Inclure/exclure NgRx SignalStore |
| `--ui <framework>` | Framework UI : `primeng` \| `tailwind` \| `none` |
| `--preset <preset>` | Preset PrimeNG : `Aura` \| `Lara` \| `Nora` |
| `--docker` / `--no-docker` | Inclure/exclure Docker Compose |
| `--ci` / `--no-ci` | Inclure/exclure GitHub Actions CI |
| `--claude-code` / `--no-claude-code` | Inclure/exclure la config Claude Code |
| `--no-git` | Ne pas initialiser Git |

## Projet généré

```
mon-projet/
├── backend/                 # Spring Boot 4.x / Java 21  — ou —  FastAPI / Python 3.12
├── frontend/                # Angular 21 / PrimeNG 21
├── docker-compose.yml       # PostgreSQL 17 + pgAdmin (+ service api si FastAPI)
├── .github/workflows/       # CI GitHub Actions
├── CLAUDE.md                # Conventions, workflow routing, constitution ref
├── .claude/                 # Hooks, hookify guards, skills, settings
├── .specify/memory/         # Constitution architecturale
├── .gitignore
└── README.md
```

### Backend — Spring Boot

**Dépendances incluses (par défaut) :**
Spring Web, Spring Data JPA, PostgreSQL, Spring Validation, Lombok, Spring Actuator.

**Optionnelles (activées par défaut, désactivables) :**
Flyway (`--flyway`), SpringDoc OpenAPI (`--openapi`), MapStruct (`--mapstruct`).

**Avec `--auth` :** Spring Security (CORS, CSRF disabled, stateless, JWT-ready).

**Structure :**

```
backend/src/main/java/com/{group}/{name}/
├── Application.java
├── config/
│   ├── SecurityConfig.java           # (si --auth) CORS, stateless, JWT-ready
│   └── OpenApiConfig.java
├── shared/
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java
│   │   └── ApiError.java             # Record
│   └── dto/
│       └── PageResponse.java         # Record pagination
└── feature/                          # Structure par feature
```

**Configurations :**
- `application.yml` — Config principale avec variables d'env
- `application-dev.yml` — Profil dev pointant vers Docker Compose
- `db/migration/V1__init.sql` — Migration Flyway prête

### Backend — FastAPI

**Stack :** FastAPI, uvicorn, pydantic-settings, pytest, httpx

**Structure :**

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Entrée FastAPI
│   ├── config.py            # pydantic-settings
│   └── routers/
│       └── health.py        # GET /health
├── tests/
│   └── test_health.py       # pytest + TestClient
├── requirements.txt          # Dépendances épinglées
├── Dockerfile               # python:3.12-slim + uvicorn
└── .python-version          # 3.12
```

**Démarrage :**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload   # port 8000
pytest                          # tests
```

### Frontend — Angular

**Framework UI (choix exclusif) :**
- `primeng` *(défaut)* — PrimeNG avec preset `Aura` / `Lara` / `Nora`
- `tailwind` — Tailwind CSS v4 (`@import "tailwindcss"`, sans config JS)
- `none` — Minimal, sans dépendance UI

**Optionnel :** NgRx SignalStore (`--ngrx`) — store `AppStore` généré dans `core/store/`.

**Structure :**

```
frontend/src/app/
├── app.component.ts            # Standalone, OnPush
├── app.routes.ts               # Routes lazy-loaded
├── app.config.ts               # Providers (PrimeNG Aura, HttpClient, Router)
├── layout/
│   ├── layout.component.ts     # Shell (sidebar + topbar + router-outlet)
│   ├── sidebar/
│   └── topbar/
├── core/                       # (si --auth)
│   ├── interceptors/           # Auth + Error interceptors
│   ├── guards/                 # Auth guard
│   └── services/               # Auth service (signals)
├── shared/                     # Composants et pipes réutilisables
└── features/
    └── home/                   # Page d'accueil par défaut
```

### Docker Compose

| Service | Port | Description |
|---|---|---|
| PostgreSQL 17 | 5432 | Base de données avec volume persistant |
| pgAdmin | 5050 | Interface web (admin@admin.com / admin) |
| api *(FastAPI)* | 8000 | Service FastAPI (si `--fastapi`) |

### Claude Code

Génère automatiquement une configuration complète et prête à l'emploi :

```
mon-projet/
├── CLAUDE.md                          # Workflow routing, TDD rules, constitution ref
├── .claudeignore                      # Fichiers exclus du contexte Claude
├── .claude/
│   ├── settings.json                  # Permissions + hooks (SessionStart, PreToolUse, PreCompact)
│   ├── hooks/
│   │   ├── pre-bash.sh               # Guard bash (ex: bloque npm install hors frontend/)
│   │   └── session-start.sh          # Auto-charge la constitution ; détecte si non configurée et demande /speckit.constitution
│   ├── hookify.block-dangerous-rm.local.md   # Bloque rm -rf
│   ├── hookify.block-force-push.local.md     # Bloque git push --force
│   ├── hookify.block-no-verify.local.md      # Bloque --no-verify
│   ├── hookify.stop-verify-tests.local.md    # Rappel TDD à la fin de session
│   ├── hookify.warn-console-log.local.md     # Avertit sur console.log
│   ├── hookify.warn-env-edit.local.md        # Avertit sur édition .env
│   ├── hookify.warn-no-test-before-commit.local.md  # Rappel tests avant commit
│   ├── hookify.warn-todo-fixme.local.md      # Avertit sur TODO/FIXME
│   └── skills/                        # Skills copiés selon le stack
│       ├── applying-angular-conventions/SKILL.md   # si frontend Angular
│       ├── applying-python-conventions/SKILL.md    # si backend FastAPI
│       └── applying-java-conventions/SKILL.md      # si backend Spring Boot
└── .specify/
    └── memory/
        └── constitution.md            # Constitution architecturale (auto-chargée)
```

Les skills sont copiés depuis `~/.claude/skills/` selon le stack sélectionné — chaque dev qui clone le projet dispose des mêmes conventions.

## Versions dynamiques

ForgeKit résout automatiquement les dernières versions stables depuis npm et Maven Central au moment de la génération :
- Angular, PrimeNG, @primeuix/themes, NgRx Signals, Tailwind CSS, RxJS, TypeScript, zone.js
- Spring Boot, SpringDoc, MapStruct

Des versions fallback sont utilisées si la résolution échoue.

## Config persistante

ForgeKit retient vos préférences dans `~/.forgekit/config.json` (Group ID, etc.) pour les réutiliser automatiquement.

## Architecture du CLI

```
src/
├── commands/new.ts              # Commande principale (try/catch + rollback)
├── prompts/project.ts           # Wizard interactif avec validation
├── generators/
│   ├── base-generator.ts        # Classe abstraite commune
│   ├── backend/index.ts         # BackendGenerator (Spring Boot)
│   ├── fastapi/index.ts         # FastAPIGenerator
│   ├── frontend/index.ts        # FrontendGenerator
│   ├── docker/index.ts          # DockerGenerator
│   ├── claude-code/index.ts     # ClaudeCodeGenerator
│   ├── root/index.ts            # RootGenerator (README + .gitignore)
│   └── git.ts                   # Initialisation Git
├── templates/                   # Templates Handlebars (.hbs)
│   ├── backend/                 # Spring Boot (14 templates)
│   ├── fastapi/                 # FastAPI (8 templates)
│   ├── frontend/                # Angular (21 templates)
│   ├── docker/                  # Docker Compose
│   ├── claude-code/             # CLAUDE.md, settings.json, hooks, hookify, specify
│   ├── ci/                      # GitHub Actions
│   └── root/                    # README + .gitignore
├── utils/
│   ├── template-engine.ts       # Handlebars compile + render
│   ├── validation.ts            # Validation inputs
│   └── system.ts                # isClaudeInstalled() — détection CLI
├── types.ts                     # BackendType, ProjectConfig
├── versions.ts                  # Résolution dynamique Maven + NPM
└── config.ts                    # Config persistante (~/.forgekit)
```

### Stack technique

- **Runtime :** Node.js / TypeScript (ESM)
- **Templates :** Handlebars
- **Commandes :** Commander.js
- **Prompts :** Inquirer.js
- **Utilitaires :** fs-extra, chalk

## Licence

MIT
