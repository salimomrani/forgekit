# Implementation Plan: React/Vite Frontend Option

**Spec**: specs/002-react-vite-frontend/spec.md
**Branch**: 002-react-vite-frontend
**Date**: 2026-03-17

---

## Architecture Decision

### Type System Migration Strategy

`ProjectConfig.frontend: boolean` → `ProjectConfig.frontend: FrontendType`

```typescript
export type FrontendType = "angular" | "react-vite" | null;
```

Three derived booleans computed inline wherever needed:
- `hasFrontend` = `config.frontend !== null`
- `angular`    = `config.frontend === "angular"`
- `reactVite`  = `config.frontend === "react-vite"`

All existing `{{#if frontend}}` template blocks receive `hasFrontend` — zero regression.
New `{{#if angular}}` and `{{#if reactVite}}` blocks added where needed.

### Generator Architecture

New `ReactViteGenerator` in `src/generators/frontend/react-vite.ts`.
`FrontendGenerator` (Angular) in `src/generators/frontend/index.ts` is **untouched**.
`src/generators/frontend/index.ts` becomes a router:

```typescript
export async function generateFrontend(projectDir, config, versions) {
  if (config.frontend === "angular") {
    await generateAngularFrontend(projectDir, config, versions);
  } else if (config.frontend === "react-vite") {
    await generateReactViteFrontend(projectDir, config, versions);
  }
}
```

### Wizard Strategy

Frontend prompt changes from `confirm` to `select`:
- None → `false`
- Angular (existing) → `"angular"`
- React (Vite + Tailwind) → `"react-vite"`

PrimeNG and NgRx questions: shown only if `frontend === "angular"`.
`uiFramework` auto-set to `"tailwind"` when `frontend === "react-vite"` (no user prompt).

---

## Files to Create

### New generator
- `src/generators/frontend/react-vite.ts`

### New templates
- `src/templates/frontend/react-vite/vite.config.ts.hbs`
- `src/templates/frontend/react-vite/tsconfig.json.hbs`
- `src/templates/frontend/react-vite/tailwind.config.ts.hbs`
- `src/templates/frontend/react-vite/index.html.hbs`
- `src/templates/frontend/react-vite/gitignore.hbs`
- `src/templates/frontend/react-vite/src/main.tsx.hbs`
- `src/templates/frontend/react-vite/src/App.tsx.hbs`
- `src/templates/frontend/react-vite/src/index.css.hbs`
- `src/templates/frontend/react-vite/src/router/index.tsx.hbs`
- `src/templates/frontend/react-vite/src/hooks/useAuth.ts.hbs`      ← auth only
- `src/templates/frontend/react-vite/src/components/ProtectedRoute.tsx.hbs` ← auth only
- `src/templates/frontend/react-vite/src/lib/http.ts.hbs`           ← auth only

---

## Files to Modify

| File | Change |
|---|---|
| `src/types.ts` | Add `FrontendType`, replace `frontend: boolean` with `frontend: FrontendType` |
| `src/versions.ts` | Add `react`, `reactRouter`, `vite`, `axiosReact` fields + npm fetches |
| `src/prompts/project.ts` | Replace `confirm` with `select` for frontend; gate PrimeNG/NgRx on `angular` |
| `src/commands/new.ts` | Add `--react` / `--no-react` flags, update `frontend` default handling, wire React generator |
| `src/generators/frontend/index.ts` | Add router dispatch; rename Angular class export |
| `src/generators/claude-code/index.ts` | Add `reactVite` allowed commands + `applying-react-conventions` reference |
| `src/templates/claude-code/CLAUDE.md.hbs` | Add `{{#if reactVite}}` block; rename `{{#if frontend}}` → `{{#if hasFrontend}}` where needed |
| `src/templates/claude-code/rules/frontend.md.hbs` | Add conditional React conventions block |
| `src/templates/docker/docker-compose.yml.hbs` | Gate nginx service on `hasFrontend` (already works; verify) |
| `src/templates/ci/ci.yml.hbs` | Add `{{#if reactVite}}` frontend job (Vite build + lint) |

---

## Detailed Design

### 1. `src/types.ts`

```typescript
export type FrontendType = "angular" | "react-vite" | false;

export interface ProjectConfig {
  // ...
  frontend: FrontendType;   // replaces frontend: boolean
  // ...
}
```

Derived helpers (computed inline, never stored):
```typescript
const hasFrontend = config.frontend !== false;
const angular     = config.frontend === "angular";
const reactVite   = config.frontend === "react-vite";
```

### 2. `src/versions.ts` — new fields

```typescript
export interface ResolvedVersions {
  // ... existing fields ...
  react: string;
  reactRouter: string;
  vite: string;
  axiosReact: string;
}

// Fetch additions (parallel, conditional on frontend === "react-vite"):
tasks.push(fetchNpm("react").then(v => { versions.react = v ?? FALLBACK.react; }));
tasks.push(fetchNpm("react-router").then(v => { versions.reactRouter = v ?? FALLBACK.reactRouter; }));
tasks.push(fetchNpm("vite").then(v => { versions.vite = v ?? FALLBACK.vite; }));
tasks.push(fetchNpm("axios").then(v => { versions.axiosReact = v ?? FALLBACK.axiosReact; }));
```

Fallback values:
```typescript
react: "19.0.0",
reactRouter: "7.5.0",
vite: "6.3.0",
axiosReact: "1.8.0",
```

### 3. `src/prompts/project.ts` — Frontend selection

```typescript
// Replace confirm() with select()
const frontendChoice = await select<FrontendType>({
  message: "Frontend",
  choices: [
    { name: "Angular (standalone, OnPush)", value: "angular" },
    { name: "React (Vite + Tailwind)", value: "react-vite" },
    { name: "Aucun", value: null },
  ],
  default: "angular",
});

// PrimeNG / NgRx: only if Angular
if (frontendChoice === "angular") {
  uiFramework = await select({ ... }); // existing logic
  if (uiFramework === "primeng") { primeNGPreset = await select({ ... }); }
  ngrx = await confirm({ ... });
} else {
  uiFramework = frontendChoice === "react-vite" ? "tailwind" : "none";
}
```

### 4. `ReactViteGenerator` — key methods

```typescript
class ReactViteGenerator extends BaseGenerator {
  private buildPackageJson(): Record<string, unknown> {
    const deps: Record<string, string> = {
      react: `^${this.versions.react}`,
      "react-dom": `^${this.versions.react}`,
      "react-router": `^${this.versions.reactRouter}`,
    };
    if (this.config.auth) {
      deps["axios"] = `^${this.versions.axiosReact}`;
    }
    const devDeps = {
      "@types/react": `^${this.versions.react}`,
      "@types/react-dom": `^${this.versions.react}`,
      "@vitejs/plugin-react": "^4.0.0",
      "tailwindcss": `^${this.versions.tailwind}`,
      "@tailwindcss/vite": `^${this.versions.tailwind}`,
      "typescript": "~5.8.0",
      "vite": `^${this.versions.vite}`,
    };
    return {
      name: `${this.projectName}-frontend`,
      version: "0.0.0",
      private: true,
      scripts: {
        dev: "vite",
        build: "tsc -b && vite build",
        lint: "tsc --noEmit",
        preview: "vite preview",
      },
      dependencies: deps,
      devDependencies: devDeps,
    };
  }

  async generate(): Promise<void> {
    // Create dirs, write package.json, render all templates
    // Conditional auth files in second Promise.all if config.auth
  }
}
```

### 5. Template: `vite.config.ts.hbs`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 4200 },  // mirrors Angular default port
})
```

### 6. Template: `src/router/index.tsx.hbs`

```typescript
import { createBrowserRouter } from 'react-router'
{{#if auth}}
import { ProtectedRoute } from '../components/ProtectedRoute'
{{/if}}
import App from '../App'

export const router = createBrowserRouter([
  {
    path: '/',
    element: {{#if auth}}<ProtectedRoute><App /></ProtectedRoute>{{else}}<App />{{/if}},
  },
])
```

### 7. Template: `src/lib/http.ts.hbs` (auth only)

```typescript
import axios from 'axios'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

### 8. Template: `src/hooks/useAuth.ts.hbs` (auth only)

```typescript
import { useState } from 'react'

export function useAuth() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('token')
  )

  const login = (jwt: string) => {
    localStorage.setItem('token', jwt)
    setToken(jwt)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  return { token, isAuthenticated: !!token, login, logout }
}
```

### 9. `CLAUDE.md.hbs` — React block

```hbs
{{#if reactVite}}
## Frontend — React {{versions.react}} (Vite)

- **Architecture:** `src/router/`, `src/hooks/`, `src/components/`, `src/lib/`
- **Conventions:** Functional components, hooks-first, no class components
- **Skill:** apply `applying-react-conventions` for all React/TypeScript code

### Commands
\`\`\`bash
cd frontend
npm run dev      # Start dev server (port 4200)
npm run build    # Production build
npm run lint     # TypeScript check
\`\`\`
{{/if}}
```

### 10. `ci.yml.hbs` — React job

```yaml
{{#if reactVite}}
  frontend:
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build
{{/if}}
```

---

## Sequence of Implementation

1. **Types** — `src/types.ts`: add `FrontendType`, update `ProjectConfig.frontend`
2. **Versions** — `src/versions.ts`: add react/vite/reactRouter/axios fields + fetches + fallbacks
3. **New generator + templates** — `ReactViteGenerator` + all `.hbs` templates (isolated, no deps on existing code)
4. **Router** — update `src/generators/frontend/index.ts` to dispatch Angular vs React
5. **Wizard** — `src/prompts/project.ts`: replace `confirm` with `select`, gate PrimeNG/NgRx
6. **CLI** — `src/commands/new.ts`: update flags, wire React generator, update success messages
7. **Existing generators** — `claude-code/index.ts`: add React commands + conventions
8. **Existing templates** — `CLAUDE.md.hbs`, `ci.yml.hbs`: add `{{#if reactVite}}` blocks
9. **Tests** — update fixtures for `FrontendType`, add ReactViteGenerator unit tests
