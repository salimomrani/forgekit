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
import { generateRoot } from "../generators/root/index.js";
import { initGit } from "../generators/git.js";
import { resolveVersions } from "../versions.js";
import type { ProjectConfig } from "../types.js";

export const newCommand = new Command("new")
  .description("Créer un nouveau projet full-stack")
  .argument("[name]", "Nom du projet")
  .option("--group <groupId>", "Group ID Java")
  .option("--description <desc>", "Description du projet")
  .option("--backend", "Inclure le backend Spring Boot")
  .option("--frontend", "Inclure le frontend Angular")
  .option("--auth", "Inclure l'authentification")
  .option("--docker", "Inclure Docker Compose")
  .option("--ci", "Inclure GitHub Actions CI")
  .option("--claude-code", "Inclure config Claude Code")
  .option("--no-git", "Ne pas initialiser Git")
  .action(
    async (name: string | undefined, options: Record<string, unknown>) => {
      console.log(
        chalk.bold.hex("#FF6B35")("\n🔨 ForgeKit — Scaffolding full-stack\n"),
      );

      const defaults: Partial<ProjectConfig> = {};
      if (name) defaults.name = name;
      if (options.group) defaults.groupId = options.group as string;
      if (options.description)
        defaults.description = options.description as string;
      if (typeof options.backend === "boolean")
        defaults.backend = options.backend;
      if (typeof options.frontend === "boolean")
        defaults.frontend = options.frontend;
      if (typeof options.auth === "boolean") defaults.auth = options.auth;
      if (typeof options.ci === "boolean") defaults.ci = options.ci;
      if (typeof options.docker === "boolean") defaults.docker = options.docker;
      if (typeof options.claudeCode === "boolean")
        defaults.claudeCode = options.claudeCode;
      if (typeof options.git === "boolean") defaults.gitInit = options.git;

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
          backend: config.backend,
          frontend: config.frontend,
        });

        if (config.backend) {
          process.stdout.write(chalk.yellow("  ⏳ Backend Spring Boot..."));
          await generateBackend(projectDir, config, versions);
          console.log(
            chalk.green(
              `\r  ✔ Backend Spring Boot ${versions.springBoot} généré       `,
            ),
          );
        }

        if (config.frontend) {
          process.stdout.write(chalk.yellow("  ⏳ Frontend Angular..."));
          await generateFrontend(projectDir, config, versions);
          console.log(
            chalk.green(
              `\r  ✔ Frontend Angular ${versions.angular} généré           `,
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
          await generateClaudeCode(projectDir, config, versions);
          console.log(chalk.green("\r  ✔ Claude Code configuré             "));
        }

        await generateRoot(projectDir, config, versions);

        if (config.gitInit) {
          process.stdout.write(chalk.yellow("  ⏳ Git..."));
          await initGit(projectDir);
          console.log(chalk.green("\r  ✔ Git initialisé + premier commit   "));
        }

        await saveConfig({ groupId: config.groupId });

        console.log(chalk.bold.green(`\n🚀 Projet "${config.name}" prêt !\n`));
        console.log(chalk.white("Pour démarrer :"));
        console.log(chalk.cyan(`  cd ${config.name}`));
        if (config.docker) console.log(chalk.cyan("  docker compose up -d"));
        if (config.backend)
          console.log(chalk.cyan("  cd backend && ./mvnw spring-boot:run"));
        if (config.frontend)
          console.log(chalk.cyan("  cd frontend && npm install && ng serve"));
        console.log("");
      } catch (error) {
        console.log(
          chalk.red(
            `\n✖ Erreur lors de la génération : ${error instanceof Error ? error.message : error}`,
          ),
        );

        // Rollback: remove the partially created project directory
        if (await fs.pathExists(projectDir)) {
          await fs.remove(projectDir);
          console.log(
            chalk.gray(`  Dossier "${config.name}" supprimé (rollback).`),
          );
        }

        process.exit(1);
      }
    },
  );
