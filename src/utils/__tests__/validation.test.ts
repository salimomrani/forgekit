import { describe, it, expect } from "vitest";
import { validateProjectName, validateGroupId } from "../validation.js";

describe("validateProjectName", () => {
  it("accepts valid project names", () => {
    expect(validateProjectName("my-app")).toBe(true);
    expect(validateProjectName("MyApp")).toBe(true);
    expect(validateProjectName("app123")).toBe(true);
    expect(validateProjectName("my_app")).toBe(true);
  });

  it("rejects empty names", () => {
    expect(validateProjectName("")).toBeTypeOf("string");
    expect(validateProjectName("   ")).toBeTypeOf("string");
  });

  it("rejects names starting with a number", () => {
    expect(validateProjectName("123app")).toBeTypeOf("string");
  });

  it("rejects names starting with a special character", () => {
    expect(validateProjectName("-app")).toBeTypeOf("string");
    expect(validateProjectName("_app")).toBeTypeOf("string");
  });

  it("rejects names with spaces or special characters", () => {
    expect(validateProjectName("my app")).toBeTypeOf("string");
    expect(validateProjectName("my.app")).toBeTypeOf("string");
    expect(validateProjectName("my@app")).toBeTypeOf("string");
  });

  it("rejects names exceeding 50 characters", () => {
    const longName = "a".repeat(51);
    expect(validateProjectName(longName)).toBeTypeOf("string");
  });

  it("accepts names at exactly 50 characters", () => {
    const name = "a".repeat(50);
    expect(validateProjectName(name)).toBe(true);
  });
});

describe("validateGroupId", () => {
  it("accepts valid group IDs", () => {
    expect(validateGroupId("com.example")).toBe(true);
    expect(validateGroupId("com.example.app")).toBe(true);
    expect(validateGroupId("org.apache")).toBe(true);
    expect(validateGroupId("io.github.user")).toBe(true);
  });

  it("rejects empty group IDs", () => {
    expect(validateGroupId("")).toBeTypeOf("string");
    expect(validateGroupId("   ")).toBeTypeOf("string");
  });

  it("rejects group IDs with uppercase letters", () => {
    expect(validateGroupId("com.Example")).toBeTypeOf("string");
    expect(validateGroupId("Com.example")).toBeTypeOf("string");
  });

  it("rejects group IDs starting with a number", () => {
    expect(validateGroupId("1com.example")).toBeTypeOf("string");
  });

  it("rejects group IDs with invalid characters", () => {
    expect(validateGroupId("com.exam-ple")).toBeTypeOf("string");
    expect(validateGroupId("com.exam_ple")).toBeTypeOf("string");
    expect(validateGroupId("com..example")).toBeTypeOf("string");
  });
});
