import { spawnSync } from "node:child_process";
import type { AITool } from "../types.js";

export function isNpxAvailable(): boolean {
  return spawnSync("npx", ["--version"], { stdio: "ignore" }).status === 0;
}

export function initOpenspec(projectDir: string, aiTool: AITool): boolean {
  if (aiTool === "none") return false;
  if (!isNpxAvailable()) return false;
  const result = spawnSync(
    "npx",
    [
      "--yes",
      "@fission-ai/openspec@latest",
      "init",
      "--tools",
      aiTool,
      "--force",
      ".",
    ],
    { cwd: projectDir, stdio: "inherit" },
  );
  return result.status === 0;
}
