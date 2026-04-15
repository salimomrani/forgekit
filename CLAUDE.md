# forgekit

CLI de scaffolding full-stack — génère des projets Spring Boot / FastAPI + Angular avec Docker, CI/CD et config Claude Code.

## Tech Stack

- **Runtime**: Node.js ≥ 20, TypeScript 5.9
- **Test**: Vitest 4 + coverage-v8
- **Lint/Format**: ESLint 10 + Prettier 3

## Commands

| Action | Command |
|--------|---------|
| Dev | `npm run dev` |
| Build | `npm run build` |
| Tests (all) | `npm run test` |
| Tests (unit) | `npm run test:unit` |
| Tests (e2e) | `npm run test:e2e` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |

## Release

Tag + push only — GitHub Actions publie sur npm :
```
git tag vX.Y.Z && git push origin vX.Y.Z
```
Ou utiliser `/forgekit.release`.

## Workflow Mode: vibe
