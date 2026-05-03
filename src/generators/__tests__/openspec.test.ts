import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(),
}));

import { initOpenspec, isNpxAvailable } from "../openspec.js";
import { spawnSync } from "node:child_process";

const mockNpxAvailable = () =>
  vi.mocked(spawnSync).mockImplementation(((command: string) => {
    if (command === "npx") {
      return { status: 0 } as ReturnType<typeof spawnSync>;
    }
    return { status: 1 } as ReturnType<typeof spawnSync>;
  }) as unknown as typeof spawnSync);

describe("isNpxAvailable", () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockReset();
  });

  it("returns true when npx --version exits zero", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0 } as ReturnType<
      typeof spawnSync
    >);
    expect(isNpxAvailable()).toBe(true);
    expect(spawnSync).toHaveBeenCalledWith("npx", ["--version"], {
      stdio: "ignore",
    });
  });

  it("returns false when npx --version exits non-zero", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 127 } as ReturnType<
      typeof spawnSync
    >);
    expect(isNpxAvailable()).toBe(false);
  });
});

describe("initOpenspec", () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockReset();
  });

  it("returns false without invoking npx when aiTool is none", () => {
    const result = initOpenspec("/tmp/my-project", "none");
    expect(spawnSync).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("returns false and skips init when npx is unavailable", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 127 } as ReturnType<
      typeof spawnSync
    >);
    const result = initOpenspec("/tmp/my-project", "codex");
    // Only the probe call (npx --version) — no init invocation
    expect(spawnSync).toHaveBeenCalledTimes(1);
    expect(spawnSync).toHaveBeenCalledWith("npx", ["--version"], {
      stdio: "ignore",
    });
    expect(result).toBe(false);
  });

  it("forwards --tools codex when aiTool is codex", () => {
    mockNpxAvailable();
    const result = initOpenspec("/tmp/my-project", "codex");
    expect(spawnSync).toHaveBeenNthCalledWith(
      2,
      "npx",
      [
        "--yes",
        "@fission-ai/openspec@latest",
        "init",
        "--tools",
        "codex",
        "--force",
        ".",
      ],
      { cwd: "/tmp/my-project", stdio: "inherit" },
    );
    expect(result).toBe(true);
  });

  it("forwards --tools claude when aiTool is claude", () => {
    mockNpxAvailable();
    initOpenspec("/tmp/my-project", "claude");
    expect(spawnSync).toHaveBeenNthCalledWith(
      2,
      "npx",
      [
        "--yes",
        "@fission-ai/openspec@latest",
        "init",
        "--tools",
        "claude",
        "--force",
        ".",
      ],
      { cwd: "/tmp/my-project", stdio: "inherit" },
    );
  });

  it("returns true when init exits zero", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0 } as ReturnType<
      typeof spawnSync
    >);
    expect(initOpenspec("/tmp/my-project", "codex")).toBe(true);
  });

  it("returns false when init exits non-zero (no throw)", () => {
    vi.mocked(spawnSync)
      .mockReturnValueOnce({ status: 0 } as ReturnType<typeof spawnSync>)
      .mockReturnValueOnce({ status: 1 } as ReturnType<typeof spawnSync>);
    expect(() => initOpenspec("/tmp/my-project", "codex")).not.toThrow();
  });
});
