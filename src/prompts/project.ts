import { input, confirm, checkbox } from "@inquirer/prompts";
import path from "node:path";
import { loadConfig } from "../config.js";
import { validateProjectName, validateGroupId } from "../utils/validation.js";
import type { ProjectConfig } from "../types.js";

export async function promptProjectConfig(
  defaults: Partial<ProjectConfig> = {},
): Promise<ProjectConfig> {
  const saved = await loadConfig();
  const currentDir = path.basename(process.cwd());

  const name =
    defaults.name ??
    (await input({
      message: "Nom du projet",
      default: currentDir,
      validate: validateProjectName,
    }));

  const description =
    defaults.description ??
    (await input({
      message: "Description",
      default: "Mon application",
    }));

  const stacks =
    defaults.backend !== undefined && defaults.frontend !== undefined
      ? []
      : await checkbox({
          message: "Que voulez-vous générer ?",
          choices: [
            { name: "Backend (Spring Boot)", value: "backend", checked: true },
            { name: "Frontend (Angular)", value: "frontend", checked: true },
          ],
        });

  const backend = defaults.backend ?? stacks.includes("backend");
  const frontend = defaults.frontend ?? stacks.includes("frontend");

  const groupId = backend
    ? (defaults.groupId ??
      (await input({
        message: "Group ID",
        default: saved.groupId ?? "com.example",
        validate: validateGroupId,
      })))
    : "com.example";

  const docker =
    defaults.docker ??
    (await confirm({
      message: "Configurer Docker Compose ?",
      default: true,
    }));

  const claudeCode =
    defaults.claudeCode ??
    (await confirm({
      message: "Configurer Claude Code ?",
      default: true,
    }));

  const gitInit =
    defaults.gitInit ??
    (await confirm({
      message: "Initialiser Git ?",
      default: true,
    }));

  return {
    name,
    groupId,
    description,
    backend,
    frontend,
    docker,
    claudeCode,
    gitInit,
  };
}
