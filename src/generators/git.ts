import { execFileSync } from "node:child_process";

export async function initGit(projectDir: string): Promise<void> {
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
