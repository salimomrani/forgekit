export type UIFramework = "primeng" | "tailwind" | "none";
export type PrimeNGPreset = "Aura" | "Lara" | "Nora";
export type WorkflowMode = "speckit" | "vibe" | "none";
export type GitStrategy = "pr-required" | "no-pr";
export type SpeckitPreset = "rigorous" | "balanced" | "fast" | "bare-metal";
export type AITool = "claude" | "codex" | "none";
export type BackendType =
  | "spring-boot"
  | "fastapi"
  | "laravel"
  | "nextjs"
  | "nestjs"
  | null;
export type FrontendType = "angular" | "react-vite" | "vue" | null;

export interface ProjectConfig {
  name: string;
  groupId: string;
  description: string;
  // Stack
  backendType: BackendType;
  frontend: FrontendType;
  // Backend features (Spring Boot + Laravel)
  flyway: boolean;
  openapi: boolean;
  auth: boolean;
  mapstruct: boolean;
  prisma: boolean;
  // Frontend
  prettier: boolean;
  eslint: boolean;
  uiFramework: UIFramework;
  primeNGPreset: PrimeNGPreset;
  ngrx: boolean;
  // Infrastructure
  docker: boolean;
  ci: boolean;
  aiTool: AITool;
  speckit: boolean;
  workflowMode: WorkflowMode;
  gitStrategy: GitStrategy;
  speckitPreset: SpeckitPreset | null;
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
