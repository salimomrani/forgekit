import path from "node:path";
import fs from "fs-extra";
import { renderAndWrite } from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";

class ReactViteGenerator extends BaseGenerator {
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
      react: `^${this.versions.react}`,
      "react-dom": `^${this.versions.react}`,
      "react-router": `^${this.versions.reactRouter}`,
    };
    if (this.config.auth) {
      deps["axios"] = `^${this.versions.axiosReact}`;
    }
    const devDeps: Record<string, string> = {
      "@types/react": `^${this.versions.react.split(".")[0]}.0.0`,
      "@types/react-dom": `^${this.versions.react.split(".")[0]}.0.0`,
      "@vitejs/plugin-react": "^4.0.0",
      tailwindcss: `^${this.versions.tailwind}`,
      "@tailwindcss/vite": `^${this.versions.tailwind}`,
      typescript: "~5.8.0",
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
      build: "tsc -b && vite build",
      lint: this.config.eslint ? "eslint ." : "tsc --noEmit",
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
        "*.{ts,tsx}": tsStaged,
        "*.{css,json}": "prettier --write",
      };
    }
    return pkg;
  }

  async generate(): Promise<void> {
    const frontendDir = path.join(this.projectDir, "frontend");
    const srcDir = path.join(frontendDir, "src");

    const dirs = [path.join(srcDir, "router"), path.join(srcDir, "components")];
    await this.ensureDirs(dirs);

    const data = {
      name: this.config.name,
      projectName: this.projectName,
      versions: this.versions,
      auth: this.config.auth,
      year: new Date().getFullYear(),
      eslintWithPrettier: this.config.eslint && this.config.prettier,
      isAngular: false,
    };

    // Select correct router template based on config.auth
    const routerTemplate = this.config.auth
      ? "frontend/react-vite/src/router/index-auth.tsx.hbs"
      : "frontend/react-vite/src/router/index.tsx.hbs";

    await Promise.all([
      fs.writeJSON(
        path.join(frontendDir, "package.json"),
        this.buildPackageJson(),
        { spaces: 2 },
      ),
      renderAndWrite(
        "frontend/react-vite/vite.config.ts.hbs",
        path.join(frontendDir, "vite.config.ts"),
        data,
      ),
      renderAndWrite(
        "frontend/react-vite/tsconfig.json.hbs",
        path.join(frontendDir, "tsconfig.json"),
        data,
      ),
      renderAndWrite(
        "frontend/react-vite/tailwind.config.ts.hbs",
        path.join(frontendDir, "tailwind.config.ts"),
        data,
      ),
      renderAndWrite(
        "frontend/react-vite/index.html.hbs",
        path.join(frontendDir, "index.html"),
        data,
      ),
      renderAndWrite(
        "frontend/react-vite/gitignore.hbs",
        path.join(frontendDir, ".gitignore"),
        data,
      ),
      renderAndWrite(
        "frontend/react-vite/src/main.tsx.hbs",
        path.join(srcDir, "main.tsx"),
        data,
      ),
      renderAndWrite(
        "frontend/react-vite/src/App.tsx.hbs",
        path.join(srcDir, "App.tsx"),
        data,
      ),
      renderAndWrite(
        "frontend/react-vite/src/index.css.hbs",
        path.join(srcDir, "index.css"),
        data,
      ),
      renderAndWrite(
        routerTemplate,
        path.join(srcDir, "router", "index.tsx"),
        data,
      ),
      renderAndWrite(
        "frontend/react-vite/src/components/Header.tsx.hbs",
        path.join(srcDir, "components", "Header.tsx"),
        data,
      ),
      renderAndWrite(
        "frontend/react-vite/src/components/Footer.tsx.hbs",
        path.join(srcDir, "components", "Footer.tsx"),
        data,
      ),
      renderAndWrite(
        "frontend/react-vite/src/components/Layout.tsx.hbs",
        path.join(srcDir, "components", "Layout.tsx"),
        data,
      ),
    ]);

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

    if (this.config.auth) {
      await this.ensureDirs([
        path.join(srcDir, "hooks"),
        path.join(srcDir, "components"),
        path.join(srcDir, "lib"),
      ]);
      await Promise.all([
        renderAndWrite(
          "frontend/react-vite/src/hooks/useAuth.ts.hbs",
          path.join(srcDir, "hooks", "useAuth.ts"),
          data,
        ),
        renderAndWrite(
          "frontend/react-vite/src/components/ProtectedRoute.tsx.hbs",
          path.join(srcDir, "components", "ProtectedRoute.tsx"),
          data,
        ),
        renderAndWrite(
          "frontend/react-vite/src/lib/http.ts.hbs",
          path.join(srcDir, "lib", "http.ts"),
          data,
        ),
      ]);
    }
  }
}

export async function generateReactViteFrontend(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  const generator = new ReactViteGenerator(projectDir, config, versions);
  await generator.generate();
}
