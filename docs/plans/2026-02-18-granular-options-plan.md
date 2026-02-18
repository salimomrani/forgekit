# Granular Configuration Options — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to choose which features to include (Flyway, OpenAPI, MapStruct, JWT, NgRx SignalStore, UI framework) instead of having everything hardcoded.

**Architecture:** Add new fields to `ProjectConfig`, restructure the wizard into 5 sections, pass pre-computed booleans (e.g. `uiPrimeNG`, `uiTailwind`) to Handlebars templates to avoid needing custom helpers. Flyway/OpenAPI/MapStruct become opt-out (default checked), NgRx/JWT remain opt-in.

**Tech Stack:** TypeScript, @inquirer/prompts (checkbox/select/confirm), Handlebars templates, Vitest

---

### Task 1: Update `types.ts` — Add new config fields

**Files:**
- Modify: `src/types.ts`

**Step 1: Replace the file content**

```typescript
export type UIFramework = 'primeng' | 'tailwind' | 'none';
export type PrimeNGPreset = 'Aura' | 'Lara' | 'Nora';

export interface ProjectConfig {
  name: string;
  groupId: string;
  description: string;
  // Stack
  backend: boolean;
  frontend: boolean;
  // Backend features
  flyway: boolean;
  openapi: boolean;
  auth: boolean;
  mapstruct: boolean;
  // Frontend
  uiFramework: UIFramework;
  primeNGPreset: PrimeNGPreset;
  ngrx: boolean;
  // Infrastructure
  docker: boolean;
  ci: boolean;
  claudeCode: boolean;
  gitInit: boolean;
}

export interface SavedConfig {
  groupId?: string;
}
```

**Step 2: Check for TypeScript errors**

Run: `npm run typecheck`
Expected: errors about missing fields in places that construct `ProjectConfig` — note them, they'll be fixed in later tasks.

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add UIFramework, PrimeNGPreset types and new ProjectConfig fields"
```

---

### Task 2: Update `versions.ts` — Add Tailwind version

**Files:**
- Modify: `src/versions.ts`

**Step 1: Add `tailwind` to `ResolvedVersions` interface and fallback**

Add to the `ResolvedVersions` interface:
```typescript
tailwind: string;
```

Add to `FALLBACK_VERSIONS`:
```typescript
tailwind: '4.0.0',
```

**Step 2: Add Tailwind version fetching in `resolveVersions`**

Inside the `if (opts.frontend)` block, add:
```typescript
fetchNpmVersion('tailwindcss').then((v) => {
  if (v) versions.tailwind = v;
}),
```

**Step 3: Check typecheck**

Run: `npm run typecheck`

**Step 4: Commit**

```bash
git add src/versions.ts
git commit -m "feat: add tailwindcss version to resolved versions"
```

---

### Task 3: Restructure `prompts/project.ts` — 5-section wizard

**Files:**
- Modify: `src/prompts/project.ts`

**Step 1: Replace the entire file**

```typescript
import { input, confirm, checkbox, select } from "@inquirer/prompts";
import path from "node:path";
import { loadConfig } from "../config.js";
import { validateProjectName, validateGroupId } from "../utils/validation.js";
import type { ProjectConfig, UIFramework, PrimeNGPreset } from "../types.js";

export async function promptProjectConfig(
  defaults: Partial<ProjectConfig> = {},
): Promise<ProjectConfig> {
  const saved = await loadConfig();
  const currentDir = path.basename(process.cwd());

  // ── Section 1: Projet ─────────────────────────────────────────────────────
  const name =
    defaults.name ??
    (await input({
      message: "Nom du projet",
      default: currentDir,
      validate: validateProjectName,
    }));

  const description =
    defaults.description ??
    (await input({
      message: "Description",
      default: "Mon application",
    }));

  // ── Section 2: Stack ──────────────────────────────────────────────────────
  const stacks =
    defaults.backend !== undefined && defaults.frontend !== undefined
      ? []
      : await checkbox({
          message: "Stack à générer",
          choices: [
            { name: "Backend (Spring Boot)", value: "backend", checked: true },
            { name: "Frontend (Angular)", value: "frontend", checked: true },
          ],
        });

  const backend = defaults.backend ?? stacks.includes("backend");
  const frontend = defaults.frontend ?? stacks.includes("frontend");

  const groupId = backend
    ? (defaults.groupId ??
      (await input({
        message: "Group ID",
        default: saved.groupId ?? "com.example",
        validate: validateGroupId,
      })))
    : "com.example";

  // ── Section 3: Backend features ───────────────────────────────────────────
  let flyway = defaults.flyway ?? true;
  let openapi = defaults.openapi ?? true;
  let auth = defaults.auth ?? false;
  let mapstruct = defaults.mapstruct ?? true;

  if (
    backend &&
    defaults.flyway === undefined &&
    defaults.openapi === undefined &&
    defaults.auth === undefined &&
    defaults.mapstruct === undefined
  ) {
    const backendFeatures = await checkbox({
      message: "Fonctionnalités backend",
      choices: [
        { name: "Flyway (migrations SQL)", value: "flyway", checked: true },
        { name: "OpenAPI / Swagger UI", value: "openapi", checked: true },
        { name: "JWT / Spring Security", value: "auth", checked: false },
        { name: "MapStruct (mappers)", value: "mapstruct", checked: true },
      ],
    });
    flyway = backendFeatures.includes("flyway");
    openapi = backendFeatures.includes("openapi");
    auth = backendFeatures.includes("auth");
    mapstruct = backendFeatures.includes("mapstruct");
  }

  // ── Section 4: Frontend features ──────────────────────────────────────────
  let uiFramework: UIFramework = defaults.uiFramework ?? "primeng";
  let primeNGPreset: PrimeNGPreset = defaults.primeNGPreset ?? "Aura";
  let ngrx = defaults.ngrx ?? false;

  if (frontend) {
    if (defaults.uiFramework === undefined) {
      uiFramework = await select({
        message: "Framework UI",
        choices: [
          { name: "PrimeNG (recommandé)", value: "primeng" },
          { name: "Tailwind CSS v4", value: "tailwind" },
          { name: "Aucun (minimal)", value: "none" },
        ],
        default: "primeng",
      });
    }

    if (uiFramework === "primeng" && defaults.primeNGPreset === undefined) {
      primeNGPreset = await select({
        message: "Preset PrimeNG",
        choices: [
          { name: "Aura (recommandé)", value: "Aura" },
          { name: "Lara", value: "Lara" },
          { name: "Nora", value: "Nora" },
        ],
        default: "Aura",
      });
    }

    if (defaults.ngrx === undefined) {
      ngrx = await confirm({
        message: "Inclure NgRx SignalStore ?",
        default: false,
      });
    }
  }

  // ── Section 5: Infrastructure ─────────────────────────────────────────────
  let docker = defaults.docker ?? true;
  let ci = defaults.ci ?? true;
  let claudeCode = defaults.claudeCode ?? true;
  let gitInit = defaults.gitInit ?? true;

  if (
    defaults.docker === undefined &&
    defaults.ci === undefined &&
    defaults.claudeCode === undefined &&
    defaults.gitInit === undefined
  ) {
    const infra = await checkbox({
      message: "Infrastructure",
      choices: [
        { name: "Docker Compose (PostgreSQL + pgAdmin)", value: "docker", checked: true },
        { name: "GitHub Actions CI", value: "ci", checked: true },
        { name: "Claude Code", value: "claudeCode", checked: true },
        { name: "Initialiser Git", value: "gitInit", checked: true },
      ],
    });
    docker = infra.includes("docker");
    ci = infra.includes("ci");
    claudeCode = infra.includes("claudeCode");
    gitInit = infra.includes("gitInit");
  }

  return {
    name,
    groupId,
    description,
    backend,
    frontend,
    flyway,
    openapi,
    auth,
    mapstruct,
    uiFramework,
    primeNGPreset,
    ngrx,
    docker,
    ci,
    claudeCode,
    gitInit,
  };
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: errors in `commands/new.ts` about missing fields — normal, fixed next.

**Step 3: Commit**

```bash
git add src/prompts/project.ts
git commit -m "feat: restructure wizard into 5 sections with granular options"
```

---

### Task 4: Update `commands/new.ts` — New CLI flags

**Files:**
- Modify: `src/commands/new.ts`

**Step 1: Add new options to the Command definition**

After `.option("--auth", ...)`, add:
```typescript
.option("--flyway", "Inclure Flyway (migrations SQL)")
.option("--no-flyway", "Exclure Flyway")
.option("--openapi", "Inclure OpenAPI / Swagger UI")
.option("--no-openapi", "Exclure OpenAPI")
.option("--mapstruct", "Inclure MapStruct")
.option("--no-mapstruct", "Exclure MapStruct")
.option("--ngrx", "Inclure NgRx SignalStore")
.option("--ui <framework>", "Framework UI : primeng | tailwind | none")
.option("--preset <preset>", "Preset PrimeNG : Aura | Lara | Nora")
```

**Step 2: Map options to defaults in the action handler**

After the existing `if (typeof options.auth === "boolean")` block, add:
```typescript
if (typeof options.flyway === "boolean") defaults.flyway = options.flyway;
if (typeof options.openapi === "boolean") defaults.openapi = options.openapi;
if (typeof options.mapstruct === "boolean") defaults.mapstruct = options.mapstruct;
if (typeof options.ngrx === "boolean") defaults.ngrx = options.ngrx;
if (options.ui) defaults.uiFramework = options.ui as ProjectConfig['uiFramework'];
if (options.preset) defaults.primeNGPreset = options.preset as ProjectConfig['primeNGPreset'];
```

Also add the import at the top: `import type { ProjectConfig } from "../types.js";` is already there.

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (some errors may remain in generators, fixed in later tasks)

**Step 4: Commit**

```bash
git add src/commands/new.ts
git commit -m "feat: add --flyway, --openapi, --mapstruct, --ngrx, --ui, --preset CLI flags"
```

---

### Task 5: Update `pom.xml.hbs` — Conditional backend deps

**Files:**
- Modify: `src/templates/backend/pom.xml.hbs`

**Step 1: Add `springdoc.version` property conditionally**

In `<properties>`, wrap the springdoc line:
```xml
{{#if openapi}}
<springdoc.version>{{versions.springDoc}}</springdoc.version>
{{/if}}
```

**Step 2: Wrap Flyway dependencies**

Wrap the two Flyway `<dependency>` blocks:
```xml
{{#if flyway}}
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>
{{/if}}
```

**Step 3: Wrap OpenAPI dependency**

```xml
{{#if openapi}}
<!-- OpenAPI -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>${springdoc.version}</version>
</dependency>
{{/if}}
```

**Step 4: Wrap MapStruct dependency and build plugin**

Wrap the MapStruct dependency:
```xml
{{#if mapstruct}}
<!-- MapStruct -->
<dependency>
    <groupId>org.mapstruct</groupId>
    <artifactId>mapstruct</artifactId>
    <version>${mapstruct.version}</version>
</dependency>
{{/if}}
```

Wrap `mapstruct.version` property:
```xml
{{#if mapstruct}}
<mapstruct.version>{{versions.mapstruct}}</mapstruct.version>
{{/if}}
```

In the `maven-compiler-plugin` `<annotationProcessorPaths>`, wrap the MapStruct processor entries:
```xml
{{#if mapstruct}}
<path>
    <groupId>org.mapstruct</groupId>
    <artifactId>mapstruct-processor</artifactId>
    <version>${mapstruct.version}</version>
</path>
<path>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok-mapstruct-binding</artifactId>
    <version>0.2.0</version>
</path>
{{/if}}
```

**Step 5: Commit**

```bash
git add src/templates/backend/pom.xml.hbs
git commit -m "feat: make Flyway, OpenAPI, MapStruct optional in pom.xml template"
```

---

### Task 6: Update `application.yml.hbs` — Conditional Flyway config

**Files:**
- Modify: `src/templates/backend/application.yml.hbs`

**Step 1: Wrap JPA ddl-auto and Flyway config**

When Flyway is disabled, JPA should manage the schema itself. Update the JPA section and wrap Flyway:

```yaml
  jpa:
    hibernate:
      ddl-auto: {{#if flyway}}validate{{else}}update{{/if}}
    open-in-view: false
    properties:
      hibernate:
        format_sql: true

{{#if flyway}}
  flyway:
    enabled: true
    locations: classpath:db/migration

{{/if}}
```

Also wrap the `springdoc` section at the bottom:
```yaml
{{#if openapi}}
springdoc:
  api-docs:
    path: /v3/api-docs
  swagger-ui:
    path: /swagger-ui.html
{{/if}}
```

**Step 2: Commit**

```bash
git add src/templates/backend/application.yml.hbs
git commit -m "feat: make Flyway and OpenAPI config conditional in application.yml template"
```

---

### Task 7: Update backend generator — Conditional file generation

**Files:**
- Modify: `src/generators/backend/index.ts`

**Step 1: Pass new fields to template data**

In the `data` object (around line 55), add:
```typescript
flyway: this.config.flyway,
openapi: this.config.openapi,
mapstruct: this.config.mapstruct,
```

**Step 2: Make `db/migration` dir conditional**

Change:
```typescript
path.join(resourcesDir, "db/migration"),
```
To only be added when flyway is true:
```typescript
...(this.config.flyway ? [path.join(resourcesDir, "db/migration")] : []),
```

**Step 3: Conditionally generate `OpenApiConfig.java`**

The `OpenApiConfig.java` renderAndWrite call should be wrapped in a conditional. Move it out of the `Promise.all` and handle it separately after:

Remove from `Promise.all`:
```typescript
renderAndWrite(
  "backend/OpenApiConfig.java.hbs",
  path.join(javaDir, "config/OpenApiConfig.java"),
  data,
),
```

Add after `Promise.all`:
```typescript
if (this.config.openapi) {
  await renderAndWrite(
    "backend/OpenApiConfig.java.hbs",
    path.join(javaDir, "config/OpenApiConfig.java"),
    data,
  );
}
```

**Step 4: Conditionally write `V1__init.sql`**

```typescript
...(this.config.flyway
  ? [fs.writeFile(path.join(resourcesDir, "db/migration/V1__init.sql"), "-- Initial migration\n")]
  : []),
```

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add src/generators/backend/index.ts
git commit -m "feat: conditionally generate OpenApiConfig and Flyway migration dir"
```

---

### Task 8: Update `package.json.hbs` — Conditional frontend deps

**Files:**
- Modify: `src/templates/frontend/package.json.hbs`

**Step 1: Replace the template with conditional deps**

The template data will include pre-computed booleans `uiPrimeNG`, `uiTailwind`, `ngrx`.

```json
{
  "name": "{{projectName}}-frontend",
  "version": "0.0.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  },
  "private": true,
  "dependencies": {
    "@angular/animations": "^{{versions.angular}}",
    "@angular/common": "^{{versions.angular}}",
    "@angular/compiler": "^{{versions.angular}}",
    "@angular/core": "^{{versions.angular}}",
    "@angular/forms": "^{{versions.angular}}",
    "@angular/platform-browser": "^{{versions.angular}}",
    "@angular/platform-browser-dynamic": "^{{versions.angular}}",
    "@angular/router": "^{{versions.angular}}",
    {{#if ngrx}}
    "@ngrx/signals": "^{{versions.ngrxSignals}}",
    {{/if}}
    {{#if uiPrimeNG}}
    "primeng": "^{{versions.primeng}}",
    "@primeuix/themes": "^{{versions.primeuixThemes}}",
    "primeicons": "^{{versions.primeicons}}",
    "primeflex": "^{{versions.primeflex}}",
    {{/if}}
    "rxjs": "~{{versions.rxjs}}",
    "tslib": "^2.8.0",
    "zone.js": "~{{versions.zoneJs}}"
  },
  "devDependencies": {
    "@angular/build": "^{{versions.angular}}",
    "@angular/cli": "^{{versions.angular}}",
    "@angular/compiler-cli": "^{{versions.angular}}",
    {{#if uiTailwind}}
    "tailwindcss": "^{{versions.tailwind}}",
    "@tailwindcss/postcss": "^{{versions.tailwind}}",
    "postcss": "^8.0.0",
    {{/if}}
    "typescript": "~{{versions.typescript}}"
  }
}
```

**Note:** JSON with `{{#if}}` blocks can produce trailing commas. Use `{{#unless @last}}` if needed, or let the generator do a JSON cleanup pass. Simplest approach: keep a separator comment or use a JS object in the generator instead of a JSON template.

**Alternative (cleaner):** Build the `package.json` object in the generator TypeScript code directly and write it as JSON, instead of using a Handlebars template. This avoids trailing comma issues entirely.

**Recommended approach:** Build `package.json` programmatically in the generator:

In `generators/frontend/index.ts`, create a `buildPackageJson(config, versions)` method that returns an object, then write it with `fs.writeJSON(path, obj, { spaces: 2 })`. Remove `package.json.hbs`.

**Step 2: Commit**

```bash
git add src/templates/frontend/package.json.hbs src/generators/frontend/index.ts
git commit -m "feat: make frontend deps conditional based on uiFramework and ngrx"
```

---

### Task 9: Update `app.config.ts.hbs` — Conditional providers

**Files:**
- Modify: `src/templates/frontend/app.config.ts.hbs`

**Step 1: Replace with conditional template**

Template data will include: `uiPrimeNG`, `primeNGPreset` (string: "Aura"/"Lara"/"Nora"), `ngrx`, `auth`.

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient{{#if auth}}, withInterceptors{{/if}} } from '@angular/common/http';
{{#if uiPrimeNG}}
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import {{primeNGPreset}} from '@primeuix/themes/{{lowerCase primeNGPreset}}';
{{/if}}
{{#if ngrx}}
import { provideStore } from '@ngrx/signals';
{{/if}}
import { routes } from './app.routes';
{{#if auth}}
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
{{/if}}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
{{#if auth}}
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
{{else}}
    provideHttpClient(),
{{/if}}
{{#if uiPrimeNG}}
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: {{primeNGPreset}},
        options: {
          darkModeSelector: false,
        },
      },
    }),
{{/if}}
  ],
};
```

**Note:** `{{lowerCase primeNGPreset}}` requires a Handlebars helper. Register it in `template-engine.ts`:

In `src/utils/template-engine.ts`, before the `renderTemplate` function, add:
```typescript
Handlebars.registerHelper('lowerCase', (str: string) => str.toLowerCase());
```

**Step 2: Commit**

```bash
git add src/templates/frontend/app.config.ts.hbs src/utils/template-engine.ts
git commit -m "feat: make PrimeNG and NgRx providers conditional in app.config template"
```

---

### Task 10: Update `styles.scss.hbs` — Conditional CSS imports

**Files:**
- Modify: `src/templates/frontend/styles.scss.hbs`

**Step 1: Replace with conditional styles**

```scss
{{#if uiPrimeNG}}
@import "primeicons/primeicons.css";

html, body {
  height: 100%;
  margin: 0;
  font-family: var(--p-font-family);
  background: var(--p-surface-ground);
  color: var(--p-text-color);
}
{{/if}}
{{#if uiTailwind}}
@import "tailwindcss";

html, body {
  height: 100%;
  margin: 0;
}
{{/if}}
{{#if uiNone}}
html, body {
  height: 100%;
  margin: 0;
  font-family: sans-serif;
}
{{/if}}
```

**Step 2: Commit**

```bash
git add src/templates/frontend/styles.scss.hbs
git commit -m "feat: conditional CSS imports based on UI framework"
```

---

### Task 11: Create NgRx SignalStore template

**Files:**
- Create: `src/templates/frontend/ngrx-app-store.ts.hbs`

**Step 1: Create the template**

```typescript
import { signalStore, withState } from '@ngrx/signals';

export type AppState = {
  loading: boolean;
};

const initialState: AppState = {
  loading: false,
};

export const AppStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
);
```

**Step 2: Update frontend generator to create the store file**

In `generators/frontend/index.ts`, in the `generate()` method, after the main `Promise.all`:

```typescript
if (this.config.ngrx) {
  await renderAndWrite(
    "frontend/ngrx-app-store.ts.hbs",
    path.join(appDir, "core/store/app.store.ts"),
    data,
  );
}
```

Also add the store dir to the dirs array when ngrx is enabled:
```typescript
if (this.config.ngrx) {
  dirs.push(path.join(appDir, "core/store"));
}
```

**Step 3: Commit**

```bash
git add src/templates/frontend/ngrx-app-store.ts.hbs src/generators/frontend/index.ts
git commit -m "feat: add NgRx SignalStore template and conditional generation"
```

---

### Task 12: Update frontend generator — Pass new template data

**Files:**
- Modify: `src/generators/frontend/index.ts`

**Step 1: Implement `buildPackageJson` method (from Task 8)**

Add a private method to `FrontendGenerator`:

```typescript
private buildPackageJson(): Record<string, unknown> {
  const deps: Record<string, string> = {
    "@angular/animations": `^${this.versions.angular}`,
    "@angular/common": `^${this.versions.angular}`,
    "@angular/compiler": `^${this.versions.angular}`,
    "@angular/core": `^${this.versions.angular}`,
    "@angular/forms": `^${this.versions.angular}`,
    "@angular/platform-browser": `^${this.versions.angular}`,
    "@angular/platform-browser-dynamic": `^${this.versions.angular}`,
    "@angular/router": `^${this.versions.angular}`,
    "rxjs": `~${this.versions.rxjs}`,
    "tslib": "^2.8.0",
    "zone.js": `~${this.versions.zoneJs}`,
  };

  if (this.config.ngrx) {
    deps["@ngrx/signals"] = `^${this.versions.ngrxSignals}`;
  }

  if (this.config.uiFramework === "primeng") {
    deps["primeng"] = `^${this.versions.primeng}`;
    deps["@primeuix/themes"] = `^${this.versions.primeuixThemes}`;
    deps["primeicons"] = `^${this.versions.primeicons}`;
    deps["primeflex"] = `^${this.versions.primeflex}`;
  }

  const devDeps: Record<string, string> = {
    "@angular/build": `^${this.versions.angular}`,
    "@angular/cli": `^${this.versions.angular}`,
    "@angular/compiler-cli": `^${this.versions.angular}`,
    "typescript": `~${this.versions.typescript}`,
  };

  if (this.config.uiFramework === "tailwind") {
    devDeps["tailwindcss"] = `^${this.versions.tailwind}`;
    devDeps["@tailwindcss/postcss"] = `^${this.versions.tailwind}`;
    devDeps["postcss"] = "^8.0.0";
  }

  return {
    name: `${this.projectName}-frontend`,
    version: "0.0.0",
    scripts: {
      ng: "ng",
      start: "ng serve",
      build: "ng build",
      watch: "ng build --watch --configuration development",
      test: "ng test",
    },
    private: true,
    dependencies: deps,
    devDependencies: devDeps,
  };
}
```

**Step 2: Use `buildPackageJson` in `generate()`**

Replace the `renderAndWrite("frontend/package.json.hbs", ...)` call with:
```typescript
fs.writeJSON(path.join(frontendDir, "package.json"), this.buildPackageJson(), { spaces: 2 }),
```

Remove `package.json.hbs` usage (keep the file for reference or delete it).

**Step 3: Update template `data` object**

Add pre-computed booleans for templates:
```typescript
const data = {
  projectName: this.projectName,
  name: this.config.name,
  auth: this.config.auth,
  ngrx: this.config.ngrx,
  uiPrimeNG: this.config.uiFramework === "primeng",
  uiTailwind: this.config.uiFramework === "tailwind",
  uiNone: this.config.uiFramework === "none",
  primeNGPreset: this.config.primeNGPreset,
  versions: this.versions,
};
```

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Run tests**

Run: `npm test`
Expected: PASS (validation tests unchanged)

**Step 6: Commit**

```bash
git add src/generators/frontend/index.ts
git commit -m "feat: build package.json programmatically, pass uiFramework booleans to templates"
```

---

### Task 13: Update README with new options

**Files:**
- Modify: `README.md`

**Step 1: Update the wizard output example**

Replace the current wizard output section with:
```
? Nom du projet : (mon-app)
? Group ID : (com.example)
? Description : (Mon application)
? Stack à générer : (Backend + Frontend)
? Fonctionnalités backend : (Flyway ✓ | OpenAPI ✓ | JWT ✗ | MapStruct ✓)
? Framework UI : (PrimeNG)
? Preset PrimeNG : (Aura)
? Inclure NgRx SignalStore ? (Non)
? Infrastructure : (Docker ✓ | CI ✓ | Claude Code ✓ | Git ✓)
```

**Step 2: Update the CLI flags table**

Add new rows:
| `--flyway` / `--no-flyway` | Inclure/exclure Flyway |
| `--openapi` / `--no-openapi` | Inclure/exclure OpenAPI |
| `--mapstruct` / `--no-mapstruct` | Inclure/exclure MapStruct |
| `--ngrx` | Inclure NgRx SignalStore |
| `--ui <framework>` | Framework UI : primeng \| tailwind \| none |
| `--preset <preset>` | Preset PrimeNG : Aura \| Lara \| Nora |

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README with new granular configuration options"
```

---

### Task 14: End-to-end smoke test

**Step 1: Build the project**

Run: `npm run build`
Expected: PASS, no errors

**Step 2: Test wizard interactively**

Run: `node dist/index.js new test-project`
- Go through the wizard: select all options including JWT, NgRx, Tailwind
- Verify generated project structure

**Step 3: Test CLI flags**

Run: `node dist/index.js new test-minimal --backend --no-flyway --no-openapi --no-mapstruct --frontend --ui none --no-docker --no-git`
Expected: Generates backend without Flyway/OpenAPI/MapStruct, frontend without UI lib

**Step 4: Verify generated pom.xml**

Check `test-minimal/backend/pom.xml` has no Flyway, OpenAPI, or MapStruct dependencies.

**Step 5: Final commit**

```bash
git add .
git commit -m "chore: bump version to 1.5.0"
```
