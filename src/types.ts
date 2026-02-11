export interface ProjectConfig {
  name: string;
  groupId: string;
  description: string;
  backend: boolean;
  frontend: boolean;
  docker: boolean;
  ci: boolean;
  claudeCode: boolean;
  gitInit: boolean;
}

export interface SavedConfig {
  groupId?: string;
}
