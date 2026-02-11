# ForgeKit — Design Document

## Vision

CLI de scaffolding full-stack qui génère des projets préconfigurés et prêts à l'emploi, évitant la configuration répétitive à chaque nouveau projet.

## Stack du CLI

- **Runtime:** Node.js 22 / TypeScript
- **Commandes:** Commander.js
- **Prompts interactifs:** Inquirer.js
- **Templating:** Handlebars
- **Utilitaires:** fs-extra, chalk

## Commandes

### `forgekit new [nom]`

Génère un projet monorepo full-stack.

**Flags disponibles :**
- `--group <groupId>` — Group ID Java (ex: com.salim)
- `--description <desc>` — Description du projet
- `--backend spring` — Inclure le backend Spring Boot
- `--frontend angular` — Inclure le frontend Angular
- `--docker` — Inclure Docker Compose
- `--claude-code` — Inclure config Claude Code
- `--no-git` — Ne pas initialiser Git

**Mode interactif (sans flags) :** Wizard avec valeurs par défaut modifiables.

## Projet généré (monorepo)

```
<nom-projet>/
├── backend/                # Spring Boot 4.0.1
├── frontend/               # Angular 21
├── docker-compose.yml      # PostgreSQL 17 + pgAdmin
├── CLAUDE.md               # (optionnel) Conventions pour Claude Code
├── .claude/settings.json   # (optionnel) Permissions Claude Code
├── .gitignore
└── README.md
```

## Backend — Spring Boot 4.0.1

### Dépendances

- Spring Web
- Spring Data JPA
- PostgreSQL Driver
- Spring Security
- Spring Validation (Jakarta)
- Lombok
- MapStruct + annotation processor
- SpringDoc OpenAPI
- Flyway
- Spring Actuator

### Structure

```
backend/src/main/java/com/{group}/{name}/
├── Application.java
├── config/
│   ├── SecurityConfig.java       # CORS, CSRF, JWT-ready
│   └── OpenApiConfig.java
├── shared/
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java
│   │   └── ApiError.java         # Record
│   └── dto/
│       └── PageResponse.java     # Record générique pagination
└── feature/                      # Vide, structure par feature
```

### Configuration

- `application.yml` — Config principale avec variables d'env
- `application-dev.yml` — Profil dev pointant vers Docker Compose
- `db/migration/V1__init.sql` — Migration Flyway vide prête

## Frontend — Angular 21

### Dépendances

- Angular 21 (dernière version)
- PrimeNG v21 (thème Aura)
- PrimeIcons
- PrimeFlex
- NgRx SignalStore

### Structure

```
frontend/src/app/
├── app.component.ts          # Standalone, OnPush
├── app.routes.ts             # Routes lazy-loaded
├── app.config.ts             # Providers
├── layout/
│   ├── sidebar/sidebar.component.ts
│   ├── topbar/topbar.component.ts
│   └── layout.component.ts  # Shell (sidebar + topbar + router-outlet)
├── core/
│   ├── interceptors/
│   │   ├── auth.interceptor.ts
│   │   └── error.interceptor.ts
│   ├── guards/auth.guard.ts
│   └── services/auth.service.ts
├── shared/
│   ├── components/
│   └── pipes/
└── features/                 # Vide, structure par feature
```

### Prêt à l'emploi

- Layout sidebar/topbar fonctionnel
- Thème Aura PrimeNG appliqué
- Intercepteurs HTTP câblés
- SignalStore prêt par feature
- Standalone components, signals, @if/@for, OnPush

## Docker Compose

- **PostgreSQL 17** — Port 5432, volume persistant
- **pgAdmin** — Port 5050, accès web

## Claude Code (optionnel)

- **CLAUDE.md** — Conventions adaptées au projet généré
- **`.claude/settings.json`** — Permissions pour mvn, ng, npm

## Config persistante

`~/.forgekit/config.json` retient les préférences (group ID, choix habituels).

## Wizard — Valeurs par défaut

| Question                   | Défaut                        |
|----------------------------|-------------------------------|
| Nom du projet              | Nom du dossier courant        |
| Group ID                   | Dernière valeur utilisée      |
| Description                | "Mon application"             |
| Backend + Frontend         | Les deux cochés               |
| Docker Compose             | Oui                           |
| Claude Code                | Oui                           |
| Git init                   | Oui                           |

## Plan d'implémentation

### Phase 1 — Setup CLI
1. Init projet Node.js/TypeScript
2. Commander.js (commande `new` + flags)
3. Inquirer.js (wizard + valeurs par défaut)
4. Config persistante (~/.forgekit/config.json)

### Phase 2 — Générateurs
5. Backend Spring Boot
6. Frontend Angular
7. Docker Compose
8. Claude Code

### Phase 3 — Finition
9. Git init + premier commit
10. Message de succès
11. Build CLI + npm link pour usage local
