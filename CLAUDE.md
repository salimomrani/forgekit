# ForgeKit — Claude Code Instructions

## Workflow Routing (Mandatory)

- **Feature / Non-trivial change**: Utiliser systématiquement `/speckit.workflow`.

## Release

Always use `/forgekit.release` to publish a new version.

- Never use `npm publish` directly
- Never bump `package.json` manually — tag triggers the pipeline: `git tag vX.Y.Z && git push origin vX.Y.Z`
- GitHub Actions handles: lint → test → build → npm → GitHub Release

## Tests

Scripts: `npm test` | `npm run typecheck` | `npm run lint`

Test fixtures centralisées dans `src/__tests__/fixtures.ts` — utiliser `makeBaseConfig(overrides)` et `BASE_VERSIONS` dans tous les nouveaux tests, jamais inline.

## Checklist — Nouveau champ `ProjectConfig`

Quand on ajoute un champ booléen à `ProjectConfig` (ex: `eslint`, `prettier`) :

1. `src/types.ts` — ajouter le champ
2. `src/versions.ts` — si packages npm associés : `ResolvedVersions` + `FALLBACK_VERSIONS` + `resolveVersions()`
3. Générateurs frontend — logique conditionnelle
4. `src/prompts/project.ts` — checkbox + return
5. `src/prompts/add.ts` — guard frontend si applicable
6. **`src/commands/add.ts`** — `LAYER_CONFIG_MAP` **ET** `case` dans `runLayerGenerator` (souvent oublié)
7. `src/__tests__/fixtures.ts` — ajouter le champ avec valeur par défaut `false`
8. `src/__tests__/add-command.test.ts` — test du guard `promptAddLayerConfig`

## Skill

The `applying-forgekit-conventions` skill (~/.claude/skills/applying-forgekit-conventions/SKILL.md) contains project conventions, debugged patterns, and the key structure. It triggers automatically when working on ForgeKit.
