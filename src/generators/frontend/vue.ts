import path from "node:path";
import fs from "fs-extra";
import { renderAndWrite } from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";

class VueGenerator extends BaseGenerator {
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
      vue: `^${this.versions.vue}`,
      "vue-router": `^${this.versions.vueRouter}`,
      pinia: `^${this.versions.pinia}`,
    };

    if (this.config.auth) {
      deps["axios"] = `^${this.versions.axiosReact}`;
    }

    const devDeps: Record<string, string> = {
      "@vitejs/plugin-vue": "^5.0.0",
      "@tailwindcss/vite": `^${this.versions.tailwind}`,
      tailwindcss: `^${this.versions.tailwind}`,
      typescript: `~${this.versions.typescript}`,
      vite: `^${this.versions.vite}`,
      "vue-tsc": "^2.0.0",
    };

    if (this.config.prettier) {
      devDeps["husky"] = `^${this.versions.husky}`;
      devDeps["lint-staged"] = `^${this.versions.lintStaged}`;
      devDeps["prettier"] = `^${this.versions.prettier}`;
    }

    if (this.config.eslint) {
      devDeps["eslint"] = `^${this.versions.eslint}`;
      devDeps["typescript-eslint"] = `^${this.versions.typescriptEslint}`;
      if (this.config.prettier) {
        devDeps["eslint-config-prettier"] =
          `^${this.versions.eslintConfigPrettier}`;
      }
    }

    const scripts: Record<string, string> = {
      dev: "vite",
      build: "vue-tsc -b && vite build",
      lint: this.config.eslint ? "eslint ." : "vue-tsc --noEmit",
      preview: "vite preview",
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
      const tsStaged: string | string[] = this.config.eslint
        ? ["eslint --fix", "prettier --write"]
        : "prettier --write";
      pkg["lint-staged"] = {
        "*.{ts,vue}": tsStaged,
        "*.{css,json}": "prettier --write",
      };
    }

    return pkg;
  }

  async generate(): Promise<void> {
    const frontendDir = path.join(this.projectDir, "frontend");
    const srcDir = path.join(frontendDir, "src");

    const dirs = [
      path.join(srcDir, "router"),
      path.join(srcDir, "stores"),
      path.join(srcDir, "components"),
      path.join(srcDir, "views"),
    ];

    if (this.config.auth) {
      dirs.push(path.join(srcDir, "composables"), path.join(srcDir, "lib"));
    }

    await this.ensureDirs(dirs);

    const data = {
      name: this.config.name,
      projectName: this.projectName,
      versions: this.versions,
      auth: this.config.auth,
      year: new Date().getFullYear(),
      eslintWithPrettier: this.config.eslint && this.config.prettier,
    };

    const routerTemplate = this.config.auth
      ? "frontend/vue/src/router/index-auth.ts.hbs"
      : "frontend/vue/src/router/index.ts.hbs";

    await Promise.all([
      fs.writeJSON(
        path.join(frontendDir, "package.json"),
        this.buildPackageJson(),
        { spaces: 2 },
      ),
      renderAndWrite(
        "frontend/vue/vite.config.ts.hbs",
        path.join(frontendDir, "vite.config.ts"),
        data,
      ),
      renderAndWrite(
        "frontend/vue/tsconfig.json.hbs",
        path.join(frontendDir, "tsconfig.json"),
        data,
      ),
      renderAndWrite(
        "frontend/vue/tsconfig.node.json.hbs",
        path.join(frontendDir, "tsconfig.node.json"),
        data,
      ),
      renderAndWrite(
        "frontend/vue/index.html.hbs",
        path.join(frontendDir, "index.html"),
        data,
      ),
      renderAndWrite(
        "frontend/vue/gitignore.hbs",
        path.join(frontendDir, ".gitignore"),
        data,
      ),
      renderAndWrite(
        "frontend/vue/src/main.ts.hbs",
        path.join(srcDir, "main.ts"),
        data,
      ),
      renderAndWrite(
        "frontend/vue/src/App.vue.hbs",
        path.join(srcDir, "App.vue"),
        data,
      ),
      renderAndWrite(
        "frontend/vue/src/index.css.hbs",
        path.join(srcDir, "index.css"),
        data,
      ),
      renderAndWrite(
        routerTemplate,
        path.join(srcDir, "router", "index.ts"),
        data,
      ),
      renderAndWrite(
        "frontend/vue/src/stores/app.ts.hbs",
        path.join(srcDir, "stores", "app.ts"),
        data,
      ),
      renderAndWrite(
        "frontend/vue/src/components/Layout.vue.hbs",
        path.join(srcDir, "components", "Layout.vue"),
        data,
      ),
      renderAndWrite(
        "frontend/vue/src/components/Header.vue.hbs",
        path.join(srcDir, "components", "Header.vue"),
        data,
      ),
      renderAndWrite(
        "frontend/vue/src/components/Footer.vue.hbs",
        path.join(srcDir, "components", "Footer.vue"),
        data,
      ),
    ]);

    if (this.config.auth) {
      await Promise.all([
        renderAndWrite(
          "frontend/vue/src/stores/auth.ts.hbs",
          path.join(srcDir, "stores", "auth.ts"),
          data,
        ),
        renderAndWrite(
          "frontend/vue/src/composables/useAuth.ts.hbs",
          path.join(srcDir, "composables", "useAuth.ts"),
          data,
        ),
        renderAndWrite(
          "frontend/vue/src/lib/http.ts.hbs",
          path.join(srcDir, "lib", "http.ts"),
          data,
        ),
        renderAndWrite(
          "frontend/vue/src/components/ProtectedRoute.vue.hbs",
          path.join(srcDir, "components", "ProtectedRoute.vue"),
          data,
        ),
      ]);
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

    if (this.config.eslint) {
      await renderAndWrite(
        "shared/eslint/eslint.config.js.hbs",
        path.join(frontendDir, "eslint.config.js"),
        data,
      );
    }
  }
}

export async function generateVueFrontend(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  const generator = new VueGenerator(projectDir, config, versions);
  await generator.generate();
}
