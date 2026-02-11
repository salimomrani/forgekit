import { execFileSync } from "node:child_process";

export async function initGit(projectDir: string): Promise<void> {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
  } catch {
    throw new Error("Git n'est pas installé. Installez Git et réessayez.");
  }

  execFileSync("git", ["init"], { cwd: projectDir, stdio: "ignore" });
  execFileSync("git", ["add", "-A"], { cwd: projectDir, stdio: "ignore" });
  execFileSync(
    "git",
    ["commit", "-m", "chore: initial project setup with ForgeKit"],
    {
      cwd: projectDir,
      stdio: "ignore",
    },
  );
}
