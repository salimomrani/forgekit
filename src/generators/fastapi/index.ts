import path from "node:path";
import fs from "fs-extra";
import { renderAndWrite } from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";

class FastAPIGenerator extends BaseGenerator {
  async generate(): Promise<void> {
    const backendDir = path.join(this.projectDir, "backend");
    const appDir = path.join(backendDir, "app");
    const routersDir = path.join(appDir, "routers");
    const testsDir = path.join(backendDir, "tests");

    await this.ensureDirs([appDir, routersDir, testsDir]);

    const data = { name: this.config.name };

    await Promise.all([
      renderAndWrite("fastapi/main.py.hbs", path.join(appDir, "main.py"), data),
      renderAndWrite(
        "fastapi/config.py.hbs",
        path.join(appDir, "config.py"),
        data,
      ),
      renderAndWrite(
        "fastapi/health.py.hbs",
        path.join(routersDir, "health.py"),
        data,
      ),
      renderAndWrite(
        "fastapi/requirements.txt.hbs",
        path.join(backendDir, "requirements.txt"),
        data,
      ),
      renderAndWrite(
        "fastapi/test_health.py.hbs",
        path.join(testsDir, "test_health.py"),
        data,
      ),
      renderAndWrite(
        "fastapi/pytest.ini.hbs",
        path.join(backendDir, "pytest.ini"),
        data,
      ),
      renderAndWrite(
        "fastapi/pyrightconfig.json.hbs",
        path.join(backendDir, "pyrightconfig.json"),
        data,
      ),
      renderAndWrite(
        "fastapi/gitignore.hbs",
        path.join(backendDir, ".gitignore"),
        data,
      ),
      renderAndWrite(
        "fastapi/python-version.hbs",
        path.join(backendDir, ".python-version"),
        data,
      ),
      renderAndWrite(
        "fastapi/Dockerfile.hbs",
        path.join(backendDir, "Dockerfile"),
        data,
      ),
      renderAndWrite(
        "fastapi/dockerignore.hbs",
        path.join(backendDir, ".dockerignore"),
        data,
      ),
      fs.writeFile(path.join(appDir, "__init__.py"), ""),
      fs.writeFile(path.join(routersDir, "__init__.py"), ""),
      fs.writeFile(path.join(testsDir, "__init__.py"), ""),
    ]);
  }
}

export async function generateFastAPIBackend(
  projectDir: string,
  config: ProjectConfig,
): Promise<void> {
  const generator = new FastAPIGenerator(projectDir, config);
  await generator.generate();
}
