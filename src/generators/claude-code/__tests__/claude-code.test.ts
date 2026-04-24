import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateClaudeCode } from "../index.js";
import { makeBaseConfig, BASE_VERSIONS } from "../../../__tests__/fixtures.js";

// Fake global dirs — seeded in beforeEach
let fakeSkillsDir: string;
let fakeCommandsDir: string;

const baseConfig = makeBaseConfig({ aiTool: "claude" });
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
      await fs.pathExists(
        path.join(tmpDir, ".claude", "hooks", "session-start.sh"),
      ),
    ).toBe(true);
  });

  it("makes hook scripts executable", async () => {
    await generateClaudeCode(tmpDir, baseConfig, baseVersions);
    const stat = await fs.stat(
      path.join(tmpDir, ".claude", "hooks", "session-start.sh"),
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

  it("settings.json contains a hooks object", async () => {
    await generateClaudeCode(tmpDir, baseConfig, baseVersions);
    const settings = await fs.readJson(
      path.join(tmpDir, ".claude", "settings.json"),
    );
    expect(settings.hooks).toBeDefined();
    expect(typeof settings.hooks).toBe("object");
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

  it("CLAUDE.md never contains a Claude Settings table (settings.json is the SSOT)", async () => {
    for (const mode of ["speckit", "vibe", "none"] as const) {
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-test-"));
      await generateClaudeCode(
        dir,
        {
          ...baseConfig,
          workflowMode: mode,
          speckitPreset: mode === "speckit" ? ("balanced" as const) : null,
        },
        baseVersions,
      );
      const content = await fs.readFile(path.join(dir, "CLAUDE.md"), "utf-8");
      expect(content).not.toContain("## Claude Settings");
      expect(content).not.toContain("`speckit.tests`");
      expect(content).not.toContain("`git.strategy`");
      await fs.remove(dir);
    }
  });

  it("settings.json reflects balanced preset values in speckit mode", async () => {
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
    expect(settings.speckit.tests).toBe(true);
    expect(settings.speckit.tdd).toBe(false);
    expect(settings.speckit["code-review"]).toBe(true);
    expect(settings.speckit.verification).toBe("minimal");
    expect(settings.speckit["plan-detail"]).toBe("medium");
  });

  it("settings.json reflects rigorous preset values", async () => {
    const config = {
      ...baseConfig,
      workflowMode: "speckit" as const,
      speckitPreset: "rigorous" as const,
    };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const settings = await fs.readJson(
      path.join(tmpDir, ".claude", "settings.json"),
    );
    expect(settings.speckit.tdd).toBe(true);
    expect(settings.speckit.verification).toBe("full");
    expect(settings.speckit["plan-detail"]).toBe("high");
  });

  it("settings.json reflects fast preset values", async () => {
    const config = {
      ...baseConfig,
      workflowMode: "speckit" as const,
      speckitPreset: "fast" as const,
    };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const settings = await fs.readJson(
      path.join(tmpDir, ".claude", "settings.json"),
    );
    expect(settings.speckit["skip-clarify"]).toBe(true);
    expect(settings.speckit["code-review"]).toBe(false);
  });

  it("settings.json reflects bare-metal preset values", async () => {
    const config = {
      ...baseConfig,
      workflowMode: "speckit" as const,
      speckitPreset: "bare-metal" as const,
    };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const settings = await fs.readJson(
      path.join(tmpDir, ".claude", "settings.json"),
    );
    expect(settings.speckit.tests).toBe(false);
    expect(settings.speckit.verification).toBe("skip");
  });

  it("CLAUDE.md contains '## Workflow Mode: vibe' when workflowMode is vibe", async () => {
    const config = { ...baseConfig, workflowMode: "vibe" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("## Workflow Mode: vibe");
    expect(content).not.toContain("## Workflow Mode: speckit");
  });

  it("vibe mode → settings.json git.strategy=no-pr and CLAUDE.md uses commit skill", async () => {
    const config = {
      ...baseConfig,
      workflowMode: "vibe" as const,
      gitStrategy: "no-pr" as const,
    };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const settings = await fs.readJson(
      path.join(tmpDir, ".claude", "settings.json"),
    );
    expect(settings.git.strategy).toBe("no-pr");
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("Merge direct sur `master`");
    expect(content).toContain("`commit-commands:commit`");
    expect(content).not.toContain("`commit-commands:commit-push-pr`");
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

  it("generates .claude/rules/backend.md when laravel backend", async () => {
    const config = { ...baseConfig, backendType: "laravel" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(
      path.join(tmpDir, ".claude", "rules", "backend.md"),
      "utf-8",
    );
    expect(content).toContain('paths: ["**/backend/**"]');
    expect(content).toContain("Laravel");
    expect(content).toContain("php artisan");
    expect(content).toContain("./vendor/bin/pint");
  });

  it("generates .claude/rules/backend.md when nextjs backend", async () => {
    const config = { ...baseConfig, backendType: "nextjs" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(
      path.join(tmpDir, ".claude", "rules", "backend.md"),
      "utf-8",
    );
    expect(content).toContain('paths: ["**/backend/**"]');
    expect(content).toContain("Next.js");
    expect(content).toContain("App Router");
  });

  it("generates .claude/rules/backend.md mentions Prisma when nextjs + prisma", async () => {
    const config = {
      ...baseConfig,
      backendType: "nextjs" as const,
      prisma: true,
    };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(
      path.join(tmpDir, ".claude", "rules", "backend.md"),
      "utf-8",
    );
    expect(content).toContain("Prisma");
    expect(content).toContain("npx prisma migrate dev");
  });

  it("generates .claude/rules/frontend.md when frontend is vue", async () => {
    const config = { ...baseConfig, frontend: "vue" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(
      path.join(tmpDir, ".claude", "rules", "frontend.md"),
      "utf-8",
    );
    expect(content).toContain('paths: ["**/frontend/**"]');
    expect(content).toContain("Vue");
    expect(content).toContain("Pinia");
    expect(content).toContain("Composition API");
  });

  it("CLAUDE.md contains Angular stack block when frontend is angular", async () => {
    const config = { ...baseConfig, frontend: "angular" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("## Frontend — Angular");
    expect(content).toContain("ng serve");
    expect(content).toContain("PrimeNG");
  });

  it("CLAUDE.md contains Vue stack block when frontend is vue", async () => {
    const config = { ...baseConfig, frontend: "vue" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("## Frontend — Vue");
    expect(content).toContain("Pinia");
  });

  it("CLAUDE.md contains FastAPI stack block when backendType is fastapi", async () => {
    const config = { ...baseConfig, backendType: "fastapi" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("## Backend — FastAPI");
    expect(content).toContain(".venv/bin/pytest");
  });

  it("CLAUDE.md contains Spring Boot stack block when backendType is spring-boot", async () => {
    const config = { ...baseConfig, backendType: "spring-boot" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("## Backend — Spring Boot");
    expect(content).toContain("./mvnw");
  });

  it("CLAUDE.md contains Laravel stack block when backendType is laravel", async () => {
    const config = { ...baseConfig, backendType: "laravel" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("## Backend — Laravel");
    expect(content).toContain("php artisan");
  });

  it("CLAUDE.md contains Next.js stack block when backendType is nextjs", async () => {
    const config = { ...baseConfig, backendType: "nextjs" as const };
    await generateClaudeCode(tmpDir, config, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("## Backend — Next.js");
    expect(content).toContain("App Router");
  });

  it("CLAUDE.md contains no stack blocks when claude-only (no backend, no frontend)", async () => {
    await generateClaudeCode(tmpDir, baseConfig, baseVersions);
    const content = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf-8");
    expect(content).not.toContain("## Frontend — ");
    expect(content).not.toContain("## Backend — ");
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
