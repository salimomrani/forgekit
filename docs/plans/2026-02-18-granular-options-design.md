# Design : Options de configuration granulaires

**Date :** 2026-02-18
**Statut :** Approuvé

## Objectif

Permettre à l'utilisateur de choisir individuellement les fonctionnalités à inclure dans le projet généré, au lieu d'avoir certaines dépendances toujours activées (Flyway, OpenAPI, MapStruct).

## Approche retenue : Wizard structuré par sections (A)

Le wizard est divisé en 5 sections claires. Les flags CLI permettent de pré-remplir et skipper les questions.

## Nouvelles options

### Backend (optionnelles)
| Option | Était | Devient |
|--------|-------|---------|
| Flyway | Toujours inclus | Optionnel (défaut: ✓) |
| OpenAPI / Springdoc | Toujours inclus | Optionnel (défaut: ✓) |
| JWT / Spring Security | Flag `auth` | Renommé, même comportement |
| MapStruct | Toujours inclus | Optionnel (défaut: ✓) |

### Frontend (nouvelles)
| Option | Type | Défaut |
|--------|------|--------|
| UI Framework | Select exclusif (primeng / tailwind / none) | primeng |
| PrimeNG Preset | Select (Aura / Lara / Nora) | Aura |
| NgRx SignalStore | Boolean | false |

Tailwind : version 4 (`@import "tailwindcss"` dans SCSS, pas de config JS).

## Structure des types

```typescript
export type UIFramework = 'primeng' | 'tailwind' | 'none';
export type PrimeNGPreset = 'Aura' | 'Lara' | 'Nora';

export interface ProjectConfig {
  name: string;
  groupId: string;
  description: string;
  // Stack
  backend: boolean;
  frontend: boolean;
  // Backend features
  flyway: boolean;
  openapi: boolean;
  auth: boolean;        // Spring Security + JWT
  mapstruct: boolean;
  // Frontend
  uiFramework: UIFramework;
  primeNGPreset?: PrimeNGPreset;
  ngrx: boolean;
  // Infrastructure
  docker: boolean;
  ci: boolean;
  claudeCode: boolean;
  gitInit: boolean;
}
```

## Wizard flow

```
1. Projet     → name, groupId, description
2. Stack      → checkbox: Backend, Frontend
3. Backend    → checkbox (si backend): Flyway ✓ | OpenAPI ✓ | JWT ✗ | MapStruct ✓
4. Frontend   → select UI: PrimeNG → select preset (Aura/Lara/Nora)
                                   → confirm NgRx SignalStore ?
               Tailwind | Minimal
5. Infra      → checkbox: Docker ✓ | CI/CD ✓ | Claude Code ✓ | Git ✓
```

## Nouveaux flags CLI

```
--flyway / --no-flyway
--openapi / --no-openapi
--mapstruct / --no-mapstruct
--ngrx
--ui <primeng|tailwind|none>
--preset <aura|lara|nora>
```

## Fichiers concernés

### Modification
- `src/types.ts`
- `src/prompts/project.ts`
- `src/commands/new.ts`
- `src/generators/backend/index.ts`
- `src/generators/frontend/index.ts`
- `src/templates/backend/pom.xml.hbs`
- `src/templates/backend/application.yml.hbs`
- `src/templates/frontend/package.json.hbs`
- `src/templates/frontend/app.config.ts.hbs`
- `src/templates/frontend/styles.scss.hbs`

### Création
- `src/templates/frontend/ngrx-app-store.ts.hbs`

## Valeurs par défaut (profil Standard)

- Backend : Flyway ✓, OpenAPI ✓, JWT ✗, MapStruct ✓
- Frontend : PrimeNG Aura, NgRx ✗
- Infra : Docker ✓, CI ✓, Claude Code ✓, Git ✓
