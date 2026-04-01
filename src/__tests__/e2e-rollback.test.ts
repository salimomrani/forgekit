import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateProject } from "../commands/new.js";
import { FALLBACK_VERSIONS } from "../versions.js";
import { makeBaseConfig } from "./fixtures.js";

vi.mock("../generators/root/index.js", () => ({
  generateRoot: vi.fn().mockRejectedValue(new Error("simulated failure")),
}));

describe("generateProject() rollback (FR-7)", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-rollback-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("generateProject() rolls back project directory on failure", async () => {
    const config = makeBaseConfig({
      name: "rollback-test",
      description: "Rollback test",
    });

    const projectDir = path.join(tmpDir, "rollback-test");
    await fs.ensureDir(projectDir);

    await expect(
      generateProject(projectDir, config, FALLBACK_VERSIONS),
    ).rejects.toThrow("simulated failure");

    expect(await fs.pathExists(projectDir)).toBe(false);
  }, 15_000);
});
