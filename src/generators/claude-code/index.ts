import path from "node:path";
import fs from "fs-extra";
import { renderAndWrite } from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";

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

    const data = {
      name: this.config.name,
      description: this.config.description,
      backend: this.config.backend,
      frontend: this.config.frontend,
      docker: this.config.docker,
      versions: this.versions,
      allowedCommands,
    };

    await Promise.all([
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
    ]);
  }

  private buildAllowedCommands(): string[] {
    const commands: string[] = [];

    if (this.config.backend) {
      commands.push(
        "Bash(./mvnw spring-boot:run)",
        "Bash(./mvnw test)",
        "Bash(./mvnw package)",
        "Bash(./mvnw clean)",
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
