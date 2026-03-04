import path from "node:path";
import { renderAndWrite } from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";

class DockerGenerator extends BaseGenerator {
  async generate(): Promise<void> {
    const dbName = this.config.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const springBoot = this.config.backendType === "spring-boot";
    const fastapi = this.config.backendType === "fastapi";

    await renderAndWrite(
      "docker/docker-compose.yml.hbs",
      path.join(this.projectDir, "docker-compose.yml"),
      { dbName, name: this.config.name, springBoot, fastapi },
    );
  }
}

export async function generateDocker(
  projectDir: string,
  config: ProjectConfig,
): Promise<void> {
  const generator = new DockerGenerator(projectDir, config);
  await generator.generate();
}
