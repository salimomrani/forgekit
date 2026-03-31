import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateFrontend } from "../index.js";
import type { ProjectConfig } from "../../../types.js";
import type { ResolvedVersions } from "../../../versions.js";

const baseConfig: ProjectConfig = {
  name: "test-project",
  groupId: "com.example",
  description: "Test",
  backendType: null,
  frontend: null,
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

describe("generateFrontend router", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "forgekit-frontend-test-"),
    );
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("generates React files when frontend is react-vite", async () => {
    const config = { ...baseConfig, frontend: "react-vite" as const };
    await generateFrontend(tmpDir, config, baseVersions);
    expect(
      await fs.pathExists(path.join(tmpDir, "frontend", "vite.config.ts")),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(tmpDir, "frontend", "src", "App.tsx")),
    ).toBe(true);
  });

  it("generates Angular files when frontend is angular (US1 regression)", async () => {
    const config = { ...baseConfig, frontend: "angular" as const };
    await generateFrontend(tmpDir, config, baseVersions);
    // Angular generator creates angular.json
    expect(
      await fs.pathExists(path.join(tmpDir, "frontend", "angular.json")),
    ).toBe(true);
    // Not a Vite project
    expect(
      await fs.pathExists(path.join(tmpDir, "frontend", "vite.config.ts")),
    ).toBe(false);
  });

  it("generates no frontend files when frontend is null (US7)", async () => {
    const config = { ...baseConfig, frontend: null };
    await generateFrontend(tmpDir, config, baseVersions);
    expect(await fs.pathExists(path.join(tmpDir, "frontend"))).toBe(false);
  });

  it("Angular: does not generate prettier files when prettier is false", async () => {
    const config = { ...baseConfig, frontend: "angular" as const };
    await generateFrontend(tmpDir, config, baseVersions);
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

  it("Angular: generates prettier files when prettier is true", async () => {
    const config = {
      ...baseConfig,
      frontend: "angular" as const,
      prettier: true,
    };
    await generateFrontend(tmpDir, config, baseVersions);
    const frontendDir = path.join(tmpDir, "frontend");
    expect(await fs.pathExists(path.join(frontendDir, ".prettierrc"))).toBe(
      true,
    );
    expect(
      await fs.pathExists(path.join(frontendDir, ".husky", "pre-commit")),
    ).toBe(true);
  });

  it("Angular: package.json includes prepare and lint-staged when prettier is true", async () => {
    const config = {
      ...baseConfig,
      frontend: "angular" as const,
      prettier: true,
    };
    await generateFrontend(tmpDir, config, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.scripts.prepare).toBe("husky");
    expect(pkg["lint-staged"]).toBeDefined();
    expect(pkg.devDependencies["husky"]).toBeDefined();
    expect(pkg.devDependencies["lint-staged"]).toBeDefined();
    expect(pkg.devDependencies["prettier"]).toBeDefined();
  });

  it("Angular: does not generate eslint.config.js when eslint is false", async () => {
    const config = { ...baseConfig, frontend: "angular" as const };
    await generateFrontend(tmpDir, config, baseVersions);
    expect(
      await fs.pathExists(path.join(tmpDir, "frontend", "eslint.config.js")),
    ).toBe(false);
  });

  it("Angular: generates eslint.config.js when eslint is true", async () => {
    const config = {
      ...baseConfig,
      frontend: "angular" as const,
      eslint: true,
    };
    await generateFrontend(tmpDir, config, baseVersions);
    expect(
      await fs.pathExists(path.join(tmpDir, "frontend", "eslint.config.js")),
    ).toBe(true);
  });

  it("Angular: package.json includes eslint devDeps and lint script when eslint is true", async () => {
    const config = {
      ...baseConfig,
      frontend: "angular" as const,
      eslint: true,
    };
    await generateFrontend(tmpDir, config, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.devDependencies["eslint"]).toBeDefined();
    expect(pkg.devDependencies["typescript-eslint"]).toBeDefined();
    expect(pkg.scripts.lint).toBe("eslint .");
  });

  it("Angular: no lint script when eslint is false", async () => {
    const config = { ...baseConfig, frontend: "angular" as const };
    await generateFrontend(tmpDir, config, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.scripts.lint).toBeUndefined();
  });

  it("Angular: includes eslint-config-prettier when both eslint and prettier are true", async () => {
    const config = {
      ...baseConfig,
      frontend: "angular" as const,
      eslint: true,
      prettier: true,
    };
    await generateFrontend(tmpDir, config, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.devDependencies["eslint-config-prettier"]).toBeDefined();
  });

  it("Angular: eslint-config-prettier absent when only eslint is true", async () => {
    const config = {
      ...baseConfig,
      frontend: "angular" as const,
      eslint: true,
      prettier: false,
    };
    await generateFrontend(tmpDir, config, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.devDependencies["eslint-config-prettier"]).toBeUndefined();
  });

  it("Angular: lint-staged runs eslint and prettier on TS files when both enabled", async () => {
    const config = {
      ...baseConfig,
      frontend: "angular" as const,
      eslint: true,
      prettier: true,
    };
    await generateFrontend(tmpDir, config, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    const tsStaged = pkg["lint-staged"]["*.ts"];
    expect(Array.isArray(tsStaged)).toBe(true);
    expect(tsStaged).toContain("eslint --fix");
    expect(tsStaged).toContain("prettier --write");
  });
});
