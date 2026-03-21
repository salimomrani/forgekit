import path from "node:path";
import { renderAndWrite } from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";

class CIGenerator extends BaseGenerator {
  async generate(): Promise<void> {
    const workflowsDir = path.join(this.projectDir, ".github", "workflows");
    await this.ensureDirs([workflowsDir]);

    const springBoot = this.config.backendType === "spring-boot";
    const fastapi = this.config.backendType === "fastapi";
    const laravel = this.config.backendType === "laravel";

    const hasFrontend = this.config.frontend !== null;
    const angular = this.config.frontend === "angular";
    const reactVite = this.config.frontend === "react-vite";

    await renderAndWrite("ci/ci.yml.hbs", path.join(workflowsDir, "ci.yml"), {
      backend: this.config.backendType !== null,
      springBoot,
      fastapi,
      laravel,
      frontend: hasFrontend,
      hasFrontend,
      angular,
      reactVite,
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
