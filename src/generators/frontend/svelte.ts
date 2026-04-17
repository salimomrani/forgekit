import path from "node:path";
import fs from "fs-extra";
import { renderAndWrite } from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";

class SvelteGenerator extends BaseGenerator {
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
      svelte: `^${this.versions.svelte}`,
    };

    if (this.config.auth) {
      deps["axios"] = `^${this.versions.axiosReact}`;
    }

    const devDeps: Record<string, string> = {
      "@sveltejs/vite-plugin-svelte": `^${this.versions.vitePluginSvelte}`,
      "@tailwindcss/vite": `^${this.versions.tailwind}`,
      tailwindcss: `^${this.versions.tailwind}`,
      "svelte-check": `^${this.versions.svelte}`,
      typescript: `~${this.versions.typescript}`,
      vite: `^${this.versions.vite}`,
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
      build: "vite build",
      lint: this.config.eslint
        ? "eslint ."
        : "svelte-check --tsconfig ./tsconfig.json",
      preview: "vite preview",
    };

    if (this.config.prettier) {
      scripts["prepare"] = "husky";
    }

    const pkg: Record<string, unknown> = {
      name: `${this.projectName}-frontend`,
      version: "0.0.0",
      private: true,
      type: "module",
      scripts,
      dependencies: deps,
      devDependencies: devDeps,
    };

    if (this.config.prettier) {
      const svelteStaged: string | string[] = this.config.eslint
        ? ["eslint --fix", "prettier --write"]
        : "prettier --write";
      pkg["lint-staged"] = {
        "*.{ts,svelte}": svelteStaged,
        "*.{css,json,js,html}": "prettier --write",
      };
    }

    return pkg;
  }

  async generate(): Promise<void> {
    const frontendDir = path.join(this.projectDir, "frontend");
    const srcDir = path.join(frontendDir, "src");
    const componentsDir = path.join(srcDir, "components");

    const dirs = [componentsDir];
    if (this.config.auth) {
      dirs.push(path.join(srcDir, "stores"), path.join(srcDir, "lib"));
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

    await Promise.all([
      fs.writeJSON(
        path.join(frontendDir, "package.json"),
        this.buildPackageJson(),
        { spaces: 2 },
      ),
      renderAndWrite(
        "frontend/svelte/vite.config.ts.hbs",
        path.join(frontendDir, "vite.config.ts"),
        data,
      ),
      renderAndWrite(
        "frontend/svelte/svelte.config.js.hbs",
        path.join(frontendDir, "svelte.config.js"),
        data,
      ),
      renderAndWrite(
        "frontend/svelte/tsconfig.json.hbs",
        path.join(frontendDir, "tsconfig.json"),
        data,
      ),
      renderAndWrite(
        "frontend/svelte/index.html.hbs",
        path.join(frontendDir, "index.html"),
        data,
      ),
      renderAndWrite(
        "frontend/svelte/gitignore.hbs",
        path.join(frontendDir, ".gitignore"),
        data,
      ),
      renderAndWrite(
        "frontend/svelte/src/main.ts.hbs",
        path.join(srcDir, "main.ts"),
        data,
      ),
      renderAndWrite(
        "frontend/svelte/src/App.svelte.hbs",
        path.join(srcDir, "App.svelte"),
        data,
      ),
      renderAndWrite(
        "frontend/svelte/src/app.css.hbs",
        path.join(srcDir, "app.css"),
        data,
      ),
      renderAndWrite(
        "frontend/svelte/src/components/Layout.svelte.hbs",
        path.join(componentsDir, "Layout.svelte"),
        data,
      ),
      renderAndWrite(
        "frontend/svelte/src/components/Header.svelte.hbs",
        path.join(componentsDir, "Header.svelte"),
        data,
      ),
      renderAndWrite(
        "frontend/svelte/src/components/Footer.svelte.hbs",
        path.join(componentsDir, "Footer.svelte"),
        data,
      ),
    ]);

    if (this.config.auth) {
      await Promise.all([
        renderAndWrite(
          "frontend/svelte/src/stores/auth.ts.hbs",
          path.join(srcDir, "stores", "auth.ts"),
          data,
        ),
        renderAndWrite(
          "frontend/svelte/src/lib/http.ts.hbs",
          path.join(srcDir, "lib", "http.ts"),
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

export async function generateSvelteFrontend(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  const generator = new SvelteGenerator(projectDir, config, versions);
  await generator.generate();
}
