import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateClaudeCode } from "../index.js";

// Fake global dirs — seeded in beforeEach
let fakeSkillsDir: string;
let fakeCommandsDir: string;
import type { ProjectConfig } from "../../../types.js";
import type { ResolvedVersions } from "../../../versions.js";

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
  speckit: false,
  gitInit: false,
};

const baseVersions: ResolvedVersions = {
  springBoot: "3.4.0",
  springDoc: "2.8.0",
  mapstruct: "1.6.3",
  angular: "19.0.0",
  primeng: "19.0.0",
  primeuixThemes: "2.0.3",
  primeicons: "7.0.0",
  primeflex: "3.3.1",
  ngrxSignals: "19.0.0",
  rxjs: "7.8.0",
  zoneJs: "0.15.0",
  typescript: "5.6.0",
  tailwind: "4.0.0",
};

describe("ClaudeCodeGenerator", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-test-"));
    fakeSkillsDir = path.join(tmpDir, "fake-skills");
    fakeCommandsDir = path.join(tmpDir, "fake-commands");
    await fs.ensureDir(fakeCommandsDir);
    await fs.writeFile(
      path.join(fakeCommandsDir, "speckit.workflow.md"),
      "# workflow",
    );
    await fs.writeFile(
      path.join(fakeCommandsDir, "speckit.specify.md"),
      "# specify",
    );
    await fs.writeFile(
      path.join(fakeCommandsDir, "forgekit.install.md"),
      "# forgekit install",
    );
    await fs.writeFile(
      path.join(fakeCommandsDir, "forgekit.release.md"),
      "# forgekit release",
    );
    for (const skill of [
      "applying-angular-conventions",
      "applying-python-conventions",
      "applying-java-conventions",
    ]) {
      await fs.ensureDir(path.join(fakeSkillsDir, skill));
      await fs.writeFile(
        path.join(fakeSkillsDir, skill, "SKILL.md"),
        `# ${skill}`,
      );
    }
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
    await generateClaudeCode(tmpDir, config, baseVersions, fakeSkillsDir);
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
    await generateClaudeCode(tmpDir, config, baseVersions, fakeSkillsDir);
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
    await generateClaudeCode(tmpDir, config, baseVersions, fakeSkillsDir);
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
    await generateClaudeCode(tmpDir, baseConfig, baseVersions, fakeSkillsDir);
    expect(await fs.pathExists(path.join(tmpDir, ".claude", "skills"))).toBe(
      false,
    );
  });

  it("copies only speckit.workflow.md to .claude/commands/", async () => {
    await generateClaudeCode(
      tmpDir,
      baseConfig,
      baseVersions,
      fakeSkillsDir,
      fakeCommandsDir,
    );
    expect(
      await fs.pathExists(
        path.join(tmpDir, ".claude", "commands", "speckit.workflow.md"),
      ),
    ).toBe(true);
    expect(
      await fs.pathExists(
        path.join(tmpDir, ".claude", "commands", "speckit.specify.md"),
      ),
    ).toBe(false);
    expect(
      await fs.pathExists(
        path.join(tmpDir, ".claude", "commands", "forgekit.install.md"),
      ),
    ).toBe(false);
    expect(
      await fs.pathExists(
        path.join(tmpDir, ".claude", "commands", "forgekit.release.md"),
      ),
    ).toBe(false);
  });

  it("skips commands copy gracefully when speckit.workflow.md does not exist", async () => {
    await generateClaudeCode(
      tmpDir,
      baseConfig,
      baseVersions,
      fakeSkillsDir,
      "/nonexistent/commands",
    );
    expect(await fs.pathExists(path.join(tmpDir, ".claude", "commands"))).toBe(
      false,
    );
  });

  it("returns speckitWorkflowCopied=true when speckit.workflow.md exists", async () => {
    const result = await generateClaudeCode(
      tmpDir,
      baseConfig,
      baseVersions,
      fakeSkillsDir,
      fakeCommandsDir,
    );
    expect(result.speckitWorkflowCopied).toBe(true);
  });

  it("returns speckitWorkflowCopied=false when speckit.workflow.md is absent", async () => {
    const result = await generateClaudeCode(
      tmpDir,
      baseConfig,
      baseVersions,
      fakeSkillsDir,
      "/nonexistent/commands",
    );
    expect(result.speckitWorkflowCopied).toBe(false);
  });

  it("falls back to bundled skill when global skills dir does not exist", async () => {
    const config = { ...baseConfig, frontend: true };
    await generateClaudeCode(
      tmpDir,
      config,
      baseVersions,
      "/nonexistent/skills", // no global skills
    );
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

  it("prefers global skill content over bundled when global exists", async () => {
    const config = { ...baseConfig, backendType: "spring-boot" as const };
    await generateClaudeCode(tmpDir, config, baseVersions, fakeSkillsDir);
    const content = await fs.readFile(
      path.join(
        tmpDir,
        ".claude",
        "skills",
        "applying-java-conventions",
        "SKILL.md",
      ),
      "utf-8",
    );
    // fakeSkillsDir seeds "# applying-java-conventions" — not the bundled content
    expect(content).toBe("# applying-java-conventions");
  });

  it("session-start hook detects unfilled constitution and instructs to run speckit.constitution", async () => {
    await generateClaudeCode(tmpDir, baseConfig, baseVersions);
    const content = await fs.readFile(
      path.join(tmpDir, ".claude", "hooks", "session-start.sh"),
      "utf-8",
    );
    expect(content).toContain("Your first principle");
    expect(content).toContain("speckit.constitution");
    // stdout carries an explicit instruction to Claude (injected into context)
    // stderr carries the user-visible terminal message
    expect(content).toContain(">&2");
    expect(content).toContain("IMPORTANT");
  });
});
