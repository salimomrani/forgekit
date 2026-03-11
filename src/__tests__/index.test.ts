import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("forgekit CLI version", () => {
  it("reads version dynamically from package.json instead of hardcoding it", () => {
    const src = readFileSync(resolve(process.cwd(), "src/index.ts"), "utf-8");
    expect(src).not.toMatch(/\.version\(["']\d+\.\d+\.\d+["']\)/);
    expect(src).toContain("package.json");
  });
});
