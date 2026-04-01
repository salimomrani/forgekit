import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { readManifest, writeManifest } from "../utils/forgekit-json.js";
import { makeBaseConfig as fullConfig } from "./fixtures.js";

describe("forgekit-json", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-json-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("writeManifest creates valid JSON with version and timestamp", async () => {
    const config = fullConfig({ backendType: "spring-boot" });
    await writeManifest(tmpDir, config);

    const raw = await fs.readJson(path.join(tmpDir, "forgekit.json"));
    expect(raw.forgekit.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(raw.forgekit.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(raw.config.backendType).toBe("spring-boot");
  });

  it("readManifest returns parsed manifest", async () => {
    const config = fullConfig({ frontend: "angular" });
    await writeManifest(tmpDir, config);

    const manifest = await readManifest(tmpDir);
    expect(manifest).not.toBeNull();
    expect(manifest!.config.frontend).toBe("angular");
  });

  it("readManifest returns null for missing file", async () => {
    const manifest = await readManifest(tmpDir);
    expect(manifest).toBeNull();
  });

  it("readManifest returns null for corrupt JSON", async () => {
    await fs.writeFile(path.join(tmpDir, "forgekit.json"), "not json{{{");
    const manifest = await readManifest(tmpDir);
    expect(manifest).toBeNull();
  });
});
