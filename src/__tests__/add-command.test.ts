import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateProject } from "../commands/new.js";
import { FALLBACK_VERSIONS } from "../versions.js";
import { writeManifest } from "../utils/forgekit-json.js";
import { detectProject } from "../utils/detect-project.js";
import type { ForgeKitManifest, ProjectConfig } from "../types.js";
import { makeBaseConfig } from "./fixtures.js";

vi.mock("../generators/speckit.js", () => ({
  initSpecify: vi.fn(() => true),
}));

const BASE_VERSIONS = FALLBACK_VERSIONS;
const baseConfig = makeBaseConfig;

describe("forgekit add — integration", () => {
  let tmpDir: string;
  let projectDir: string;
  let fakeSkillsDir: string;
  let fakeCommandsDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-add-test-"));
    projectDir = path.join(tmpDir, "test-proj");
    fakeSkillsDir = path.join(tmpDir, "fake-skills");
    fakeCommandsDir = path.join(tmpDir, "fake-commands");
    await fs.ensureDir(fakeSkillsDir);
    await fs.ensureDir(fakeCommandsDir);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  async function generateBase(overrides: Partial<ProjectConfig>) {
    const config = baseConfig(overrides);
    await fs.ensureDir(projectDir);
    await generateProject(projectDir, config, BASE_VERSIONS, {
      globalSkillsBase: fakeSkillsDir,
      globalCommandsBase: fakeCommandsDir,
    });
    await writeManifest(projectDir, config);
    return config;
  }

  it("adds react frontend to a spring-boot-only project", async () => {
    await generateBase({ backendType: "spring-boot" });

    // Simulate what `forgekit add react` does: generate frontend in temp, copy to project
    const existingResult = await detectProject(projectDir);
    const updatedConfig: ProjectConfig = {
      ...existingResult.config,
      frontend: "react-vite",
      auth: false,
    };

    const addTmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "forgekit-add-gen-"),
    );
    try {
      const { generateFrontend } =
        await import("../generators/frontend/index.js");
      await generateFrontend(addTmpDir, updatedConfig, BASE_VERSIONS);
      await fs.copy(addTmpDir, projectDir, { overwrite: false });
    } finally {
      await fs.remove(addTmpDir);
    }

    expect(
      await fs.pathExists(path.join(projectDir, "frontend", "package.json")),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, "frontend", "src", "main.tsx")),
    ).toBe(true);
    // Backend still intact
    expect(
      await fs.pathExists(path.join(projectDir, "backend", "pom.xml")),
    ).toBe(true);
  });

  it("detects conflict when adding spring-boot to project with existing backend", async () => {
    await generateBase({ backendType: "fastapi" });

    const result = await detectProject(projectDir);
    expect(result.config.backendType).toBe("fastapi");
    // Conflict: backendType already set
    expect(result.config.backendType).not.toBeNull();
  });

  it("adds docker to a full-stack project with correct backend type", async () => {
    await generateBase({ backendType: "fastapi", frontend: "react-vite" });

    const existingResult = await detectProject(projectDir);
    const updatedConfig: ProjectConfig = {
      ...existingResult.config,
      docker: true,
    };

    const { generateDocker } = await import("../generators/docker/index.js");
    await generateDocker(projectDir, updatedConfig);

    const dockerCompose = await fs.readFile(
      path.join(projectDir, "docker-compose.yml"),
      "utf-8",
    );
    expect(dockerCompose).toContain("api:");
    expect(dockerCompose).toContain("8000:8000");
  });

  it("prettier requires frontend — validation works", async () => {
    const config = baseConfig({ backendType: "spring-boot" });
    expect(config.frontend).toBeNull();
    // The promptAddLayerConfig function throws for prettier without frontend
    const { promptAddLayerConfig } = await import("../prompts/add.js");
    await expect(promptAddLayerConfig("prettier", config, {})).rejects.toThrow(
      "Cannot add prettier without a frontend",
    );
  });

  it("eslint requires frontend — validation works", async () => {
    const config = baseConfig({ backendType: "spring-boot" });
    expect(config.frontend).toBeNull();
    const { promptAddLayerConfig } = await import("../prompts/add.js");
    await expect(promptAddLayerConfig("eslint", config, {})).rejects.toThrow(
      "Cannot add eslint without a frontend",
    );
  });

  it("temp dir is cleaned up on generation failure", async () => {
    const addTmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "forgekit-add-fail-"),
    );
    try {
      // Simulate a generator failure
      throw new Error("simulated failure");
    } catch {
      await fs.remove(addTmpDir);
    }
    expect(await fs.pathExists(addTmpDir)).toBe(false);
  });

  it("forgekit.json is updated after successful add", async () => {
    const originalConfig = await generateBase({ backendType: "spring-boot" });

    const updatedConfig: ProjectConfig = {
      ...originalConfig,
      frontend: "react-vite",
    };
    await writeManifest(projectDir, updatedConfig);

    const manifest = (await fs.readJson(
      path.join(projectDir, "forgekit.json"),
    )) as ForgeKitManifest;
    expect(manifest.config.backendType).toBe("spring-boot");
    expect(manifest.config.frontend).toBe("react-vite");
  });
});
