import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateBackend } from "../index.js";
import { makeBaseConfig, BASE_VERSIONS } from "../../../__tests__/fixtures.js";

describe("generateBackend — database opt-out (FR-3)", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-backend-test-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe("pom.xml dependencies (FR-3.2)", () => {
    it("should include JPA, postgresql and flyway when database is postgres and flyway is true", async () => {
      const config = makeBaseConfig({
        backendType: "spring-boot",
        database: "postgres",
        flyway: true,
      });

      await generateBackend(tmpDir, config, BASE_VERSIONS);
      const pom = await fs.readFile(
        path.join(tmpDir, "backend", "pom.xml"),
        "utf-8",
      );

      expect(pom).toContain("spring-boot-starter-data-jpa");
      expect(pom).toContain("<artifactId>postgresql</artifactId>");
      expect(pom).toContain("<artifactId>flyway-core</artifactId>");
    });

    it("should exclude JPA, postgresql and flyway when database is none", async () => {
      const config = makeBaseConfig({
        backendType: "spring-boot",
        database: "none",
        flyway: false,
      });

      await generateBackend(tmpDir, config, BASE_VERSIONS);
      const pom = await fs.readFile(
        path.join(tmpDir, "backend", "pom.xml"),
        "utf-8",
      );

      expect(pom).not.toContain("spring-boot-starter-data-jpa");
      expect(pom).not.toContain("<artifactId>postgresql</artifactId>");
      expect(pom).not.toContain("<artifactId>flyway-core</artifactId>");
    });

    it("should force flyway off when database is none even if flyway flag is true (FR-3.4)", async () => {
      const config = makeBaseConfig({
        backendType: "spring-boot",
        database: "none",
        flyway: true,
      });

      await generateBackend(tmpDir, config, BASE_VERSIONS);
      const pom = await fs.readFile(
        path.join(tmpDir, "backend", "pom.xml"),
        "utf-8",
      );
      const dbMigrationDir = path.join(
        tmpDir,
        "backend",
        "src/main/resources/db/migration",
      );

      expect(pom).not.toContain("flyway-core");
      expect(await fs.pathExists(dbMigrationDir)).toBe(false);
    });
  });

  describe("application.yml configuration (FR-3.3)", () => {
    it("should include datasource and jpa keys when database is postgres", async () => {
      const config = makeBaseConfig({
        backendType: "spring-boot",
        database: "postgres",
        flyway: true,
      });

      await generateBackend(tmpDir, config, BASE_VERSIONS);
      const appYml = await fs.readFile(
        path.join(tmpDir, "backend", "src/main/resources/application.yml"),
        "utf-8",
      );

      expect(appYml).toMatch(/^\s+datasource:/m);
      expect(appYml).toMatch(/^\s+jpa:/m);
      expect(appYml).toMatch(/^\s+flyway:/m);
    });

    it("should exclude datasource, jpa and flyway keys when database is none", async () => {
      const config = makeBaseConfig({
        backendType: "spring-boot",
        database: "none",
        flyway: false,
      });

      await generateBackend(tmpDir, config, BASE_VERSIONS);
      const appYml = await fs.readFile(
        path.join(tmpDir, "backend", "src/main/resources/application.yml"),
        "utf-8",
      );
      const appDevYml = await fs.readFile(
        path.join(tmpDir, "backend", "src/main/resources/application-dev.yml"),
        "utf-8",
      );

      expect(appYml).not.toMatch(/datasource:/);
      expect(appYml).not.toMatch(/^\s+jpa:/m);
      expect(appYml).not.toMatch(/flyway:/);
      expect(appDevYml).not.toMatch(/jpa:/);
    });
  });

  describe("default behavior is unchanged (FR-3.5)", () => {
    it("should produce a pom.xml containing JPA when no database flag is overridden", async () => {
      const config = makeBaseConfig({
        backendType: "spring-boot",
        flyway: true,
      });

      await generateBackend(tmpDir, config, BASE_VERSIONS);
      const pom = await fs.readFile(
        path.join(tmpDir, "backend", "pom.xml"),
        "utf-8",
      );

      expect(pom).toContain("spring-boot-starter-data-jpa");
      expect(pom).toContain("<artifactId>postgresql</artifactId>");
    });
  });
});
