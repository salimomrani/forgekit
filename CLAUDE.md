# forgekit

CLI de scaffolding full-stack — génère des projets Spring Boot/FastAPI + Angular avec Docker, CI/CD et config Claude Code en une commande.

## Tech Stack

- **Runtime**: Node.js ≥20, TypeScript 5.9
- **CLI**: Commander 14, Inquirer 8, Handlebars 4
- **Tests**: Vitest 4 + @vitest/coverage-v8

## Commands

| Action | Command |
|--------|---------|
| Dev | `npm run dev` |
| Build | `npm run build` |
| Tests | `npm test` |
| Unit tests | `npm run test:unit` |
| E2E tests | `npm run test:e2e` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Validate Renovate config | `npm run renovate:validate` |
| Release | `git tag vX.Y.Z && git push origin vX.Y.Z` |

## Workflow Mode: speckit

## Git

- PR obligatoire avant tout merge sur `master` — pas de push direct.
- Commit skill: `commit-commands:commit-push-pr`

## Claude Settings

| Clé | Fichier | Valeur | Description |
|-----|---------|--------|-------------|
| `git.strategy` | `settings.json` | `pr-required` | Stratégie git — lue par `vibe.workflow` step 7 |
| `speckit.tests` | `settings.json` | `true` | Génération de tests |
| `speckit.tdd` | `settings.json` | `false` | Mode RED→GREEN |
| `speckit.test-types` | `settings.json` | `unit` | Types de tests |
| `speckit.code-review` | `settings.json` | `true` | Code review automatique |
| `speckit.security-review` | `settings.json` | `auto` | Security review |
| `speckit.verification` | `settings.json` | `minimal` | Niveau de vérification |
| `speckit.plan-detail` | `settings.json` | `medium` | Détail du plan |
| `speckit.skip-clarify` | `settings.json` | `false` | Sauter sk.clarify |
| `speckit.fast-mode` | `settings.json` | `false` | Fast mode |
| `speckit.subagents` | `settings.json` | `true` | Utiliser subagent-driven-development |

> `settings.local.json` overrides `settings.json` pour tous ces champs.

## Automated dependency updates

Renovate (GitHub App) ouvre des PRs chaque lundi matin. Config : `renovate.json`.

- `package.json` deps : minor/patch groupés, majors séparés. **Auto-merge désactivé** — chaque PR demande review manuelle (pas de branch protection sur `master`).
- `FALLBACK_VERSIONS` (`src/versions.ts`) : bumpées via custom regex manager. Chaque constante porte un marker `// renovate: datasource=<npm|maven|packagist> depName=<pkg>`. Ne pas retirer le marker — le test `renovate-config.test.ts` échoue avec le nom de la clé manquante.
- `next-auth` suit la dist-tag `beta` (v5 beta chain).
- Pour réactiver l'auto-merge plus tard : activer d'abord la branch protection `master` (jobs `ci.yml` en required checks), puis basculer le `packageRules` global sur `automerge: true`.
- Valider la config : `npm run renovate:validate`.
