# Research: Vue.js Frontend Generator

## Package Versions (npm, April 2025)

| Package | Version | Role |
|---------|---------|------|
| `vue` | 3.5.32 | Core framework |
| `vue-router` | 4.6.3 | SPA routing (v4, Vue 3 compatible) |
| `pinia` | 3.0.4 | State management |
| `@vitejs/plugin-vue` | 6.0.5 | Vite plugin for .vue SFC |
| `@tailwindcss/vite` | 4.2.2 | Tailwind v4 Vite plugin |

**Decision**: Use vue-router v4 (not v5) — v5 is in early release, v4 is the stable production choice.

---

## Architecture Decisions

### Decision 1: Generator Structure
- **Chosen**: `src/generators/frontend/vue.ts` — separate module mirroring `react-vite.ts`
- **Rationale**: `generateFrontend()` in `index.ts` dispatches by `config.frontend`; adding a new file keeps each frontend self-contained. Consistent with the established pattern.
- **Alternatives**: Merge into existing frontend generator — rejected (violates Constitution rule 1 and rule 6: would create a multi-concern generator and a premature abstraction).

### Decision 2: package.json generation
- **Chosen**: `buildPackageJson()` method returning a plain object, written via `fs.outputJson()` — no Handlebars template for `package.json`
- **Rationale**: Avoids JSON trailing-comma issues from conditional `{{#if}}` blocks (same problem solved for Next.js). Consistent with `ReactViteGenerator` pattern.
- **Alternatives**: Handlebars JSON template — rejected (brittle, fragile with conditionals).

### Decision 3: Pinia always included
- **Chosen**: Always generate stores directory and Pinia dependency — no prompt
- **Rationale**: Pinia is lightweight (~2KB), universally used with Vue 3, and removing it adds complexity (conditional dirs, conditional deps). User confirmed this choice.

### Decision 4: Tailwind CSS v4
- **Chosen**: `@tailwindcss/vite` plugin (not PostCSS plugin)
- **Rationale**: Tailwind v4 uses a Vite plugin approach — simpler, no `tailwind.config.ts` needed in v4. Consistent with React/Vite generator which already uses `@tailwindcss/vite`.

### Decision 5: tsconfig split (tsconfig.json + tsconfig.node.json)
- **Chosen**: Two-file pattern — `tsconfig.json` (app) + `tsconfig.node.json` (vite config)
- **Rationale**: Standard Vite + TypeScript scaffold. `vite.config.ts` runs in Node context and needs different settings.

### Decision 6: Vue Router navigation guard pattern for auth
- **Chosen**: `router.beforeEach` global guard in `router/index-auth.ts` checking a Pinia auth store
- **Rationale**: Standard Vue Router auth pattern; composable `useAuth` encapsulates the state access.

---

## Template Patterns

### vite.config.ts
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } }
})
```

### main.ts
```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

### router/index.ts
```typescript
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
]
export default createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes })
```

### stores/app.ts (Pinia Composition API)
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
export const useAppStore = defineStore('app', () => {
  const count = ref(0)
  function increment() { count.value++ }
  return { count, increment }
})
```
