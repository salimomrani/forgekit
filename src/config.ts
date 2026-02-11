import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import type { SavedConfig } from "./types.js";

const CONFIG_DIR = path.join(os.homedir(), ".forgekit");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export async function loadConfig(): Promise<SavedConfig> {
  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      return await fs.readJson(CONFIG_FILE);
    }
  } catch {
    // Ignore corrupt config
  }
  return {};
}

export async function saveConfig(config: SavedConfig): Promise<void> {
  await fs.ensureDir(CONFIG_DIR);
  await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
}
