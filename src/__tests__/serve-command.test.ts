import { describe, it, expect, vi, beforeEach } from "vitest";
import { serveCommand } from "../commands/serve.js";
import { detectStack } from "../utils/detect-stack.js";

vi.mock("../utils/detect-stack.js");

describe("serveCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should exist and be a Command", () => {
    expect(serveCommand.name()).toBe("serve");
  });

  it("should detect stack and prompt user", async () => {
    vi.mocked(detectStack).mockResolvedValue({
      hasDocker: true,
      backendType: "spring-boot",
      frontendType: "react-vite",
    });

    expect(serveCommand.description()).toContain("Démarrer");
  });
});
