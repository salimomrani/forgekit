import path from "node:path";
import { renderAndWrite } from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";

class RootGenerator extends BaseGenerator {
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
    const data = {
      name: this.config.name,
      description: this.config.description,
      backend: this.config.backend,
      frontend: this.config.frontend,
      docker: this.config.docker,
      versions: this.versions,
    };

    await Promise.all([
      renderAndWrite(
        "root/README.md.hbs",
        path.join(this.projectDir, "README.md"),
        data,
      ),
      renderAndWrite(
        "root/gitignore.hbs",
        path.join(this.projectDir, ".gitignore"),
        data,
      ),
    ]);
  }
}

export async function generateRoot(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  const generator = new RootGenerator(projectDir, config, versions);
  await generator.generate();
}
