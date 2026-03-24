import fs from "fs-extra";
import path from "node:path";

export interface DetectedStack {
  hasDocker: boolean;
  backendType: "spring-boot" | "fastapi" | "laravel" | null;
  frontendType: "angular" | "react-vite" | null;
}

export async function detectStack(projectPath: string): Promise<DetectedStack> {
  const hasDocker = await fs.pathExists(
    path.join(projectPath, "docker-compose.yml"),
  );

  const backendType = await detectBackend(projectPath);
  const frontendType = await detectFrontend(projectPath);

  return { hasDocker, backendType, frontendType };
}

async function detectBackend(
  projectPath: string,
): Promise<DetectedStack["backendType"]> {
  const backendPath = path.join(projectPath, "backend");

  if (await fs.pathExists(path.join(backendPath, "pom.xml")))
    return "spring-boot";
  if (await fs.pathExists(path.join(backendPath, "requirements.txt")))
    return "fastapi";
  if (await fs.pathExists(path.join(backendPath, "composer.json")))
    return "laravel";

  return null;
}

async function detectFrontend(
  projectPath: string,
): Promise<DetectedStack["frontendType"]> {
  const frontendPath = path.join(projectPath, "frontend");

  if (await fs.pathExists(path.join(frontendPath, "angular.json")))
    return "angular";
  if (await fs.pathExists(path.join(frontendPath, "package.json")))
    return "react-vite";

  return null;
}
