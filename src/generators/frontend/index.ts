import path from "node:path";
import { renderAndWrite } from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";

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

  async generate(): Promise<void> {
    const frontendDir = path.join(this.projectDir, "frontend");
    const srcDir = path.join(frontendDir, "src");
    const appDir = path.join(srcDir, "app");

    const dirs = [
      path.join(appDir, "layout/sidebar"),
      path.join(appDir, "layout/topbar"),
      path.join(appDir, "shared/components"),
      path.join(appDir, "shared/pipes"),
      path.join(appDir, "features"),
      path.join(srcDir, "environments"),
    ];

    if (this.config.auth) {
      dirs.push(
        path.join(appDir, "core/interceptors"),
        path.join(appDir, "core/guards"),
        path.join(appDir, "core/services"),
      );
    }

    await this.ensureDirs(dirs);

    const data = {
      projectName: this.projectName,
      name: this.config.name,
      auth: this.config.auth,
      versions: this.versions,
    };

    await Promise.all([
      renderAndWrite(
        "frontend/package.json.hbs",
        path.join(frontendDir, "package.json"),
        data,
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
  }
}

export async function generateFrontend(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  const generator = new FrontendGenerator(projectDir, config, versions);
  await generator.generate();
}
