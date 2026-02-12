import path from "node:path";
import fs from "fs-extra";
import { renderAndWrite } from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";

class BackendGenerator extends BaseGenerator {
  private readonly versions: ResolvedVersions;
  private readonly artifactId: string;
  private readonly packageName: string;
  private readonly groupPath: string;
  private readonly dbName: string;

  constructor(
    projectDir: string,
    config: ProjectConfig,
    versions: ResolvedVersions,
  ) {
    super(projectDir, config);
    this.versions = versions;
    this.artifactId = config.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    this.packageName = `${config.groupId}.${config.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    this.groupPath = config.groupId.replace(/\./g, "/");
    this.dbName = config.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
  }

  async generate(): Promise<void> {
    const backendDir = path.join(this.projectDir, "backend");
    const javaDir = path.join(
      backendDir,
      "src/main/java",
      this.groupPath,
      this.config.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
    );
    const resourcesDir = path.join(backendDir, "src/main/resources");
    const testDir = path.join(
      backendDir,
      "src/test/java",
      this.groupPath,
      this.config.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
    );

    await this.ensureDirs([
      javaDir,
      path.join(javaDir, "config"),
      path.join(javaDir, "shared/exception"),
      path.join(javaDir, "shared/dto"),
      path.join(javaDir, "feature"),
      path.join(resourcesDir, "db/migration"),
      testDir,
      path.join(backendDir, ".mvn/wrapper"),
    ]);

    const data = {
      groupId: this.config.groupId,
      artifactId: this.artifactId,
      packageName: this.packageName,
      name: this.config.name,
      description: this.config.description,
      auth: this.config.auth,
      dbName: this.dbName,
      datasourceUrl: `\${DB_URL:jdbc:postgresql://localhost:5432/${this.dbName}}`,
      versions: this.versions,
    };

    await Promise.all([
      renderAndWrite(
        "backend/pom.xml.hbs",
        path.join(backendDir, "pom.xml"),
        data,
      ),
      renderAndWrite(
        "backend/Application.java.hbs",
        path.join(javaDir, "Application.java"),
        data,
      ),
      renderAndWrite(
        "backend/OpenApiConfig.java.hbs",
        path.join(javaDir, "config/OpenApiConfig.java"),
        data,
      ),
      renderAndWrite(
        "backend/GlobalExceptionHandler.java.hbs",
        path.join(javaDir, "shared/exception/GlobalExceptionHandler.java"),
        data,
      ),
      renderAndWrite(
        "backend/ApiError.java.hbs",
        path.join(javaDir, "shared/exception/ApiError.java"),
        data,
      ),
      renderAndWrite(
        "backend/PageResponse.java.hbs",
        path.join(javaDir, "shared/dto/PageResponse.java"),
        data,
      ),
      renderAndWrite(
        "backend/application.yml.hbs",
        path.join(resourcesDir, "application.yml"),
        data,
      ),
      renderAndWrite(
        "backend/application-dev.yml.hbs",
        path.join(resourcesDir, "application-dev.yml"),
        data,
      ),
      fs.writeFile(
        path.join(resourcesDir, "db/migration/V1__init.sql"),
        "-- Initial migration\n",
      ),
      renderAndWrite(
        "backend/ApplicationTests.java.hbs",
        path.join(testDir, "ApplicationTests.java"),
        data,
      ),
      renderAndWrite(
        "backend/gitignore.hbs",
        path.join(backendDir, ".gitignore"),
        data,
      ),
      renderAndWrite(
        "backend/maven-wrapper.properties.hbs",
        path.join(backendDir, ".mvn/wrapper/maven-wrapper.properties"),
        data,
      ),
      renderAndWrite("backend/mvnw.hbs", path.join(backendDir, "mvnw"), data, {
        mode: 0o755,
      }),
      renderAndWrite(
        "backend/mvnw.cmd.hbs",
        path.join(backendDir, "mvnw.cmd"),
        data,
      ),
    ]);

    if (this.config.auth) {
      await renderAndWrite(
        "backend/SecurityConfig.java.hbs",
        path.join(javaDir, "config/SecurityConfig.java"),
        data,
      );
    }
  }
}

export async function generateBackend(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  const generator = new BackendGenerator(projectDir, config, versions);
  await generator.generate();
}
