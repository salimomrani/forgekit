import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveVersions, FALLBACK_VERSIONS } from "../versions.js";

describe("resolveVersions", () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("AbortSignal timeout (win 1)", () => {
    it("passes an AbortSignal to every fetch call", async () => {
      const signals: (AbortSignal | null | undefined)[] = [];
      vi.stubGlobal("fetch", (_url: string, init?: RequestInit) => {
        signals.push(init?.signal);
        return Promise.resolve({ ok: false } as Response);
      });

      await resolveVersions({ backendType: null, frontend: "react-vite" });

      expect(signals.length).toBeGreaterThan(0);
      signals.forEach((s) => expect(s).toBeInstanceOf(AbortSignal));
    });

    it("passes an AbortSignal for Maven fetches", async () => {
      const signals: (AbortSignal | null | undefined)[] = [];
      vi.stubGlobal("fetch", (_url: string, init?: RequestInit) => {
        signals.push(init?.signal);
        return Promise.resolve({ ok: false } as Response);
      });

      await resolveVersions({ backendType: "spring-boot", frontend: null });

      expect(signals.length).toBeGreaterThan(0);
      signals.forEach((s) => expect(s).toBeInstanceOf(AbortSignal));
    });

    it("uses fallback when fetch times out", { timeout: 15_000 }, async () => {
      vi.stubGlobal(
        "fetch",
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
            // never resolves — simulates a hanging request
          }),
      );

      vi.useFakeTimers();
      const promise = resolveVersions({
        backendType: null,
        frontend: "react-vite",
      });
      await vi.advanceTimersByTimeAsync(10_000);
      const result = await promise;
      vi.useRealTimers();

      expect(result.react).toBe(FALLBACK_VERSIONS.react);
      expect(result.vite).toBe(FALLBACK_VERSIONS.vite);
    });
  });

  describe("@angular/cli is fetched independently from @angular/core", () => {
    it("should resolve angularCli to a value distinct from angular when the registry returns asymmetric versions", async () => {
      vi.stubGlobal("fetch", (url: string) => {
        const m = url.match(
          /registry\.npmjs\.org\/([^/]+(?:\/[^/]+)?)\/latest/,
        );
        const pkg = m ? decodeURIComponent(m[1]) : "";
        const versionsByPkg: Record<string, string> = {
          "@angular/core": "21.2.10",
          "@angular/cli": "21.2.8",
        };
        const v = versionsByPkg[pkg];
        return Promise.resolve(
          v
            ? ({
                ok: true,
                json: () => Promise.resolve({ version: v }),
              } as Response)
            : ({ ok: false } as Response),
        );
      });

      const result = await resolveVersions({
        backendType: null,
        frontend: "angular",
      });

      expect(result.angular).toBe("21.2.10");
      expect(result.angularCli).toBe("21.2.8");
      expect(result.angularCli).not.toBe(result.angular);
    });

    it("should fall back to FALLBACK_VERSIONS.angularCli when the @angular/cli fetch fails", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false } as Response));

      const result = await resolveVersions({
        backendType: null,
        frontend: "angular",
      });

      expect(result.angularCli).toBe(FALLBACK_VERSIONS.angularCli);
    });
  });

  describe("typescript is capped on the Angular peer range", () => {
    it("should keep the fallback typescript value when the registry returns a 6.x release for an Angular project", async () => {
      vi.stubGlobal("fetch", (url: string) => {
        const isTypescript = url.includes("/typescript/latest");
        return Promise.resolve(
          isTypescript
            ? ({
                ok: true,
                json: () => Promise.resolve({ version: "6.0.0" }),
              } as Response)
            : ({ ok: false } as Response),
        );
      });

      const result = await resolveVersions({
        backendType: null,
        frontend: "angular",
      });

      expect(result.typescript).toBe(FALLBACK_VERSIONS.typescript);
    });

    it("should adopt the fetched typescript value when it is within the Angular peer range", async () => {
      vi.stubGlobal("fetch", (url: string) => {
        const isTypescript = url.includes("/typescript/latest");
        return Promise.resolve(
          isTypescript
            ? ({
                ok: true,
                json: () => Promise.resolve({ version: "5.9.3" }),
              } as Response)
            : ({ ok: false } as Response),
        );
      });

      const result = await resolveVersions({
        backendType: null,
        frontend: "angular",
      });

      expect(result.typescript).toBe("5.9.3");
    });
  });

  describe("fallback warning (win 2)", () => {
    it("prints a warning when all fetches fail and fallbacks are used", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false } as Response));

      const warnSpy = vi.spyOn(console, "warn");

      await resolveVersions({ backendType: null, frontend: "react-vite" });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("fallback"));
    });

    it("does not print a fallback warning when all fetches succeed", async () => {
      vi.stubGlobal("fetch", (_url: string) =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              version: "99.0.0",
              response: { docs: [{ latestVersion: "99.0.0" }] },
            }),
        } as Response),
      );

      const warnSpy = vi.spyOn(console, "warn");

      await resolveVersions({ backendType: null, frontend: "react-vite" });

      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("fallback"),
      );
    });
  });
});
