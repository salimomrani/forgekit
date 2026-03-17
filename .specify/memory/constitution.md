# ForgeKit — Project Constitution

## 1. Each generator owns exactly one layer
No generator touches another generator's output directory.
A generator that spans multiple concerns must be split.

## 2. Templates contain zero logic
All conditionals, loops, and data transforms live in generators.
A template receives a flat data object and renders it — nothing more.

## 3. ProjectConfig is the single source of truth
Every generator receives ProjectConfig. No generator derives config from
the filesystem, environment, or side effects. Config flows top-down only.

## 4. Fail fast, rollback completely
Any generation error deletes the entire project directory and exits 1.
Partial state is never acceptable — either the full project is generated
or nothing is.

## 5. Network failures are silent and recoverable
Version fetches fail silently and fall back to FALLBACK_VERSIONS.
No feature is blocked by a network failure.

## 6. No speculative abstractions
No helper function, utility, or base class unless it is used in 3+
distinct callsites. Build for what exists today, not for hypothetical reuse.
Exception: complex or security-critical logic shared by 2+ generators
must be extracted immediately regardless of callsite count.

## 7. Tests declare all fixture fields
TypeScript fixture objects must include every required field in the type.
Partial fixtures cause silent CI failures. Injectable dependencies
(file paths, CLI tools) must be parameterizable via constructor args.

## 8. CLI detection is synchronous and early
spawnSync with stdio: "ignore". Happens before any async prompt setup.
Use --help (not --version) for tools that return non-zero on --version.

## 9. Release only through the pipeline
Never: npm publish, manual package.json version bumps.
Always: git tag vX.Y.Z && git push origin vX.Y.Z — GitHub Actions does the rest.

## 10. I/O is parallelized
File writes and version fetches use Promise.all() wherever independent.
Sequential generation is reserved for tasks with explicit dependencies.
