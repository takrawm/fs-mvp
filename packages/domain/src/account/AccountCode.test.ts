import { describe, it, expect } from "vitest";
import { AccountCode } from "./AccountCode";

describe("AccountCode", () => {
  it("creates from valid string", () => {
    const code = AccountCode.of("revenue");
    expect(code.value).toBe("revenue");
  });

  it("trims whitespace", () => {
    const code = AccountCode.of("  revenue  ");
    expect(code.value).toBe("revenue");
  });

  it("throws on empty string", () => {
    expect(() => AccountCode.of("")).toThrow("AccountCode must not be empty");
  });

  it("throws on whitespace-only string", () => {
    expect(() => AccountCode.of("   ")).toThrow("AccountCode must not be empty");
  });

  it("equals returns true for same value", () => {
    const a = AccountCode.of("revenue");
    const b = AccountCode.of("revenue");
    expect(a.equals(b)).toBe(true);
  });

  it("equals returns false for different values", () => {
    const a = AccountCode.of("revenue");
    const b = AccountCode.of("cogs");
    expect(a.equals(b)).toBe(false);
  });

  it("toString returns value", () => {
    const code = AccountCode.of("revenue");
    expect(code.toString()).toBe("revenue");
  });

  it("is immutable", () => {
    const code = AccountCode.of("revenue");
    expect(() => {
      (code as unknown as Record<string, unknown>).value = "changed";
    }).toThrow();
  });
});
