import path from "node:path";
import { renderAndWrite } from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";

class CIGenerator extends BaseGenerator {
  async generate(): Promise<void> {
    const workflowsDir = path.join(this.projectDir, ".github", "workflows");
    await this.ensureDirs([workflowsDir]);

    await renderAndWrite("ci/ci.yml.hbs", path.join(workflowsDir, "ci.yml"), {
      backend: this.config.backend,
      frontend: this.config.frontend,
    });
  }
}

export async function generateCI(
  projectDir: string,
  config: ProjectConfig,
): Promise<void> {
  const generator = new CIGenerator(projectDir, config);
  await generator.generate();
}
