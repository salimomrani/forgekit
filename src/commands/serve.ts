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

interface PackageJson {
  scripts?: Record<string, string>;
  config?: Record<string, unknown>;
}

interface ServiceConfig {
  startCmd: string[];
  port: number;
  healthPath: string;
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

function discoverBackendService(
  backendDir: string,
  type: string,
): ServiceConfig | null {
  if (type === "spring-boot") {
    return {
      startCmd: ["./mvnw", "spring-boot:run"],
      port: 8080,
      healthPath: "/actuator/health",
    };
  }

  if (type === "laravel") {
    return {
      startCmd: ["php", "artisan", "serve"],
      port: 8000,
      healthPath: "/api/health",
    };
  }

  if (type === "fastapi") {
    const hasVenv = fs.existsSync(path.join(backendDir, ".venv"));
    const uvicorn = hasVenv
      ? path.join(backendDir, ".venv/bin/uvicorn")
      : "uvicorn";
    return {
      startCmd: [uvicorn, "app.main:app", "--reload"],
      port: 8000,
      healthPath: "/health",
    };
  }

  return null;
}

function discoverFrontendService(frontendDir: string): ServiceConfig | null {
  const packageJsonPath = path.join(frontendDir, "package.json");

  if (!fs.existsSync(packageJsonPath)) return null;

  const pkg: PackageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, "utf-8"),
  );
  const scripts = pkg.scripts || {};

  let startScript: string | undefined;
  if (scripts.dev) startScript = "dev";
  else if (scripts.serve) startScript = "serve";
  else if (scripts.start) startScript = "start";

  if (!startScript) return null;

  const port =
    (pkg.config?.port as number) ||
    (scripts[startScript]?.includes("4200") ? 4200 : 5173) ||
    5173;

  return {
    startCmd: ["npm", "run", startScript],
    port,
    healthPath: "",
  };
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
): Promise<{ success: boolean; port: number }> {
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

    const service = discoverBackendService(backendDir, backendType);
    if (!service) {
      console.log(chalk.red(`  ✗ Configuration backend introuvable`));
      return { success: false, port: 8000 };
    }

    spawn(service.startCmd[0], service.startCmd.slice(1), {
      cwd: backendDir,
      detached: true,
      stdio: "ignore",
    });

    const healthy = await waitForHealth(
      `http://127.0.0.1:${service.port}${service.healthPath}`,
    );

    if (!healthy) {
      console.log(chalk.yellow(`  ⚠ Backend démarré mais /health non respond`));
    }

    return { success: true, port: service.port };
  } catch (error) {
    console.log(chalk.red(`  ✗ Backend ${backendType} échoué: ${error}`));
    return { success: false, port: 8000 };
  }
}

async function startFrontend(
  frontendType: "angular" | "react-vite",
  projectPath: string,
  skipInstall: boolean,
): Promise<{ success: boolean; port: number }> {
  const frontendDir = path.join(projectPath, "frontend");

  console.log(chalk.blue(`  → Démarrage frontend ${frontendType}...`));

  try {
    if (!skipInstall) {
      await execa("npm", ["install"], { cwd: frontendDir });
    }

    const service = discoverFrontendService(frontendDir);
    if (!service) {
      console.log(chalk.red(`  ✗ Configuration frontend introuvable`));
      return { success: false, port: 5173 };
    }

    spawn(service.startCmd[0], service.startCmd.slice(1), {
      cwd: frontendDir,
      detached: true,
      stdio: "ignore",
    });

    const healthy = await waitForHealth(`http://127.0.0.1:${service.port}`);

    if (!healthy) {
      console.log(chalk.yellow(`  ⚠ Frontend démarré mais non accessible`));
    }

    return { success: true, port: service.port };
  } catch (error) {
    console.log(chalk.red(`  ✗ Frontend ${frontendType} échoué: ${error}`));
    return { success: false, port: 5173 };
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

    let backendPort = 8000;
    let frontendPort = 5173;

    // Start backend
    if (useBackend && stack.backendType) {
      const result = await startBackend(
        stack.backendType,
        projectPath,
        opts.skipInstall ?? false,
      );
      if (!result.success) {
        console.log(
          chalk.red(`\n✖ Backend ${stack.backendType} échoué. Arrêt.`),
        );
        if (started.includes("docker")) {
          console.log(chalk.yellow("  → Arrêt Docker..."));
          await stopAll();
        }
        process.exit(1);
      }
      backendPort = result.port;
      started.push("backend");
    }

    // Start frontend
    if (useFrontend && stack.frontendType) {
      const result = await startFrontend(
        stack.frontendType,
        projectPath,
        opts.skipInstall ?? false,
      );
      if (!result.success) {
        console.log(
          chalk.red(`\n✖ Frontend ${stack.frontendType} échoué. Arrêt.`),
        );
        process.exit(1);
      }
      frontendPort = result.port;
      started.push("frontend");
    }

    console.log(chalk.bold.green("\n🚀 Services démarrés:"));
    if (useDocker) console.log(chalk.cyan("  - Docker: compose is running"));
    if (useBackend) {
      console.log(chalk.cyan(`  - Backend: http://localhost:${backendPort}`));
    }
    if (useFrontend) {
      console.log(chalk.cyan(`  - Frontend: http://localhost:${frontendPort}`));
    }
    console.log(
      chalk.gray(
        "\nPour voir les logs: docker compose logs, cd backend/..., cd frontend/...",
      ),
    );
  });
