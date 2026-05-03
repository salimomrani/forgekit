import type { ProjectConfig } from "../types.js";
import type { ResolvedVersions } from "../versions.js";

export function makeBaseConfig(
  overrides: Partial<ProjectConfig> = {},
): ProjectConfig {
  return {
    name: "test-project",
    groupId: "com.example",
    description: "Test",
    backendType: null,
    frontend: null,
    database: "postgres",
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
    aiTool: "none",
    workflowMode: "none",
    gitStrategy: "pr-required",
    speckitPreset: null,
    gitInit: false,
    ...overrides,
  };
}

export function makeOpenSpecConfig(
  overrides: Partial<ProjectConfig> = {},
): ProjectConfig {
  return makeBaseConfig({
    aiTool: "codex",
    workflowMode: "openspec",
    ...overrides,
  });
}

export const BASE_VERSIONS: ResolvedVersions = {
  springBoot: "4.0.2",
  springDoc: "3.0.1",
  mapstruct: "1.6.3",
  laravel: "13.1.1",
  sanctum: "4.3.1",
  scramble: "0.13.16",
  angular: "21.0.0",
  angularCli: "21.0.0",
  angularBuild: "21.0.0",
  primeng: "21.1.1",
  primeuixThemes: "2.0.3",
  primeicons: "7.0.0",
  primeflex: "4.0.0",
  ngrxSignals: "21.0.1",
  rxjs: "7.8.0",
  zoneJs: "0.15.0",
  typescript: "5.8.0",
  tailwind: "4.0.0",
  react: "19.0.0",
  reactRouter: "7.5.0",
  vite: "6.3.0",
  axiosReact: "1.8.0",
  next: "15.3.0",
  nextAuth: "5.0.0",
  prismaClient: "6.6.0",
  nestjs: "11.0.0",
  nestjsJwt: "11.0.0",
  nestjsSwagger: "11.2.0",
  vue: "3.5.13",
  pinia: "3.0.4",
  vueRouter: "4.5.0",
  husky: "9.1.0",
  lintStaged: "15.5.0",
  prettier: "3.5.0",
  eslint: "9.20.0",
  typescriptEslint: "8.29.0",
  eslintConfigPrettier: "10.1.5",
};
