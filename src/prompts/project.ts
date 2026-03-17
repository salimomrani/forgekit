import { input, confirm, checkbox, select } from "@inquirer/prompts";
import path from "node:path";
import { loadConfig } from "../config.js";
import { validateProjectName, validateGroupId } from "../utils/validation.js";
import { isClaudeInstalled, isSpecifyInstalled } from "../utils/system.js";
import type {
  ProjectConfig,
  UIFramework,
  PrimeNGPreset,
  BackendType,
  FrontendType,
} from "../types.js";

export async function promptProjectConfig(
  defaults: Partial<ProjectConfig> = {},
): Promise<ProjectConfig> {
  const saved = await loadConfig();
  const currentDir = path.basename(process.cwd());

  // ── Section 1: Projet ─────────────────────────────────────────────────────
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

  // ── Section 2: Stack ──────────────────────────────────────────────────────
  const backendType: BackendType =
    defaults.backendType !== undefined
      ? defaults.backendType
      : await select<BackendType>({
          message: "Backend",
          choices: [
            { name: "Spring Boot (Java 21)", value: "spring-boot" },
            { name: "FastAPI (Python)", value: "fastapi" },
            { name: "Aucun", value: null },
          ],
          default: "spring-boot",
        });

  const frontend: FrontendType =
    defaults.frontend !== undefined
      ? defaults.frontend
      : await select<FrontendType>({
          message: "Frontend",
          choices: [
            { name: "Angular (standalone, OnPush)", value: "angular" },
            { name: "React (Vite + Tailwind)", value: "react-vite" },
            { name: "Aucun", value: null },
          ],
          default: "angular",
        });

  const groupId =
    backendType === "spring-boot"
      ? (defaults.groupId ??
        (await input({
          message: "Group ID",
          default: saved.groupId ?? "com.example",
          validate: validateGroupId,
        })))
      : "com.example";

  // ── Section 3: Backend features ───────────────────────────────────────────
  let flyway = defaults.flyway ?? true;
  let openapi = defaults.openapi ?? true;
  let auth = defaults.auth ?? false;
  let mapstruct = defaults.mapstruct ?? true;

  if (
    backendType === "spring-boot" &&
    defaults.flyway === undefined &&
    defaults.openapi === undefined &&
    defaults.auth === undefined &&
    defaults.mapstruct === undefined
  ) {
    const backendFeatures = await checkbox({
      message: "Fonctionnalités backend",
      choices: [
        { name: "Flyway (migrations SQL)", value: "flyway", checked: true },
        { name: "OpenAPI / Swagger UI", value: "openapi", checked: true },
        { name: "JWT / Spring Security", value: "auth", checked: false },
        { name: "MapStruct (mappers)", value: "mapstruct", checked: true },
      ],
    });
    flyway = backendFeatures.includes("flyway");
    openapi = backendFeatures.includes("openapi");
    auth = backendFeatures.includes("auth");
    mapstruct = backendFeatures.includes("mapstruct");
  }

  // ── Section 4: Frontend features ──────────────────────────────────────────
  let uiFramework: UIFramework = defaults.uiFramework ?? "primeng";
  let primeNGPreset: PrimeNGPreset = defaults.primeNGPreset ?? "Aura";
  let ngrx = defaults.ngrx ?? false;

  if (frontend === "angular") {
    if (defaults.uiFramework === undefined) {
      uiFramework = await select({
        message: "Framework UI",
        choices: [
          { name: "PrimeNG (recommandé)", value: "primeng" },
          { name: "Tailwind CSS v4", value: "tailwind" },
          { name: "Aucun (minimal)", value: "none" },
        ],
        default: "primeng",
      });
    }

    if (uiFramework === "primeng" && defaults.primeNGPreset === undefined) {
      primeNGPreset = await select({
        message: "Preset PrimeNG",
        choices: [
          { name: "Aura (recommandé)", value: "Aura" },
          { name: "Lara", value: "Lara" },
          { name: "Nora", value: "Nora" },
        ],
        default: "Aura",
      });
    }

    if (defaults.ngrx === undefined) {
      ngrx = await confirm({
        message: "Inclure NgRx SignalStore ?",
        default: false,
      });
    }
  } else if (frontend === "react-vite") {
    uiFramework = "tailwind";
  }

  // ── Section 5: Infrastructure ─────────────────────────────────────────────
  let docker = defaults.docker ?? true;
  let ci = defaults.ci ?? true;
  let claudeCode = defaults.claudeCode ?? true;
  let speckit = defaults.speckit ?? true;
  let gitInit = defaults.gitInit ?? true;
  let prettier = defaults.prettier ?? false;

  if (
    defaults.docker === undefined &&
    defaults.ci === undefined &&
    defaults.claudeCode === undefined &&
    defaults.speckit === undefined &&
    defaults.gitInit === undefined &&
    defaults.prettier === undefined
  ) {
    const hasBackend = backendType !== null;
    const claudeDetected = isClaudeInstalled();
    const specifyDetected = isSpecifyInstalled();
    const infra = await checkbox({
      message: "Infrastructure",
      choices: [
        {
          name: "Docker Compose (PostgreSQL + pgAdmin)",
          value: "docker",
          checked: hasBackend,
        },
        {
          name: "GitHub Actions CI",
          value: "ci",
          checked: hasBackend || frontend !== null,
        },
        {
          name: claudeDetected
            ? "Claude Code"
            : "Claude Code (claude CLI non détecté)",
          value: "claudeCode",
          checked: claudeDetected,
        },
        {
          name: specifyDetected
            ? "Speckit (specify templates)"
            : "Speckit (specify CLI non détecté)",
          value: "speckit",
          checked: specifyDetected,
        },
        { name: "Initialiser Git", value: "gitInit", checked: true },
        {
          name: "Prettier (pre-commit formatting)",
          value: "prettier",
          checked: false,
          disabled: frontend === null ? "Nécessite un frontend" : false,
        },
      ],
    });
    docker = infra.includes("docker");
    ci = infra.includes("ci");
    claudeCode = infra.includes("claudeCode");
    speckit = infra.includes("speckit");
    gitInit = infra.includes("gitInit");
    prettier = infra.includes("prettier");
  }

  return {
    name,
    groupId,
    description,
    backendType,
    frontend,
    flyway,
    openapi,
    auth,
    mapstruct,
    uiFramework,
    primeNGPreset,
    ngrx,
    docker,
    speckit,
    ci,
    claudeCode,
    gitInit,
    prettier,
  };
}
