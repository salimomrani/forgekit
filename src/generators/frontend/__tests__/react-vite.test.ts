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
});
