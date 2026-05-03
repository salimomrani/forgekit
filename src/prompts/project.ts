import { input, confirm, checkbox, select } from "@inquirer/prompts";
import path from "node:path";
import { loadConfig } from "../config.js";
import { validateProjectName, validateGroupId } from "../utils/validation.js";
import {
  isClaudeInstalled,
  isCodexInstalled,
  isSpecifyInstalled,
} from "../utils/system.js";
import { isNpxAvailable } from "../generators/openspec.js";
import type {
  ProjectConfig,
  UIFramework,
  PrimeNGPreset,
  BackendType,
  FrontendType,
  WorkflowMode,
  GitStrategy,
  SpeckitPreset,
  AITool,
  DatabaseType,
} from "../types.js";

export async function promptProjectConfig(
  defaults: Partial<ProjectConfig> = {},
  options: { nonInteractive?: boolean } = {},
): Promise<ProjectConfig> {
  const saved = await loadConfig();
  const currentDir = path.basename(process.cwd());
  const nonInteractive = options.nonInteractive === true;
  const ask = <T>(promptFn: () => Promise<T>, fallback: T): Promise<T> =>
    nonInteractive ? Promise.resolve(fallback) : promptFn();

  // ── Section 1: Projet ─────────────────────────────────────────────────────
  const name =
    defaults.name ??
    (await ask(
      () =>
        input({
          message: "Nom du projet",
          default: currentDir,
          validate: validateProjectName,
        }),
      currentDir,
    ));

  const description =
    defaults.description ??
    (await ask(
      () =>
        input({
          message: "Description",
          default: "Mon application",
        }),
      "Mon application",
    ));

  // ── Section 2: Stack ──────────────────────────────────────────────────────
  const backendType: BackendType =
    defaults.backendType !== undefined
      ? defaults.backendType
      : await ask<BackendType>(
          () =>
            select<BackendType>({
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
            }),
          "spring-boot",
        );

  const frontend: FrontendType =
    defaults.frontend !== undefined
      ? defaults.frontend
      : await ask<FrontendType>(
          () =>
            select<FrontendType>({
              message: "Frontend",
              choices: [
                { name: "Angular (standalone, OnPush)", value: "angular" },
                { name: "React (Vite + Tailwind)", value: "react-vite" },
                { name: "Vue.js (Vite + Tailwind)", value: "vue" },
                { name: "Aucun", value: null },
              ],
              default: "angular",
            }),
          "angular",
        );

  const groupId =
    backendType === "spring-boot"
      ? (defaults.groupId ??
        (await ask(
          () =>
            input({
              message: "Group ID",
              default: saved.groupId ?? "com.example",
              validate: validateGroupId,
            }),
          saved.groupId ?? "com.example",
        )))
      : "com.example";

  // ── Section 3: Backend features ───────────────────────────────────────────
  let database: DatabaseType = defaults.database ?? "postgres";
  let flyway = defaults.flyway ?? true;
  let openapi = defaults.openapi ?? true;
  let auth = defaults.auth ?? false;
  let mapstruct = defaults.mapstruct ?? true;
  let prisma = defaults.prisma ?? false;

  if (
    !nonInteractive &&
    backendType === "spring-boot" &&
    defaults.database === undefined
  ) {
    database = await select<DatabaseType>({
      message: "Base de données",
      choices: [
        { name: "PostgreSQL (par défaut)", value: "postgres" },
        { name: "Aucune (pas de JPA, pas de driver)", value: "none" },
      ],
      default: "postgres",
    });
  }

  if (
    !nonInteractive &&
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
    !nonInteractive &&
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
    !nonInteractive &&
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
    !nonInteractive &&
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
    if (!nonInteractive && defaults.uiFramework === undefined) {
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

    if (
      !nonInteractive &&
      uiFramework === "primeng" &&
      defaults.primeNGPreset === undefined
    ) {
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

    if (!nonInteractive && defaults.ngrx === undefined) {
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
  let aiTool: AITool = defaults.aiTool ?? "claude";
  let workflowMode: WorkflowMode = defaults.workflowMode ?? "none";
  let gitInit = defaults.gitInit ?? true;
  let prettier = defaults.prettier ?? false;
  let eslint = defaults.eslint ?? false;

  if (
    !nonInteractive &&
    defaults.docker === undefined &&
    defaults.ci === undefined &&
    defaults.gitInit === undefined &&
    defaults.prettier === undefined &&
    defaults.eslint === undefined
  ) {
    const hasBackend = backendType !== null;
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
    gitInit = infra.includes("gitInit");
    prettier = infra.includes("prettier");
    eslint = infra.includes("eslint");
  }

  if (!nonInteractive && defaults.aiTool === undefined) {
    const claudeDetected = isClaudeInstalled();
    const codexDetected = isCodexInstalled();
    aiTool = await select<AITool>({
      message: "Assistant IA",
      choices: [
        {
          name: claudeDetected
            ? "Claude Code"
            : "Claude Code (claude CLI non détecté)",
          value: "claude",
        },
        {
          name: codexDetected
            ? "Codex CLI"
            : "Codex CLI (codex CLI non détecté)",
          value: "codex",
        },
        { name: "Aucun", value: "none" },
      ],
      default: claudeDetected ? "claude" : codexDetected ? "codex" : "none",
    });
  }

  if (!nonInteractive && defaults.workflowMode === undefined) {
    const specifyDetected = isSpecifyInstalled();
    const npxDetected = isNpxAvailable();
    const choices: { name: string; value: WorkflowMode }[] = [];
    if (aiTool !== "none") {
      choices.push({
        name: specifyDetected
          ? "speckit  — spec → plan → tasks → impl → review → PR"
          : "speckit  — spec → plan → tasks → impl → review → PR (specify CLI non détecté)",
        value: "speckit",
      });
      choices.push({
        name: npxDetected
          ? "openspec — proposal → specs → design → tasks → apply → archive"
          : "openspec — proposal → specs → design → tasks → apply → archive (npx non détecté)",
        value: "openspec",
      });
    }
    choices.push({
      name: "vibe     — itérations rapides, pas de spec",
      value: "vibe",
    });
    choices.push({ name: "aucun", value: "none" });
    workflowMode = await select<WorkflowMode>({
      message:
        aiTool === "none"
          ? "Workflow mode"
          : `Workflow mode (${aiTool === "claude" ? "Claude Code" : "Codex CLI"})`,
      choices,
      default: aiTool !== "none" ? "speckit" : "none",
    });
  }

  let speckitPreset: SpeckitPreset | null = defaults.speckitPreset ?? null;
  if (
    !nonInteractive &&
    aiTool === "claude" &&
    workflowMode === "speckit" &&
    defaults.speckitPreset === undefined
  ) {
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
    database,
    flyway,
    openapi,
    auth,
    mapstruct,
    prisma,
    uiFramework,
    primeNGPreset,
    ngrx,
    docker,
    workflowMode,
    gitStrategy,
    speckitPreset,
    ci,
    aiTool,
    gitInit,
    prettier,
    eslint,
  };
}
