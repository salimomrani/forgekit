import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateVueFrontend } from "../vue.js";
import { makeBaseConfig, BASE_VERSIONS } from "../../../__tests__/fixtures.js";

const baseConfig = makeBaseConfig({
  frontend: "vue",
  uiFramework: "tailwind",
});
const baseVersions = BASE_VERSIONS;

describe("VueGenerator", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-vue-test-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("generates all 14 base files without auth", async () => {
    await generateVueFrontend(tmpDir, baseConfig, baseVersions);
    const frontendDir = path.join(tmpDir, "frontend");
    const srcDir = path.join(frontendDir, "src");

    const expectedFiles = [
      path.join(frontendDir, "package.json"),
      path.join(frontendDir, "vite.config.ts"),
      path.join(frontendDir, "tsconfig.json"),
      path.join(frontendDir, "tsconfig.node.json"),
      path.join(frontendDir, "index.html"),
      path.join(frontendDir, ".gitignore"),
      path.join(srcDir, "main.ts"),
      path.join(srcDir, "App.vue"),
      path.join(srcDir, "index.css"),
      path.join(srcDir, "router", "index.ts"),
      path.join(srcDir, "stores", "app.ts"),
      path.join(srcDir, "components", "Layout.vue"),
      path.join(srcDir, "components", "Header.vue"),
      path.join(srcDir, "components", "Footer.vue"),
    ];

    for (const file of expectedFiles) {
      expect(await fs.pathExists(file), `Missing: ${file}`).toBe(true);
    }
  });

  it("package.json has vue in dependencies and vite in devDependencies", async () => {
    await generateVueFrontend(tmpDir, baseConfig, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.dependencies["vue"]).toBeDefined();
    expect(pkg.dependencies["vue-router"]).toBeDefined();
    expect(pkg.dependencies["pinia"]).toBeDefined();
    expect(pkg.devDependencies["vite"]).toBeDefined();
    expect(pkg.scripts.dev).toBe("vite");
    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts.lint).toBeDefined();
  });

  it("does not generate auth files when auth is false", async () => {
    await generateVueFrontend(tmpDir, baseConfig, baseVersions);
    const srcDir = path.join(tmpDir, "frontend", "src");
    expect(
      await fs.pathExists(path.join(srcDir, "composables", "useAuth.ts")),
    ).toBe(false);
    expect(await fs.pathExists(path.join(srcDir, "lib", "http.ts"))).toBe(
      false,
    );
    expect(
      await fs.pathExists(
        path.join(srcDir, "components", "ProtectedRoute.vue"),
      ),
    ).toBe(false);
    expect(await fs.pathExists(path.join(srcDir, "stores", "auth.ts"))).toBe(
      false,
    );
  });

  it("generates auth files when auth is true", async () => {
    const config = { ...baseConfig, auth: true };
    await generateVueFrontend(tmpDir, config, baseVersions);
    const srcDir = path.join(tmpDir, "frontend", "src");
    expect(
      await fs.pathExists(path.join(srcDir, "composables", "useAuth.ts")),
    ).toBe(true);
    expect(await fs.pathExists(path.join(srcDir, "lib", "http.ts"))).toBe(true);
    expect(
      await fs.pathExists(
        path.join(srcDir, "components", "ProtectedRoute.vue"),
      ),
    ).toBe(true);
    expect(await fs.pathExists(path.join(srcDir, "stores", "auth.ts"))).toBe(
      true,
    );
  });

  it("uses auth-aware router when auth is true", async () => {
    const config = { ...baseConfig, auth: true };
    await generateVueFrontend(tmpDir, config, baseVersions);
    const routerContent = await fs.readFile(
      path.join(tmpDir, "frontend", "src", "router", "index.ts"),
      "utf-8",
    );
    expect(routerContent).toContain("beforeEach");
    expect(routerContent).toContain("requiresAuth");
  });

  it("uses non-auth router when auth is false", async () => {
    await generateVueFrontend(tmpDir, baseConfig, baseVersions);
    const routerContent = await fs.readFile(
      path.join(tmpDir, "frontend", "src", "router", "index.ts"),
      "utf-8",
    );
    expect(routerContent).not.toContain("beforeEach");
  });

  it("Header contains auth elements when auth is true", async () => {
    const config = { ...baseConfig, auth: true };
    await generateVueFrontend(tmpDir, config, baseVersions);
    const header = await fs.readFile(
      path.join(tmpDir, "frontend", "src", "components", "Header.vue"),
      "utf-8",
    );
    expect(header).toContain("Sign out");
    expect(header).toContain("authStore");
  });

  it("Header does not contain auth elements when auth is false", async () => {
    await generateVueFrontend(tmpDir, baseConfig, baseVersions);
    const header = await fs.readFile(
      path.join(tmpDir, "frontend", "src", "components", "Header.vue"),
      "utf-8",
    );
    expect(header).not.toContain("Sign out");
    expect(header).not.toContain("authStore");
  });

  it("does not generate prettier files when prettier is false", async () => {
    await generateVueFrontend(tmpDir, baseConfig, baseVersions);
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
    await generateVueFrontend(tmpDir, config, baseVersions);
    const frontendDir = path.join(tmpDir, "frontend");
    expect(await fs.pathExists(path.join(frontendDir, ".prettierrc"))).toBe(
      true,
    );
    expect(
      await fs.pathExists(path.join(frontendDir, ".husky", "pre-commit")),
    ).toBe(true);
  });

  it("lint script is eslint . when eslint is true", async () => {
    const config = { ...baseConfig, eslint: true };
    await generateVueFrontend(tmpDir, config, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.scripts.lint).toBe("eslint .");
  });

  it("lint script is vue-tsc --noEmit when eslint is false", async () => {
    await generateVueFrontend(tmpDir, baseConfig, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.scripts.lint).toBe("vue-tsc --noEmit");
  });

  it("includes eslint-config-prettier when both eslint and prettier are true", async () => {
    const config = { ...baseConfig, eslint: true, prettier: true };
    await generateVueFrontend(tmpDir, config, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.devDependencies["eslint-config-prettier"]).toBeDefined();
  });
});
