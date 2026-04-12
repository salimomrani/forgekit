# forgekit

CLI Node.js/TypeScript qui génère des projets full-stack (Spring Boot, FastAPI, Angular, React, Vue, Docker, CI/CD, Claude Code config) en une commande.

## Tech Stack

- **Runtime**: Node.js ≥ 20, TypeScript 5.9
- **CLI libs**: commander, @inquirer/prompts, chalk, handlebars, fs-extra
- **Test**: Vitest 4 + coverage-v8

## Commands

| Action | Command |
|--------|---------|
| Dev | `npm run dev` |
| Build | `npm run build` |
| Tests | `npm test` |
| Tests unitaires | `npm run test:unit` |
| Tests e2e | `npm run test:e2e` |
| Typecheck | `npm run typecheck` |
| Release | `git tag vX.Y.Z && git push origin vX.Y.Z` |

## Workflow Mode: speckit

## Speckit Config
tests: true
tdd: false
test-types: unit
code-review: true
security-review: auto
verification: minimal
plan-detail: medium
skip-clarify: false
subagents: true
