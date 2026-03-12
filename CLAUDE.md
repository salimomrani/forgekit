# ForgeKit — Claude Code Instructions

## Release

Always use `/forgekit.release` to publish a new version.

```bash
git tag vX.Y.Z && git push origin vX.Y.Z
```

- Never use `npm publish` directly
- Never bump `package.json` manually
- GitHub Actions pipeline handles everything: lint → test → build → npm → GitHub Release

## Workflow

- All functional changes → **PR required** (never push directly to master)
- Branches: `feat/`, `fix/`, `refactor/`, `chore/` — conventional commits

## Tests

```bash
npm test           # vitest run --coverage
npm run typecheck  # tsc --noEmit
npm run lint       # eslint src/
```

## Skill

The `forgekit-conventions` skill (~/.claude/skills/forgekit-conventions/SKILL.md) contains project conventions, debugged patterns, and the key structure. It triggers automatically when working on ForgeKit.

## Stack

- Runtime: Node.js / TypeScript ESM
- Templates: Handlebars (.hbs) in `src/templates/`
- CLI: Commander.js + Inquirer.js
- Tests: Vitest
- Build: `npm run build` → `dist/`
