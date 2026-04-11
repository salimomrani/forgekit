# Quickstart: Testing the Vue.js Frontend Generator

## Prerequisites
- ForgeKit built: `npm run build`
- Node.js ≥ 20

## Test Scenario 1: Vue.js only (no backend)

```bash
node dist/index.js new test-vue --no-interactive \
  --frontend vue --no-backend --no-docker --no-ci

cd test-vue/frontend
npm install
npm run build   # must exit 0
npm run lint    # must exit 0
ls src/         # main.ts App.vue index.css router/ stores/ components/
```

Expected output: `frontend/` directory with all base files, no auth files.

## Test Scenario 2: Vue.js with Auth

```bash
node dist/index.js new test-vue-auth --no-interactive \
  --frontend vue --auth --no-backend

cd test-vue-auth/frontend
npm install
npm run build
ls src/composables/   # useAuth.ts
ls src/lib/           # http.ts
ls src/components/    # ProtectedRoute.vue
```

## Test Scenario 3: Vue.js + Spring Boot + Docker + CI

```bash
node dist/index.js new test-full --no-interactive \
  --backend spring-boot --frontend vue --docker --ci

ls test-full/
# backend/  frontend/  docker-compose.yml  .github/workflows/ci.yml

cat test-full/.github/workflows/ci.yml | grep -A5 "frontend:"
# Should show Node 22 + npm ci + npm run lint + npm run build

cd test-full/frontend && npm install && npm run build
```

## Unit Tests

```bash
npm run test:unit -- --reporter=verbose src/generators/frontend/__tests__/vue.test.ts
```

## E2E Tests

```bash
npm run test:e2e
# Scenarios S9 (Vue only) and S10 (Vue + Spring Boot) must pass
```
