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
  WorkflowMode,
  GitStrategy,
  SpeckitPreset,
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
            { name: "Laravel (PHP 8.3)", value: "laravel" },
            { name: "NestJS (Node.js/TypeScript)", value: "nestjs" },
            { name: "Next.js (Node.js)", value: "nextjs" },
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
            { name: "Vue.js (Vite + Tailwind)", value: "vue" },
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
  let prisma = defaults.prisma ?? false;

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

  if (
    backendType === "laravel" &&
    defaults.auth === undefined &&
    defaults.openapi === undefined
  ) {
    const laravelFeatures = await checkbox({
      message: "Fonctionnalités Laravel",
      choices: [
        {
          name: "Sanctum (API authentication)",
          value: "auth",
          checked: false,
        },
        {
          name: "Scramble (OpenAPI documentation)",
          value: "openapi",
          checked: false,
        },
      ],
    });
    auth = laravelFeatures.includes("auth");
    openapi = laravelFeatures.includes("openapi");
  }

  if (
    backendType === "nestjs" &&
    defaults.auth === undefined &&
    defaults.prisma === undefined &&
    defaults.openapi === undefined
  ) {
    const nestjsFeatures = await checkbox({
      message: "Fonctionnalités NestJS",
      choices: [
        {
          name: "JWT authentication (@nestjs/jwt)",
          value: "auth",
          checked: false,
        },
        {
          name: "Prisma ORM (PostgreSQL)",
          value: "prisma",
          checked: false,
        },
        {
          name: "OpenAPI / Swagger UI (@nestjs/swagger)",
          value: "openapi",
          checked: false,
        },
      ],
    });
    auth = nestjsFeatures.includes("auth");
    prisma = nestjsFeatures.includes("prisma");
    openapi = nestjsFeatures.includes("openapi");
  }

  if (
    backendType === "nextjs" &&
    defaults.auth === undefined &&
    defaults.prisma === undefined &&
    defaults.openapi === undefined
  ) {
    const nextjsFeatures = await checkbox({
      message: "Fonctionnalités Next.js",
      choices: [
        {
          name: "NextAuth.js v5 (authentification)",
          value: "auth",
          checked: false,
        },
        {
          name: "Prisma ORM (PostgreSQL)",
          value: "prisma",
          checked: false,
        },
        {
          name: "OpenAPI / Swagger UI (next-swagger-doc)",
          value: "openapi",
          checked: false,
        },
      ],
    });
    auth = nextjsFeatures.includes("auth");
    prisma = nextjsFeatures.includes("prisma");
    openapi = nextjsFeatures.includes("openapi");
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
  } else if (frontend === "vue") {
    uiFramework = "tailwind";
  }

  // ── Section 5: Infrastructure ─────────────────────────────────────────────
  let docker = defaults.docker ?? true;
  let ci = defaults.ci ?? true;
  let claudeCode = defaults.claudeCode ?? true;
  let speckit = defaults.speckit ?? true;
  let workflowMode: WorkflowMode = defaults.workflowMode ?? "none";
  let gitInit = defaults.gitInit ?? true;
  let prettier = defaults.prettier ?? false;
  let eslint = defaults.eslint ?? false;

  if (
    defaults.docker === undefined &&
    defaults.ci === undefined &&
    defaults.claudeCode === undefined &&
    defaults.speckit === undefined &&
    defaults.gitInit === undefined &&
    defaults.prettier === undefined &&
    defaults.eslint === undefined
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
        {
          name: "ESLint (flat config 9+, typescript-eslint)",
          value: "eslint",
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
    eslint = infra.includes("eslint");
  }

  if (claudeCode && defaults.workflowMode === undefined) {
    workflowMode = await select<WorkflowMode>({
      message: "Workflow mode (Claude Code)",
      choices: [
        {
          name: "speckit — spec → plan → tasks → impl → review → PR",
          value: "speckit",
        },
        { name: "vibe   — itérations rapides, pas de spec", value: "vibe" },
        { name: "aucun", value: "none" },
      ],
      default: "speckit",
    });
  }

  let speckitPreset: SpeckitPreset | null = defaults.speckitPreset ?? null;
  if (workflowMode === "speckit" && defaults.speckitPreset === undefined) {
    speckitPreset = await select<SpeckitPreset>({
      message: "Speckit preset",
      choices: [
        {
          name: "balanced  — tests=oui, tdd=non, code-review=oui, verification=minimal",
          value: "balanced",
        },
        {
          name: "rigorous  — tests=oui, tdd=oui,  code-review=oui, verification=full",
          value: "rigorous",
        },
        {
          name: "fast      — tests=oui, tdd=non,  code-review=non, skip-clarify=oui",
          value: "fast",
        },
        {
          name: "bare-metal — tests=non, code-review=non, verification=skip",
          value: "bare-metal",
        },
      ],
      default: "balanced",
    });
  }

  let gitStrategy: GitStrategy = defaults.gitStrategy ?? "pr-required";
  if (workflowMode === "vibe" && defaults.gitStrategy === undefined) {
    gitStrategy = await select<GitStrategy>({
      message: "Stratégie git",
      choices: [
        {
          name: "PR obligatoire (plus sûr)",
          value: "pr-required",
        },
        {
          name: "Push direct sur master (plus rapide)",
          value: "no-pr",
        },
      ],
      default: "pr-required",
    });
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
    prisma,
    uiFramework,
    primeNGPreset,
    ngrx,
    docker,
    speckit,
    workflowMode,
    gitStrategy,
    speckitPreset,
    ci,
    claudeCode,
    gitInit,
    prettier,
    eslint,
  };
}
