import { spawnSync } from "node:child_process";

/** Returns true if the specify CLI binary is discoverable in PATH. */
export function isSpecifyInstalled(): boolean {
  const result = spawnSync("specify", ["--help"], { stdio: "ignore" });
  return result.status === 0;
}

/** Returns true if the claude CLI binary is discoverable in PATH. */
export function isClaudeInstalled(): boolean {
  // Intentionally synchronous — called once during the interactive wizard prompt setup,
  // before any async Inquirer prompts run. spawnSync avoids the need for top-level await
  // and keeps the detection transparent to the rest of the async wizard flow.
  const result = spawnSync("claude", ["--version"], { stdio: "ignore" });
  return result.status === 0;
}

/** Returns true if the codex CLI binary is discoverable in PATH. */
export function isCodexInstalled(): boolean {
  // codex --help returns 0 when the binary exists; --version is unsupported on older builds.
  const result = spawnSync("codex", ["--help"], { stdio: "ignore" });
  return result.status === 0;
}
