# ForgeKit — Instructions Claude Code

## Release

Toujours utiliser `/forgekit.release` pour publier une nouvelle version.

```bash
git tag vX.Y.Z && git push origin vX.Y.Z
```

- Ne jamais utiliser `npm publish` directement
- Ne jamais bumper `package.json` manuellement
- Le pipeline GitHub Actions gère tout : lint → test → build → npm → GitHub Release

## Workflow

- Tout changement fonctionnel → **PR obligatoire** (jamais directement sur master)
- Branches : `feat/`, `fix/`, `refactor/`, `chore/` — conventional commits

## Tests

```bash
npm test           # vitest run --coverage
npm run typecheck  # tsc --noEmit
npm run lint       # eslint src/
```

## Stack

- Runtime : Node.js / TypeScript ESM
- Templates : Handlebars (.hbs) dans `src/templates/`
- CLI : Commander.js + Inquirer.js
- Tests : Vitest
- Build : `npm run build` → `dist/`
