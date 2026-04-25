import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateFrontend } from "../index.js";
import { makeBaseConfig, BASE_VERSIONS } from "../../../__tests__/fixtures.js";

const baseConfig = makeBaseConfig({ uiFramework: "tailwind" });
const baseVersions = BASE_VERSIONS;

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

  describe("Angular: angular.json styles array reflects UI choice (FR-2.1)", () => {
    it("should include primeicons and primeflex stylesheets when uiFramework is primeng", async () => {
      const config = {
        ...baseConfig,
        frontend: "angular" as const,
        uiFramework: "primeng" as const,
      };
      await generateFrontend(tmpDir, config, baseVersions);
      const angularJson = await fs.readJson(
        path.join(tmpDir, "frontend", "angular.json"),
      );
      const styles =
        angularJson.projects[Object.keys(angularJson.projects)[0]].architect
          .build.options.styles;
      expect(styles).toEqual([
        "node_modules/primeicons/primeicons.css",
        "node_modules/primeflex/primeflex.css",
        "src/styles.scss",
      ]);
    });

    it("should include only src/styles.scss when uiFramework is none", async () => {
      const config = {
        ...baseConfig,
        frontend: "angular" as const,
        uiFramework: "none" as const,
      };
      await generateFrontend(tmpDir, config, baseVersions);
      const angularJson = await fs.readJson(
        path.join(tmpDir, "frontend", "angular.json"),
      );
      const styles =
        angularJson.projects[Object.keys(angularJson.projects)[0]].architect
          .build.options.styles;
      expect(styles).toEqual(["src/styles.scss"]);
    });

    it("should include only src/styles.scss when uiFramework is tailwind", async () => {
      const config = {
        ...baseConfig,
        frontend: "angular" as const,
        uiFramework: "tailwind" as const,
      };
      await generateFrontend(tmpDir, config, baseVersions);
      const angularJson = await fs.readJson(
        path.join(tmpDir, "frontend", "angular.json"),
      );
      const styles =
        angularJson.projects[Object.keys(angularJson.projects)[0]].architect
          .build.options.styles;
      expect(styles).toEqual(["src/styles.scss"]);
    });
  });

  describe("Angular: dev-server proxy reflects backend pairing (FR-6)", () => {
    it.each([
      ["spring-boot" as const, 8080],
      ["fastapi" as const, 8000],
      ["nestjs" as const, 3000],
      ["nextjs" as const, 3000],
      ["laravel" as const, 8000],
    ])(
      "should emit proxy.conf.json with port %i when backendType is %s",
      async (backendType, expectedPort) => {
        const config = {
          ...baseConfig,
          frontend: "angular" as const,
          backendType,
        };
        await generateFrontend(tmpDir, config, baseVersions);
        const proxyPath = path.join(tmpDir, "frontend", "proxy.conf.json");
        expect(await fs.pathExists(proxyPath)).toBe(true);
        const proxy = await fs.readJson(proxyPath);
        expect(proxy["/api/**"].target).toBe(
          `http://localhost:${expectedPort}`,
        );
        const angularJson = await fs.readJson(
          path.join(tmpDir, "frontend", "angular.json"),
        );
        const serveOptions =
          angularJson.projects[Object.keys(angularJson.projects)[0]].architect
            .serve.options;
        expect(serveOptions.proxyConfig).toBe("proxy.conf.json");
      },
    );

    it("should not emit proxy.conf.json when no backend is scaffolded", async () => {
      const config = {
        ...baseConfig,
        frontend: "angular" as const,
        backendType: null,
      };
      await generateFrontend(tmpDir, config, baseVersions);
      expect(
        await fs.pathExists(path.join(tmpDir, "frontend", "proxy.conf.json")),
      ).toBe(false);
      const angularJson = await fs.readJson(
        path.join(tmpDir, "frontend", "angular.json"),
      );
      const serveOptions =
        angularJson.projects[Object.keys(angularJson.projects)[0]].architect
          .serve.options;
      expect(serveOptions?.proxyConfig).toBeUndefined();
    });
  });

  describe("Angular: ng test target is configured out of the box (FR-5)", () => {
    it("should declare a test architect target backed by @angular/build:karma", async () => {
      const config = { ...baseConfig, frontend: "angular" as const };
      await generateFrontend(tmpDir, config, baseVersions);
      const angularJson = await fs.readJson(
        path.join(tmpDir, "frontend", "angular.json"),
      );
      const testTarget =
        angularJson.projects[Object.keys(angularJson.projects)[0]].architect
          .test;
      expect(testTarget).toBeDefined();
      expect(testTarget.builder).toBe("@angular/build:karma");
      expect(testTarget.options.tsConfig).toBe("tsconfig.spec.json");
      expect(testTarget.options.polyfills).toContain("zone.js/testing");
    });

    it("should ship tsconfig.spec.json and app.component.spec.ts so ng test exits 0", async () => {
      const config = { ...baseConfig, frontend: "angular" as const };
      await generateFrontend(tmpDir, config, baseVersions);
      expect(
        await fs.pathExists(
          path.join(tmpDir, "frontend", "tsconfig.spec.json"),
        ),
      ).toBe(true);
      expect(
        await fs.pathExists(
          path.join(tmpDir, "frontend", "src/app/app.component.spec.ts"),
        ),
      ).toBe(true);
    });

    it("should pin Karma + Jasmine devDependencies so npm install resolves them", async () => {
      const config = { ...baseConfig, frontend: "angular" as const };
      await generateFrontend(tmpDir, config, baseVersions);
      const pkg = await fs.readJson(
        path.join(tmpDir, "frontend", "package.json"),
      );
      expect(pkg.devDependencies.karma).toBeDefined();
      expect(pkg.devDependencies["karma-jasmine"]).toBeDefined();
      expect(pkg.devDependencies["karma-chrome-launcher"]).toBeDefined();
      expect(pkg.devDependencies["jasmine-core"]).toBeDefined();
      expect(pkg.devDependencies["@types/jasmine"]).toBeDefined();
    });
  });

  describe("Angular: component templates do not reference --p-* tokens (FR-2.2)", () => {
    it.each([
      ["src/app/features/home/home.component.ts"],
      ["src/app/layout/layout.component.ts"],
      ["src/app/layout/topbar/topbar.component.ts"],
      ["src/app/layout/sidebar/sidebar.component.ts"],
    ])(
      "should emit no --p-* token in %s when uiFramework is none",
      async (relPath) => {
        const config = {
          ...baseConfig,
          frontend: "angular" as const,
          uiFramework: "none" as const,
        };
        await generateFrontend(tmpDir, config, baseVersions);
        const content = await fs.readFile(
          path.join(tmpDir, "frontend", relPath),
          "utf-8",
        );
        expect(content).not.toMatch(/var\(--p-/);
      },
    );
  });
});
