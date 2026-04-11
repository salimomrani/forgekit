# forgekit

CLI Node.js/TypeScript qui génère des projets Spring Boot + Angular ou FastAPI + Angular avec Docker, CI/CD et config Claude Code.

## Tech Stack

- **Runtime**: Node.js >= 20, TypeScript ^5.9.3
- **CLI libs**: Commander ^14, Inquirer ^8, Handlebars ^4, Chalk ^5, fs-extra ^11
- **Test**: Vitest ^4 (unit + e2e)

## Commands

| Action | Command |
|--------|---------|
| Dev | `npm run dev` |
| Build | `npm run build` |
| Tests (all) | `npm test` |
| Tests (unit) | `npm run test:unit` |
| Tests (e2e) | `npm run test:e2e` |
| Lint | `npm run lint` |
| Release | `git tag vX.Y.Z && git push origin vX.Y.Z` |

## Workflow Mode: speckit

## Workflow Routing

| Scenario | Action |
|----------|--------|
| Feature / non-trivial change | `/speckit.workflow` |
| Small fix (< 5 lines, docs) | Direct edit, no spec |
| Bug | `superpowers:systematic-debugging` |

## Active Technologies
- TypeScript 5.9 (ForgeKit), Node.js ≥ 20 + Commander, Inquirer, Handlebars, fs-extra, chalk (existing) (008-nextjs-backend)
- PostgreSQL (generated docker-compose) (008-nextjs-backend)
- TypeScript 5.9 (ForgeKit CLI), Node.js ≥ 20 (009-vue-frontend)
- N/A (CLI generator — no persistent data) (009-vue-frontend)

## Recent Changes
- 008-nextjs-backend: Added TypeScript 5.9 (ForgeKit), Node.js ≥ 20 + Commander, Inquirer, Handlebars, fs-extra, chalk (existing)
