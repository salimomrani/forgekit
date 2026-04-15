import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateNestJsBackend } from "../index.js";
import { makeBaseConfig, BASE_VERSIONS } from "../../../__tests__/fixtures.js";

const baseConfig = makeBaseConfig({
  name: "test-app",
  description: "Test application",
  backendType: "nestjs",
});
const baseVersions = BASE_VERSIONS;

describe("NestJsGenerator", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-nestjs-test-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("creates the correct directory structure", async () => {
    await generateNestJsBackend(tmpDir, baseConfig, baseVersions);

    const backendDir = path.join(tmpDir, "backend");
    const expectedDirs = ["src", "src/health"];
    for (const dir of expectedDirs) {
      expect(
        await fs.pathExists(path.join(backendDir, dir)),
        `Directory ${dir} should exist`,
      ).toBe(true);
    }
  });

  it("generates all required base files", async () => {
    await generateNestJsBackend(tmpDir, baseConfig, baseVersions);

    const backendDir = path.join(tmpDir, "backend");
    const expectedFiles = [
      "package.json",
      "tsconfig.json",
      "tsconfig.build.json",
      "nest-cli.json",
      "src/main.ts",
      "src/app.module.ts",
      "src/app.controller.ts",
      "src/app.service.ts",
      "src/health/health.controller.ts",
      "src/health/health.module.ts",
      ".env.example",
      ".gitignore",
      "Dockerfile",
      ".dockerignore",
    ];

    for (const file of expectedFiles) {
      expect(
        await fs.pathExists(path.join(backendDir, file)),
        `File ${file} should exist`,
      ).toBe(true);
    }
  });

  it("includes @nestjs/core version in package.json", async () => {
    await generateNestJsBackend(tmpDir, baseConfig, baseVersions);
    const packageJson = await fs.readFile(
      path.join(tmpDir, "backend/package.json"),
      "utf-8",
    );
    expect(packageJson).toContain(`"@nestjs/core": "^${baseVersions.nestjs}"`);
    expect(packageJson).toContain(
      `"@nestjs/common": "^${baseVersions.nestjs}"`,
    );
  });

  it("does not generate auth files when auth is false", async () => {
    await generateNestJsBackend(tmpDir, baseConfig, baseVersions);
    expect(await fs.pathExists(path.join(tmpDir, "backend/src/auth"))).toBe(
      false,
    );
    const packageJson = await fs.readFile(
      path.join(tmpDir, "backend/package.json"),
      "utf-8",
    );
    expect(packageJson).not.toContain("@nestjs/jwt");
  });

  it("generates auth files when auth is true", async () => {
    const authConfig = makeBaseConfig({ backendType: "nestjs", auth: true });
    await generateNestJsBackend(tmpDir, authConfig, baseVersions);

    const backendDir = path.join(tmpDir, "backend");
    const authFiles = [
      "src/auth/auth.module.ts",
      "src/auth/auth.service.ts",
      "src/auth/jwt.strategy.ts",
      "src/auth/jwt-auth.guard.ts",
    ];
    for (const file of authFiles) {
      expect(
        await fs.pathExists(path.join(backendDir, file)),
        `File ${file} should exist`,
      ).toBe(true);
    }

    const packageJson = await fs.readFile(
      path.join(backendDir, "package.json"),
      "utf-8",
    );
    expect(packageJson).toContain("@nestjs/jwt");
  });

  it("does not generate prisma files when prisma is false", async () => {
    await generateNestJsBackend(tmpDir, baseConfig, baseVersions);
    expect(await fs.pathExists(path.join(tmpDir, "backend/src/prisma"))).toBe(
      false,
    );
    expect(
      await fs.pathExists(path.join(tmpDir, "backend/prisma/schema.prisma")),
    ).toBe(false);
    const packageJson = await fs.readFile(
      path.join(tmpDir, "backend/package.json"),
      "utf-8",
    );
    expect(packageJson).not.toContain("@prisma/client");
  });

  it("generates prisma files when prisma is true", async () => {
    const prismaConfig = makeBaseConfig({
      backendType: "nestjs",
      prisma: true,
    });
    await generateNestJsBackend(tmpDir, prismaConfig, baseVersions);

    const backendDir = path.join(tmpDir, "backend");
    const prismaFiles = [
      "prisma/schema.prisma",
      "src/prisma/prisma.service.ts",
      "src/prisma/prisma.module.ts",
    ];
    for (const file of prismaFiles) {
      expect(
        await fs.pathExists(path.join(backendDir, file)),
        `File ${file} should exist`,
      ).toBe(true);
    }

    const packageJson = await fs.readFile(
      path.join(backendDir, "package.json"),
      "utf-8",
    );
    expect(packageJson).toContain("@prisma/client");
  });

  it("includes swagger setup in main.ts when openapi is true", async () => {
    const openapiConfig = makeBaseConfig({
      backendType: "nestjs",
      openapi: true,
    });
    await generateNestJsBackend(tmpDir, openapiConfig, baseVersions);

    const mainTs = await fs.readFile(
      path.join(tmpDir, "backend/src/main.ts"),
      "utf-8",
    );
    expect(mainTs).toContain("SwaggerModule");
    expect(mainTs).toContain("DocumentBuilder");

    const packageJson = await fs.readFile(
      path.join(tmpDir, "backend/package.json"),
      "utf-8",
    );
    expect(packageJson).toContain("@nestjs/swagger");
  });

  it("does not include swagger setup in main.ts when openapi is false", async () => {
    await generateNestJsBackend(tmpDir, baseConfig, baseVersions);

    const mainTs = await fs.readFile(
      path.join(tmpDir, "backend/src/main.ts"),
      "utf-8",
    );
    expect(mainTs).not.toContain("SwaggerModule");
  });

  it("generates all features when auth, prisma, and openapi are all true", async () => {
    const allFeaturesConfig = makeBaseConfig({
      backendType: "nestjs",
      auth: true,
      prisma: true,
      openapi: true,
    });
    await expect(
      generateNestJsBackend(tmpDir, allFeaturesConfig, baseVersions),
    ).resolves.not.toThrow();

    const backendDir = path.join(tmpDir, "backend");

    expect(
      await fs.pathExists(path.join(backendDir, "src/auth/auth.module.ts")),
      "src/auth/auth.module.ts should exist",
    ).toBe(true);

    expect(
      await fs.pathExists(
        path.join(backendDir, "src/prisma/prisma.service.ts"),
      ),
      "src/prisma/prisma.service.ts should exist",
    ).toBe(true);

    expect(
      await fs.pathExists(path.join(backendDir, "prisma/schema.prisma")),
      "prisma/schema.prisma should exist",
    ).toBe(true);

    const mainTs = await fs.readFile(
      path.join(backendDir, "src/main.ts"),
      "utf-8",
    );
    expect(mainTs).toContain("SwaggerModule");

    const packageJson = await fs.readFile(
      path.join(backendDir, "package.json"),
      "utf-8",
    );
    expect(packageJson).toContain("@nestjs/jwt");
    expect(packageJson).toContain("@prisma/client");
    expect(packageJson).toContain("@nestjs/swagger");
  });
});
