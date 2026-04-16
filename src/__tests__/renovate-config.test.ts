import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FALLBACK_VERSIONS } from "../versions.js";

const REPO_ROOT = resolve(__dirname, "..", "..");
const RENOVATE_CONFIG_PATH = resolve(REPO_ROOT, "renovate.json");
const VERSIONS_SOURCE_PATH = resolve(REPO_ROOT, "src", "versions.ts");

interface CustomManager {
  customType: string;
  managerFilePatterns: string[];
  matchStrings: string[];
}

interface RenovateConfig {
  customManagers?: CustomManager[];
}

function loadRenovateConfig(): RenovateConfig {
  const raw = readFileSync(RENOVATE_CONFIG_PATH, "utf-8");
  return JSON.parse(raw) as RenovateConfig;
}

function loadVersionsSource(): string {
  return readFileSync(VERSIONS_SOURCE_PATH, "utf-8");
}

function getCustomManagerRegex(): RegExp {
  const config = loadRenovateConfig();
  const manager = config.customManagers![0];
  return new RegExp(manager.matchStrings[0], "g");
}

describe("renovate.json", () => {
  it("should expose a regex customManager when the config is parsed", () => {
    const config = loadRenovateConfig();
    expect(config.customManagers).toBeDefined();
    expect(config.customManagers!.length).toBeGreaterThanOrEqual(1);
    expect(config.customManagers![0].customType).toBe("regex");
  });

  it("should match every FALLBACK_VERSIONS entry when the custom regex is applied to src/versions.ts", () => {
    const pattern = getCustomManagerRegex();
    const source = loadVersionsSource();
    const matches = [...source.matchAll(pattern)];
    const expectedCount = Object.keys(FALLBACK_VERSIONS).length;

    expect(matches.length).toBe(expectedCount);
  });

  it("should extract only supported datasources when scanning src/versions.ts", () => {
    const pattern = getCustomManagerRegex();
    const source = loadVersionsSource();
    const datasources = [...source.matchAll(pattern)].map(
      (m) => m.groups?.datasource,
    );

    expect(datasources.length).toBeGreaterThan(0);
    datasources.forEach((ds) => {
      expect(["npm", "maven", "packagist"]).toContain(ds);
    });
  });

  it("should produce non-empty depName and semver currentValue for every match", () => {
    const pattern = getCustomManagerRegex();
    const source = loadVersionsSource();
    const matches = [...source.matchAll(pattern)];

    matches.forEach((m) => {
      expect(m.groups?.depName).toBeTruthy();
      expect(m.groups?.currentValue).toMatch(/^\d+\.\d+/);
    });
  });

  it("should annotate every FALLBACK_VERSIONS key with a renovate marker comment", () => {
    const source = loadVersionsSource();
    const annotationPattern = /^\s*(\w+):\s*"[^"]+",\s*\/\/\s*renovate:/gm;
    const annotatedKeys = new Set(
      [...source.matchAll(annotationPattern)].map((m) => m[1]),
    );

    const missing = Object.keys(FALLBACK_VERSIONS).filter(
      (key) => !annotatedKeys.has(key),
    );

    expect(
      missing,
      `missing renovate marker on keys: ${missing.join(", ")}`,
    ).toEqual([]);
  });
});
