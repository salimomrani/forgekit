import { spawnSync } from "node:child_process";
import type { AITool } from "../types.js";

export function initSpecify(projectDir: string, aiTool: AITool): boolean {
  if (aiTool === "none") return false;
  const result = spawnSync(
    "specify",
    ["init", "--here", "--ai", aiTool, "--no-git"],
    { cwd: projectDir, stdio: "inherit" },
  );
  return result.status === 0;
}
