import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateSvelteFrontend } from "../svelte.js";
import { makeBaseConfig, BASE_VERSIONS } from "../../../__tests__/fixtures.js";

const baseConfig = makeBaseConfig({
  frontend: "svelte",
  uiFramework: "tailwind",
});
const baseVersions = BASE_VERSIONS;

describe("SvelteGenerator", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-svelte-test-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("generates base files without auth", async () => {
    await generateSvelteFrontend(tmpDir, baseConfig, baseVersions);
    const frontendDir = path.join(tmpDir, "frontend");
    const srcDir = path.join(frontendDir, "src");

    const expectedFiles = [
      path.join(frontendDir, "package.json"),
      path.join(frontendDir, "vite.config.ts"),
      path.join(frontendDir, "svelte.config.js"),
      path.join(frontendDir, "tsconfig.json"),
      path.join(frontendDir, "index.html"),
      path.join(frontendDir, ".gitignore"),
      path.join(srcDir, "main.ts"),
      path.join(srcDir, "App.svelte"),
      path.join(srcDir, "app.css"),
      path.join(srcDir, "components", "Layout.svelte"),
      path.join(srcDir, "components", "Header.svelte"),
      path.join(srcDir, "components", "Footer.svelte"),
    ];

    for (const file of expectedFiles) {
      expect(await fs.pathExists(file), `Missing: ${file}`).toBe(true);
    }
  });

  it("package.json has svelte dependencies and vite scripts", async () => {
    await generateSvelteFrontend(tmpDir, baseConfig, baseVersions);
    const pkg = await fs.readJson(
      path.join(tmpDir, "frontend", "package.json"),
    );
    expect(pkg.dependencies["svelte"]).toBeDefined();
    expect(pkg.devDependencies["@sveltejs/vite-plugin-svelte"]).toBeDefined();
    expect(pkg.devDependencies["vite"]).toBeDefined();
    expect(pkg.scripts.dev).toBe("vite");
    expect(pkg.scripts.build).toBe("vite build");
    expect(pkg.scripts.lint).toBe("svelte-check --tsconfig ./tsconfig.json");
  });

  it("does not generate auth files when auth is false", async () => {
    await generateSvelteFrontend(tmpDir, baseConfig, baseVersions);
    const srcDir = path.join(tmpDir, "frontend", "src");
    expect(await fs.pathExists(path.join(srcDir, "stores", "auth.ts"))).toBe(
      false,
    );
    expect(await fs.pathExists(path.join(srcDir, "lib", "http.ts"))).toBe(
      false,
    );
  });

  it("generates auth files when auth is true", async () => {
    const config = { ...baseConfig, auth: true };
    await generateSvelteFrontend(tmpDir, config, baseVersions);
    const srcDir = path.join(tmpDir, "frontend", "src");
    expect(await fs.pathExists(path.join(srcDir, "stores", "auth.ts"))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(srcDir, "lib", "http.ts"))).toBe(
      true,
    );
  });

  it("App contains auth UI when auth is true", async () => {
    const config = { ...baseConfig, auth: true };
    await generateSvelteFrontend(tmpDir, config, baseVersions);
    const app = await fs.readFile(
      path.join(tmpDir, "frontend", "src", "App.svelte"),
      "utf-8",
    );
    expect(app).toContain("Sign in");
    expect(app).toContain("$isAuthenticated");
  });
});
