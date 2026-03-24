import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectStack } from "../detect-stack.js";
import fs from "fs-extra";
import path from "node:path";

vi.mock("fs-extra");

describe("detectStack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should detect docker-compose.yml", async () => {
    vi.mocked(fs.pathExists).mockImplementation((p) => {
      if (path.basename(p) === "docker-compose.yml")
        return Promise.resolve(true);
      return Promise.resolve(false);
    });

    const stack = await detectStack("/some/path");
    expect(stack.hasDocker).toBe(true);
  });

  it("should detect spring-boot backend", async () => {
    vi.mocked(fs.pathExists).mockImplementation((p) => {
      if (p.includes("backend") && path.basename(p) === "pom.xml")
        return Promise.resolve(true);
      if (path.basename(p) === "docker-compose.yml")
        return Promise.resolve(false);
      return Promise.resolve(false);
    });

    const stack = await detectStack("/some/path");
    expect(stack.backendType).toBe("spring-boot");
  });

  it("should detect fastapi backend", async () => {
    vi.mocked(fs.pathExists).mockImplementation((p) => {
      if (p.includes("backend") && path.basename(p) === "requirements.txt")
        return Promise.resolve(true);
      if (path.basename(p) === "docker-compose.yml")
        return Promise.resolve(false);
      return Promise.resolve(false);
    });

    const stack = await detectStack("/some/path");
    expect(stack.backendType).toBe("fastapi");
  });

  it("should detect laravel backend", async () => {
    vi.mocked(fs.pathExists).mockImplementation((p) => {
      if (p.includes("backend") && path.basename(p) === "composer.json")
        return Promise.resolve(true);
      if (path.basename(p) === "docker-compose.yml")
        return Promise.resolve(false);
      return Promise.resolve(false);
    });

    const stack = await detectStack("/some/path");
    expect(stack.backendType).toBe("laravel");
  });

  it("should detect angular frontend", async () => {
    vi.mocked(fs.pathExists).mockImplementation((p) => {
      if (p.includes("frontend") && path.basename(p) === "angular.json")
        return Promise.resolve(true);
      if (p.includes("backend") && path.basename(p) === "pom.xml")
        return Promise.resolve(false);
      if (path.basename(p) === "docker-compose.yml")
        return Promise.resolve(false);
      return Promise.resolve(false);
    });

    const stack = await detectStack("/some/path");
    expect(stack.frontendType).toBe("angular");
  });

  it("should detect react frontend", async () => {
    vi.mocked(fs.pathExists).mockImplementation((p) => {
      if (p.includes("frontend") && path.basename(p) === "package.json")
        return Promise.resolve(true);
      if (p.includes("backend") && path.basename(p) === "pom.xml")
        return Promise.resolve(false);
      if (path.basename(p) === "docker-compose.yml")
        return Promise.resolve(false);
      return Promise.resolve(false);
    });

    const stack = await detectStack("/some/path");
    expect(stack.frontendType).toBe("react-vite");
  });

  it("should return all false when no stack found", async () => {
    vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(false));

    const stack = await detectStack("/some/path");
    expect(stack.hasDocker).toBe(false);
    expect(stack.backendType).toBeNull();
    expect(stack.frontendType).toBeNull();
  });
});
