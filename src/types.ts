export type UIFramework = "primeng" | "tailwind" | "none";
export type PrimeNGPreset = "Aura" | "Lara" | "Nora";
export type BackendType = "spring-boot" | "fastapi" | null;

export interface ProjectConfig {
  name: string;
  groupId: string;
  description: string;
  // Stack
  backendType: BackendType;
  frontend: boolean;
  // Backend features (Spring Boot only)
  flyway: boolean;
  openapi: boolean;
  auth: boolean;
  mapstruct: boolean;
  // Frontend
  uiFramework: UIFramework;
  primeNGPreset: PrimeNGPreset;
  ngrx: boolean;
  // Infrastructure
  docker: boolean;
  ci: boolean;
  claudeCode: boolean;
  gitInit: boolean;
}

export interface SavedConfig {
  groupId?: string;
}
