import { describe, it, expect, vi } from "vitest";

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(),
}));

import { initSpecify } from "../speckit.js";
import { spawnSync } from "node:child_process";

describe("initSpecify", () => {
  it("forwards --ai claude when aiTool is claude", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0 } as ReturnType<
      typeof spawnSync
    >);
    const result = initSpecify("/tmp/my-project", "claude");
    expect(spawnSync).toHaveBeenCalledWith(
      "specify",
      ["init", "--here", "--ai", "claude", "--no-git"],
      { cwd: "/tmp/my-project", stdio: "inherit" },
    );
    expect(result).toBe(true);
  });

  it("forwards --ai codex when aiTool is codex", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0 } as ReturnType<
      typeof spawnSync
    >);
    const result = initSpecify("/tmp/my-project", "codex");
    expect(spawnSync).toHaveBeenCalledWith(
      "specify",
      ["init", "--here", "--ai", "codex", "--no-git"],
      { cwd: "/tmp/my-project", stdio: "inherit" },
    );
    expect(result).toBe(true);
  });

  it("returns false without invoking specify when aiTool is none", () => {
    vi.mocked(spawnSync).mockClear();
    const result = initSpecify("/tmp/my-project", "none");
    expect(spawnSync).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("returns false when specify init exits non-zero", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 1 } as ReturnType<
      typeof spawnSync
    >);
    expect(initSpecify("/tmp/my-project", "claude")).toBe(false);
  });
});
