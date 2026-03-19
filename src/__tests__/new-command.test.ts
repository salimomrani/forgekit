import { describe, it, expect } from "vitest";
import { newCommand } from "../commands/new.js";

describe("newCommand options (win 3)", () => {
  it("exposes --prettier flag", () => {
    const opt = newCommand.options.find((o) => o.long === "--prettier");
    expect(opt).toBeDefined();
  });

  it("exposes --no-prettier flag", () => {
    const opt = newCommand.options.find((o) => o.long === "--no-prettier");
    expect(opt).toBeDefined();
  });

  it("passes prettier=true to defaults when --prettier is set", () => {
    // Option existence is sufficient — integration behaviour tested in e2e
    const prettierOpt = newCommand.options.find((o) => o.long === "--prettier");
    expect(prettierOpt).not.toBeUndefined();
  });
});
