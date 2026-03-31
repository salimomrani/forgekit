import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateLaravelBackend } from "../index.js";
import type { ProjectConfig } from "../../../types.js";
import type { ResolvedVersions } from "../../../versions.js";

const baseConfig: ProjectConfig = {
  name: "test-app",
  groupId: "com.example",
  description: "Test application",
  backendType: "laravel",
  frontend: null,
  flyway: false,
  openapi: false,
  auth: false,
  mapstruct: false,
  prettier: false,
  eslint: false,
  uiFramework: "none",
  primeNGPreset: "Aura",
  ngrx: false,
  docker: false,
  ci: false,
  claudeCode: false,
  speckit: false,
  gitInit: false,
};

const baseVersions: ResolvedVersions = {
  springBoot: "4.0.2",
  springDoc: "3.0.1",
  mapstruct: "1.6.3",
  laravel: "13.1.1",
  sanctum: "4.3.1",
  scramble: "0.13.16",
  angular: "21.0.0",
  primeng: "21.1.1",
  primeuixThemes: "2.0.3",
  primeicons: "7.0.0",
  primeflex: "4.0.0",
  ngrxSignals: "21.0.1",
  rxjs: "7.8.0",
  zoneJs: "0.15.0",
  typescript: "5.9.0",
  tailwind: "4.0.0",
  react: "19.0.0",
  reactRouter: "7.5.0",
  vite: "7.0.0",
  axiosReact: "1.8.0",
  husky: "9.1.0",
  lintStaged: "15.5.0",
  prettier: "3.5.0",
  eslint: "9.20.0",
  typescriptEslint: "8.29.0",
  eslintConfigPrettier: "10.1.5",
};

describe("LaravelGenerator", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-laravel-test-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("creates the correct directory structure", async () => {
    await generateLaravelBackend(tmpDir, baseConfig, baseVersions);

    const backendDir = path.join(tmpDir, "backend");
    const expectedDirs = [
      "app/Http/Controllers",
      "app/Http/Middleware",
      "app/Http/Resources",
      "app/Models",
      "app/Providers",
      "bootstrap/cache",
      "public",
      "config",
      "database/factories",
      "database/migrations",
      "database/seeders",
      "routes",
      "storage/app",
      "storage/framework/cache",
      "storage/framework/sessions",
      "storage/framework/views",
      "storage/logs",
      "tests/Feature",
    ];

    for (const dir of expectedDirs) {
      expect(
        await fs.pathExists(path.join(backendDir, dir)),
        `Directory ${dir} should exist`,
      ).toBe(true);
    }
  });

  it("generates all required files", async () => {
    await generateLaravelBackend(tmpDir, baseConfig, baseVersions);

    const backendDir = path.join(tmpDir, "backend");
    const expectedFiles = [
      "artisan",
      "composer.json",
      "bootstrap/app.php",
      "bootstrap/providers.php",
      "public/index.php",
      "app/Http/Controllers/Controller.php",
      "config/app.php",
      "config/database.php",
      "config/cors.php",
      "routes/api.php",
      "app/Http/Controllers/HealthController.php",
      "app/Providers/AppServiceProvider.php",
      "database/seeders/DatabaseSeeder.php",
      "phpunit.xml",
      "tests/TestCase.php",
      "tests/Feature/HealthTest.php",
      ".env.example",
      ".gitignore",
      ".php-version",
      "Dockerfile",
      ".dockerignore",
    ];

    for (const file of expectedFiles) {
      expect(
        await fs.pathExists(path.join(backendDir, file)),
        `File ${file} should exist`,
      ).toBe(true);
    }
  });

  it("generates storage .gitignore files", async () => {
    await generateLaravelBackend(tmpDir, baseConfig, baseVersions);

    const backendDir = path.join(tmpDir, "backend");
    const gitignorePaths = [
      "storage/app/.gitignore",
      "storage/framework/cache/.gitignore",
      "storage/framework/sessions/.gitignore",
      "storage/framework/views/.gitignore",
      "storage/logs/.gitignore",
    ];

    for (const gitignorePath of gitignorePaths) {
      const content = await fs.readFile(
        path.join(backendDir, gitignorePath),
        "utf-8",
      );
      expect(content).toContain("!.gitignore");
    }
  });

  it("renders composer.json with laravel version", async () => {
    await generateLaravelBackend(tmpDir, baseConfig, baseVersions);

    const composerJson = await fs.readFile(
      path.join(tmpDir, "backend/composer.json"),
      "utf-8",
    );
    expect(composerJson).toContain('"laravel/framework": "^13.1.1"');
    expect(composerJson).not.toContain("sanctum");
    expect(composerJson).not.toContain("scramble");
  });

  it("includes sanctum when auth is enabled", async () => {
    const config = { ...baseConfig, auth: true };
    await generateLaravelBackend(tmpDir, config, baseVersions);

    const backendDir = path.join(tmpDir, "backend");

    const composerJson = await fs.readFile(
      path.join(backendDir, "composer.json"),
      "utf-8",
    );
    expect(composerJson).toContain('"laravel/sanctum": "^4.3.1"');

    expect(
      await fs.pathExists(path.join(backendDir, "config/sanctum.php")),
    ).toBe(true);

    const apiRoutes = await fs.readFile(
      path.join(backendDir, "routes/api.php"),
      "utf-8",
    );
    expect(apiRoutes).toContain("auth:sanctum");
    expect(apiRoutes).toContain("/user");
  });

  it("excludes sanctum when auth is disabled", async () => {
    await generateLaravelBackend(tmpDir, baseConfig, baseVersions);

    const backendDir = path.join(tmpDir, "backend");

    expect(
      await fs.pathExists(path.join(backendDir, "config/sanctum.php")),
    ).toBe(false);

    const apiRoutes = await fs.readFile(
      path.join(backendDir, "routes/api.php"),
      "utf-8",
    );
    expect(apiRoutes).not.toContain("auth:sanctum");
  });

  it("includes scramble when openapi is enabled", async () => {
    const config = { ...baseConfig, openapi: true };
    await generateLaravelBackend(tmpDir, config, baseVersions);

    const backendDir = path.join(tmpDir, "backend");

    const composerJson = await fs.readFile(
      path.join(backendDir, "composer.json"),
      "utf-8",
    );
    expect(composerJson).toContain('"dedoc/scramble": "^0.13.16"');

    expect(
      await fs.pathExists(path.join(backendDir, "config/scramble.php")),
    ).toBe(true);
  });

  it("excludes scramble when openapi is disabled", async () => {
    await generateLaravelBackend(tmpDir, baseConfig, baseVersions);

    expect(
      await fs.pathExists(path.join(tmpDir, "backend/config/scramble.php")),
    ).toBe(false);
  });

  it("renders .env.example with correct dbName", async () => {
    await generateLaravelBackend(tmpDir, baseConfig, baseVersions);

    const envExample = await fs.readFile(
      path.join(tmpDir, "backend/.env.example"),
      "utf-8",
    );
    expect(envExample).toContain("DB_DATABASE=test_app");
    expect(envExample).toContain("DB_CONNECTION=pgsql");
  });

  it("renders health controller with project name", async () => {
    await generateLaravelBackend(tmpDir, baseConfig, baseVersions);

    const controller = await fs.readFile(
      path.join(tmpDir, "backend/app/Http/Controllers/HealthController.php"),
      "utf-8",
    );
    expect(controller).toContain("'service' => 'test-app'");
  });

  it("configures API-only routing in bootstrap", async () => {
    await generateLaravelBackend(tmpDir, baseConfig, baseVersions);

    const bootstrap = await fs.readFile(
      path.join(tmpDir, "backend/bootstrap/app.php"),
      "utf-8",
    );
    expect(bootstrap).toContain("withRouting");
    expect(bootstrap).toContain("api:");
    expect(bootstrap).not.toContain("web:");
  });

  it("generates both sanctum and scramble when both enabled", async () => {
    const config = { ...baseConfig, auth: true, openapi: true };
    await generateLaravelBackend(tmpDir, config, baseVersions);

    const backendDir = path.join(tmpDir, "backend");
    const composerJson = await fs.readFile(
      path.join(backendDir, "composer.json"),
      "utf-8",
    );
    expect(composerJson).toContain("laravel/sanctum");
    expect(composerJson).toContain("dedoc/scramble");
    expect(
      await fs.pathExists(path.join(backendDir, "config/sanctum.php")),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(backendDir, "config/scramble.php")),
    ).toBe(true);
  });
});
