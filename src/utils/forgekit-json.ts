import fs from "fs-extra";
import path from "node:path";
import { createRequire } from "node:module";
import type { ForgeKitManifest, ProjectConfig } from "../types.js";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json") as { version: string };

const MANIFEST_FILE = "forgekit.json";

export async function readManifest(
  projectDir: string,
): Promise<ForgeKitManifest | null> {
  try {
    const filePath = path.join(projectDir, MANIFEST_FILE);
    if (await fs.pathExists(filePath)) {
      return (await fs.readJson(filePath)) as ForgeKitManifest;
    }
  } catch {
    // Ignore corrupt or unreadable manifest
  }
  return null;
}

export async function writeManifest(
  projectDir: string,
  config: ProjectConfig,
): Promise<void> {
  const manifest: ForgeKitManifest = {
    forgekit: {
      version,
      generatedAt: new Date().toISOString(),
    },
    config,
  };
  await fs.writeJson(path.join(projectDir, MANIFEST_FILE), manifest, {
    spaces: 2,
  });
}
