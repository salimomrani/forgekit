import path from "node:path";
import fs from "fs-extra";
import { renderAndWrite } from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";

class NextJsGenerator extends BaseGenerator {
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

    // ── Directories ──────────────────────────────────────────────────────────
    const dirs = ["app/api/health"];
    if (this.config.auth) {
      dirs.push("app/api/auth/[...nextauth]", "lib");
    }
    if (this.config.prisma) {
      dirs.push("lib", "prisma");
    }
    if (this.config.openapi) {
      dirs.push("app/api/openapi.json", "app/api/docs");
    }
    await this.ensureDirs(dirs.map((d) => path.join(backendDir, d)));

    // ── package.json (programmatic — avoids JSON trailing-comma issues) ──────
    await fs.outputJson(
      path.join(backendDir, "package.json"),
      this.buildPackageJson(),
      { spaces: 2 },
    );

    // ── Static templates ─────────────────────────────────────────────────────
    const templateData = {
      name: this.config.name,
      auth: this.config.auth,
      prisma: this.config.prisma,
      openapi: this.config.openapi,
    };

    await Promise.all([
      renderAndWrite(
        "nextjs/next.config.ts.hbs",
        path.join(backendDir, "next.config.ts"),
        templateData,
      ),
      renderAndWrite(
        "nextjs/tsconfig.json.hbs",
        path.join(backendDir, "tsconfig.json"),
        templateData,
      ),
      renderAndWrite(
        "nextjs/.env.example.hbs",
        path.join(backendDir, ".env.example"),
        templateData,
      ),
      renderAndWrite(
        "nextjs/Dockerfile.hbs",
        path.join(backendDir, "Dockerfile"),
        templateData,
      ),
      renderAndWrite(
        "nextjs/app/api/health/route.ts.hbs",
        path.join(backendDir, "app/api/health/route.ts"),
        templateData,
      ),
    ]);

    // ── Prisma ───────────────────────────────────────────────────────────────
    if (this.config.prisma) {
      await Promise.all([
        renderAndWrite(
          "nextjs/lib/prisma.ts.hbs",
          path.join(backendDir, "lib/prisma.ts"),
          templateData,
        ),
        renderAndWrite(
          "nextjs/prisma/schema.prisma.hbs",
          path.join(backendDir, "prisma/schema.prisma"),
          templateData,
        ),
      ]);
    }

    // ── Auth ─────────────────────────────────────────────────────────────────
    if (this.config.auth) {
      await Promise.all([
        renderAndWrite(
          "nextjs/auth.ts.hbs",
          path.join(backendDir, "auth.ts"),
          templateData,
        ),
        renderAndWrite(
          "nextjs/lib/auth.ts.hbs",
          path.join(backendDir, "lib/auth.ts"),
          templateData,
        ),
        renderAndWrite(
          "nextjs/app/api/auth/[...nextauth]/route.ts.hbs",
          path.join(backendDir, "app/api/auth/[...nextauth]/route.ts"),
          templateData,
        ),
      ]);
    }

    // ── OpenAPI ──────────────────────────────────────────────────────────────
    if (this.config.openapi) {
      await Promise.all([
        renderAndWrite(
          "nextjs/app/api/openapi.json/route.ts.hbs",
          path.join(backendDir, "app/api/openapi.json/route.ts"),
          templateData,
        ),
        renderAndWrite(
          "nextjs/app/api/docs/route.tsx.hbs",
          path.join(backendDir, "app/api/docs/route.tsx"),
          templateData,
        ),
      ]);
    }
  }

  private buildPackageJson(): Record<string, unknown> {
    const deps: Record<string, string> = {
      next: `^${this.versions.next}`,
      react: `^${this.versions.react}`,
      "react-dom": `^${this.versions.react}`,
    };

    if (this.config.auth) {
      deps["next-auth"] = `^${this.versions.nextAuth}`;
    }

    if (this.config.prisma) {
      deps["@prisma/client"] = `^${this.versions.prismaClient}`;
    }

    if (this.config.openapi) {
      deps["next-swagger-doc"] = "^0.4.0";
      deps["swagger-ui-react"] = "^5.21.0";
    }

    const devDeps: Record<string, string> = {
      "@types/node": "^22.0.0",
      "@types/react": `^${this.versions.react}`,
      "@types/react-dom": `^${this.versions.react}`,
      typescript: "~5.7.0",
    };

    if (this.config.prisma) {
      devDeps["prisma"] = `^${this.versions.prismaClient}`;
    }

    if (this.config.openapi) {
      devDeps["@types/swagger-ui-react"] = "^4.18.0";
    }

    const scripts: Record<string, string> = {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "next lint",
    };

    if (this.config.prisma) {
      scripts["postinstall"] = "prisma generate";
      scripts["db:migrate"] = "prisma migrate dev";
      scripts["db:studio"] = "prisma studio";
    }

    return {
      name: this.config.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      version: "0.1.0",
      private: true,
      scripts,
      dependencies: deps,
      devDependencies: devDeps,
      engines: { node: ">=20.0.0" },
    };
  }
}

export async function generateNextJsBackend(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  const generator = new NextJsGenerator(projectDir, config, versions);
  await generator.generate();
}
