import path from "node:path";
import fs from "fs-extra";
import type { ProjectConfig } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";

export async function generateFrontend(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  const frontendDir = path.join(projectDir, "frontend");
  const srcDir = path.join(frontendDir, "src");
  const appDir = path.join(srcDir, "app");

  const dirs = [
    path.join(appDir, "layout/sidebar"),
    path.join(appDir, "layout/topbar"),
    path.join(appDir, "core/interceptors"),
    path.join(appDir, "core/guards"),
    path.join(appDir, "core/services"),
    path.join(appDir, "shared/components"),
    path.join(appDir, "shared/pipes"),
    path.join(appDir, "features"),
    path.join(srcDir, "environments"),
  ];

  for (const dir of dirs) {
    await fs.ensureDir(dir);
  }

  await Promise.all([
    fs.writeFile(
      path.join(frontendDir, "package.json"),
      generatePackageJson(config, versions),
    ),
    fs.writeFile(
      path.join(frontendDir, "angular.json"),
      generateAngularJson(config),
    ),
    fs.writeFile(path.join(frontendDir, "tsconfig.json"), generateTsConfig()),
    fs.writeFile(
      path.join(frontendDir, "tsconfig.app.json"),
      generateTsConfigApp(),
    ),
    fs.writeFile(
      path.join(frontendDir, ".gitignore"),
      generateFrontendGitignore(),
    ),
    fs.writeFile(path.join(srcDir, "main.ts"), generateMain()),
    fs.writeFile(path.join(srcDir, "index.html"), generateIndexHtml(config)),
    fs.writeFile(path.join(srcDir, "styles.scss"), generateStyles()),
    fs.writeFile(
      path.join(srcDir, "environments/environment.ts"),
      generateEnvProd(),
    ),
    fs.writeFile(
      path.join(srcDir, "environments/environment.development.ts"),
      generateEnvDev(),
    ),
    fs.writeFile(path.join(appDir, "app.component.ts"), generateAppComponent()),
    fs.writeFile(path.join(appDir, "app.routes.ts"), generateRoutes()),
    fs.writeFile(path.join(appDir, "app.config.ts"), generateAppConfig()),
    fs.writeFile(
      path.join(appDir, "layout/layout.component.ts"),
      generateLayoutComponent(),
    ),
    fs.writeFile(
      path.join(appDir, "layout/sidebar/sidebar.component.ts"),
      generateSidebarComponent(),
    ),
    fs.writeFile(
      path.join(appDir, "layout/topbar/topbar.component.ts"),
      generateTopbarComponent(),
    ),
    fs.writeFile(
      path.join(appDir, "core/interceptors/auth.interceptor.ts"),
      generateAuthInterceptor(),
    ),
    fs.writeFile(
      path.join(appDir, "core/interceptors/error.interceptor.ts"),
      generateErrorInterceptor(),
    ),
    fs.writeFile(
      path.join(appDir, "core/guards/auth.guard.ts"),
      generateAuthGuard(),
    ),
    fs.writeFile(
      path.join(appDir, "core/services/auth.service.ts"),
      generateAuthService(),
    ),
  ]);
}

function generatePackageJson(
  config: ProjectConfig,
  versions: ResolvedVersions,
): string {
  const ngVersion = `^${versions.angular}`;
  const majorVersion = versions.angular.split(".")[0];
  return JSON.stringify(
    {
      name: config.name.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-frontend",
      version: "0.0.0",
      scripts: {
        ng: "ng",
        start: "ng serve",
        build: "ng build",
        watch: "ng build --watch --configuration development",
        test: "ng test",
      },
      private: true,
      dependencies: {
        "@angular/animations": ngVersion,
        "@angular/common": ngVersion,
        "@angular/compiler": ngVersion,
        "@angular/core": ngVersion,
        "@angular/forms": ngVersion,
        "@angular/platform-browser": ngVersion,
        "@angular/platform-browser-dynamic": ngVersion,
        "@angular/router": ngVersion,
        "@ngrx/signals": `^${versions.ngrxSignals}`,
        primeng: `^${versions.primeng}`,
        primeicons: `^${versions.primeicons}`,
        primeflex: `^${versions.primeflex}`,
        rxjs: `~${versions.rxjs}`,
        tslib: "^2.8.0",
        "zone.js": `~${versions.zoneJs}`,
      },
      devDependencies: {
        "@angular/build": ngVersion,
        "@angular/cli": ngVersion,
        "@angular/compiler-cli": ngVersion,
        typescript: `~${versions.typescript}`,
      },
    },
    null,
    2,
  );
}

function generateAngularJson(config: ProjectConfig): string {
  const projectName = config.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  return JSON.stringify(
    {
      $schema: "./node_modules/@angular/cli/lib/config/schema.json",
      version: 1,
      newProjectRoot: "projects",
      projects: {
        [projectName]: {
          projectType: "application",
          root: "",
          sourceRoot: "src",
          prefix: "app",
          architect: {
            build: {
              builder: "@angular/build:application",
              options: {
                outputPath: `dist/${projectName}`,
                index: "src/index.html",
                browser: "src/main.ts",
                tsConfig: "tsconfig.app.json",
                inlineStyleLanguage: "scss",
                styles: [
                  "node_modules/primeicons/primeicons.css",
                  "node_modules/primeflex/primeflex.css",
                  "src/styles.scss",
                ],
              },
              configurations: {
                production: {
                  budgets: [
                    {
                      type: "initial",
                      maximumWarning: "500kB",
                      maximumError: "1MB",
                    },
                    {
                      type: "anyComponentStyle",
                      maximumWarning: "4kB",
                      maximumError: "8kB",
                    },
                  ],
                  outputHashing: "all",
                },
                development: {
                  optimization: false,
                  extractLicenses: false,
                  sourceMap: true,
                  fileReplacements: [
                    {
                      replace: "src/environments/environment.ts",
                      with: "src/environments/environment.development.ts",
                    },
                  ],
                },
              },
              defaultConfiguration: "production",
            },
            serve: {
              builder: "@angular/build:dev-server",
              configurations: {
                production: { buildTarget: `${projectName}:build:production` },
                development: {
                  buildTarget: `${projectName}:build:development`,
                },
              },
              defaultConfiguration: "development",
            },
          },
        },
      },
    },
    null,
    2,
  );
}

function generateTsConfig(): string {
  return JSON.stringify(
    {
      compileOnSave: false,
      compilerOptions: {
        outDir: "./dist/out-tsc",
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        sourceMap: true,
        declaration: false,
        downlevelIteration: true,
        experimentalDecorators: true,
        moduleResolution: "node",
        importHelpers: true,
        target: "ES2022",
        module: "ES2022",
        lib: ["ES2022", "dom"],
        useDefineForClassFields: false,
      },
    },
    null,
    2,
  );
}

function generateTsConfigApp(): string {
  return JSON.stringify(
    {
      extends: "./tsconfig.json",
      compilerOptions: {
        outDir: "./out-tsc/app",
        types: [],
      },
      files: ["src/main.ts"],
      include: ["src/**/*.d.ts"],
    },
    null,
    2,
  );
}

function generateFrontendGitignore(): string {
  return `/dist
/node_modules
/.angular
.DS_Store
`;
}

function generateMain(): string {
  return `import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
`;
}

function generateIndexHtml(config: ProjectConfig): string {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${config.name}</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <app-root></app-root>
</body>
</html>
`;
}

function generateStyles(): string {
  return `@use 'primeng/resources/themes/aura-light-blue/theme.css';
@use 'primeng/resources/primeng.css';

html, body {
  height: 100%;
  margin: 0;
  font-family: var(--font-family);
}
`;
}

function generateEnvProd(): string {
  return `export const environment = {
  production: true,
  apiUrl: '/api',
};
`;
}

function generateEnvDev(): string {
  return `export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
};
`;
}

function generateAppComponent(): string {
  return `import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
`;
}

function generateRoutes(): string {
  return `import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      // Add feature routes here with lazy loading:
      // { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];
`;
}

function generateAppConfig(): string {
  return `import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimationsAsync(),
  ],
};
`;
}

function generateLayoutComponent(): string {
  return `import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: \`
    <div class="layout-wrapper">
      <app-topbar (toggleSidebar)="sidebarVisible.set(!sidebarVisible())" />
      <div class="layout-content-wrapper">
        <app-sidebar [visible]="sidebarVisible()" />
        <main class="layout-main">
          <router-outlet />
        </main>
      </div>
    </div>
  \`,
  styles: \`
    .layout-wrapper {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    .layout-content-wrapper {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .layout-main {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
    }
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
  sidebarVisible = signal(true);
}
`;
}

function generateSidebarComponent(): string {
  return `import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: \`
    @if (visible()) {
      <aside class="layout-sidebar">
        <nav>
          <ul class="sidebar-menu">
            <li>
              <a routerLink="/home" routerLinkActive="active-link">
                <i class="pi pi-home"></i>
                <span>Accueil</span>
              </a>
            </li>
          </ul>
        </nav>
      </aside>
    }
  \`,
  styles: \`
    .layout-sidebar {
      width: 250px;
      background: var(--surface-card);
      border-right: 1px solid var(--surface-border);
      padding: 1rem;
    }
    .sidebar-menu {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .sidebar-menu a {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: var(--border-radius);
      color: var(--text-color);
      text-decoration: none;
      transition: background 0.2s;
    }
    .sidebar-menu a:hover {
      background: var(--surface-hover);
    }
    .active-link {
      background: var(--primary-color) !important;
      color: var(--primary-color-text) !important;
    }
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  visible = input(true);
}
`;
}

function generateTopbarComponent(): string {
  return `import { Component, ChangeDetectionStrategy, output } from '@angular/core';

@Component({
  selector: 'app-topbar',
  standalone: true,
  template: \`
    <header class="layout-topbar">
      <div class="topbar-left">
        <button class="topbar-menu-btn" (click)="toggleSidebar.emit()">
          <i class="pi pi-bars"></i>
        </button>
        <span class="topbar-title">ForgeKit App</span>
      </div>
      <div class="topbar-right">
        <button class="topbar-avatar">
          <i class="pi pi-user"></i>
        </button>
      </div>
    </header>
  \`,
  styles: \`
    .layout-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      height: 60px;
      background: var(--surface-card);
      border-bottom: 1px solid var(--surface-border);
    }
    .topbar-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .topbar-menu-btn, .topbar-avatar {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.25rem;
      color: var(--text-color);
      padding: 0.5rem;
      border-radius: 50%;
      transition: background 0.2s;
    }
    .topbar-menu-btn:hover, .topbar-avatar:hover {
      background: var(--surface-hover);
    }
    .topbar-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-color);
    }
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  toggleSidebar = output();
}
`;
}

function generateAuthInterceptor(): string {
  return `import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('access_token');

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: \`Bearer \${token}\` },
    });
  }

  return next(req);
};
`;
}

function generateErrorInterceptor(): string {
  return `import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
      return throwError(() => error);
    }),
  );
};
`;
}

function generateAuthGuard(): string {
  return `import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
`;
}

function generateAuthService(): string {
  return `import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly token = signal<string | null>(localStorage.getItem('access_token'));

  readonly isAuthenticated = computed(() => !!this.token());

  login(token: string): void {
    localStorage.setItem('access_token', token);
    this.token.set(token);
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this.token.set(null);
  }
}
`;
}
