import path from "node:path";
import fs from "fs-extra";
import { renderAndWrite } from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";

class CodexGenerator extends BaseGenerator {
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
    const codexDir = path.join(this.projectDir, ".codex");
    await fs.ensureDir(codexDir);

    const backend = this.config.backendType !== null;
    const hasFrontend = this.config.frontend !== null;

    if (backend || hasFrontend) {
      await fs.ensureDir(path.join(codexDir, "rules"));
    }

    const data = {
      name: this.config.name,
      description: this.config.description,
      backend,
      springBoot: this.config.backendType === "spring-boot",
      fastapi: this.config.backendType === "fastapi",
      laravel: this.config.backendType === "laravel",
      nextjs: this.config.backendType === "nextjs",
      hasFrontend,
      angular: this.config.frontend === "angular",
      reactVite: this.config.frontend === "react-vite",
      vue: this.config.frontend === "vue",
      docker: this.config.docker,
      flyway: this.config.flyway,
      ngrx: this.config.ngrx,
      auth: this.config.auth,
      prisma: this.config.prisma,
      versions: this.versions,
      workflowSpeckit: this.config.workflowMode === "speckit",
      workflowOpenspec: this.config.workflowMode === "openspec",
      workflowVibe: this.config.workflowMode === "vibe",
      gitStrategy: this.config.gitStrategy,
      gitStrategyNoPr: this.config.gitStrategy === "no-pr",
    };

    await Promise.all([
      renderAndWrite(
        "codex/AGENTS.md.hbs",
        path.join(this.projectDir, "AGENTS.md"),
        data,
      ),
      renderAndWrite(
        "codex/config.toml.hbs",
        path.join(codexDir, "config.toml"),
        data,
      ),
      ...(backend
        ? [
            renderAndWrite(
              "codex/rules/backend.md.hbs",
              path.join(codexDir, "rules", "backend.md"),
              data,
            ),
          ]
        : []),
      ...(hasFrontend
        ? [
            renderAndWrite(
              "codex/rules/frontend.md.hbs",
              path.join(codexDir, "rules", "frontend.md"),
              data,
            ),
          ]
        : []),
    ]);
  }
}

export async function generateCodex(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  const generator = new CodexGenerator(projectDir, config, versions);
  await generator.generate();
}
