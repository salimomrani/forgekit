import { input, confirm, checkbox, select } from "@inquirer/prompts";
import { loadConfig } from "../config.js";
import { validateGroupId } from "../utils/validation.js";
import type {
  ProjectConfig,
  UIFramework,
  PrimeNGPreset,
  DatabaseType,
} from "../types.js";

export async function promptAddLayerConfig(
  layer: string,
  existingConfig: ProjectConfig,
  defaults: Partial<ProjectConfig> = {},
  options: { nonInteractive?: boolean } = {},
): Promise<Partial<ProjectConfig>> {
  const nonInteractive = options.nonInteractive === true;
  if (layer === "spring-boot") {
    return promptSpringBoot(defaults, nonInteractive);
  }
  if (layer === "fastapi") {
    return promptAuth(defaults, nonInteractive);
  }
  if (layer === "nextjs") {
    return promptNextJs(defaults, nonInteractive);
  }
  if (layer === "laravel") {
    return promptLaravel(defaults, nonInteractive);
  }
  if (layer === "angular") {
    return promptAngular(defaults, nonInteractive);
  }
  if (layer === "react") {
    return promptAuth(defaults, nonInteractive);
  }
  if (layer === "vue") {
    return promptVue(defaults, nonInteractive);
  }
  if (layer === "prettier") {
    if (existingConfig.frontend === null) {
      throw new Error(
        "Cannot add prettier without a frontend. Add a frontend first.",
      );
    }
    return {};
  }
  if (layer === "eslint") {
    if (existingConfig.frontend === null) {
      throw new Error(
        "Cannot add eslint without a frontend. Add a frontend first.",
      );
    }
    return {};
  }
  return {};
}

async function promptSpringBoot(
  defaults: Partial<ProjectConfig>,
  nonInteractive: boolean,
): Promise<Partial<ProjectConfig>> {
  const saved = await loadConfig();

  const groupId =
    defaults.groupId ??
    (nonInteractive
      ? (saved.groupId ?? "com.example")
      : await input({
          message: "Group ID",
          default: saved.groupId ?? "com.example",
          validate: validateGroupId,
        }));

  let database: DatabaseType = defaults.database ?? "postgres";
  let flyway = defaults.flyway ?? true;
  let openapi = defaults.openapi ?? true;
  let auth = defaults.auth ?? false;
  let mapstruct = defaults.mapstruct ?? true;

  if (!nonInteractive && defaults.database === undefined) {
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
    defaults.flyway === undefined &&
    defaults.openapi === undefined &&
    defaults.auth === undefined &&
    defaults.mapstruct === undefined
  ) {
    const features = await checkbox({
      message: "Fonctionnalités backend",
      choices: [
        { name: "Flyway (migrations SQL)", value: "flyway", checked: true },
        { name: "OpenAPI / Swagger UI", value: "openapi", checked: true },
        { name: "JWT / Spring Security", value: "auth", checked: false },
        { name: "MapStruct (mappers)", value: "mapstruct", checked: true },
      ],
    });
    flyway = features.includes("flyway");
    openapi = features.includes("openapi");
    auth = features.includes("auth");
    mapstruct = features.includes("mapstruct");
  }

  return { groupId, database, flyway, openapi, auth, mapstruct };
}

async function promptAngular(
  defaults: Partial<ProjectConfig>,
  nonInteractive: boolean,
): Promise<Partial<ProjectConfig>> {
  let uiFramework: UIFramework = defaults.uiFramework ?? "primeng";
  let primeNGPreset: PrimeNGPreset = defaults.primeNGPreset ?? "Aura";
  let ngrx = defaults.ngrx ?? false;

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

  const authResult = await promptAuth(defaults, nonInteractive);
  return { uiFramework, primeNGPreset, ngrx, ...authResult };
}

async function promptLaravel(
  defaults: Partial<ProjectConfig>,
  nonInteractive: boolean,
): Promise<Partial<ProjectConfig>> {
  let auth = defaults.auth ?? false;
  let openapi = defaults.openapi ?? false;

  if (
    !nonInteractive &&
    defaults.auth === undefined &&
    defaults.openapi === undefined
  ) {
    const features = await checkbox({
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
    auth = features.includes("auth");
    openapi = features.includes("openapi");
  }

  return { auth, openapi };
}

async function promptNextJs(
  defaults: Partial<ProjectConfig>,
  nonInteractive: boolean,
): Promise<Partial<ProjectConfig>> {
  let auth = defaults.auth ?? false;
  let prisma = defaults.prisma ?? false;
  let openapi = defaults.openapi ?? false;

  if (
    !nonInteractive &&
    defaults.auth === undefined &&
    defaults.prisma === undefined &&
    defaults.openapi === undefined
  ) {
    const features = await checkbox({
      message: "Fonctionnalités Next.js",
      choices: [
        {
          name: "NextAuth.js v5 (authentification)",
          value: "auth",
          checked: false,
        },
        { name: "Prisma ORM (PostgreSQL)", value: "prisma", checked: false },
        {
          name: "OpenAPI / Swagger UI (next-swagger-doc)",
          value: "openapi",
          checked: false,
        },
      ],
    });
    auth = features.includes("auth");
    prisma = features.includes("prisma");
    openapi = features.includes("openapi");
  }

  return { auth, prisma, openapi };
}

async function promptAuth(
  defaults: Partial<ProjectConfig>,
  nonInteractive: boolean,
): Promise<Partial<ProjectConfig>> {
  let auth = defaults.auth ?? false;

  if (!nonInteractive && defaults.auth === undefined) {
    auth = await confirm({
      message: "Inclure l'authentification ?",
      default: false,
    });
  }

  return { auth };
}

async function promptVue(
  defaults: Partial<ProjectConfig>,
  nonInteractive: boolean,
): Promise<Partial<ProjectConfig>> {
  return promptAuth(defaults, nonInteractive);
}
