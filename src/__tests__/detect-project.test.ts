import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { detectProject } from "../utils/detect-project.js";
import type { ForgeKitManifest } from "../types.js";
import { makeBaseConfig as fullConfig } from "./fixtures.js";

describe("detectProject", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-detect-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("reads valid forgekit.json and returns config with source manifest", async () => {
    const config = fullConfig({ backendType: "spring-boot", docker: true });
    const manifest: ForgeKitManifest = {
      forgekit: { version: "1.15.0", generatedAt: "2026-03-21T00:00:00Z" },
      config,
    };
    await fs.writeJson(path.join(tmpDir, "forgekit.json"), manifest);

    const result = await detectProject(tmpDir);
    expect(result.source).toBe("manifest");
    expect(result.config.backendType).toBe("spring-boot");
    expect(result.config.docker).toBe(true);
  });

  it("detects spring-boot backend from backend/pom.xml", async () => {
    await fs.ensureDir(path.join(tmpDir, "backend"));
    await fs.writeFile(path.join(tmpDir, "backend", "pom.xml"), "<project/>");

    const result = await detectProject(tmpDir);
    expect(result.source).toBe("filesystem");
    expect(result.config.backendType).toBe("spring-boot");
  });

  it("detects react frontend from frontend/vite.config.ts", async () => {
    await fs.ensureDir(path.join(tmpDir, "frontend"));
    await fs.writeFile(
      path.join(tmpDir, "frontend", "vite.config.ts"),
      "export default {}",
    );

    const result = await detectProject(tmpDir);
    expect(result.source).toBe("filesystem");
    expect(result.config.frontend).toBe("react-vite");
  });

  it("detects svelte frontend from App.svelte", async () => {
    await fs.ensureDir(path.join(tmpDir, "frontend", "src"));
    await fs.writeFile(
      path.join(tmpDir, "frontend", "src", "App.svelte"),
      "<main />",
    );

    const result = await detectProject(tmpDir);
    expect(result.source).toBe("filesystem");
    expect(result.config.frontend).toBe("svelte");
  });

  it("detects multiple layers from sentinel files", async () => {
    await fs.writeFile(path.join(tmpDir, "docker-compose.yml"), "version: 3");
    await fs.ensureDir(path.join(tmpDir, ".github", "workflows"));
    await fs.writeFile(
      path.join(tmpDir, ".github", "workflows", "ci.yml"),
      "on: push",
    );

    const result = await detectProject(tmpDir);
    expect(result.source).toBe("filesystem");
    expect(result.config.docker).toBe(true);
    expect(result.config.ci).toBe(true);
  });

  it("throws when no signals found", async () => {
    await expect(detectProject(tmpDir)).rejects.toThrow(
      "Not a ForgeKit project",
    );
  });

  it("ignores corrupt forgekit.json and falls back to filesystem", async () => {
    await fs.writeFile(path.join(tmpDir, "forgekit.json"), "not json{{{");
    await fs.ensureDir(path.join(tmpDir, "backend"));
    await fs.writeFile(path.join(tmpDir, "backend", "pom.xml"), "<project/>");

    const result = await detectProject(tmpDir);
    expect(result.source).toBe("filesystem");
    expect(result.config.backendType).toBe("spring-boot");
  });
});
