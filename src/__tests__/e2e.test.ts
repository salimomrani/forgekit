import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateProject } from "../commands/new.js";
import { FALLBACK_VERSIONS } from "../versions.js";
import type { ProjectConfig } from "../types.js";
import { makeBaseConfig } from "./fixtures.js";

function baseConfig(overrides: Parameters<typeof makeBaseConfig>[0] = {}) {
  return makeBaseConfig({
    name: "test-proj",
    description: "E2E test",
    ...overrides,
  });
}

vi.mock("../generators/speckit.js", () => ({
  initSpecify: vi.fn(() => true),
}));

const BASE_VERSIONS = FALLBACK_VERSIONS;

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

    expect(
      await fs.pathExists(path.join(projectDir, "backend/pyrightconfig.json")),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, "pyrightconfig.json")),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, "backend/pytest.ini")),
    ).toBe(true);

    const readme = await fs.readFile(
      path.join(projectDir, "README.md"),
      "utf-8",
    );
    expect(readme).toContain("python3 -m venv .venv");
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
        aiTool: "claude",
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
        aiTool: "claude",
        workflowMode: "speckit",
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

  it("S7: Next.js backend only generates expected project structure", async () => {
    const projectDir = await run(
      baseConfig({
        backendType: "nextjs",
        frontend: null,
      }),
    );

    const expectedFiles = [
      "backend/package.json",
      "backend/next.config.ts",
      "backend/tsconfig.json",
      "backend/.env.example",
      "backend/Dockerfile",
      "backend/app/api/health/route.ts",
    ];

    for (const file of expectedFiles) {
      expect(
        await fs.pathExists(path.join(projectDir, file)),
        `Expected ${file} to exist`,
      ).toBe(true);
    }

    const pkg = await fs.readJson(
      path.join(projectDir, "backend/package.json"),
    );
    expect(pkg.dependencies).toHaveProperty("next");
  }, 15_000);

  it("S8: Next.js + Angular + Docker + CI generates expected project structure", async () => {
    const projectDir = await run(
      baseConfig({
        backendType: "nextjs",
        frontend: "angular",
        docker: true,
        ci: true,
      }),
    );

    expect(
      await fs.pathExists(path.join(projectDir, "backend/package.json")),
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

    const dockerCompose = await fs.readFile(
      path.join(projectDir, "docker-compose.yml"),
      "utf-8",
    );
    expect(dockerCompose).toContain("api:");
    expect(dockerCompose).toContain("postgres:");

    const ciYml = await fs.readFile(
      path.join(projectDir, ".github/workflows/ci.yml"),
      "utf-8",
    );
    expect(ciYml).toContain("backend/package-lock.json");
  }, 15_000);

  it("S9: Vue.js only — generates key files and package.json contains vue", async () => {
    const projectDir = await run(
      baseConfig({
        frontend: "vue",
        uiFramework: "tailwind",
      }),
    );

    const frontendDir = path.join(projectDir, "frontend");
    const srcDir = path.join(frontendDir, "src");

    expect(await fs.pathExists(path.join(frontendDir, "package.json"))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(frontendDir, "vite.config.ts"))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(srcDir, "App.vue"))).toBe(true);
    expect(await fs.pathExists(path.join(srcDir, "main.ts"))).toBe(true);
    expect(await fs.pathExists(path.join(srcDir, "router", "index.ts"))).toBe(
      true,
    );
    expect(
      await fs.pathExists(path.join(srcDir, "components", "Layout.vue")),
    ).toBe(true);

    const pkg = await fs.readJson(path.join(frontendDir, "package.json"));
    expect(pkg.dependencies["vue"]).toBeDefined();
  }, 15_000);

  it("S10: Vue.js + Spring Boot + Docker + CI — verifies frontend, ci.yml, docker-compose", async () => {
    const projectDir = await run(
      baseConfig({
        backendType: "spring-boot",
        frontend: "vue",
        uiFramework: "tailwind",
        docker: true,
        ci: true,
      }),
    );

    expect(
      await fs.pathExists(path.join(projectDir, "frontend", "package.json")),
    ).toBe(true);

    const ciYml = await fs.readFile(
      path.join(projectDir, ".github/workflows/ci.yml"),
      "utf-8",
    );
    expect(ciYml).toContain("frontend/package-lock.json");

    const dockerCompose = await fs.readFile(
      path.join(projectDir, "docker-compose.yml"),
      "utf-8",
    );
    expect(dockerCompose).toContain("postgres:");
  }, 15_000);
});
