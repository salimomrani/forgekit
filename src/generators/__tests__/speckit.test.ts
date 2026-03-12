import { describe, it, expect, vi } from "vitest";

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(),
}));

import { initSpecify } from "../speckit.js";
import { spawnSync } from "node:child_process";

describe("initSpecify", () => {
  it("calls specify init with correct args in the project directory", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0 } as ReturnType<
      typeof spawnSync
    >);
    const result = initSpecify("/tmp/my-project");
    expect(spawnSync).toHaveBeenCalledWith(
      "specify",
      ["init", "--here", "--ai", "claude", "--no-git"],
      { cwd: "/tmp/my-project", stdio: "inherit" },
    );
    expect(result).toBe(true);
  });

  it("returns false when specify init fails", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 1 } as ReturnType<
      typeof spawnSync
    >);
    expect(initSpecify("/tmp/my-project")).toBe(false);
  });
});
