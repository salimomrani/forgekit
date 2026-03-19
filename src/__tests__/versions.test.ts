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
