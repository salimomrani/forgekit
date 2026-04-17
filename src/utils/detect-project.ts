import fs from "fs-extra";
import path from "node:path";
import { readManifest } from "./forgekit-json.js";
import type { ProjectConfig } from "../types.js";

export interface DetectionResult {
  config: ProjectConfig;
  source: "manifest" | "filesystem";
}

const SENTINEL_MAP: Array<{
  files: string[];
  apply: (config: ProjectConfig) => void;
}> = [
  {
    files: ["backend/pom.xml"],
    apply: (c) => {
      c.backendType = "spring-boot";
    },
  },
  {
    files: ["backend/app/main.py", "backend/requirements.txt"],
    apply: (c) => {
      c.backendType = "fastapi";
    },
  },
  {
    files: ["backend/artisan"],
    apply: (c) => {
      c.backendType = "laravel";
    },
  },
  {
    files: ["backend/next.config.ts"],
    apply: (c) => {
      c.backendType = "nextjs";
    },
  },
  {
    files: ["frontend/angular.json"],
    apply: (c) => {
      c.frontend = "angular";
    },
  },
  {
    files: ["frontend/src/App.vue"],
    apply: (c) => {
      c.frontend = "vue";
    },
  },
  {
    files: ["frontend/src/App.svelte", "frontend/svelte.config.js"],
    apply: (c) => {
      c.frontend = "svelte";
    },
  },
  {
    files: ["frontend/vite.config.ts"],
    apply: (c) => {
      if (c.frontend === null) c.frontend = "react-vite";
    },
  },
  {
    files: ["docker-compose.yml"],
    apply: (c) => {
      c.docker = true;
    },
  },
  {
    files: [".github/workflows/ci.yml"],
    apply: (c) => {
      c.ci = true;
    },
  },
  {
    files: [".claude/settings.json"],
    apply: (c) => {
      c.claudeCode = true;
    },
  },
  {
    files: [".specify/memory/constitution.md"],
    apply: (c) => {
      c.speckit = true;
    },
  },
  {
    files: [".husky", ".prettierrc"],
    apply: (c) => {
      c.prettier = true;
    },
  },
];

function defaultConfig(projectDir: string): ProjectConfig {
  return {
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
    workflowMode: "none",
    gitStrategy: "pr-required",
    speckitPreset: null,
    gitInit: false,
  };
}

export async function detectProject(
  projectDir: string,
): Promise<DetectionResult> {
  const manifest = await readManifest(projectDir);
  if (manifest) {
    return { config: manifest.config, source: "manifest" };
  }

  const config = defaultConfig(projectDir);
  let detected = false;

  const checks = await Promise.all(
    SENTINEL_MAP.map(async (sentinel) => {
      const found = await Promise.all(
        sentinel.files.map((f) => fs.pathExists(path.join(projectDir, f))),
      );
      return { sentinel, match: found.some(Boolean) };
    }),
  );

  for (const { sentinel, match } of checks) {
    if (match) {
      sentinel.apply(config);
      detected = true;
    }
  }

  if (!detected) {
    throw new Error(
      "Not a ForgeKit project. Run `forgekit new` to create one.",
    );
  }

  return { config, source: "filesystem" };
}
