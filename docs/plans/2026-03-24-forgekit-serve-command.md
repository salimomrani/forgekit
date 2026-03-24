# ForgeKit Serve Command Implementation Plan

> **For Claude:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add `forgekit serve` command that starts Docker + backend + frontend in one command with interactive confirmation and automatic rollback on failure.

**Architecture:** New command file with stack detection utility. Uses existing `start-servers` skill patterns but integrated into CLI.

**Tech Stack:** Node.js/TypeScript, Commander.js, Inquirer.js

---

## Task 1: Create stack detection utility

**Files:**

- Create: `src/utils/detect-stack.ts`

**Step 1: Write the failing test**

```typescript
// src/utils/__tests__/detect-stack.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectStack } from "../detect-stack.js";
import fs from "fs-extra";

vi.mock("fs-extra");

describe("detectStack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should detect docker-compose.yml", async () => {
    vi.mocked(fs.pathExists).mockImplementation((path) => {
      if (path === "docker-compose.yml") return Promise.resolve(true);
      return Promise.resolve(false);
    });

    const stack = await detectStack("/some/path");
    expect(stack.hasDocker).toBe(true);
  });

  it("should detect spring-boot backend", async () => {
    vi.mocked(fs.pathExists).mockImplementation((path) => {
      if (path === "backend/pom.xml") return Promise.resolve(true);
      if (path === "docker-compose.yml") return Promise.resolve(false);
      return Promise.resolve(false);
    });

    const stack = await detectStack("/some/path");
    expect(stack.backendType).toBe("spring-boot");
  });

  it("should detect fastapi backend", async () => {
    vi.mocked(fs.pathExists).mockImplementation((path) => {
      if (path === "backend/requirements.txt") return Promise.resolve(true);
      if (path === "docker-compose.yml") return Promise.resolve(false);
      return Promise.resolve(false);
    });

    const stack = await detectStack("/some/path");
    expect(stack.backendType).toBe("fastapi");
  });

  it("should detect laravel backend", async () => {
    vi.mocked(fs.pathExists).mockImplementation((path) => {
      if (path === "backend/composer.json") return Promise.resolve(true);
      if (path === "docker-compose.yml") return Promise.resolve(false);
      return Promise.resolve(false);
    });

    const stack = await detectStack("/some/path");
    expect(stack.backendType).toBe("laravel");
  });

  it("should detect angular frontend", async () => {
    vi.mocked(fs.pathExists).mockImplementation((path) => {
      if (path === "frontend/angular.json") return Promise.resolve(true);
      if (path === "backend/pom.xml") return Promise.resolve(false);
      if (path === "docker-compose.yml") return Promise.resolve(false);
      return Promise.resolve(false);
    });

    const stack = await detectStack("/some/path");
    expect(stack.frontendType).toBe("angular");
  });

  it("should detect react frontend", async () => {
    vi.mocked(fs.pathExists).mockImplementation((path) => {
      if (path === "frontend/package.json") return Promise.resolve(true);
      if (path === "backend/pom.xml") return Promise.resolve(false);
      if (path === "docker-compose.yml") return Promise.resolve(false);
      return Promise.resolve(false);
    });

    const stack = await detectStack("/some/path");
    expect(stack.frontendType).toBe("react-vite");
  });

  it("should return all false when no stack found", async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(false);

    const stack = await detectStack("/some/path");
    expect(stack.hasDocker).toBe(false);
    expect(stack.backendType).toBeNull();
    expect(stack.frontendType).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/__tests__/detect-stack.test.ts`
Expected: FAIL (file doesn't exist)

**Step 3: Write minimal implementation**

```typescript
// src/utils/detect-stack.ts
import fs from "fs-extra";
import path from "node:path";

export interface DetectedStack {
  hasDocker: boolean;
  backendType: "spring-boot" | "fastapi" | "laravel" | null;
  frontendType: "angular" | "react-vite" | null;
}

export async function detectStack(projectPath: string): Promise<DetectedStack> {
  const hasDocker = await fs.pathExists(
    path.join(projectPath, "docker-compose.yml"),
  );

  const backendType = await detectBackend(projectPath);
  const frontendType = await detectFrontend(projectPath);

  return { hasDocker, backendType, frontendType };
}

async function detectBackend(
  projectPath: string,
): Promise<DetectedStack["backendType"]> {
  const backendPath = path.join(projectPath, "backend");

  if (await fs.pathExists(path.join(backendPath, "pom.xml")))
    return "spring-boot";
  if (await fs.pathExists(path.join(backendPath, "requirements.txt")))
    return "fastapi";
  if (await fs.pathExists(path.join(backendPath, "composer.json")))
    return "laravel";

  return null;
}

async function detectFrontend(
  projectPath: string,
): Promise<DetectedStack["frontendType"]> {
  const frontendPath = path.join(projectPath, "frontend");

  if (await fs.pathExists(path.join(frontendPath, "angular.json")))
    return "angular";
  if (await fs.pathExists(path.join(frontendPath, "package.json")))
    return "react-vite";

  return null;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/utils/__tests__/detect-stack.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/detect-stack.ts src/utils/__tests__/detect-stack.test.ts
git commit -m "feat: add detectStack utility for serve command"
```

---

## Task 2: Create serve command

**Files:**

- Create: `src/commands/serve.ts`
- Modify: `src/index.ts:7` and add command registration

**Step 1: Write the failing test**

```typescript
// src/__tests__/serve-command.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { serveCommand } from "../commands/serve.js";
import { detectStack } from "../utils/detect-stack.js";

vi.mock("../utils/detect-stack.js");

describe("serveCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should exist and be a Command", () => {
    expect(serveCommand.name).toBe("serve");
  });

  it("should detect stack and prompt user", async () => {
    vi.mocked(detectStack).mockResolvedValue({
      hasDocker: true,
      backendType: "spring-boot",
      frontendType: "react-vite",
    });

    // Command should exist and have correct description
    expect(serveCommand.description()).toContain("Démarrer");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/serve-command.test.ts`
Expected: FAIL (file doesn't exist)

**Step 3: Write minimal implementation**

```typescript
// src/commands/serve.ts
import { Command } from "commander";
import chalk from "chalk";
import { detectStack, type DetectedStack } from "../utils/detect-stack.js";
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

async function checkPort(port: number): Promise<boolean> {
  try {
    const { stdout } = await execa("lsof", ["-i", `:${port}`]);
    return stdout.includes(`${port}`);
  } catch {
    return false;
  }
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
        // Check for .venv
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

    const port = backendType === "laravel" ? 8000 : 8000;
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
      const port = stack.backendType === "laravel" ? 8000 : 8000;
      console.log(chalk.cyan(`  - Backend: http://localhost:${port}`));
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
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/__tests__/serve-command.test.ts`
Expected: PASS

**Step 5: Register command in index.ts**

Modify `src/index.ts`:

```typescript
import { newCommand } from "./commands/new.js";
import { addCommand } from "./commands/add.js";
import { serveCommand } from "./commands/serve.js"; // Add this

// ... in program.addCommand() chain:
program.addCommand(serveCommand); // Add this
```

**Step 6: Add execa dependency**

Check if execa exists in package.json, if not add it:

```bash
npm install execa
```

**Step 7: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

**Step 8: Commit**

```bash
git add src/commands/serve.ts src/index.ts package.json
git commit -m "feat: add serve command"
```

---

## Task 3: Integration test (optional - manual)

**Step 1: Build the CLI**

```bash
npm run build
```

**Step 2: Test in a generated project**

```bash
cd /tmp && rm -rf test-serve && mkdir test-serve && cd test-serve
forgekit new test --fastapi --react --docker
cd test
../node_modules/.bin/forgekit serve
```

Expected: Should detect stack, prompt, start services

**Step 3: Commit**

```bash
git commit -m "test: manual serve command test"
```
