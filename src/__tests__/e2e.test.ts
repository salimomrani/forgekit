import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateProject } from "../commands/new.js";
import { FALLBACK_VERSIONS } from "../versions.js";
import type { ProjectConfig } from "../types.js";

vi.mock("../generators/speckit.js", () => ({
  initSpecify: vi.fn(() => true),
}));

const BASE_VERSIONS = FALLBACK_VERSIONS;

function baseConfig(overrides: Partial<ProjectConfig>): ProjectConfig {
  return {
    name: "test-proj",
    groupId: "com.example",
    description: "E2E test",
    backendType: null,
    frontend: null,
    flyway: false,
    openapi: false,
    auth: false,
    mapstruct: false,
    prettier: false,
    uiFramework: "none",
    primeNGPreset: "Aura",
    ngrx: false,
    docker: false,
    ci: false,
    claudeCode: false,
    speckit: false,
    gitInit: false,
    ...overrides,
  };
}

describe("ForgeKit e2e — generation pipeline", () => {
  let tmpDir: string;
  let fakeSkillsDir: string;
  let fakeCommandsDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-e2e-"));
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
    return projectDir;
  }

  it("S1: Spring Boot + Angular generates expected project structure", async () => {
    const projectDir = await run(
      baseConfig({
        backendType: "spring-boot",
        frontend: "angular",
      }),
    );

    expect(await fs.pathExists(path.join(projectDir, "backend/pom.xml"))).toBe(
      true,
    );
    expect(
      await fs.pathExists(
        path.join(
          projectDir,
          "backend/src/main/java/com/example/testproj/Application.java",
        ),
      ),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, "frontend/package.json")),
    ).toBe(true);
    expect(
      await fs.pathExists(
        path.join(projectDir, "frontend/src/app/app.component.ts"),
      ),
    ).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, "README.md"))).toBe(true);

    const pomXml = await fs.readFile(
      path.join(projectDir, "backend/pom.xml"),
      "utf-8",
    );
    expect(pomXml).toContain("<artifactId>test-proj</artifactId>");

    const packageJson = await fs.readFile(
      path.join(projectDir, "frontend/package.json"),
      "utf-8",
    );
    expect(packageJson).toContain("@angular/core");
  }, 15_000);

  it("S2: FastAPI + React/Vite generates expected project structure", async () => {
    const projectDir = await run(
      baseConfig({
        backendType: "fastapi",
        frontend: "react-vite",
      }),
    );

    expect(
      await fs.pathExists(path.join(projectDir, "backend/requirements.txt")),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, "backend/app/main.py")),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, "frontend/package.json")),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, "frontend/src/main.tsx")),
    ).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, "README.md"))).toBe(true);

    const requirements = await fs.readFile(
      path.join(projectDir, "backend/requirements.txt"),
      "utf-8",
    );
    expect(requirements).toContain("fastapi");

    const packageJson = await fs.readFile(
      path.join(projectDir, "frontend/package.json"),
      "utf-8",
    );
    expect(packageJson).toContain('"react"');
  }, 15_000);

  it("S3: Spring Boot only (no frontend) generates expected project structure", async () => {
    const projectDir = await run(
      baseConfig({
        backendType: "spring-boot",
        frontend: null,
      }),
    );

    expect(await fs.pathExists(path.join(projectDir, "backend/pom.xml"))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(projectDir, "README.md"))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, "frontend"))).toBe(false);

    const pomXml = await fs.readFile(
      path.join(projectDir, "backend/pom.xml"),
      "utf-8",
    );
    expect(pomXml).toContain("<artifactId>test-proj</artifactId>");
  }, 15_000);

  it("S4: React/Vite only (no backend) generates expected project structure", async () => {
    const projectDir = await run(
      baseConfig({
        backendType: null,
        frontend: "react-vite",
      }),
    );

    expect(
      await fs.pathExists(path.join(projectDir, "frontend/package.json")),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, "frontend/src/main.tsx")),
    ).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, "README.md"))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, "backend"))).toBe(false);

    const packageJson = await fs.readFile(
      path.join(projectDir, "frontend/package.json"),
      "utf-8",
    );
    expect(packageJson).toContain('"react"');
  }, 15_000);

  it("S5: Claude Code only generates expected project structure", async () => {
    const projectDir = await run(
      baseConfig({
        backendType: null,
        frontend: null,
        claudeCode: true,
      }),
    );

    expect(
      await fs.pathExists(path.join(projectDir, ".claude/settings.json")),
    ).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, "CLAUDE.md"))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, "README.md"))).toBe(true);

    const settingsContent = await fs.readFile(
      path.join(projectDir, ".claude/settings.json"),
      "utf-8",
    );
    expect(() => JSON.parse(settingsContent)).not.toThrow();
    expect(
      await fs.pathExists(
        path.join(projectDir, ".specify/memory/constitution.md"),
      ),
    ).toBe(true);
  }, 15_000);

  it("S6: Full stack (FastAPI + React + Docker + CI + Claude + Speckit) generates expected project structure", async () => {
    const projectDir = await run(
      baseConfig({
        backendType: "fastapi",
        frontend: "react-vite",
        docker: true,
        ci: true,
        claudeCode: true,
        speckit: true,
        prettier: true,
      }),
    );

    expect(
      await fs.pathExists(path.join(projectDir, "backend/requirements.txt")),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, "frontend/package.json")),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, "docker-compose.yml")),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, ".github/workflows/ci.yml")),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, ".claude/settings.json")),
    ).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, "README.md"))).toBe(true);

    const dockerCompose = await fs.readFile(
      path.join(projectDir, "docker-compose.yml"),
      "utf-8",
    );
    expect(dockerCompose).toContain("8000:8000");

    const ciYml = await fs.readFile(
      path.join(projectDir, ".github/workflows/ci.yml"),
      "utf-8",
    );
    expect(ciYml).toContain("python");
  }, 15_000);
});
