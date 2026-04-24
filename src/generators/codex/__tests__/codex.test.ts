import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateCodex } from "../index.js";
import { makeBaseConfig, BASE_VERSIONS } from "../../../__tests__/fixtures.js";

const baseConfig = makeBaseConfig({ aiTool: "codex" });
const baseVersions = BASE_VERSIONS;

describe("CodexGenerator", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-codex-test-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("creates AGENTS.md at the project root", async () => {
    await generateCodex(tmpDir, baseConfig, baseVersions);
    expect(await fs.pathExists(path.join(tmpDir, "AGENTS.md"))).toBe(true);
  });

  it("creates .codex/config.toml with default sandbox + approval values", async () => {
    await generateCodex(tmpDir, baseConfig, baseVersions);
    const tomlPath = path.join(tmpDir, ".codex", "config.toml");
    expect(await fs.pathExists(tomlPath)).toBe(true);
    const content = await fs.readFile(tomlPath, "utf-8");
    expect(content).toContain('sandbox_mode = "workspace-write"');
    expect(content).toContain('approval_policy = "on-request"');
  });

  it("creates .codex/rules/backend.md when a backend is configured", async () => {
    const config = makeBaseConfig({
      aiTool: "codex",
      backendType: "spring-boot",
    });
    await generateCodex(tmpDir, config, baseVersions);
    const rulesPath = path.join(tmpDir, ".codex", "rules", "backend.md");
    expect(await fs.pathExists(rulesPath)).toBe(true);
    const content = await fs.readFile(rulesPath, "utf-8");
    expect(content).toContain("Spring Boot");
  });

  it("creates .codex/rules/frontend.md when a frontend is configured", async () => {
    const config = makeBaseConfig({
      aiTool: "codex",
      frontend: "angular",
    });
    await generateCodex(tmpDir, config, baseVersions);
    const rulesPath = path.join(tmpDir, ".codex", "rules", "frontend.md");
    expect(await fs.pathExists(rulesPath)).toBe(true);
    const content = await fs.readFile(rulesPath, "utf-8");
    expect(content).toContain("Angular");
  });

  it("skips backend/frontend rules when neither stack is configured", async () => {
    await generateCodex(tmpDir, baseConfig, baseVersions);
    expect(
      await fs.pathExists(path.join(tmpDir, ".codex", "rules", "backend.md")),
    ).toBe(false);
    expect(
      await fs.pathExists(path.join(tmpDir, ".codex", "rules", "frontend.md")),
    ).toBe(false);
  });

  it("never writes Claude artifacts (no CLAUDE.md, no .claude/)", async () => {
    const config = makeBaseConfig({
      aiTool: "codex",
      backendType: "fastapi",
      frontend: "react-vite",
    });
    await generateCodex(tmpDir, config, baseVersions);
    expect(await fs.pathExists(path.join(tmpDir, "CLAUDE.md"))).toBe(false);
    expect(await fs.pathExists(path.join(tmpDir, ".claude"))).toBe(false);
  });

  it("renders FastAPI guidance in AGENTS.md when backend is fastapi", async () => {
    const config = makeBaseConfig({
      aiTool: "codex",
      backendType: "fastapi",
    });
    await generateCodex(tmpDir, config, baseVersions);
    const agents = await fs.readFile(path.join(tmpDir, "AGENTS.md"), "utf-8");
    expect(agents).toContain("FastAPI");
    expect(agents).toContain("uvicorn");
  });

  it("renders speckit workflow banner when workflowMode is speckit", async () => {
    const config = makeBaseConfig({
      aiTool: "codex",
      workflowMode: "speckit",
    });
    await generateCodex(tmpDir, config, baseVersions);
    const agents = await fs.readFile(path.join(tmpDir, "AGENTS.md"), "utf-8");
    expect(agents).toContain("Workflow Mode: speckit");
  });

  it("renders no-PR git note when gitStrategy is no-pr", async () => {
    const config = makeBaseConfig({
      aiTool: "codex",
      gitStrategy: "no-pr",
    });
    await generateCodex(tmpDir, config, baseVersions);
    const agents = await fs.readFile(path.join(tmpDir, "AGENTS.md"), "utf-8");
    expect(agents).toContain("Merge direct sur `master`");
  });
});
