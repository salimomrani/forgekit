import { Command } from "commander";
import path from "node:path";
import fs from "fs-extra";
import chalk from "chalk";
import { promptProjectConfig } from "../prompts/project.js";
import { saveConfig } from "../config.js";
import { generateBackend } from "../generators/backend/index.js";
import { generateFrontend } from "../generators/frontend/index.js";
import { generateDocker } from "../generators/docker/index.js";
import { generateClaudeCode } from "../generators/claude-code/index.js";
import { initGit } from "../generators/git.js";
import type { ProjectConfig } from "../types.js";

export const newCommand = new Command("new")
  .description("Créer un nouveau projet full-stack")
  .argument("[name]", "Nom du projet")
  .option("--group <groupId>", "Group ID Java")
  .option("--description <desc>", "Description du projet")
  .option("--backend", "Inclure le backend Spring Boot")
  .option("--frontend", "Inclure le frontend Angular")
  .option("--docker", "Inclure Docker Compose")
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
      if (options.backend) defaults.backend = true;
      if (options.frontend) defaults.frontend = true;
      if (options.docker) defaults.docker = true;
      if (options.claudeCode) defaults.claudeCode = true;
      if (typeof options.git === "boolean") defaults.gitInit = options.git;

      const config = await promptProjectConfig(defaults);
      const projectDir = path.resolve(process.cwd(), config.name);

      if (await fs.pathExists(projectDir)) {
        console.log(chalk.red(`\nLe dossier "${config.name}" existe déjà.`));
        process.exit(1);
      }

      await fs.ensureDir(projectDir);
      console.log(chalk.gray(`\nCréation du projet ${config.name}...\n`));

      if (config.backend) {
        process.stdout.write(chalk.yellow("  ⏳ Backend Spring Boot..."));
        await generateBackend(projectDir, config);
        console.log(chalk.green("\r  ✔ Backend Spring Boot généré       "));
      }

      if (config.frontend) {
        process.stdout.write(chalk.yellow("  ⏳ Frontend Angular..."));
        await generateFrontend(projectDir, config);
        console.log(chalk.green("\r  ✔ Frontend Angular généré           "));
      }

      if (config.docker) {
        process.stdout.write(chalk.yellow("  ⏳ Docker Compose..."));
        await generateDocker(projectDir, config);
        console.log(chalk.green("\r  ✔ Docker Compose généré             "));
      }

      if (config.claudeCode) {
        process.stdout.write(chalk.yellow("  ⏳ Claude Code..."));
        await generateClaudeCode(projectDir, config);
        console.log(chalk.green("\r  ✔ Claude Code configuré             "));
      }

      // Génère le README
      await generateReadme(projectDir, config);

      // Génère le .gitignore racine
      await generateRootGitignore(projectDir);

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
    },
  );

async function generateReadme(
  projectDir: string,
  config: ProjectConfig,
): Promise<void> {
  const sections = [`# ${config.name}\n\n${config.description}\n`];

  sections.push("## Stack\n");
  if (config.backend)
    sections.push("- **Backend:** Spring Boot 4.0.1 / Java 21");
  if (config.frontend)
    sections.push("- **Frontend:** Angular 21 / PrimeNG v21");
  if (config.docker)
    sections.push("- **Infra:** Docker Compose (PostgreSQL 17 + pgAdmin)");
  sections.push("");

  sections.push("## Démarrage rapide\n");
  sections.push("```bash");
  if (config.docker)
    sections.push("# Démarrer l'infrastructure\ndocker compose up -d\n");
  if (config.backend)
    sections.push(
      "# Démarrer le backend\ncd backend && ./mvnw spring-boot:run\n",
    );
  if (config.frontend)
    sections.push(
      "# Démarrer le frontend\ncd frontend && npm install && ng serve",
    );
  sections.push("```\n");

  sections.push(
    "---\n*Généré avec [ForgeKit](https://github.com/salimomrani/forgekit)*",
  );

  await fs.writeFile(path.join(projectDir, "README.md"), sections.join("\n"));
}

async function generateRootGitignore(projectDir: string): Promise<void> {
  const content = `# IDE
.idea/
.vscode/
*.iml

# OS
.DS_Store
Thumbs.db

# Env
.env
.env.local
`;
  await fs.writeFile(path.join(projectDir, ".gitignore"), content);
}
