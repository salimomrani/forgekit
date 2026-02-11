import fs from "fs-extra";
import type { ProjectConfig } from "../types.js";

export abstract class BaseGenerator {
  constructor(
    protected readonly projectDir: string,
    protected readonly config: ProjectConfig,
  ) {}

  abstract generate(): Promise<void>;

  protected async ensureDirs(dirs: string[]): Promise<void> {
    await Promise.all(dirs.map((dir) => fs.ensureDir(dir)));
  }
}
