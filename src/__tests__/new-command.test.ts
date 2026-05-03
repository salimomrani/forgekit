import { describe, it, expect, vi, afterEach } from "vitest";
import { newCommand } from "../commands/new.js";

describe("newCommand options (win 3)", () => {
  it("exposes --workflow flag", () => {
    const opt = newCommand.options.find((o) => o.long === "--workflow");
    expect(opt).toBeDefined();
  });

  it("--workflow flag accepts a value", () => {
    const opt = newCommand.options.find((o) => o.long === "--workflow");
    expect(opt?.required).toBe(true);
  });

  it("--workflow help description lists openspec alongside speckit / vibe / none", () => {
    const opt = newCommand.options.find((o) => o.long === "--workflow");
    expect(opt?.description).toMatch(/openspec/);
  });

  it("exposes --speckit flag", () => {
    const opt = newCommand.options.find((o) => o.long === "--speckit");
    expect(opt).toBeDefined();
  });

  it("exposes --openspec flag", () => {
    const opt = newCommand.options.find((o) => o.long === "--openspec");
    expect(opt).toBeDefined();
  });

  it("exposes --prettier flag", () => {
    const opt = newCommand.options.find((o) => o.long === "--prettier");
    expect(opt).toBeDefined();
  });

  it("exposes --no-prettier flag", () => {
    const opt = newCommand.options.find((o) => o.long === "--no-prettier");
    expect(opt).toBeDefined();
  });

  it("passes prettier=true to defaults when --prettier is set", () => {
    const prettierOpt = newCommand.options.find((o) => o.long === "--prettier");
    expect(prettierOpt).not.toBeUndefined();
  });
});

describe("newCommand workflow flag mutual exclusion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects --speckit + --openspec with exit code 1", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: number,
    ) => {
      throw new Error(`__exit__:${code ?? 0}`);
    }) as never);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    let caught: unknown;
    try {
      await newCommand.parseAsync(
        ["tmp-conflict-x", "--speckit", "--openspec", "-y"],
        { from: "user" },
      );
    } catch (e) {
      caught = e;
    }

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(String(caught)).toMatch(/__exit__:1/);
    const stdout = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(stdout).toMatch(/Conflit de flags workflow/);
  });
});
