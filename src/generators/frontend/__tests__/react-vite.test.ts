import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateReactViteFrontend } from "../react-vite.js";
import type { ProjectConfig } from "../../../types.js";
import type { ResolvedVersions } from "../../../versions.js";

const baseConfig: ProjectConfig = {
  name: "test-project",
  groupId: "com.example",
  description: "Test",
  backendType: null,
  frontend: "react-vite",
  flyway: false,
  openapi: false,
  auth: false,
  mapstruct: false,
  prettier: false,
  eslint: false,
  uiFramework: "tailwind",
  primeNGPreset: "Aura",
  ngrx: false,
  docker: false,
  ci: false,
  claudeCode: false,
  speckit: false,
  gitInit: false,
};

const baseVersions: ResolvedVersions = {
  springBoot: "4.0.0",
  springDoc: "3.0.0",
  mapstruct: "1.6.3",
  laravel: "12.0.0",
  sanctum: "4.0.0",
  scramble: "0.12.0",
  angular: "21.0.0",
  primeng: "21.0.0",
  primeuixThemes: "2.0.0",
  primeicons: "7.0.0",
  primeflex: "4.0.0",
  ngrxSignals: "21.0.0",
  rxjs: "7.8.0",
  zoneJs: "0.15.0",
  typescript: "5.8.0",
  tailwind: "4.0.0",
  react: "19.0.0",
  reactRouter: "7.5.0",
  vite: "6.3.0",
  axiosReact: "1.8.0",
  husky: "9.1.0",
  lintStaged: "15.5.0",
  prettier: "3.5.0",
  eslint: "9.20.0",
  typescriptEslint: "8.29.0",
  eslintConfigPrettier: "10.1.5",
};

describe("ReactViteGenerator", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-react-test-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("generates base files without auth", async () => {
    await generateReactViteFrontend(tmpDir, baseConfig, baseVersions);
    const frontendDir = path.join(tmpDir, "frontend");

    expect(await fs.pathExists(path.join(frontendDir, "package.json"))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(frontendDir, "vite.config.ts"))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(frontendDir, "tsconfig.json"))).toBe(
      true,
    );
    expect(
      await fs.pathExists(path.join(frontendDir, "tailwind.config.ts")),
    ).toBe(true);
    expect(await fs.pathExists(path.join(frontendDir, "index.html"))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(frontendDir, ".gitignore"))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(frontendDir, "src", "main.tsx"))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(frontendDir, "src", "App.tsx"))).toBe(
      true,
    );
    expect(
      await fs.pathExists(path.join(frontendDir, "src", "index.css")),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(frontendDir, "src", "router", "index.tsx")),
    ).toBe(true);
  });

  it("uses non-auth router when auth is false", async () => {
    await generateReactViteFrontend(tmpDir, baseConfig, baseVersions);
    const routerContent = await fs.readFile(
      path.join(tmpDir, "frontend", "src", "router", "index.tsx"),
      "utf-8",
    );
    expect(routerContent).not.toContain("ProtectedRoute");
  });

  it("does not generate auth files when auth is false", async () => {
    await generateReactViteFrontend(tmpDir, baseConfig, baseVersions);
    const srcDir = path.join(tmpDir, "frontend", "src");
    expect(await fs.pathExists(path.join(srcDir, "hooks", "useAuth.ts"))).toBe(
      false,
    );
    expect(
      await fs.pathExists(
        path.join(srcDir, "components", "ProtectedRoute.tsx"),
      ),
    ).toBe(false);
    expect(await fs.pathExists(path.join(srcDir, "lib", "http.ts"))).toBe(
      false,
    );
  });

  it("generates auth files when auth is true", async () => {
    const config = { ...baseConfig, auth: true };
    await generateReactViteFrontend(tmpDir, config, baseVersions);
    const srcDir = path.join(tmpDir, "frontend", "src");
    expect(await fs.pathExists(path.join(srcDir, "hooks", "useAuth.ts"))).toBe(
      true,
    );
    expect(
      await fs.pathExists(
        path.join(srcDir, "components", "ProtectedRoute.tsx"),
      ),
    ).toBe(true);
    expect(await fs.pathExists(path.join(srcDir, "lib", "http.ts"))).toBe(true);
  });

  it("uses auth router when auth is true", async () => {
    const config = { ...baseConfig, auth: true };
    await generateReactViteFrontend(tmpDir, config, baseVersions);
    const routerContent = await fs.readFile(
      path.join(tmpDir, "frontend", "src", "router", "index.tsx"),
      "utf-8",
    );
    expect(routerContent).toContain("ProtectedRoute");
  });

  it("package.json includes react dependencies", async () => {
    await generateReactViteFrontend(tmpDir, baseConfig, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.dependencies["react"]).toBeDefined();
    expect(pkg.dependencies["react-dom"]).toBeDefined();
    expect(pkg.dependencies["react-router"]).toBeDefined();
  });

  it("package.json does not include axios when auth is false", async () => {
    await generateReactViteFrontend(tmpDir, baseConfig, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.dependencies["axios"]).toBeUndefined();
  });

  it("package.json includes axios when auth is true", async () => {
    const config = { ...baseConfig, auth: true };
    await generateReactViteFrontend(tmpDir, config, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.dependencies["axios"]).toBeDefined();
  });

  it("pins @types/react to major version only", async () => {
    await generateReactViteFrontend(tmpDir, baseConfig, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.devDependencies["@types/react"]).toMatch(/^\^\d+\.0\.0$/);
    expect(pkg.devDependencies["@types/react-dom"]).toMatch(/^\^\d+\.0\.0$/);
  });

  it("caps vite below v8", async () => {
    const versions = { ...baseVersions, vite: "7.99.0" };
    await generateReactViteFrontend(tmpDir, baseConfig, versions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    const viteVersion = pkg.devDependencies["vite"].replace("^", "");
    expect(viteVersion.startsWith("8.")).toBe(false);
  });

  it("generates Layout, Header, Footer without auth", async () => {
    await generateReactViteFrontend(tmpDir, baseConfig, baseVersions);
    const componentsDir = path.join(tmpDir, "frontend", "src", "components");
    expect(await fs.pathExists(path.join(componentsDir, "Layout.tsx"))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(componentsDir, "Header.tsx"))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(componentsDir, "Footer.tsx"))).toBe(
      true,
    );
  });

  it("generates Layout, Header, Footer with auth", async () => {
    const config = { ...baseConfig, auth: true };
    await generateReactViteFrontend(tmpDir, config, baseVersions);
    const componentsDir = path.join(tmpDir, "frontend", "src", "components");
    expect(await fs.pathExists(path.join(componentsDir, "Layout.tsx"))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(componentsDir, "Header.tsx"))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(componentsDir, "Footer.tsx"))).toBe(
      true,
    );
  });

  it("Header does not contain auth button when auth is false", async () => {
    await generateReactViteFrontend(tmpDir, baseConfig, baseVersions);
    const header = await fs.readFile(
      path.join(tmpDir, "frontend", "src", "components", "Header.tsx"),
      "utf-8",
    );
    expect(header).not.toContain("useAuth");
    expect(header).not.toContain("Sign out");
  });

  it("Header contains auth button when auth is true", async () => {
    const config = { ...baseConfig, auth: true };
    await generateReactViteFrontend(tmpDir, config, baseVersions);
    const header = await fs.readFile(
      path.join(tmpDir, "frontend", "src", "components", "Header.tsx"),
      "utf-8",
    );
    expect(header).toContain("useAuth");
    expect(header).toContain("Sign out");
  });

  it("Footer contains project name in copyright", async () => {
    await generateReactViteFrontend(tmpDir, baseConfig, baseVersions);
    const footer = await fs.readFile(
      path.join(tmpDir, "frontend", "src", "components", "Footer.tsx"),
      "utf-8",
    );
    expect(footer).toContain("test-project");
  });

  it("router references Layout", async () => {
    await generateReactViteFrontend(tmpDir, baseConfig, baseVersions);
    const router = await fs.readFile(
      path.join(tmpDir, "frontend", "src", "router", "index.tsx"),
      "utf-8",
    );
    expect(router).toContain("Layout");
  });

  it("does not generate prettier files when prettier is false", async () => {
    await generateReactViteFrontend(tmpDir, baseConfig, baseVersions);
    const frontendDir = path.join(tmpDir, "frontend");
    expect(await fs.pathExists(path.join(frontendDir, ".prettierrc"))).toBe(
      false,
    );
    expect(
      await fs.pathExists(path.join(frontendDir, ".husky", "pre-commit")),
    ).toBe(false);
    const pkg = await fs.readJson(path.join(frontendDir, "package.json"));
    expect(pkg.scripts?.prepare).toBeUndefined();
    expect(pkg["lint-staged"]).toBeUndefined();
  });

  it("generates prettier files when prettier is true", async () => {
    const config = { ...baseConfig, prettier: true };
    await generateReactViteFrontend(tmpDir, config, baseVersions);
    const frontendDir = path.join(tmpDir, "frontend");
    expect(await fs.pathExists(path.join(frontendDir, ".prettierrc"))).toBe(
      true,
    );
    expect(
      await fs.pathExists(path.join(frontendDir, ".husky", "pre-commit")),
    ).toBe(true);
  });

  it("package.json includes prepare and lint-staged when prettier is true", async () => {
    const config = { ...baseConfig, prettier: true };
    await generateReactViteFrontend(tmpDir, config, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.scripts.prepare).toBe("husky");
    expect(pkg["lint-staged"]).toBeDefined();
    expect(pkg.devDependencies["husky"]).toBeDefined();
    expect(pkg.devDependencies["lint-staged"]).toBeDefined();
    expect(pkg.devDependencies["prettier"]).toBeDefined();
  });

  it("does not generate eslint.config.js when eslint is false", async () => {
    await generateReactViteFrontend(tmpDir, baseConfig, baseVersions);
    expect(
      await fs.pathExists(path.join(tmpDir, "frontend", "eslint.config.js")),
    ).toBe(false);
  });

  it("generates eslint.config.js when eslint is true", async () => {
    const config = { ...baseConfig, eslint: true };
    await generateReactViteFrontend(tmpDir, config, baseVersions);
    expect(
      await fs.pathExists(path.join(tmpDir, "frontend", "eslint.config.js")),
    ).toBe(true);
  });

  it("package.json includes eslint devDeps when eslint is true", async () => {
    const config = { ...baseConfig, eslint: true };
    await generateReactViteFrontend(tmpDir, config, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.devDependencies["eslint"]).toBeDefined();
    expect(pkg.devDependencies["typescript-eslint"]).toBeDefined();
  });

  it("lint script is eslint . when eslint is true", async () => {
    const config = { ...baseConfig, eslint: true };
    await generateReactViteFrontend(tmpDir, config, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.scripts.lint).toBe("eslint .");
  });

  it("lint script is tsc --noEmit when eslint is false", async () => {
    await generateReactViteFrontend(tmpDir, baseConfig, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.scripts.lint).toBe("tsc --noEmit");
  });

  it("includes eslint-config-prettier when both eslint and prettier are true", async () => {
    const config = { ...baseConfig, eslint: true, prettier: true };
    await generateReactViteFrontend(tmpDir, config, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.devDependencies["eslint-config-prettier"]).toBeDefined();
  });

  it("eslint-config-prettier absent when only eslint is true", async () => {
    const config = { ...baseConfig, eslint: true, prettier: false };
    await generateReactViteFrontend(tmpDir, config, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.devDependencies["eslint-config-prettier"]).toBeUndefined();
  });

  it("lint-staged runs eslint and prettier on TS/TSX files when both enabled", async () => {
    const config = { ...baseConfig, eslint: true, prettier: true };
    await generateReactViteFrontend(tmpDir, config, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    const tsStaged = pkg["lint-staged"]["*.{ts,tsx}"];
    expect(Array.isArray(tsStaged)).toBe(true);
    expect(tsStaged).toContain("eslint --fix");
    expect(tsStaged).toContain("prettier --write");
  });
});
