import { Command } from "commander";
import chalk from "chalk";
import { detectStack } from "../utils/detect-stack.js";
import { select } from "@inquirer/prompts";
import { execa } from "execa";
import { spawn } from "node:child_process";
import fs from "fs-extra";
import path from "node:path";

interface ServeOptions {
  docker?: boolean;
  backend?: boolean;
  frontend?: boolean;
  skipInstall?: boolean;
}

async function waitForHealth(url: string, timeout = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const { stdout } = await execa("curl", [
        "-s",
        "-o",
        "/dev/null",
        "-w",
        "%{http_code}",
        url,
      ]);
      if (stdout.startsWith("2")) return true;
    } catch {
      // continue
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function startDocker(projectPath: string): Promise<boolean> {
  console.log(chalk.blue("  → Démarrage Docker Compose..."));
  try {
    await execa("docker", ["compose", "up", "-d"], { cwd: projectPath });
    await execa("docker", ["compose", "ps"], { cwd: projectPath });
    return true;
  } catch (error) {
    console.log(chalk.red(`  ✗ Docker échoué: ${error}`));
    return false;
  }
}

async function startBackend(
  backendType: "spring-boot" | "fastapi" | "laravel",
  projectPath: string,
  skipInstall: boolean,
): Promise<boolean> {
  const backendDir = path.join(projectPath, "backend");

  console.log(chalk.blue(`  → Démarrage backend ${backendType}...`));

  try {
    if (!skipInstall) {
      if (backendType === "laravel") {
        await execa("composer", ["install"], { cwd: backendDir });
      } else if (backendType === "fastapi") {
        const hasVenv = await fs.pathExists(path.join(backendDir, ".venv"));
        const pip = hasVenv ? path.join(backendDir, ".venv/bin/pip") : "pip";
        await execa(pip, ["install", "-r", "requirements.txt"], {
          cwd: backendDir,
        });
      }
    }

    if (backendType === "spring-boot") {
      await execa("./mvnw", ["spring-boot:run"], {
        cwd: backendDir,
        detached: true,
        stdio: "ignore",
      });
    } else if (backendType === "fastapi") {
      const python = (await fs.pathExists(path.join(backendDir, ".venv")))
        ? path.join(backendDir, ".venv/bin/uvicorn")
        : "uvicorn";
      spawn(python, ["app.main:app", "--reload"], {
        cwd: backendDir,
        detached: true,
        stdio: "ignore",
      });
    } else if (backendType === "laravel") {
      spawn("php", ["artisan", "serve"], {
        cwd: backendDir,
        detached: true,
        stdio: "ignore",
      });
    }

    const port = 8000;
    return await waitForHealth(`http://127.0.0.1:${port}/health`);
  } catch (error) {
    console.log(chalk.red(`  ✗ Backend ${backendType} échoué: ${error}`));
    return false;
  }
}

async function startFrontend(
  frontendType: "angular" | "react-vite",
  projectPath: string,
  skipInstall: boolean,
): Promise<boolean> {
  const frontendDir = path.join(projectPath, "frontend");

  console.log(chalk.blue(`  → Démarrage frontend ${frontendType}...`));

  try {
    if (!skipInstall) {
      await execa("npm", ["install"], { cwd: frontendDir });
    }

    const cmd = frontendType === "angular" ? "ng" : "npm";
    const args = frontendType === "angular" ? ["serve"] : ["run", "dev"];
    spawn(cmd, args, { cwd: frontendDir, detached: true, stdio: "ignore" });

    const port = frontendType === "angular" ? 4200 : 5173;
    return await waitForHealth(`http://127.0.0.1:${port}`);
  } catch (error) {
    console.log(chalk.red(`  ✗ Frontend ${frontendType} échoué: ${error}`));
    return false;
  }
}

async function stopAll(): Promise<void> {
  try {
    await execa("docker", ["compose", "down"]);
  } catch {
    // ignore
  }
}

export const serveCommand = new Command("serve")
  .description("Démarrer Docker + backend + frontend en une commande")
  .option("--no-docker", "Ne pas démarrer Docker")
  .option("--no-backend", "Ne pas démarrer le backend")
  .option("--no-frontend", "Ne pas démarrer le frontend")
  .option("--skip-install", "Skip npm install / composer install")
  .action(async (opts: ServeOptions) => {
    console.log(chalk.bold.hex("#FF6B35")("\n🔨 ForgeKit — Serve\n"));

    const projectPath = process.cwd();
    const stack = await detectStack(projectPath);

    if (!stack.hasDocker && !stack.backendType && !stack.frontendType) {
      console.log(
        chalk.red(
          "Aucun projet détecté (docker-compose.yml, backend/, frontend/)",
        ),
      );
      process.exit(1);
    }

    const useDocker = opts.docker !== false && stack.hasDocker;
    const useBackend = opts.backend !== false && stack.backendType !== null;
    const useFrontend = opts.frontend !== false && stack.frontendType !== null;

    console.log(chalk.gray("Stack détectée:"));
    if (useDocker) console.log(chalk.green("  ✓ Docker"));
    if (useBackend)
      console.log(chalk.green(`  ✓ Backend: ${stack.backendType}`));
    if (useFrontend)
      console.log(chalk.green(`  ✓ Frontend: ${stack.frontendType}`));
    if (!useDocker && !useBackend && !useFrontend) {
      console.log(chalk.yellow("  (rien à démarrer)"));
    }

    const answer = await select({
      message: "Confirmer le démarrage ?",
      choices: [
        { name: "Oui, démarrer", value: "start" },
        { name: "Non, annuler", value: "cancel" },
      ],
      default: "start",
    });

    if (answer === "cancel") {
      console.log(chalk.yellow("\n👋 Annulé."));
      process.exit(0);
    }

    const started: string[] = [];

    // Start Docker first
    if (useDocker) {
      const success = await startDocker(projectPath);
      if (!success) {
        console.log(chalk.red("\n✖ Docker échoué. Arrêt."));
        process.exit(1);
      }
      started.push("docker");
    }

    // Start backend
    if (useBackend && stack.backendType) {
      const success = await startBackend(
        stack.backendType,
        projectPath,
        opts.skipInstall ?? false,
      );
      if (!success) {
        console.log(
          chalk.red(`\n✖ Backend ${stack.backendType} échoué. Arrêt.`),
        );
        if (started.includes("docker")) {
          console.log(chalk.yellow("  → Arrêt Docker..."));
          await stopAll();
        }
        process.exit(1);
      }
      started.push("backend");
    }

    // Start frontend
    if (useFrontend && stack.frontendType) {
      const success = await startFrontend(
        stack.frontendType,
        projectPath,
        opts.skipInstall ?? false,
      );
      if (!success) {
        console.log(
          chalk.red(`\n✖ Frontend ${stack.frontendType} échoué. Arrêt.`),
        );
        process.exit(1);
      }
      started.push("frontend");
    }

    console.log(chalk.bold.green("\n🚀 Services démarrés:"));
    if (useDocker) console.log(chalk.cyan("  - Docker: compose is running"));
    if (useBackend) {
      console.log(chalk.cyan(`  - Backend: http://localhost:8000`));
    }
    if (useFrontend) {
      const port = stack.frontendType === "angular" ? 4200 : 5173;
      console.log(chalk.cyan(`  - Frontend: http://localhost:${port}`));
    }
    console.log(
      chalk.gray(
        "\nPour voir les logs: docker compose logs, cd backend/..., cd frontend/...",
      ),
    );
  });
