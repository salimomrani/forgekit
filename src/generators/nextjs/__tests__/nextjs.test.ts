import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateNextJsBackend } from "../index.js";
import { makeBaseConfig, BASE_VERSIONS } from "../../../__tests__/fixtures.js";

describe("NextJsGenerator", () => {
  let tmpDir: string;
  let backendDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-nextjs-test-"));
    backendDir = path.join(tmpDir, "backend");
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  // ── US1: Base generator ────────────────────────────────────────────────────

  it("creates all 6 base files", async () => {
    const config = makeBaseConfig({ backendType: "nextjs" });
    await generateNextJsBackend(tmpDir, config, BASE_VERSIONS);

    const expectedFiles = [
      "package.json",
      "next.config.ts",
      "tsconfig.json",
      ".env.example",
      "Dockerfile",
      "app/api/health/route.ts",
    ];

    for (const file of expectedFiles) {
      expect(
        await fs.pathExists(path.join(backendDir, file)),
        `Expected ${file} to exist`,
      ).toBe(true);
    }
  });

  it("health route returns ok status", async () => {
    const config = makeBaseConfig({ backendType: "nextjs" });
    await generateNextJsBackend(tmpDir, config, BASE_VERSIONS);

    const content = await fs.readFile(
      path.join(backendDir, "app/api/health/route.ts"),
      "utf-8",
    );
    expect(content).toContain('status: "ok"');
  });

  it("package.json contains next dependency", async () => {
    const config = makeBaseConfig({ backendType: "nextjs" });
    await generateNextJsBackend(tmpDir, config, BASE_VERSIONS);

    const pkg = await fs.readJson(path.join(backendDir, "package.json"));
    expect(pkg.dependencies).toHaveProperty("next");
    expect(pkg.scripts).toHaveProperty("dev");
    expect(pkg.scripts).toHaveProperty("build");
  });

  it("next.config.ts has standalone output", async () => {
    const config = makeBaseConfig({ backendType: "nextjs" });
    await generateNextJsBackend(tmpDir, config, BASE_VERSIONS);

    const content = await fs.readFile(
      path.join(backendDir, "next.config.ts"),
      "utf-8",
    );
    expect(content).toContain("standalone");
  });

  it("does not generate Prisma files when prisma is false", async () => {
    const config = makeBaseConfig({ backendType: "nextjs", prisma: false });
    await generateNextJsBackend(tmpDir, config, BASE_VERSIONS);

    expect(
      await fs.pathExists(path.join(backendDir, "prisma/schema.prisma")),
    ).toBe(false);
    expect(await fs.pathExists(path.join(backendDir, "lib/prisma.ts"))).toBe(
      false,
    );
  });

  it("does not generate auth files when auth is false", async () => {
    const config = makeBaseConfig({ backendType: "nextjs", auth: false });
    await generateNextJsBackend(tmpDir, config, BASE_VERSIONS);

    expect(await fs.pathExists(path.join(backendDir, "auth.ts"))).toBe(false);
    expect(
      await fs.pathExists(
        path.join(backendDir, "app/api/auth/[...nextauth]/route.ts"),
      ),
    ).toBe(false);
  });

  // ── US2: Prisma ────────────────────────────────────────────────────────────

  it("generates Prisma files when prisma is true", async () => {
    const config = makeBaseConfig({ backendType: "nextjs", prisma: true });
    await generateNextJsBackend(tmpDir, config, BASE_VERSIONS);

    expect(
      await fs.pathExists(path.join(backendDir, "prisma/schema.prisma")),
    ).toBe(true);
    expect(await fs.pathExists(path.join(backendDir, "lib/prisma.ts"))).toBe(
      true,
    );
  });

  it("schema.prisma has postgresql provider", async () => {
    const config = makeBaseConfig({ backendType: "nextjs", prisma: true });
    await generateNextJsBackend(tmpDir, config, BASE_VERSIONS);

    const content = await fs.readFile(
      path.join(backendDir, "prisma/schema.prisma"),
      "utf-8",
    );
    expect(content).toContain('provider = "postgresql"');
    expect(content).toContain("DATABASE_URL");
  });

  it("lib/prisma.ts has singleton pattern", async () => {
    const config = makeBaseConfig({ backendType: "nextjs", prisma: true });
    await generateNextJsBackend(tmpDir, config, BASE_VERSIONS);

    const content = await fs.readFile(
      path.join(backendDir, "lib/prisma.ts"),
      "utf-8",
    );
    expect(content).toContain("globalForPrisma");
    expect(content).toContain("PrismaClient");
  });

  it(".env.example contains DATABASE_URL when prisma is true", async () => {
    const config = makeBaseConfig({ backendType: "nextjs", prisma: true });
    await generateNextJsBackend(tmpDir, config, BASE_VERSIONS);

    const content = await fs.readFile(
      path.join(backendDir, ".env.example"),
      "utf-8",
    );
    expect(content).toContain("DATABASE_URL");
  });

  it("package.json has postinstall prisma generate when prisma is true", async () => {
    const config = makeBaseConfig({ backendType: "nextjs", prisma: true });
    await generateNextJsBackend(tmpDir, config, BASE_VERSIONS);

    const pkg = await fs.readJson(path.join(backendDir, "package.json"));
    expect(pkg.scripts.postinstall).toBe("prisma generate");
    expect(pkg.devDependencies).toHaveProperty("prisma");
    expect(pkg.dependencies).toHaveProperty("@prisma/client");
  });

  // ── US3: Auth ──────────────────────────────────────────────────────────────

  it("generates auth files when auth is true", async () => {
    const config = makeBaseConfig({ backendType: "nextjs", auth: true });
    await generateNextJsBackend(tmpDir, config, BASE_VERSIONS);

    expect(await fs.pathExists(path.join(backendDir, "auth.ts"))).toBe(true);
    expect(await fs.pathExists(path.join(backendDir, "lib/auth.ts"))).toBe(
      true,
    );
    expect(
      await fs.pathExists(
        path.join(backendDir, "app/api/auth/[...nextauth]/route.ts"),
      ),
    ).toBe(true);
  });

  it("auth.ts exports handlers", async () => {
    const config = makeBaseConfig({ backendType: "nextjs", auth: true });
    await generateNextJsBackend(tmpDir, config, BASE_VERSIONS);

    const content = await fs.readFile(
      path.join(backendDir, "auth.ts"),
      "utf-8",
    );
    expect(content).toContain("handlers");
    expect(content).toContain("NextAuth");
  });

  it(".env.example contains AUTH_SECRET when auth is true", async () => {
    const config = makeBaseConfig({ backendType: "nextjs", auth: true });
    await generateNextJsBackend(tmpDir, config, BASE_VERSIONS);

    const content = await fs.readFile(
      path.join(backendDir, ".env.example"),
      "utf-8",
    );
    expect(content).toContain("AUTH_SECRET");
  });

  it("package.json has next-auth dependency when auth is true", async () => {
    const config = makeBaseConfig({ backendType: "nextjs", auth: true });
    await generateNextJsBackend(tmpDir, config, BASE_VERSIONS);

    const pkg = await fs.readJson(path.join(backendDir, "package.json"));
    expect(pkg.dependencies).toHaveProperty("next-auth");
  });

  // ── US4: OpenAPI ───────────────────────────────────────────────────────────

  it("generates OpenAPI files when openapi is true", async () => {
    const config = makeBaseConfig({ backendType: "nextjs", openapi: true });
    await generateNextJsBackend(tmpDir, config, BASE_VERSIONS);

    expect(
      await fs.pathExists(
        path.join(backendDir, "app/api/openapi.json/route.ts"),
      ),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(backendDir, "app/api/docs/route.tsx")),
    ).toBe(true);
  });

  it("does not generate OpenAPI files when openapi is false", async () => {
    const config = makeBaseConfig({ backendType: "nextjs", openapi: false });
    await generateNextJsBackend(tmpDir, config, BASE_VERSIONS);

    expect(
      await fs.pathExists(
        path.join(backendDir, "app/api/openapi.json/route.ts"),
      ),
    ).toBe(false);
  });
});
