# ForgeKit — Codex Instructions

## Release

Always use `/forgekit.release` to publish a new version.

- Never use `npm publish` directly
- Never bump `package.json` manually — tag triggers the pipeline: `git tag vX.Y.Z && git push origin vX.Y.Z`
- GitHub Actions handles: lint → test → build → npm → GitHub Release

## Tests

Scripts: `npm test` | `npm run typecheck` | `npm run lint`

## Skill

The `forgekit-conventions` skill (~/.Codex/skills/forgekit-conventions/SKILL.md) contains project conventions, debugged patterns, and the key structure. It triggers automatically when working on ForgeKit.
