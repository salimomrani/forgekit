export type UIFramework = "primeng" | "tailwind" | "none";
export type PrimeNGPreset = "Aura" | "Lara" | "Nora";
export type BackendType = "spring-boot" | "fastapi" | null;
export type FrontendType = "angular" | "react-vite" | null;

export interface ProjectConfig {
  name: string;
  groupId: string;
  description: string;
  // Stack
  backendType: BackendType;
  frontend: FrontendType;
  // Backend features (Spring Boot only)
  flyway: boolean;
  openapi: boolean;
  auth: boolean;
  mapstruct: boolean;
  // Frontend
  prettier: boolean;
  uiFramework: UIFramework;
  primeNGPreset: PrimeNGPreset;
  ngrx: boolean;
  // Infrastructure
  docker: boolean;
  ci: boolean;
  claudeCode: boolean;
  speckit: boolean;
  gitInit: boolean;
}

export interface SavedConfig {
  groupId?: string;
}

export interface ForgeKitManifest {
  forgekit: {
    version: string;
    generatedAt: string;
  };
  config: ProjectConfig;
}
