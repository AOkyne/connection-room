import { describe, it, expect } from "vitest";
import { getSafeNextPath } from "./safe-redirect";

describe("getSafeNextPath", () => {
  it("accepts a same-origin path", () => {
    expect(getSafeNextPath("/app/spaces/commons/posts/abc-123?comment=1")).toBe(
      "/app/spaces/commons/posts/abc-123?comment=1"
    );
  });

  it("accepts the app root", () => {
    expect(getSafeNextPath("/app")).toBe("/app");
  });

  it("rejects null/undefined/empty", () => {
    expect(getSafeNextPath(null)).toBeNull();
    expect(getSafeNextPath(undefined)).toBeNull();
    expect(getSafeNextPath("")).toBeNull();
  });

  it("rejects a protocol-relative URL", () => {
    expect(getSafeNextPath("//evil.example")).toBeNull();
  });

  it("rejects a full external URL", () => {
    expect(getSafeNextPath("https://evil.example")).toBeNull();
    expect(getSafeNextPath("http://evil.example/app")).toBeNull();
  });

  it("rejects a javascript: scheme", () => {
    expect(getSafeNextPath("javascript:alert(1)")).toBeNull();
    expect(getSafeNextPath("/javascript:alert(1)")).toBeNull();
  });

  it("rejects a path not starting with a slash", () => {
    expect(getSafeNextPath("app/spaces")).toBeNull();
  });

  it("rejects backslash-based protocol-relative tricks", () => {
    expect(getSafeNextPath("/\\evil.example")).toBeNull();
  });
});
