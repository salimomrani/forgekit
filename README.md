<p align="center">
  <img src="assets/logo.svg" alt="ForgeKit" width="120" />
</p>

<h1 align="center">ForgeKit</h1>

<p align="center">
  CLI de scaffolding full-stack qui génère des projets <strong>Spring Boot + Angular</strong> préconfigurés et prêts à l'emploi.<br/>
  Fini la configuration répétitive : une commande, un projet complet.
</p>

## Installation

```bash
git clone https://github.com/iconsulting/forgekit.git
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
? Group ID : (com.example)
? Description : (Mon application)
? Que voulez-vous générer ? (Backend + Frontend)
? Configurer Docker Compose ? (Oui)
? Configurer Claude Code ? (Oui)
? Initialiser Git ? (Oui)
```

### Mode commande directe

```bash
forgekit new mon-app --group com.salim --backend --frontend --docker --claude-code
```

### Options disponibles

| Flag | Description |
|---|---|
| `--group <id>` | Group ID Java (ex: `com.salim`) |
| `--description <desc>` | Description du projet |
| `--backend` | Inclure le backend Spring Boot |
| `--frontend` | Inclure le frontend Angular |
| `--docker` | Inclure Docker Compose |
| `--claude-code` | Inclure la config Claude Code |
| `--no-git` | Ne pas initialiser Git |

## Projet généré

```
mon-projet/
├── backend/                 # Spring Boot 4.0.2 / Java 21
├── frontend/                # Angular 21 / PrimeNG 21
├── docker-compose.yml       # PostgreSQL 17 + pgAdmin
├── CLAUDE.md                # Conventions Claude Code
├── .claude/settings.json    # Permissions Claude Code
├── .gitignore
└── README.md
```

### Backend — Spring Boot

**Dépendances incluses :**
Spring Web, Spring Data JPA, PostgreSQL, Spring Security, Spring Validation, Lombok, MapStruct, SpringDoc OpenAPI, Flyway, Spring Actuator.

**Structure :**

```
backend/src/main/java/com/{group}/{name}/
├── Application.java
├── config/
│   ├── SecurityConfig.java           # CORS, CSRF, JWT-ready
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

### Frontend — Angular

**Dépendances incluses :**
Angular (dernière version), PrimeNG (thème Aura), PrimeIcons, PrimeFlex, NgRx SignalStore.

**Structure :**

```
frontend/src/app/
├── app.component.ts            # Standalone, OnPush
├── app.routes.ts               # Routes lazy-loaded
├── app.config.ts               # Providers
├── layout/
│   ├── layout.component.ts     # Shell (sidebar + topbar + router-outlet)
│   ├── sidebar/
│   └── topbar/
├── core/
│   ├── interceptors/           # Auth + Error interceptors
│   ├── guards/                 # Auth guard
│   └── services/               # Auth service (signals)
├── shared/                     # Composants et pipes réutilisables
└── features/                   # Structure par feature
```

**Prêt à l'emploi :**
- Layout sidebar/topbar fonctionnel
- Thème Aura PrimeNG appliqué
- Intercepteurs HTTP câblés
- NgRx SignalStore prêt par feature
- Standalone components, signals, `@if`/`@for`, OnPush

### Docker Compose

| Service | Port | Description |
|---|---|---|
| PostgreSQL 17 | 5432 | Base de données avec volume persistant |
| pgAdmin | 5050 | Interface web (admin@admin.com / admin) |

### Claude Code

Génère automatiquement :
- **`CLAUDE.md`** — Conventions du projet, commandes, structure
- **`.claude/settings.json`** — Permissions préconfigurées (mvn, ng, npm, docker)

## Démarrage rapide d'un projet généré

```bash
# Générer le projet
forgekit new mon-app --group com.salim --backend --frontend --docker --claude-code

# Démarrer l'infrastructure
cd mon-app
docker compose up -d

# Démarrer le backend (port 8080)
cd backend && ./mvnw spring-boot:run

# Démarrer le frontend (port 4200)
cd frontend && npm install && ng serve
```

## Config persistante

ForgeKit retient vos préférences dans `~/.forgekit/config.json` (Group ID, etc.) pour les réutiliser automatiquement.

## Architecture du CLI

```
src/
├── commands/new.ts              # Commande principale (try/catch + rollback)
├── prompts/project.ts           # Wizard interactif avec validation
├── generators/
│   ├── base-generator.ts        # Classe abstraite commune
│   ├── backend/index.ts         # BackendGenerator
│   ├── frontend/index.ts        # FrontendGenerator
│   ├── docker/index.ts          # DockerGenerator
│   ├── claude-code/index.ts     # ClaudeCodeGenerator
│   ├── root/index.ts            # RootGenerator (README + .gitignore)
│   └── git.ts                   # Initialisation Git
├── templates/                   # 39 templates Handlebars (.hbs)
│   ├── backend/                 # 14 templates
│   ├── frontend/                # 20 templates
│   ├── docker/                  # 1 template
│   ├── claude-code/             # 2 templates
│   └── root/                    # 2 templates
├── utils/
│   ├── template-engine.ts       # Handlebars compile + render
│   └── validation.ts            # Validation inputs
├── types.ts
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
