import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateClaudeCode } from "../index.js";
import { makeBaseConfig, BASE_VERSIONS } from "../../../__tests__/fixtures.js";

// Fake global dirs — seeded in beforeEach
let fakeSkillsDir: string;
let fakeCommandsDir: string;

const baseConfig = makeBaseConfig({ claudeCode: true });
const baseVersions = BASE_VERSIONS;

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
      "applying-react-conventions",
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
    const config = { ...baseConfig, frontend: "angular" as const };
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

  it("generates react skill when frontend is react-vite", async () => {
    const config = { ...baseConfig, frontend: "react-vite" as const };
    await generateClaudeCode(tmpDir, config, baseVersions, fakeSkillsDir);
    expect(
      await fs.pathExists(
        path.join(
          tmpDir,
          ".claude",
          "skills",
          "applying-react-conventions",
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
    const config = { ...baseConfig, frontend: "angular" as const };
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

  it("generates .claude/rules/backend.md when spring-boot backend", async () => {
    const config = { ...baseConfig, backendType: "spring-boot" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(
      path.join(tmpDir, ".claude", "rules", "backend.md"),
      "utf-8",
    );
    expect(content).toContain('paths: ["**/backend/**"]');
    expect(content).toContain("Spring Boot");
  });

  it("generates .claude/rules/backend.md when fastapi backend", async () => {
    const config = { ...baseConfig, backendType: "fastapi" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(
      path.join(tmpDir, ".claude", "rules", "backend.md"),
      "utf-8",
    );
    expect(content).toContain('paths: ["**/backend/**"]');
    expect(content).toContain("FastAPI");
    expect(content).toContain("201");
    expect(content).toContain(".venv/bin/pytest");
  });

  it("generates .claude/rules/frontend.md when frontend is enabled", async () => {
    const config = { ...baseConfig, frontend: "angular" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(
      path.join(tmpDir, ".claude", "rules", "frontend.md"),
      "utf-8",
    );
    expect(content).toContain('paths: ["**/frontend/**"]');
    expect(content).toContain("Angular");
  });

  it("does not generate .claude/rules/ when claude-only", async () => {
    await generateClaudeCode(tmpDir, baseConfig, baseVersions);
    expect(await fs.pathExists(path.join(tmpDir, ".claude", "rules"))).toBe(
      false,
    );
  });

  it("CLAUDE.md does not contain project structure block", async () => {
    const config = {
      ...baseConfig,
      backendType: "spring-boot" as const,
      frontend: "angular" as const,
    };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).not.toContain("## Project Structure");
  });

  it("CLAUDE.md does not contain stack skill references", async () => {
    const config = {
      ...baseConfig,
      backendType: "fastapi" as const,
      frontend: "angular" as const,
    };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).not.toContain("applying-angular-conventions");
    expect(content).not.toContain("applying-python-conventions");
  });

  it("CLAUDE.md does not contain Commit / PR row", async () => {
    await generateClaudeCode(tmpDir, baseConfig, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).not.toContain("Commit / PR");
  });

  it("CLAUDE.md contains '## Workflow Mode: speckit' when workflowMode is speckit", async () => {
    const config = {
      ...baseConfig,
      workflowMode: "speckit" as const,
      speckitPreset: "balanced" as const,
    };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("## Workflow Mode: speckit");
    expect(content).not.toContain("## Workflow Mode: vibe");
  });

  it("CLAUDE.md contains ## Claude Settings block when workflowMode is speckit", async () => {
    const config = {
      ...baseConfig,
      workflowMode: "speckit" as const,
      speckitPreset: "balanced" as const,
    };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("## Claude Settings");
    expect(content).toContain("| `speckit.tests` | `settings.json` | `true` |");
    expect(content).toContain("| `speckit.tdd` | `settings.json` | `false` |");
    expect(content).toContain(
      "| `speckit.code-review` | `settings.json` | `true` |",
    );
    expect(content).toContain(
      "| `speckit.verification` | `settings.json` | `minimal` |",
    );
    expect(content).toContain(
      "| `speckit.plan-detail` | `settings.json` | `medium` |",
    );

    const settingsContent = await fs.readFile(
      path.join(tmpDir, ".claude", "settings.json"),
      "utf-8",
    );
    const settings = JSON.parse(settingsContent);
    expect(settings.git.strategy).toBe("pr-required");
    expect(settings.speckit.tests).toBe(true);
    expect(settings.speckit.tdd).toBe(false);
  });

  it("CLAUDE.md Speckit Config — rigorous preset", async () => {
    const config = {
      ...baseConfig,
      workflowMode: "speckit" as const,
      speckitPreset: "rigorous" as const,
    };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("| `speckit.tdd` | `settings.json` | `true` |");
    expect(content).toContain(
      "| `speckit.verification` | `settings.json` | `full` |",
    );
    expect(content).toContain(
      "| `speckit.plan-detail` | `settings.json` | `high` |",
    );
  });

  it("CLAUDE.md Speckit Config — fast preset (skip-clarify: true, no fast-mode line)", async () => {
    const config = {
      ...baseConfig,
      workflowMode: "speckit" as const,
      speckitPreset: "fast" as const,
    };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain(
      "| `speckit.skip-clarify` | `settings.json` | `true` |",
    );
    expect(content).toContain(
      "| `speckit.code-review` | `settings.json` | `false` |",
    );
  });

  it("CLAUDE.md Speckit Config — bare-metal preset", async () => {
    const config = {
      ...baseConfig,
      workflowMode: "speckit" as const,
      speckitPreset: "bare-metal" as const,
    };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain(
      "| `speckit.tests` | `settings.json` | `false` |",
    );
    expect(content).toContain(
      "| `speckit.verification` | `settings.json` | `skip` |",
    );
  });

  it("CLAUDE.md does not contain ## Claude Settings when workflowMode is vibe", async () => {
    const config = { ...baseConfig, workflowMode: "vibe" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).not.toContain("`speckit.tests`");
  });

  it("CLAUDE.md does not contain ## Claude Settings when workflowMode is none", async () => {
    const config = { ...baseConfig, workflowMode: "none" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).not.toContain("`speckit.tests`");
  });

  it("CLAUDE.md contains '## Workflow Mode: vibe' when workflowMode is vibe", async () => {
    const config = { ...baseConfig, workflowMode: "vibe" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("## Workflow Mode: vibe");
    expect(content).not.toContain("## Workflow Mode: speckit");
  });

  it("vibe mode → settings.json git.strategy=no-pr and CLAUDE.md uses commit skill", async () => {
    const config = { ...baseConfig, workflowMode: "vibe" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const settings = await fs.readJson(
      path.join(tmpDir, ".claude", "settings.json"),
    );
    expect(settings.git.strategy).toBe("no-pr");
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("Merge direct sur `master`");
    expect(content).toContain("`commit-commands:commit`");
    expect(content).not.toContain("`commit-commands:commit-push-pr`");
    expect(content).toContain("| `git.strategy` | `settings.json` | `no-pr` |");
  });

  it("speckit mode → settings.json git.strategy=pr-required and CLAUDE.md uses commit-push-pr skill", async () => {
    const config = {
      ...baseConfig,
      workflowMode: "speckit" as const,
      speckitPreset: "balanced" as const,
    };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const settings = await fs.readJson(
      path.join(tmpDir, ".claude", "settings.json"),
    );
    expect(settings.git.strategy).toBe("pr-required");
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("PR obligatoire");
    expect(content).toContain("`commit-commands:commit-push-pr`");
    expect(content).toContain(
      "| `git.strategy` | `settings.json` | `pr-required` |",
    );
  });

  it("none mode → settings.json git.strategy=pr-required (default)", async () => {
    const config = { ...baseConfig, workflowMode: "none" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const settings = await fs.readJson(
      path.join(tmpDir, ".claude", "settings.json"),
    );
    expect(settings.git.strategy).toBe("pr-required");
  });

  it("settings.json has no speckit block outside speckit mode", async () => {
    for (const mode of ["vibe", "none"] as const) {
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-test-"));
      await generateClaudeCode(
        dir,
        { ...baseConfig, workflowMode: mode },
        baseVersions,
      );
      const settings = await fs.readJson(
        path.join(dir, ".claude", "settings.json"),
      );
      expect(settings.speckit).toBeUndefined();
      await fs.remove(dir);
    }
  });

  it("CLAUDE.md does not contain '## Workflow Mode' when workflowMode is none", async () => {
    const config = { ...baseConfig, workflowMode: "none" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).not.toContain("## Workflow Mode");
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
