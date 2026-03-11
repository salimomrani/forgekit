import { describe, it, expect, vi } from "vitest";

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(),
}));

import { isClaudeInstalled } from "../system.js";
import { spawnSync } from "node:child_process";

describe("isClaudeInstalled", () => {
  it("returns true when claude binary is found in PATH", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0 } as ReturnType<
      typeof spawnSync
    >);
    expect(isClaudeInstalled()).toBe(true);
  });

  it("returns false when claude binary is not found", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 1 } as ReturnType<
      typeof spawnSync
    >);
    expect(isClaudeInstalled()).toBe(false);
  });

  it("returns false when spawnSync throws ENOENT", () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: null,
      error: new Error("ENOENT"),
    } as ReturnType<typeof spawnSync>);
    expect(isClaudeInstalled()).toBe(false);
  });
});
