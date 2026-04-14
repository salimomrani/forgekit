import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { generateFastAPIBackend } from "../index.js";
import { generateRoot } from "../../root/index.js";
import { makeBaseConfig, BASE_VERSIONS } from "../../../__tests__/fixtures.js";

describe("FastAPIGenerator", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-fastapi-test-"));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  const fastapiConfig = makeBaseConfig({ backendType: "fastapi" });

  it("generates pyrightconfig.json in backend/", async () => {
    await generateFastAPIBackend(tmpDir, fastapiConfig);
    const file = path.join(tmpDir, "backend", "pyrightconfig.json");
    expect(await fs.pathExists(file)).toBe(true);
    const content = await fs.readFile(file, "utf-8");
    expect(content).toContain('"pythonVersion"');
    expect(content).toContain('"venvPath"');
    expect(content).toContain('".venv"');
  });

  it("generates pytest.ini in backend/", async () => {
    await generateFastAPIBackend(tmpDir, fastapiConfig);
    const file = path.join(tmpDir, "backend", "pytest.ini");
    expect(await fs.pathExists(file)).toBe(true);
    const content = await fs.readFile(file, "utf-8");
    expect(content).toContain("asyncio_mode = auto");
    expect(content).toContain("asyncio_default_fixture_loop_scope = function");
  });

  it("includes pytest-asyncio in requirements.txt", async () => {
    await generateFastAPIBackend(tmpDir, fastapiConfig);
    const content = await fs.readFile(
      path.join(tmpDir, "backend", "requirements.txt"),
      "utf-8",
    );
    expect(content).toContain("pytest-asyncio");
  });

  it("generates root pyrightconfig.json for FastAPI projects", async () => {
    await generateRoot(tmpDir, fastapiConfig, BASE_VERSIONS);
    const file = path.join(tmpDir, "pyrightconfig.json");
    expect(await fs.pathExists(file)).toBe(true);
    const content = await fs.readFile(file, "utf-8");
    expect(content).toContain('"venvPath"');
    expect(content).toContain('"backend"');
  });

  it("does NOT generate root pyrightconfig.json for non-FastAPI projects", async () => {
    const springConfig = makeBaseConfig({ backendType: "spring-boot" });
    await generateRoot(tmpDir, springConfig, BASE_VERSIONS);
    expect(await fs.pathExists(path.join(tmpDir, "pyrightconfig.json"))).toBe(
      false,
    );
  });
});
