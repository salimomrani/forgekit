import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { renderAndWrite } from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, "../../", "templates");

class ClaudeCodeGenerator extends BaseGenerator {
  private readonly versions: ResolvedVersions;

  constructor(
    projectDir: string,
    config: ProjectConfig,
    versions: ResolvedVersions,
  ) {
    super(projectDir, config);
    this.versions = versions;
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
      claudeDir,
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
      renderAndWrite(
        "claude-code/claudeignore.hbs",
        path.join(this.projectDir, ".claudeignore"),
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
): Promise<void> {
  const generator = new ClaudeCodeGenerator(projectDir, config, versions);
  await generator.generate();
}
