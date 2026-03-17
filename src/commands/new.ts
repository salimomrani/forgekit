import { Command } from "commander";
import path from "node:path";
import fs from "fs-extra";
import chalk from "chalk";
import { promptProjectConfig } from "../prompts/project.js";
import { saveConfig } from "../config.js";
import { generateBackend } from "../generators/backend/index.js";
import { generateFrontend } from "../generators/frontend/index.js";
import { generateDocker } from "../generators/docker/index.js";
import { generateCI } from "../generators/ci/index.js";
import { generateClaudeCode } from "../generators/claude-code/index.js";
import { generateFastAPIBackend } from "../generators/fastapi/index.js";
import { generateRoot } from "../generators/root/index.js";
import { initGit } from "../generators/git.js";
import { initSpecify } from "../generators/speckit.js";
import { resolveVersions } from "../versions.js";
import type { ResolvedVersions } from "../versions.js";
import type { ProjectConfig, BackendType, FrontendType } from "../types.js";

export async function generateProject(
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
  opts?: { globalSkillsBase?: string; globalCommandsBase?: string },
): Promise<void> {
  try {
    if (config.backendType === "spring-boot") {
      process.stdout.write(chalk.yellow("  ⏳ Backend Spring Boot..."));
      await generateBackend(projectDir, config, versions);
      console.log(
        chalk.green(
          `\r  ✔ Backend Spring Boot ${versions.springBoot} généré       `,
        ),
      );
    }

    if (config.backendType === "fastapi") {
      process.stdout.write(chalk.yellow("  ⏳ Backend FastAPI..."));
      await generateFastAPIBackend(projectDir, config);
      console.log(chalk.green("\r  ✔ Backend FastAPI généré               "));
    }

    if (config.frontend === "angular") {
      process.stdout.write(chalk.yellow("  ⏳ Frontend Angular..."));
      await generateFrontend(projectDir, config, versions);
      console.log(
        chalk.green(
          `\r  ✔ Frontend Angular ${versions.angular} généré           `,
        ),
      );
    } else if (config.frontend === "react-vite") {
      process.stdout.write(chalk.yellow("  ⏳ Frontend React (Vite)..."));
      await generateFrontend(projectDir, config, versions);
      console.log(
        chalk.green(
          `\r  ✔ Frontend React ${versions.react} (Vite) généré       `,
        ),
      );
    }

    if (config.docker) {
      process.stdout.write(chalk.yellow("  ⏳ Docker Compose..."));
      await generateDocker(projectDir, config);
      console.log(chalk.green("\r  ✔ Docker Compose généré             "));
    }

    if (config.ci) {
      process.stdout.write(chalk.yellow("  ⏳ GitHub Actions CI..."));
      await generateCI(projectDir, config);
      console.log(chalk.green("\r  ✔ GitHub Actions CI configuré       "));
    }

    if (config.claudeCode) {
      process.stdout.write(chalk.yellow("  ⏳ Claude Code..."));
      const { speckitWorkflowCopied } = await generateClaudeCode(
        projectDir,
        config,
        versions,
        opts?.globalSkillsBase,
        opts?.globalCommandsBase,
      );
      console.log(chalk.green("\r  ✔ Claude Code configuré             "));
      if (!speckitWorkflowCopied) {
        console.log(
          chalk.yellow(
            "    ℹ  speckit.workflow.md absent — installez speckit puis copiez-le dans ~/.claude/commands/",
          ),
        );
      }
    }

    if (config.speckit) {
      process.stdout.write(chalk.yellow("  ⏳ Speckit..."));
      initSpecify(projectDir);
      console.log(chalk.green("\r  ✔ Speckit initialisé                "));
    }

    await generateRoot(projectDir, config, versions);

    if (config.gitInit) {
      process.stdout.write(chalk.yellow("  ⏳ Git..."));
      await initGit(projectDir);
      console.log(chalk.green("\r  ✔ Git initialisé + premier commit   "));
    }
  } catch (error) {
    if (await fs.pathExists(projectDir)) {
      await fs.remove(projectDir);
      console.log(
        chalk.gray(`  Dossier "${config.name}" supprimé (rollback).`),
      );
    }
    throw error;
  }
}

export const newCommand = new Command("new")
  .description("Créer un nouveau projet full-stack")
  .argument("[name]", "Nom du projet")
  .option("--group <groupId>", "Group ID Java")
  .option("--description <desc>", "Description du projet")
  .option("--spring-boot", "Inclure le backend Spring Boot")
  .option("--fastapi", "Inclure le backend FastAPI")
  .option("--frontend", "Inclure le frontend Angular")
  .option("--no-frontend", "Exclure le frontend Angular")
  .option("--react", "Inclure le frontend React (Vite + Tailwind)")
  .option("--angular", "Inclure le frontend Angular (standalone, OnPush)")
  .option("--auth", "Inclure l'authentification")
  .option("--flyway", "Inclure Flyway (migrations SQL)")
  .option("--no-flyway", "Exclure Flyway")
  .option("--openapi", "Inclure OpenAPI / Swagger UI")
  .option("--no-openapi", "Exclure OpenAPI")
  .option("--mapstruct", "Inclure MapStruct")
  .option("--no-mapstruct", "Exclure MapStruct")
  .option("--ngrx", "Inclure NgRx SignalStore")
  .option("--no-ngrx", "Exclure NgRx SignalStore")
  .option("--ui <framework>", "Framework UI : primeng | tailwind | none")
  .option("--preset <preset>", "Preset PrimeNG : Aura | Lara | Nora")
  .option("--docker", "Inclure Docker Compose")
  .option("--no-docker", "Exclure Docker Compose")
  .option("--ci", "Inclure GitHub Actions CI")
  .option("--no-ci", "Exclure GitHub Actions CI")
  .option("--claude-code", "Inclure config Claude Code")
  .option("--no-claude-code", "Exclure config Claude Code")
  .option("--no-git", "Ne pas initialiser Git")
  .action(
    async (name: string | undefined, options: Record<string, unknown>, cmd) => {
      console.log(
        chalk.bold.hex("#FF6B35")("\n🔨 ForgeKit — Scaffolding full-stack\n"),
      );

      const defaults: Partial<ProjectConfig> = {};
      if (name) defaults.name = name;
      if (options.group) defaults.groupId = options.group as string;
      if (options.description)
        defaults.description = options.description as string;
      if (options.springBoot)
        defaults.backendType = "spring-boot" as BackendType;
      if (options.fastapi) defaults.backendType = "fastapi" as BackendType;
      if (options.react) defaults.frontend = "react-vite" as FrontendType;
      else if (options.angular || options.frontend === true)
        defaults.frontend = "angular" as FrontendType;
      else if (options.frontend === false) defaults.frontend = null;
      if (typeof options.auth === "boolean") defaults.auth = options.auth;
      if (typeof options.flyway === "boolean") defaults.flyway = options.flyway;
      if (typeof options.openapi === "boolean")
        defaults.openapi = options.openapi;
      if (typeof options.mapstruct === "boolean")
        defaults.mapstruct = options.mapstruct;
      if (typeof options.ngrx === "boolean") defaults.ngrx = options.ngrx;
      if (options.ui)
        defaults.uiFramework = options.ui as ProjectConfig["uiFramework"];
      if (options.preset)
        defaults.primeNGPreset =
          options.preset as ProjectConfig["primeNGPreset"];
      const isExplicit = (key: string) =>
        cmd.getOptionValueSource(key) === "cli";
      if (isExplicit("ci")) defaults.ci = options.ci as boolean;
      if (isExplicit("docker")) defaults.docker = options.docker as boolean;
      if (isExplicit("claudeCode"))
        defaults.claudeCode = options.claudeCode as boolean;
      if (isExplicit("git")) defaults.gitInit = options.git as boolean;

      let config;
      try {
        config = await promptProjectConfig(defaults);
      } catch {
        console.log(chalk.yellow("\n\n👋 Génération annulée."));
        process.exit(0);
      }

      const projectDir = path.resolve(process.cwd(), config.name);

      if (await fs.pathExists(projectDir)) {
        console.log(chalk.red(`\nLe dossier "${config.name}" existe déjà.`));
        process.exit(1);
      }

      try {
        await fs.ensureDir(projectDir);
        console.log(chalk.gray(`\nCréation du projet ${config.name}...\n`));

        const versions = await resolveVersions({
          backendType: config.backendType,
          frontend: config.frontend,
        });

        await generateProject(projectDir, config, versions);

        await saveConfig({ groupId: config.groupId });

        console.log(chalk.bold.green(`\n🚀 Projet "${config.name}" prêt !\n`));
        console.log(chalk.white("Pour démarrer :"));
        console.log(chalk.cyan(`  cd ${config.name}`));
        if (config.docker) console.log(chalk.cyan("  docker compose up -d"));
        if (config.backendType === "spring-boot")
          console.log(chalk.cyan("  cd backend && ./mvnw spring-boot:run"));
        if (config.backendType === "fastapi")
          console.log(
            chalk.cyan("  cd backend && uvicorn app.main:app --reload"),
          );
        if (config.frontend === "angular")
          console.log(chalk.cyan("  cd frontend && npm install && ng serve"));
        if (config.frontend === "react-vite")
          console.log(
            chalk.cyan("  cd frontend && npm install && npm run dev"),
          );
        console.log("");
      } catch (error) {
        console.log(
          chalk.red(
            `\n✖ Erreur lors de la génération : ${error instanceof Error ? error.message : error}`,
          ),
        );
        process.exit(1);
      }
    },
  );
