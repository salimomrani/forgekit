import path from "node:path";
import os from "node:os";
import fs from "fs-extra";
import {
  renderAndWrite,
  TEMPLATES_DIR,
  BUNDLED_SKILLS_DIR,
} from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";

class ClaudeCodeGenerator extends BaseGenerator {
  private readonly versions: ResolvedVersions;
  private readonly globalSkillsBase: string;
  private readonly globalCommandsBase: string;
  speckitWorkflowCopied = false;

  constructor(
    projectDir: string,
    config: ProjectConfig,
    versions: ResolvedVersions,
    globalSkillsBase?: string,
    globalCommandsBase?: string,
  ) {
    super(projectDir, config);
    this.versions = versions;
    this.globalSkillsBase =
      globalSkillsBase ?? path.join(os.homedir(), ".claude", "skills");
    this.globalCommandsBase =
      globalCommandsBase ?? path.join(os.homedir(), ".claude", "commands");
  }

  async generate(): Promise<void> {
    const claudeDir = path.join(this.projectDir, ".claude");
    await fs.ensureDir(claudeDir);

    const allowedCommands = this.buildAllowedCommands();

    const springBoot = this.config.backendType === "spring-boot";
    const fastapi = this.config.backendType === "fastapi";
    const backend = this.config.backendType !== null;

    const hooksDir = path.join(claudeDir, "hooks");
    await fs.ensureDir(hooksDir);
    await fs.ensureDir(path.join(this.projectDir, ".specify", "memory"));

    const data = {
      name: this.config.name,
      description: this.config.description,
      backend,
      springBoot,
      fastapi,
      frontend: this.config.frontend,
      docker: this.config.docker,
      flyway: this.config.flyway,
      ngrx: this.config.ngrx,
      auth: this.config.auth,
      versions: this.versions,
      allowedCommands,
      claudeDir: ".claude",
    };

    // Static hookify files (no templating needed)
    const staticHookifyFiles = [
      "block-dangerous-rm.local.md",
      "block-force-push.local.md",
      "block-no-verify.local.md",
      "warn-console-log.local.md",
      "warn-env-edit.local.md",
      "warn-todo-fixme.local.md",
    ];

    await Promise.all([
      // Existing files
      renderAndWrite(
        "claude-code/CLAUDE.md.hbs",
        path.join(this.projectDir, "CLAUDE.md"),
        data,
      ),
      renderAndWrite(
        "claude-code/settings.json.hbs",
        path.join(claudeDir, "settings.json"),
        data,
      ),
      // Hook scripts (templated, then chmod)
      renderAndWrite(
        "claude-code/hooks/pre-bash.sh.hbs",
        path.join(hooksDir, "pre-bash.sh"),
        data,
        { mode: 0o755 },
      ),
      renderAndWrite(
        "claude-code/hooks/session-start.sh.hbs",
        path.join(hooksDir, "session-start.sh"),
        data,
        { mode: 0o755 },
      ),
      // Templated hookify files
      renderAndWrite(
        "claude-code/hookify/stop-verify-tests.local.md.hbs",
        path.join(claudeDir, "hookify.stop-verify-tests.local.md"),
        data,
      ),
      renderAndWrite(
        "claude-code/hookify/warn-no-test-before-commit.local.md.hbs",
        path.join(claudeDir, "hookify.warn-no-test-before-commit.local.md"),
        data,
      ),
      // .specify constitution
      renderAndWrite(
        "claude-code/specify/constitution.md.hbs",
        path.join(this.projectDir, ".specify", "memory", "constitution.md"),
        data,
      ),
      // Static hookify files
      ...staticHookifyFiles.map((f) =>
        fs.copy(
          path.join(TEMPLATES_DIR, "claude-code", "hookify", f),
          path.join(claudeDir, `hookify.${f}`),
        ),
      ),
    ]);

    await this.generateSkills();
    this.speckitWorkflowCopied = await this.generateCommands();
  }

  private async generateSkills(): Promise<void> {
    const skillsToGenerate: Array<{ name: string; condition: boolean }> = [
      { name: "applying-angular-conventions", condition: this.config.frontend },
      {
        name: "applying-python-conventions",
        condition: this.config.backendType === "fastapi",
      },
      {
        name: "applying-java-conventions",
        condition: this.config.backendType === "spring-boot",
      },
    ];

    for (const { name, condition } of skillsToGenerate) {
      if (!condition) continue;

      const globalSrc = path.join(this.globalSkillsBase, name, "SKILL.md");
      const bundledSrc = path.join(BUNDLED_SKILLS_DIR, name, "SKILL.md");
      const dest = path.join(
        this.projectDir,
        ".claude",
        "skills",
        name,
        "SKILL.md",
      );

      const src = (await fs.pathExists(globalSrc)) ? globalSrc : bundledSrc;

      if (await fs.pathExists(src)) {
        await fs.ensureDir(path.dirname(dest));
        await fs.copy(src, dest);
      }
    }
  }

  private async generateCommands(): Promise<boolean> {
    const src = path.join(this.globalCommandsBase, "speckit.workflow.md");
    if (!(await fs.pathExists(src))) return false;

    const dest = path.join(this.projectDir, ".claude", "commands");
    await fs.ensureDir(dest);
    await fs.copy(src, path.join(dest, "speckit.workflow.md"));
    return true;
  }

  private buildAllowedCommands(): string[] {
    const commands: string[] = [];
    const springBoot = this.config.backendType === "spring-boot";
    const fastapi = this.config.backendType === "fastapi";

    if (springBoot) {
      commands.push(
        "Bash(./mvnw spring-boot:run)",
        "Bash(./mvnw test)",
        "Bash(./mvnw package)",
        "Bash(./mvnw clean)",
      );
    }

    if (fastapi) {
      commands.push(
        "Bash(uvicorn app.main:app --reload)",
        "Bash(pytest)",
        "Bash(pip install)",
        "Bash(pip freeze)",
      );
    }

    if (this.config.frontend) {
      commands.push(
        "Bash(ng serve)",
        "Bash(ng build)",
        "Bash(ng test)",
        "Bash(ng generate)",
        "Bash(npm install)",
        "Bash(npm run)",
      );
    }

    if (this.config.docker) {
      commands.push(
        "Bash(docker compose up)",
        "Bash(docker compose down)",
        "Bash(docker compose ps)",
      );
    }

    return commands;
  }
}

export async function generateClaudeCode(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
  globalSkillsBase?: string,
  globalCommandsBase?: string,
): Promise<{ speckitWorkflowCopied: boolean }> {
  const generator = new ClaudeCodeGenerator(
    projectDir,
    config,
    versions,
    globalSkillsBase,
    globalCommandsBase,
  );
  await generator.generate();
  return { speckitWorkflowCopied: generator.speckitWorkflowCopied };
}
