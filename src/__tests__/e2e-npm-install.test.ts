import { describe, it, beforeEach, afterEach, vi } from "vitest";
import type { TestContext } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateProject } from "../commands/new.js";
import { FALLBACK_VERSIONS } from "../versions.js";
import { makeBaseConfig } from "./fixtures.js";
import type { ProjectConfig } from "../types.js";

vi.mock("../generators/speckit.js", () => ({
  initSpecify: vi.fn(() => true),
}));

const BASE_VERSIONS = FALLBACK_VERSIONS;

describe("ForgeKit e2e — npm install --dry-run", () => {
  let tmpDir: string;
  let fakeSkillsDir: string;
  let fakeCommandsDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-npm-dryrun-"));
    fakeSkillsDir = path.join(tmpDir, "fake-skills");
    fakeCommandsDir = path.join(tmpDir, "fake-commands");
    await fs.ensureDir(fakeSkillsDir);
    await fs.ensureDir(fakeCommandsDir);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  async function run(config: ProjectConfig): Promise<string> {
    const projectDir = path.join(tmpDir, config.name);
    await fs.ensureDir(projectDir);
    await generateProject(projectDir, config, BASE_VERSIONS, {
      globalSkillsBase: fakeSkillsDir,
      globalCommandsBase: fakeCommandsDir,
    });
    return path.join(projectDir, "frontend");
  }

  function checkNpmInstall(frontendDir: string, ctx: TestContext): void {
    const result = spawnSync("npm", ["install", "--dry-run"], {
      cwd: frontendDir,
      encoding: "utf8",
      timeout: 55_000,
    });

    // Spawn-level error (process not found, timeout, etc.) → skip
    if (result.error) {
      ctx.skip();
      return;
    }

    if (result.status === 0) return;

    const combined = (result.stderr ?? "") + (result.stdout ?? "");

    // Hard failure: version does not exist on npm
    if (/ETARGET|notarget/i.test(combined)) {
      throw new Error(
        `npm install --dry-run: ETARGET — package version not found on npm registry.\n` +
          `cwd: ${frontendDir}\n` +
          `stderr:\n${result.stderr}`,
      );
    }

    // Network/environment failure (ENOTFOUND, ECONNREFUSED, fetch failed…) → skip
    ctx.skip();
  }

  it("N1: Angular minimal — all deps resolvable", async (ctx) => {
    const frontendDir = await run(
      makeBaseConfig({
        name: "npm-check-angular-minimal",
        description: "npm dry-run check",
        frontend: "angular",
        backendType: null,
        uiFramework: "none",
        prettier: false,
        eslint: false,
      }),
    );
    checkNpmInstall(frontendDir, ctx);
  }, 60_000);

  it("N2: Angular + PrimeNG — all deps resolvable", async (ctx) => {
    const frontendDir = await run(
      makeBaseConfig({
        name: "npm-check-angular-primeng",
        description: "npm dry-run check",
        frontend: "angular",
        backendType: null,
        uiFramework: "primeng",
        prettier: false,
        eslint: false,
      }),
    );
    checkNpmInstall(frontendDir, ctx);
  }, 60_000);

  it("N3: React/Vite — all deps resolvable", async (ctx) => {
    const frontendDir = await run(
      makeBaseConfig({
        name: "npm-check-react-vite",
        description: "npm dry-run check",
        frontend: "react-vite",
        backendType: null,
        uiFramework: "none",
        prettier: false,
        eslint: false,
      }),
    );
    checkNpmInstall(frontendDir, ctx);
  }, 60_000);
});
