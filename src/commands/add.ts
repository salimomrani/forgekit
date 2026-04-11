import { Command } from "commander";
import path from "node:path";
import os from "node:os";
import fs from "fs-extra";
import chalk from "chalk";
import { confirm } from "@inquirer/prompts";
import { detectProject } from "../utils/detect-project.js";
import { writeManifest } from "../utils/forgekit-json.js";
import { promptAddLayerConfig } from "../prompts/add.js";
import { resolveVersions } from "../versions.js";
import { generateBackend } from "../generators/backend/index.js";
import { generateFrontend } from "../generators/frontend/index.js";
import { generateFastAPIBackend } from "../generators/fastapi/index.js";
import { generateLaravelBackend } from "../generators/laravel/index.js";
import { generateNextJsBackend } from "../generators/nextjs/index.js";
import { generateDocker } from "../generators/docker/index.js";
import { generateCI } from "../generators/ci/index.js";
import { generateClaudeCode } from "../generators/claude-code/index.js";
import { initSpecify } from "../generators/speckit.js";
import type { ProjectConfig } from "../types.js";
import type { ResolvedVersions } from "../versions.js";

interface LayerDef {
  configField: keyof ProjectConfig;
  configValue: string | boolean;
  conflictGroup: "backend" | "frontend" | null;
}

const LAYER_CONFIG_MAP: Record<string, LayerDef> = {
  "spring-boot": {
    configField: "backendType",
    configValue: "spring-boot",
    conflictGroup: "backend",
  },
  fastapi: {
    configField: "backendType",
    configValue: "fastapi",
    conflictGroup: "backend",
  },
  laravel: {
    configField: "backendType",
    configValue: "laravel",
    conflictGroup: "backend",
  },
  nextjs: {
    configField: "backendType",
    configValue: "nextjs",
    conflictGroup: "backend",
  },
  angular: {
    configField: "frontend",
    configValue: "angular",
    conflictGroup: "frontend",
  },
  react: {
    configField: "frontend",
    configValue: "react-vite",
    conflictGroup: "frontend",
  },
  vue: {
    configField: "frontend",
    configValue: "vue",
    conflictGroup: "frontend",
  },
  docker: { configField: "docker", configValue: true, conflictGroup: null },
  ci: { configField: "ci", configValue: true, conflictGroup: null },
  "claude-code": {
    configField: "claudeCode",
    configValue: true,
    conflictGroup: null,
  },
  speckit: { configField: "speckit", configValue: true, conflictGroup: null },
  prettier: {
    configField: "prettier",
    configValue: true,
    conflictGroup: null,
  },
  eslint: {
    configField: "eslint",
    configValue: true,
    conflictGroup: null,
  },
};

const VALID_LAYERS = Object.keys(LAYER_CONFIG_MAP);

function checkConflict(layer: string, config: ProjectConfig): string | null {
  const def = LAYER_CONFIG_MAP[layer];
  if (def.conflictGroup === "backend" && config.backendType !== null) {
    return `A backend (${config.backendType}) already exists. Remove it before adding a new one.`;
  }
  if (def.conflictGroup === "frontend" && config.frontend !== null) {
    return `A frontend (${config.frontend}) already exists. Remove it before adding a new one.`;
  }
  if (
    def.conflictGroup === null &&
    config[def.configField as keyof ProjectConfig] === true
  ) {
    return `${layer} is already configured.`;
  }
  return null;
}

async function runLayerGenerator(
  layer: string,
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  switch (layer) {
    case "spring-boot":
      await generateBackend(projectDir, config, versions);
      break;
    case "fastapi":
      await generateFastAPIBackend(projectDir, config);
      break;
    case "laravel":
      await generateLaravelBackend(projectDir, config, versions);
      break;
    case "nextjs":
      await generateNextJsBackend(projectDir, config, versions);
      break;
    case "angular":
    case "react":
    case "vue":
      await generateFrontend(projectDir, config, versions);
      break;
    case "docker":
      await generateDocker(projectDir, config);
      break;
    case "ci":
      await generateCI(projectDir, config);
      break;
    case "claude-code":
      await generateClaudeCode(projectDir, config, versions);
      break;
    case "speckit":
      initSpecify(projectDir);
      break;
    case "prettier":
    case "eslint":
      // Config files handled by the frontend generator via config flags
      await generateFrontend(projectDir, config, versions);
      break;
  }
}

async function regenerateDependentLayers(
  layer: string,
  projectDir: string,
  config: ProjectConfig,
  versions: ResolvedVersions,
): Promise<void> {
  const isBackendLayer =
    layer === "spring-boot" ||
    layer === "fastapi" ||
    layer === "laravel" ||
    layer === "nextjs";
  const isFrontendLayer =
    layer === "angular" || layer === "react" || layer === "vue";

  if (!isBackendLayer && !isFrontendLayer) return;

  if (config.docker && isBackendLayer) {
    process.stdout.write(chalk.yellow("  ⏳ Mise à jour Docker Compose..."));
    await generateDocker(projectDir, config);
    console.log(chalk.green("\r  ✔ Docker Compose mis à jour            "));
  }

  if (config.ci) {
    process.stdout.write(chalk.yellow("  ⏳ Mise à jour GitHub Actions CI..."));
    await generateCI(projectDir, config);
    console.log(chalk.green("\r  ✔ GitHub Actions CI mis à jour         "));
  }

  if (config.claudeCode) {
    process.stdout.write(chalk.yellow("  ⏳ Mise à jour Claude Code..."));
    await generateClaudeCode(projectDir, config, versions);
    console.log(chalk.green("\r  ✔ Claude Code mis à jour               "));
  }
}

export const addCommand = new Command("add")
  .description(
    "Ajouter un layer à un projet existant (claude-code fonctionne sur n'importe quel projet)",
  )
  .argument("<layer>", `Layer à ajouter : ${VALID_LAYERS.join(", ")}`)
  .option("--group <groupId>", "Group ID Java")
  .option("--auth", "Inclure l'authentification")
  .option("--flyway", "Inclure Flyway (migrations SQL)")
  .option("--no-flyway", "Exclure Flyway")
  .option("--openapi", "Inclure OpenAPI / Swagger UI")
  .option("--no-openapi", "Exclure OpenAPI")
  .option("--mapstruct", "Inclure MapStruct")
  .option("--no-mapstruct", "Exclure MapStruct")
  .option("--ngrx", "Inclure NgRx SignalStore")
  .option("--no-ngrx", "Exclure NgRx SignalStore")
  .option("--ui <framework>", "Framework UI : primeng | tailwind | none")
  .option("--preset <preset>", "Preset PrimeNG : Aura | Lara | Nora")
  .addHelpText(
    "after",
    `
Layers:
  spring-boot   Backend Java 21 + Spring Boot 3 (Maven)
                  Options : --group, --flyway/--no-flyway, --openapi/--no-openapi,
                            --auth, --mapstruct/--no-mapstruct

  fastapi       Backend Python + FastAPI + SQLAlchemy
                  Options : --auth

  laravel       Backend PHP 8.3 + Laravel 12
                  Options : --auth, --openapi/--no-openapi

  angular       Frontend Angular (standalone, OnPush)
                  Options : --ui (primeng|tailwind|none), --preset (Aura|Lara|Nora),
                            --ngrx/--no-ngrx, --auth

  react         Frontend React (Vite + Tailwind CSS)
                  Options : --auth

  docker        Docker Compose (PostgreSQL + pgAdmin)
  ci            GitHub Actions CI (lint + test + build)
  claude-code   Config Claude Code (.claude/, CLAUDE.md, skills, hooks)
                  ★ Fonctionne sur n'importe quel projet (pas besoin de forgekit.json)
  speckit       Templates Speckit (specify CLI)
  prettier      Prettier + Husky + lint-staged (nécessite un frontend)

Exemples:
  $ forgekit add spring-boot
  $ forgekit add spring-boot --no-flyway --openapi --group com.acme
  $ forgekit add angular --ui tailwind --ngrx
  $ forgekit add laravel --auth --openapi
  $ forgekit add claude-code`,
  )
  .action(async (layer: string, options: Record<string, unknown>) => {
    console.log(chalk.bold.hex("#FF6B35")("\n🔨 ForgeKit — Add layer\n"));

    // Validate layer
    if (!VALID_LAYERS.includes(layer)) {
      console.log(
        chalk.red(
          `Invalid layer "${layer}". Valid layers: ${VALID_LAYERS.join(", ")}`,
        ),
      );
      process.exit(1);
    }

    const projectDir = process.cwd();

    // Detect project
    let existingConfig: ProjectConfig;
    let detectionSource: "manifest" | "filesystem";
    try {
      const result = await detectProject(projectDir);
      existingConfig = result.config;
      detectionSource = result.source;
    } catch (error) {
      if (layer !== "claude-code") {
        console.log(
          chalk.red(
            error instanceof Error
              ? error.message
              : "Project detection failed.",
          ),
        );
        process.exit(1);
      }
      // claude-code can be added to any project
      existingConfig = {
        name: path.basename(projectDir),
        groupId: "com.example",
        description: "",
        backendType: null,
        frontend: null,
        flyway: false,
        openapi: false,
        auth: false,
        mapstruct: false,
        prisma: false,
        prettier: false,
        eslint: false,
        uiFramework: "none",
        primeNGPreset: "Aura",
        ngrx: false,
        docker: false,
        ci: false,
        claudeCode: false,
        speckit: false,
        gitInit: false,
      };
      detectionSource = "manifest";
    }

    // Filesystem fallback confirmation
    if (detectionSource === "filesystem") {
      console.log(chalk.yellow("No forgekit.json found. Detected config:\n"));
      if (existingConfig.backendType)
        console.log(chalk.gray(`  Backend: ${existingConfig.backendType}`));
      if (existingConfig.frontend)
        console.log(chalk.gray(`  Frontend: ${existingConfig.frontend}`));
      if (existingConfig.docker) console.log(chalk.gray("  Docker: yes"));
      if (existingConfig.ci) console.log(chalk.gray("  CI: yes"));
      if (existingConfig.claudeCode)
        console.log(chalk.gray("  Claude Code: yes"));
      if (existingConfig.speckit) console.log(chalk.gray("  Speckit: yes"));
      if (existingConfig.prettier) console.log(chalk.gray("  Prettier: yes"));
      console.log("");

      const proceed = await confirm({
        message: "Is this correct? Proceed with adding the layer?",
        default: true,
      });
      if (!proceed) {
        console.log(chalk.yellow("\n👋 Cancelled."));
        process.exit(0);
      }
    }

    // Conflict check
    const conflict = checkConflict(layer, existingConfig);
    if (conflict) {
      console.log(chalk.red(conflict));
      process.exit(1);
    }

    // Build defaults from CLI flags
    const defaults: Partial<ProjectConfig> = {};
    if (options.group) defaults.groupId = options.group as string;
    if (typeof options.auth === "boolean") defaults.auth = options.auth;
    if (typeof options.flyway === "boolean") defaults.flyway = options.flyway;
    if (typeof options.openapi === "boolean")
      defaults.openapi = options.openapi;
    if (typeof options.mapstruct === "boolean")
      defaults.mapstruct = options.mapstruct;
    if (typeof options.ngrx === "boolean") defaults.ngrx = options.ngrx;
    if (options.ui)
      defaults.uiFramework = options.ui as ProjectConfig["uiFramework"];
    if (options.preset)
      defaults.primeNGPreset = options.preset as ProjectConfig["primeNGPreset"];

    // Prompt for layer-specific options
    let layerConfig: Partial<ProjectConfig>;
    try {
      layerConfig = await promptAddLayerConfig(layer, existingConfig, defaults);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("prettier") || error.message.includes("eslint"))
      ) {
        console.log(chalk.red(error.message));
        process.exit(1);
      }
      console.log(chalk.yellow("\n\n👋 Cancelled."));
      process.exit(0);
    }

    // Merge config
    const layerDef = LAYER_CONFIG_MAP[layer];
    const updatedConfig: ProjectConfig = {
      ...existingConfig,
      ...layerConfig,
      [layerDef.configField]: layerDef.configValue,
    };

    // Resolve versions
    const versions = await resolveVersions({
      backendType: updatedConfig.backendType,
      frontend: updatedConfig.frontend,
    });

    // Generate in temp dir, copy to project
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgekit-add-"));
    try {
      const layerLabel = layer.charAt(0).toUpperCase() + layer.slice(1);
      process.stdout.write(chalk.yellow(`  ⏳ ${layerLabel}...`));
      await runLayerGenerator(layer, tmpDir, updatedConfig, versions);
      console.log(chalk.green(`\r  ✔ ${layerLabel} généré                   `));

      // Copy generated files to project root (never overwrite existing)
      await fs.copy(tmpDir, projectDir, { overwrite: false });
      await fs.remove(tmpDir);

      // Regenerate dependent layers
      await regenerateDependentLayers(
        layer,
        projectDir,
        updatedConfig,
        versions,
      );

      // Write manifest
      await writeManifest(projectDir, updatedConfig);

      console.log(
        chalk.bold.green(`\n✔ Layer "${layer}" added successfully!\n`),
      );
    } catch (error) {
      await fs.remove(tmpDir);
      console.log(
        chalk.red(
          `\n✖ Error adding layer: ${error instanceof Error ? error.message : error}`,
        ),
      );
      process.exit(1);
    }
  });
