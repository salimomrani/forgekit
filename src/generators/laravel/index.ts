import path from "node:path";
import fs from "fs-extra";
import { renderAndWrite } from "../../utils/template-engine.js";
import { BaseGenerator } from "../base-generator.js";
import type { ProjectConfig } from "../../types.js";
import type { ResolvedVersions } from "../../versions.js";

class LaravelGenerator extends BaseGenerator {
  private readonly versions: ResolvedVersions;
  private readonly dbName: string;

  constructor(
    projectDir: string,
    config: ProjectConfig,
    versions: ResolvedVersions,
  ) {
    super(projectDir, config);
    this.versions = versions;
    this.dbName = config.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
  }

  async generate(): Promise<void> {
    const backendDir = path.join(this.projectDir, "backend");
    const appDir = path.join(backendDir, "app");
    const httpDir = path.join(appDir, "Http");
    const configDir = path.join(backendDir, "config");
    const databaseDir = path.join(backendDir, "database");
    const storageDir = path.join(backendDir, "storage");

    await this.ensureDirs([
      path.join(httpDir, "Controllers"),
      path.join(httpDir, "Middleware"),
      path.join(httpDir, "Resources"),
      path.join(appDir, "Models"),
      path.join(appDir, "Providers"),
      path.join(backendDir, "bootstrap"),
      configDir,
      path.join(databaseDir, "factories"),
      path.join(databaseDir, "migrations"),
      path.join(databaseDir, "seeders"),
      path.join(backendDir, "routes"),
      path.join(storageDir, "app"),
      path.join(storageDir, "framework/cache"),
      path.join(storageDir, "framework/sessions"),
      path.join(storageDir, "framework/views"),
      path.join(storageDir, "logs"),
      path.join(backendDir, "tests/Feature"),
    ]);

    const data = {
      name: this.config.name,
      description: this.config.description,
      auth: this.config.auth,
      openapi: this.config.openapi,
      dbName: this.dbName,
      versions: this.versions,
    };

    await Promise.all([
      renderAndWrite(
        "laravel/composer.json.hbs",
        path.join(backendDir, "composer.json"),
        data,
      ),
      renderAndWrite(
        "laravel/artisan.hbs",
        path.join(backendDir, "artisan"),
        data,
        { mode: 0o755 },
      ),
      renderAndWrite(
        "laravel/bootstrap-app.php.hbs",
        path.join(backendDir, "bootstrap/app.php"),
        data,
      ),
      renderAndWrite(
        "laravel/config-app.php.hbs",
        path.join(configDir, "app.php"),
        data,
      ),
      renderAndWrite(
        "laravel/config-database.php.hbs",
        path.join(configDir, "database.php"),
        data,
      ),
      renderAndWrite(
        "laravel/config-cors.php.hbs",
        path.join(configDir, "cors.php"),
        data,
      ),
      renderAndWrite(
        "laravel/routes-api.php.hbs",
        path.join(backendDir, "routes/api.php"),
        data,
      ),
      renderAndWrite(
        "laravel/HealthController.php.hbs",
        path.join(httpDir, "Controllers/HealthController.php"),
        data,
      ),
      renderAndWrite(
        "laravel/AppServiceProvider.php.hbs",
        path.join(appDir, "Providers/AppServiceProvider.php"),
        data,
      ),
      renderAndWrite(
        "laravel/DatabaseSeeder.php.hbs",
        path.join(databaseDir, "seeders/DatabaseSeeder.php"),
        data,
      ),
      renderAndWrite(
        "laravel/phpunit.xml.hbs",
        path.join(backendDir, "phpunit.xml"),
        data,
      ),
      renderAndWrite(
        "laravel/TestCase.php.hbs",
        path.join(backendDir, "tests/TestCase.php"),
        data,
      ),
      renderAndWrite(
        "laravel/HealthTest.php.hbs",
        path.join(backendDir, "tests/Feature/HealthTest.php"),
        data,
      ),
      renderAndWrite(
        "laravel/env.example.hbs",
        path.join(backendDir, ".env.example"),
        data,
      ),
      renderAndWrite(
        "laravel/gitignore.hbs",
        path.join(backendDir, ".gitignore"),
        data,
      ),
      renderAndWrite(
        "laravel/php-version.hbs",
        path.join(backendDir, ".php-version"),
        data,
      ),
      renderAndWrite(
        "laravel/Dockerfile.hbs",
        path.join(backendDir, "Dockerfile"),
        data,
      ),
      renderAndWrite(
        "laravel/dockerignore.hbs",
        path.join(backendDir, ".dockerignore"),
        data,
      ),
      // .gitignore files to preserve storage structure in git
      fs.writeFile(path.join(storageDir, "app/.gitignore"), "*\n!.gitignore\n"),
      fs.writeFile(
        path.join(storageDir, "framework/cache/.gitignore"),
        "*\n!.gitignore\n",
      ),
      fs.writeFile(
        path.join(storageDir, "framework/sessions/.gitignore"),
        "*\n!.gitignore\n",
      ),
      fs.writeFile(
        path.join(storageDir, "framework/views/.gitignore"),
        "*\n!.gitignore\n",
      ),
      fs.writeFile(
        path.join(storageDir, "logs/.gitignore"),
        "*\n!.gitignore\n",
      ),
    ]);

    if (this.config.auth) {
      await renderAndWrite(
        "laravel/config-sanctum.php.hbs",
        path.join(configDir, "sanctum.php"),
        data,
      );
    }

    if (this.config.openapi) {
      await renderAndWrite(
        "laravel/config-scramble.php.hbs",
        path.join(configDir, "scramble.php"),
        data,
      );
    }
  }
}

export async function generateLaravelBackend(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  const generator = new LaravelGenerator(projectDir, config, versions);
  await generator.generate();
}
