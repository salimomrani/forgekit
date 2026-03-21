import { input, confirm, checkbox, select } from "@inquirer/prompts";
import { loadConfig } from "../config.js";
import { validateGroupId } from "../utils/validation.js";
import type { ProjectConfig, UIFramework, PrimeNGPreset } from "../types.js";

export async function promptAddLayerConfig(
  layer: string,
  existingConfig: ProjectConfig,
  defaults: Partial<ProjectConfig> = {},
): Promise<Partial<ProjectConfig>> {
  if (layer === "spring-boot") {
    return promptSpringBoot(defaults);
  }
  if (layer === "fastapi") {
    return promptAuth(defaults);
  }
  if (layer === "laravel") {
    return promptLaravel(defaults);
  }
  if (layer === "angular") {
    return promptAngular(defaults);
  }
  if (layer === "react") {
    return promptAuth(defaults);
  }
  if (layer === "prettier") {
    if (existingConfig.frontend === null) {
      throw new Error(
        "Cannot add prettier without a frontend. Add a frontend first.",
      );
    }
    return {};
  }
  return {};
}

async function promptSpringBoot(
  defaults: Partial<ProjectConfig>,
): Promise<Partial<ProjectConfig>> {
  const saved = await loadConfig();

  const groupId =
    defaults.groupId ??
    (await input({
      message: "Group ID",
      default: saved.groupId ?? "com.example",
      validate: validateGroupId,
    }));

  let flyway = defaults.flyway ?? true;
  let openapi = defaults.openapi ?? true;
  let auth = defaults.auth ?? false;
  let mapstruct = defaults.mapstruct ?? true;

  if (
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

  return { groupId, flyway, openapi, auth, mapstruct };
}

async function promptAngular(
  defaults: Partial<ProjectConfig>,
): Promise<Partial<ProjectConfig>> {
  let uiFramework: UIFramework = defaults.uiFramework ?? "primeng";
  let primeNGPreset: PrimeNGPreset = defaults.primeNGPreset ?? "Aura";
  let ngrx = defaults.ngrx ?? false;

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

  const authResult = await promptAuth(defaults);
  return { uiFramework, primeNGPreset, ngrx, ...authResult };
}

async function promptLaravel(
  defaults: Partial<ProjectConfig>,
): Promise<Partial<ProjectConfig>> {
  let auth = defaults.auth ?? false;
  let openapi = defaults.openapi ?? false;

  if (defaults.auth === undefined && defaults.openapi === undefined) {
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

async function promptAuth(
  defaults: Partial<ProjectConfig>,
): Promise<Partial<ProjectConfig>> {
  let auth = defaults.auth ?? false;

  if (defaults.auth === undefined) {
    auth = await confirm({
      message: "Inclure l'authentification ?",
      default: false,
    });
  }

  return { auth };
}
