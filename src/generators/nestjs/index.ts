import path from "node:path";
import { renderAndWrite } from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";

class NestJsGenerator extends BaseGenerator {
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
    const backendDir = path.join(this.projectDir, "backend");
    const srcDir = path.join(backendDir, "src");

    // Always create base dirs
    const dirs = [path.join(srcDir, "health")];
    if (this.config.prisma) {
      dirs.push(path.join(srcDir, "prisma"));
      dirs.push(path.join(backendDir, "prisma"));
    }
    if (this.config.auth) {
      dirs.push(path.join(srcDir, "auth"));
    }
    await this.ensureDirs(dirs);

    const data = {
      name: this.config.name,
      description: this.config.description,
      auth: this.config.auth,
      prisma: this.config.prisma,
      openapi: this.config.openapi,
      versions: this.versions,
    };

    // Base files — always generated
    await Promise.all([
      renderAndWrite(
        "nestjs/package.json.hbs",
        path.join(backendDir, "package.json"),
        data,
      ),
      renderAndWrite(
        "nestjs/tsconfig.json.hbs",
        path.join(backendDir, "tsconfig.json"),
        data,
      ),
      renderAndWrite(
        "nestjs/tsconfig.build.json.hbs",
        path.join(backendDir, "tsconfig.build.json"),
        data,
      ),
      renderAndWrite(
        "nestjs/nest-cli.json.hbs",
        path.join(backendDir, "nest-cli.json"),
        data,
      ),
      renderAndWrite(
        "nestjs/src/main.ts.hbs",
        path.join(srcDir, "main.ts"),
        data,
      ),
      renderAndWrite(
        "nestjs/src/app.module.ts.hbs",
        path.join(srcDir, "app.module.ts"),
        data,
      ),
      renderAndWrite(
        "nestjs/src/app.controller.ts.hbs",
        path.join(srcDir, "app.controller.ts"),
        data,
      ),
      renderAndWrite(
        "nestjs/src/app.service.ts.hbs",
        path.join(srcDir, "app.service.ts"),
        data,
      ),
      renderAndWrite(
        "nestjs/src/health/health.controller.ts.hbs",
        path.join(srcDir, "health/health.controller.ts"),
        data,
      ),
      renderAndWrite(
        "nestjs/src/health/health.module.ts.hbs",
        path.join(srcDir, "health/health.module.ts"),
        data,
      ),
      renderAndWrite(
        "nestjs/env.example.hbs",
        path.join(backendDir, ".env.example"),
        data,
      ),
      renderAndWrite(
        "nestjs/gitignore.hbs",
        path.join(backendDir, ".gitignore"),
        data,
      ),
      renderAndWrite(
        "nestjs/Dockerfile.hbs",
        path.join(backendDir, "Dockerfile"),
        data,
      ),
      renderAndWrite(
        "nestjs/dockerignore.hbs",
        path.join(backendDir, ".dockerignore"),
        data,
      ),
    ]);

    // Auth files — only if auth: true
    if (this.config.auth) {
      await Promise.all([
        renderAndWrite(
          "nestjs/src/auth/auth.module.ts.hbs",
          path.join(srcDir, "auth/auth.module.ts"),
          data,
        ),
        renderAndWrite(
          "nestjs/src/auth/auth.service.ts.hbs",
          path.join(srcDir, "auth/auth.service.ts"),
          data,
        ),
        renderAndWrite(
          "nestjs/src/auth/jwt.strategy.ts.hbs",
          path.join(srcDir, "auth/jwt.strategy.ts"),
          data,
        ),
        renderAndWrite(
          "nestjs/src/auth/jwt-auth.guard.ts.hbs",
          path.join(srcDir, "auth/jwt-auth.guard.ts"),
          data,
        ),
      ]);
    }

    // Prisma files — only if prisma: true
    if (this.config.prisma) {
      await Promise.all([
        renderAndWrite(
          "nestjs/src/prisma/prisma.service.ts.hbs",
          path.join(srcDir, "prisma/prisma.service.ts"),
          data,
        ),
        renderAndWrite(
          "nestjs/src/prisma/prisma.module.ts.hbs",
          path.join(srcDir, "prisma/prisma.module.ts"),
          data,
        ),
        renderAndWrite(
          "nestjs/prisma/schema.prisma.hbs",
          path.join(backendDir, "prisma/schema.prisma"),
          data,
        ),
      ]);
    }
  }
}

export async function generateNestJsBackend(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  const generator = new NestJsGenerator(projectDir, config, versions);
  await generator.generate();
}
