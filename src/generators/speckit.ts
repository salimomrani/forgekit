import { spawnSync } from "node:child_process";

export function initSpecify(projectDir: string): boolean {
  const result = spawnSync(
    "specify",
    ["init", "--here", "--ai", "claude", "--no-git"],
    { cwd: projectDir, stdio: "inherit" },
  );
  return result.status === 0;
}
