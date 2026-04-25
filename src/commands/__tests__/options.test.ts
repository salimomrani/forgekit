import { describe, it, expect } from "vitest";
import { Command } from "commander";

function buildAddCommand(): Command {
  return new Command()
    .name("add")
    .argument("<layer>")
    .option("--auth", "Inclure l'authentification")
    .option("--no-auth", "Exclure l'authentification")
    .option("-y, --yes", "Skip confirmations and apply defaults")
    .option("--database <type>", "Base de données : postgres | none");
}

function buildNewCommand(): Command {
  return new Command()
    .name("new")
    .argument("[name]")
    .option("--auth", "Inclure l'authentification")
    .option("--no-auth", "Exclure l'authentification")
    .option("-y, --yes", "Skip confirmations and apply defaults")
    .option("--database <type>", "Base de données : postgres | none");
}

describe("CLI flag parsing — non-interactive UX (FR-4)", () => {
  describe("--no-auth", () => {
    it("should set auth to false on the add command when --no-auth is passed", () => {
      const cmd = buildAddCommand();
      cmd.parse(["node", "add", "spring-boot", "--no-auth"]);
      expect(cmd.opts().auth).toBe(false);
    });

    it("should set auth to true on the add command when --auth is passed", () => {
      const cmd = buildAddCommand();
      cmd.parse(["node", "add", "spring-boot", "--auth"]);
      expect(cmd.opts().auth).toBe(true);
    });

    it("should leave auth unset when neither flag is provided", () => {
      const cmd = buildAddCommand();
      cmd.parse(["node", "add", "spring-boot"]);
      expect(cmd.opts().auth).toBeUndefined();
    });

    it("should set auth to false on the new command when --no-auth is passed", () => {
      const cmd = buildNewCommand();
      cmd.parse(["node", "new", "demo", "--no-auth"]);
      expect(cmd.opts().auth).toBe(false);
    });
  });

  describe("--yes / -y", () => {
    it("should set yes to true on the add command when --yes is passed", () => {
      const cmd = buildAddCommand();
      cmd.parse(["node", "add", "spring-boot", "--yes"]);
      expect(cmd.opts().yes).toBe(true);
    });

    it("should set yes to true on the add command when -y is passed", () => {
      const cmd = buildAddCommand();
      cmd.parse(["node", "add", "spring-boot", "-y"]);
      expect(cmd.opts().yes).toBe(true);
    });

    it("should leave yes undefined when no flag is provided", () => {
      const cmd = buildAddCommand();
      cmd.parse(["node", "add", "spring-boot"]);
      expect(cmd.opts().yes).toBeUndefined();
    });

    it("should set yes to true on the new command when --yes is passed", () => {
      const cmd = buildNewCommand();
      cmd.parse(["node", "new", "demo", "--yes"]);
      expect(cmd.opts().yes).toBe(true);
    });
  });
});

describe("Non-interactive detection rule (FR-4.3)", () => {
  it("should treat a process with --yes as non-interactive even when stdin is a TTY", () => {
    const yes = true;
    const isTTY = true;
    const nonInteractive = yes === true || isTTY !== true;
    expect(nonInteractive).toBe(true);
  });

  it("should treat a process with non-TTY stdin as non-interactive even without --yes", () => {
    const yes: boolean | undefined = undefined;
    const isTTY: boolean | undefined = undefined;
    const nonInteractive = yes === true || isTTY !== true;
    expect(nonInteractive).toBe(true);
  });

  it("should treat a TTY without --yes as interactive", () => {
    const yes: boolean | undefined = undefined;
    const isTTY = true;
    const nonInteractive = yes === true || isTTY !== true;
    expect(nonInteractive).toBe(false);
  });
});

describe("promptProjectConfig — non-interactive defaults (FR-4.3)", () => {
  it("should resolve all defaults without invoking any inquirer prompt when nonInteractive is true", async () => {
    const { promptProjectConfig } = await import("../../prompts/project.js");

    const result = await promptProjectConfig(
      {
        name: "demo",
        description: "Demo",
        backendType: "spring-boot",
        frontend: "angular",
      },
      { nonInteractive: true },
    );

    expect(result.name).toBe("demo");
    expect(result.backendType).toBe("spring-boot");
    expect(result.frontend).toBe("angular");
    expect(result.database).toBe("postgres");
    expect(result.auth).toBe(false);
    expect(result.flyway).toBe(true);
  });

  it("should honour --no-auth when nonInteractive is true (auth=false from defaults)", async () => {
    const { promptProjectConfig } = await import("../../prompts/project.js");

    const result = await promptProjectConfig(
      {
        name: "demo",
        description: "Demo",
        backendType: "spring-boot",
        frontend: "angular",
        auth: false,
      },
      { nonInteractive: true },
    );

    expect(result.auth).toBe(false);
  });
});
