import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateClaudeCode } from "../index.js";
import type { ProjectConfig } from "../../../types.js";

const baseConfig: ProjectConfig = {
  name: "test-project",
  groupId: "com.example",
  description: "Test",
  backendType: null,
  frontend: false,
  flyway: false,
  openapi: false,
  auth: false,
  mapstruct: false,
  uiFramework: "none",
  primeNGPreset: "Aura",
  ngrx: false,
  docker: false,
  ci: false,
  claudeCode: true,
  gitInit: false,
};

const baseVersions = {
  springBoot: "3.4.0",
  angular: "19.0.0",
  primeng: "19.0.0",
  java: "21",
};

describe("ClaudeCodeGenerator", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-test-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("generates hooks directory with scripts", async () => {
    await generateClaudeCode(tmpDir, baseConfig, baseVersions);
    expect(
      await fs.pathExists(path.join(tmpDir, ".claude", "hooks", "pre-bash.sh")),
    ).toBe(true);
    expect(
      await fs.pathExists(
        path.join(tmpDir, ".claude", "hooks", "session-start.sh"),
      ),
    ).toBe(true);
  });

  it("makes hook scripts executable", async () => {
    await generateClaudeCode(tmpDir, baseConfig, baseVersions);
    const stat = await fs.stat(
      path.join(tmpDir, ".claude", "hooks", "pre-bash.sh"),
    );
    expect(stat.mode & 0o100).toBeTruthy();
  });

  it("generates hookify guard files", async () => {
    await generateClaudeCode(tmpDir, baseConfig, baseVersions);
    const hookifyFiles = [
      "block-dangerous-rm.local.md",
      "block-force-push.local.md",
      "block-no-verify.local.md",
      "stop-verify-tests.local.md",
      "warn-console-log.local.md",
      "warn-env-edit.local.md",
      "warn-no-test-before-commit.local.md",
      "warn-todo-fixme.local.md",
    ];
    for (const f of hookifyFiles) {
      expect(
        await fs.pathExists(path.join(tmpDir, ".claude", `hookify.${f}`)),
      ).toBe(true);
    }
  });

  it("generates .specify/memory/constitution.md", async () => {
    await generateClaudeCode(tmpDir, baseConfig, baseVersions);
    expect(
      await fs.pathExists(
        path.join(tmpDir, ".specify", "memory", "constitution.md"),
      ),
    ).toBe(true);
  });

  it("settings.json contains hooks configuration", async () => {
    await generateClaudeCode(tmpDir, baseConfig, baseVersions);
    const settings = await fs.readJson(
      path.join(tmpDir, ".claude", "settings.json"),
    );
    expect(settings.hooks).toBeDefined();
    expect(settings.hooks.SessionStart).toBeDefined();
    expect(settings.hooks.PreToolUse).toBeDefined();
    expect(settings.hooks.PreCompact).toBeDefined();
  });

  it("generates angular skill when frontend is enabled", async () => {
    const config = { ...baseConfig, frontend: true };
    await generateClaudeCode(tmpDir, config, baseVersions);
    expect(
      await fs.pathExists(
        path.join(
          tmpDir,
          ".claude",
          "skills",
          "applying-angular-conventions",
          "SKILL.md",
        ),
      ),
    ).toBe(true);
  });

  it("generates python skill when fastapi backend", async () => {
    const config = { ...baseConfig, backendType: "fastapi" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    expect(
      await fs.pathExists(
        path.join(
          tmpDir,
          ".claude",
          "skills",
          "applying-python-conventions",
          "SKILL.md",
        ),
      ),
    ).toBe(true);
  });

  it("generates java skill when spring-boot backend", async () => {
    const config = { ...baseConfig, backendType: "spring-boot" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    expect(
      await fs.pathExists(
        path.join(
          tmpDir,
          ".claude",
          "skills",
          "applying-java-conventions",
          "SKILL.md",
        ),
      ),
    ).toBe(true);
  });

  it("generates no stack skills when claude-only (no backend, no frontend)", async () => {
    await generateClaudeCode(tmpDir, baseConfig, baseVersions);
    expect(await fs.pathExists(path.join(tmpDir, ".claude", "skills"))).toBe(
      false,
    );
  });
});
