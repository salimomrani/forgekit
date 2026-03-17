import path from "node:path";
import fs from "fs-extra";
import { renderAndWrite } from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";
import { generateReactViteFrontend } from "./react-vite.js";

class FrontendGenerator extends BaseGenerator {
  private readonly versions: ResolvedVersions;
  private readonly projectName: string;

  constructor(
    projectDir: string,
    config: ProjectConfig,
    versions: ResolvedVersions,
  ) {
    super(projectDir, config);
    this.versions = versions;
    this.projectName = config.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  }

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
      rxjs: `~${this.versions.rxjs}`,
      tslib: "^2.8.0",
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
      typescript: `~${this.versions.typescript}`,
    };

    if (this.config.uiFramework === "tailwind") {
      devDeps["tailwindcss"] = `^${this.versions.tailwind}`;
      devDeps["@tailwindcss/postcss"] = `^${this.versions.tailwind}`;
      devDeps["postcss"] = "^8.0.0";
    }

    if (this.config.prettier) {
      devDeps["husky"] = `^${this.versions.husky}`;
      devDeps["lint-staged"] = `^${this.versions.lintStaged}`;
      devDeps["prettier"] = `^${this.versions.prettier}`;
    }

    const scripts: Record<string, string> = {
      ng: "ng",
      start: "ng serve",
      build: "ng build",
      watch: "ng build --watch --configuration development",
      test: "ng test",
    };
    if (this.config.prettier) {
      scripts["prepare"] = "husky";
    }

    const pkg: Record<string, unknown> = {
      name: `${this.projectName}-frontend`,
      version: "0.0.0",
      private: true,
      scripts,
      dependencies: deps,
      devDependencies: devDeps,
    };
    if (this.config.prettier) {
      pkg["lint-staged"] = {
        "*.{ts,html,css,scss,json}": "prettier --write",
      };
    }
    return pkg;
  }

  async generate(): Promise<void> {
    const frontendDir = path.join(this.projectDir, "frontend");
    const srcDir = path.join(frontendDir, "src");
    const appDir = path.join(srcDir, "app");

    const dirs = [
      path.join(appDir, "layout/sidebar"),
      path.join(appDir, "layout/topbar"),
      path.join(appDir, "shared/components"),
      path.join(appDir, "shared/pipes"),
      path.join(appDir, "features/home"),
      path.join(srcDir, "environments"),
    ];

    if (this.config.auth) {
      dirs.push(
        path.join(appDir, "core/interceptors"),
        path.join(appDir, "core/guards"),
        path.join(appDir, "core/services"),
      );
    }

    if (this.config.ngrx) {
      dirs.push(path.join(appDir, "core/store"));
    }

    await this.ensureDirs(dirs);

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

    await Promise.all([
      fs.writeJSON(
        path.join(frontendDir, "package.json"),
        this.buildPackageJson(),
        { spaces: 2 },
      ),
      renderAndWrite(
        "frontend/angular.json.hbs",
        path.join(frontendDir, "angular.json"),
        data,
      ),
      renderAndWrite(
        "frontend/tsconfig.json.hbs",
        path.join(frontendDir, "tsconfig.json"),
        data,
      ),
      renderAndWrite(
        "frontend/tsconfig.app.json.hbs",
        path.join(frontendDir, "tsconfig.app.json"),
        data,
      ),
      renderAndWrite(
        "frontend/gitignore.hbs",
        path.join(frontendDir, ".gitignore"),
        data,
      ),
      renderAndWrite(
        "frontend/main.ts.hbs",
        path.join(srcDir, "main.ts"),
        data,
      ),
      renderAndWrite(
        "frontend/index.html.hbs",
        path.join(srcDir, "index.html"),
        data,
      ),
      renderAndWrite(
        "frontend/styles.scss.hbs",
        path.join(srcDir, "styles.scss"),
        data,
      ),
      renderAndWrite(
        "frontend/environment.ts.hbs",
        path.join(srcDir, "environments/environment.ts"),
        data,
      ),
      renderAndWrite(
        "frontend/environment.development.ts.hbs",
        path.join(srcDir, "environments/environment.development.ts"),
        data,
      ),
      renderAndWrite(
        "frontend/app.component.ts.hbs",
        path.join(appDir, "app.component.ts"),
        data,
      ),
      renderAndWrite(
        "frontend/app.routes.ts.hbs",
        path.join(appDir, "app.routes.ts"),
        data,
      ),
      renderAndWrite(
        "frontend/app.config.ts.hbs",
        path.join(appDir, "app.config.ts"),
        data,
      ),
      renderAndWrite(
        "frontend/layout.component.ts.hbs",
        path.join(appDir, "layout/layout.component.ts"),
        data,
      ),
      renderAndWrite(
        "frontend/sidebar.component.ts.hbs",
        path.join(appDir, "layout/sidebar/sidebar.component.ts"),
        data,
      ),
      renderAndWrite(
        "frontend/topbar.component.ts.hbs",
        path.join(appDir, "layout/topbar/topbar.component.ts"),
        data,
      ),
      renderAndWrite(
        "frontend/home.component.ts.hbs",
        path.join(appDir, "features/home/home.component.ts"),
        data,
      ),
    ]);

    if (this.config.auth) {
      await Promise.all([
        renderAndWrite(
          "frontend/auth.interceptor.ts.hbs",
          path.join(appDir, "core/interceptors/auth.interceptor.ts"),
          data,
        ),
        renderAndWrite(
          "frontend/error.interceptor.ts.hbs",
          path.join(appDir, "core/interceptors/error.interceptor.ts"),
          data,
        ),
        renderAndWrite(
          "frontend/auth.guard.ts.hbs",
          path.join(appDir, "core/guards/auth.guard.ts"),
          data,
        ),
        renderAndWrite(
          "frontend/auth.service.ts.hbs",
          path.join(appDir, "core/services/auth.service.ts"),
          data,
        ),
      ]);
    }

    if (this.config.ngrx) {
      await renderAndWrite(
        "frontend/ngrx-app-store.ts.hbs",
        path.join(appDir, "core/store/app.store.ts"),
        data,
      );
    }

    if (this.config.prettier) {
      await this.ensureDirs([path.join(frontendDir, ".husky")]);
      await Promise.all([
        renderAndWrite(
          "shared/prettier/prettierrc.hbs",
          path.join(frontendDir, ".prettierrc"),
          data,
        ),
        renderAndWrite(
          "shared/prettier/pre-commit.hbs",
          path.join(frontendDir, ".husky", "pre-commit"),
          data,
        ),
      ]);
    }
  }
}

async function generateAngularFrontend(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  const generator = new FrontendGenerator(projectDir, config, versions);
  await generator.generate();
}

export async function generateFrontend(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  if (config.frontend === "angular") {
    await generateAngularFrontend(projectDir, config, versions);
  } else if (config.frontend === "react-vite") {
    await generateReactViteFrontend(projectDir, config, versions);
  }
}
